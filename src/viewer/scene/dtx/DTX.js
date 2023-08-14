import {Component} from '../Component.js';
import {WEBGL_INFO} from "../webglInfo.js";

/**
 * @desc Configures data-texture-based scene representation and rendering mode (DTX) for a {@link Scene}.
 */
class DTX extends Component {

    /** @private */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this.enabled = cfg.enabled;
        this.vertexWeldingEnabled = cfg.vertexWeldingEnabled;
        this.indexBucketingEnabled = cfg.indexBucketingEnabled;
            }

    /**
     * Gets wether or not DTX is supported by this browser and GPU.
     *
     * Even when enabled, DTX will only work if supported.
     *
     * @type {Boolean}
     */
    get supported() {
        return this._supported;
    }

    /**
     * Sets whether DTX is enabled for the {@link Scene}.
     *
     * Even when enabled, DTX will only work if supported.
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
     * Gets whether data texture-based scene representation is enabled for the {@link Scene}.
     *
     * Even when enabled, DTX will only apply if supported.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    get enabled() {
        return this._enabled;
    }

    /**
     * Returns true if DTX is currently possible, where it is supported, enabled, and the current scene state is compatible.
     * Called internally by renderer logic.
     * @private
     * @returns {Boolean}
     */
    get possible() {
        if (!this._supported) {
            return false;
        }
        if (!this._enabled) {
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
     * Sets whether automatic index bucketing is enabled for data texture scene representation.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    set indexBucketingEnabled(value) {
        value = (value !== false);
        if (this._indexBucketingEnabled === value) {
            return;
        }
        this._indexBucketingEnabled = value;
    }

    /**
     * Gets whether automatic index bucketing is enabled for data texture scene representation.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    get indexBucketingEnabled() {
        return this._indexBucketingEnabled;
    }

    /**
     * Sets whether automatic vertex welding is enabled for data texture scene representation.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    set vertexWeldingEnabled(value) {
        value = (value !== false);
        if (this._vertexWeldingEnabled === value) {
            return;
        }
        this._vertexWeldingEnabled = value;
    }

    /**
     * Gets whether automatic vertex welding is enabled for data texture scene representation.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    get vertexWeldingEnabled() {
        return this._vertexWeldingEnabled;
    }
    
    /**
     * Destroys this component.
     */
    destroy() {
        super.destroy();
    }
}

export {DTX};
