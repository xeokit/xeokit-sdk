import {FileLoader} from "../../../utils/FileLoader";
import {WorkerPool} from "../../../utils/WorkerPool";

const CONSTANTS = {
    RGB_S3TC_DXT1_Format: 33776,
    RGBA_S3TC_DXT1_Format: 33777,
    RGBA_S3TC_DXT3_Format: 33778,
    RGBA_S3TC_DXT5_Format: 33779,
    RGB_PVRTC_4BPPV1_Format: 35840,
    RGB_PVRTC_2BPPV1_Format: 35841,
    RGBA_PVRTC_4BPPV1_Format: 35842,
    RGBA_PVRTC_2BPPV1_Format: 35843,
    RGB_ETC1_Format: 36196,
    RGB_ETC2_Format: 37492,
    RGBA_ETC2_EAC_Format: 37496,
    RGBA_ASTC_4x4_Format: 37808,
    RGBA_ASTC_5x4_Format: 37809,
    RGBA_ASTC_5x5_Format: 37810,
    RGBA_ASTC_6x5_Format: 37811,
    RGBA_ASTC_6x6_Format: 37812,
    RGBA_ASTC_8x5_Format: 37813,
    RGBA_ASTC_8x6_Format: 37814,
    RGBA_ASTC_8x8_Format: 37815,
    RGBA_ASTC_10x5_Format: 37816,
    RGBA_ASTC_10x6_Format: 37817,
    RGBA_ASTC_10x8_Format: 37818,
    RGBA_ASTC_10x10_Format: 37819,
    RGBA_ASTC_12x10_Format: 37820,
    RGBA_ASTC_12x12_Format: 37821,
    UnsignedByteType: 1009,
    LinearFilter: 1006,
    LinearMipmapLinearFilter: 1008,
    sRGBEncoding: 3001,
    LinearEncoding: 3000
};

const KTX2TransferSRGB = 2;
const KTX2_ALPHA_PREMULTIPLIED = 1;

let activeTranscoders = 0;

