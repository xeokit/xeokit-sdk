import {Canvas2Image} from "../libs/canvas2image.js";
import {core} from "../core.js";
import {utils} from '../utils.js';
import {math} from '../math/math.js';
import {stats} from '../stats.js';
import {Component} from '../Component.js';
import {Spinner} from './Spinner.js';
import {WEBGL_INFO} from '../webglInfo.js';

const WEBGL_CONTEXT_NAMES = [
    "webgl",
    "experimental-webgl",
    "webkit-3d",
    "moz-webgl",
    "moz-glweb20"
];

/**
 * @desc Manages its {@link Scene}'s HTML canvas.
 *
 * * Provides the HTML canvas element in {@link Canvas#canvas}.
 * * Has a {@link Spinner}, provided at {@link Canvas#spinner}, which manages the loading progress indicator.
 */
class Canvas extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "Canvas";
    }

    /**
     * @constructor
     * @private
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        /**
         * The HTML canvas.
         *
         * @property canvas
         * @type {HTMLCanvasElement}
         * @final
         */
        this.canvas = cfg.canvas;

        /**
         * The WebGL rendering context.
         *
         * @property gl
         * @type {WebGLRenderingContext}
         * @final
         */
        this.gl = null;

        /**
         * True when WebGL 2 support is enabled.
         *
         * @property webgl2
         * @type {Boolean}
         * @final
         */
        this.webgl2 = false; // Will set true in _initWebGL if WebGL is requested and we succeed in getting it.

        /**
         * Indicates whether this Canvas is transparent.
         *
         * @property transparent
         * @type {Boolean}
         * @default {false}
         * @final
         */
        this.transparent = !!cfg.transparent;

        /**
         * Attributes for the WebGL context
         *
         * @type {{}|*}
         */
        this.contextAttr = cfg.contextAttr || {};
        this.contextAttr.alpha = this.transparent;

        if (this.contextAttr.preserveDrawingBuffer === undefined || this.contextAttr.preserveDrawingBuffer === null) {
            this.contextAttr.preserveDrawingBuffer = true;
        }

        this.contextAttr.stencil = false;
        this.contextAttr.antialias = true;
        this.contextAttr.premultipliedAlpha = this.contextAttr.premultipliedAlpha !== false;
        this.contextAttr.antialias = this.contextAttr.antialias !== false;

        // If the canvas uses css styles to specify the sizes make sure the basic
        // width and height attributes match or the WebGL context will use 300 x 150

        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        /**
         * Boundary of the Canvas in absolute browser window coordinates.
         *
         * ### Usage:
         *
         * ````javascript
         * var boundary = myScene.canvas.boundary;
         *
         * var xmin = boundary[0];
         * var ymin = boundary[1];
         * var width = boundary[2];
         * var height = boundary[3];
         * ````
         *
         * @property boundary
         * @type {{Array of Number}}
         * @final
         */
        this.boundary = [
            this.canvas.offsetLeft, this.canvas.offsetTop,
            this.canvas.clientWidth, this.canvas.clientHeight
        ];

        this._createBackground();

        // Get WebGL context

        if (cfg.simulateWebGLContextLost) {
            if (window.WebGLDebugUtils) {
                this.canvas = WebGLDebugUtils.makeLostContextSimulatingCanvas(this.canvas);
            } else {
                this.error("To simulate context loss, please include WebGLDebugUtils");
            }
        }

        this._initWebGL(cfg);

        // Bind context loss and recovery handlers

        const self = this;

        this.canvas.addEventListener("webglcontextlost", this._webglcontextlostListener = function (event) {
                console.time("webglcontextrestored");
                self.scene._webglContextLost();
                /**
                 * Fired whenever the WebGL context has been lost
                 * @event webglcontextlost
                 */
                self.fire("webglcontextlost");
                event.preventDefault();
            },
            false);

        this.canvas.addEventListener("webglcontextrestored", this._webglcontextrestoredListener = function (event) {
                self._initWebGL();
                if (self.gl) {
                    self.scene._webglContextRestored(self.gl);
                    /**
                     * Fired whenever the WebGL context has been restored again after having previously being lost
                     * @event webglContextRestored
                     * @param value The WebGL context object
                     */
                    self.fire("webglcontextrestored", self.gl);
                    event.preventDefault();
                }
                console.timeEnd("webglcontextrestored");
            },
            false);

        // Publish canvas size and position changes on each scene tick

        let lastWindowWidth = null;
        let lastWindowHeight = null;

        let lastCanvasWidth = null;
        let lastCanvasHeight = null;

        let lastCanvasOffsetLeft = null;
        let lastCanvasOffsetTop = null;

        let lastParent = null;

        this._tick = this.scene.on("tick", function () {

            const canvas = self.canvas;

            const newWindowSize = (window.innerWidth !== lastWindowWidth || window.innerHeight !== lastWindowHeight);
            const newCanvasSize = (canvas.clientWidth !== lastCanvasWidth || canvas.clientHeight !== lastCanvasHeight);
            const newCanvasPos = (canvas.offsetLeft !== lastCanvasOffsetLeft || canvas.offsetTop !== lastCanvasOffsetTop);

            const parent = canvas.parentElement;
            const newParent = (parent !== lastParent);

            if (newWindowSize || newCanvasSize || newCanvasPos || newParent) {

                self._spinner._adjustPosition();

                if (newCanvasSize || newCanvasPos) {

                    const newWidth = canvas.clientWidth;
                    const newHeight = canvas.clientHeight;

                    // TODO: Wasteful to re-count pixel size of each canvas on each canvas' resize
                    if (newCanvasSize) {
                        let countPixels = 0;
                        let scene;
                        for (const sceneId in core.scenes) {
                            if (core.scenes.hasOwnProperty(sceneId)) {
                                scene = core.scenes[sceneId];
                                countPixels += scene.canvas.canvas.clientWidth * scene.canvas.canvas.clientHeight;
                            }
                        }
                        stats.memory.pixels = countPixels;

                        canvas.width = canvas.clientWidth;
                        canvas.height = canvas.clientHeight;
                    }

                    const boundary = self.boundary;

                    boundary[0] = canvas.offsetLeft;
                    boundary[1] = canvas.offsetTop;
                    boundary[2] = newWidth;
                    boundary[3] = newHeight;

                    /**
                     * Fired whenever this Canvas's {@link Canvas/boundary} property changes.
                     *
                     * @event boundary
                     * @param value The property's new value
                     */
                    self.fire("boundary", boundary);

                    lastCanvasWidth = newWidth;
                    lastCanvasHeight = newHeight;
                }

                if (newWindowSize) {
                    lastWindowWidth = window.innerWidth;
                    lastWindowHeight = window.innerHeight;
                }

                if (newCanvasPos) {
                    lastCanvasOffsetLeft = canvas.offsetLeft;
                    lastCanvasOffsetTop = canvas.offsetTop;
                }

                lastParent = parent;
            }
        });

        this.canvas.oncontextmenu = function (e) {
            e.preventDefault();
        };

        this._spinner = new Spinner(this.scene, {
            canvas: this.canvas
        });

        // Set property, see definition further down
        this.backgroundColor = cfg.backgroundColor;
        this.backgroundImage = cfg.backgroundImage;
    }

    /**
     * Creates a default canvas in the DOM.
     * @private
     */
    _createCanvas() {

        const canvasId = "xeokit-canvas-" + math.createUUID();
        const body = document.getElementsByTagName("body")[0];
        const div = document.createElement('div');

        const style = div.style;
        style.height = "100%";
        style.width = "100%";
        style.padding = "0";
        style.margin = "0";
        style.background = "rgba(0,0,0,0);";
        style.float = "left";
        style.left = "0";
        style.top = "0";
        style.position = "absolute";
        style.opacity = "1.0";
        style["z-index"] = "-10000";

        div.innerHTML += '<canvas id="' + canvasId + '" style="width: 100%; height: 100%; float: left; margin: 0; padding: 0;"></canvas>';

        body.appendChild(div);

        this.canvas = document.getElementById(canvasId);
    }

    /**
     * Creates a image element behind the canvas, for purpose of showing a custom background.
     * @private
     */
    _createBackground() {

        const div = document.createElement('div');
        const style = div.style;
        style.padding = "0";
        style.margin = "0";
        style.background = null;
        style.backgroundImage = null;
        style.float = "left";
        style.left = "0";
        style.top = "0";
        style.width = "100%";
        style.height = "100%";
        style.position = "absolute";
        style.opacity = 1;
        style["z-index"] = "-20000";

        this.canvas.parentElement.appendChild(div);

        this._backgroundElement = div;
    }

    _getElementXY(e) {
        let x = 0, y = 0;
        while (e) {
            x += (e.offsetLeft - e.scrollLeft);
            y += (e.offsetTop - e.scrollTop);
            e = e.offsetParent;
        }
        return {x: x, y: y};
    }

    /**
     * Initialises the WebGL context
     * @private
     */
    _initWebGL(cfg) {

        // Default context attribute values

        if (false && cfg.webgl2) {
            try {
                this.gl = this.canvas.getContext("webgl2", this.contextAttr);
            } catch (e) { // Try with next context name
            }
            if (!this.gl) {
                this.warn('Failed to get a WebGL 2 context - defaulting to WebGL 1.');
            } else {
                this.webgl2 = true;
            }
        }

        if (!this.gl) {
            for (let i = 0; !this.gl && i < WEBGL_CONTEXT_NAMES.length; i++) {
                try {
                    this.gl = this.canvas.getContext(WEBGL_CONTEXT_NAMES[i], this.contextAttr);
                } catch (e) { // Try with next context name
                }
            }
        }

        if (!this.gl) {

            this.error('Failed to get a WebGL context');

            /**
             * Fired whenever the canvas failed to get a WebGL context, which probably means that WebGL
             * is either unsupported or has been disabled.
             * @event webglContextFailed
             */
            this.fire("webglContextFailed", true, true);
        }

        if (this.gl) {
            // Setup extension (if necessary) and hints for fragment shader derivative functions
            if (this.webgl2) {
                this.gl.hint(this.gl.FRAGMENT_SHADER_DERIVATIVE_HINT, this.gl.FASTEST);
            } else if (WEBGL_INFO.SUPPORTED_EXTENSIONS["OES_standard_derivatives"]) {
                const ext = this.gl.getExtension("OES_standard_derivatives");
                this.gl.hint(ext.FRAGMENT_SHADER_DERIVATIVE_HINT_OES, this.gl.FASTEST);
            }
        }
    }

    /**
     Returns a snapshot of this Canvas as a Base64-encoded image.

     When a callback is given, this method will capture the snapshot asynchronously, on the next animation frame,
     and return it via the callback.

     When no callback is given, this method captures and returns the snapshot immediately. Note that is only
     possible when you have configured the Canvas's {@link Scene} to preserve the
     WebGL drawing buffer, which has a performance overhead.

     #### Usage:

     ````javascript
     // Get snapshot asynchronously
     myScene.canvas.getSnapshot({
             width: 500, // Defaults to size of canvas
             height: 500,
             format: "png" // Options are "jpeg" (default), "png" and "bmp"
         }, function(imageDataURL) {
             imageElement.src = imageDataURL;
         });

     // Get snapshot synchronously, requires that Scene be
     // configured with preserveDrawingBuffer; true
     imageElement.src = myScene.canvas.getSnapshot({
             width: 500,
             height: 500,
             format: "png"
         });
     ````
     @method getSnapshot
     @param {*} [params] Capture options.
     @param {Number} [params.width] Desired width of result in pixels - defaults to width of canvas.
     @param {Number} [params.height] Desired height of result in pixels - defaults to height of canvas.
     @param {String} [params.format="jpeg"] Desired format; "jpeg", "png" or "bmp".
     @param {Function} [ok] Callback to return the image data when taking a snapshot asynchronously.
     @returns {String} String-encoded image data when taking the snapshot synchronously. Returns null when the ````ok```` callback is given.
     */
    getSnapshot(params, ok) {

        if (!this.canvas) {
            this.error("Can't get snapshot - no canvas.");
            ok(null);
            return;
        }

        if (ok) { // Asynchronous
            const self = this;
            requestAnimationFrame(function () {
                self.scene.render(true); // Force-render a frame
                ok(self._getSnapshot(params));
            });
        } else {
            return this._getSnapshot(params);
        }
    }

    _getSnapshot(params) {
        params = params || {};
        const width = params.width || this.canvas.width;
        const height = params.height || this.canvas.height;
        const format = params.format || "jpeg";
        let image;
        switch (format) {
            case "jpeg":
                image = Canvas2Image.saveAsJPEG(this.canvas, false, width, height);
                break;
            case "png":
                image = Canvas2Image.saveAsPNG(this.canvas, true, width, height);
                break;
            case "bmp":
                image = Canvas2Image.saveAsBMP(this.canvas, true, width, height);
                break;
            default:
                this.error("Unsupported snapshot format: '" + format
                    + "' - supported types are 'jpeg', 'bmp' and 'png' - defaulting to 'jpeg'");
                image = Canvas2Image.saveAsJPEG(this.canvas, true, width, height);
        }
        return image.src;
    }

    /**
     Reads colors of pixels from the last rendered frame.

     <p>Call this method like this:</p>

     ````JavaScript

     // Ignore transparent pixels (default is false)
     var opaqueOnly = true;

     var colors = new Float32Array(8);

     myCanvas.readPixels([ 100, 22, 12, 33 ], colors, 2, opaqueOnly);
     ````

     Then the r,g,b components of the colors will be set to the colors at those pixels.

     @param {Float32Array} pixels
     @param {Float32Array} colors
     @param {Number} size
     @param {Boolean} opaqueOnly
     */
    readPixels(pixels, colors, size, opaqueOnly) {
        return this.scene._renderer.readPixels(pixels, colors, size, opaqueOnly);
    }

    /**
     * Simulates lost WebGL context.
     */
    loseWebGLContext() {
        if (this.canvas.loseContext) {
            this.canvas.loseContext();
        }
    }

    /**
     A background color for the canvas. This is overridden by {@link Canvas/backgroundImage}.

     You can set this to a new color at any time.

     @property backgroundColor
     @type Float32Array
     @default null
     */
    set backgroundColor(value) {
        if (!value) {
            this._backgroundColor = null;
        } else {
            (this._backgroundColor = this._backgroundColor || math.vec4()).set(value || [0, 0, 0, 1]);
            if (!this._backgroundImageSrc) {
                const rgb = "rgb(" + Math.round(this._backgroundColor[0] * 255) + ", " + Math.round(this._backgroundColor[1] * 255) + "," + Math.round(this._backgroundColor[2] * 255) + ")";
                this._backgroundElement.style.background = rgb;
            }
        }
    }

    get backgroundColor() {
        return this._backgroundColor;
    }

    /**
     URL of a background image for the canvas. This is overrided by {@link Canvas/backgroundColor/property}.

     You can set this to a new file path at any time.

     @property backgroundImage
     @type String
     */
    set backgroundImage(value) {
        if (!value) {
            return;
        }
        if (!utils.isString(value)) {
            this.error("Value for 'backgroundImage' should be a string");
            return;
        }
        if (value === this._backgroundImageSrc) { // Already loaded this image
            return;
        }
        this._backgroundElement.style.backgroundImage = "url('" + value + "')";
        this._backgroundImageSrc = value;
        if (!this._backgroundImageSrc) {
            const rgb = "rgb(" + Math.round(this._backgroundColor[0] * 255) + ", " + Math.round(this._backgroundColor[1] * 255) + "," + Math.round(this._backgroundColor[2] * 255) + ")";
            this._backgroundElement.style.background = rgb;
        }
    }

    get backgroundImage() {
        return this._backgroundImageSrc;
    }

    /**
     The busy {@link Spinner} for this Canvas.

     @property spinner
     @type Spinner
     @final
     */
    get spinner() {
        return this._spinner;
    }

    destroy() {
        this.scene.off(this._tick);
        // Memory leak avoidance
        this.canvas.removeEventListener("webglcontextlost", this._webglcontextlostListener);
        this.canvas.removeEventListener("webglcontextrestored", this._webglcontextrestoredListener);
        this.canvas = null;
        this.gl = null;
        super.destroy();
    }
}

export {Canvas};