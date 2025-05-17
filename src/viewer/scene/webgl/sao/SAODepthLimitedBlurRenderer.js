import {createProgramVariablesState} from "../WebGLRenderer.js";
import {ArrayBuf} from "./../ArrayBuf.js";

const iota = (n) => { const ret = [ ]; for (let i = 0; i < n; ++i) ret.push(i); return ret; };

const blurStdDev = 4;
const blurDepthCutoff = 0.01;
const KERNEL_RADIUS = 16;

function createSampleOffsets(uvIncrement) {
    const offsets = [];
    for (let i = 0; i <= KERNEL_RADIUS + 1; i++) {
        offsets.push(uvIncrement[0] * i);
        offsets.push(uvIncrement[1] * i);
    }
    return new Float32Array(offsets);
}

const sampleOffsetsVer = createSampleOffsets([0, 1]);
const sampleOffsetsHor = createSampleOffsets([1, 0]);

const gaussian = (i, stdDev) => Math.exp(-(i * i) / (2.0 * (stdDev * stdDev))) / (Math.sqrt(2.0 * Math.PI) * stdDev);
const sampleWeights = new Float32Array(iota(KERNEL_RADIUS + 1).map(i => gaussian(i, blurStdDev))); // TODO: Optimize

/**
 * SAO implementation inspired from previous SAO work in THREE.js by ludobaka / ludobaka.github.io and bhouston
 * @private
 */
export class SAODepthLimitedBlurRenderer {