/**
 * Transcodes texture data from KTX2.
 *
 * ## Overview
 *
 * * Uses the Basis Universal codec to transcode KTX2 texture assets.
 * * An {@link XKTLoaderPlugin} that is configured with a KTX2TextureTranscoder will allow us to load KTX2 textures in
 * XKT files. Textures in XKT are always KTX2. If we do not configure a KTX2TextureTranscoder, the XKTLoaderPlugin will
 * simply ignore the textures in the XKT.
 * * A {@link SceneModel} implementation (eg. {@link VBOSceneModel}) that is configured with a KTX2TextureTranscoder will
 * allow us to load textures into it from KTX2 files or ArrayBuffers.
 *
 * ## What is KTX2?
 *
 * A KTX2 file stores GPU texture data in the Khronos Texture 2.0 (KTX2) container format. It contains image data for
 * a texture asset compressed with Basis Universal (BasisU) supercompression that can be transcoded to different formats
 * depending on the support provided by the target devices. KTX2 provides a lightweight format for distributing texture
 * assets to GPUs. Due to BasisU compression, KTX2 files can store any image format supported by GPUs.
 *
 * ## Loading XKT files containing KTX2 textures
 *
 * An {@link XKTLoaderPlugin} that is configured with a KTX2TextureTranscoder will allow us to load XKT files that
 * contain KTX2 textures. If we don't configure a KTX2TextureTranscoder, then the XKTLoaderPlugin will simply ignore
 * the textures in the XKT.
 *
 * In the example below, we'll create a {@link Viewer} and add an {@link XKTLoaderPlugin}
 * configured with a KTX2TextureTranscoder. Then we'll use the XKTLoaderPlugin to load an
 * XKT file that contains KTX2 textures, which the plugin will transcode using
 * its KTX2TextureTranscoder.
 *
 * ````javascript
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.camera.eye = [-2.56, 8.38, 8.27];
 * viewer.camera.look = [13.44, 3.31, -14.83];
 * viewer.camera.up = [0.10, 0.98, -0.14];
 *
 * const textureTranscoder = new KTX2TextureTranscoder({
 *     viewer,
 *     transcoderPath: "./../dist/basis/" // <------ Path to Basis Universal transcoder
 * });
 *
 * const xktLoader = new XKTLoaderPlugin(viewer, {
 *     textureTranscoder // <<------------- Transcodes KTX2 textures in XKT files
 * });
 *
 * const sceneModel = xktLoader.load({
 *     id: "myModel",
 *     src: "./HousePlan.xkt" // <<------ XKT file with KTX2 textures
 * });
 * ````
 *
 * ## Loading KTX2 files into a VBOSceneModel
 *
 * A {@link SceneModel} that is configured with a KTX2TextureTranscoder will
 * allow us to load textures into it from KTX2-transcoded buffers or files.
 *
 * In the example below, we'll create a {@link Viewer}, containing a {@link VBOSceneModel} configured with a
 * KTX2TextureTranscoder. We'll then programmatically create a simple object within the VBOSceneModel, consisting of
 * a single mesh with a texture loaded from a KTX2 file, which our VBOSceneModel internally transcodes, using
 * its KTX2TextureTranscoder. Note how we configure our KTX2TextureTranscoder with a path to the Basis Universal
 * transcoder WASM module.
 *
 * ````javascript
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.scene.camera.eye = [-21.80, 4.01, 6.56];
 * viewer.scene.camera.look = [0, -5.75, 0];
 * viewer.scene.camera.up = [0.37, 0.91, -0.11];
 *
 * const textureTranscoder = new KTX2TextureTranscoder({
 *     viewer,
 *     transcoderPath: "./../dist/basis/" // <------ Path to BasisU transcoder module
 * });
 *
 * const vboSceneModel = new VBOSceneModel(viewer.scene, {
 *      id: "myModel",
 *      textureTranscoder // <<-------------------- Configure loader with our transcoder
 *  });
 *
 * vboSceneModel.createTexture({
 *      id: "myColorTexture",
 *      src: "../assets/textures/compressed/sample_uastc_zstd.ktx2" // <<----- KTX2 texture asset
 * });
 *
 * vboSceneModel.createTexture({
 *      id: "myMetallicRoughnessTexture",
 *      src: "../assets/textures/alpha/crosshatchAlphaMap.jpg" // <<----- JPEG texture asset
 * });
 *
 * vboSceneModel.createTextureSet({
 *      id: "myTextureSet",
 *      colorTextureId: "myColorTexture",
 *      metallicRoughnessTextureId: "myMetallicRoughnessTexture"
 *  });
 *
 * vboSceneModel.createMesh({
 *      id: "myMesh",
 *      textureSetId: "myTextureSet",
 *      primitive: "triangles",
 *      positions: [1, 1, 1, ...],
 *      normals: [0, 0, 1, 0, ...],
 *      uv: [1, 0, 0, ...],
 *      indices: [0, 1, 2, ...],
 *  });
 *
 * vboSceneModel.createEntity({
 *      id: "myEntity",
 *      meshIds: ["myMesh"]
 *  });
 *
 * vboSceneModel.finalize();
 * ````
 *
 * ## Loading KTX2 ArrayBuffers into a VBOSceneModel
 *
 * A {@link SceneModel} that is configured with a KTX2TextureTranscoder will allow us to load textures into
 * it from KTX2 ArrayBuffers.
 *
 * In the example below, we'll create a {@link Viewer}, containing a {@link VBOSceneModel} configured with a
 * KTX2TextureTranscoder. We'll then programmatically create a simple object within the VBOSceneModel, consisting of
 * a single mesh with a texture loaded from a KTX2 ArrayBuffer, which our VBOSceneModel internally transcodes, using
 * its KTX2TextureTranscoder.
 *
 * ````javascript
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.scene.camera.eye = [-21.80, 4.01, 6.56];
 * viewer.scene.camera.look = [0, -5.75, 0];
 * viewer.scene.camera.up = [0.37, 0.91, -0.11];
 *
 * const textureTranscoder = new KTX2TextureTranscoder({
 *     viewer,
 *     transcoderPath: "./../dist/basis/" // <------ Path to BasisU transcoder module
 * });
 *
 * const vboSceneModel = new VBOSceneModel(viewer.scene, {
 *      id: "myModel",
 *      textureTranscoder // <<-------------------- Configure loader with our transcoder
 * });
 *
 * utils.loadArraybuffer("../assets/textures/compressed/sample_uastc_zstd.ktx2",(arrayBuffer) => {
 *
 *     vboSceneModel.createTexture({
 *         id: "myColorTexture",
 *         buffers: [arrayBuffer] // <<----- KTX2 texture asset
 *     });
 *
 *     vboSceneModel.createTexture({
 *         id: "myMetallicRoughnessTexture",
 *         src: "../assets/textures/alpha/crosshatchAlphaMap.jpg" // <<----- JPEG texture asset
 *     });
 *
 *     vboSceneModel.createTextureSet({
 *        id: "myTextureSet",
 *        colorTextureId: "myColorTexture",
 *        metallicRoughnessTextureId: "myMetallicRoughnessTexture"
 *     });
 *
 *     vboSceneModel.createMesh({
 *          id: "myMesh",
 *          textureSetId: "myTextureSet",
 *          primitive: "triangles",
 *          positions: [1, 1, 1, ...],
 *          normals: [0, 0, 1, 0, ...],
 *          uv: [1, 0, 0, ...],
 *          indices: [0, 1, 2, ...],
 *     });
 *
 *     vboSceneModel.createEntity({
 *         id: "myEntity",
 *         meshIds: ["myMesh"]
 *     });
 *
 *     vboSceneModel.finalize();
 * });
 * ````
 *
 * @implements {TextureTranscoder}
 */
