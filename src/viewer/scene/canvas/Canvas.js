
import { Component } from '../Component.js';
import { math } from '../math/math.js';
import { Spinner } from './Spinner.js';

const WEBGL_CONTEXT_NAMES = [
    "webgl2",
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
     * @constructor
     * @private
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._backgroundColor = math.vec3([
            cfg.backgroundColor ? cfg.backgroundColor[0] : 1,
            cfg.backgroundColor ? cfg.backgroundColor[1] : 1,
            cfg.backgroundColor ? cfg.backgroundColor[2] : 1]);
        this._backgroundColorFromAmbientLight = !!cfg.backgroundColorFromAmbientLight;

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
         * Indicates if this Canvas is transparent.
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

        this.contextAttr.preserveDrawingBuffer = !!this.contextAttr.preserveDrawingBuffer;
        this.contextAttr.stencil = false;
        this.contextAttr.premultipliedAlpha = (!!this.contextAttr.premultipliedAlpha);  // False by default: https://github.com/xeokit/xeokit-sdk/issues/251
        this.contextAttr.antialias = (this.contextAttr.antialias !== false);

        // If the canvas uses css styles to specify the sizes make sure the basic
        // width and height attributes match or the WebGL context will use 300 x 150

        this.resolutionScale = cfg.resolutionScale;

        this.canvas.width = Math.round(this.canvas.clientWidth * this._resolutionScale);
        this.canvas.height = Math.round(this.canvas.clientHeight * this._resolutionScale);

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
         * @type {Number[]}
         * @final
         */
        this.boundary = [
            this.canvas.offsetLeft, this.canvas.offsetTop,
            this.canvas.clientWidth, this.canvas.clientHeight
        ];

        // Get WebGL context

        this._initWebGL(cfg);

        const self = this;

        // Attach to resize events on the canvas
        let dirtyBoundary = true; // make sure we publish the 1st boundary event

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentBoxSize) {
                    dirtyBoundary = true;
                }
            }
        });

        resizeObserver.observe(this.canvas);

        // Publish canvas size and position changes on each scene tick
        this._tick = this.scene.on("tick", () => {
            // Only publish if the canvas bounds changed
            if (!dirtyBoundary) {
                return;
            }

            dirtyBoundary = false;

            // Set the real size of the canvas (the drawable w*h)
            self.canvas.width = Math.round(self.canvas.clientWidth * self._resolutionScale);
            self.canvas.height = Math.round(self.canvas.clientHeight * self._resolutionScale);

            // Publish the boundary change
            self.boundary[0] = self.canvas.offsetLeft;
            self.boundary[1] = self.canvas.offsetTop;
            self.boundary[2] = self.canvas.clientWidth;
            self.boundary[3] = self.canvas.clientHeight;

            self.fire("boundary", self.boundary);
        });

        this._spinner = new Spinner(this.scene, {
            canvas: this.canvas,
            elementId: cfg.spinnerElementId
        });
    }

    /**
     @private
     */
    get type() {
        return "Canvas";
    }

    /**
     * Gets whether the canvas clear color will be derived from {@link AmbientLight} or {@link Canvas#backgroundColor}
     * when {@link Canvas#transparent} is ```true```.
     *
     * When {@link Canvas#transparent} is ```true``` and this is ````true````, then the canvas clear color will
     * be taken from the {@link Scene}'s ambient light color.
     *
     * When {@link Canvas#transparent} is ```true``` and this is ````false````, then the canvas clear color will
     * be taken from {@link Canvas#backgroundColor}.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    get backgroundColorFromAmbientLight() {
        return this._backgroundColorFromAmbientLight;
    }

    /**
     * Sets if the canvas background color is derived from an {@link AmbientLight}.
     *
     * This only has effect when the canvas is not transparent. When not enabled, the background color
     * will be the canvas element's HTML/CSS background color.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    set backgroundColorFromAmbientLight(backgroundColorFromAmbientLight) {
        this._backgroundColorFromAmbientLight = (backgroundColorFromAmbientLight !== false);
        this.glRedraw();
    }

    /**
     * Gets the canvas clear color.
     *
     * Default value is ````[1, 1, 1]````.
     *
     * @type {Number[]}
     */
    get backgroundColor() {
        return this._backgroundColor;
    }

    /**
     * Sets the canvas clear color.
     *
     * Default value is ````[1, 1, 1]````.
     *
     * @type {Number[]}
     */
    set backgroundColor(value) {
        if (value) {
            this._backgroundColor[0] = value[0];
            this._backgroundColor[1] = value[1];
            this._backgroundColor[2] = value[2];
        } else {
            this._backgroundColor[0] = 1.0;
            this._backgroundColor[1] = 1.0;
            this._backgroundColor[2] = 1.0;
        }
        this.glRedraw();
    }

    /**
     * Gets the scale of the canvas back buffer relative to the CSS-defined size of the canvas.
     *
     * This is a common way to trade off rendering quality for speed. If the canvas size is defined in CSS, then
     * setting this to a value between ````[0..1]```` (eg ````0.5````) will render into a smaller back buffer, giving
     * a performance boost.
     *
     * @returns {*|number} The resolution scale.
     */
    get resolutionScale() {
        return this._resolutionScale;
    }

    /**
     * Sets the scale of the canvas back buffer relative to the CSS-defined size of the canvas.
     *
     * This is a common way to trade off rendering quality for speed. If the canvas size is defined in CSS, then
     * setting this to a value between ````[0..1]```` (eg ````0.5````) will render into a smaller back buffer, giving
     * a performance boost.
     *
     * @param {*|number} resolutionScale The resolution scale.
     */
    set resolutionScale(resolutionScale) {
        resolutionScale = resolutionScale || 1.0;
        if (resolutionScale === this._resolutionScale) {
            return;
        }
        this._resolutionScale = resolutionScale;
        const canvas = this.canvas;
        canvas.width = Math.round(canvas.clientWidth * this._resolutionScale);
        canvas.height = Math.round(canvas.clientHeight * this._resolutionScale);
        this.glRedraw();
    }

    /**
     * The busy {@link Spinner} for this Canvas.
     *
     * @property spinner
     * @type Spinner
     * @final
     */
    get spinner() {
        return this._spinner;
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
    _initWebGL() {

        // Default context attribute values

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

        // data-textures: avoid to re-bind same texture
        {
            const gl = this.gl;

            let lastTextureUnit = "__";

            let originalActiveTexture = gl.activeTexture;

            gl.activeTexture = function (arg1) {
                if (lastTextureUnit === arg1) {
                    return;
                }

                lastTextureUnit = arg1;

                originalActiveTexture.call (this, arg1);
            };

            let lastBindTexture = {};

            let originalBindTexture = gl.bindTexture;

            let avoidedRebinds = 0;

            gl.bindTexture = function (arg1, arg2) {
                if (lastBindTexture[lastTextureUnit] === arg2)
                {
                    avoidedRebinds++;
                    return;
                }

                lastBindTexture[lastTextureUnit] = arg2;

                originalBindTexture.call (this, arg1, arg2);
            }

            // setInterval (
            //     () => {
            //         console.log (`${avoidedRebinds} avoided texture binds/sec`);
            //         avoidedRebinds = 0;
            //     },
            //     1000
            // );
        }

        if (this.gl) {
            // Setup extension (if necessary) and hints for fragment shader derivative functions
            if (this.webgl2) {
                this.gl.hint(this.gl.FRAGMENT_SHADER_DERIVATIVE_HINT, this.gl.FASTEST);

                // data-textures: not using standard-derivatives
                if (!(this.gl instanceof WebGL2RenderingContext)) {
                }
            }
        }
    }

    /**
     * @private
     * @deprecated
     */
    getSnapshot(params) {
        throw "Canvas#getSnapshot() has been replaced by Viewer#getSnapshot() - use that method instead.";
    }

    /**
     * Reads colors of pixels from the last rendered frame.
     *
     * Call this method like this:
     *
     * ````JavaScript
     *
     * var colors = new Float32Array(8);
     *
     * viewer.scene.canvas.readPixels([ 100, 22, 12, 33 ], colors, 2);
     * ````
     *
     * Then the r,g,b components of the colors will be set to the colors at those pixels.
     *
     * @param {Number[]} pixels
     * @param {Number[]} colors
     * @param {Number} size
     */
    readPixels(pixels, colors, size) {
        return this.scene._renderer.snapshot.readPixels(pixels, colors, size);
    }

    /**
     * Simulates lost WebGL context.
     */
    loseWebGLContext() {
        if (this.canvas.loseContext) {
            this.canvas.loseContext();
        }
    }

    destroy() {
        this.scene.off(this._tick);
        this._spinner._destroy();
        this.gl = null;
        super.destroy();
    }
}

export { Canvas };
