import {Plugin} from "../../viewer/Plugin.js";
import {Storey} from "./Storey.js";
import {IFCStoreyPlanObjectStates} from "./IFCStoreyPlanObjectStates.js";
import {math} from "../../viewer/scene/math/math.js";
import {ObjectsMemento} from "../../viewer/scene/mementos/ObjectsMemento.js";
import {CameraMemento} from "../../viewer/scene/mementos/CameraMemento.js";
import {StoreyImage} from "./StoreyImage.js";
import {utils} from "../../viewer/scene/utils.js";

const tempVec3a = math.vec3();
const tempMat4 = math.mat4();

const EMPTY_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/**
 * @desc A {@link Viewer} plugin that Provides tools for visualizing IfcBuildingStoreys.
 *
 *  <a href="https://xeokit.github.io/xeokit-sdk/examples/#loading_XKT_OTCConferenceCenter"><img src="http://xeokit.io/img/docs/XKTLoaderPlugin/XKTLoaderPlugin.png"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_XKT_OTCConferenceCenter)]
 *
 * ## Overview
 *
 * StoreyPlansPlugin provides a flexible set of methods for visualizing building storeys, in both 3D and 2D.
 *
 * The first two methods are for setting up 3D views of storeys:
 *
 * * [showStoreyObjects](#instance-method-showStoreyObjects) shows the {@link Entity}s within the given storey, and
 * * [gotoStoreyCamera](#instance-method-gotoStoreyCamera) positions the {@link Camera} for a plan view of the Entitys within the given storey.
 * <br> <br>
 *
 * The second two methods are for creating interactive 2D plan views:
 *
 * * [createStoreyImage](#instance-method-createStoreyImage) creates a 2D plan view image of the given storey, and
 * * [pickStoreyImage](#instance-method-pickStoreyImage) picks the {@link Entity} at the given 2D pixel coordinates within a plan view image.
 *
 * ## Usage
 *
 * Let's start by creating a {@link Viewer} with a StoreyPlansPlugin and an {@link XKTLoaderPlugin}.
 *
 * Then we'll load a BIM model from an  ```.xkt``` file.
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {XKTLoaderPlugin} from "../src/viewer/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
 * import {StoreyPlansPlugin} from "../src/viewer/plugins/StoreyPlansPlugin/StoreyPlansPlugin.js";
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
 * // Add a StoreyPlansPlugin
 *
 * const storeyPlansPlugin = new StoreyPlansPlugin(viewer);
 *
 * // Load a BIM model from .xkt format
 *
 * const model = xktLoader.load({
 *      id: "myModel",
 *      src: "./models/xkt/schependomlaan/schependomlaan.xkt",
 *      metaModelSrc: "./metaModels/schependomlaan/metaModel.json",
 *      edges: true
 * });
 * ````
 *
 * ## Finding Storeys
 *
 * Assuming our model has finished loading, let's get some basic information about one of its building storeys:
 *
 * ````javascript
 * const storey = storeyPlansPlugin.storeys["2SWZMQPyD9pfT9q87pgXa1"]; // ID of the IfcBuildingStorey
 *
 * const modelId  = storey.modelId;  // "myModel"
 * const storeyId = storey.storeyId; // "2SWZMQPyD9pfT9q87pgXa1"
 * const aabb     = storey.aabb;     // Axis-aligned 3D World-space boundary of the IfcBuildingStorey
 * ````
 *
 * ## Showing Entitys within Storeys
 *
 * The {@link StoreyPlansPlugin#showStoreyObjects} method shows the {@link Entity}s within the given storey.
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/#planViews_StoreyPlansPlugin_showStoreyObjects"><img src="http://xeokit.io/img/docs/StoreyPlansPlugin/showStoreyObjects.gif"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#planViews_StoreyPlansPlugin_showStoreyObjects)]
 *
 * Let's show the {@link Entity}s within our storey:
 *
 * ````javascript
 * storeyPlansPlugin.showStoreyObjects("2SWZMQPyD9pfT9q87pgXa1");
 * ````
 *
 * Let's show **only** the Entitys in our storey, hiding all others:
 *
 * ````javascript
 * storeyPlansPlugin.showStoreyObjects("2SWZMQPyD9pfT9q87pgXa1", {
 *     hideOthers: true
 * });
 * ````
 *
 * We can customize the appearance of the Entitys according to their IFC types, using
 * the lookup table configured on {@link StoreyPlansPlugin#objectStates}.
 *
 * Let's show our storey Entitys again, this time applying those custom appearances:
 *
 * ````javascript
 * storeyPlansPlugin.showStoreyObjects("2SWZMQPyD9pfT9q87pgXa1", {
 *     hideOthers: true,
 *     useObjectStates: true
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
 * // Show storey view Entitys, with custom appearances as configured for IFC types
 *
 * storeyPlansPlugin.showStoreyObjects("2SWZMQPyD9pfT9q87pgXa1", {
 *     useObjectStates: true // <<--------- Apply custom appearances
 * });
 *
 * //...
 *
 * // Later, restore all Entitys to their saved visibility and appearance states
 * objectsMemento.restoreObjects(viewer.scene);
 * ````
 *
 * ## Arranging the Camera for Storey Plan Views
 *
 * The {@link StoreyPlansPlugin#gotoStoreyCamera} method positions the {@link Camera} for a plan view of
 * the {@link Entity}s within the given storey.
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/#planViews_StoreyPlansPlugin_gotoStoreyCamera"><img src="http://xeokit.io/img/docs/StoreyPlansPlugin/gotoStoreyCamera.gif"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#planViews_StoreyPlansPlugin_gotoStoreyCamera)]
 *
 * Let's fly the {@link Camera} to a downward-looking orthographic view of the Entitys within our storey.
 *
 * ````javascript
 * storeyPlansPlugin.gotoStoreyCamera("2SWZMQPyD9pfT9q87pgXa1", {
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
 * storeyPlansPlugin.gotoStoreyCamera("2SWZMQPyD9pfT9q87pgXa1", {
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
 * ## Creating 2D Storey Plan Images
 *
 * The {@link StoreyPlansPlugin#createStoreyImage} method creates a 2D orthographic plan image of the given storey.
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/#planViews_StoreyPlansPlugin_createStoreyImage"><img src="http://xeokit.io/img/docs/StoreyPlansPlugin/createStoreyImage.png"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#planViews_StoreyPlansPlugin_createStoreyImage)]
 *
 * This method creates a {@link StoreyImage}, which provides the plan image as a Base64-encoded string.
 *
 * Let's create a 2D plan image of our building storey:
 *
 * ````javascript
 * const storeyImage = storeyPlansPlugin.createStoreyImage("2SWZMQPyD9pfT9q87pgXa1", {
 *     width: 300,
 *     format: "png"
 * });
 *
 * const imageData = storeyImage.imageData; // Base64-encoded image data string
 * const width     = storeyImage.width; // 300
 * const height    = storeyImage.height; // Automatically derived from width
 * const format    = storeyImage.format; // "png"
 * ````
 *
 * As with ````showStoreyEntitys````,  We also have the option to customize the appearance of the Entitys in our plan
 * images according to their IFC types, using the lookup table configured on {@link StoreyPlansPlugin#objectStates}.
 *
 * For example, we usually want to show only element types like ````IfcWall````,  ````IfcDoor```` and
 * ````IfcFloor```` in our plan images.
 *
 * Let's create another StoreyImage, this time applying the custom appearances:
 *
 * ````javascript
 * const storeyImage = storeyPlansPlugin.createStoreyImage("2SWZMQPyD9pfT9q87pgXa1", {
 *     width: 300,
 *     format: "png",
 *     useObjectStates: true // <<--------- Apply custom appearances
 * });
 *````
 *
 * ## Picking Entities in 2D Storey Plan Images
 *
 * We can use {@link StoreyPlansPlugin#pickStoreyImage} to pick Entities in our building storey, using 2D coordinates from mouse or touch events on our {@link StoreyImage}'s 2D plan image.
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/#planViews_StoreyPlansPlugin_pickStoreyImage"><img src="http://xeokit.io/img/docs/StoreyPlansPlugin/pickStoreyImage.gif"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#planViews_StoreyPlansPlugin_pickStoreyImage)]
 *
 * Let's programmatically pick the Entity at the given 2D pixel coordinates within our image:
 *
 * ````javascript
 * const mouseCoords = [65, 120]; // Mouse coords within the image extents
 *
 * const pickResult = storeyPlansPlugin.pickStoreyImage(storeyImage, mouseCoords);
 *
 * if (pickResult && pickResult.entity) {
 *     pickResult.entity.highlighted = true;
 * }
 * ````
 */
class StoreyPlansPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="PlanViews"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} [cfg.objectStates] Map of visual states for the {@link Entity}s as rendered within each {@link Storey}.  Default value is {@link IFCStoreyPlanObjectStates}.
     */
    constructor(viewer, cfg = {}) {

        super("PlanViews", viewer);

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

        /**
         * A set of {@link Storey}s for each {@link MetaModel}.
         *
         * These are created and destroyed automatically as models are loaded and destroyed.
         *
         * @type {{String: {String:Storey}}}
         */
        this.modelStoreys = {};

        this.objectStates = cfg.objectStates;

        this._onModelLoaded = this.viewer.scene.on("modelLoaded", (modelId) => {
            this._registerModelStoreys(modelId);
        });
    }

    _registerModelStoreys(modelId) {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const metaScene = viewer.metaScene;
        const metaModel = metaScene.metaModels[modelId];
        const model = scene.models[modelId];
        if (!metaModel || !metaModel.rootMetaObject) {
            return;
        }
        const storeyIds = metaModel.rootMetaObject.getObjectIDsInSubtreeByType(["IfcBuildingStorey"]);
        for (let i = 0, len = storeyIds.length; i < len; i++) {
            const storeyId = storeyIds[i];
            const storey = new Storey(this, scene.aabb, modelId, storeyId);
            storey._onModelDestroyed = model.once("destroyed", () => {
                this._deregisterModelStoreys(modelId);
            });
            this.storeys[storeyId] = storey;
            if (!this.modelStoreys[modelId]) {
                this.modelStoreys[modelId] = {};
            }
            this.modelStoreys[modelId][storeyId] = storey;
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
                        model.off("destroyed", storey._onModelDestroyed);
                    }
                    delete this.storeys[storyObjectId];
                }
            }
            delete this.modelStoreys[modelId];
        }
    }

    /**
     * Sets map of visual states for the {@link Entity}s as rendered within each {@link Storey}.
     *
     * Default value is {@link IFCStoreyPlanObjectStates}.
     *
     * @type {{String: Object}}
     */
    set objectStates(value) {
        this._objectStates = value || IFCStoreyPlanObjectStates;
    }

    /**
     * Gets map of visual states for the {@link Entity}s as rendered within each {@link Storey}.
     *
     * Default value is {@link IFCStoreyPlanObjectStates}.
     *
     * @type {{String: Object}}
     */
    get objectStates() {
        return this._objectStates;
    }

    /**
     * Arranges the {@link Camera} for a 3D orthographic view of the {@link Entity}s within the given storey.
     *
     * See also: {@link CameraMemento}, which saves and restores the state of the {@link Scene}'s {@link Camera}
     *
     * @param {String} storeyId ID of the ````IfcbuildingStorey```` object.
     * @param {*} [options] Options for arranging the Camera.
     * @param {String} [options.projection] Projection type to transition the Camera to - "perspective" or "ortho".
     * @param {Function} [options.done] Callback to fire when the Camera has arrived. When provided, causes an animated flight to the saved state. Otherwise jumps to the saved state.
     */
    gotoStoreyCamera(storeyId, options = {}) {

        const storey = this.storeys[storeyId];

        if (!storey) {
            this.error("IfcBuildingStorey not found with this ID: " + storeyId);
            if (done) {
                done();
            }
            return;
        }

        const viewer = this.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;

        const aabb = this.viewer.scene.aabb;
        if (aabb[3] < aabb[0] || aabb[4] < aabb[1] || aabb[5] < aabb[2]) { // Don't fly to an inverted boundary
            return;
        }
        if (aabb[3] === aabb[0] && aabb[4] === aabb[1] && aabb[5] === aabb[2]) { // Don't fly to an empty boundary
            return;
        }
        const look2 = math.getAABB3Center(aabb);
        const diag = math.getAABB3Diag(aabb);
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

            viewer.cameraFlight.jumpTo({
                eye: eye2,
                look: look2,
                up: up2,
                orthoScale: orthoScale2
            });

            viewer.camera.ortho.scale = orthoScale2;
        }
    }

    /**
     * Shows only the {@link Entity}s within the given storey.
     *
     * Hides all other Entitys.
     *
     * Sets the visual appearance of each of the Entitys according to its IFC type. The appearance of
     * IFC types in plan views is configured by {@link StoreyPlansPlugin#objectStates}.
     *
     * See also: {@link ObjectsMemento}, which saves and restores a memento of the visual state
     * of the {@link Entity}'s that represent objects within a {@link Scene}.
     *
     * @param {String} storeyId ID of the ````IfcbuildingStorey```` object.
     * @param {*} [options] Options for showing the Entitys within the storey.
     * @param {Boolean} [options.hideOthers=false] When ````true````, hide all other {@link Entity}s.
     * @param {Boolean} [options.useObjectStates=false] When ````true````, apply the custom visibilities and appearances configured for IFC types in {@link StoreyPlansPlugin#objectStates}.
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

        const storeySubObjects = storeyMetaObject.getObjectIDsInSubtree();

        for (var i = 0, len = storeySubObjects.length; i < len; i++) {

            const objectId = storeySubObjects[i];
            const metaObject = metaScene.metaObjects[objectId];
            const object = scene.objects[objectId];

            if (object) {

                if (options.useObjectStates) {

                    const props = this._objectStates[metaObject.type] || this._objectStates["DEFAULT"];

                    if (props) {

                        object.visible = props.visible;
                        object.edges = props.edges;
                        // object.xrayed = props.xrayed; // FIXME: Buggy
                        object.highlighted = props.highlighted;
                        object.selected = props.selected;

                        if (props.colorize) {
                            object.colorize = props.colorize;
                        }

                        if (props.opacity !== null && props.opacity !== undefined) {
                            object.opacity = props.opacity;
                        }
                    }

                } else {
                    object.visible = true;
                }
            }
        }
    }

    /**
     * Creates a plan image of the given storey.
     *
     * @param {String} storeyId ID of the ````IfcbuildingStorey```` object.
     * @param {*} [options] Options for creating the image.
     * @param {Number[]} [options.width=300] Image width in pixels. Height will be automatically determined.
     * @param {String} [options.format="png"] Image format. Allowed values are "png" and "jpeg".
     * @param {Boolean} [options.useObjectStates=false] When ````true````, apply the custom visibilities and appearances configured for IFC types in {@link StoreyPlansPlugin#objectStates}.
     * @returns {StoreyImage} Contains the plan image.
     */
    createStoreyImage(storeyId, options = {}) {

        const storey = this.storeys[storeyId];
        if (!storey) {
            this.error("IfcBuildingStorey not found with this ID: " + storeyId);
            return EMPTY_IMAGE;
        }

        const viewer = this.viewer;
        const scene = viewer.scene;
        const format = options.format || "png";
        const width = options.width || 300;
        const aabb = storey.aabb;
        const aspect = (aabb[5] - aabb[2]) / (aabb[3] - aabb[0]);
        const height = width * aspect;
        const padding = options.padding || 0;

        this._objectsMemento.saveObjects(scene);
        this._cameraMemento.saveCamera(scene);

        this.showStoreyObjects(storeyId, utils.apply(options, { hideOthers: true }));

        this._arrangeImageCamera();

        scene.render(true); // Force-render a frame

        const src = viewer.getSnapshot({
            width: width,
            height: height,
            format: format,
        });

        this._objectsMemento.restoreObjects(scene);
        this._cameraMemento.restoreCamera(scene);

        return new StoreyImage(storeyId, src, format, width, height, padding);
    }

    _arrangeImageCamera() {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;
        const aabb = this.viewer.scene.aabb;
        const look = math.getAABB3Center(aabb);
        const sca = 0.5;
        const eye = tempVec3a;
        eye[0] = look[0] + (camera.worldUp[0] * sca);
        eye[1] = look[1] + (camera.worldUp[1] * sca);
        eye[2] = look[2] + (camera.worldUp[2] * sca);
        const up = camera.worldForward;
        viewer.cameraFlight.jumpTo({eye: eye, look: look, up: up});
        const xsize = aabb[3] - aabb[0];
        const ysize = aabb[4] - aabb[1];
        const zsize = aabb[5] - aabb[2];
        const xmin = (xsize * -0.5);
        const xmax = (xsize * +0.5);
        const ymin = (ysize * -0.5);
        const ymax = (ysize * +0.5);
        const zmin = (zsize * -0.5);
        const zmax = (zsize * +0.5);
        viewer.camera.customProjection.matrix = math.orthoMat4c(xmin, xmax, zmin, zmax, ymin, ymax, tempMat4);
        viewer.camera.projection = "customProjection";
    }

    /**
     * Attempts to pick an {@link Entity} at the given 2D pixel coordinates within a {@link StoreyImage}.
     *
     * @param {StoreyImage} storeyImage The StoreyImage.
     * @param {Number[]} imagePos 2D pixel coordinates within the bounds of {@link }StoreyImage#img.
     * @param {*} [options] Picking options.
     * @param {Boolean} [options.pickSurface=false] Whether to find the picked position on the surface of the Entity.
     * @returns {PickResult} The pick result, if an Entity was picked.
     */
    pickStoreyImage(storeyImage, imagePos, options={}) {

        const storeyId = storeyImage.storeyId;
        const storey = this.storeys[storeyId];

        if (!storey) {
            this.error("IfcBuildingStorey not found with this ID: " + storeyId);
            return worldPos
        }

        const worldUp = this.viewer.camera.worldUp;
        const worldForward = this.viewer.camera.worldForward;
        const worldRight = this.viewer.camera.worldRight;

        const normX = 1.0 - (imagePos[0] / storeyImage.width);
        const normZ = 1.0 - (imagePos[1] / storeyImage.height);

        const aabb = storey.aabb;

        const xmin = aabb[0];
        const ymin = aabb[1];
        const zmin = aabb[2];
        const xmax = aabb[3];
        const ymax = aabb[4];
        const zmax = aabb[5];

        const aabbWidthX = xmax - xmin;
        const aabbWidthY = ymax - ymin;
        const aabbWidthZ = zmax - zmin;

        const origin = math.vec3([
            xmin + (aabbWidthX * normX),
            ymax,
            zmin + (aabbWidthZ * normZ)
        ]);

        const direction = math.vec3([0, -1, 0]);

        console.log("origin = " + origin + ", direction = " + direction);

        const pickResult = this.viewer.scene.pick({  // Picking with arbitrarily-positioned ray
            pickSurface: options.pickSurface,
            origin: [15, 60, -15],
            direction: [0, -1, 0],
            includeEntityIds: this.viewer.metaScene.getObjectIDsInSubtree(storeyId)
        });

        if (pickResult) {
            alert("yes!");

        }
        return pickResult;
        //
        // if (pickResult) { // Picked an Entity with the ray
        //
        //     var worldPos = pickResult.worldPos; // Float32Array containing the picked World-space position on the Entity surface
        //     var worldNormal = pickResult.worldNormal; // Float32Array containing the picked World-space normal vector on the Entity Surface
        // }
        //
        // return worldPos;
    }

    /**
     * Destroys this StoreyPlansPlugin.
     */
    destroy() {
        this.viewer.scene.off(this._onModelLoaded);
        super.destroy();
    }
}

export {StoreyPlansPlugin}
