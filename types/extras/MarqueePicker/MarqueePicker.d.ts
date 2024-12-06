import {Viewer, Component} from "../../viewer";
import {ObjectsKdTree3} from "../collision";

/**
 * Picks a {@link Viewer}'s {@link Entity}s with a canvas-space 2D marquee box.
 *
 * [<img src="https://xeokit.github.io/xeokit-sdk/assets/images/MarqueeSelect.gif">](https://xeokit.github.io/xeokit-sdk/examples/picking/#marqueePick_select)
 *
 * * [[Example 1: Select Objects with Marquee](https://xeokit.github.io/xeokit-sdk/examples/picking/#marqueePick_select)]
 * * [[Example 2: View-Fit Objects with Marquee](https://xeokit.github.io/xeokit-sdk/examples/picking/#marqueePick_viewFit)]
 *
 * # Usage
 *
 * In the example below, we
 *
 * 1. Create a {@link Viewer}, arrange the {@link Camera}
 * 2. Use an {@link XKTLoaderPlugin} to load a BIM model,
 * 3. Create a {@link ObjectsKdTree3} to automatically index the `Viewer's` {@link Entity}s for fast spatial lookup,
 * 4. Create a `MarqueePicker` to pick {@link Entity}s in the {@link Viewer}, using the {@link ObjectsKdTree3} to accelerate picking
 * 5. Create a {@link MarqueePickerMouseControl} to perform the marquee-picking with the `MarqueePicker`, using mouse input to draw the marquee box on the `Viewer's` canvas.
 *
 * When the {@link MarqueePickerMouseControl} is active:
 *
 * * Long-click, drag and release on the canvas to define a marque box that picks {@link Entity}s.
 * * Drag left-to-right to pick {@link Entity}s that intersect the box.
 * * Drag right-to-left to pick {@link Entity}s that are fully inside the box.
 * * On release, the `MarqueePicker` will fire a "picked" event with IDs of the picked {@link Entity}s, if any.
 * * Handling that event, we mark the {@link Entity}s as selected.
 * * Hold down CTRL to multi-pick.
 *
 * ````javascript
 * import {
 *         Viewer,
 *         XKTLoaderPlugin,
 *         ObjectsKdTree3,
 *         MarqueePicker,
 *         MarqueePickerMouseControl
 * } from "xeokit-sdk.es.js";
 *
 * // 1
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * viewer.scene.camera.eye = [14.9, 14.3, 5.4];
 * viewer.scene.camera.look = [6.5, 8.3, -4.1];
 * viewer.scene.camera.up = [-0.28, 0.9, -0.3];
 *
 * // 2
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const sceneModel = xktLoader.load({
 *     id: "myModel",
 *     src: "../../assets/models/xkt/v8/ifc/HolterTower.ifc.xkt"
 * });
 *
 * // 3
 *
 * const objectsKdTree3 = new ObjectsKdTree3({viewer});
 *
 * // 4
 *
 * const marqueePicker = new MarqueePicker({viewer, objectsKdTree3});
 *
 * // 5
 *
 * const marqueePickerMouseControl = new MarqueePickerMouseControl({marqueePicker});
 *
 * marqueePicker.on("clear", () => {
 *     viewer.scene.setObjectsSelected(viewer.scene.selectedObjectIds, false);
 * });
 *
 * marqueePicker.on("picked", (objectIds) => {
 *     viewer.scene.setObjectsSelected(objectIds, true);
 * });
 *
 * marqueePickerMouseControl.setActive(true);
 * ````
 *
 * # Design Notes
 *
 * * The {@link ObjectsKdTree3} can be shared with any other components that want to use it to spatially search for {@link Entity}s.
 * * The {@link MarqueePickerMouseControl} can be replaced with other types of controllers (i.e. touch), or used alongside them.
 * * The `MarqueePicker` has no input handlers of its own, and provides an API through which to programmatically control marquee picking. By firing the "picked" events, `MarqueePicker` implements the *Blackboard Pattern*.
 */
export class MarqueePicker extends Component {

    /**
     * Pick mode that picks {@link Entity}s that intersect the marquee box.
     *
     * @type {number}
     */
    static PICK_MODE_INTERSECTS: number;

    /**
     * Pick mode that picks {@link Entity}s that are completely inside the marquee box.
     *
     * @type {number}
     */
    static PICK_MODE_INSIDE: number;

    /**
     * Creates a MarqueePicker.
     *
     * @param {*} cfg Configuration
     * @param {Viewer} cfg.viewer The Viewer to pick Entities from.
     * @param {ObjectsKdTree3} cfg.objectsKdTree3 A k-d tree that indexes the Entities in the Viewer for fast spatial lookup.
     */
    constructor(cfg: {
        viewer: Viewer;
        objectsKdTree3: ObjectsKdTree3;
    });

    /**
     * Sets the canvas-space position of the first marquee box corner.
     *
     * @param corner1
     */
    setMarqueeCorner1(corner1:  number[]): void;

    /**
     * Sets the canvas-space position of the second marquee box corner.
     *
     * @param corner2
     */
    setMarqueeCorner2(corner2: number[]):void;

    /**
     * Sets both canvas-space corner positions of the marquee box.
     *
     * @param corner1
     * @param corner2
     */
    setMarquee(corner1: number[], corner2: number[]):void;

    /**
     * Sets if the marquee box is visible.
     *
     * @param {boolean} visible True if the marquee box is to be visible, else false.
     */
    setMarqueeVisible(visible:boolean):void;

    /**
     * Gets if the marquee box is visible.
     *
     * @returns {boolean} True if the marquee box is visible, else false.
     */
    getMarqueeVisible() :boolean;

    /**
     * Sets the pick mode.
     *
     * Supported pick modes are:
     *
     * * MarqueePicker.PICK_MODE_INSIDE - picks {@link Entity}s that are completely inside the marquee box.
     * * MarqueePicker.PICK_MODE_INTERSECTS - picks {@link Entity}s that intersect the marquee box.
     *
     * @param {number} pickMode The pick mode.
     */
    setPickMode(pickMode: number) :void;

    /**
     * Gets the pick mode.
     *
     * Supported pick modes are:
     *
     * * MarqueePicker.PICK_MODE_INSIDE - picks {@link Entity}s that are completely inside the marquee box.
     * * MarqueePicker.PICK_MODE_INTERSECTS - picks {@link Entity}s that intersect the marquee box.
     *
     * @returns {number} The pick mode.
     */
    getPickMode() :number;

    /**
     * Fires a "clear" event on this MarqueePicker.
     */
    clear() :void;

    /**
     * Attempts to pick {@link Entity}s, using the current MarquePicker settings.
     *
     * Fires a "picked" event with the IDs of the {@link Entity}s that were picked, if any.
     *
     * @returns {string[]} IDs of the {@link Entity}s that were picked, if any
     */
    pick():string[];


    /**
     * Destroys this MarqueePicker.
     *
     * Does not destroy the {@link Viewer} or the {@link ObjectsKdTree3} provided to the constructor of this MarqueePicker.
     */
    destroy():void;
}



