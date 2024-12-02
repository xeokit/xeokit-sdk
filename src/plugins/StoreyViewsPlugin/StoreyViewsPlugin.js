import {Plugin} from "../../viewer/Plugin.js";
import {Storey} from "./Storey.js";
import {math} from "../../viewer/scene/math/math.js";
import {ObjectsMemento} from "../../viewer/scene/mementos/ObjectsMemento.js";
import {CameraMemento} from "../../viewer/scene/mementos/CameraMemento.js";
import {StoreyMap} from "./StoreyMap.js";
import {utils} from "../../viewer/scene/utils.js";

const tempVec3a = math.vec3();
const tempMat4 = math.mat4();

const EMPTY_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";


/**
 * @desc A {@link Viewer} plugin that provides methods for visualizing IfcBuildingStoreys.
 *
 *  <a href="https://xeokit.github.io/xeokit-sdk/examples/navigation/#StoreyViewsPlugin_recipe3"><img src="http://xeokit.io/img/docs/StoreyViewsPlugin/minimap.gif"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/navigation/#StoreyViewsPlugin_recipe3)]
 *
 * ## Overview
 *
 * StoreyViewsPlugin provides a flexible set of methods for visualizing building storeys in 3D and 2D.
 *
 * Use the first two methods to set up 3D views of storeys:
 *
 * * [showStoreyObjects](#instance-method-showStoreyObjects) - shows the {@link Entity}s within a storey, and
 * * [gotoStoreyCamera](#instance-method-gotoStoreyCamera) - positions the {@link Camera} for a plan view of the Entitys within a storey.
 * <br> <br>
 *
 * Use the second two methods to create 2D plan view mini-map images:
 *
 * * [createStoreyMap](#instance-method-createStoreyMap) - creates a 2D plan view image of a storey, and
 * * [pickStoreyMap](#instance-method-pickStoreyMap) - picks the {@link Entity} at the given 2D pixel coordinates within a plan view image.
 *
 * ## Usage
 *
 * Let's start by creating a {@link Viewer} with a StoreyViewsPlugin and an {@link XKTLoaderPlugin}.
 *
 * Then we'll load a BIM building model from an  ```.xkt``` file.
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, StoreyViewsPlugin} from "xeokit-sdk.es.js";
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
 * // Add an XKTLoaderPlugin
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * // Add a StoreyViewsPlugin
 *
 * const storeyViewsPlugin = new StoreyViewsPlugin(viewer);
 *
 * // Load a BIM model from .xkt format
 *
 * const model = xktLoader.load({
 *      id: "myModel",
 *      src: "./models/xkt/Schependomlaan.xkt",
 *      edges: true
 * });
 * ````
 *
 * ## Finding Storeys
 *
 * Getting information on a storey in our model:
 *
 * ````javascript
 * const storey = storeyViewsPlugin.storeys["2SWZMQPyD9pfT9q87pgXa1"]; // ID of the IfcBuildingStorey
 *
 * const modelId  = storey.modelId;  // "myModel"
 * const storeyId = storey.storeyId; // "2SWZMQPyD9pfT9q87pgXa1"
 * const aabb     = storey.aabb;     // Axis-aligned 3D World-space boundary of the IfcBuildingStorey
 * ````
 *
 * We can also get a "storeys" event every time the set of storeys changes, ie. every time a storey is created or destroyed:
 *
 * ````javascript
 * storeyViewsPlugin.on("storeys", ()=> {
 *      const storey = storeyViewsPlugin.storeys["2SWZMQPyD9pfT9q87pgXa1"];
 *      //...
 * });
 * ````
 *
 * ## Showing Entitys within Storeys
 *
 * Showing the {@link Entity}s within a storey:
 *
 * ````javascript
 * storeyViewsPlugin.showStoreyObjects("2SWZMQPyD9pfT9q87pgXa1");
 * ````
 *
 * Showing **only** the Entitys in a storey, hiding all others:
 *
 * ````javascript
 * storeyViewsPlugin.showStoreyObjects("2SWZMQPyD9pfT9q87pgXa1", {
 *     hideOthers: true
 * });
 * ````
 * Showing only the storey Entitys:
 *
 * ````javascript
 * storeyViewsPlugin.showStoreyObjects("2SWZMQPyD9pfT9q87pgXa1", {
 *     hideOthers: true
 * });
 * ````
 *
 * When using this option, at some point later you'll probably want to restore all Entitys to their original visibilities and
 * appearances.
 *
 * To do that, save their visibility and appearance states in an {@link ObjectsMemento} beforehand, from
 * which you can restore them later:
 *
 * ````javascript
 * const objectsMemento = new ObjectsMemento();
 *
 * // Save all Entity visibility and appearance states
 *
 * objectsMemento.saveObjects(viewer.scene);
 *
 * // Show storey view Entitys
 *
 * storeyViewsPlugin.showStoreyObjects("2SWZMQPyD9pfT9q87pgXa1");
 *
 * //...
 *
 * // Later, restore all Entitys to their saved visibility and appearance states
 * objectsMemento.restoreObjects(viewer.scene);
 * ````
 *
 * ## Arranging the Camera for Storey Plan Views
 *
 * The {@link StoreyViewsPlugin#gotoStoreyCamera} method positions the {@link Camera} for a plan view of
 * the {@link Entity}s within the given storey.
 *
 * Let's fly the {@link Camera} to a downward-looking orthographic view of the Entitys within our storey.
 *
 * ````javascript
 * storeyViewsPlugin.gotoStoreyCamera("2SWZMQPyD9pfT9q87pgXa1", {
 *     projection: "ortho", // Orthographic projection
 *     duration: 2.5,       // 2.5 second transition
 *     done: () => {
 *         viewer.cameraControl.planView = true; // Disable rotation
 *     }
 * });
 * ````
 *
 * Note that we also set {@link CameraControl#planView} ````true````, which prevents the CameraControl from rotating
 * or orbiting. In orthographic mode, this effectively makes the {@link Viewer} behave as if it were a 2D viewer, with
 * picking, panning and zooming still enabled.
 *
 * If you need to be able to restore the Camera to its previous state, you can save it to a {@link CameraMemento}
 * beforehand, from which you can restore it later:
 *
 * ````javascript
 * const cameraMemento = new CameraMemento();
 *
 * // Save camera state
 *
 * cameraMemento.saveCamera(viewer.scene);
 *
 * // Position camera for a downward-looking orthographic view of our storey
 *
 * storeyViewsPlugin.gotoStoreyCamera("2SWZMQPyD9pfT9q87pgXa1", {
 *     projection: "ortho",
 *     duration: 2.5,
 *     done: () => {
 *         viewer.cameraControl.planView = true; // Disable rotation
 *     }
 * });
 *
 * //...
 *
 * // Later, restore the Camera to its saved state
 * cameraMemento.restoreCamera(viewer.scene);
 * ````
 *
 * ## Creating StoreyMaps
 *
 * The {@link StoreyViewsPlugin#createStoreyMap} method creates a 2D orthographic plan image of the given storey.
 *
 * This method creates a {@link StoreyMap}, which provides the plan image as a Base64-encoded string.
 *
 * Let's create a 2D plan image of our building storey:
 *
 * ````javascript
 * const storeyMap = storeyViewsPlugin.createStoreyMap("2SWZMQPyD9pfT9q87pgXa1", {
 *     width: 300,
 *     format: "png"
 * });
 *
 * const imageData = storeyMap.imageData; // Base64-encoded image data string
 * const width     = storeyMap.width; // 300
 * const height    = storeyMap.height; // Automatically derived from width
 * const format    = storeyMap.format; // "png"
 * ````
 *
 * We can also specify a ````height```` for the plan image, as an alternative to ````width````:
 *
 *  ````javascript
 *  const storeyMap = storeyViewsPlugin.createStoreyMap("2SWZMQPyD9pfT9q87pgXa1", {
 *      height: 200,
 *      format: "png"
 * });
 * ````
 *
 * ## Picking Entities in StoreyMaps
 *
 * We can use {@link StoreyViewsPlugin#pickStoreyMap} to pick Entities in our building storey, using 2D coordinates from mouse or touch events on our {@link StoreyMap}'s 2D plan image.
 *
 * Let's programmatically pick the Entity at the given 2D pixel coordinates within our image:
 *
 * ````javascript
 * const mouseCoords = [65, 120]; // Mouse coords within the image extents
 *
 * const pickResult = storeyViewsPlugin.pickStoreyMap(storeyMap, mouseCoords);
 *
 * if (pickResult && pickResult.entity) {
 *     pickResult.entity.highlighted = true;
 * }
 * ````
 */
class StoreyViewsPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="StoreyViews"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Boolean} [cfg.fitStoreyMaps=false] If enabled, the elements of each floor map image will be proportionally resized to encompass the entire image. This leads to varying scales among different floor map images. If disabled, each floor map image will display the model's extents, ensuring a consistent scale across all images.
     */
    constructor(viewer, cfg = {}) {

        super("StoreyViews", viewer);

        this._objectsMemento = new ObjectsMemento();
        this._cameraMemento = new CameraMemento();

        /**
         * A {@link Storey} for each ````IfcBuildingStorey```.
         *
         * There will be a {@link Storey} for every existing {@link MetaObject} whose {@link MetaObject#type} equals "IfcBuildingStorey".
         *
         * These are created and destroyed automatically as models are loaded and destroyed.
         *
         * @type {{String:Storey}}
         */
        this.storeys = {};

        this._storeysList = null;

        /**
         * A set of {@link Storey}s for each {@link MetaModel}.
         *
         * These are created and destroyed automatically as models are loaded and destroyed.
         *
         * @type {{String: {String:Storey}}}
         */
        this.modelStoreys = {};

        this._fitStoreyMaps = (!!cfg.fitStoreyMaps);

        this._onModelLoaded = this.viewer.scene.on("modelLoaded", (modelId) => {
            this._registerModelStoreys(modelId);
            this.fire("storeys", this.storeys);
        });
    }

    _registerModelStoreys(modelId) {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const metaScene = viewer.metaScene;
        const metaModel = metaScene.metaModels[modelId];
        const model = scene.models[modelId];
        if (!metaModel || !metaModel.rootMetaObjects) {
            return;
        }
        const rootMetaObjects = metaModel.rootMetaObjects;
        for (let j = 0, lenj = rootMetaObjects.length; j < lenj; j++) {
            const storeyIds = rootMetaObjects[j].getObjectIDsInSubtreeByType(["IfcBuildingStorey"]);
            for (let i = 0, len = storeyIds.length; i < len; i++) {
                const storeyId = storeyIds[i];
                const metaObject = metaScene.metaObjects[storeyId];
                const childObjectIds = metaObject.getObjectIDsInSubtree();
                const storeyAABB = scene.getAABB(childObjectIds);
                const numObjects = (Math.random() > 0.5) ? childObjectIds.length : 0;
                const storey = new Storey(this, model.aabb, storeyAABB, modelId, storeyId, numObjects);
                storey._onModelDestroyed = model.once("destroyed", () => {
                    this._deregisterModelStoreys(modelId);
                    this.fire("storeys", this.storeys);
                });
                this.storeys[storeyId] = storey;
                this._storeysList = null;
                if (!this.modelStoreys[modelId]) {
                    this.modelStoreys[modelId] = {};
                }
                this.modelStoreys[modelId][storeyId] = storey;
            }
        }
        this._clipBoundingBoxes();
    }

    _clipBoundingBoxes() {
        const storeysList = this.storeysList;
        const metaScene = this.viewer.metaScene;
        const camera = this.viewer.camera;
        const worldUp = camera.worldUp;
        const xUp = worldUp[0] > worldUp[1] && worldUp[0] > worldUp[2];
        const yUp = !xUp && worldUp[1] > worldUp[0] && worldUp[1] > worldUp[2];
        const zUp = !xUp && !yUp && worldUp[2] > worldUp[0] && worldUp[2] > worldUp[1];

        let bbIndex;

        if(xUp) bbIndex = 0;
        else if(yUp) bbIndex = 1;
        else bbIndex = 2;
        
        for (let i = 0, len = storeysList.length; i < len; i++) {

            const storeyMetaObjectCur = metaScene.metaObjects[storeysList[i].storeyId];
            const elevationCur = storeyMetaObjectCur.attributes.elevation;

            if(isNaN(elevationCur)) return;

            const bb = storeysList[i].storeyAABB;
            bb[bbIndex] = Math.max(bb[1], parseFloat(elevationCur));

            if (i > 0) {
                const storeyMetaObjectNext = metaScene.metaObjects[storeysList[i - 1].storeyId];
                const elevationNext = storeyMetaObjectNext.attributes.elevation;
                bb[4] = Math.min(bb[bbIndex + 3], parseFloat(elevationNext));
            }

            this.storeys[storeysList[i].storeyId].storeyAABB = bb;
        }

    }

    _deregisterModelStoreys(modelId) {
        const storeys = this.modelStoreys[modelId];
        if (storeys) {
            const scene = this.viewer.scene;
            for (let storyObjectId in storeys) {
                if (storeys.hasOwnProperty(storyObjectId)) {
                    const storey = storeys[storyObjectId];
                    const model = scene.models[storey.modelId];
                    if (model) {
                        model.off(storey._onModelDestroyed);
                    }
                    delete this.storeys[storyObjectId];
                    this._storeysList = null;
                }
            }
            delete this.modelStoreys[modelId];
        }
    }

    /**
     * When true, the elements of each floor map image will be proportionally resized to encompass the entire image. This leads to varying scales among different
     * floor map images. If false, each floor map image will display the model's extents, ensuring a consistent scale across all images.
     * @returns {*|boolean}
     */
    get fitStoreyMaps() {
        return this._fitStoreyMaps;
    }

    /**
     * Arranges the {@link Camera} for a 3D orthographic view of the {@link Entity}s within the given storey.
     *
     * See also: {@link CameraMemento}, which saves and restores the state of the {@link Scene}'s {@link Camera}
     *
     * @param {String} storeyId ID of the ````IfcBuildingStorey```` object.
     * @param {*} [options] Options for arranging the Camera.
     * @param {String} [options.projection] Projection type to transition the Camera to. Accepted values are "perspective" and "ortho".
     * @param {Function} [options.done] Callback to fire when the Camera has arrived. When provided, causes an animated flight to the saved state. Otherwise jumps to the saved state.
     */
    gotoStoreyCamera(storeyId, options = {}) {

        const storey = this.storeys[storeyId];

        if (!storey) {
            this.error("IfcBuildingStorey not found with this ID: " + storeyId);
            if (options.done) {
                options.done();
            }
            return;
        }

        const viewer = this.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;
        const storeyAABB = storey.storeyAABB;

        if (storeyAABB[3] < storeyAABB[0] || storeyAABB[4] < storeyAABB[1] || storeyAABB[5] < storeyAABB[2]) { // Don't fly to an inverted boundary
            if (options.done) {
                options.done();
            }
            return;
        }
        if (storeyAABB[3] === storeyAABB[0] && storeyAABB[4] === storeyAABB[1] && storeyAABB[5] === storeyAABB[2]) { // Don't fly to an empty boundary
            if (options.done) {
                options.done();
            }
            return;
        }
        const look2 = math.getAABB3Center(storeyAABB);
        const diag = math.getAABB3Diag(storeyAABB);
        const fitFOV = 45; // fitFOV;
        const sca = Math.abs(diag / Math.tan(fitFOV * math.DEGTORAD));

        const orthoScale2 = diag * 1.3;

        const eye2 = tempVec3a;

        eye2[0] = look2[0] + (camera.worldUp[0] * sca);
        eye2[1] = look2[1] + (camera.worldUp[1] * sca);
        eye2[2] = look2[2] + (camera.worldUp[2] * sca);

        const up2 = camera.worldForward;

        if (options.done) {

            viewer.cameraFlight.flyTo(utils.apply(options, {
                eye: eye2,
                look: look2,
                up: up2,
                orthoScale: orthoScale2
            }), () => {
                options.done();
            });

        } else {

            viewer.cameraFlight.jumpTo(utils.apply(options, {
                eye: eye2,
                look: look2,
                up: up2,
                orthoScale: orthoScale2
            }));

            viewer.camera.ortho.scale = orthoScale2;
        }
    }

    /**
     * Shows the {@link Entity}s within the given storey.
     *
     * Optionally hides all other Entitys.
     *
     * See also: {@link ObjectsMemento}, which saves and restores a memento of the visual state
     * of the {@link Entity}'s that represent objects within a {@link Scene}.
     *
     * @param {String} storeyId ID of the ````IfcBuildingStorey```` object.
     * @param {*} [options] Options for showing the Entitys within the storey.
     * @param {Boolean} [options.hideOthers=false] When ````true````, hide all other {@link Entity}s.
     */
    showStoreyObjects(storeyId, options = {}) {

        const storey = this.storeys[storeyId];

        if (!storey) {
            this.error("IfcBuildingStorey not found with this ID: " + storeyId);
            return;
        }

        const viewer = this.viewer;
        const scene = viewer.scene;
        const metaScene = viewer.metaScene;
        const storeyMetaObject = metaScene.metaObjects[storeyId];

        if (!storeyMetaObject) {
            return;
        }

        if (options.hideOthers) {
            scene.setObjectsVisible(viewer.scene.visibleObjectIds, false);
        }

        this.withStoreyObjects(storeyId, (entity, metaObject) => {
            if (entity) {
                entity.visible = true;
            }
        });
    }

    /**
     * Executes a callback on each of the objects within the given storey.
     *
     * ## Usage
     *
     * In the example below, we'll show all the {@link Entity}s, within the given ````IfcBuildingStorey````,
     * that have {@link MetaObject}s with type ````IfcSpace````. Note that the callback will only be given
     * an {@link Entity} when one exists for the given {@link MetaObject}.
     *
     * ````JavaScript
     * myStoreyViewsPlugin.withStoreyObjects(storeyId, (entity, metaObject) => {
     *      if (entity && metaObject && metaObject.type === "IfcSpace") {
     *          entity.visible = true;
     *      }
     * });
     * ````
     *
     * @param {String} storeyId ID of the ````IfcBuildingStorey```` object.
     * @param {Function} callback The callback.
     */
    withStoreyObjects(storeyId, callback) {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const metaScene = viewer.metaScene;
        const rootMetaObject = metaScene.metaObjects[storeyId];
        if (!rootMetaObject) {
            return;
        }
        const storeySubObjects = rootMetaObject.getObjectIDsInSubtree();
        for (var i = 0, len = storeySubObjects.length; i < len; i++) {
            const objectId = storeySubObjects[i];
            const metaObject = metaScene.metaObjects[objectId];
            const entity = scene.objects[objectId];
            if (entity) {
                callback(entity, metaObject);
            }
        }
    }

    /**
     * Creates a 2D map of the given storey.
     *
     * @param {String} storeyId ID of the ````IfcBuildingStorey```` object.
     * @param {*} [options] Options for creating the image.
     * @param {Number} [options.width=300] Image width in pixels. Height will be automatically determined from this, if not given.
     * @param {Number} [options.height=300] Image height in pixels, as an alternative to width. Width will be automatically determined from this, if not given.
     * @param {String} [options.format="png"] Image format. Accepted values are "png" and "jpeg".
     * @param {Boolean} [options.captureSectionPlanes=false] Whether the storey map is sliced or not.
     * @returns {StoreyMap} The StoreyMap.
     */
    createStoreyMap(storeyId, options = {}) {

        const storey = this.storeys[storeyId];
        if (!storey) {
            this.error("IfcBuildingStorey not found with this ID: " + storeyId);
            return EMPTY_IMAGE;
        }

        const viewer = this.viewer;
        const scene = viewer.scene;
        const format = options.format || "png";
        const aabb = (this._fitStoreyMaps) ? storey.storeyAABB : storey.modelAABB;
        const aspect = Math.abs((aabb[5] - aabb[2]) / (aabb[3] - aabb[0]));
        const padding = options.padding || 0;
        const captureSectionPlanes = !!options.captureSectionPlanes;

        let width;
        let height;

        if (options.width && options.height) {
            width = options.width;
            height = options.height;

        } else if (options.height) {
            height = options.height;
            width = Math.round(height / aspect);

        } else if (options.width) {
            width = options.width;
            height = Math.round(width * aspect);

        } else {
            width = 300;
            height = Math.round(width * aspect);
        }

        const mask = {
            visible: true,
        }

        this._objectsMemento.saveObjects(scene, mask);
        this._cameraMemento.saveCamera(scene);

        this.showStoreyObjects(storeyId, utils.apply(options, {
            hideOthers: true
        }));
        
        if (captureSectionPlanes)
            this._toggleSectionPlanes(false);

        this._arrangeStoreyMapCamera(storey);

        const src = viewer.getSnapshot({
            width: width,
            height: height,
            format: format,
        });

        this._objectsMemento.restoreObjects(scene, mask);
        this._cameraMemento.restoreCamera(scene);
        if (captureSectionPlanes)
            this._toggleSectionPlanes(true);

        return new StoreyMap(storeyId, src, format, width, height, padding);
    }

    _toggleSectionPlanes(visible) {
        const planes = this.viewer.scene.sectionPlanes;
        for (const key in planes) {
            planes[key].active = visible;
        }
    }

    _arrangeStoreyMapCamera(storey) {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;
        const aabb = (this._fitStoreyMaps) ? storey.storeyAABB : storey.modelAABB;
        const look = math.getAABB3Center(aabb);
        const sca = 0.5;
        const eye = tempVec3a;
        eye[0] = look[0] + (camera.worldUp[0] * sca);
        eye[1] = look[1] + (camera.worldUp[1] * sca);
        eye[2] = look[2] + (camera.worldUp[2] * sca);
        const up = camera.worldForward;
        viewer.cameraFlight.jumpTo({eye: eye, look: look, up: up});
        const xHalfSize = (aabb[3] - aabb[0]) / 2;
        const yHalfSize = (aabb[4] - aabb[1]) / 2;
        const zHalfSize = (aabb[5] - aabb[2]) / 2;
        const xmin = -xHalfSize;
        const xmax = +xHalfSize;
        const ymin = -yHalfSize;
        const ymax = +yHalfSize;
        const zmin = -zHalfSize;
        const zmax = +zHalfSize;
        viewer.camera.customProjection.matrix = math.orthoMat4c(xmin, xmax, zmin, zmax, ymin, ymax, tempMat4);
        viewer.camera.projection = "customProjection";
    }

    /**
     * Attempts to pick an {@link Entity} at the given pixel coordinates within a StoreyMap image.
     *
     * @param {StoreyMap} storeyMap The StoreyMap.
     * @param {Number[]} imagePos 2D pixel coordinates within the bounds of {@link StoreyMap#imageData}.
     * @param {*} [options] Picking options.
     * @param {Boolean} [options.pickSurface=false] Whether to return the picked position on the surface of the Entity.
     * @returns {PickResult} The pick result, if an Entity was successfully picked, else null.
     */
    pickStoreyMap(storeyMap, imagePos, options = {}) {

        const storeyId = storeyMap.storeyId;
        const storey = this.storeys[storeyId];

        if (!storey) {
            this.error("IfcBuildingStorey not found with this ID: " + storeyId);
            return null
        }

        const normX = 1.0 - (imagePos[0] / storeyMap.width);
        const normZ = 1.0 - (imagePos[1] / storeyMap.height);

        const aabb = (this._fitStoreyMaps) ? storey.storeyAABB : storey.modelAABB;

        const xmin = aabb[0];
        const ymin = aabb[1];
        const zmin = aabb[2];
        const xmax = aabb[3];
        const ymax = aabb[4];
        const zmax = aabb[5];

        const xWorldSize = xmax - xmin;
        const yWorldSize = ymax - ymin;
        const zWorldSize = zmax - zmin;

        const origin = math.vec3([xmin + (xWorldSize * normX), ymin + (yWorldSize * 0.5), zmin + (zWorldSize * normZ)]);
        const direction = math.vec3([0, -1, 0]);
        const look = math.addVec3(origin, direction, tempVec3a);
        const worldForward = this.viewer.camera.worldForward;
        const matrix = math.lookAtMat4v(origin, look, worldForward, tempMat4);

        const pickResult = this.viewer.scene.pick({  // Picking with arbitrarily-positioned ray
            pickSurface: options.pickSurface,
            pickInvisible: true,
            matrix
        });

        return pickResult;
    }

    storeyMapToWorldPos(storeyMap, imagePos, options = {}) {

        const storeyId = storeyMap.storeyId;
        const storey = this.storeys[storeyId];

        if (!storey) {
            this.error("IfcBuildingStorey not found with this ID: " + storeyId);
            return null
        }

        const normX = 1.0 - (imagePos[0] / storeyMap.width);
        const normZ = 1.0 - (imagePos[1] / storeyMap.height);

        const aabb = (this._fitStoreyMaps) ? storey.storeyAABB : storey.modelAABB;

        const xmin = aabb[0];
        const ymin = aabb[1];
        const zmin = aabb[2];
        const xmax = aabb[3];
        const ymax = aabb[4];
        const zmax = aabb[5];

        const xWorldSize = xmax - xmin;
        const yWorldSize = ymax - ymin;
        const zWorldSize = zmax - zmin;

        const origin = math.vec3([xmin + (xWorldSize * normX), ymin + (yWorldSize * 0.5), zmin + (zWorldSize * normZ)]);

        return origin;
    }


    /**
     * Gets the ID of the storey that contains the given 3D World-space position.
     *.
     * @param {Number[]} worldPos 3D World-space position.
     * @returns {String} ID of the storey containing the position, or null if the position falls outside all the storeys.
     */
    getStoreyContainingWorldPos(worldPos, modelId = null) {
        const storeys = modelId ? this._filterStoreys(modelId) : this.storeys;
        for (let storeyId in storeys) {
            const storey = storeys[storeyId];
            if (math.point3AABB3AbsoluteIntersect(storey.storeyAABB, worldPos)) {
                return storeyId;
            }
        }
        return null;
    }

    /**
     * Gets the ID of the storey which's bounding box contains the y point of the world position
     *
     * @param {Number[]} worldPos 3D World-space position.
     * @returns {String} ID of the storey containing the position, or null if the position falls outside all the storeys.
     */
    getStoreyInVerticalRange(worldPos, modelId = null) {
        const storeys = modelId ? this._filterStoreys(modelId) : this.storeys;
        for (let storeyId in storeys) {
            const storey = storeys[storeyId];
            const aabb = [0, 0, 0, 0, 0, 0], pos = [0, 0, 0];
            aabb[1] = storey.storeyAABB[1];
            aabb[4] = storey.storeyAABB[4];
            pos[1] = worldPos[1];
            if (math.point3AABB3AbsoluteIntersect(aabb, pos)) {
                return storeyId;
            }
        }
        return null;
    }

    /**
     * Returns whether a position is above or below a building
     *
     * @param {Number[]} worldPos 3D World-space position.
     * @returns {String} ID of the lowest/highest story or null.
     */
    isPositionAboveOrBelowBuilding(worldPos, modelId = null) {
        const storeys = modelId ? this._filterStoreys(modelId) : this.storeys;
        const keys = Object.keys(storeys);
        if(keys.length <= 0) return null;
        const ids = [keys[0], keys[keys.length - 1]];
        if (worldPos[1] < storeys[ids[0]].storeyAABB[1])
            return ids[0];
        else if (worldPos[1] > storeys[ids[1]].storeyAABB[4])
            return ids[1];
        return null;
    }

    /**
     * Converts a 3D World-space position to a 2D position within a StoreyMap image.
     *
     * Use {@link StoreyViewsPlugin#pickStoreyMap} to convert 2D image positions to 3D world-space.
     *
     * @param {StoreyMap} storeyMap The StoreyMap.
     * @param {Number[]} worldPos 3D World-space position within the storey.
     * @param {Number[]} imagePos 2D pixel position within the {@link StoreyMap#imageData}.
     * @returns {Boolean} True if ````imagePos```` is within the bounds of the {@link StoreyMap#imageData}, else ````false```` if it falls outside.
     */
    worldPosToStoreyMap(storeyMap, worldPos, imagePos) {

        const storeyId = storeyMap.storeyId;
        const storey = this.storeys[storeyId];

        if (!storey) {
            this.error("IfcBuildingStorey not found with this ID: " + storeyId);
            return false
        }

        const aabb = (this._fitStoreyMaps) ? storey.storeyAABB : storey.modelAABB;

        const xmin = aabb[0];
        const ymin = aabb[1];
        const zmin = aabb[2];

        const xmax = aabb[3];
        const ymax = aabb[4];
        const zmax = aabb[5];

        const xWorldSize = xmax - xmin;
        const yWorldSize = ymax - ymin;
        const zWorldSize = zmax - zmin;

        const camera = this.viewer.camera;
        const worldUp = camera.worldUp;

        const xUp = worldUp[0] > worldUp[1] && worldUp[0] > worldUp[2];
        const yUp = !xUp && worldUp[1] > worldUp[0] && worldUp[1] > worldUp[2];
        const zUp = !xUp && !yUp && worldUp[2] > worldUp[0] && worldUp[2] > worldUp[1];

        const ratioX = (storeyMap.width / xWorldSize);
        const ratioY = yUp ? (storeyMap.height / zWorldSize) : (storeyMap.height / yWorldSize); // Assuming either Y or Z is "up", but never X

        imagePos[0] = Math.floor(storeyMap.width - ((worldPos[0] - xmin) * ratioX));
        imagePos[1] = Math.floor(storeyMap.height - ((worldPos[2] - zmin) * ratioY));

        return (imagePos[0] >= 0 && imagePos[0] < storeyMap.width && imagePos[1] >= 0 && imagePos[1] <= storeyMap.height);
    }

    /**
     * Converts a 3D World-space direction vector to a 2D vector within a StoreyMap image.
     *
     * @param {StoreyMap} storeyMap The StoreyMap.
     * @param {Number[]} worldDir 3D World-space direction vector.
     * @param {Number[]} imageDir Normalized 2D direction vector.
     */
    worldDirToStoreyMap(storeyMap, worldDir, imageDir) {
        const camera = this.viewer.camera;
        const eye = camera.eye;
        const look = camera.look;
        const eyeLookDir = math.subVec3(look, eye, tempVec3a);
        const worldUp = camera.worldUp;
        const xUp = worldUp[0] > worldUp[1] && worldUp[0] > worldUp[2];
        const yUp = !xUp && worldUp[1] > worldUp[0] && worldUp[1] > worldUp[2];
        const zUp = !xUp && !yUp && worldUp[2] > worldUp[0] && worldUp[2] > worldUp[1];
        if (xUp) {
            imageDir[0] = eyeLookDir[1];
            imageDir[1] = eyeLookDir[2];
        } else if (yUp) {
            imageDir[0] = eyeLookDir[0];
            imageDir[1] = eyeLookDir[2];
        } else {
            imageDir[0] = eyeLookDir[0];
            imageDir[1] = eyeLookDir[1];
        }
        math.normalizeVec2(imageDir);
    }

    /**
     * Destroys this StoreyViewsPlugin.
     */
    destroy() {
        this.viewer.scene.off(this._onModelLoaded);
        super.destroy();
    }

    /**
     * Gets Storeys in a list, spatially sorted on the vertical World axis, the lowest Storey first.
     *
     * @returns {null}
     */
    get storeysList() {
        if (!this._storeysList) {
            this._storeysList = Object.values(this.storeys);
            this._storeysList.sort(this._getSpatialSortFunc());
        }
        return this._storeysList;
    }

    _getSpatialSortFunc() {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;
        return this._spatialSortFunc || (this._spatialSortFunc = (storey1, storey2) => {
            let idx = 0;
            if (camera.xUp) {
                idx = 0;
            } else if (camera.yUp) {
                idx = 1;
            } else {
                idx = 2;
            }
            const metaScene = this.viewer.metaScene;
            const storey1MetaObject = metaScene.metaObjects[storey1.storeyId];
            const storey2MetaObject = metaScene.metaObjects[storey2.storeyId];

            if (storey1MetaObject && (storey1MetaObject.attributes && storey1MetaObject.attributes.elevation !== undefined) &&
                storey2MetaObject && (storey2MetaObject.attributes && storey2MetaObject.attributes.elevation !== undefined)) {
                const elevation1 = Number.parseFloat(storey1MetaObject.attributes.elevation);
                const elevation2 = Number.parseFloat(storey2MetaObject.attributes.elevation);
                if (elevation1 > elevation2) {
                    return -1;
                }
                if (elevation1 < elevation2) {
                    return 1;
                }
                return 0;
            } else {
                if (storey1.aabb[idx] > storey2.aabb[idx]) {
                    return -1;
                }
                if (storey1.aabb[idx] < storey2.aabb[idx]) {
                    return 1;
                }
                return 0;
            }
        });
    }

    _filterStoreys(modelId) {
        return Object.fromEntries(
            Object.entries(this.storeys).filter(([_, value]) => value.modelId === modelId)
        );
    }
}

export {StoreyViewsPlugin}
