import {Scene} from "./scene/scene/Scene.js";
import {CameraFlightAnimation} from "./scene/camera/CameraFlightAnimation.js";
import {CameraControl} from "./scene/CameraControl/CameraControl.js";
import {MetaScene} from "./metadata/MetaScene.js";
import {LocaleService} from "./localization/LocaleService.js";
import {html2canvas} from '../external.js';
import {math} from "./scene/math/math.js";
import {transformToNode} from "../plugins/lib/ui/index.js";

/**
 * The 3D Viewer at the heart of the xeokit SDK.
 *
 * * A Viewer wraps a single {@link Scene}
 * * Add {@link Plugin}s to a Viewer to extend its functionality.
 * * {@link Viewer#metaScene} holds metadata about models in the
 * Viewer's {@link MetaScene}.
 * * Use {@link Viewer#cameraFlight} to fly or jump the {@link Scene}'s
 * {@link Camera} to target positions, boundaries or {@link Entity}s.
 *
 * @public
 */
class Viewer {

    /**
     * @constructor
     * @param {Object} cfg Viewer configuration.
     * @param {String} [cfg.id] Optional ID for this Viewer, defaults to the ID of {@link Viewer#scene}, which xeokit automatically generates.
     * @param {String} [cfg.canvasId]  ID of an existing HTML canvas for the {@link Viewer#scene} - either this or canvasElement is mandatory. When both values are given, the element reference is always preferred to the ID.
     * @param {HTMLCanvasElement} [cfg.canvasElement] Reference of an existing HTML canvas for the {@link Viewer#scene} - either this or canvasId is mandatory. When both values are given, the element reference is always preferred to the ID.
     * @param {HTMLElement} [cfg.keyboardEventsElement] Optional reference to HTML element on which key events should be handled. Defaults to the HTML Document.
     * @param {String} [cfg.spinnerElementId]  ID of existing HTML element to show the {@link Spinner} - internally creates a default element automatically if this is omitted.
     * @param {Number} [cfg.passes=1] The number of times the {@link Viewer#scene} renders per frame.
     * @param {Boolean} [cfg.clearEachPass=false] When doing multiple passes per frame, specifies if to clear the canvas before each pass (true) or just before the first pass (false).
     * @param {Boolean} [cfg.preserveDrawingBuffer=true]  Whether or not to preserve the WebGL drawing buffer. This needs to be ````true```` for {@link Viewer#getSnapshot} to work.
     * @param {Boolean} [cfg.transparent=true]  Whether or not the canvas is transparent.
     * @param {Boolean} [cfg.premultipliedAlpha=false]  Whether or not you want alpha composition with premultiplied alpha. Highlighting and selection works best when this is ````false````.
     * @param {Boolean} [cfg.gammaInput=true]  When true, expects that all textures and colors are premultiplied gamma.
     * @param {Boolean} [cfg.gammaOutput=false]  Whether or not to render with pre-multiplied gama.
     * @param {Number} [cfg.gammaFactor=2.2] The gamma factor to use when rendering with pre-multiplied gamma.
     * @param {Number[]} [cfg.backgroundColor=[1,1,1]] Sets the canvas background color to use when ````transparent```` is false.
     * @param {Boolean} [cfg.backgroundColorFromAmbientLight=true] When ````transparent```` is false, set this ````true````
     * to derive the canvas background color from {@link AmbientLight#color}, or ````false```` to set the canvas background to ````backgroundColor````.
     * @param {String} [cfg.units="meters"] The measurement unit type. Accepted values are ````"meters"````, ````"metres"````, , ````"centimeters"````, ````"centimetres"````, ````"millimeters"````,  ````"millimetres"````, ````"yards"````, ````"feet"```` and ````"inches"````.
     * @param {Number} [cfg.scale=1] The number of Real-space units in each World-space coordinate system unit.
     * @param {Number[]} [cfg.origin=[0,0,0]] The Real-space 3D origin, in current measurement units, at which the World-space coordinate origin ````[0,0,0]```` sits.
     * @param {Boolean} [cfg.saoEnabled=false] Whether to enable Scalable Ambient Obscurance (SAO) effect. See {@link SAO} for more info.
     * @param {Boolean} [cfg.antialias=true] Whether to enable anti-aliasing.
     * @throws {String} Throws an exception when both canvasId or canvasElement are missing or they aren't pointing to a valid HTMLCanvasElement.
     * @param {Boolean} [cfg.alphaDepthMask=true] Whether writing into the depth buffer is enabled or disabled when rendering transparent objects.
     * @param {Boolean} [cfg.entityOffsetsEnabled=false] Whether to enable {@link Entity#offset}. For best performance, only set this ````true```` when you need to use {@link Entity#offset}.
     * @param {Boolean} [cfg.readableGeometryEnabled=false] Whether to enable full-precision accuracy when surface picking with {@link Scene#pick}. Note that when ````true````, this configuration will increase the amount of browser memory used by the Viewer. The ````pickSurfacePrecision```` option for ````Scene#pick```` only works if this is set ````true````.
     * @param {Boolean} [cfg.logarithmicDepthBufferEnabled=false] Whether to enable logarithmic depth buffer. When this is true,
     * you can set huge values for {@link Perspective#far} and {@link Ortho#far}, to push the far clipping plane back so
     * that it does not clip huge models.
     * @param {Boolean} [cfg.colorTextureEnabled=true] Whether to enable base color texture rendering.
     * @param {Boolean} [cfg.pbrEnabled=false] Whether to enable physically-based rendering.
     * @param {LocaleService} [cfg.localeService=null] Optional locale-based translation service.
     * @param {Boolean} [cfg.dtxEnabled=false] Whether to enable data texture-based (DTX) scene representation within the Viewer. When this is true, the Viewer will use data textures to
     * store geometry on the GPU for triangle meshes that don't have textures. This gives a much lower memory footprint for these types of model element. This mode may not perform well on low-end GPUs that are optimized
     * to use textures to hold geometry data. Works great on most medium/high-end GPUs found in desktop computers, including the nVIDIA and Intel HD chipsets. Set this false to use the default vertex buffer object (VBO)
     * mode for storing geometry, which is the standard technique used in most graphics engines, and will work adequately on most low-end GPUs.
     * @param {Number} [cfg.markerZOffset=-0.001] The Z value of offset for Marker's OcclusionTester. The closest the value is to 0.000 the more precise OcclusionTester will be, but at the same time the less precise it will behave for Markers that are located exactly on the Surface.
     * @param {number} [cfg.numCachedSectionPlanes=0] Enhances the efficiency of SectionPlane creation by proactively allocating Viewer resources for a specified quantity
     * of SectionPlanes. Introducing this parameter streamlines the initial creation speed of SectionPlanes, particularly up to the designated quantity. This parameter internally
     * configures renderer logic for the specified number of SectionPlanes, eliminating the need for setting up logic with each SectionPlane creation and thereby enhancing
     * responsiveness. It is important to consider that each SectionPlane impacts rendering performance, so it is recommended to set this value to a quantity that aligns with
     * your expected usage.
     */
    constructor(cfg) {

        /**
         * The Viewer's current language setting.
         * @property language
         * @deprecated
         * @type {String}
         */
        this.language = "en";

        /**
         * The viewer's locale service.
         *
         * This is configured via the Viewer's constructor.
         *
         * By default, this service will be an instance of {@link LocaleService}, which will just return
         * null translations for all given strings and phrases.
         *
         * @property localeService
         * @type {LocaleService}
         * @since 2.0
         */
        this.localeService = cfg.localeService || new LocaleService();

        /**
         * The Viewer's {@link Scene}.
         * @property scene
         * @type {Scene}
         */
        this.scene = new Scene(this, {
            canvasId: cfg.canvasId,
            canvasElement: cfg.canvasElement,
            keyboardEventsElement: cfg.keyboardEventsElement,
            contextAttr: {
                preserveDrawingBuffer: cfg.preserveDrawingBuffer !== false,
                premultipliedAlpha: (!!cfg.premultipliedAlpha),
                antialias: (cfg.antialias !== false)
            },
            spinnerElementId: cfg.spinnerElementId,
            transparent: (cfg.transparent !== false),
            gammaInput: true,
            gammaOutput: false,
            backgroundColor: cfg.backgroundColor,
            backgroundColorFromAmbientLight: cfg.backgroundColorFromAmbientLight,
            ticksPerRender: 1,
            ticksPerOcclusionTest: 20,
            units: cfg.units,
            scale: cfg.scale,
            origin: cfg.origin,
            saoEnabled: cfg.saoEnabled,
            alphaDepthMask: (cfg.alphaDepthMask !== false),
            entityOffsetsEnabled: (!!cfg.entityOffsetsEnabled),
            readableGeometryEnabled: (!!cfg.readableGeometryEnabled),
            logarithmicDepthBufferEnabled: (!!cfg.logarithmicDepthBufferEnabled),
            pbrEnabled: (!!cfg.pbrEnabled),
            colorTextureEnabled: (cfg.colorTextureEnabled !== false),
            dtxEnabled: (!!cfg.dtxEnabled),
            markerZOffset: cfg.markerZOffset,
            numCachedSectionPlanes: cfg.numCachedSectionPlanes
        });

        /**
         * Metadata about the {@link Scene} and the models and objects within it.
         * @property metaScene
         * @type {MetaScene}
         * @readonly
         */
        this.metaScene = new MetaScene(this, this.scene);

        /**
         * The Viewer's ID.
         * @property id
         *
         * @type {String|Number}
         */
        this.id = cfg.id || this.scene.id;

        /**
         * The Viewer's {@link Camera}. This is also found on {@link Scene#camera}.
         * @property camera
         * @type {Camera}
         */
        this.camera = this.scene.camera;

        /**
         * The Viewer's {@link CameraFlightAnimation}, which
         * is used to fly the {@link Scene}'s {@link Camera} to given targets.
         * @property cameraFlight
         * @type {CameraFlightAnimation}
         */
        this.cameraFlight = new CameraFlightAnimation(this.scene, {
            duration: 0.5
        });

        /**
         * The Viewer's {@link CameraControl}, which
         * controls the {@link Scene}'s {@link Camera} with mouse,  touch and keyboard input.
         * @property cameraControl
         * @type {CameraControl}
         */
        this.cameraControl = new CameraControl(this.scene, {
            // panToPointer: true,
            doublePickFlyTo: true
        });

        this._plugins = [];

        /**
         * Subscriptions to events sent with {@link fire}.
         * @private
         */
        this._eventSubs = {};
    }

