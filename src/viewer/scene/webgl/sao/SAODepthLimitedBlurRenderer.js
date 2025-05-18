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

        const uViewportInv   = programVariables.createUniform("vec2", "uViewportInv");
        const uCameraNear    = programVariables.createUniform("float", "uCameraNear");
        const uCameraFar     = programVariables.createUniform("float", "uCameraFar");
        const uDepthCutoff   = programVariables.createUniform("float", "uDepthCutoff");
        const uSampleOffsets = programVariables.createUniformArray("vec2",  "uSampleOffsets", KERNEL_RADIUS + 1);
        const uSampleWeights = programVariables.createUniformArray("float", "uSampleWeights", KERNEL_RADIUS + 1);

        const uDepthTexture  = programVariables.createUniform("sampler2D", "uDepthTexture");
        const uOcclusionTex  = programVariables.createUniform("sampler2D", "uOcclusionTex");

        const uv       = programVariables.createAttribute("vec2", "uv");
        const vUV      = programVariables.createVarying("vec2", "vUV", () => uv);
        const outColor = programVariables.createOutput("vec4", "outColor");

        const getOutColor = programVariables.createFragmentDefinition(
            "getOutColor",
            (name, src) => {
                src.push(`
                #define EPSILON 1e-6

                const vec3 packFactors = vec3(256. * 256. * 256., 256. * 256., 256.);

                vec4 packFloatToRGBA(const in float v) {
                    vec4 r = vec4(fract(v * packFactors), v);
                    r.yzw -= r.xyz / 256.;
                    return r * 256. / 255.;
                }

                float getDepth(const in vec2 uv) {
                    return texture(${uDepthTexture}, uv).r;
                }

                float getOcclusion(const in vec2 uv) {
                    vec4 v = texture(${uOcclusionTex}, uv);
                    return dot(floor(v * 255.0 + 0.5) / 255.0, 255. / 256. / vec4(packFactors, 1.)); // unpackRGBAToFloat
                }

                float getViewZ(const in float depth) {
                    return (${uCameraNear} * ${uCameraFar}) / ((${uCameraFar} - ${uCameraNear}) * depth - ${uCameraFar});
                }

                vec4 ${name}() {
                    float centerDepth = getDepth(${vUV});
                    if (centerDepth >= (1.0 - EPSILON)) {
                        discard;
                    }

                    float centerViewZ = getViewZ(centerDepth);
                    bool rBreak = false;
                    bool lBreak = false;

                    float weightSum = ${uSampleWeights}[0];
                    float occlusionSum = getOcclusion(${vUV}) * weightSum;

                    for (int i = 1; i <= ${KERNEL_RADIUS}; i++) {
                        float sampleWeight = ${uSampleWeights}[i];
                        vec2 sampleUVOffset = ${uSampleOffsets}[i] * ${uViewportInv};

                        if (! rBreak) {
                            vec2 rSampleUV = ${vUV} + sampleUVOffset;
                            if (abs(centerViewZ - getViewZ(getDepth(rSampleUV))) > ${uDepthCutoff}) {
                                rBreak = true;
                            } else {
                                occlusionSum += getOcclusion(rSampleUV) * sampleWeight;
                                weightSum += sampleWeight;
                            }
                        }

                        if (! lBreak) {
                            vec2 lSampleUV = ${vUV} - sampleUVOffset;
                            if (abs(centerViewZ - getViewZ(getDepth(lSampleUV))) > ${uDepthCutoff}) {
                                lBreak = true;
                            } else {
                                occlusionSum += getOcclusion(lSampleUV) * sampleWeight;
                                weightSum += sampleWeight;
                            }
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
                clipPos: `vec4(2.0 * ${uv} - 1.0, 0.0, 1.0)`,
                appendFragmentOutputs: (src) => src.push(`${outColor} = ${getOutColor}();`)
            });

        if (errors) {
            console.error(errors.join("\n"));
            throw errors;
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

            this.destroy = program.destroy;
            this.render = (viewportSize, project, direction, depthTexture, occlusionTexture) => {
                program.bind();

                uViewportInv.setInputValue([1 / viewportSize[0], 1 / viewportSize[1]]);
                uCameraNear.setInputValue(project.near);
                uCameraFar.setInputValue(project.far);
                uDepthCutoff.setInputValue(blurDepthCutoff);
                uSampleOffsets.setInputValue((direction === 0) ? sampleOffsetsHor : sampleOffsetsVer);
                uSampleWeights.setInputValue(sampleWeights);

                uDepthTexture.setInputValue(depthTexture);
                uOcclusionTex.setInputValue(occlusionTexture);

                uv.setInputValue(uvBufBinder);

                indicesBuf.bind();
                gl.drawElements(gl.TRIANGLES, indicesBuf.numItems, indicesBuf.itemType, 0);
            };
        }
    }
}