class KTX2TextureTranscoder {

    /**
     * Creates a new KTX2TextureTranscoder.
     *
     * @param {Viewer} viewer The Viewer that our KTX2TextureTranscoder will be used with. This KTX2TextureTranscoder
     * must only be used to transcode textures for this Viewer. This is because the Viewer's capabilities will decide
     * what target GPU formats this KTX2TextureTranscoder will transcode to.
     * @param {String} transcoderPath Path to the Basis transcoder module that internally does the heavy lifting for our KTX2TextureTranscoder.
     * @param {Number} [workerLimit] The maximum number of Workers to use for transcoding.
     */
    constructor({viewer, transcoderPath, workerLimit}) {

        this._transcoderPath = transcoderPath;
        this._transcoderBinary = null;
        this._transcoderPending = null;
        this._workerPool = new WorkerPool();
        this._workerSourceURL = '';

        if (workerLimit) {
            this._workerPool.setWorkerLimit(workerLimit);
        }

        const viewerCapabilities = viewer.capabilities;

        this._workerConfig = {
            astcSupported: viewerCapabilities.astcSupported,
            etc1Supported: viewerCapabilities.etc1Supported,
            etc2Supported: viewerCapabilities.etc2Supported,
            dxtSupported: viewerCapabilities.dxtSupported,
            bptcSupported: viewerCapabilities.bptcSupported,
            pvrtcSupported: viewerCapabilities.pvrtcSupported
        };

        this._supportedFileTypes = ["xkt2"];
    }

