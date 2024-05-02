import { Component } from "../Component";

/**
 * @desc Configures cross-section slices for a {@link Scene}.
 */
export declare class CrossSections extends Component {
    /**
     * Sets the thickness of a slice created by a section.
     *
     * Default value is ````0.0````.
     *
     * @type {Number}
     */
    set sliceThickness(arg: number);

    /**
     * Gets the thickness of a slice created by a section.
     *
     * Default value is ````0.0````.
     *
     * @type {Number}
     */
    get sliceThickness(): number;

    /**
     * Sets the color of a slice created by a section.
     *
     * Default value is ````[0.0, 0.0, 0.0, 1.0]````.
     *
     * @type {Number}
     */
    set sliceColor(arg: number[]);

    /**
     * Gets the color of a slice created by a section.
     *
     * Default value is ````[0.0, 0.0, 0.0, 1.0]````.
     *
     * @type {Number}
     */
    get sliceColor(): number[];
}