    init(gl) {
        const programVariablesState = createProgramVariablesState();

        const programVariables = programVariablesState.programVariables;

        const uViewport      = programVariables.createUniform("vec2", "uViewport");
        const uCameraNear    = programVariables.createUniform("float", "uCameraNear");
        const uCameraFar     = programVariables.createUniform("float", "uCameraFar");
        const uDepthCutoff   = programVariables.createUniform("float", "uDepthCutoff");
        const uSampleOffsets = programVariables.createUniformArray("vec2",  "uSampleOffsets", KERNEL_RADIUS + 1);
        const uSampleWeights = programVariables.createUniformArray("float", "uSampleWeights", KERNEL_RADIUS + 1);

        const uDepthTexture     = programVariables.createUniform("sampler2D", "uDepthTexture");
        const uOcclusionTexture = programVariables.createUniform("sampler2D", "uOcclusionTexture");

        const aPosition = programVariables.createAttribute("vec3", "aPosition");
        const aUV       = programVariables.createAttribute("vec2", "aUV");
        const vUV       = programVariables.createVarying("vec2", "vUV", () => aUV);

        const vInvSize = programVariables.createVarying("vec2", "vInvSize", () => `1.0 / ${uViewport}`);

        const outColor = programVariables.createOutput("vec4", "outColor");

        const getOutColor = programVariables.createFragmentDefinition(
            "getOutColor",
            (name, src) => {
                src.push(`
                #define PI 3.14159265359
                #define PI2 6.28318530718
                #define EPSILON 1e-6

                #define KERNEL_RADIUS ${KERNEL_RADIUS}

                const float         unpackDownscale = 255. / 256.; 

                const vec3          packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );
                const vec4          unpackFactors = unpackDownscale / vec4( packFactors, 1. );   

                const float packUpscale = 256. / 255.;
       
                const float shiftRights = 1. / 256.;
                
                float unpackRGBAToFloat( const in vec4 v ) {
                    return dot( floor( v * 255.0 + 0.5 ) / 255.0, unpackFactors );
                }               

                vec4 packFloatToRGBA( const in float v ) {
                    vec4 r = vec4( fract( v * packFactors ), v );
                    r.yzw -= r.xyz * shiftRights; 
                    return r * packUpscale;
                }

                float viewZToOrthographicDepth( const in float viewZ) {
                    return ( viewZ + ${uCameraNear} ) / ( ${uCameraNear} - ${uCameraFar} );
                }
              
                float orthographicDepthToViewZ( const in float linearClipZ) {
                    return linearClipZ * ( ${uCameraNear} - ${uCameraFar} ) - ${uCameraNear};
                }

                float viewZToPerspectiveDepth( const in float viewZ) {
                    return (( ${uCameraNear} + viewZ ) * ${uCameraFar} ) / (( ${uCameraFar} - ${uCameraNear} ) * viewZ );
                }
                
                float perspectiveDepthToViewZ( const in float invClipZ) {
                    return ( ${uCameraNear} * ${uCameraFar} ) / ( ( ${uCameraFar} - ${uCameraNear} ) * invClipZ - ${uCameraFar} );
                }

                float getDepth( const in vec2 screenPosition ) {
                    return vec4(texture(${uDepthTexture}, screenPosition)).r;
                }

                float getViewZ( const in float depth ) {
                     return perspectiveDepthToViewZ( depth );
                }

                vec4 ${name}() {
                    float depth = getDepth( ${vUV} );
                    if( depth >= ( 1.0 - EPSILON ) ) {
                        discard;
                    }

                    float centerViewZ = -getViewZ( depth );
                    bool rBreak = false;
                    bool lBreak = false;

                    float weightSum = ${uSampleWeights}[0];
                    float occlusionSum = unpackRGBAToFloat(texture( ${uOcclusionTexture}, ${vUV} )) * weightSum;

                    for( int i = 1; i <= KERNEL_RADIUS; i ++ ) {

                        float sampleWeight = ${uSampleWeights}[i];
                        vec2 sampleUVOffset = ${uSampleOffsets}[i] * ${vInvSize};

                        vec2 sampleUV = ${vUV} + sampleUVOffset;
                        float viewZ = -getViewZ( getDepth( sampleUV ) );

                        if( abs( viewZ - centerViewZ ) > ${uDepthCutoff} ) {
                            rBreak = true;
                        }

                        if( ! rBreak ) {
                            occlusionSum += unpackRGBAToFloat(texture( ${uOcclusionTexture}, sampleUV )) * sampleWeight;
                            weightSum += sampleWeight;
                        }

                        sampleUV = ${vUV} - sampleUVOffset;
                        viewZ = -getViewZ( getDepth( sampleUV ) );

                        if( abs( viewZ - centerViewZ ) > ${uDepthCutoff} ) {
                            lBreak = true;
                        }

                        if( ! lBreak ) {
                            occlusionSum += unpackRGBAToFloat(texture( ${uOcclusionTexture}, sampleUV )) * sampleWeight;
                            weightSum += sampleWeight;
                        }
                    }

                    return packFloatToRGBA(occlusionSum / weightSum);
                }`);
            });

        const [program, errors] = programVariablesState.buildProgram(
            gl,
            "SAODepthLimitedBlurRenderer",
            {
                ignoreSectionPlanes: true,
                scene: { },
                appendFragmentOutputs: (src) => src.push(`${outColor} = ${getOutColor}();`),
                fragmentOutputsSetup: [ ],
                getVertexData: () => [ ],
                clipPos: `vec4(${aPosition}, 1.0)`
            });

        if (errors) {
            console.error(errors.join("\n"));
            throw errors;
        } else {
            const binder = (arr, size) => {
                const b = new ArrayBuf(gl, gl.ARRAY_BUFFER, arr, arr.length, size, gl.STATIC_DRAW);
                return {
                    bindAtLocation: location => { // see ArrayBuf.js and Attribute.js
                        b.bind();
                        gl.vertexAttribPointer(location, b.itemSize, b.itemType, b.normalized, 0, 0);
                    }
                };
            };
            const positionsBuf = binder(new Float32Array([1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0]), 3);
            const uvBuf        = binder(new Float32Array([1, 1, 0, 1, 0, 0, 1, 0]), 2);

            // Mitigation: if Uint8Array is used, the geometry is corrupted on OSX when using Chrome with data-textures
            const indices      = new Uint32Array([0, 1, 2, 0, 2, 3]);
            const indicesBuf   = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, indices, indices.length, 1, gl.STATIC_DRAW);

            this.destroy = program.destroy;
            this.render = (viewportSize, near, far, direction, depthTexture, occlusionTexture) => {
                program.bind();

                uViewport.setInputValue(viewportSize);
                uCameraNear.setInputValue(near);
                uCameraFar.setInputValue(far);
                uDepthCutoff.setInputValue(blurDepthCutoff);
                uSampleOffsets.setInputValue((direction === 0) ? sampleOffsetsHor : sampleOffsetsVer);
                uSampleWeights.setInputValue(sampleWeights);

                uDepthTexture.setInputValue(depthTexture);
                uOcclusionTexture.setInputValue(occlusionTexture);

                aPosition.setInputValue(positionsBuf);
                aUV.setInputValue(uvBuf);

                indicesBuf.bind();
                gl.drawElements(gl.TRIANGLES, indicesBuf.numItems, indicesBuf.itemType, 0);
            };
        }
    }
}