    _init() {
        if (!this._transcoderPending) {
            const jsLoader = new FileLoader();
            jsLoader.setPath(this._transcoderPath);
            jsLoader.setWithCredentials(this.withCredentials);
            const jsContent = jsLoader.loadAsync('basis_transcoder.js');
            const binaryLoader = new FileLoader();
            binaryLoader.setPath(this._transcoderPath);
            binaryLoader.setResponseType('arraybuffer');
            binaryLoader.setWithCredentials(this.withCredentials);
            const binaryContent = binaryLoader.loadAsync('basis_transcoder.wasm');
            this._transcoderPending = Promise.all([jsContent, binaryContent])
                .then(([jsContent, binaryContent]) => {
                    const fn = KTX2TextureTranscoder.BasisWorker.toString();
                    const body = [
                        '/* constants */',
                        'let _EngineFormat = ' + JSON.stringify(KTX2TextureTranscoder.EngineFormat),
                        'let _TranscoderFormat = ' + JSON.stringify(KTX2TextureTranscoder.TranscoderFormat),
                        'let _BasisFormat = ' + JSON.stringify(KTX2TextureTranscoder.BasisFormat),
                        '/* basis_transcoder.js */',
                        jsContent,
                        '/* worker */',
                        fn.substring(fn.indexOf('{') + 1, fn.lastIndexOf('}'))
                    ].join('\n');
                    this._workerSourceURL = URL.createObjectURL(new Blob([body]));
                    this._transcoderBinary = binaryContent;
                    this._workerPool.setWorkerCreator(() => {
                        const worker = new Worker(this._workerSourceURL);
                        const transcoderBinary = this._transcoderBinary.slice(0);
                        worker.postMessage({
                            type: 'init',
                            config: this._workerConfig,
                            transcoderBinary
                        }, [transcoderBinary]);
                        return worker;
                    });
                });
            if (activeTranscoders > 0) {
                console.warn('KTX2TextureTranscoder: Multiple active KTX2TextureTranscoder may cause performance issues.' + ' Use a single KTX2TextureTranscoder instance, or call .dispose() on old instances.');
            }
            activeTranscoders++;
        }
        return this._transcoderPending;
    }

    /**
     * Transcodes texture data from transcoded buffers into a {@link Texture2D}.
     *
     * @param {ArrayBuffer[]} buffers Transcoded texture data. Given as an array of buffers so that we can support multi-image textures, such as cube maps.
     * @param {*} config Transcoding options.
     * @param {Texture2D} texture The texture to load.
     * @returns {Promise} Resolves when the texture has loaded.
     */
    transcode(buffers, texture, config = {}) {
        return new Promise((resolve, reject) => {
            const taskConfig = config;
            this._init().then(() => {
                return this._workerPool.postMessage({
                    type: 'transcode',
                    buffers,
                    taskConfig: taskConfig
                }, buffers);
            }).then((e) => {
                const transcodeResult = e.data;
                const {mipmaps, width, height, format, type, error, dfdTransferFn, dfdFlags} = transcodeResult;
                if (type === 'error') {
                    return reject(error);
                }
                const minFilter = mipmaps.length === 1 ? CONSTANTS.LinearFilter : CONSTANTS.LinearMipmapLinearFilter;
                const magFilter = mipmaps.length === 1 ? CONSTANTS.LinearFilter : CONSTANTS.LinearMipmapLinearFilter;
                const encoding = dfdTransferFn === KTX2TransferSRGB ? CONSTANTS.sRGBEncoding : CONSTANTS.LinearEncoding;
                const premultiplyAlpha = !!(dfdFlags & KTX2_ALPHA_PREMULTIPLIED);
                debugger;
                texture.setCompressedData({
                    mipmaps,
                    props: {
                        // minFilter: mipmaps.length === 1 ? "linear" : "linearMipmapLinear",
                        // maxFilter: mipmaps.length === 1 ? "linear" : "linearMipmapLinear",
                        format,
                        encoding
                    }
                });
                resolve()
            });
        });
    }

    /**
     * Destroys this KTX2TextureTranscoder
     */
    destroy() {
        URL.revokeObjectURL(this._workerSourceURL);
        this._workerPool.destroy();
        activeTranscoders--;
    }
}

/**
 * @private
 */
KTX2TextureTranscoder.BasisFormat = {
    ETC1S: 0,
    UASTC_4x4: 1
};