    /**
     * Returns the capabilities of this Viewer.
     *
     * @returns {{astcSupported: boolean, etc1Supported: boolean, pvrtcSupported: boolean, etc2Supported: boolean, dxtSupported: boolean, bptcSupported: boolean}}
     */
    get capabilities() {
        return this.scene.capabilities;
    }

    /**
     * Subscribes to an event fired at this Viewer.
     *
     * @param {String} event The event
     * @param {Function} callback Callback fired on the event
     */
    on(event, callback) {
        let subs = this._eventSubs[event];
        if (!subs) {
            subs = [];
            this._eventSubs[event] = subs;
        }
        subs.push(callback);
    }

    /**
     * Fires an event at this Viewer.
     *
     * @param {String} event Event name
     * @param {Object} value Event parameters
     */
    fire(event, value) {
        const subs = this._eventSubs[event];
        if (subs) {
            for (let i = 0, len = subs.length; i < len; i++) {
                subs[i](value);
            }
        }
    }

    /**
     * Unsubscribes from an event fired at this Viewer.
     * @param event
     */
    off(event) { // TODO

    }

    /**
     * Logs a message to the JavaScript developer console, prefixed with the ID of this Viewer.
     *
     * @param {String} msg The message
     */
    log(msg) {
        console.log(`[xeokit viewer ${this.id}]: ${msg}`);
    }

