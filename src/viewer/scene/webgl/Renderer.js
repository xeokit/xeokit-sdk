import {FrameContext} from './FrameContext.js';
import {math} from '../math/math.js';
import {stats} from '../stats.js';
import {WEBGL_INFO} from '../webglInfo.js';
import {Map} from "../utils/Map.js";
import {PickResult} from "./PickResult.js";
import {OcclusionTester} from "./occlusion/OcclusionTester.js";
import {createRTCViewMat} from "../math/rtcCoords.js";
import {RenderBuffer} from "./RenderBuffer.js";
import {getExtension} from "./getExtension.js";
import {createProgramVariablesState} from "./WebGLRenderer.js";
import {ArrayBuf} from "./ArrayBuf.js";

const OCCLUSION_TEST_MODE = false;

const vec3_0 = math.vec3([0,0,0]);

const iota = (n) => { const ret = [ ]; for (let i = 0; i < n; ++i) ret.push(i); return ret; };

const bitShiftScreenZ = math.vec4([1.0 / (256.0 * 256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0]);

const pixelToInt = pix => pix[0] + (pix[1] << 8) + (pix[2] << 16) + (pix[3] << 24);

const toWorldNormal = (n) => math.normalizeVec3(math.divVec3Scalar(n, math.MAX_INT, math.vec3()));
const toWorldPos    = (p, origin, scale) => math.vec3([ p[0] * scale[0] + origin[0],
                                                        p[1] * scale[1] + origin[1],
                                                        p[2] * scale[2] + origin[2] ]);

/**
 * @private
 */
const Renderer = function (scene, options) {

    options = options || {};

    const frameCtx = new FrameContext();
    const canvas = scene.canvas.canvas;
    /**
     * @type {WebGL2RenderingContext}
     */
    const gl = scene.canvas.gl;
    const canvasTransparent = (!!options.transparent);
    const alphaDepthMask = options.alphaDepthMask;

    const pickIDs = new Map({});

    let drawableTypeInfo = {};
    let drawables = {};

    let postSortDrawableList = [];
    let postCullDrawableList = [];
    let uiDrawableList       = [];

    let drawableListDirty = true;
    let stateSortDirty = true;
    let imageDirty = true;
    let shadowsDirty = true;

    let transparentEnabled = true;
    let edgesEnabled = true;
    let saoEnabled = true;
    let pbrEnabled = true;
    let colorTextureEnabled = true;

    const renderBufferManager = (function() {
        const renderBuffersBasic  = {};
        const renderBuffersScaled = {};
        return {
            getRenderBuffer: (id, colorFormats, hasDepthTexture) => {
                const renderBuffers = (scene.canvas.resolutionScale === 1.0) ? renderBuffersBasic : renderBuffersScaled;
                if (! renderBuffers[id]) {
                    renderBuffers[id] = new RenderBuffer(gl, colorFormats, hasDepthTexture);
                }
                return renderBuffers[id];
            },
            destroy: () => {
                Object.values(renderBuffersBasic ).forEach(buf => buf.destroy());
                Object.values(renderBuffersScaled).forEach(buf => buf.destroy());
            }
        };
    })();

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

    // SAO implementation inspired from previous SAO work in THREE.js by ludobaka / ludobaka.github.io and bhouston
    const saoOcclusionRenderer = (function() {
        let currentRenrerer = null;
        let curNumSamples = null;
        return {
            destroy: () => currentRenrerer && currentRenrerer.destroy(),
            render: (viewportSize, project, sao, depthTexture) => {
                const numSamples = Math.floor(sao.numSamples);
                if (curNumSamples !== numSamples) {
                    currentRenrerer && currentRenrerer.destroy();

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

                    currentRenrerer = {
                        destroy: program.destroy,
                        render:  (viewportSize, project, sao, depthTexture) => {
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
                        }
                    };

                    curNumSamples = numSamples;
                }

                currentRenrerer.render(viewportSize, project, sao, depthTexture);
            }
        };
    })();

    const saoDepthLimitedBlurRenderer = (function() {
        const blurStdDev = 4;
        const blurDepthCutoff = 0.01;
        const KERNEL_RADIUS = 16;

        const createSampleOffsets = (uvIncrement) => {
            const offsets = [];
            for (let i = 0; i <= KERNEL_RADIUS + 1; i++) {
                offsets.push(uvIncrement[0] * i);
                offsets.push(uvIncrement[1] * i);
            }
            return new Float32Array(offsets);
        };

        const sampleOffsetsVer = createSampleOffsets([0, 1]);
        const sampleOffsetsHor = createSampleOffsets([1, 0]);

        const gaussian = (i, stdDev) => Math.exp(-(i * i) / (2.0 * (stdDev * stdDev))) / (Math.sqrt(2.0 * Math.PI) * stdDev);
        const sampleWeights = new Float32Array(iota(KERNEL_RADIUS + 1).map(i => gaussian(i, blurStdDev))); // TODO: Optimize

        const programVariablesState = createProgramVariablesState();

        const programVariables = programVariablesState.programVariables;

        const uDepthCutoff   = programVariables.createUniform("float", "uDepthCutoff");
        const uSampleOffsets = programVariables.createUniformArray("vec2",  "uSampleOffsets", KERNEL_RADIUS + 1);
        const uSampleWeights = programVariables.createUniformArray("float", "uSampleWeights", KERNEL_RADIUS + 1);

        const uOcclusionTex  = programVariables.createUniform("sampler2D", "uOcclusionTex");

        const program = SAOProgram(
            gl,
            "SAODepthLimitedBlurRenderer",
            programVariablesState,
            (name, vUV, uViewportInv, uCameraNear, uCameraFar, getDepth) => {
                return `
                    #define EPSILON 1e-6

                    const vec3 packFactors = vec3(256. * 256. * 256., 256. * 256., 256.);

                    vec4 packFloatToRGBA(const in float v) {
                        vec4 r = vec4(fract(v * packFactors), v);
                        r.yzw -= r.xyz / 256.;
                        return r * 256. / 255.;
                    }

                    float getOcclusion(const in vec2 uv) {
                        vec4 v = texture(${uOcclusionTex}, uv);
                        return dot(floor(v * 255.0 + 0.5) / 255.0, 255. / 256. / vec4(packFactors, 1.)); // unpackRGBAToFloat
                    }

                    float getViewZ(const in float depth) {
                        return (${uCameraNear} * ${uCameraFar}) / ((${uCameraFar} - ${uCameraNear}) * depth - ${uCameraFar});
                    }

                    vec4 ${name}() {
                        float centerDepth = ${getDepth}(${vUV});
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
                                if (abs(centerViewZ - getViewZ(${getDepth}(rSampleUV))) > ${uDepthCutoff}) {
                                    rBreak = true;
                                } else {
                                    occlusionSum += getOcclusion(rSampleUV) * sampleWeight;
                                    weightSum += sampleWeight;
                                }
                            }

                            if (! lBreak) {
                                vec2 lSampleUV = ${vUV} - sampleUVOffset;
                                if (abs(centerViewZ - getViewZ(${getDepth}(lSampleUV))) > ${uDepthCutoff}) {
                                    lBreak = true;
                                } else {
                                    occlusionSum += getOcclusion(lSampleUV) * sampleWeight;
                                    weightSum += sampleWeight;
                                }
                            }
                        }

                        return packFloatToRGBA(occlusionSum / weightSum);
                    }`;
            });

        return {
            destroy: program.destroy,
            render:  (viewportSize, project, direction, depthTexture, occlusionTexture) => {
                program.bind(viewportSize, project, depthTexture);

                uDepthCutoff.setInputValue(blurDepthCutoff);
                uSampleOffsets.setInputValue((direction === 0) ? sampleOffsetsHor : sampleOffsetsVer);
                uSampleWeights.setInputValue(sampleWeights);
                uOcclusionTex.setInputValue(occlusionTexture);

                program.draw();
            }
        };
    })();

    const getSceneCameraViewParams = (function() {
        let params = null; // scene.camera not defined yet
        return function() {
            if (! params) {
                const camera = scene.camera;
                params = {
                    get eye() { return camera.eye; },
                    get far() { return camera.project.far; },
                    get projMatrix() { return camera.projMatrix; },
                    get viewMatrix() { return camera.viewMatrix; },
                    get viewNormalMatrix() { return camera.viewNormalMatrix; }
                };
            }
            return params;
        };
    })();

    const getNearPlaneHeight = (camera, drawingBufferHeight) => ((camera.projection === "ortho")
                                                                 ? 1.0
                                                                 : (drawingBufferHeight / (2 * Math.tan(0.5 * camera.perspective.fov * Math.PI / 180.0))));

    this.scene = scene;

    this._occlusionTester = null; // Lazy-created in #addMarker()

    this.capabilities = {
        astcSupported: !!getExtension(gl, 'WEBGL_compressed_texture_astc'),
        etc1Supported: true, // WebGL2
        etc2Supported: !!getExtension(gl, 'WEBGL_compressed_texture_etc'),
        dxtSupported: !!getExtension(gl, 'WEBGL_compressed_texture_s3tc'),
        bptcSupported: !!getExtension(gl, 'EXT_texture_compression_bptc'),
        pvrtcSupported: !!(getExtension(gl, 'WEBGL_compressed_texture_pvrtc') || getExtension(gl, 'WEBKIT_WEBGL_compressed_texture_pvrtc'))
    };

    this.setTransparentEnabled = function (enabled) {
        transparentEnabled = enabled;
        imageDirty = true;
    };

    this.setEdgesEnabled = function (enabled) {
        edgesEnabled = enabled;
        imageDirty = true;
    };

    this.setSAOEnabled = function (enabled) {
        saoEnabled = enabled;
        imageDirty = true;
    };

    this.setPBREnabled = function (enabled) {
        pbrEnabled = enabled;
        imageDirty = true;
    };

    this.setColorTextureEnabled = function (enabled) {
        colorTextureEnabled = enabled;
        imageDirty = true;
    };

    this.needStateSort = function () {
        stateSortDirty = true;
    };

    this.shadowsDirty = function () {
        shadowsDirty = true;
    };

    this.imageDirty = function () {
        imageDirty = true;
    };

    /**
     * Inserts a drawable into this renderer.
     *  @private
     */
    this.addDrawable = function (id, drawable) {
        const type = drawable.type;
        if (!type) {
            console.error("Renderer#addDrawable() : drawable with ID " + id + " has no 'type' - ignoring");
            return;
        }
        let drawableInfo = drawableTypeInfo[type];
        if (!drawableInfo) {
            drawableInfo = {
                type: drawable.type,
                count: 0,
                isStateSortable: drawable.isStateSortable,
                stateSortCompare: drawable.stateSortCompare,
                drawableMap: {},
                drawableListPreCull: [],
                drawableList: []
            };
            drawableTypeInfo[type] = drawableInfo;
        }
        drawableInfo.count++;
        drawableInfo.drawableMap[id] = drawable;
        drawables[id] = drawable;
        drawableListDirty = true;
    };

    /**
     * Removes a drawable from this renderer.
     *  @private
     */
    this.removeDrawable = function (id) {
        const drawable = drawables[id];
        if (!drawable) {
            console.error("Renderer#removeDrawable() : drawable not found with ID " + id + " - ignoring");
            return;
        }
        const type = drawable.type;
        const drawableInfo = drawableTypeInfo[type];
        if (--drawableInfo.count <= 0) {
            delete drawableTypeInfo[type];
        } else {
            delete drawableInfo.drawableMap[id];
        }
        delete drawables[id];
        drawableListDirty = true;
    };

    /**
     * Gets a unique pick ID for the given Pickable. A Pickable can be a {@link Mesh} or a {@link PerformanceMesh}.
     * @returns {Number} New pick ID.
     */
    this.getPickID = function (entity) {
        return pickIDs.addItem(entity);
    };

    /**
     * Released a pick ID for reuse.
     * @param {Number} pickID Pick ID to release.
     */
    this.putPickID = function (pickID) {
        pickIDs.removeItem(pickID);
    };

    /**
     * Clears the canvas.
     *  @private
     */
    this.clear = function (params) {
        params = params || {};
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        if (canvasTransparent) {
            gl.clearColor(1, 1, 1, 1);
        } else {
            const backgroundColor = scene.canvas.backgroundColorFromAmbientLight ? this.lights.getAmbientColorAndIntensity() : scene.canvas.backgroundColor;
            gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], 1.0);
        }
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    };

    /**
     * Returns true if the next call to render() will draw something
     * @returns {Boolean}
     */
    this.needsRender = function () {
        const needsRender = (imageDirty || drawableListDirty || stateSortDirty);
        return needsRender;
    }

    /**
     * Renders inserted drawables.
     *  @private
     */
    this.render = function(pass, clear) {
        updateDrawlist();
        if (imageDirty) {
            draw(pass, clear);
            stats.frame.frameCount++;
            imageDirty = false;
        }
    };

    function updateDrawlist() { // Prepares state-sorted array of drawables from maps of inserted drawables
        if (drawableListDirty) {
            Object.values(drawableTypeInfo).forEach(drawableInfo => {
                const drawableListPreCull = drawableInfo.drawableListPreCull;
                let lenDrawableList = 0;
                Object.values(drawableInfo.drawableMap).forEach(drawable => { drawableListPreCull[lenDrawableList++] = drawable; });
                drawableListPreCull.length = lenDrawableList;
            });
            drawableListDirty = false;
            stateSortDirty = true;
        }
        if (stateSortDirty) {
            let lenDrawableList = 0;
            Object.values(drawableTypeInfo).forEach(drawableInfo => {
                drawableInfo.drawableListPreCull.forEach(drawable => { postSortDrawableList[lenDrawableList++] = drawable; });
            });
            postSortDrawableList.length = lenDrawableList;
            postSortDrawableList.sort((a, b) => a.renderOrder - b.renderOrder);
            stateSortDirty = false;
            imageDirty = true;
        }
        if (imageDirty) { // Image is usually dirty because the camera moved
            let lenDrawableList = 0;
            let lenUiList       = 0;
            postSortDrawableList.forEach(drawable => {
                drawable.rebuildRenderFlags();
                if (!drawable.renderFlags.culled) {
                    if (drawable.isUI) {
                        uiDrawableList[lenUiList++] = drawable;
                    } else {
                        postCullDrawableList[lenDrawableList++] = drawable;
                    }
                }
            });
            postCullDrawableList.length = lenDrawableList;
            uiDrawableList.length       = lenUiList;
        }
    }

    function draw(pass, clear) {

        const sao = scene.sao;
        const occlusionTexture = saoEnabled && sao.possible && (sao.numSamples >= 1) && drawSAOBuffers(pass);

        scene._lightsState.lights.forEach(light => {

            if (light.castsShadow) {
                const shadowRenderBuf = light.getShadowRenderBuf();
                shadowRenderBuf.bind();

                frameCtx.reset();
                frameCtx.backfaces = true;
                frameCtx.frontface = true;
                frameCtx.viewParams.viewMatrix = light.getShadowViewMatrix();
                frameCtx.viewParams.projMatrix = light.getShadowProjMatrix();
                frameCtx.nearPlaneHeight = getNearPlaneHeight(scene.camera, gl.drawingBufferHeight);

                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

                gl.clearColor(0, 0, 0, 1);
                gl.enable(gl.DEPTH_TEST);
                gl.disable(gl.BLEND);

                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                Object.values(drawableTypeInfo).forEach(
                    drawableInfo => {
                        drawableInfo.drawableList.forEach(
                            drawable => {
                                if ((drawable.visible !== false) && drawable.castsShadow && drawable.drawShadow) {
                                    if (drawable.renderFlags.colorOpaque) { // Transparent objects don't cast shadows (yet)
                                        drawable.drawShadow(frameCtx);
                                    }
                                }
                            });
                    });

                shadowRenderBuf.unbind();
            }
        });

        // const numVertexAttribs = WEBGL_INFO.MAX_VERTEX_ATTRIBS; // Fixes https://github.com/xeokit/xeokit-sdk/issues/174
        // for (let ii = 0; ii < numVertexAttribs; ii++) {
        //     gl.disableVertexAttribArray(ii);
        // }
        //
        shadowsDirty = false;

        drawColor(pass, clear, occlusionTexture);
    }

    function drawSAOBuffers(pass) {

        const sao = scene.sao;

        const size = [gl.drawingBufferWidth, gl.drawingBufferHeight];

        // Render depth buffer
        const saoDepthRenderBuffer = renderBufferManager.getRenderBuffer("saoDepth", [], true);
        saoDepthRenderBuffer.setSize(size);
        saoDepthRenderBuffer.bind();
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        frameCtx.reset();
        frameCtx.pass = pass;
        frameCtx.viewParams = getSceneCameraViewParams();
        frameCtx.nearPlaneHeight = getNearPlaneHeight(scene.camera, gl.drawingBufferHeight);

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.DEPTH_TEST);
        gl.frontFace(gl.CCW);
        gl.enable(gl.CULL_FACE);
        gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        postCullDrawableList.forEach(drawable => {
            if (!drawable.culled && drawable.visible && drawable.drawDepth && drawable.saoEnabled && drawable.renderFlags.colorOpaque) {
                drawable.drawDepth(frameCtx);
            }
        });

        saoDepthRenderBuffer.unbind();

        const depthTexture = saoDepthRenderBuffer.depthTexture;

        // Render occlusion buffer

        const occlusionRenderBuffer1 = renderBufferManager.getRenderBuffer("saoOcclusion");
        occlusionRenderBuffer1.setSize(size);
        occlusionRenderBuffer1.bind();

        gl.viewport(0, 0, size[0], size[1]);
        gl.clearColor(0, 0, 0, 1);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.frontFace(gl.CCW);
        gl.clear(gl.COLOR_BUFFER_BIT);

        saoOcclusionRenderer.render(size, scene.camera.project, sao, depthTexture);

        occlusionRenderBuffer1.unbind();

        if (sao.blur) {
            const occlusionRenderBuffer2 = renderBufferManager.getRenderBuffer("saoOcclusion2");
            occlusionRenderBuffer2.setSize(size);

            const blurSAO = (src, dst, direction) => {
                dst.bind();

                gl.viewport(0, 0, size[0], size[1]);
                gl.clearColor(0, 0, 0, 1);
                gl.enable(gl.DEPTH_TEST);
                gl.disable(gl.BLEND);
                gl.frontFace(gl.CCW);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                const project = scene.camera.project;
                saoDepthLimitedBlurRenderer.render(size, project, direction, depthTexture, src.colorTextures[0]);

                dst.unbind();
            };

            blurSAO(occlusionRenderBuffer1, occlusionRenderBuffer2, 0); // horizontally
            blurSAO(occlusionRenderBuffer2, occlusionRenderBuffer1, 1); // vertically
        }

        return occlusionRenderBuffer1.colorTextures[0];
    }

    function drawColor(pass, clear, occlusionTexture) {

        const normalDrawSAOBin = [];
        const normalEdgesOpaqueBin = [];
        const normalFillTransparentBin = [];
        const normalEdgesTransparentBin = [];

        const xrayedFillOpaqueBin = [];
        const xrayEdgesOpaqueBin = [];
        const xrayedFillTransparentBin = [];
        const xrayEdgesTransparentBin = [];

        const highlightedFillOpaqueBin = [];
        const highlightedEdgesOpaqueBin = [];
        const highlightedFillTransparentBin = [];
        const highlightedEdgesTransparentBin = [];

        const selectedFillOpaqueBin = [];
        const selectedEdgesOpaqueBin = [];
        const selectedFillTransparentBin = [];
        const selectedEdgesTransparentBin = [];


        const ambientColorAndIntensity = scene._lightsState.getAmbientColorAndIntensity();

        frameCtx.reset();
        frameCtx.pass = pass;
        frameCtx.withSAO = false;
        frameCtx.pbrEnabled = pbrEnabled && !!scene.pbrEnabled;
        frameCtx.colorTextureEnabled = colorTextureEnabled && !!scene.colorTextureEnabled;
        frameCtx.viewParams = getSceneCameraViewParams();
        frameCtx.nearPlaneHeight = getNearPlaneHeight(scene.camera, gl.drawingBufferHeight);

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        if (canvasTransparent) {
            gl.clearColor(0, 0, 0, 0);
        } else {
            const backgroundColor = scene.canvas.backgroundColorFromAmbientLight ? ambientColorAndIntensity : scene.canvas.backgroundColor;
            gl.clearColor(backgroundColor[0], backgroundColor[1], backgroundColor[2], 1.0);
        }

        gl.enable(gl.DEPTH_TEST);
        gl.frontFace(gl.CCW);
        gl.enable(gl.CULL_FACE);
        gl.depthMask(true);
        gl.lineWidth(1);

        frameCtx.lineWidth = 1;

        const sao = scene.sao;
        frameCtx.saoParams = [gl.drawingBufferWidth, gl.drawingBufferHeight, scene.sao.blendCutoff, scene.sao.blendFactor];
        frameCtx.occlusionTexture = occlusionTexture;

        let i;
        let len;
        let drawable;

        const startTime = Date.now();

        if (clear) {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }

        const renderDrawables = function(drawables) {

        let normalDrawSAOBinLen = 0;
        let normalEdgesOpaqueBinLen = 0;
        let normalFillTransparentBinLen = 0;
        let normalEdgesTransparentBinLen = 0;

        let xrayedFillOpaqueBinLen = 0;
        let xrayEdgesOpaqueBinLen = 0;
        let xrayedFillTransparentBinLen = 0;
        let xrayEdgesTransparentBinLen = 0;

        let highlightedFillOpaqueBinLen = 0;
        let highlightedEdgesOpaqueBinLen = 0;
        let highlightedFillTransparentBinLen = 0;
        let highlightedEdgesTransparentBinLen = 0;

        let selectedFillOpaqueBinLen = 0;
        let selectedEdgesOpaqueBinLen = 0;
        let selectedFillTransparentBinLen = 0;
        let selectedEdgesTransparentBinLen = 0;

        //------------------------------------------------------------------------------------------------------
        // Render normal opaque solids, defer others to bins to render after
        //------------------------------------------------------------------------------------------------------
        for (let i = 0, len = drawables.length; i < len; i++) {

            drawable = drawables[i];

            if (drawable.culled === true || drawable.visible === false) {
                continue;
            }

            const renderFlags = drawable.renderFlags;

            if (renderFlags.colorOpaque) {
                if (drawable.saoEnabled && occlusionTexture) {
                    normalDrawSAOBin[normalDrawSAOBinLen++] = drawable;
                } else {
                    drawable.drawColorOpaque(frameCtx);
                }
            }

            if (transparentEnabled) {
                if (renderFlags.colorTransparent) {
                    normalFillTransparentBin[normalFillTransparentBinLen++] = drawable;
                }
            }

            if (renderFlags.xrayedSilhouetteTransparent) {
                xrayedFillTransparentBin[xrayedFillTransparentBinLen++] = drawable;
            }

            if (renderFlags.xrayedSilhouetteOpaque) {
                xrayedFillOpaqueBin[xrayedFillOpaqueBinLen++] = drawable;
            }

            if (renderFlags.highlightedSilhouetteTransparent) {
                highlightedFillTransparentBin[highlightedFillTransparentBinLen++] = drawable;
            }

            if (renderFlags.highlightedSilhouetteOpaque) {
                highlightedFillOpaqueBin[highlightedFillOpaqueBinLen++] = drawable;
            }

            if (renderFlags.selectedSilhouetteTransparent) {
                selectedFillTransparentBin[selectedFillTransparentBinLen++] = drawable;
            }

            if (renderFlags.selectedSilhouetteOpaque) {
                selectedFillOpaqueBin[selectedFillOpaqueBinLen++] = drawable;
            }

            if (drawable.edges && edgesEnabled) {
                if (renderFlags.edgesOpaque) {
                    normalEdgesOpaqueBin[normalEdgesOpaqueBinLen++] = drawable;
                }

                if (renderFlags.edgesTransparent) {
                    normalEdgesTransparentBin[normalEdgesTransparentBinLen++] = drawable;
                }

                if (renderFlags.selectedEdgesTransparent) {
                    selectedEdgesTransparentBin[selectedEdgesTransparentBinLen++] = drawable;
                }

                if (renderFlags.selectedEdgesOpaque) {
                    selectedEdgesOpaqueBin[selectedEdgesOpaqueBinLen++] = drawable;
                }

                if (renderFlags.xrayedEdgesTransparent) {
                    xrayEdgesTransparentBin[xrayEdgesTransparentBinLen++] = drawable;
                }

                if (renderFlags.xrayedEdgesOpaque) {
                    xrayEdgesOpaqueBin[xrayEdgesOpaqueBinLen++] = drawable;
                }

                if (renderFlags.highlightedEdgesTransparent) {
                    highlightedEdgesTransparentBin[highlightedEdgesTransparentBinLen++] = drawable;
                }

                if (renderFlags.highlightedEdgesOpaque) {
                    highlightedEdgesOpaqueBin[highlightedEdgesOpaqueBinLen++] = drawable;
                }
            }
        }

        //------------------------------------------------------------------------------------------------------
        // Render deferred bins
        //------------------------------------------------------------------------------------------------------

        // Opaque color with SAO

        if (normalDrawSAOBinLen > 0) {
            frameCtx.withSAO = true;
            for (i = 0; i < normalDrawSAOBinLen; i++) {
                normalDrawSAOBin[i].drawColorOpaque(frameCtx);
            }
        }

        // Opaque edges

        if (normalEdgesOpaqueBinLen > 0) {
            for (i = 0; i < normalEdgesOpaqueBinLen; i++) {
                normalEdgesOpaqueBin[i].drawEdgesColorOpaque(frameCtx);
            }
        }

        // Opaque X-ray fill

        if (xrayedFillOpaqueBinLen > 0) {
            for (i = 0; i < xrayedFillOpaqueBinLen; i++) {
                xrayedFillOpaqueBin[i].drawSilhouetteXRayed(frameCtx);
            }
        }

        // Opaque X-ray edges

        if (xrayEdgesOpaqueBinLen > 0) {
            for (i = 0; i < xrayEdgesOpaqueBinLen; i++) {
                xrayEdgesOpaqueBin[i].drawEdgesXRayed(frameCtx);
            }
        }

        // Transparent

        if (xrayedFillTransparentBinLen > 0 || xrayEdgesTransparentBinLen > 0 || normalFillTransparentBinLen > 0 || normalEdgesTransparentBinLen > 0) {
            gl.enable(gl.CULL_FACE);
            gl.enable(gl.BLEND);
            if (canvasTransparent) {
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            } else {
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            }
            frameCtx.backfaces = false;
            if (!alphaDepthMask) {
                gl.depthMask(false);
            }

            // Transparent color edges

            if (normalFillTransparentBinLen > 0 || normalEdgesTransparentBinLen > 0) {
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            }
            if (normalEdgesTransparentBinLen > 0) {
                for (i = 0; i < normalEdgesTransparentBinLen; i++) {
                    drawable = normalEdgesTransparentBin[i];
                    drawable.drawEdgesColorTransparent(frameCtx);
                }
            }

            // Transparent color fill

            if (normalFillTransparentBinLen > 0) {
                const eye = frameCtx.viewParams.eye;
                normalFillTransparentBin.length = normalFillTransparentBinLen; // normalFillTransparentBin reused by renderDrawables calls, so needs to be truncated if necessary
                const byDist = normalFillTransparentBin.map(d => ({ drawable: d, distSq: math.distVec3(d.origin || vec3_0, eye) }));
                byDist.sort((a, b) => b.distSq - a.distSq);
                for (i = 0; i < normalFillTransparentBinLen; i++) {
                    byDist[i].drawable.drawColorTransparent(frameCtx);
                }
            }

            // Transparent X-ray edges

            if (xrayEdgesTransparentBinLen > 0) {
                for (i = 0; i < xrayEdgesTransparentBinLen; i++) {
                    xrayEdgesTransparentBin[i].drawEdgesXRayed(frameCtx);
                }
            }

            // Transparent X-ray fill

            if (xrayedFillTransparentBinLen > 0) {
                for (i = 0; i < xrayedFillTransparentBinLen; i++) {
                    xrayedFillTransparentBin[i].drawSilhouetteXRayed(frameCtx);
                }
            }

            gl.disable(gl.BLEND);
            if (!alphaDepthMask) {
                gl.depthMask(true);
            }
        }

        // Opaque highlight

        if (highlightedFillOpaqueBinLen > 0 || highlightedEdgesOpaqueBinLen > 0) {
            frameCtx.lastProgramId = null;
            if (scene.highlightMaterial.glowThrough) {
                gl.clear(gl.DEPTH_BUFFER_BIT);
            }

            // Opaque highlighted edges

            if (highlightedEdgesOpaqueBinLen > 0) {
                for (i = 0; i < highlightedEdgesOpaqueBinLen; i++) {
                    highlightedEdgesOpaqueBin[i].drawEdgesHighlighted(frameCtx);
                }
            }

            // Opaque highlighted fill

            if (highlightedFillOpaqueBinLen > 0) {
                for (i = 0; i < highlightedFillOpaqueBinLen; i++) {
                    highlightedFillOpaqueBin[i].drawSilhouetteHighlighted(frameCtx);
                }
            }
        }

        // Highlighted transparent

        if (highlightedFillTransparentBinLen > 0 || highlightedEdgesTransparentBinLen > 0 || highlightedFillOpaqueBinLen > 0) {
            frameCtx.lastProgramId = null;
            if (scene.selectedMaterial.glowThrough) {
                gl.clear(gl.DEPTH_BUFFER_BIT);
            }
            gl.enable(gl.BLEND);
            if (canvasTransparent) {
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            } else {
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            }
            gl.enable(gl.CULL_FACE);

            // Highlighted transparent edges

            if (highlightedEdgesTransparentBinLen > 0) {
                for (i = 0; i < highlightedEdgesTransparentBinLen; i++) {
                    highlightedEdgesTransparentBin[i].drawEdgesHighlighted(frameCtx);
                }
            }

            // Highlighted transparent fill

            if (highlightedFillTransparentBinLen > 0) {
                for (i = 0; i < highlightedFillTransparentBinLen; i++) {
                    highlightedFillTransparentBin[i].drawSilhouetteHighlighted(frameCtx);
                }
            }
            gl.disable(gl.BLEND);
        }

        // Selected opaque

        if (selectedFillOpaqueBinLen > 0 || selectedEdgesOpaqueBinLen > 0) {
            frameCtx.lastProgramId = null;
            if (scene.selectedMaterial.glowThrough) {
                gl.clear(gl.DEPTH_BUFFER_BIT);
            }

            // Selected opaque fill

            if (selectedEdgesOpaqueBinLen > 0) {
                for (i = 0; i < selectedEdgesOpaqueBinLen; i++) {
                    selectedEdgesOpaqueBin[i].drawEdgesSelected(frameCtx);
                }
            }

            // Selected opaque edges

            if (selectedFillOpaqueBinLen > 0) {
                for (i = 0; i < selectedFillOpaqueBinLen; i++) {
                    selectedFillOpaqueBin[i].drawSilhouetteSelected(frameCtx);
                }
            }
        }

        // Selected transparent

        if (selectedFillTransparentBinLen > 0 || selectedEdgesTransparentBinLen > 0) {
            frameCtx.lastProgramId = null;
            if (scene.selectedMaterial.glowThrough) {
                gl.clear(gl.DEPTH_BUFFER_BIT);
            }
            gl.enable(gl.CULL_FACE);
            gl.enable(gl.BLEND);
            if (canvasTransparent) {
                gl.blendEquation(gl.FUNC_ADD);
                gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            } else {
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            }

            // Selected transparent edges

            if (selectedEdgesTransparentBinLen > 0) {
                for (i = 0; i < selectedEdgesTransparentBinLen; i++) {
                    selectedEdgesTransparentBin[i].drawEdgesSelected(frameCtx);
                }
            }

            // Selected transparent fill

            if (selectedFillTransparentBinLen > 0) {
                for (i = 0; i < selectedFillTransparentBinLen; i++) {
                    selectedFillTransparentBin[i].drawSilhouetteSelected(frameCtx);
                }
            }
            gl.disable(gl.BLEND);
        }

        };

        renderDrawables(postCullDrawableList);
        if (uiDrawableList.length > 0) {
            gl.clear(gl.DEPTH_BUFFER_BIT);
            renderDrawables(uiDrawableList);
        }

        const endTime = Date.now();
        const frameStats = stats.frame;

        frameStats.renderTime = (endTime - startTime) / 1000.0;
        frameStats.drawElements = frameCtx.drawElements;
        frameStats.drawArrays = frameCtx.drawArrays;
        frameStats.useProgram = frameCtx.useProgram;
        frameStats.bindTexture = frameCtx.bindTexture;
        frameStats.bindArray = frameCtx.bindArray;

        const numTextureUnits = WEBGL_INFO.MAX_TEXTURE_IMAGE_UNITS;
        for (let ii = 0; ii < numTextureUnits; ii++) {
            gl.activeTexture(gl.TEXTURE0 + ii);
        }
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        const numVertexAttribs = WEBGL_INFO.MAX_VERTEX_ATTRIBS; // Fixes https://github.com/xeokit/xeokit-sdk/issues/174
        for (let ii = 0; ii < numVertexAttribs; ii++) {
            gl.disableVertexAttribArray(ii);
        }
    }

    const resetPickFrameCtx = (canvasPos, clipTransformDiv, camera, eye, projMatrix, viewMatrix, frameCtx) => {
        frameCtx.reset();
        frameCtx.backfaces = true;
        frameCtx.frontface = true; // "ccw"

        frameCtx.viewParams.eye = eye;
        frameCtx.viewParams.projMatrix = projMatrix;
        frameCtx.viewParams.viewMatrix = viewMatrix;
        frameCtx.nearPlaneHeight = getNearPlaneHeight(camera, gl.drawingBufferHeight);

        const resolutionScale = scene.canvas.resolutionScale;
        frameCtx.pickClipPos = [
            canvasPos ? (    2 * canvasPos[0] * resolutionScale / gl.drawingBufferWidth - 1) : 0,
            canvasPos ? (1 - 2 * canvasPos[1] * resolutionScale / gl.drawingBufferHeight)    : 0
        ];

        frameCtx.pickClipPosInv = [
            gl.drawingBufferWidth  / clipTransformDiv,
            gl.drawingBufferHeight / clipTransformDiv
        ];
    };

    /**
     * Picks an Entity.
     * @private
     */
    this.pick = (function () {

        const tempVec3a = math.vec3();
        const tempVec3b = math.vec3();
        const tempVec4a = math.vec4();
        const tempVec4b = math.vec4();
        const tempVec4c = math.vec4();
        const tempVec4d = math.vec4();
        const tempVec4e = math.vec4();
        const tempMat4a = math.mat4();
        const tempMat4b = math.mat4();
        const tempMat4c = math.mat4();
        const tempMat4d = math.mat4();

        const upVec = math.vec3([0, 1, 0]);
        const _pickResult = new PickResult();

        const nearAndFar = math.vec2();

        const canvasPos = math.vec3();

        const worldRayOrigin = math.vec3();
        const worldRayDir = math.vec3();
        const worldSurfacePos = math.vec3();
        const worldSurfaceNormal = math.vec3();

        const pickBuffer = new RenderBuffer(gl);
        pickBuffer.setSize([1, 1]);

        const pickNormalBuffer = new RenderBuffer(gl, [gl.RGBA32I]);
        pickNormalBuffer.setSize([3, 3]);

        return function (params, pickResult = _pickResult) {

            pickResult.reset();

            updateDrawlist();

            let pickViewMatrix = null;
            let pickProjMatrix = null;
            let projection = null;
            const camera = scene.camera;

            pickResult.pickSurface = params.pickSurface;

            if (params.canvasPos) {

                canvasPos[0] = params.canvasPos[0];
                canvasPos[1] = params.canvasPos[1];

                pickViewMatrix = camera.viewMatrix;
                pickProjMatrix = camera.projMatrix;
                projection     = camera.projection;

                nearAndFar[0] = camera.project.near;
                nearAndFar[1] = camera.project.far;

                pickResult.canvasPos = params.canvasPos;

            } else {

                // Picking with arbitrary World-space ray
                // Align camera along ray and fire ray through center of canvas

                if (params.matrix) {

                    pickViewMatrix = params.matrix;
                    pickProjMatrix = camera.projMatrix;
                    projection     = camera.projection;

                    nearAndFar[0] = camera.project.near;
                    nearAndFar[1] = camera.project.far;

                } else {

                    worldRayOrigin.set(params.origin || [0, 0, 0]);
                    worldRayDir.set(params.direction || [0, 0, 1]);

                    const look = math.addVec3(worldRayOrigin, worldRayDir, tempVec3a);
                    const up = tempVec3b;

                    if (Math.abs(math.dotVec3(worldRayDir, upVec)) > (1 - 1e-6)) { // worldRayDir aligned with Y axis
                        up[0] = 0;
                        up[1] = 0;
                        up[2] = Math.sign(worldRayDir[1]);
                    } else {
                        math.cross3Vec3(worldRayDir, upVec, up);
                        math.cross3Vec3(up, worldRayDir, up);
                        math.normalizeVec3(up, up);
                    }

                    pickViewMatrix = math.lookAtMat4v(worldRayOrigin, look, up, tempMat4b);
                    //    pickProjMatrix = camera.projMatrix;
                    pickProjMatrix = camera.ortho.matrix;
                    projection     = "ortho";

                    nearAndFar[0] = camera.ortho.near;
                    nearAndFar[1] = camera.ortho.far;

                    pickResult.origin = worldRayOrigin;
                    pickResult.direction = worldRayDir;
                }

                canvasPos[0] = canvas.clientWidth * 0.5;
                canvasPos[1] = canvas.clientHeight * 0.5;
            }

            pickBuffer.bind();

            const resetFrameCtx = (clipTransformDiv) => resetPickFrameCtx(canvasPos, clipTransformDiv, camera, pickResult.origin || camera.eye, pickProjMatrix || camera.projMatrix, pickViewMatrix || camera.viewMatrix, frameCtx);

            // gpuPickPickable
            resetFrameCtx(1);
            frameCtx.pickInvisible = !!params.pickInvisible;

            gl.viewport(0, 0, 1, 1);
            gl.depthMask(true);
            gl.enable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.BLEND);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            const includeEntityIds = params.includeEntityIds;
            const excludeEntityIds = params.excludeEntityIds;

            const renderDrawables = function(drawables) {
                drawables.forEach(drawable => {
                    if (!drawable.culled && drawable.visible && drawable.pickable && drawable.drawPickMesh // TODO: push this logic into drawable
                        && ((! includeEntityIds) || includeEntityIds[drawable.id])
                        && ((! excludeEntityIds) || (! excludeEntityIds[drawable.id]))) {
                        drawable.drawPickMesh(frameCtx);
                    }
                });
            };

            renderDrawables(postCullDrawableList);
            if (uiDrawableList.length > 0) {
                gl.clear(gl.DEPTH_BUFFER_BIT);
                renderDrawables(uiDrawableList);
            }

            const pickID = pixelToInt(pickBuffer.read(0, 0));
            const pickable = (pickID >= 0) && pickIDs.items[pickID];

            if (!pickable) {
                pickBuffer.unbind();
                return null;
            }

            const pickedEntity = (pickable.delegatePickedEntity) ? pickable.delegatePickedEntity() : pickable;

            if (!pickedEntity) {
                pickBuffer.unbind();
                return null;
            }

            if (params.pickSurface) {

                // GPU-based ray-picking

                if (pickable.canPickTriangle && pickable.canPickTriangle()) {

                    if (pickable.drawPickTriangles) {
                        resetFrameCtx(1);
                        // frameCtx.pickInvisible = !!params.pickInvisible;

                        gl.viewport(0, 0, 1, 1);
                        gl.clearColor(0, 0, 0, 0);
                        gl.enable(gl.DEPTH_TEST);
                        gl.disable(gl.CULL_FACE);
                        gl.disable(gl.BLEND);
                        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                        pickable.drawPickTriangles(frameCtx);

                        pickResult.primIndex = 3 * pixelToInt(pickBuffer.read(0, 0)); // Convert from triangle number to first vertex in indices
                    }

                    pickable.pickTriangleSurface(pickViewMatrix, pickProjMatrix, projection, pickResult);

                    pickResult.pickSurfacePrecision = false;

                } else {

                    if (pickable.canPickWorldPos && pickable.canPickWorldPos()) {

                        // pickWorldPos
                        resetFrameCtx(1);
                        frameCtx.viewParams.near = nearAndFar[0];
                        frameCtx.viewParams.far  = nearAndFar[1];

                        gl.viewport(0, 0, 1, 1);

                        gl.clearColor(0, 0, 0, 0);
                        gl.depthMask(true);
                        gl.enable(gl.DEPTH_TEST);
                        gl.disable(gl.CULL_FACE);
                        gl.disable(gl.BLEND);
                        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                        pickable.drawPickDepths(frameCtx); // Draw color-encoded fragment screen-space depths

                        const screenZ = math.dotVec4(pickBuffer.read(0, 0), bitShiftScreenZ);

                        // Calculate clip space coordinates, which will be in range of x=[-1..1] and y=[-1..1], with y=(+1) at top
                        const x = (canvasPos[0] - canvas.clientWidth / 2) / (canvas.clientWidth / 2);
                        const y = -(canvasPos[1] - canvas.clientHeight / 2) / (canvas.clientHeight / 2);

                        const origin = pickable.origin;

                        const pvMatInverse = math.inverseMat4(math.mulMat4(pickProjMatrix, (origin ? createRTCViewMat(pickViewMatrix, origin, tempMat4a) : pickViewMatrix), tempMat4c), tempMat4d);

                        const toWorld = (z, dst) => {
                            dst[0] = x;
                            dst[1] = y;
                            dst[2] = z;
                            dst[3] = 1;
                            math.transformVec4(pvMatInverse, dst, dst);
                            return math.mulVec4Scalar(dst, 1 / dst[3]);
                        };

                        const world1 = toWorld(-1, tempVec4a);
                        const world2 = toWorld( 1, tempVec4b);

                        const dir = math.subVec3(world2, world1, tempVec4c);
                        const worldPos = math.addVec3(world1, math.mulVec4Scalar(dir, screenZ, tempVec4d), tempVec4e);

                        if (origin) {
                            math.addVec3(worldPos, origin);
                        }

                        pickResult.worldPos = worldPos;

                        if (params.pickSurfaceNormal !== false) {
                            // gpuPickWorldNormal
                            resetFrameCtx(3);

                            pickNormalBuffer.bind();

                            gl.viewport(0, 0, pickNormalBuffer.size[0], pickNormalBuffer.size[1]);
                            gl.enable(gl.DEPTH_TEST);
                            gl.disable(gl.CULL_FACE);
                            gl.disable(gl.BLEND);
                            gl.clear(gl.DEPTH_BUFFER_BIT);
                            gl.clearBufferiv(gl.COLOR, 0, new Int32Array([0, 0, 0, 0]));

                            pickable.drawPickNormals(frameCtx); // Draw color-encoded fragment World-space normals

                            const pix = pickNormalBuffer.read(1, 1, gl.RGBA_INTEGER, gl.INT, Int32Array, 4);

                            pickNormalBuffer.unbind();

                            pickResult.worldNormal = toWorldNormal(pix);
                        }

                        pickResult.pickSurfacePrecision = false;
                    }
                }
            }
            pickBuffer.unbind();
            pickResult.entity = pickedEntity;
            return pickResult;
        };
    })();

    /**
     * @param {[number, number]} canvasPos
     * @param {number} [snapRadiusInPixels=30]
     * @param {boolean} [snapToVertex=true]
     * @param {boolean} [snapToEdge=true]
     * @param pickResult
     * @returns {PickResult}
     */
    this.snapPick = (function () {

        const _pickResult = new PickResult();

        const getVertexPickBuffer = (function() {
            const cache = { };
            return (snapRadiusInPixels) => {
                if (! (snapRadiusInPixels in cache)) {
                    const buf = new RenderBuffer(gl, [gl.RGBA32I, gl.RGBA32I, gl.RGBA8UI], true);
                    buf.setSize([2 * snapRadiusInPixels + 1, 2 * snapRadiusInPixels + 1]);
                    cache[snapRadiusInPixels] = buf;
                }
                return cache[snapRadiusInPixels];
            };
        })();

        return function (params, pickResult = _pickResult) {

            const {canvasPos, origin, direction, snapRadius, snapToVertex, snapToEdge} = params;

            if (!snapToVertex && !snapToEdge) {
                return this.pick({canvasPos, pickSurface: true});
            }

            const camera = scene.camera;
            const snapRadiusInPixels = snapRadius || 30;
            const viewMatrix = (canvasPos
                                ? camera.viewMatrix
                                : math.lookAtMat4v(
                                    origin,
                                    math.addVec3(origin, direction, math.vec3()),
                                    math.vec3([0, 1, 0]),
                                    math.mat4()));
            resetPickFrameCtx(canvasPos, 2 * snapRadiusInPixels, camera, camera.eye, camera.projMatrix, viewMatrix, frameCtx);

            // Bind and clear the snap render target

            const vertexPickBuffer = getVertexPickBuffer(snapRadiusInPixels);
            vertexPickBuffer.bind();
            gl.viewport(0, 0, vertexPickBuffer.size[0], vertexPickBuffer.size[1]);
            gl.enable(gl.DEPTH_TEST);
            gl.frontFace(gl.CCW);
            gl.disable(gl.CULL_FACE);
            gl.depthMask(true);
            gl.disable(gl.BLEND);
            gl.depthFunc(gl.LEQUAL);
            gl.clear(gl.DEPTH_BUFFER_BIT);
            gl.clearBufferiv(gl.COLOR, 0, new Int32Array([0, 0, 0, 0]));
            gl.clearBufferiv(gl.COLOR, 1, new Int32Array([0, 0, 0, 0]));
            gl.clearBufferuiv(gl.COLOR, 2, new Uint32Array([0, 0, 0, 0]));

            // a) init z-buffer
            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);

            frameCtx.snapPickLayerParams = [];
            frameCtx.snapPickLayerParams.push(null); // This recreates previous situation, which relied on snapPickLayerNumber
            postCullDrawableList.forEach(drawable => {
                if (!drawable.culled && drawable.visible && drawable.pickable && drawable.drawSnapInit) {
                    drawable.drawSnapInit(frameCtx);
                }
            });

            const layerParamsSurface = frameCtx.snapPickLayerParams;

            // b) snap-pick
            frameCtx.snapPickLayerParams = [];

            gl.depthMask(false);
            gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

            const drawSnap = (snapMode) => {
                frameCtx.snapMode = snapMode;
                frameCtx.snapPickLayerParams.push(null); // This recreates previous situation, which relied on snapPickLayerNumber
                postCullDrawableList.forEach(drawable => {
                    if (!drawable.culled && drawable.visible && drawable.pickable && drawable.drawSnap) {
                        drawable.drawSnap(frameCtx);
                    }
                });
            };

            if (snapToEdge) {
                drawSnap("edge");
            }
            if (snapToVertex) {
                drawSnap("vertex");
            }

            gl.depthMask(true);

            const layerParamsSnap = frameCtx.snapPickLayerParams;

            // Read and decode the snapped coordinates
            const readSnapPickBuffer = (source, arrayType, glType) => {
                const w = vertexPickBuffer.buffer.width;
                const h = vertexPickBuffer.buffer.height;
                const pix = new arrayType(4 * w * h);
                gl.readBuffer(source);
                gl.readPixels(0, 0, w, h, gl.RGBA_INTEGER, glType, pix, 0);
                return pix;
            };

            const snapPickResultArray       = readSnapPickBuffer(gl.COLOR_ATTACHMENT0, Int32Array,  gl.INT);
            const snapPickNormalResultArray = readSnapPickBuffer(gl.COLOR_ATTACHMENT1, Int32Array,  gl.INT);
            const snapPickIdResultArray     = readSnapPickBuffer(gl.COLOR_ATTACHMENT2, Uint32Array, gl.UNSIGNED_INT);

            vertexPickBuffer.unbind();

            // result 1) regular hi-precision world position

            let worldPos = null;
            let worldNormal = null;
            let pickable = null;

            const middleX = snapRadiusInPixels;
            const middleY = snapRadiusInPixels;
            const middleIndex = (middleX * 4) + (middleY * vertexPickBuffer.size[0] * 4);
            const pickResultMiddleXY = snapPickResultArray.slice(middleIndex, middleIndex + 4);
            const pickNormalResultMiddleXY = snapPickNormalResultArray.slice(middleIndex, middleIndex + 4);
            const pickPickableResultMiddleXY = snapPickIdResultArray.slice(middleIndex, middleIndex + 4);

            if (pickResultMiddleXY[3] !== 0) {
                const pickedLayerParmasSurface = layerParamsSurface[Math.abs(pickResultMiddleXY[3]) % layerParamsSurface.length];
                worldPos = toWorldPos(pickResultMiddleXY, pickedLayerParmasSurface.origin, pickedLayerParmasSurface.coordinateScale);
                worldNormal = toWorldNormal(pickNormalResultMiddleXY);

                pickable = pickIDs.items[pixelToInt(pickPickableResultMiddleXY)];
            }

            // result 2) hi-precision snapped (to vertex/edge) world position

            const snapPickResult = [ ];
            for (let i = 0; i < snapPickResultArray.length; i += 4) {
                const layerNumber = snapPickResultArray[i + 3];
                if (layerNumber > 0) {
                    const pixelNumber = Math.floor(i / 4);
                    const w = vertexPickBuffer.size[0];
                    const x = pixelNumber % w - Math.floor(w / 2);
                    const y = Math.floor(pixelNumber / w) - Math.floor(w / 2);
                    snapPickResult.push({
                        dist:     math.lenVec2([ x, y ]),
                        isVertex: (snapToVertex && snapToEdge) ? (layerNumber > layerParamsSnap.length / 2) : snapToVertex,
                        result:   snapPickResultArray.subarray(i, i+4),
                        normal:   snapPickNormalResultArray.subarray(i, i+4),
                        id:       snapPickIdResultArray.subarray(i, i+4)
                    });
                }
            }

            const getPickedEntity = pickable => (pickable && pickable.delegatePickedEntity) ? pickable.delegatePickedEntity() : pickable;

            if (snapPickResult.length > 0) {
                // closest vertex snap first, then closest edge snap
                const res = snapPickResult.reduce((a,b) => ((((a.isVertex-b.isVertex) || (b.dist-a.dist)) > 0) ? a : b));
                const snapPick = res.result;
                const pickedLayerParmas = layerParamsSnap[snapPick[3]];
                const snappedWorldPos = toWorldPos(snapPick, pickedLayerParmas.origin, pickedLayerParmas.coordinateScale);
                const snappedCanvasPos = camera.projectWorldPos(snappedWorldPos);

                pickResult.reset();
                pickResult.snappedToEdge    = !res.isVertex;
                pickResult.snappedToVertex  = res.isVertex;
                pickResult.worldPos         = snappedWorldPos;
                pickResult.worldNormal      = toWorldNormal(res.normal);
                pickResult.entity           = getPickedEntity(pickIDs.items[pixelToInt(res.id)]);
                pickResult.canvasPos        = canvasPos || (worldPos && camera.projectWorldPos(worldPos)) || snappedCanvasPos;
                pickResult.snappedCanvasPos = snappedCanvasPos;
                return pickResult;

            } else if (worldPos) {

                pickResult.reset();
                pickResult.snappedToEdge    = false;
                pickResult.snappedToVertex  = false;
                pickResult.worldPos         = worldPos;
                pickResult.worldNormal      = worldNormal;
                pickResult.entity           = getPickedEntity(pickable);
                pickResult.canvasPos        = canvasPos || camera.projectWorldPos(worldPos);
                pickResult.snappedCanvasPos = canvasPos;
                return pickResult;

            } else {
                return null;
            }
        };
    })();

    /**
     * Adds a {@link Marker} for occlusion testing.
     * @param marker
     */
    this.addMarker = function (marker) {
        this._occlusionTester = this._occlusionTester || new OcclusionTester(scene);
        this._occlusionTester.addMarker(marker);
        scene.occlusionTestCountdown = 0;
    };

    /**
     * Notifies that a {@link Marker#worldPos} has updated.
     * @param marker
     */
    this.markerWorldPosUpdated = function (marker) {
        this._occlusionTester.markerWorldPosUpdated(marker);
    };

    /**
     * Removes a {@link Marker} from occlusion testing.
     * @param marker
     */
    this.removeMarker = function (marker) {
        this._occlusionTester.removeMarker(marker);
    };

    /**
     * Performs an occlusion test for all added {@link Marker}s, updating
     * their {@link Marker#visible} properties accordingly.
     */
    this.doOcclusionTest = function () {

        if (this._occlusionTester && this._occlusionTester.needOcclusionTest) {

            updateDrawlist();

            const readPixelBuf = (! OCCLUSION_TEST_MODE) && renderBufferManager.getRenderBuffer("occlusionReadPix");
            if (readPixelBuf) {
                readPixelBuf.setSize([gl.drawingBufferWidth, gl.drawingBufferHeight]);
                readPixelBuf.bind();
            }

            frameCtx.reset();
            frameCtx.backfaces = true;
            frameCtx.frontface = true; // "ccw"
            frameCtx.viewParams = getSceneCameraViewParams();
            frameCtx.nearPlaneHeight = getNearPlaneHeight(scene.camera, gl.drawingBufferHeight);

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(0, 0, 0, 0);
            gl.enable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.BLEND);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            postCullDrawableList.forEach(drawable => {
                if (!drawable.culled && drawable.visible && drawable.pickable && drawable.drawOcclusion) { // TODO: Option to exclude transparent?
                    drawable.drawOcclusion(frameCtx);
                }
            });

            this._occlusionTester.drawMarkers();

            if (readPixelBuf) {
                const resolutionScale = scene.canvas.resolutionScale;
                this._occlusionTester.doOcclusionTest( // Updates Marker "visible" properties
                    (x, y) => readPixelBuf.read(Math.round(resolutionScale * x), Math.round(resolutionScale * y)));
                readPixelBuf.unbind();
            }
        }
    };

    this.snapshot = (() => {
        let snapshotBound = false;
        const snapshotBuffer = new RenderBuffer(gl);
        let snapshotCanvas = null;

        return {
            /**
             * Read pixels from the renderer's current output. Performs a force-render first.
             * @param pixels
             * @param colors
             * @param len
             * @private
             */
            readPixels: (pixels, colors, len) => {
                snapshotBuffer.bind();
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                imageDirty = true;
                this.render();
                for (let i = 0; i < len; i++) {
                    const j = i * 2;
                    const k = i * 4;
                    const color = snapshotBuffer.read(pixels[j], pixels[j + 1]);
                    colors[k] = color[0];
                    colors[k + 1] = color[1];
                    colors[k + 2] = color[2];
                    colors[k + 3] = color[3];
                }
                snapshotBuffer.unbind();
                imageDirty = true;
            },

            /**
             * Enter snapshot mode.
             *
             * Switches rendering to a hidden snapshot canvas.
             *
             * Exit snapshot mode using endSnapshot().
             */
            beginSnapshot: () => {
                snapshotBuffer.setSize([gl.drawingBufferWidth, gl.drawingBufferHeight]);
                snapshotBuffer.bind();
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                snapshotBound = true;
            },

            /**
             * Returns an HTMLCanvas containing an image of the snapshot canvas.
             *
             * - The HTMLCanvas has a CanvasRenderingContext2D.
             * - Expects the caller to draw more things on the HTMLCanvas (annotations etc).
             *
             * @returns {HTMLCanvasElement}
             */
            renderSnapshotToCanvas: () => {
                const width  = snapshotBuffer.buffer.width;
                const height = snapshotBuffer.buffer.height;

                if ((! snapshotCanvas) || (snapshotCanvas.width !== width) || (snapshotCanvas.height !== height)) {
                    snapshotCanvas = (function() {
                        const canvas  = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.width  = width;
                        canvas.height = height;
                        const pixelData = new Uint8Array(width * height * 4);
                        const imageData = context.createImageData(width, height);

                        return {
                            width:            width,
                            height:           height,
                            getUpdatedCanvas: () => {
                                gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);

                                // flip verically
                                const halfHeight = Math.floor(height / 2);
                                const bytesPerRow = width * 4;
                                const temp = new Uint8Array(bytesPerRow);
                                for (let y = 0; y < halfHeight; ++y) {
                                    const topOffset = y * bytesPerRow;
                                    const bottomOffset = (height - y - 1) * bytesPerRow;
                                    temp.set(pixelData.subarray(topOffset, topOffset + bytesPerRow));
                                    pixelData.copyWithin(topOffset, bottomOffset, bottomOffset + bytesPerRow);
                                    pixelData.set(temp, bottomOffset);
                                }

                                imageData.data.set(pixelData);

                                context.resetTransform(); // Prevents strange scale-accumulation effect with html2canvas
                                context.putImageData(imageData, 0, 0);

                                return canvas;
                            }
                        };
                    })();
                }

                if (snapshotBound) {
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                    imageDirty = true;
                    this.render();
                    imageDirty = true;
                }

                return snapshotCanvas.getUpdatedCanvas();
            },

            /**
             * Exists snapshot mode.
             *
             * Switches rendering back to the main canvas.
             */
            endSnapshot: () => {
                if (snapshotBound) {
                    snapshotBuffer.unbind();
                    snapshotBound = false;
                }
                imageDirty = true;
                this.render();
            }
        };
    })();

    /**
     * Destroys this renderer.
     * @private
     */
    this.destroy = function () {

        drawableTypeInfo = {};
        drawables = {};

        renderBufferManager.destroy();

        saoOcclusionRenderer.destroy();
        saoDepthLimitedBlurRenderer.destroy();

        if (this._occlusionTester) {
            this._occlusionTester.destroy();
        }
    };
};

export {Renderer};