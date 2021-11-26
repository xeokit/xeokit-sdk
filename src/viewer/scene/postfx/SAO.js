import {Component} from '../Component.js';
import {WEBGL_INFO} from "../webglInfo.js";

/**
 * @desc Configures Scalable Ambient Obscurance (SAO) for a {@link Scene}.
 *
 *  <a href="https://xeokit.github.io/xeokit-sdk/examples/#postEffects_SAO_OTCConferenceCenter"><img src="http://xeokit.io/img/docs/SAO/saoEnabledDisabled.gif"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#postEeffects_SAO_OTCConferenceCenter)]
 *
 * ## Overview
 *
 * SAO approximates [Ambient Occlusion](https://en.wikipedia.org/wiki/Ambient_occlusion) in realtime. It darkens creases, cavities and surfaces
 * that are close to each other, which tend to be occluded from ambient light and appear darker.
 *
 * The animated GIF above shows the effect as we repeatedly enable and disable SAO. When SAO is enabled, we can see darkening
 * in regions such as the corners, and the crevices between stairs. This increases the amount of detail we can see when ambient
 * light is high, or when objects have uniform colors across their surfaces. Run the example to experiment with the various
 * SAO configurations.
 *
 * xeokit's implementation of SAO is based on the paper [Scalable Ambient Obscurance](https://research.nvidia.com/sites/default/files/pubs/2012-06_Scalable-Ambient-Obscurance/McGuire12SAO.pdf).
 *
 * ## Caveats
 *
 * Currently, SAO only works with perspective and orthographic projections. Therefore, to use SAO, make sure {@link Camera#projection} is
 * either "perspective" or "ortho".
 *
 * {@link SAO#scale} and {@link SAO#intensity} must be tuned to the distance
 * between {@link Perspective#near} and {@link Perspective#far}, or the distance
 * between {@link Ortho#near} and {@link Ortho#far}, depending on which of those two projections the {@link Camera} is currently
 * using. Use the [live example](https://xeokit.github.io/xeokit-sdk/examples/#postEeffects_SAO_OTCConferenceCenter) to get a
 * feel for that.
 *
 * ## Usage
 *
 * In the example below, we'll start by logging a warning message to the console if SAO is not supported by the
 * system.
 *
 *Then we'll enable and configure SAO, position the camera, and configure the near and far perspective and orthographic
 * clipping planes. Finally, we'll use {@link XKTLoaderPlugin} to load the OTC Conference Center model.
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * const sao = viewer.scene.sao;
 *
 * if (!sao.supported) {
 *     sao.warn("SAO is not supported on this system - ignoring SAO configs")
 * }
 *
 * sao.enabled = true; // Enable SAO - only works if supported (see above)
 * sao.intensity = 0.15;
 * sao.bias = 0.5;
 * sao.scale = 1.0;
 * sao.minResolution = 0.0;
 * sao.numSamples = 10;
 * sao.kernelRadius = 100;
 * sao.blendCutoff = 0.1;
 *
 * const camera = viewer.scene.camera;
 *
 * camera.eye = [3.69, 5.83, -23.98];
 * camera.look = [84.31, -29.88, -116.21];
 * camera.up = [0.18, 0.96, -0.21];
 *
 * camera.perspective.near = 0.1;
 * camera.perspective.far = 2000.0;
 *
 * camera.ortho.near = 0.1;
 * camera.ortho.far = 2000.0;
 * camera.projection = "perspective";
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *     id: "myModel",
 *     src: "./models/xkt/OTCConferenceCenter.xkt"
 *     edges: true
 * });
 * ````
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#postEeffects_SAO_OTCConferenceCenter)]
 *
 * ## Efficiency
 *
 * SAO can incur some rendering overhead, especially on objects that are viewed close to the camera. For this reason,
 * it's recommended to use a low value for {@link SAO#kernelRadius}.  A low radius will sample pixels that are close
 * to the source pixel, which will allow the GPU to efficiently cache those pixels. When {@link Camera#projection} is "perspective",
 * objects near to the viewpoint will use larger radii than farther pixels. Therefore, computing  SAO for close objects
 * is more expensive than for objects far away, that occupy fewer pixels on the canvas.
 *
 * ## Selectively enabling SAO for models
 *
 * When loading multiple models into a Scene, we sometimes only want SAO on the models that are actually going to
 * show it, such as the architecture or structure, and not show SAO on models that won't show it well, such as the
 * electrical wiring, or plumbing.
 *
 * To illustrate, lets load some of the models for the West Riverside Hospital. We'll enable SAO on the structure model,
 * but disable it on the electrical and plumbing.
 *
 * This will only apply SAO to those models if {@link SAO#supported} and {@link SAO#enabled} are both true.
 *
 * Note, by the way, how we load the models in sequence. Since XKTLoaderPlugin uses scratch memory as part of its loading
 * process, this allows the plugin to reuse that same memory across multiple loads, instead of having to create multiple
 * pools of scratch memory.
 *
 * ````javascript
 * const structure = xktLoader.load({
 *      id: "structure",
 *      src: "./models/xkt/WestRiverSideHospital/structure.xkt"
 *      edges: true,
 *      saoEnabled: true
 *  });
 *
 *  structure.on("loaded", () => {
 *
 *      const electrical = xktLoader.load({
 *          id: "electrical",
 *          src: "./models/xkt/WestRiverSideHospital/electrical.xkt",
 *          edges: true
 *      });
 *
 *      electrical.on("loaded", () => {
 *
 *          const plumbing = xktLoader.load({
 *              id: "plumbing",
 *              src: "./models/xkt/WestRiverSideHospital/plumbing.xkt",
 *              edges: true
 *          });
 *      });
 * });
 * ````
 *
 * ## Disabling SAO while camera is moving
 *
 * For smoother interaction with large models on low-power hardware, we can disable SAO while the {@link Camera} is moving:
 *
 * ````javascript
 * const timeoutDuration = 150; // Milliseconds
 * var timer = timeoutDuration;
 * var saoDisabled = false;
 *
 * const onCameraMatrix = scene.camera.on("matrix", () => {
 *     timer = timeoutDuration;
 *     if (!saoDisabled) {
 *         scene.sao.enabled = false;
 *         saoDisabled = true;
 *     }
 * });
 *
 * const onSceneTick = scene.on("tick", (tickEvent) => {
 *     if (!saoDisabled) {
 *         return;
 *     }
 *     timer -= tickEvent.deltaTime; // Milliseconds
 *     if (timer <= 0) {
 *         if (saoDisabled) {
 *             scene.sao.enabled = true;
 *             saoDisabled = false;
 *         }
 *     }
 * });
 * ````
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#techniques_nonInteractiveQuality)]
 */
