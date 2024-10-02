import {Viewer} from "../../viewer";

/**
 * A PointerLens shows a magnified view of a {@link Viewer}'s canvas, centered at the position of the
 * mouse or touch pointer.
 *
 * @example
 * import { Viewer, XKTLoaderPlugin, AngleMeasurementsPlugin, AngleMeasurementsMouseControl, PointerLens } from "../../dist/xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     dtxEnabled: true
 * });
 *
 * viewer.camera.eye = [-3.93, 2.85, 27.01];
 * viewer.camera.look = [4.40, 3.72, 8.89];
 * viewer.camera.up = [-0.01, 0.99, 0.039];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const sceneModel = xktLoader.load({
 *     id: "myModel",
 *     src: "../../assets/models/xkt/v10/glTF-Embedded/Duplex_A_20110505.glTFEmbedded.xkt",
 *     edges: true
 * });
 *
 * const angleMeasurements = new AngleMeasurementsPlugin(viewer);
 *
 * const angleMeasurementsMouseControl  = new AngleMeasurementsMouseControl(angleMeasurements, {
 *     pointerLens : new PointerLens(viewer, {
 *         zoomFactor: 2
 *     })
 * });
 *
 * angleMeasurementsMouseControl.activate();
 */
export class PointerLens {

    /**
     * Constructs a new PointerLens.
     *
     * @param {Viewer} viewer The Viewer instance.
     * @param {Object} [cfg] PointerLens configuration.
     * @param {boolean} [cfg.active=true] Whether PointerLens is active. The PointerLens can only be shown when this is `true` (default).
     * @param {number} [cfg.zoomFactor=2] The zoom factor for the lens.
     */
    constructor(viewer: Viewer, cfg?: {
        active?: boolean;
        zoomFactor?: number;
        containerId?: string;
        lensPosToggle?: boolean,
        lensPosToggleAmount?: number,
        lensPosMarginLeft?: number,
        lensPosMarginTop?: number;
    });

    /**
     * Sets the zoom factor for the lens.
     *
     * This is `2` by default.
     *
     * @param {number} zoomFactor The zoom factor for the lens.
     */
    set zoomFactor(zoomFactor: number);

    /**
     * Gets the zoom factor for the lens.
     *
     * This is `2` by default.
     *
     * @returns {number} The zoom factor for the lens.
     */
    get zoomFactor(): number;

    /**
     * Sets the canvas central position of the lens.
     *
     * @param {number[]} centerPos The canvas central position of the lens.
     */
    set centerPos(centerPos: number[]);

    /**
     * Gets the canvas central position of the lens.
     *
     * @returns {number[]} The canvas central position of the lens.
     */
    get centerPos(): number[];

    /**
     * Sets the canvas coordinates of the pointer.
     *
     * @param {number[]} cursorPos The canvas coordinates of the pointer.
     */
    set cursorPos(cursorPos: number[]);

    /**
     * Gets the canvas coordinates of the pointer.
     *
     * @returns {number[]} The canvas coordinates of the pointer.
     */
    get cursorPos(): number[];

    /**
     * Sets whether the cursor has snapped to anything.
     *
     * @param {boolean} snapped Whether the cursor has snapped to anything.
     */
    set snapped(snapped: boolean);

    /**
     * Gets whether the cursor has snapped to anything.
     *
     * @returns {boolean} Whether the cursor has snapped to anything.
     */
    get snapped(): boolean;

    /**
     * Sets if this PointerLens is active.
     *
     * @param {boolean} active Whether this PointerLens is active.
     */
    set active(active: boolean);

    /**
     * Gets if this PointerLens is active.
     *
     * @returns {boolean} Whether this PointerLens is active.
     */
    get active(): boolean;

    /**
     * Sets if this PointerLens is visible.
     *
     * @param {boolean} visible Whether this PointerLens is visible.
     */
    set visible(visible: boolean);

    /**
     * Gets if this PointerLens is visible.
     *
     * @returns {boolean} Whether this PointerLens is visible.
     */
    get visible(): boolean;

    /**
     * Sets whether the pointer lens container should toggle position when mouse is over it.
     *
     * @param {boolean} lensPosToggle Whether we should toggle position.
     */
    set lensPosToggle(lensPosToggle: boolean);

    /**
     * Gets whether we should toggle position.
     *
     * @returns {boolean} Whether we should toggle position.
     */
    get lensPosToggle(): boolean;

    /**
     * Sets whether we toggle position in vertical or horizontal.
     *
     * @param {boolean} lensPosToggleVertical Vertical or horizontal change.
     */
    set lensPosToggleVertical(lensPosToggleVertical: boolean);

    /**
     * Gets whether we toggle position in vertical or horizontal.
     *
     * @returns {boolean} Vertical or horizontal change.
     */
    get lensPosToggleVertical(): boolean;

    /**
     * Sets amount of pixels we toggle position.
     *
     * @param {number} lensPosToggleAmount Amount of pixels we toggle position.
     */
    set lensPosToggleAmount(lensPosToggleAmount: number);

    /**
     * Gets amount of pixels we toggle position.
     *
     * @returns {number} Amount of pixels we toggle position.
     */
    get lensPosToggleAmount(): number;

    /**
     * Destroys this PointerLens.
     */
    destroy(): void;
}
