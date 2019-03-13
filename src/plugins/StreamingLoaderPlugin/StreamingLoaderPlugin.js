import {utils} from "../../viewer/scene/utils.js"
import {PerformanceModel} from "../../viewer/scene/PerformanceModel/PerformanceModel.js";
import {Node} from "../../viewer/scene/nodes/Node.js";
import {Plugin} from "../../viewer/Plugin.js";
import {MockServer} from "./lib/MockServer.js";
import {IFCObjectDefaults} from "../../viewer/metadata/IFCObjectDefaults.js";

/**
 * A {@link Viewer} plugin that loads models from a streaming content server.
 *
 * * Creates an {@link Entity} representing each model it loads, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}.
 * * Creates an {@link Entity} for each object within the model. Those Entities will have {@link Entity#isObject} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#objects}.
 * * When loading, can set the World-space position, scale and rotation of each model within World space, along with initial properties for all the model's {@link Entity}s.
 *
 * ## Usage
 *
 * In the example below we'll load the Schependomlaan model from a [glTF file](http://xeokit.github.io/xeokit-sdk/examples/models/gltf/schependomlaan/).
 *
 * This will create a bunch of {@link Entity}s that represents the model and its objects.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#Streaming_Test)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {StreamingLoaderPlugin} from "../src/plugins/StreamingLoaderPlugin/SstreamingLoaderPlugin.js";
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // 1. Create a Viewer,
 * // 2. Arrange the camera,
 * // 3. Tweak the selection material (tone it down a bit)
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 * });
 *
 * // 2
 * viewer.camera.orbitPitch(20);
 * viewer.camera.orbitYaw(-45);
 *
 * // 3
 * viewer.scene.selectedMaterial.fillAlpha = 0.1;
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // 1. Create a streaming loader plugin,
 * // 2. Load a building model
 * // 3. Emphasis the edges to make it look nice
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 * const streamingLoader = new StreamingLoaderPlugin(viewer);
 *
 * // 2
 * var model = streamingLoader.load({                                    // Returns an Entity that represents the model
 *      id: "myModel",
 *      src: "myModelStream",
 *      edges: true,
 *      performance: true  // Load the default high-performance scene representation
 * });
 *
 * model.on("loaded", () => {
 *      viewer.cameraFlight.flyTo(aabb);
 * });
 *
 * // Find the model Entity by ID
 * model = viewer.scene.models["myModel"];
 *
 * // Destroy the model
 * model.destroy();
 * ````
 *
 * @class StreamingLoaderPlugin
 */
class StreamingLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="GLTFLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} [cfg.objectDefaults] Map of initial default states for each loaded {@link Entity} that represents an object.  Default value is {@link IFCObjectDefaults}.
     */
    constructor(viewer, cfg = {}) {

        super("StreamingLoader", viewer, cfg);

        this._server = cfg.server || new MockServer();

        this.objectDefaults = cfg.objectDefaults;

        this._modelManifests = {}; // Model manifests requested from server with load()
        this._modelStreamingStates = {};

        this._server.setOnResponse((message) => {
            this._handleResponse(message);
        });
    }

    _handleResponse(message) {

        if (message.error) {
            this.error(message.error);
            return;
        }

        switch (message.message) {

            case "models":
                const models = message.models;
                for (let i = 0, len = models.length; i < len; i++) {
                    const modelManifest = models[i];
                    const modelId = modelManifest.id;
                    if (!modelId) {
                        this.error("model manifest property expected: id");
                        continue;
                    }
                    const model = this.viewer.scene.models[modelId];
                    if (!model) {
                        this.error("model not found in scene: " + modelId);
                        continue;
                    }
                    this._modelManifests[modelId] = modelManifest;
                    this._modelStreamingStates[modelId] = {
                        geometryMeshesWaiting: {}
                    };
                    model.on("destroyed", () => {
                        delete this._modelManifests[modelId];
                        delete this._modelStreamingStates[modelId];
                    });
                }
                break;

            case "objects":
                const objects = message.objects;
                for (let i = 0, len = objects.length; i < len; i++) {
                    const object = objects[i];
                    const modelId = mesh.modelId;
                    if (!modelId) {
                        this.error("object property expected: modelId");
                        continue;
                    }
                    const model = this.viewer.scene.models[modelId];
                    if (!model) {
                        this.error("model not found in scene: " + modelId);
                        continue;
                    }
                    const meshes = object.meshes;
                    for (let j = 0, lenj = meshes.length; j < lenj; j++) {
                        const mesh = meshes[j];
                        if (!mesh.geometryId) {
                            model.createMesh(mesh);
                        } else {
                            const modelStreamingState = this._modelStreamingStates[modelId];
                            if (modelStreamingState) {
                                const geometryId = mesh.geometryId;
                                if (!model.hasGeometry(geometryId)) {
                                    if (!modelStreamingState.geometryMeshesWaiting[geometryId]) {
                                        modelStreamingState.geometryMeshesWaiting[geometryId] = [];
                                    }
                                    modelStreamingState.geometryMeshesWaiting[geometryId].push(mesh);
                                    if (modelStreamingState.geometryMeshesWaiting[geometryId].length === 1) {
                                        this.send({"message": "getGeometries", "geometryIds": [geometryId]})
                                    }
                                } else {
                                    model.createMesh(mesh);
                                }
                            }
                        }
                    }
                }
                break;

            case "geometries":
                const geometries = message.geometries;
                for (let i = 0, len = geometries.length; i < len; i++) {
                    const geometry = geometries[i];
                    const modelId = geometry.modelId;
                    if (!modelId) {
                        this.error("geometry property expected: modelId");
                        continue;
                    }
                    const modelStreamingState = this._modelStreamingStates[modelId];
                    if (modelStreamingState) {
                        const model = this.viewer.scene.models[modelId];
                        if (!model) {
                            this.error("model not found in scene: " + modelId);
                            continue;
                        }
                        const geometryId = geometry.id;
                        if (model.hasGeometry(geometryId)) {
                            this.error("geometry already loaded: " + geometryId);
                            continue;
                        }
                        model.createGeometry(geometry);
                        const meshesWaiting = modelStreamingState.geometryMeshesWaiting[geometryId];
                        if (meshesWaiting) {
                            for (let i = 0, len = meshesWaiting.length; i < len; i++) {
                                const mesh = meshesWaiting[i];
                                model.createMesh(mesh);
                            }
                        }
                        delete modelStreamingState.geometryMeshesWaiting[geometryId];
                    }
                }
                break;
        }
    }

    /**
     * Sets map of initial default states for each loaded {@link Entity} that represents an object.
     *
     * Default value is {@link IFCObjectDefaults}.
     *
     * @type {{String: Object}}
     */
    set objectDefaults(value) {
        this._objectDefaults = value || IFCObjectDefaults;
    }

    /**
     * Gets map of initial default states for each loaded {@link Entity} that represents an object.
     *
     * Default value is {@link IFCObjectDefaults}.
     *
     * @type {{String: Object}}
     */
    get objectDefaults() {
        return this._objectDefaults;
    }

    /**
     * Loads a model into this StreamingLoaderPlugin's {@link Viewer}.
     *
     * @param {*} params Loading parameters.
     * @param {String} [params.src] ID of model on server.
     * @param {String} [params.id] ID to assign to the root {@link Entity#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default.
     * @param {Boolean} [params.edges=false] Whether or not xeokit renders the model with edges emphasized.
     * @param {Number[]} [params.position=[0,0,0]] The model World-space 3D position.
     * @param {Number[]} [params.scale=[1,1,1]] The model's World-space scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model's World-space rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model's world transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [params.backfaces=false] When true, allows visible backfaces, wherever specified in the glTF. When false, ignores backfaces.
     * @param {Number} [params.edgeThreshold=20] When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @returns {Entity} Entity representing the model, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}
     */
    load(params = {}) {
        if (!params.src) {
            this.error("load() param expected: src");
            return;
        }
        if (params.id && this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
        }
        const model = new PerformanceModel(this.viewer.scene, utils.apply(params, {
            isModel: true
        }));
        this._server.send({"message": "getModels", "modelIds": [params.src]});
        return model;
    }
}

export {StreamingLoaderPlugin}