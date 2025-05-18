import {createProgramVariablesState} from "../WebGLRenderer.js";
import {ArrayBuf} from "./../ArrayBuf.js";
import {math} from "../../math/math.js";

const tempVec2 = math.vec2();

/**
 * SAO implementation inspired from previous SAO work in THREE.js by ludobaka / ludobaka.github.io and bhouston
 * @private
 */
export class SAOOcclusionRenderer {

    constructor(scene) {
        this._scene = scene;
        this._numSamples = null;
        this._program = null;
        this._programError = false;
        this.init();
    }

    init() {
        this._rebuild = true;
    }

    render(depthTexture) {

        this._build();

        if (this._programError) {
            return;
        }

        const scene = this._scene;
        if (!this._getInverseProjectMat) { // HACK: scene.camera not defined until render time
            this._getInverseProjectMat = (() => {
                let projMatDirty = true;
                this._scene.camera.on("projMatrix", function () {
                    projMatDirty = true;
                });
                const inverseProjectMat = math.mat4();
                return () => {
                    if (projMatDirty) {
                        math.inverseMat4(scene.camera.projMatrix, inverseProjectMat);
                    }
                    return inverseProjectMat;
                };
            })();
        }

        const gl = this._scene.canvas.gl;
        const viewportWidth = gl.drawingBufferWidth;
        const viewportHeight = gl.drawingBufferHeight;

        gl.viewport(0, 0, viewportWidth, viewportHeight);
        gl.clearColor(0, 0, 0, 1);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.frontFace(gl.CCW);
        gl.clear(gl.COLOR_BUFFER_BIT);

        tempVec2[0] = viewportWidth;
        tempVec2[1] = viewportHeight;
        this._program.draw(depthTexture, tempVec2);
    }

