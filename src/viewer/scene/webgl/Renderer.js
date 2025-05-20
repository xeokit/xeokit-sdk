import {FrameContext} from './FrameContext.js';
import {math} from '../math/math.js';
import {stats} from '../stats.js';
import {WEBGL_INFO} from '../webglInfo.js';
import {Map} from "../utils/Map.js";
import {PickResult} from "./PickResult.js";
import {OcclusionTester} from "./occlusion/OcclusionTester.js";
import {SAOOcclusionRenderer} from "./sao/SAOOcclusionRenderer.js";
import {createRTCViewMat} from "../math/rtcCoords.js";
import {SAODepthLimitedBlurRenderer} from "./sao/SAODepthLimitedBlurRenderer.js";
import {RenderBuffer} from "./RenderBuffer.js";
import {getExtension} from "./getExtension.js";

const OCCLUSION_TEST_MODE = false;

const vec3_0 = math.vec3([0,0,0]);

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
            getRenderBuffer: (id, options) => {
                const renderBuffers = (scene.canvas.resolutionScale === 1.0) ? renderBuffersBasic : renderBuffersScaled;
                if (! renderBuffers[id]) {
                    renderBuffers[id] = new RenderBuffer(canvas, gl, options);
                }
                return renderBuffers[id];
            },
            destroy: () => {
                Object.values(renderBuffersBasic ).forEach(buf => buf.destroy());
                Object.values(renderBuffersScaled).forEach(buf => buf.destroy());
            }
        };
    })();

    let snapshotBound = false;

    const bindOutputFrameBuffer = null;
    const unbindOutputFrameBuffer = null;

    const saoOcclusionRenderer = (function() {
        let gl = null;
        let currentRenrerer = null;
        let curNumSamples = null;
        return {
            setGL: _gl => { gl = _gl; },
            destroy: () => currentRenrerer && currentRenrerer.destroy(),
            render: (viewportSize, project, sao, depthTexture) => {
                const numSamples = Math.floor(sao.numSamples);
                if (curNumSamples !== numSamples) {
                    currentRenrerer && currentRenrerer.destroy();
                    currentRenrerer = new SAOOcclusionRenderer(gl, numSamples);
                    curNumSamples = numSamples;
                }
                currentRenrerer.render(viewportSize, project, sao, depthTexture);
            }
        };
    })();
    saoOcclusionRenderer.setGL(gl);

    const saoDepthLimitedBlurRenderer = new SAODepthLimitedBlurRenderer();
    saoDepthLimitedBlurRenderer.init(gl);

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

    this.webglContextLost = function () {
    };

    this.webglContextRestored = function (gl) {

        // renderBufferManager.webglContextRestored(gl);

        saoOcclusionRenderer.setGL(gl);
        saoDepthLimitedBlurRenderer.init(gl);

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
        if (bindOutputFrameBuffer) {
            bindOutputFrameBuffer(params.pass);
        }
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (unbindOutputFrameBuffer) {
            unbindOutputFrameBuffer(params.pass);
        }
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
    this.render = function (params) {
        params = params || {};
        if (params.force) {
            imageDirty = true;
        }
        updateDrawlist();
        if (imageDirty) {
            draw(params);
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

    function draw(params) {

        const sao = scene.sao;
        const occlusionTexture = saoEnabled && sao.possible && (sao.numSamples >= 1) && drawSAOBuffers(params);

        scene._lightsState.lights.forEach(light => {
            const shadowRenderBuf = light.castsShadow && light.getShadowRenderBuf();

            if (shadowRenderBuf) {
                shadowRenderBuf.bind();

                frameCtx.reset();
                frameCtx.backfaces = true;
                frameCtx.frontface = true;
                frameCtx.viewParams.viewMatrix = light.getShadowViewMatrix();
                frameCtx.viewParams.projMatrix = light.getShadowProjMatrix();

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

        drawColor(params, occlusionTexture);
    }

    function drawSAOBuffers(params) {

        const sao = scene.sao;

        const size = [gl.drawingBufferWidth, gl.drawingBufferHeight];

        // Render depth buffer
        const saoDepthRenderBuffer = renderBufferManager.getRenderBuffer("saoDepth", { depthTexture: true });
        saoDepthRenderBuffer.setSize(size);
        saoDepthRenderBuffer.bind();
        saoDepthRenderBuffer.clear();

        frameCtx.reset();
        frameCtx.pass = params.pass;
        frameCtx.viewParams = getSceneCameraViewParams();

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.DEPTH_TEST);
        gl.frontFace(gl.CCW);
        gl.enable(gl.CULL_FACE);
        gl.depthMask(true);

        if (params.clear !== false) {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }

        postCullDrawableList.forEach(drawable => {
            if ((drawable.culled !== true) && (drawable.visible !== false) && drawable.drawDepth && drawable.saoEnabled && drawable.renderFlags.colorOpaque) {
                drawable.drawDepth(frameCtx);
            }
        });

        saoDepthRenderBuffer.unbind();

        const depthTexture = saoDepthRenderBuffer.depthTexture;

        // Render occlusion buffer

        const occlusionRenderBuffer1 = renderBufferManager.getRenderBuffer("saoOcclusion");
        occlusionRenderBuffer1.setSize(size);
        occlusionRenderBuffer1.bind();
        occlusionRenderBuffer1.clear();

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
                dst.clear();

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

    function drawColor(params, occlusionTexture) {

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
        frameCtx.pass = params.pass;
        frameCtx.withSAO = false;
        frameCtx.pbrEnabled = pbrEnabled && !!scene.pbrEnabled;
        frameCtx.colorTextureEnabled = colorTextureEnabled && !!scene.colorTextureEnabled;
        frameCtx.viewParams = getSceneCameraViewParams();

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

        if (bindOutputFrameBuffer) {
            bindOutputFrameBuffer(params.pass);
        }

        if (params.clear !== false) {
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

        if (unbindOutputFrameBuffer) {
            unbindOutputFrameBuffer(params.pass);
        }
    }

    /**
     * Picks an Entity.
     * @private
     */
    this.pick = (function () {

        const tempVec3a = math.vec3();
        const tempVec4a = math.vec4();
        const tempVec4b = math.vec4();
        const tempVec4c = math.vec4();
        const tempVec4d = math.vec4();
        const tempVec4e = math.vec4();
        const tempMat4a = math.mat4();
        const tempMat4b = math.mat4();
        const tempMat4c = math.mat4();
        const tempMat4d = math.mat4();

        const randomVec3 = math.vec3();
        const up = math.vec3([0, 1, 0]);
        const _pickResult = new PickResult();

        const nearAndFar = math.vec2();

        const canvasPos = math.vec3();

        const worldRayOrigin = math.vec3();
        const worldRayDir = math.vec3();
        const worldSurfacePos = math.vec3();
        const worldSurfaceNormal = math.vec3();

        return function (params, pickResult = _pickResult) {

            pickResult.reset();

            updateDrawlist();

            let look;
            let pickViewMatrix = null;
            let pickProjMatrix = null;
            let projection = null;

            pickResult.pickSurface = params.pickSurface;

            if (params.canvasPos) {

                canvasPos[0] = params.canvasPos[0];
                canvasPos[1] = params.canvasPos[1];

                pickViewMatrix = scene.camera.viewMatrix;
                pickProjMatrix = scene.camera.projMatrix;
                projection     = scene.camera.projection;

                nearAndFar[0] = scene.camera.project.near;
                nearAndFar[1] = scene.camera.project.far;

                pickResult.canvasPos = params.canvasPos;

            } else {

                // Picking with arbitrary World-space ray
                // Align camera along ray and fire ray through center of canvas

                if (params.matrix) {

                    pickViewMatrix = params.matrix;
                    pickProjMatrix = scene.camera.projMatrix;
                    projection     = scene.camera.projection;

                    nearAndFar[0] = scene.camera.project.near;
                    nearAndFar[1] = scene.camera.project.far;

                } else {

                    worldRayOrigin.set(params.origin || [0, 0, 0]);
                    worldRayDir.set(params.direction || [0, 0, 1]);

                    look = math.addVec3(worldRayOrigin, worldRayDir, tempVec3a);

                    randomVec3[0] = Math.random();
                    randomVec3[1] = Math.random();
                    randomVec3[2] = Math.random();

                    math.normalizeVec3(randomVec3);
                    math.cross3Vec3(worldRayDir, randomVec3, up);

                    pickViewMatrix = math.lookAtMat4v(worldRayOrigin, look, up, tempMat4b);
                    //    pickProjMatrix = scene.camera.projMatrix;
                    pickProjMatrix = scene.camera.ortho.matrix;
                    projection     = "ortho";

                    nearAndFar[0] = scene.camera.ortho.near;
                    nearAndFar[1] = scene.camera.ortho.far;

                    pickResult.origin = worldRayOrigin;
                    pickResult.direction = worldRayDir;
                }

                canvasPos[0] = canvas.clientWidth * 0.5;
                canvasPos[1] = canvas.clientHeight * 0.5;
            }

            const pickBuffer = renderBufferManager.getRenderBuffer("pick");
            pickBuffer.setSize([1, 1]);
            pickBuffer.bind();

            const resetPickFrameCtx = (clipTransformDiv) => {
                frameCtx.reset();
                frameCtx.backfaces = true;
                frameCtx.frontface = true; // "ccw"
                const camera = scene.camera;
                frameCtx.viewParams.eye = pickResult.origin || camera.eye;
                frameCtx.viewParams.projMatrix = pickProjMatrix || camera.projMatrix;
                frameCtx.viewParams.viewMatrix = pickViewMatrix || camera.viewMatrix;
                const resolutionScale = scene.canvas.resolutionScale;
                frameCtx.pickClipPos = [
                    getClipPosX(canvasPos[0] * resolutionScale, gl.drawingBufferWidth),
                    getClipPosY(canvasPos[1] * resolutionScale, gl.drawingBufferHeight)
                ];
                frameCtx.pickClipPosInv = [
                    gl.drawingBufferWidth  / clipTransformDiv,
                    gl.drawingBufferHeight / clipTransformDiv
                ];
            };

            // gpuPickPickable
            resetPickFrameCtx(1);
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
            for (let i = 0, len = drawables.length; i < len; i++) {
                const drawable = drawables[i];
                if (drawable.culled === true || drawable.visible === false) {
                    continue;
                }
                if (!drawable.drawPickMesh || (params.pickInvisible !== true && drawable.visible === false) || drawable.pickable === false) {
                    continue;
                }
                if (includeEntityIds && !includeEntityIds[drawable.id]) { // TODO: push this logic into drawable
                    continue;
                }
                if (excludeEntityIds && excludeEntityIds[drawable.id]) {
                    continue;
                }
                drawable.drawPickMesh(frameCtx);
            }
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
                        resetPickFrameCtx(1);
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
                        resetPickFrameCtx(1);
                        frameCtx.viewParams.near = nearAndFar[0];
                        frameCtx.viewParams.far  = nearAndFar[1];
                        frameCtx.pickElementsCount = pickable.pickElementsCount;
                        frameCtx.pickElementsOffset = pickable.pickElementsOffset;

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
                        let pvMat;

                        if (origin) {
                            const rtcPickViewMat = createRTCViewMat(pickViewMatrix, origin, tempMat4a);
                            pvMat = math.mulMat4(pickProjMatrix, rtcPickViewMat, tempMat4c);

                        } else {
                            pvMat = math.mulMat4(pickProjMatrix, pickViewMatrix, tempMat4c);
                        }

                        const pvMatInverse = math.inverseMat4(pvMat, tempMat4d);

                        tempVec4a[0] = x;
                        tempVec4a[1] = y;
                        tempVec4a[2] = -1;
                        tempVec4a[3] = 1;

                        let world1 = math.transformVec4(pvMatInverse, tempVec4a);
                        world1 = math.mulVec4Scalar(world1, 1 / world1[3]);

                        tempVec4b[0] = x;
                        tempVec4b[1] = y;
                        tempVec4b[2] = 1;
                        tempVec4b[3] = 1;

                        let world2 = math.transformVec4(pvMatInverse, tempVec4b);
                        world2 = math.mulVec4Scalar(world2, 1 / world2[3]);

                        const dir = math.subVec3(world2, world1, tempVec4c);
                        const worldPos = math.addVec3(world1, math.mulVec4Scalar(dir, screenZ, tempVec4d), tempVec4e);

                        if (origin) {
                            math.addVec3(worldPos, origin);
                        }

                        pickResult.worldPos = worldPos;

                        if (params.pickSurfaceNormal !== false) {
                            // gpuPickWorldNormal
                            resetPickFrameCtx(3);

                            const pickNormalBuffer = renderBufferManager.getRenderBuffer("pick-normal");
                            pickNormalBuffer.setSize([3, 3]);
                            pickNormalBuffer.bind(gl.RGBA32I);

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

    function drawSnapInit(frameCtx) {
        frameCtx.snapPickLayerParams = [];
        frameCtx.snapPickLayerNumber = 0;

        for (let i = 0, len = postCullDrawableList.length; i < len; i++) {

            const drawable = postCullDrawableList[i];

            if (drawable.drawSnapInit) {
                if (!drawable.culled && drawable.visible && drawable.pickable) {
                    drawable.drawSnapInit(frameCtx);
                }
            }
        }
        return frameCtx.snapPickLayerParams;
    }

    function drawSnap(frameCtx) {
        frameCtx.snapPickLayerParams = frameCtx.snapPickLayerParams || [];
        frameCtx.snapPickLayerNumber = frameCtx.snapPickLayerParams.length;
        for (let i = 0, len = postCullDrawableList.length; i < len; i++) {

            const drawable = postCullDrawableList[i];

            if (drawable.drawSnapInit) {
                if (drawable.drawSnap) {
                    if (!drawable.culled && drawable.visible && drawable.pickable) {
                        drawable.drawSnap(frameCtx);
                    }
                }
            }
        }
        return frameCtx.snapPickLayerParams;
    }

    function getClipPosX(pos, size) {
        return 2 * (pos / size) - 1;
    }

    function getClipPosY(pos, size) {
        return 1 - 2 * (pos / size);
    }

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

        return function (params, pickResult = _pickResult) {

            const {canvasPos, origin, direction, snapRadius, snapToVertex, snapToEdge} = params;

            if (!snapToVertex && !snapToEdge) {
                return this.pick({canvasPos, pickSurface: true});
            }

            const camera = scene.camera;
            const resolutionScale = scene.canvas.resolutionScale;

            frameCtx.reset();
            frameCtx.backfaces = true;
            frameCtx.frontface = true; // "ccw"
            frameCtx.viewParams.far  = camera.project.far;
            frameCtx.viewParams.near = camera.project.near;

            const snapRadiusInPixels = snapRadius || 30;

            const vertexPickBuffer = renderBufferManager.getRenderBuffer(`uniquePickColors-aabs-${snapRadiusInPixels}`, { depthTexture: true });

            frameCtx.pickClipPos = [
                canvasPos ? getClipPosX(canvasPos[0] * resolutionScale, gl.drawingBufferWidth) : 0,
                canvasPos ? getClipPosY(canvasPos[1] * resolutionScale, gl.drawingBufferHeight) : 0,
            ];

            frameCtx.pickClipPosInv = [
                gl.drawingBufferWidth  / (2 * snapRadiusInPixels),
                gl.drawingBufferHeight / (2 * snapRadiusInPixels),
            ];

            // Bind and clear the snap render target

            vertexPickBuffer.setSize([2 * snapRadiusInPixels + 1, 2 * snapRadiusInPixels + 1]);
            vertexPickBuffer.bind(gl.RGBA32I, gl.RGBA32I, gl.RGBA8UI);
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

            //////////////////////////////////
            // Set view and proj mats for VBO renderers
            ///////////////////////////////////////

            frameCtx.viewParams.eye = camera.eye;
            frameCtx.viewParams.viewMatrix = (canvasPos
                                              ? camera.viewMatrix
                                              : math.lookAtMat4v(
                                                  origin,
                                                  math.addVec3(origin, direction, math.vec3()),
                                                  math.vec3([0, 1, 0]),
                                                  math.mat4()));

            frameCtx.viewParams.projMatrix = camera.projMatrix;

            // a) init z-buffer
            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
            const layerParamsSurface = drawSnapInit(frameCtx);

            // b) snap-pick
            const layerParamsSnap = []
            frameCtx.snapPickLayerParams = layerParamsSnap;

            gl.depthMask(false);
            gl.drawBuffers([gl.COLOR_ATTACHMENT0]);

            if (snapToVertex && snapToEdge) {
                frameCtx.snapMode = "edge";
                drawSnap(frameCtx);

                frameCtx.snapMode = "vertex";
                frameCtx.snapPickLayerNumber++;

                drawSnap(frameCtx);
            } else {
                frameCtx.snapMode = snapToVertex ? "vertex" : "edge";

                drawSnap(frameCtx);
            }

            gl.depthMask(true);

            // Read and decode the snapped coordinates

            const snapPickResultArray = vertexPickBuffer.readArray(gl.RGBA_INTEGER, gl.INT, Int32Array, 4);
            const snapPickNormalResultArray = vertexPickBuffer.readArray(gl.RGBA_INTEGER, gl.INT, Int32Array, 4, 1);
            const snapPickIdResultArray = vertexPickBuffer.readArray(gl.RGBA_INTEGER, gl.UNSIGNED_INT, Uint32Array, 4, 2);

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

            let snapPickResult = [];

            for (let i = 0; i < snapPickResultArray.length; i += 4) {
                if (snapPickResultArray[i + 3] > 0) {
                    const pixelNumber = Math.floor(i / 4);
                    const w = vertexPickBuffer.size[0];
                    const x = pixelNumber % w - Math.floor(w / 2);
                    const y = Math.floor(pixelNumber / w) - Math.floor(w / 2);
                    const dist = (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
                    snapPickResult.push({
                        x,
                        y,
                        dist,
                        isVertex: snapToVertex && snapToEdge ? snapPickResultArray[i + 3] > layerParamsSnap.length / 2 : snapToVertex,
                        result: [
                            snapPickResultArray[i + 0],
                            snapPickResultArray[i + 1],
                            snapPickResultArray[i + 2],
                            snapPickResultArray[i + 3],
                        ],
                        normal: [
                            snapPickNormalResultArray[i + 0],
                            snapPickNormalResultArray[i + 1],
                            snapPickNormalResultArray[i + 2],
                            snapPickNormalResultArray[i + 3],
                        ],
                        id: [
                            snapPickIdResultArray[i + 0],
                            snapPickIdResultArray[i + 1],
                            snapPickIdResultArray[i + 2],
                            snapPickIdResultArray[i + 3],
                        ]
                    });
                }
            }

            let snappedWorldPos = null;
            let snappedWorldNormal = null;
            let snappedPickable = null;
            let snapType = null;

            if (snapPickResult.length > 0) {
                // vertex snap first, then edge snap
                snapPickResult.sort((a, b) => {
                    if (a.isVertex !== b.isVertex) {
                        return a.isVertex ? -1 : 1;
                    } else {
                        return a.dist - b.dist;
                    }
                });

                const res = snapPickResult[0];
                snapType = res.isVertex ? "vertex" : "edge";

                const snapPick = res.result;
                const pickedLayerParmas = layerParamsSnap[snapPick[3]];
                snappedWorldPos = toWorldPos(snapPick, pickedLayerParmas.origin, pickedLayerParmas.coordinateScale);

                snappedWorldNormal = toWorldNormal(res.normal);
                snappedPickable = pickIDs.items[pixelToInt(res.id)];
            }

            if (null === worldPos && null == snappedWorldPos) {   // If neither regular pick or snap pick, return null
                return null;
            }

            let snappedCanvasPos = null;

            if (null !== snappedWorldPos) {
                snappedCanvasPos = camera.projectWorldPos(snappedWorldPos);
            }

            const snappedEntity = (snappedPickable && snappedPickable.delegatePickedEntity) ? snappedPickable.delegatePickedEntity() : snappedPickable;
            if (!snappedEntity && pickable) {
                pickable = pickable.delegatePickedEntity ? pickable.delegatePickedEntity() : pickable;
            }

            pickResult.reset();
            pickResult.snappedToEdge = (snapType === "edge");
            pickResult.snappedToVertex = (snapType === "vertex");
            pickResult.worldPos = snappedWorldPos || worldPos;
            pickResult.worldNormal = snappedWorldNormal || worldNormal;
            pickResult.entity = snappedEntity || pickable;
            pickResult.canvasPos = canvasPos || camera.projectWorldPos(worldPos || snappedWorldPos);
            pickResult.snappedCanvasPos = snappedCanvasPos || canvasPos;

            return pickResult;
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
                readPixelBuf.clear();
            }

            frameCtx.reset();
            frameCtx.backfaces = true;
            frameCtx.frontface = true; // "ccw"
            frameCtx.viewParams = getSceneCameraViewParams();

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(0, 0, 0, 0);
            gl.enable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.BLEND);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            for (let i = 0, len = postCullDrawableList.length; i < len; i++) {

                const drawable = postCullDrawableList[i];

                if (!drawable.drawOcclusion || drawable.culled === true || drawable.visible === false || drawable.pickable === false) { // TODO: Option to exclude transparent?
                    continue;
                }

                drawable.drawOcclusion(frameCtx);
            }

            this._occlusionTester.drawMarkers();

            if (readPixelBuf) {
                const resolutionScale = scene.canvas.resolutionScale;
                this._occlusionTester.doOcclusionTest( // Updates Marker "visible" properties
                    (x, y) => readPixelBuf.read(Math.round(resolutionScale * x), Math.round(resolutionScale * y)));
                readPixelBuf.unbind();
            }
        }
    };

    /**
     * Read pixels from the renderer's current output. Performs a force-render first.
     * @param pixels
     * @param colors
     * @param len
     * @param opaqueOnly
     * @private
     */
    this.readPixels = function (pixels, colors, len, opaqueOnly) {
        const snapshotBuffer = renderBufferManager.getRenderBuffer("snapshot");
        snapshotBuffer.bind();
        snapshotBuffer.clear();
        this.render({force: true, opaqueOnly: opaqueOnly});
        let color;
        let i;
        let j;
        let k;
        for (i = 0; i < len; i++) {
            j = i * 2;
            k = i * 4;
            color = snapshotBuffer.read(pixels[j], pixels[j + 1]);
            colors[k] = color[0];
            colors[k + 1] = color[1];
            colors[k + 2] = color[2];
            colors[k + 3] = color[3];
        }
        snapshotBuffer.unbind();
        imageDirty = true;
    };

    /**
     * Enter snapshot mode.
     *
     * Switches rendering to a hidden snapshot canvas.
     *
     * Exit snapshot mode using endSnapshot().
     */
    this.beginSnapshot = function (params = {}) {
        const snapshotBuffer = renderBufferManager.getRenderBuffer("snapshot");
        snapshotBuffer.setSize((params.width && params.height)
                               ? [params.width, params.height]
                               : [gl.drawingBufferWidth, gl.drawingBufferHeight]);
        snapshotBuffer.bind();
        snapshotBuffer.clear();
        snapshotBound = true;
    };

    /**
     * When in snapshot mode, renders a frame of the current Scene state to the snapshot canvas.
     */
    this.renderSnapshot = function () {
        if (!snapshotBound) {
            return;
        }
        const snapshotBuffer = renderBufferManager.getRenderBuffer("snapshot");
        snapshotBuffer.clear();
        this.render({force: true, opaqueOnly: false});
        imageDirty = true;
    };

    /**
     * When in snapshot mode, gets an image of the snapshot canvas.
     *
     * @private
     * @returns {String} The image data URI.
     */
    this.readSnapshot = function (params) {
        const snapshotBuffer = renderBufferManager.getRenderBuffer("snapshot");
        return snapshotBuffer.readImage(params);
    };

    /**
     * Returns an HTMLCanvas containing an image of the snapshot canvas.
     *
     * - The HTMLCanvas has a CanvasRenderingContext2D.
     * - Expects the caller to draw more things on the HTMLCanvas (annotations etc).
     *
     * @returns {HTMLCanvasElement}
     */
    this.readSnapshotAsCanvas = function () {
        const snapshotBuffer = renderBufferManager.getRenderBuffer("snapshot");
        return snapshotBuffer.readImageAsCanvas();
    };

    /**
     * Exists snapshot mode.
     *
     * Switches rendering back to the main canvas.
     */
    this.endSnapshot = function () {
        if (!snapshotBound) {
            return;
        }
        const snapshotBuffer = renderBufferManager.getRenderBuffer("snapshot");
        snapshotBuffer.unbind();
        snapshotBound = false;
    };

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