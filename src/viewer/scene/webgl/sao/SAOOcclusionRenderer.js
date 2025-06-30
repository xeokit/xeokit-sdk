import {createProgramVariablesState} from "../WebGLRenderer.js";
import {ArrayBuf} from "./../ArrayBuf.js";
import {math} from "../../math/math.js";

const SAOProgram = (gl, name, programVariablesState, createOutColorDefinition) => {
    const programVariables = programVariablesState.programVariables;

    const uViewportInv   = programVariables.createUniform("vec2", "uViewportInv");
    const uCameraNear    = programVariables.createUniform("float", "uCameraNear");
    const uCameraFar     = programVariables.createUniform("float", "uCameraFar");
    const uDepthTexture  = programVariables.createUniform("sampler2D", "uDepthTexture");

    const uv       = programVariables.createAttribute("vec2", "uv");
    const vUV      = programVariables.createVarying("vec2", "vUV", () => uv);
    const outColor = programVariables.createOutput("vec4", "outColor");

    const getOutColor = programVariables.createFragmentDefinition(
        "getOutColor",
        (name, src) => {
            const getDepth = "getDepth";
            src.push(`
                float ${getDepth}(const in vec2 uv) {
                    return texture(${uDepthTexture}, uv).r;
                }
            `);
            src.push(createOutColorDefinition(name, vUV, uViewportInv, uCameraNear, uCameraFar, getDepth));
        });

    const [program, errors] = programVariablesState.buildProgram(
        gl,
        name,
        {
            clipPos: `vec4(2.0 * ${uv} - 1.0, 0.0, 1.0)`,
            appendFragmentOutputs: (src) => src.push(`${outColor} = ${getOutColor}();`)
        });

    if (errors) {
        console.error(errors.join("\n"));
        throw errors;
    } else {
        const uvs = new Float32Array([1,1, 0,1, 0,0, 1,0]);
        const uvBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, uvs, uvs.length, 2, gl.STATIC_DRAW);

        // Mitigation: if Uint8Array is used, the geometry is corrupted on OSX when using Chrome with data-textures
        const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
        const indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, indices, indices.length, 1, gl.STATIC_DRAW);

        return {
            destroy: program.destroy,
            bind:    (viewportSize, project, depthTexture) => {
                program.bind();
                uViewportInv.setInputValue([1 / viewportSize[0], 1 / viewportSize[1]]);
                uCameraNear.setInputValue(project.near);
                uCameraFar.setInputValue(project.far);
                uDepthTexture.setInputValue(depthTexture);

                uv.setInputValue(uvBuf);
            },
            draw:    () => {
                indicesBuf.bind();
                gl.drawElements(gl.TRIANGLES, indicesBuf.numItems, indicesBuf.itemType, 0);
            }
        };
    }
};

/**
 * SAO implementation inspired from previous SAO work in THREE.js by ludobaka / ludobaka.github.io and bhouston
 * @private
 */
export class SAOOcclusionRenderer {

    constructor(gl, numSamples) {

        const programVariablesState = createProgramVariablesState();

        const programVariables = programVariablesState.programVariables;

        const uProjectMatrix = programVariables.createUniform("mat4", "uProjectMatrix");
        const uInvProjMatrix = programVariables.createUniform("mat4", "uInvProjMatrix");
        const uPerspective   = programVariables.createUniform("bool", "uPerspective");
        const uScale         = programVariables.createUniform("float", "uScale");
        const uIntensity     = programVariables.createUniform("float", "uIntensity");
        const uBias          = programVariables.createUniform("float", "uBias");
        const uKernelRadius  = programVariables.createUniform("float", "uKernelRadius");
        const uMinResolution = programVariables.createUniform("float", "uMinResolution");
        const uRandomSeed    = programVariables.createUniform("float", "uRandomSeed");

        const program = SAOProgram(
            gl,
            "SAOOcclusionRenderer",
            programVariablesState,
            (name, vUV, uViewportInv, uCameraNear, uCameraFar, getDepth) => {
                return `
                #define EPSILON 1e-6
                #define PI 3.14159265359
                #define PI2 6.28318530718
                #define NUM_SAMPLES ${numSamples}
                #define NUM_RINGS 4

                const vec3 packFactors = vec3(256. * 256. * 256., 256. * 256., 256.);

                vec4 packFloatToRGBA(const in float v) {
                    vec4 r = vec4(fract(v * packFactors), v);
                    r.yzw -= r.xyz / 256.;
                    return r * 256. / 255.;
                }

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
                    return (${uInvProjMatrix} * (clipW * vec4((vec3(screenPos, depth) - 0.5) * 2.0, 1.0))).xyz;
                }

                vec4 ${name}() {
                    float centerDepth = ${getDepth}(${vUV});
                    if (centerDepth >= (1.0 - EPSILON)) {
                        discard;
                    }

                    vec3 centerViewPosition = getViewPos(${vUV}, centerDepth);
                    float scaleDividedByCameraFar = ${uScale} / ${uCameraFar};
                    float minResolutionMultipliedByCameraFar = ${uMinResolution} * ${uCameraFar};
                    vec3 centerViewNormal = normalize(cross(dFdx(centerViewPosition), dFdy(centerViewPosition)));

                    vec2 radiusStep = ${uKernelRadius} * ${uViewportInv} / float(NUM_SAMPLES);
                    vec2 radius = radiusStep;
                    const float angleStep = PI2 * float(NUM_RINGS) / float(NUM_SAMPLES);
                    float angle = PI2 * rand(${vUV} + ${uRandomSeed});

                    float occlusionSum = 0.0;
                    float weightSum = 0.0;

                    for (int i = 0; i < NUM_SAMPLES; i++) {
                        vec2 sampleUv = ${vUV} + vec2(cos(angle), sin(angle)) * radius;
                        radius += radiusStep;
                        angle += angleStep;

                        float sampleDepth = ${getDepth}(sampleUv);
                        if (sampleDepth >= (1.0 - EPSILON)) {
                            continue;
                        }

                        vec3 sampleViewPosition = getViewPos(sampleUv, sampleDepth);
                        vec3 viewDelta = sampleViewPosition - centerViewPosition;
                        float scaledScreenDistance = scaleDividedByCameraFar * length(viewDelta);
                        occlusionSum += max(0.0, (dot(centerViewNormal, viewDelta) - minResolutionMultipliedByCameraFar) / scaledScreenDistance - ${uBias}) / (1.0 + scaledScreenDistance * scaledScreenDistance );
                        weightSum += 1.0;
                    }

                    return packFloatToRGBA(1.0 - occlusionSum * ${uIntensity} / weightSum);
                }`;
            });

        this.destroy = program.destroy;
        this.render = (viewportSize, project, sao, depthTexture) => {
            program.bind(viewportSize, project, depthTexture);

            uProjectMatrix.setInputValue(project.matrix);
            uInvProjMatrix.setInputValue(project.inverseMatrix);
            uPerspective.setInputValue(project.type === "Perspective");
            uScale.setInputValue(sao.scale * project.far / 5);
            uIntensity.setInputValue(sao.intensity);
            uBias.setInputValue(sao.bias);
            uKernelRadius.setInputValue(sao.kernelRadius);
            uMinResolution.setInputValue(sao.minResolution);
            uRandomSeed.setInputValue(Math.random());

            program.draw();
        };
    }
}