/**
 * @private
 */
KTX2TextureTranscoder.TranscoderFormat = {
    ETC1: 0,
    ETC2: 1,
    BC1: 2,
    BC3: 3,
    BC4: 4,
    BC5: 5,
    BC7_M6_OPAQUE_ONLY: 6,
    BC7_M5: 7,
    PVRTC1_4_RGB: 8,
    PVRTC1_4_RGBA: 9,
    ASTC_4x4: 10,
    ATC_RGB: 11,
    ATC_RGBA_INTERPOLATED_ALPHA: 12,
    RGBA32: 13,
    RGB565: 14,
    BGR565: 15,
    RGBA4444: 16
};

/**
 * @private
 */
KTX2TextureTranscoder.EngineFormat = {
    RGBAFormat: CONSTANTS.RGBAFormat,
    RGBA_ASTC_4x4_Format: CONSTANTS.RGBA_ASTC_4x4_Format,
    RGBA_BPTC_Format: CONSTANTS.RGBA_BPTC_Format,
    RGBA_ETC2_EAC_Format: CONSTANTS.RGBA_ETC2_EAC_Format,
    RGBA_PVRTC_4BPPV1_Format: CONSTANTS.RGBA_PVRTC_4BPPV1_Format,
    RGBA_S3TC_DXT5_Format: CONSTANTS.RGBA_S3TC_DXT5_Format,
    RGB_ETC1_Format: CONSTANTS.RGB_ETC1_Format,
    RGB_ETC2_Format: CONSTANTS.RGB_ETC2_Format,
    RGB_PVRTC_4BPPV1_Format: CONSTANTS.RGB_PVRTC_4BPPV1_Format,
    RGB_S3TC_DXT1_Format: CONSTANTS.RGB_S3TC_DXT1_Format
};

/* WEB WORKER */

/**
 * @private
 * @constructor
 */
