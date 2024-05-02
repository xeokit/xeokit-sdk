import {Component} from '../Component.js';

/**
 * @desc Configures cross-section slices for a {@link Scene}.
 */
class CrossSections extends Component {

    /** @private */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this.sliceColor = cfg.sliceColor;
        this.sliceThickness  = cfg.sliceThickness;
    }

    /**
     * Sets the thickness of a slice created by a section.
     *
     * Default value is ````0.0````.
     *
     * @type {Number}
     */
    set sliceThickness(value) {
        if (value === undefined || value === null) {
            value = 0.0;
        }
        if (this._sliceThickness === value) {
            return;
        }
        this._sliceThickness = value;
        this.glRedraw();
    }

    /**
     * Gets the thickness of a slice created by a section.
     *
     * Default value is ````0.0````.
     *
     * @type {Number}
     */
    get sliceThickness() {
        return this._sliceThickness;
    }

    /**
     * Sets the color of a slice created by a section.
     *
     * Default value is ````[0.0, 0.0, 0.0, 1.0]````.
     *
     * @type {Number}
     */
    set sliceColor(value) {
        if (value === undefined || value === null) {
            value = [0.0, 0.0, 0.0, 1.0];
        }
        if (this._sliceColor === value) {
            return;
        }
        this._sliceColor = value;
        this.glRedraw();
    }

    /**
     * Gets the color of a slice created by a section.
     *
     * Default value is ````[0.0, 0.0, 0.0, 1.0]````.
     *
     * @type {Number}
     */
    get sliceColor() {
        return this._sliceColor;
    }

    /**
     * Destroys this component.
     */
    destroy() {
        super.destroy();
    }
}

export {CrossSections};