    /**
     * Logs an error message to the JavaScript developer console, prefixed with the ID of this Viewer.
     *
     * @param {String} msg The error message
     */
    error(msg) {
        console.error(`[xeokit viewer ${this.id}]: ${msg}`);
    }

    /**
     * Installs a Plugin.
     *
     * @private
     */
    addPlugin(plugin) {
        this._plugins.push(plugin);
    }

    /**
     * Uninstalls a Plugin, clearing content from it first.
     *
     * @private
     */
    removePlugin(plugin) {
        for (let i = 0, len = this._plugins.length; i < len; i++) {
            const p = this._plugins[i];
            if (p === plugin) {
                if (p.clear) {
                    p.clear();
                }
                this._plugins.splice(i, 1);
                return;
            }
        }
    }

    /**
     * Sends a message to installed Plugins.
     *
     * The message can optionally be accompanied by a value.
     * @private
     */
    sendToPlugins(name, value) {
        for (let i = 0, len = this._plugins.length; i < len; i++) {
            const p = this._plugins[i];
            if (p.send) {
                p.send(name, value);
            }
        }
    }

    /**
     * @private
     * @deprecated
     */
    clear() {
        throw "Viewer#clear() no longer implemented - use '#sendToPlugins(\"clear\") instead";
    }

    /**
     * @private
     * @deprecated
     */
    resetView() {
        throw "Viewer#resetView() no longer implemented - use CameraMemento & ObjectsMemento classes instead";
    }