    _build() {

        let dirty = false;

        const scene = this._scene;
        const sao = scene.sao;

        if (sao.numSamples !== this._numSamples) {
            this._numSamples = Math.floor(sao.numSamples);
            dirty = true;
        }

        if (! (dirty || this._rebuild)) {
            return;
        }

        this._rebuild = false;

        const gl = scene.canvas.gl;

        if (this._program) {
            this._program.destroy();
            this._program = null;
        }
        if (this._numSamples <= 0) {
            this._program = {
                destroy: () => { },
                draw: () => { }
            };
            return;
        }

        const programVariablesState = createProgramVariablesState();

        const programVariables = programVariablesState.programVariables;

        const uDepthTexture         = programVariables.createUniform("sampler2D", "uDepthTexture");
        const uCameraNear           = programVariables.createUniform("float",     "uCameraNear");
        const uCameraFar            = programVariables.createUniform("float",     "uCameraFar");
        const uProjectMatrix        = programVariables.createUniform("mat4",      "uProjectMatrix");
        const uInverseProjectMatrix = programVariables.createUniform("mat4",      "uInverseProjectMatrix");
        const uPerspective          = programVariables.createUniform("bool",      "uPerspective");
        const uScale                = programVariables.createUniform("float",     "uScale");
        const uIntensity            = programVariables.createUniform("float",     "uIntensity");
        const uBias                 = programVariables.createUniform("float",     "uBias");
        const uKernelRadius         = programVariables.createUniform("float",     "uKernelRadius");
        const uMinResolution        = programVariables.createUniform("float",     "uMinResolution");
        const uViewport             = programVariables.createUniform("vec2",      "uViewport");
        const uRandomSeed           = programVariables.createUniform("float",     "uRandomSeed");

        const uv       = programVariables.createAttribute("vec2", "uv");
        const vUV      = programVariables.createVarying("vec2", "vUV", () => uv);
        const outColor = programVariables.createOutput("vec4", "outColor");

        const getOutColor = programVariables.createFragmentDefinition(
            "getOutColor",
            (name, src) => {
                src.push(`
                #define PI 3.14159265359
                #define PI2 6.28318530718
                #define EPSILON 1e-6
                #define NUM_SAMPLES ${this._numSamples}
                #define NUM_RINGS 4

                highp float rand(const in vec2 uv) {
                    const highp float a = 12.9898, b = 78.233, c = 43758.5453;
                    return fract(sin(mod(dot(uv, vec2(a, b)), PI)) * c);
                }

                vec3 getViewPos(const in vec2 screenPos, const in float depth) {
                        float near = ${uCameraNear};
                        float far  = ${uCameraFar};
                        float viewZ = (${uPerspective}
                                       ? ((near * far) / ((far - near) * depth - far))
                                       : (depth * (near - far) - near));
                        float clipW = ${uProjectMatrix}[2][3] * viewZ + ${uProjectMatrix}[3][3];
                        return (${uInverseProjectMatrix} * (clipW * vec4((vec3(screenPos, depth) - 0.5) * 2.0, 1.0))).xyz;
                }

                vec4 ${name}() {
                        float centerDepth = texture(${uDepthTexture}, ${vUV}).r;

                        if (centerDepth >= (1.0 - EPSILON)) {
                                discard;
                        }

                        vec3 centerViewPosition = getViewPos(${vUV}, centerDepth);
                        float scaleDividedByCameraFar = ${uScale} / ${uCameraFar};
                        float minResolutionMultipliedByCameraFar = ${uMinResolution} * ${uCameraFar};
                        vec3 centerViewNormal = normalize(cross(dFdx(centerViewPosition), dFdy(centerViewPosition)));

                        vec2 radiusStep = ${uKernelRadius} / ${uViewport} / float(NUM_SAMPLES);
                        vec2 radius = radiusStep;
                        const float angleStep = PI2 * float(NUM_RINGS) / float(NUM_SAMPLES);
                        float angle = PI2 * rand(${vUV} + ${uRandomSeed});

                        float occlusionSum = 0.0;
                        float weightSum = 0.0;

                        for (int i = 0; i < NUM_SAMPLES; i++) {
                                vec2 sampleUv = ${vUV} + vec2(cos(angle), sin(angle)) * radius;
                                radius += radiusStep;
                                angle += angleStep;

                                float sampleDepth = texture(${uDepthTexture}, sampleUv).r;
                                if (sampleDepth >= (1.0 - EPSILON)) {
                                        continue;
                                }

                                vec3 sampleViewPosition = getViewPos(sampleUv, sampleDepth);
                                vec3 viewDelta = sampleViewPosition - centerViewPosition;
                                float scaledScreenDistance = scaleDividedByCameraFar * length(viewDelta);
                                occlusionSum += max(0.0, (dot(centerViewNormal, viewDelta) - minResolutionMultipliedByCameraFar) / scaledScreenDistance - ${uBias}) / (1.0 + scaledScreenDistance * scaledScreenDistance );
                                weightSum += 1.0;
                        }

                        float v = 1.0 - occlusionSum * ${uIntensity} / weightSum;
                        // packFloatToRGBA
                        vec4 r = vec4(fract(v * vec3(256. * 256. * 256., 256. * 256., 256.)), v);
                        r.yzw -= r.xyz / 256.;
                        return r * 256. / 255.;
                }`);
            });

        const [program, errors] = programVariablesState.buildProgram(
            gl,
            "SAOOcclusionRenderer",
            {
                ignoreSectionPlanes: true,
                scene: { },
                appendFragmentOutputs: (src) => src.push(`${outColor} = ${getOutColor}();`),
                fragmentOutputsSetup: [ ],
                getVertexData: () => [ ],
                clipPos: `vec4(2.0 * ${uv} - 1.0, 0.0, 1.0)`
            });

        if (errors) {
            console.error(errors.join("\n"));
            this._programError = true;
        } else {
            const uvs = new Float32Array([1,1, 0,1, 0,0, 1,0]);
            const uvBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, uvs, uvs.length, 2, gl.STATIC_DRAW);
            const uvBufBinder = {
                bindAtLocation: location => { // see ArrayBuf.js and Attribute.js
                    uvBuf.bind();
                    gl.vertexAttribPointer(location, uvBuf.itemSize, uvBuf.itemType, uvBuf.normalized, 0, 0);
                }
            };

            // Mitigation: if Uint8Array is used, the geometry is corrupted on OSX when using Chrome with data-textures
            const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
            const indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, indices, indices.length, 1, gl.STATIC_DRAW);

            this._program = {
                destroy: program.destroy,
                draw: (depthTexture, viewportSize) => {
                    program.bind();

                    const projectState = scene.camera.project._state;
                    const far = projectState.far;
                    uCameraNear.setInputValue(projectState.near);
                    uCameraFar.setInputValue(far);

                    uProjectMatrix.setInputValue(projectState.matrix);
                    uInverseProjectMatrix.setInputValue(this._getInverseProjectMat());

                    uPerspective.setInputValue(scene.camera.projection === "perspective");

                    uScale.setInputValue(sao.scale * (far / 5));
                    uIntensity.setInputValue(sao.intensity);
                    uBias.setInputValue(sao.bias);
                    uKernelRadius.setInputValue(sao.kernelRadius);
                    uMinResolution.setInputValue(sao.minResolution);
                    uViewport.setInputValue(viewportSize);
                    uRandomSeed.setInputValue(Math.random());

                    uDepthTexture.setInputValue(depthTexture);

                    uv.setInputValue(uvBufBinder);

                    indicesBuf.bind();
                    gl.drawElements(gl.TRIANGLES, indicesBuf.numItems, indicesBuf.itemType, 0);
                }
            };
        }
    }

    destroy() {
        if (this._program) {
            this._program.destroy();
            this._program = null;
        }
    }
}
