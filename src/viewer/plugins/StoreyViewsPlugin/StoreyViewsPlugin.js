import {Plugin} from "./../../Plugin.js";
import {StoreyView} from "./StoreyView.js";
import {IFCStoreyViewObjectDefaults} from "./IFCStoreyViewObjectDefaults.js";

/**
 * {@link Viewer} plugin that manages plan views
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
     * Sets map of initial default states for {@link Entity}s within storeys.
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
     * Gets map of initial default states for {@link Entity}s within storeys.
     *
     * Default value is {@link IFCStoreyViewObjectDefaults}.
     *
     * @type {{String: Object}}
     */
    get objectDefaults() {
        return this._objectDefaults;
    }

    /**
     *
     * @param ortho
     */
    set ortho(ortho) {
        this._ortho = ortho !== false;
        this._dirty = true;
    }

    /**
     *
     * @returns {boolean}
     */
    get ortho() {
        return this._ortho;
    }

    /**
     *
     * @param size
     */
    set size(size) {
        this._size = size;
        this._dirty = true;
    }

    /**
     *
     * @returns {*|number[]}
     */
    get size() {
        return this._size;
    }

    /**
     *
     * @param format
     */
    set format(format) {
        this._format = format || "png";
        this._dirty = true;
    }

    /**
     *
     * @returns {*|number[]}
     */
    get format() {
        return this._format;
    }

    /**
     *
     * @param bgColor
     */
    set bgColor(bgColor) {
        this._bgColor = bgColor;
        this._dirty = true;
    }

    /**
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

        this._destroyModelStoreyViews(modelId);

        const self = this;
        const viewer = this.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;
        const metaScene = viewer.metaScene;
        const metaModel = metaScene.metaModels[modelId];
        const modelEntity = scene.models[modelId];

        if (!metaModel || !metaModel.rootMetaObject) {
            return;
        }

        const saveVisibleObjectIds = scene.visibleObjectIds.slice();

        const saveCamera = {
            eye: camera.eye.slice(),
            look: camera.look.slice(),
            up: camera.up.slice(),
            projection: camera.projection,
            orthoScale: camera.ortho.scale
        };

        camera.projection = this._ortho ? "ortho" : "perspective";
        camera.eye = camera.worldUp.slice();
        camera.look = [-camera.worldUp[0], -camera.worldUp[1], -camera.worldUp[2]];
        camera.up = camera.worldForward.slice();

        viewer.cameraFlight.jumpTo({
            aabb: scene.aabb
        });
        viewer.camera._update();

        const storeyObjectIds = metaModel.rootMetaObject.getObjectIDsInSubtreeByType(["IfcBuildingStorey"]);
        const numStoreys = storeyObjectIds.length;
        var numStoreyViewsCreated = 0;

        function createNextStoreyView() {

            const storeyObjectId = storeyObjectIds[numStoreyViewsCreated];
            const storeyMetaObject = metaModel.metaScene.metaObjects[storeyObjectId];
            const storySubObjectIds = storeyMetaObject.getObjectIDsInSubtree();

            scene.setObjectsVisible(viewer.scene.visibleObjectIds, false);

            for (var i = 0, len = storySubObjectIds.length; i < len; i++) {
                const objectId = storySubObjectIds[i];
                const metaObject = metaScene.metaObjects[objectId];
                const object = scene.objects[objectId];

                if (object) {
                    const props = self._objectDefaults[metaObject.type];
                    if (props) {
                        object.visible = !!props.visible;
                    }
                }
            }

            scene.render(true); // Force-render a frame

            const snapshotData = scene.canvas.getSnapshot({
                width: self._size[0],
                height: self._size[1],
                format: self._format,
            });

            const storeyView = new StoreyView(scene.aabb, modelId, storeyObjectId, snapshotData);

            storeyView._onModelDestroyed = modelEntity.once("destroyed", () => {
                self._destroyModelStoreyViews(modelId);
            });

            self.storeyViews[storeyObjectId] = storeyView;

            if (!self.modelStoreyViews[modelId]) {
                self.modelStoreyViews[modelId] = {};
            }
            self.modelStoreyViews[modelId][storeyObjectId] = storeyView;

            numStoreyViewsCreated++;

            if (numStoreyViewsCreated === numStoreys) {

                scene.setObjectsVisible(viewer.scene.visibleObjectIds, false);
                scene.setObjectsVisible(saveVisibleObjectIds, true);

                camera.projection = saveCamera.projection;
                camera.eye = saveCamera.eye;
                camera.look = saveCamera.look;
                camera.up = saveCamera.up;
                camera.ortho.scale = camera.orthoScale;

            } else {
                createNextStoreyView();
            }
        }

        createNextStoreyView();
    }

    _destroyModelStoreyViews(modelId) {
        const storeyViews = this.modelStoreyViews[modelId];
        const scene = this.viewer.scene;
        if (storeyViews) {
            for (let storyObjectId in storeyViews) {
                if (storeyViews.hasOwnProperty(storyObjectId)) {
                    const storeyView = storeyViews[storyObjectId];
                    const modelEntity = scene.models[storeyView.modelId];
                    if (modelEntity) {
                        modelEntity.off("destroyied", storeyView._onModelDestroyed);
                    }
                    delete this.storeyViews[storyObjectId];
                }
            }
            delete this.modelStoreyViews[modelId];
        }
    }

    destroy() {
        this.viewer.scene.off(this._onModelLoaded);
        this.viewer.scene.off(this._onTick);
        super.destroy();
    }
}

export {StoreyViewsPlugin}