class SAO extends Component {

    /** @private */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        const ua = navigator.userAgent.match(/(opera|chrome|safari|firefox|msie|mobile)\/?\s*(\.?\d+(\.\d+)*)/i);
        const isSafari = (ua && ua[1].toLowerCase() === "safari");

        this._supported = (!isSafari) &&
            WEBGL_INFO.SUPPORTED_EXTENSIONS["OES_standard_derivatives"]; // For computing normals in SAO fragment shader

        this.enabled = cfg.enabled;
        this.kernelRadius = cfg.kernelRadius;
        this.intensity = cfg.intensity;
        this.bias = cfg.bias;
        this.scale = cfg.scale;
        this.minResolution = cfg.minResolution;
        this.numSamples = cfg.numSamples;
        this.blur = cfg.blur;
        this.blendCutoff = cfg.blendCutoff;
        this.blendFactor = cfg.blendFactor;
    }

    /**
     * Gets whether or not SAO is supported by this browser and GPU.
     *
     * Even when enabled, SAO will only work if supported.
     *
     * @type {Boolean}
     */
    get supported() {
        return this._supported;
    }

    /**
     * Sets whether SAO is enabled for the {@link Scene}.
     *
     * Even when enabled, SAO will only work if supported.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    set enabled(value) {
        value = !!value;
        if (this._enabled === value) {
            return;
        }
        this._enabled = value;
        this.glRedraw();
    }

    /**
     * Gets whether SAO is enabled for the {@link Scene}.
     *
     * Even when enabled, SAO will only apply if supported.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    get enabled() {
        return this._enabled;
    }

    /**
     * Returns true if SAO is currently possible, where it is supported, enabled, and the current scene state is compatible.
     * Called internally by renderer logic.
     * @private
     * @returns {boolean}
     */
    get possible() {
        if (!this._supported) {
            return false;
        }
        if (!this._enabled) {
            return false;
        }
        const projection = this.scene.camera.projection;
        if (projection === "customProjection") {
            return false;
        }
        if (projection === "frustum") {
            return false;
        }
        return true;
    }

    /**
     * @private
     * @returns {boolean|*}
     */
    get active() {
        return this._active;
    }

    /**
     * Sets the maximum area that SAO takes into account when checking for possible occlusion for each fragment.
     *
     * Default value is ````100.0````.
     *
     * @type {Number}
     */
    set kernelRadius(value) {
        if (value === undefined || value === null) {
            value = 100.0;
        }
        if (this._kernelRadius === value) {
            return;
        }
        this._kernelRadius = value;
        this.glRedraw();
    }

    /**
     * Gets the maximum area that SAO takes into account when checking for possible occlusion for each fragment.
     *
     * Default value is ````100.0````.
     *
     * @type {Number}
     */
    get kernelRadius() {
        return this._kernelRadius;
    }

    /**
     * Sets the degree of darkening (ambient obscurance) produced by the SAO effect.
     *
     * Default value is ````0.15````.
     *
     * @type {Number}
     */
    set intensity(value) {
        if (value === undefined || value === null) {
            value = 0.15;
        }
        if (this._intensity === value) {
            return;
        }
        this._intensity = value;
        this.glRedraw();
    }

    /**
     * Gets the degree of darkening (ambient obscurance) produced by the SAO effect.
     *
     * Default value is ````0.15````.
     *
     * @type {Number}
     */
    get intensity() {
        return this._intensity;
    }

    /**
     * Sets the SAO bias.
     *
     * Default value is ````0.5````.
     *
     * @type {Number}
     */
    set bias(value) {
        if (value === undefined || value === null) {
            value = 0.5;
        }
        if (this._bias === value) {
            return;
        }
        this._bias = value;
        this.glRedraw();
    }

    /**
     * Gets the SAO bias.
     *
     * Default value is ````0.5````.
     *
     * @type {Number}
     */
    get bias() {
        return this._bias;
    }

    /**
     * Sets the SAO occlusion scale.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set scale(value) {
        if (value === undefined || value === null) {
            value = 1.0;
        }
        if (this._scale === value) {
            return;
        }
        this._scale = value;
        this.glRedraw();
    }

    /**
     * Gets the SAO occlusion scale.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    get scale() {
        return this._scale;
    }

    /**
     * Sets the SAO minimum resolution.
     *
     * Default value is ````0.0````.
     *
     * @type {Number}
     */
    set minResolution(value) {
        if (value === undefined || value === null) {
            value = 0.0;
        }
        if (this._minResolution === value) {
            return;
        }
        this._minResolution = value;
        this.glRedraw();
    }

    /**
     * Gets the SAO minimum resolution.
     *
     * Default value is ````0.0````.
     *
     * @type {Number}
     */
    get minResolution() {
        return this._minResolution;
    }

    /**
     * Sets the number of SAO samples.
     *
     * Default value is ````10````.
     *
     * Update this sparingly, since it causes a shader recompile.
     *
     * @type {Number}
     */
    set numSamples(value) {
        if (value === undefined || value === null) {
            value = 10;
        }
        if (this._numSamples === value) {
            return;
        }
        this._numSamples = value;
        this.glRedraw();
    }

    /**
     * Gets the number of SAO samples.
     *
     * Default value is ````10````.
     *
     * @type {Number}
     */
    get numSamples() {
        return this._numSamples;
    }

    /**
     * Sets whether Guassian blur is enabled.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    set blur(value) {
        value = (value !== false);
        if (this._blur === value) {
            return;
        }
        this._blur = value;
        this.glRedraw();
    }

    /**
     * Gets whether Guassian blur is enabled.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    get blur() {
        return this._blur;
    }

    /**
     * Sets the SAO blend cutoff.
     *
     * Default value is ````0.3````.
     *
     * Normally you don't need to alter this.
     *
     * @type {Number}
     */
    set blendCutoff(value) {
        if (value === undefined || value === null) {
            value = 0.3;
        }
        if (this._blendCutoff === value) {
            return;
        }
        this._blendCutoff = value;
        this.glRedraw();
    }

    /**
     * Gets the SAO blend cutoff.
     *
     * Default value is ````0.3````.
     *
     * Normally you don't need to alter this.
     *
     * @type {Number}
     */
    get blendCutoff() {
        return this._blendCutoff;
    }

    /**
     * Sets the SAO blend factor.
     *
     * Default value is ````1.0````.
     *
     * Normally you don't need to alter this.
     *
     * @type {Number}
     */
    set blendFactor(value) {
        if (value === undefined || value === null) {
            value = 1.0;
        }
        if (this._blendFactor === value) {
            return;
        }
        this._blendFactor = value;
        this.glRedraw();
    }

    /**
     * Gets the SAO blend scale.
     *
     * Default value is ````1.0````.
     *
     * Normally you don't need to alter this.
     *
     * @type {Number}
     */
    get blendFactor() {
        return this._blendFactor;
    }

    /**
     * Destroys this component.
     */
    destroy() {
        super.destroy();
    }
}

export {SAO};
