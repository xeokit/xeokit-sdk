import {ObjectsMemento} from "../../viewer/scene/mementos/ObjectsMemento.js";

import {Plugin} from "../../viewer/Plugin.js";
import {PlanView} from "./PlanView.js";
import {IFCPlanViewObjectStates} from "./IFCPlanViewObjectStates.js";

const objectsMemento = new ObjectsMemento();

/**
 * @desc A {@link Viewer} plugin that provides plan view images of storeys within IFC building models.
 *
 * A plan view image consists of a downward-looking orthographic snapshot image of {@link Entity}s within a storey
 * belonging to a building model.
 *
 * Each building storey is represented by a {@link MetaObject} of type "IfcBuildingStorey" within the
 * Viewer's {@link MetaScene}.
 *
 * The {@link Entity}s within a storey correspond to {@link MetaObject}s within the structural subtree of
 * the "IfcBuildingStorey" {@link MetaObject}.
 *
 * PlanViewPlugin automatically creates its {@link PlanView}s as {@link MetaModel}s
 * are created within its {@link Viewer}'s {@link MetaScene}.
 *
 * PlanViewPlugin configures the visual state of each {@link Entity} within each plan view according to
 * the type of its corresponding {@link MetaObject}, using the map of properties in {@link IFCPlanViewObjectStates}
 * by default. You can customize the appearance of the Entities by providing your own {@link PlanViewsPlugin#objectStates}.
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#gizmos_PlanViewsPlugin)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {GLTFLoaderPlugin} from "../src/viewer/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
 * import {PlanViewsPlugin} from "../src/viewer/plugins/PlanViewsPlugin/PlanViewsPlugin.js";
 *
 * // Create a Viewer, arrange the camera
 *
 * const viewer = new Viewer({
 *        canvasId: "myCanvas",
 *        transparent: true
 *    });
 *
 * viewer.camera.eye = [-2.56, 8.38, 8.27];
 * viewer.camera.look = [13.44, 3.31, -14.83];
 * viewer.camera.up = [0.10, 0.98, -0.14];
 *
 * // Load a model and fit it to view
 *
 * const gltfLoader = new GLTFLoaderPlugin(viewer);
 *
 * const model = gltfLoader.load({
 *      id: "myModel",
 *      src: "./models/gltf/schependomlaan/scene.gltf",
 *      metaModelSrc: "./metaModels/schependomlaan/metaModel.json",
 *      edges: true
 * });
 *
 * // Add a PlanViewsPlugin
 * // This will automatically create PlanViews when the model has loaded
 *
 * const planViews = new PlanViewsPlugin(viewer, {
 *      size: [220, 220],
 *      format: "png",  // Default
 *      ortho: true     // Default
 *  });
 *
 *
 * // When model loaded, get all PlanViews from StoryViewsPlugin
 *
 * model.on("loaded", function () {
 *
 *      const planViewIds = Object.keys(planViews.planViews);
 *
 *      for (var i = 0, len = planViewIds.length; i < len; i++) {
 *
 *          const planViewId     = planViewIds[i];
 *
 *          const planView       = planViews.planViews[planViewId];
 *
 *          const aabb           = planView.aabb; // Boundary of storey elements
 *          const modelId        = planView.modelId; // "myModel"
 *          const storeyObjectId = planView.storeyObjectId; // ID of IfcBuildingStorey
 *          const snapshotData   = planView.snapshotData;
 *
 *          //...
 *      }
 * });
 * ````
 */
class PlanViewsPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="GLTFLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} [cfg.objectStates] Map of visual states for the {@link Entity}s as rendered within each {@link PlanView}.  Default value is {@link IFCPlanViewObjectStates}.
     * @param {Boolean} [cfg.ortho=true] Whether to capture an orthographic or perspective view for each {@link PlanView}.
     * @param {Number[]} [cfg.size=[200,200]] Size of {@link PlanView} images.
     * @param {String} [cfg.format="png"] Format of {@link PlanView} images. Allowed values are "png" and "jpeg".
     */
    constructor(viewer, cfg = {}) {

        super("planViews", viewer);

        /**
         * A {@link PlanView} for each {@link MetaObject} whose {@link MetaObject#type} equals "IfcBuildingStorey", mapped to {@link Entity#id}.
         * @type {{String:PlanView}}
         */
        this.planViews = {};

        /**
         * A map {@link PlanView}s for each  {@link MetaModel}.
         * @type {{String:PlanView}}
         */
        this.modelPlanViews = {};

        // TODO: view fit or margin configuration for snapshot

        this.objectStates = cfg.objectStates;
        this.ortho = !!cfg.ortho;
        this.size = cfg.size || [200, 200];
        this.format = cfg.format || "png";
        this.bgColor = cfg.bgColor || "white";

        this._onCanvasBoundary = this.viewer.scene.canvas.on("boundary", (boundary) => {
            const aspect = boundary[2] / boundary[3];
            var width = 470; // TODO
            var height = width / aspect;
            this.size = [width, height];
        });

        this._onModelLoaded = this.viewer.scene.on("modelLoaded", (modelId) => {
            this._buildModelPlanViews(modelId);
        });

        const self = this;

        this._onTick = this.viewer.scene.on("tick", function () {
            if (self._dirty) {
                self._rebuildPlanViews();
                self._dirty = false;
            }
        });
    }

    /**
     * Sets map of visual states for the {@link Entity}s as rendered within each {@link PlanView}.
     *
     * Default value is {@link IFCPlanViewObjectStates}.
     *
     * @type {{String: Object}}
     */
    set objectStates(value) {
        this._objectStates = value || IFCPlanViewObjectStates;
        this._dirty = true;
    }

    /**
     * Gets map of visual states for the {@link Entity}s as rendered within each {@link PlanView}.
     *
     * Default value is {@link IFCPlanViewObjectStates}.
     *
     * @type {{String: Object}}
     */
    get objectStates() {
        return this._objectStates;
    }

    /**
     * Sets whether or not to capture an orthographic or perspective view for each {@link PlanView}.
     *
     * @param ortho
     */
    set ortho(ortho) {
        this._ortho = ortho !== false;
        this._dirty = true;
    }

    /**
     * Gets whether or not to capture an orthographic or perspective view for each {@link PlanView}.
     *
     * @returns {boolean}
     */
    get ortho() {
        return this._ortho;
    }

    /**
     * Sets the size of {@link PlanView} images.
     *
     * Rebuilds {@link PlanView}s when updated.
     *
     * @param size
     */
    set size(size) {
        this._size = size;
        this._dirty = true;
    }

    /**
     * Gets the size of {@link PlanView} images.
     *
     * @returns {*|number[]}
     */
    get size() {
        return this._size;
    }

    /**
     * Sets the format of {@link PlanView} images. Allowed values are "png" and "jpeg".
     *
     * Rebuilds {@link PlanView}s when updated.
     *
     * @param format
     */
    set format(format) {
        this._format = format || "png";
        this._dirty = true;
    }

    /**
     *
     * Gets the format of {@link PlanView} images. Allowed values are "png" and "jpeg".
     *
     * @returns {*|number[]}
     */
    get format() {
        return this._format;
    }

    /**
     * Sets the background color of {@link PlanView} images.
     *
     * Rebuilds {@link PlanView}s when updated.
     *
     * @param bgColor
     */
    set bgColor(bgColor) {
        this._bgColor = bgColor;
        this._dirty = true;
    }

    /**
     * Gets the background color of {@link PlanView} images.
     *
     * @returns {*|number[]}
     */
    get bgColor() {
        return this._bgColor;
    }

    _rebuildPlanViews() {
        const models = this.viewer.scene.models;
        for (var modelId in models) {
            if (models.hasOwnProperty(modelId)) {
                this._buildModelPlanViews(modelId);
            }
        }
    }

    _buildModelPlanViews(modelId) {

        var t0 = performance.now();

        this._destroyModelPlanViews(modelId);

        const self = this;
        const viewer = this.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;
        const metaScene = viewer.metaScene;
        const metaModel = metaScene.metaModels[modelId];
        const model = scene.models[modelId];

        if (!metaModel || !metaModel.rootMetaObject) {
            return;
        }

        // How we build PlanViews:
        //
        // 1. Save state of scene
        // 2. Save Canvas size
        // 3. Set camera to ortho projection, looking down, fitted to scene boundary
        // 4. Set canvas size to snapshot size (to avoid scaling blur)
        // 5. With each IfcBuildingStorey object :-
        //      5.1 Hide all scene objects
        //      5.2 With each sub-object :-
        //          5.2.1 Set state from objectStates
        //      5.3 Grab snapshot of canvas
        //      5.4 Create PlanView from snapshot
        // 6. Restore scene state
        // 7. Restore canvas size

        // 1. Save state of scene objects

        objectsMemento.saveObjects(scene);

        // 2. Save canvas size

        const saveCanvasBoundary = scene.canvas.boundary.slice();

        // 3. Set camera to ortho projection, looking down, fitted to scene boundary

        camera.projection = this._ortho ? "ortho" : "perspective";
        camera.eye = camera.worldUp.slice();
        camera.look = [-camera.worldUp[0], -camera.worldUp[1], -camera.worldUp[2]];
        camera.up = camera.worldForward.slice();

        viewer.cameraFlight.jumpTo({
            aabb: scene.aabb
        });

        // 4. Set canvas size to snapshot size (to avoid scaling blue)

        scene.canvas.width = self._size[0];
        scene.canvas.height = self._size[1];

        // 5. With each IfcBuildingStorey object

        const storeyObjectIds = metaModel.rootMetaObject.getObjectIDsInSubtreeByType(["IfcBuildingStorey"]);
        const numStoreys = storeyObjectIds.length;
        var numPlanViewsCreated = 0;

        function createNextPlanView() {

            const storeyObjectId = storeyObjectIds[numPlanViewsCreated];
            const storeyMetaObject = metaModel.metaScene.metaObjects[storeyObjectId];
            const storeySubObjects = storeyMetaObject.getObjectIDsInSubtree();

            // 5.1 Hide all scene objects

            scene.setObjectsVisible(viewer.scene.visibleObjectIds, false);

            // 5.2 With each sub-object

            for (var i = 0, len = storeySubObjects.length; i < len; i++) {

                const objectId = storeySubObjects[i];
                const metaObject = metaScene.metaObjects[objectId];
                const object = scene.objects[objectId];

                if (object) {

                    // 5.2.1 Set state from objectStates

                    const props = self._objectStates[metaObject.type] || self._objectStates["DEFAULT"];

                    if (props) {

                        object.visible = props.visible;
                        object.edges = props.edges;
                        object.xrayed = props.xrayed;
                        object.highlighted = props.highlighted;
                        object.selected = props.selected;

                        if (props.colorize) {
                            object.colorize = props.colorize;
                        }

                        if (props.opacity !== null && props.opacity !== undefined) {
                            object.opacity = props.opacity;
                        }
                    }
                }
            }

            // 5.3 Grab snapshot of canvas

            scene.render(true); // Force-render a frame

            const snapshotData = viewer.getSnapshot({
                width: self._size[0],
                height: self._size[1],
                format: self._format,
            });

            // 5.4 Create PlanView from snapshot

            const planView = new PlanView(scene.aabb, modelId, storeyObjectId, snapshotData);

            planView._onModelDestroyed = model.once("destroyed", () => {
                self._destroyModelPlanViews(modelId);
            });

            self.planViews[storeyObjectId] = planView;

            if (!self.modelPlanViews[modelId]) {
                self.modelPlanViews[modelId] = {};
            }
            self.modelPlanViews[modelId][storeyObjectId] = planView;

            numPlanViewsCreated++;

            if (numPlanViewsCreated === numStoreys) {

                // 6. Restore scene state

                objectsMemento.restoreObjects(scene);

                // 7. Restore canvas size

                scene.canvas.canvas.boundary = saveCanvasBoundary;

            } else {
                createNextPlanView();
            }
        }

        createNextPlanView();

        var t1 = performance.now();
        console.log("StoreViewsPlugin._rebuildPlanViews() took " + (t1 - t0) + " milliseconds.")
    }

    _destroyModelPlanViews(modelId) {
        const planViews = this.modelPlanViews[modelId];
        const scene = this.viewer.scene;
        if (planViews) {
            for (let storyObjectId in planViews) {
                if (planViews.hasOwnProperty(storyObjectId)) {
                    const planView = planViews[storyObjectId];
                    const model = scene.models[planView.modelId];
                    if (model) {
                        model.off("destroyed", planView._onModelDestroyed);
                    }
                    delete this.planViews[storyObjectId];
                }
            }
            delete this.modelPlanViews[modelId];
        }
    }

    destroy() {
        this.viewer.scene.canvas.off(this._onCanvasBoundary);
        this.viewer.scene.off(this._onModelLoaded);
        this.viewer.scene.off(this._onTick);
        super.destroy();
    }
}

export {PlanViewsPlugin}
