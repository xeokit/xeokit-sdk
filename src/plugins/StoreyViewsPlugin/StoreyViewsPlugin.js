import {SceneState} from "../../viewer/scene/scene/SceneState.js";

import {Plugin} from "../../viewer/Plugin.js";
import {StoreyView} from "./StoreyView.js";
import {IFCStoreyViewObjectDefaults} from "./IFCStoreyViewObjectDefaults.js";

const sceneState = new SceneState();

/**
 * @desc A {@link Viewer} plugin that automatically generates plan view images.
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#gizmos_StoreyViewsPlugin)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {GLTFLoaderPlugin} from "../src/viewer/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
 * import {StoreyViewsPlugin} from "../src/viewer/plugins/StoreyViewsPlugin/StoreyViewsPlugin.js";
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
 * // Add a StoreyViewsPlugin
 * // This will automatically create StoreyViews when the model has loaded
 *
 * const storeyViews = new StoreyViewsPlugin(viewer, {
 *      size: [220, 220],
 *      format: "png",  // Default
 *      ortho: true     // Default
 *  });
 *
 *
 * // When model loaded, get all StoreyViews from StoryViewsPlugin
 *
 * model.on("loaded", function () {
 *
 *      const storeyViewIds = Object.keys(storeyViews.storeyViews);
 *
 *      for (var i = 0, len = storeyViewIds.length; i < len; i++) {
 *
 *          const storeyViewId   = storeyViewIds[i];
 *
 *          const storeyView     = storeyViews.storeyViews[storeyViewId];
 *
 *          const aabb           = storeyView.aabb; // Boundary of storey elements
 *          const modelId        = storeyView.modelId; // "myModel"
 *          const storeyObjectId = storeyView.storeyObjectId; // ID of IfcBuildingStorey
 *          const snapshotData   = storeyView.snapshotData;
 *
 *          //...
 *      }
 * });
 * ````
 */
class StoreyViewsPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="GLTFLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} [cfg.objectDefaults] Map of visual states for the {@link Entity}s as rendered within each {@link StoreyView}.  Default value is {@link IFCStoreyViewObjectDefaults}.
     * @param {Boolean} [cfg.ortho=true] Whether to capture an orthographic or perspective view for each {@link StoreyView}.
     * @param {Number[]} [cfg.size=[200,200]] Size of {@link StoreyView} images.
     * @param {String} [cfg.format="png"] Format of {@link StoreyView} images. Allowed values are "png" and "jpeg".
     */
    constructor(viewer, cfg = {}) {

        super("storeyViews", viewer);

        /**
         * A {@link StoreyView} for each {@link MetaObject} whose {@link MetaObject#type} equals "IfcBuildingStorey", mapped to {@link Entity#id}.
         * @type {{String:StoreyView}}
         */
        this.storeyViews = {};

        /**
         * A map {@link StoreyView}s for each  {@link MetaModel}.
         * @type {{String:StoreyView}}
         */
        this.modelStoreyViews = {};

        // TODO: view fit or margin configuration for snapshot

        this.objectDefaults = cfg.objectDefaults;
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
            this._buildModelStoreyViews(modelId);
        });

        const self = this;

        this._onTick = this.viewer.scene.on("tick", function () {
            if (self._dirty) {
                self._rebuildStoreyViews();
                self._dirty = false;
            }
        });
    }

    /**
     * Sets map of visual states for the {@link Entity}s as rendered within each {@link StoreyView}.
     *
     * Default value is {@link IFCStoreyViewObjectDefaults}.
     *
     * @type {{String: Object}}
     */
    set objectDefaults(value) {
        this._objectDefaults = value || IFCStoreyViewObjectDefaults;
        this._dirty = true;
    }

    /**
     * Gets map of visual states for the {@link Entity}s as rendered within each {@link StoreyView}.
     *
     * Default value is {@link IFCStoreyViewObjectDefaults}.
     *
     * @type {{String: Object}}
     */
    get objectDefaults() {
        return this._objectDefaults;
    }

    /**
     * Sets whether or not to capture an orthographic or perspective view for each {@link StoreyView}.
     *
     * @param ortho
     */
    set ortho(ortho) {
        this._ortho = ortho !== false;
        this._dirty = true;
    }

    /**
     * Gets whether or not to capture an orthographic or perspective view for each {@link StoreyView}.
     *
     * @returns {boolean}
     */
    get ortho() {
        return this._ortho;
    }

    /**
     * Sets the size of {@link StoreyView} images.
     *
     * Rebuilds {@link StoreyView}s when modified.
     *
     * @param size
     */
    set size(size) {
        this._size = size;
        this._dirty = true;
    }

    /**
     * Gets the size of {@link StoreyView} images.
     *
     * @returns {*|number[]}
     */
    get size() {
        return this._size;
    }

    /**
     * Sets the format of {@link StoreyView} images. Allowed values are "png" and "jpeg".
     *
     * Rebuilds {@link StoreyView}s when modified.
     *
     * @param format
     */
    set format(format) {
        this._format = format || "png";
        this._dirty = true;
    }

    /**
     *
     * Gets the format of {@link StoreyView} images. Allowed values are "png" and "jpeg".
     *
     * @returns {*|number[]}
     */
    get format() {
        return this._format;
    }

    /**
     * Sets the background color of {@link StoreyView} images.
     *
     * Rebuilds {@link StoreyView}s when modified.
     *
     * @param bgColor
     */
    set bgColor(bgColor) {
        this._bgColor = bgColor;
        this._dirty = true;
    }

    /**
     * Gets the background color of {@link StoreyView} images.
     *
     * @returns {*|number[]}
     */
    get bgColor() {
        return this._bgColor;
    }

    _rebuildStoreyViews() {
        const models = this.viewer.scene.models;
        for (var modelId in models) {
            if (models.hasOwnProperty(modelId)) {
                this._buildModelStoreyViews(modelId);
            }
        }
    }

    _buildModelStoreyViews(modelId) {

        var t0 = performance.now();

        this._destroyModelStoreyViews(modelId);

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

        // How we build StoreyViews:
        //
        // 1. Save state of scene
        // 2. Save Canvas size
        // 3. Set camera to ortho projection, looking down, fitted to scene boundary
        // 4. Set canvas size to snapshot size (to avoid scaling blur)
        // 5. With each IfcBuildingStorey object :-
        //      5.1 Hide all scene objects
        //      5.2 With each sub-object :-
        //          5.2.1 Set state from objectDefaults
        //      5.3 Grab snapshot of canvas
        //      5.4 Create StoreyView from snapshot
        // 6. Restore scene state
        // 7. Restore canvas size

        // 1. Save state of scene objects

        sceneState.save(scene);

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
        var numStoreyViewsCreated = 0;

        function createNextStoreyView() {

            const storeyObjectId = storeyObjectIds[numStoreyViewsCreated];
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

                    // 5.2.1 Set state from objectDefaults

                    const props = self._objectDefaults[metaObject.type] || self._objectDefaults["DEFAULT"];

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

            const snapshotData = scene.canvas.getSnapshot({
                width: self._size[0],
                height: self._size[1],
                format: self._format,
            });

            // 5.4 Create StoreyView from snapshot

            const storeyView = new StoreyView(scene.aabb, modelId, storeyObjectId, snapshotData);

            storeyView._onModelDestroyed = model.once("destroyed", () => {
                self._destroyModelStoreyViews(modelId);
            });

            self.storeyViews[storeyObjectId] = storeyView;

            if (!self.modelStoreyViews[modelId]) {
                self.modelStoreyViews[modelId] = {};
            }
            self.modelStoreyViews[modelId][storeyObjectId] = storeyView;

            numStoreyViewsCreated++;

            if (numStoreyViewsCreated === numStoreys) {

                // 6. Restore scene state

                sceneState.restore(scene);

                // 7. Restore canvas size

                scene.canvas.canvas.boundary = saveCanvasBoundary;

            } else {
                createNextStoreyView();
            }
        }

        createNextStoreyView();

        var t1 = performance.now();
        console.log("StoreViewsPlugin._rebuildStoreyViews() took " + (t1 - t0) + " milliseconds.")
    }

    _destroyModelStoreyViews(modelId) {
        const storeyViews = this.modelStoreyViews[modelId];
        const scene = this.viewer.scene;
        if (storeyViews) {
            for (let storyObjectId in storeyViews) {
                if (storeyViews.hasOwnProperty(storyObjectId)) {
                    const storeyView = storeyViews[storyObjectId];
                    const model = scene.models[storeyView.modelId];
                    if (model) {
                        model.off("destroyed", storeyView._onModelDestroyed);
                    }
                    delete this.storeyViews[storyObjectId];
                }
            }
            delete this.modelStoreyViews[modelId];
        }
    }

    destroy() {
        this.viewer.scene.canvas.off(this._onCanvasBoundary);
        this.viewer.scene.off(this._onModelLoaded);
        this.viewer.scene.off(this._onTick);
        super.destroy();
    }
}

export {StoreyViewsPlugin}