    /**
     * Enter snapshot mode.
     *
     * Switches rendering to a hidden snapshot canvas.
     *
     * Exit snapshot mode using {@link Viewer#endSnapshot}.
     */
    beginSnapshot() {
        if (! this._snapshotBegun) {
            this.scene._renderer.snapshot.beginSnapshot();
            this._snapshotBegun = true;
        }
    }

    _renderSnapshotToCanvas(params) {
        const resize = (params.width !== undefined && params.height !== undefined);
        const canvas = this.scene.canvas.canvas;
        const saveWidth  = canvas.clientWidth;
        const saveHeight = canvas.clientHeight;
        const excludeGizmos = !params.includeGizmos;

        if (resize) {
            canvas.width  = params.width  ? Math.floor(params.width)  : canvas.width;
            canvas.height = params.height ? Math.floor(params.height) : canvas.height;
        }

        this.beginSnapshot();

        if (excludeGizmos) {
            this.sendToPlugins("snapshotStarting"); // Tells plugins to hide things that shouldn't be in snapshot
        }

        const snapshotCanvas = this.scene._renderer.snapshot.renderSnapshotToCanvas();

        if (resize) {
            canvas.width = saveWidth;
            canvas.height = saveHeight;
            this.scene.glRedraw();
        }

        return {
            canvas:    snapshotCanvas,
            toDataURL: () => {
                if (excludeGizmos) {
                    this.sendToPlugins("snapshotFinished");
                }

                this.endSnapshot();

                let format = params.format || "png";
                if (format !== "jpeg" && format !== "png" && format !== "bmp") {
                    console.error("Unsupported image format: '" + format + "' - supported types are 'jpeg', 'bmp' and 'png' - defaulting to 'png'");
                    format = "png";
                }
                return snapshotCanvas.toDataURL(`image/${format}`);
            }
        };
    }

    /**
     * Gets a snapshot of this Viewer's {@link Scene} as a Base64-encoded image.
     *
     * #### Usage:
     *
     * ````javascript
     * const imageData = viewer.getSnapshot({
     *    width: 500,
     *    height: 500,
     *    format: "png"
     * });
     * ````
     * @param {*} [params] Capture options.
     * @param {Number} [params.width] Desired width of result in pixels - defaults to width of canvas.
     * @param {Number} [params.height] Desired height of result in pixels - defaults to height of canvas.
     * @param {String} [params.format="jpeg"] Desired format; "jpeg", "png" or "bmp".
     * @param {Boolean} [params.includeGizmos=false] When true, will include gizmos like {@link SectionPlane} in the snapshot.
     * @returns {String} String-encoded image data URI.
     */
    getSnapshot(params = {}) {
        // firing "rendering" is necessary to trigger DTX{Lines,Triangles}Layer::_uploadDeferredFlags
        this.scene.fire("rendering", { }, true);
        return this._renderSnapshotToCanvas(params).toDataURL();
    }

