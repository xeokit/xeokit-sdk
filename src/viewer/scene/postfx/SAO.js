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
 * ## Usage
 *
 * In the example below, we'll start by logging a warning message to the console if SAO is not supported by the
 * system. Then we'll configure SAO, position the camera, and configure the near and far perspective and orthographic
 * clipping planes. Finally, we'll use {@link XKTLoaderPlugin} to load the OTC Conference Center model.
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
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
 * sao.intensity = 0.25;
 * sao.bias = 0.5;
 * sao.scale = 1000.0;
 * sao.minResolution = 0.0;
 * sao.kernelRadius = 100;
 * sao.blendCutoff = 0.2;
 *
 * const camera = viewer.scene.camera;
 *
 * camera.eye = [3.69, 5.83, -23.98];
 * camera.look = [84.31, -29.88, -116.21];
 * camera.up = [0.18, 0.96, -0.21];
 *
 * camera.perspective.near = 0.1;
 * camera.perspective.far = 5000.0;
 *
 * camera.ortho.near = 0.1;
 * camera.ortho.far = 5000.0;
 * camera.projection = "perspective";
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *     id: "myModel",
 *     src: "./models/xkt/OTCConferenceCenter/OTCConferenceCenter.xkt",
 *     metaModelSrc: "./metaModels/OTCConferenceCenter/metaModel.json",
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
 */
class SAO extends Component {

    /** @private */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._supported = WEBGL_INFO.SUPPORTED_EXTENSIONS["OES_standard_derivatives"]; // For computing normals in SAO fragment shader
        this._interactiveActive = true;
        this._interactiveCountDown = 0;

        this.enabled = cfg.enabled;
        this.interactive = cfg.interactive;
        this.interactiveDelay = cfg.interactiveDelay;
        this.kernelRadius = cfg.kernelRadius;
        this.intensity = cfg.intensity;
        this.bias = cfg.bias;
        this.scale = cfg.scale;
        this.minResolution = cfg.minResolution;
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
        this.scene._needRecompile = true;
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
     * Sets whether SAO is applied interactively, ie. while the {@link Camera} is moving.
     *
     * When this is ````false````, SAO will only be applied after the Camera has rested for longer than the duration specified by {@link  SAO#interactiveDelay}.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    set interactive(value) {
        value = !!value;
        if (this._interactive === value) {
            return;
        }
        this._interactive = value;
    }

    /**
     * Gets whether SAO is applied interactively, ie. while the {@link Camera} is moving.
     *
     * When this is ````false````, SAO will only be applied after the Camera has rested for longer than the duration specified by {@link  SAO#interactiveDelay}.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    get interactive() {
        return this._interactive;
    }

    /**
     * Sets the interaction time delay after the {@link Camera} stops moving before SAO is applied.
     *
     * Only applies when {@link SAO#interactive} is ````true````.
     *
     * Default value is ````2.0````.
     *
     * @type {Number}
     */
    set interactiveDelay(value) {
        if (value === undefined || value === null) {
            value = 2.0;
        }
        if (this._interactiveDelay === value) {
            return;
        }
        this._interactiveDelay = value;
        this._interactiveCountDown = this._interactiveDelay;

        //this.glRedraw();
    }

    /**
     * Gets the interaction time delay after the {@link Camera} stops moving before SAO is applied.
     *
     * Only applies when {@link SAO#interactive} is ````true````.
     *
     * Default value is ````2.0````.
     *
     * @type {Number}
     */
    get interactiveDelay() {
        return this._interactiveDelay;
    }

    /**
     * @private
     * @returns {boolean|*}
     */
    get active() {
        return this._active;
    }

    /**
     * Sets the maximum area that SAO takes into account when checking for possible occlusion.
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
     * Gets the maximum area that SAO takes into account when checking for possible occlusion.
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
     * Default value is ````0.25````.
     *
     * @type {Number}
     */
    set intensity(value) {
        if (value === undefined || value === null) {
            value = 0.25;
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
     * Default value is ````0.25````.
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
     * Default value is ````1000.0````.
     *
     * @type {Number}
     */
    set scale(value) {
        if (value === undefined || value === null) {
            value = 1000.0;
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
     * Default value is ````1000.0````.
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
     * Default value is ````0.2````.
     *
     * Normally you don't need to alter this.
     *
     * @type {Number}
     * @private
     */
    set blendCutoff(value) {
        if (value === undefined || value === null) {
            value = 0.2;
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
     * Default value is ````0.2````.
     *
     * Normally you don't need to alter this.
     *
     * @type {Number}
     * @private
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
     * @private
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
     * @private
     */
    get blendFactor() {
        return this._blendFactor;
    }

    /**
     * Destroys this component.
     */
    destroy() {
        this.interactive = false; // Unbinds Scene and Camera events
        super.destroy();
    }
}

export {SAO};
