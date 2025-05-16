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

        const position = programVariables.createAttribute("vec3", "position");
        const uv       = programVariables.createAttribute("vec2", "uv");

        const vUV      = programVariables.createVarying("vec2", "vUV", () => uv);

        const outColor = programVariables.createOutput("vec4", "outColor");

        const getOutColor = programVariables.createFragmentDefinition(
            "getOutColor",
            (name, src) => {
                src.push(`
                #define NORMAL_TEXTURE 0
                #define PI 3.14159265359
                #define PI2 6.28318530718
                #define EPSILON 1e-6
                #define NUM_SAMPLES ${this._numSamples}
                #define NUM_RINGS 4              

                float pow2( const in float x ) { return x*x; }
                
                highp float rand( const in vec2 uv ) {
                    const highp float a = 12.9898, b = 78.233, c = 43758.5453;
                    highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
                    return fract(sin(sn) * c);
                }

                vec3 packNormalToRGB( const in vec3 normal ) {
                    return normalize( normal ) * 0.5 + 0.5;
                }

                vec3 unpackRGBToNormal( const in vec3 rgb ) {
                    return 2.0 * rgb.xyz - 1.0;
                }

                const float packUpscale = 256. / 255.;
                const float unpackDownScale = 255. / 256.; 

                const vec3 packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );
                const vec4 unPackFactors = unpackDownScale / vec4( packFactors, 1. );   

                const float shiftRights = 1. / 256.;

                vec4 packFloatToRGBA( const in float v ) {
                    vec4 r = vec4( fract( v * packFactors ), v );
                    r.yzw -= r.xyz * shiftRights; 
                    return r * packUpscale;
                }

                float unpackRGBAToFloat( const in vec4 v ) {                   
                    return dot( floor( v * 255.0 + 0.5 ) / 255.0, unPackFactors );
                }
                
                float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
                    return ( near * far ) / ( ( far - near ) * invClipZ - far );
                }

                float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
                    return linearClipZ * ( near - far ) - near;
                }
                
                float getDepth( const in vec2 screenPosition ) {
                    return vec4(texture(${uDepthTexture}, screenPosition)).r;
                }

                float getViewZ( const in float depth ) {
                     if (${uPerspective}) {
                         return perspectiveDepthToViewZ( depth, ${uCameraNear}, ${uCameraFar} );
                     } else {
                        return orthographicDepthToViewZ( depth, ${uCameraNear}, ${uCameraFar} );
                     }
                }

                vec3 getViewPos( const in vec2 screenPos, const in float depth, const in float viewZ ) {
                       float clipW = ${uProjectMatrix}[2][3] * viewZ + ${uProjectMatrix}[3][3];
                	vec4 clipPosition = vec4( ( vec3( screenPos, depth ) - 0.5 ) * 2.0, 1.0 );
                	clipPosition *= clipW; 
                       return ( ${uInverseProjectMatrix} * clipPosition ).xyz;
                }

                vec3 getViewNormal( const in vec3 viewPosition, const in vec2 screenPos ) {               
                    return normalize( cross( dFdx( viewPosition ), dFdy( viewPosition ) ) );
                }

                float scaleDividedByCameraFar;
                float minResolutionMultipliedByCameraFar;

                float getOcclusion( const in vec3 centerViewPosition, const in vec3 centerViewNormal, const in vec3 sampleViewPosition ) {
                	vec3 viewDelta = sampleViewPosition - centerViewPosition;
                	float viewDistance = length( viewDelta );
                	float scaledScreenDistance = scaleDividedByCameraFar * viewDistance;
                       return max(0.0, (dot(centerViewNormal, viewDelta) - minResolutionMultipliedByCameraFar) / scaledScreenDistance - ${uBias}) / (1.0 + pow2( scaledScreenDistance ) );
                }

                const float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );
                const float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );

                float getAmbientOcclusion( const in vec3 centerViewPosition ) {
            
                       scaleDividedByCameraFar = ${uScale} / ${uCameraFar};
                       minResolutionMultipliedByCameraFar = ${uMinResolution} * ${uCameraFar};
                       vec3 centerViewNormal = getViewNormal( centerViewPosition, ${vUV} );

                       float angle = rand( ${vUV} + ${uRandomSeed} ) * PI2;
                       vec2 radius = vec2( ${uKernelRadius} * INV_NUM_SAMPLES ) / ${uViewport};
                	vec2 radiusStep = radius;

                	float occlusionSum = 0.0;
                	float weightSum = 0.0;

                	for( int i = 0; i < NUM_SAMPLES; i ++ ) {
                               vec2 sampleUv = ${vUV} + vec2( cos( angle ), sin( angle ) ) * radius;
                		radius += radiusStep;
                		angle += ANGLE_STEP;

                		float sampleDepth = getDepth( sampleUv );
                		if( sampleDepth >= ( 1.0 - EPSILON ) ) {
                			continue;
                		}

                		float sampleViewZ = getViewZ( sampleDepth );
                		vec3 sampleViewPosition = getViewPos( sampleUv, sampleDepth, sampleViewZ );
                		occlusionSum += getOcclusion( centerViewPosition, centerViewNormal, sampleViewPosition );
                		weightSum += 1.0;
                	}

                	if( weightSum == 0.0 ) discard;

                       return occlusionSum * ( ${uIntensity} / weightSum );
                }

                vec4 ${name}() {
                        float centerDepth = getDepth( ${vUV} );

                	if( centerDepth >= ( 1.0 - EPSILON ) ) {
                		discard;
                	}

                	float centerViewZ = getViewZ( centerDepth );
                        vec3 viewPosition = getViewPos( ${vUV}, centerDepth, centerViewZ );

                	float ambientOcclusion = getAmbientOcclusion( viewPosition );
                
                        return packFloatToRGBA(  1.0- ambientOcclusion );
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
                clipPos: `vec4(${position}, 1.0)`
            });

        if (errors) {
            console.error(errors.join("\n"));
            this._programError = true;
        } else {
            const binder = (arr, size) => {
                const b = new ArrayBuf(gl, gl.ARRAY_BUFFER, arr, arr.length, size, gl.STATIC_DRAW);
                return {
                    bindAtLocation: location => { // see ArrayBuf.js and Attribute.js
                        b.bind();
                        this._scene.canvas.gl.vertexAttribPointer(location, b.itemSize, b.itemType, b.normalized, 0, 0);
                    }
                };
            };
            const positionsBuf = binder(new Float32Array([1, 1, 0,  -1, 1, 0,  -1, -1, 0,  1, -1, 0]), 3);
            const uvBuf        = binder(new Float32Array([  1, 1,      0, 1,      0, 0,      1, 0]),   2);

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

                    uv.setInputValue(uvBuf);
                    position.setInputValue(positionsBuf);

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
