import {Component} from '../Component.js';
import {WEBGL_INFO} from "../webglInfo.js";

/**
 * @desc Configures Scalable Ambient Obscurance (SAO) for a {@link Scene}.
 *
 * This component is found on {@link Scene#sao}.
 *
 * This effect approximates Ambient Occlusion in realtime. It darkens creases, cavities and surfaces
 * that are close to each other, which tend to occlude ambient light and appear darker.
 *
 * For deeper technical information on SAO, see the paper [Scalable Ambient Obscurance](https://research.nvidia.com/sites/default/files/pubs/2012-06_Scalable-Ambient-Obscurance/McGuire12SAO.pdf).
 */
class SAO extends Component {

    /** @private */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._supported = WEBGL_INFO.SUPPORTED_EXTENSIONS["OES_standard_derivatives"]; // For computing normals in SAO fragment shader

        this.enabled = cfg.enabled;
        this.interactive = cfg.interactive;
        this.interactiveDelay = cfg.interactiveDelay;
        this.kernelRadius = cfg.kernelRadius;
        this.intensity = cfg.intensity;
        this.bias = cfg.bias;
        this.scale = cfg.scale;
        this.minResolution = cfg.minResolution;
        this.blur = cfg.blur;
        this.blurRadius = cfg.blurRadius;
        this.blurStdDev = cfg.blurStdDev;
        this.blurDepthCutoff = cfg.blurDepthCutoff;
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
     * When this is ````false````, SAO will only be applied when the Camera is at rest.
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
        //this.glRedraw();
    }

    /**
     * Gets whether SAO is applied interactively, ie. while the {@link Camera} is moving.
     *
     * When this is ````false````, SAO will only be applied when the Camera is at rest.
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

        /////////////////////////////////
        // TODO: implement time delay
        /////////////////////////////////

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
     * Sets the Guassian blur radius.
     *
     * Default value is ````12.0````.
     *
     * @type {Number}
     */
    set blurRadius(value) {
        if (value === undefined || value === null) {
            value = 12.0;
        }
        if (this._blurRadius === value) {
            return;
        }
        this._blurRadius = value;
        this.glRedraw();
    }

    /**
     * Gets the Guassian blur radius.
     *
     * Default value is ````12.0````.
     *
     * @type {Number}
     */
    get blurRadius() {
        return this._blurRadius;
    }

    /**
     * Sets the Guassian blur standard deviation.
     *
     * Default value is ````6.0````.
     *
     * @type {Number}
     */
    set blurStdDev(value) {
        if (value === undefined || value === null) {
            value = 6.0;
        }
        if (this._blurStdDev === value) {
            return;
        }
        this._blurStdDev = value;
        this.glRedraw();
    }

    /**
     * Gets the Guassian blur standard deviation.
     *
     * Default value is ````6.0````.
     *
     * @type {Number}
     */
    get blurStdDev() {
        return this._blurStdDev;
    }

    /**
     * Sets the Guassian blur depth cutoff.
     *
     * Default value is ````0.01````.
     *
     * @type {Number}
     */
    set blurDepthCutoff(value) {
        if (value === undefined || value === null) {
            value = 0.01;
        }
        if (this._blurDepthCutoff === value) {
            return;
        }
        this._blurDepthCutoff = value;
        this.glRedraw();
    }

    /**
     * Gets the Guassian blur depth cutoff.
     *
     * Default value is ````0.1````.
     *
     * @type {Number}
     */
    get blurDepthCutoff() {
        return this._blurDepthCutoff;
    }
}

export {SAO};
