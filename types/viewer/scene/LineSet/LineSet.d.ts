import {Component} from '../Component';


/**
 * A set of 3D line segments.
 *
 * * Creates a set of 3D line segments.
 * * Registered by {@link LineSet#id} in {@link Scene#lineSets}.
 * * Configure color using the {@link LinesMaterial} located at {@link Scene#linesMaterial}.
 * * {@link BCFViewpointsPlugin} will save and load Linesets in BCF viewpoints.
 *
 * ## Usage
 *
 * In the example below, we'll load the Schependomlaan model, then use
 * a ````LineSet```` to show a grid underneath the model.
 *
 * [<img src="http://xeokit.github.io/xeokit-sdk/assets/images/LineSet_grid.png">](/examples/#LineSet_grid)
 *
 * [[Run this example](/examples/#LineSet_grid)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, LineSet, buildGridGeometry} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk/dist/xeokit-sdk.es.min.js";
 *
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 *  });
 *
 * const camera = viewer.camera;
 *
 * viewer.camera.eye = [-2.56, 8.38, 8.27];
 * viewer.camera.look = [13.44, 3.31, -14.83];
 * viewer.camera.up = [0.10, 0.98, -0.14];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *      id: "myModel",
 *      src: "../assets/models/xkt/v8/ifc/Schependomlaan.ifc.xkt",
 *      position: [0,1,0],
 *      edges: true,
 *      saoEnabled: true
 *  });
 *
 * const geometryArrays = buildGridGeometry({
 *      size: 100,
 *      divisions: 30
 *  });
 *
 * new LineSet(viewer.scene, {
 *      positions: geometryArrays.positions,
 *      indices: geometryArrays.indices
 * });
 * ````
 */
export declare class LineSet extends Component {

    /**
     * Creates a new LineSet.
     *
     * Registers the LineSet in {@link Scene#lineSets}; causes Scene to fire a "lineSetCreated" event.
     *
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this ````LineSet```` as well.
     * @param {*} [cfg]  ````LineSet```` configuration
     * @param {string} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     * @param {number[]} cfg.positions World-space 3D vertex positions.
     * @param {number[]} [cfg.indices] Indices to connect ````positions```` into line segments. Note that these are separate line segments, not a polyline.
     * @param {number[]} [cfg.color=[1,1,1]] The color of this ````LineSet````. This is both emissive and diffuse.
     * @param {boolean} [cfg.visible=true] Indicates whether or not this ````LineSet```` is visible.
     * @param {number} [cfg.opacity=1.0] ````LineSet````'s initial opacity factor.
     */
    constructor(owner: Component, cfg?: any);

    /**
     * Sets if this ````LineSet```` is visible.
     *
     * Default value is ````true````.
     *
     * @param {boolean} visible Set ````true```` to make this ````LineSet```` visible.
     */
    set visible(visible: boolean);

    /**
     * Gets if this ````LineSet```` is visible.
     *
     * Default value is ````true````.
     *
     * @returns {boolean} Returns ````true```` if visible.
     */
    get visible(): boolean;

    /**
     * Gets the 3D World-space vertex positions of the lines in this ````LineSet````.
     *
     * @returns {number[]}
     */
    get positions(): number[];

    /**
     * Gets the vertex indices of the lines in this ````LineSet````.
     *
     * @returns {number[]}
     */
    get indices(): number[];

    /**
     * Destroys this ````LineSet````.
     *
     * Removes the ```LineSet```` from {@link Scene#lineSets}; causes Scene to fire a "lineSetDestroyed" event.
     */
    destroy(): void;
}