KTX2TextureTranscoder.BasisWorker = function () {

    let config;
    let transcoderPending;
    let BasisModule;

    const EngineFormat = _EngineFormat; // eslint-disable-line no-undef
    const TranscoderFormat = _TranscoderFormat; // eslint-disable-line no-undef
    const BasisFormat = _BasisFormat; // eslint-disable-line no-undef

    self.addEventListener('message', function (e) {
        const message = e.data;

        console.log("worker: " + message.type)

        switch (message.type) {
            case 'init':
                config = message.config;
                init(message.transcoderBinary);
                break;
            case 'transcode':
                debugger;
                console.log("worker transcoding A...");
                transcoderPending.then(() => {
                    console.log("worker transcoding B...");
                    try {
                        const {
                            width,
                            height,
                            hasAlpha,
                            mipmaps,
                            format,
                            dfdTransferFn,
                            dfdFlags
                        } = transcode(message.buffers[0]);
                        const buffers = [];
                        for (let i = 0; i < mipmaps.length; ++i) {
                            buffers.push(mipmaps[i].data.buffer);
                        }
                        console.log({
                            type: 'transcode',
                            id: message.id,
                            width,
                            height,
                            hasAlpha,
                            mipmaps,
                            format,
                            dfdTransferFn,
                            dfdFlags
                        });
                        self.postMessage({
                            type: 'transcode',
                            id: message.id,
                            width,
                            height,
                            hasAlpha,
                            mipmaps,
                            format,
                            dfdTransferFn,
                            dfdFlags
                        }, buffers);
                    } catch (error) {
                        debugger;
                        console.error(`[KTX2TextureTranscoder.BasisWorker]: ${error}`);
                        self.postMessage({type: 'error', id: message.id, error: error.message});
                    }
                });
                break;
        }
    });

    function init(wasmBinary) {
        transcoderPending = new Promise(resolve => {
            BasisModule = {
                wasmBinary,
                onRuntimeInitialized: resolve
            };
            BASIS(BasisModule); // eslint-disable-line no-undef
        }).then(() => {
            BasisModule.initializeBasis();
            if (BasisModule.KTX2File === undefined) {
                console.warn('KTX2TextureTranscoder: Please update Basis Universal transcoder.');
            }
        });
    }

    function transcode(buffer) {
        const ktx2File = new BasisModule.KTX2File(new Uint8Array(buffer));

        function cleanup() {
            ktx2File.close();
            ktx2File.delete();
        }

        if (!ktx2File.isValid()) {
            cleanup();
            throw new Error('KTX2TextureTranscoder: Invalid or unsupported .ktx2 file');
        }
        const basisFormat = ktx2File.isUASTC() ? BasisFormat.UASTC_4x4 : BasisFormat.ETC1S;
        const width = ktx2File.getWidth();
        const height = ktx2File.getHeight();
        const levels = ktx2File.getLevels();
        const hasAlpha = ktx2File.getHasAlpha();
        const dfdTransferFn = ktx2File.getDFDTransferFunc();
        const dfdFlags = ktx2File.getDFDFlags();
        const {transcoderFormat, engineFormat} = getTranscoderFormat(basisFormat, width, height, hasAlpha);
        if (!width || !height || !levels) {
            cleanup();
            throw new Error('KTX2TextureTranscoder: Invalid texture');
        }
        if (!ktx2File.startTranscoding()) {
            cleanup();
            throw new Error('KTX2TextureTranscoder: .startTranscoding failed');
        }
        const mipmaps = [];
        for (let mip = 0; mip < levels; mip++) {
            const levelInfo = ktx2File.getImageLevelInfo(mip, 0, 0);
            const mipWidth = levelInfo.origWidth;
            const mipHeight = levelInfo.origHeight;
            const dst = new Uint8Array(ktx2File.getImageTranscodedSizeInBytes(mip, 0, 0, transcoderFormat));
            const status = ktx2File.transcodeImage(dst, mip, 0, 0, transcoderFormat, 0, -1, -1);
            if (!status) {
                cleanup();
                throw new Error('KTX2TextureTranscoder: .transcodeImage failed.');
            }
            mipmaps.push({data: dst, width: mipWidth, height: mipHeight});
        }
        cleanup();
        return {width, height, hasAlpha, mipmaps, format: engineFormat, dfdTransferFn, dfdFlags};
    }

    // Optimal choice of a transcoder target format depends on the Basis format (ETC1S or UASTC),
    // device capabilities, and texture dimensions. The list below ranks the formats separately
    // for ETC1S and UASTC.
    //
    // In some cases, transcoding UASTC to RGBA32 might be preferred for higher quality (at
    // significant memory cost) compared to ETC1/2, BC1/3, and PVRTC. The transcoder currently
    // chooses RGBA32 only as a last resort and does not expose that option to the caller.

    const FORMAT_OPTIONS = [{
        if: 'astcSupported',
        basisFormat: [BasisFormat.UASTC_4x4],
        transcoderFormat: [TranscoderFormat.ASTC_4x4, TranscoderFormat.ASTC_4x4],
        engineFormat: [EngineFormat.RGBA_ASTC_4x4_Format, EngineFormat.RGBA_ASTC_4x4_Format],
        priorityETC1S: Infinity,
        priorityUASTC: 1,
        needsPowerOfTwo: false
    }, {
        if: 'bptcSupported',
        basisFormat: [BasisFormat.ETC1S, BasisFormat.UASTC_4x4],
        transcoderFormat: [TranscoderFormat.BC7_M5, TranscoderFormat.BC7_M5],
        engineFormat: [EngineFormat.RGBA_BPTC_Format, EngineFormat.RGBA_BPTC_Format],
        priorityETC1S: 3,
        priorityUASTC: 2,
        needsPowerOfTwo: false
    }, {
        if: 'dxtSupported',
        basisFormat: [BasisFormat.ETC1S, BasisFormat.UASTC_4x4],
        transcoderFormat: [TranscoderFormat.BC1, TranscoderFormat.BC3],
        engineFormat: [EngineFormat.RGB_S3TC_DXT1_Format, EngineFormat.RGBA_S3TC_DXT5_Format],
        priorityETC1S: 4,
        priorityUASTC: 5,
        needsPowerOfTwo: false
    }, {
        if: 'etc2Supported',
        basisFormat: [BasisFormat.ETC1S, BasisFormat.UASTC_4x4],
        transcoderFormat: [TranscoderFormat.ETC1, TranscoderFormat.ETC2],
        engineFormat: [EngineFormat.RGB_ETC2_Format, EngineFormat.RGBA_ETC2_EAC_Format],
        priorityETC1S: 1,
        priorityUASTC: 3,
        needsPowerOfTwo: false
    }, {
        if: 'etc1Supported',
        basisFormat: [BasisFormat.ETC1S, BasisFormat.UASTC_4x4],
        transcoderFormat: [TranscoderFormat.ETC1],
        engineFormat: [EngineFormat.RGB_ETC1_Format],
        priorityETC1S: 2,
        priorityUASTC: 4,
        needsPowerOfTwo: false
    }, {
        if: 'pvrtcSupported',
        basisFormat: [BasisFormat.ETC1S, BasisFormat.UASTC_4x4],
        transcoderFormat: [TranscoderFormat.PVRTC1_4_RGB, TranscoderFormat.PVRTC1_4_RGBA],
        engineFormat: [EngineFormat.RGB_PVRTC_4BPPV1_Format, EngineFormat.RGBA_PVRTC_4BPPV1_Format],
        priorityETC1S: 5,
        priorityUASTC: 6,
        needsPowerOfTwo: true
    }];
    const ETC1S_OPTIONS = FORMAT_OPTIONS.sort(function (a, b) {
        return a.priorityETC1S - b.priorityETC1S;
    });
    const UASTC_OPTIONS = FORMAT_OPTIONS.sort(function (a, b) {
        return a.priorityUASTC - b.priorityUASTC;
    });

    function getTranscoderFormat(basisFormat, width, height, hasAlpha) {
        let transcoderFormat;
        let engineFormat;
        const options = basisFormat === BasisFormat.ETC1S ? ETC1S_OPTIONS : UASTC_OPTIONS;
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            if (!config[opt.if]) continue;
            if (!opt.basisFormat.includes(basisFormat)) continue;
            if (hasAlpha && opt.transcoderFormat.length < 2) continue;
            if (opt.needsPowerOfTwo && !(isPowerOfTwo(width) && isPowerOfTwo(height))) continue;
            transcoderFormat = opt.transcoderFormat[hasAlpha ? 1 : 0];
            engineFormat = opt.engineFormat[hasAlpha ? 1 : 0];
            return {
                transcoderFormat,
                engineFormat
            };
        }
        console.warn('KTX2TextureTranscoder: No suitable compressed texture format found. Decoding to RGBA32.');
        transcoderFormat = TranscoderFormat.RGBA32;
        engineFormat = EngineFormat.RGBAFormat;
        return {
            transcoderFormat,
            engineFormat
        };
    }

    function isPowerOfTwo(value) {
        if (value <= 2) return true;
        return (value & value - 1) === 0 && value !== 0;
    }
};

const cachedTranscoders = {};

/**
 * @private
 */
function getKTX2Transcoder(viewer) {
    const sceneId = viewer.scene.id;
    let transcoder = cachedTranscoders[sceneId];
    if (!transcoder) {
        transcoder = new KTX2TextureTranscoder(viewer);
        cachedTranscoders[sceneId] = transcoder;
        viewer.scene.on("destroyed", () => {
            delete cachedTranscoders[sceneId];
            transcoder.destroy();
        });
    }
    return transcoder;
}

export {getKTX2Transcoder, KTX2TextureTranscoder};
