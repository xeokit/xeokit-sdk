import {Component} from '../Component.js';
import {SceneModel} from "../model/SceneModel.js";

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
 * [<img src="http://xeokit.github.io/xeokit-sdk/assets/images/LineSet_grid.png">](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#LineSet_grid)
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#LineSet_grid)]
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
class LineSet extends Component {

    /**
     * Creates a new LineSet.
     *
     * Registers the LineSet in {@link Scene#lineSets}; causes Scene to fire a "lineSetCreated" event.
     *
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this ````LineSet```` as well.
     * @param {*} [cfg]  ````LineSet```` configuration
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     * @param {Number[]} cfg.positions World-space 3D vertex positions.
     * @param {Number[]} [cfg.indices] Indices to connect ````positions```` into line segments. Note that these are separate line segments, not a polyline.
     * @param {Number[]} [cfg.color=[1,1,1]] The color of this ````LineSet````. This is both emissive and diffuse.
     * @param {Boolean} [cfg.visible=true] Indicates whether or not this ````LineSet```` is visible.
     * @param {Number} [cfg.opacity=1.0] ````LineSet````'s initial opacity factor.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._positions = cfg.positions || [];

        if (cfg.indices) {
            this._indices = cfg.indices;
        } else {
            this._indices = [];
            for (let i = 0, len = (this._positions.length / 3) - 1; i < len; i += 2) {
                this._indices.push(i);
                this._indices.push(i + 1);
            }
        }

        this._color = cfg.color || [1, 1, 1];
        this._opacity = cfg.opacity || 1.0;

        this._sceneModel = new SceneModel(this, {
            isModel: false // Don't register in Scene.models
        });

        this._sceneModel.createMesh({
            id: "linesMesh",
            primitive: "lines",
            positions: this._positions,
            indices: this._indices,
            color: this._color,
            opacity: this._opacity,
        })

        this._sceneModel.createEntity({
            meshIds: ["linesMesh"],
            visible: cfg.visible,
            clippable: cfg.clippable,
               collidable: cfg.collidable
        });

        this._sceneModel.finalize();

        this.scene._lineSetCreated(this);
    }

    /**
     * Sets if this ````LineSet```` is visible.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} visible Set ````true```` to make this ````LineSet```` visible.
     */
    set visible(visible) {
        this._sceneModel.visible = visible;
    }

    /**
     * Gets if this ````LineSet```` is visible.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if visible.
     */
    get visible() {
        return this._sceneModel.visible;
    }

    /**
     * Gets the 3D World-space vertex positions of the lines in this ````LineSet````.
     *
     * @returns {Number[]}
     */
    get positions() {
        return this._positions;
    }

    /**
     * Gets the vertex indices of the lines in this ````LineSet````.
     *
     * @returns {Number[]}
     */
    get indices() {
        return this._indices;
    }

    /**
     * Destroys this ````LineSet````.
     *
     * Removes the ```LineSet```` from {@link Scene#lineSets}; causes Scene to fire a "lineSetDestroyed" event.
     */
    destroy() {
        super.destroy(); // destroyes _sceneModel
        this.scene._lineSetDestroyed(this);
    }
}

export {LineSet};