    /**
     * Gets a snapshot of this Viewer's {@link Scene} as a Base64-encoded image which includes
     * the HTML elements created by various plugins.
     *
     * The snapshot image is composed of an image of the viewer canvas, overlaid with an image
     * of the HTML container element belonging to each installed Viewer plugin. Each container
     * element is only rendered once, so it's OK for plugins to share the same container.
     *
     * #### Usage:
     *
     * ````javascript
     * viewer.getSnapshotWithPlugins({
     *    width: 500,
     *    height: 500,
     *    format: "png"
     * }).then((imageData)=>{
     *
     * });
     * ````
     * @param {*} [params] Capture options.
     * @param {Number} [params.width] Desired width of result in pixels - defaults to width of canvas.
     * @param {Number} [params.height] Desired height of result in pixels - defaults to height of canvas.
     * @param {String} [params.format="jpeg"] Desired format; "jpeg", "png" or "bmp".
     * @param {Boolean} [params.includeGizmos=false] When true, will include gizmos like {@link SectionPlane} in the snapshot.
     * @returns {Promise} Promise which returns a string-encoded image data URI.
     */
    async getSnapshotWithPlugins(params = {}) {

        // We use gl.readPixels to get the WebGL canvas snapshot in a new
        // HTMLCanvas element, scaled to the target snapshot size, then
        // use html2canvas to render each plugin's container element into
        // that HTMLCanvas. Finally, we save the HTMLCanvas to a bitmap.

        // We don't rely on html2canvas to up-scale our WebGL canvas
        // when we want a higher-resolution snapshot, which would cause
        // blurring. Instead, we manage the scale and redraw of the WebGL
        // canvas ourselves, in order to allow the Viewer to render the
        // right amount of pixels, for a sharper image.


        const snapshotResult = this._renderSnapshotToCanvas(params);

        const pluginToCapture = {};
        const pluginContainerElements = [];

        for (let i = 0, len = this._plugins.length; i < len; i++) { // Find plugin container elements
            const plugin = this._plugins[i];
            if (plugin.getContainerElement) {
                const containerElement = plugin.getContainerElement();
                if (containerElement !== document.body) {
                    if (!pluginToCapture[containerElement.id]) {
                        pluginToCapture[containerElement.id] = true;
                        pluginContainerElements.push(containerElement);
                    }
                }
            }
        }

        // Added to fix label's text offset in an html2canvas capture (See XEOK-151)
        // based on https://github.com/niklasvh/html2canvas/issues/2775#issuecomment-1316356991
        const style = document.createElement('style');
        document.head.appendChild(style);
        style.sheet?.insertRule('body > div:last-child img { display: inline-block; }');

        const snapshotCanvas = snapshotResult.canvas;
        for (let i = 0, len = pluginContainerElements.length; i < len; i++) {
            const containerElement = pluginContainerElements[i];
            await html2canvas(containerElement, {
                canvas: snapshotCanvas,
                backgroundColor: null,
                scale: snapshotCanvas.width / containerElement.clientWidth
            });
            // Reverts translation and scaling applied to the snapshotCanvas's context
            // by the html2canvas call (inside the ForeignObjectRenderer's constructor)
            // (implemented to compensate XCD-153 issue)
            snapshotCanvas.getContext("2d").resetTransform();
        }

        style.remove();

        return snapshotResult.toDataURL();
    }

    /**
     * Exits snapshot mode.
     *
     * Switches rendering back to the main canvas.
     *
     */
    endSnapshot() {
        if (this._snapshotBegun) {
            this.scene._renderer.snapshot.endSnapshot();
            this._snapshotBegun = false;
        }
    }

    /** Destroys this Viewer.
     */
    destroy() {
        const plugins = this._plugins.slice(); // Array will modify as we delete plugins
        for (let i = 0, len = plugins.length; i < len; i++) {
            const plugin = plugins[i];
            plugin.destroy();
        }
        this.scene.destroy();
    }
}

export {Viewer}
