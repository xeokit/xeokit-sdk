import {Plugin, SceneModel, worldToRTCPositions} from "../../viewer/index.js";
import {math} from "../../viewer/scene/math/math.js";
import {IFCOpenShellDefaultDataSource} from "./IFCOpenShellDefaultDataSource.js";
import {IFCObjectDefaults} from "../../viewer/metadata/IFCObjectDefaults.js";


/**
 * {@link Viewer} plugin that uses [IfcOpenShell](https://ifcopenshell.org/) to load BIM models directly from IFC files.
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/index.html#BIMOffline_IFCOpenShellLoaderPlugin_Duplex"><img src="https://xeokit.io/img/docs/IFCOpenShellLoaderPlugin/IFCOpenShellLoaderPlugin.png"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#BIMOffline_IFCOpenShellLoaderPlugin_Duplex)]
 *
 * ## Overview
 *
 * * Loads small-to-medium sized BIM models directly from IFC files.
 * * Uses [IfcOpenShell](https://ifcopenshell.org/) to parse IFC files in the browser.
 * * Loads IFC geometry, element structure metadata, and property sets.
 * * Not for large models. For best performance with large models, we recommend using {@link XKTLoaderPlugin}.
 * * Loads double-precision coordinates, enabling models to be viewed at global coordinates without accuracy loss.
 * * Filter which IFC types get loaded.
 * * Configure initial appearances of specified IFC types.
 * * Set a custom data source for IFC files.
 *
 * ## Limitations
 *
 * Loading and parsing huge IFC STEP files can be slow, and can overwhelm the browser, however. To view your
 * largest IFC models, we recommend instead pre-converting those to xeokit's compressed native .XKT format, then
 * loading them with {@link XKTLoaderPlugin} instead.</p>
 *
 * ## Scene representation
 *
 * When loading a model, IFCOpenShellLoaderPlugin creates an {@link Entity} that represents the model, which
 * will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id}
 * in {@link Scene#models}. The IFCOpenShellLoaderPlugin also creates an {@link Entity} for each object within the
 * model. Those Entities will have {@link Entity#isObject} set ````true```` and will be registered
 * by {@link Entity#id} in {@link Scene#objects}.
 *
 * ## Metadata
 *
 * When loading a model, IFCOpenShellLoaderPlugin also creates a {@link MetaModel} that represents the model, which contains
 * a {@link MetaObject} for each IFC element, plus a {@link PropertySet} for each IFC property set. Loading metadata
 * can be very slow, so we can also optionally disable it if we don't need it.
 *
 * ## Usage
 *
 * In the example below we'll load the Duplex BIM model from
 * an [IFC file](https://github.com/xeokit/xeokit-sdk/tree/master/assets/models/ifc). Within our {@link Viewer}, this
 * will create a bunch of {@link Entity}s that represents the model and its objects, along with a {@link MetaModel},
 * {@link MetaObject}s and {@link PropertySet}s that hold their metadata.
 *
 * Since this model contains IFC types, the IFCOpenShellLoaderPlugin will set the initial appearance of each object
 * {@link Entity} according to its IFC type in {@link IFCOpenShellLoaderPlugin#objectDefaults}.
 *
 * * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/index.html#BIMOffline_IFCOpenShellLoaderPlugin_isolateStorey)]
 *
 * ````javascript
 * import {Viewer, IFCOpenShellLoaderPlugin} from "xeokit-sdk.es.js";
 * import * as WebIFC from "https://cdn.jsdelivr.net/npm/web-ifc@0.0.51/web-ifc-api.js";
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // 1. Create a Viewer,
 * // 2. Arrange the camera
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 * });
 *
 * // 2
 * viewer.camera.eye = [-2.56, 8.38, 8.27];
 * viewer.camera.look = [13.44, 3.31, -14.83];
 * viewer.camera.up = [0.10, 0.98, -0.14];
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // 1. Create a web-ifc API, which will parse IFC for our IFCOpenShellLoaderPlugin
 * // 2. Connect the API to the web-ifc WASM module, which powers the parsing
 * // 3. Initialize the web-ifc API
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 *
 * const IfcAPI = new this._webIFC.IfcAPI();
 *
 * // 2
 *
 * IfcAPI.SetWasmPath("https://cdn.jsdelivr.net/npm/web-ifc@0.0.51/");
 *
 * // 3
 *
 * IfcAPI.Init().then(() => {
 *
 *      //------------------------------------------------------------------------------------------------------------
 *      // 1. Create a IFCOpenShellLoaderPlugin, configured with the web-ifc module and a web-ifc API instance
 *      // 2. Load a BIM model fom an IFC file, excluding its IfcSpace elements, and highlighting edges
 *      //------------------------------------------------------------------------------------------------------------
 *
 *     const ifcLoader = new IFCOpenShellLoaderPlugin(viewer, {
 *         WebIFC,
 *         IfcAPI
 *     });
 *
 *     // 2
 *     const model = ifcLoader.load({          // Returns an Entity that represents the model
 *         id: "myModel",
 *         src: "../assets/models/ifc/Duplex.ifc",
 *         excludeTypes: ["IfcSpace"],
 *         edges: true
 *     });
 *
 *     model.on("loaded", () => {
 *
 *         //----------------------------------------------------------------------------------------------------------
 *         // 1. Find metadata on the bottom storey
 *         // 2. X-ray all the objects except for the bottom storey
 *         // 3. Fit the bottom storey in view
 *         //----------------------------------------------------------------------------------------------------------
 *
 *         // 1
 *         const metaModel = viewer.metaScene.metaModels["myModel"];       // MetaModel with ID "myModel"
 *         const metaObject
 *                 = viewer.metaScene.metaObjects["1xS3BCk291UvhgP2dvNsgp"];  // MetaObject with ID "1xS3BCk291UvhgP2dvNsgp"
 *
 *         const name = metaObject.name;                                   // "01 eerste verdieping"
 *         const type = metaObject.type;                                   // "IfcBuildingStorey"
 *         const parent = metaObject.parent;                               // MetaObject with type "IfcBuilding"
 *         const children = metaObject.children;                           // Array of child MetaObjects
 *         const objectId = metaObject.id;                                 // "1xS3BCk291UvhgP2dvNsgp"
 *         const objectIds = viewer.metaScene.getObjectIDsInSubtree(objectId);   // IDs of leaf sub-objects
 *         const aabb = viewer.scene.getAABB(objectIds);                   // Axis-aligned boundary of the leaf sub-objects
 *
 *         // 2
 *         viewer.scene.setObjectsXRayed(viewer.scene.objectIds, true);
 *         viewer.scene.setObjectsXRayed(objectIds, false);
 *
 *         // 3
 *         viewer.cameraFlight.flyTo(aabb);
 *
 *         // Find the model Entity by ID
 *         model = viewer.scene.models["myModel"];
 *
 *         // Destroy the model
 *         model.destroy();
 *     });
 * });
 * ````
 *
 * ## Including and excluding IFC types
 *
 * We can also load only those objects that have the specified IFC types.
 *
 * In the example below, we'll load only the objects that represent walls.
 *
 * ````javascript
 * const model2 = ifcLoader.load({
 *     id: "myModel2",
 *     src: "../assets/models/ifc/Duplex.ifc",
 *     includeTypes: ["IfcWallStandardCase"]
 * });
 * ````
 *
 * We can also load only those objects that **don't** have the specified IFC types.
 *
 * In the example below, we'll load only the objects that do not represent empty space.
 *
 * ````javascript
 * const model3 = ifcLoader.load({
 *     id: "myModel3",
 *     src: "../assets/models/ifc/Duplex.ifc",
 *     excludeTypes: ["IfcSpace"]
 * });
 * ````
 *
 * ## Configuring initial IFC object appearances
 *
 * We can specify the custom initial appearance of loaded objects according to their IFC types.
 *
 * This is useful for things like:
 *
 * * setting the colors to our objects according to their IFC types,
 * * automatically hiding ````IfcSpace```` objects, and
 * * ensuring that ````IfcWindow```` objects are always transparent.
 * <br>
 * In the example below, we'll load a model, while configuring ````IfcSpace```` elements to be always initially invisible,
 * and ````IfcWindow```` types to be always translucent blue.
 *
 * ````javascript
 * const myObjectDefaults = {
 *
 *      IfcSpace: {
 *          visible: false
 *      },
 *      IfcWindow: {
 *          colorize: [0.337255, 0.303922, 0.870588], // Blue
 *          opacity: 0.3
 *      },
 *
 *      //...
 *
 *      DEFAULT: {
 *          colorize: [0.5, 0.5, 0.5]
 *      }
 * };
 *
 * const model4 = ifcLoader.load({
 *      id: "myModel4",
 *      src: "../assets/models/ifc/Duplex.ifc",
 *      objectDefaults: myObjectDefaults // Use our custom initial default states for object Entities
 * });
 * ````
 *
 * When we don't customize the appearance of IFC types, as just above, then IfcSpace elements tend to obscure other
 * elements, which can be confusing.
 *
 * It's often helpful to make IfcSpaces transparent and unpickable, like this:
 *
 * ````javascript
 * const ifcLoader = new IFCOpenShellLoaderPlugin(viewer, {
 *    wasmPath: "../dist/",
 *    objectDefaults: {
 *        IfcSpace: {
 *            pickable: false,
 *            opacity: 0.2
 *        }
 *    }
 * });
 * ````
 *
 * Alternatively, we could just make IfcSpaces invisible, which also makes them unpickable:
 *
 * ````javascript
 * const ifcLoader = new IFCOpenShellLoaderPlugin(viewer, {
 *    wasmPath: "../dist/",
 *    objectDefaults: {
 *        IfcSpace: {
 *            visible: false
 *        }
 *    }
 * });
 * ````
 *
 * ## Configuring a custom data source
 *
 * By default, IFCOpenShellLoaderPlugin will load IFC files over HTTP.
 *
 * In the example below, we'll customize the way IFCOpenShellLoaderPlugin loads the files by configuring it with our own data source
 * object. For simplicity, our custom data source example also uses HTTP, using a couple of xeokit utility functions.
 *
 * ````javascript
 * import {utils} from "xeokit-sdk.es.js";
 *
 * class MyDataSource {
 *
 *      constructor() {
 *      }
 *
 *      // Gets the contents of the given IFC file in an arraybuffer
 *      getIFC(src, ok, error) {
 *          console.log("MyDataSource#getIFC(" + IFCSrc + ", ... )");
 *          utils.loadArraybuffer(src,
 *              (arraybuffer) => {
 *                  ok(arraybuffer);
 *              },
 *              function (errMsg) {
 *                  error(errMsg);
 *              });
 *      }
 * }
 *
 * const ifcLoader2 = new IFCOpenShellLoaderPlugin(viewer, {
 *       dataSource: new MyDataSource()
 * });
 *
 * const model5 = ifcLoader2.load({
 *      id: "myModel5",
 *      src: "../assets/models/ifc/Duplex.ifc"
 * });
 * ````
 *
 * ## Loading multiple copies of a model, without object ID clashes
 *
 * Sometimes we need to load two or more instances of the same model, without having clashes
 * between the IDs of the equivalent objects in the model instances.
 *
 * As shown in the example below, we do this by setting {@link IFCOpenShellLoaderPlugin#globalizeObjectIds} ````true```` before we load our models.
 *
 * ````javascript
 * ifcLoader.globalizeObjectIds = true;
 *
 * const model = ifcLoader.load({
 *      id: "model1",
 *      src: "../assets/models/ifc/Duplex.ifc"
 * });
 *
 * const model2 = ifcLoader.load({
 *    id: "model2",
 *    src: "../assets/models/ifc/Duplex.ifc"
 * });
 * ````
 *
 * For each {@link Entity} loaded by these two calls, {@link Entity#id} and {@link MetaObject#id} will get prefixed by
 * the ID of their model, in order to avoid ID clashes between the two models.
 *
 * An Entity belonging to the first model will get an ID like this:
 *
 * ````
 * myModel1#0BTBFw6f90Nfh9rP1dlXrb
 * ````
 *
 * The equivalent Entity in the second model will get an ID like this:
 *
 * ````
 * myModel2#0BTBFw6f90Nfh9rP1dlXrb
 * ````
 *
 * Now, to update the visibility of both of those Entities collectively, using {@link Scene#setObjectsVisible}, we can
 * supply just the IFC product ID part to that method:
 *
 * ````javascript
 * myViewer.scene.setObjectVisibilities("0BTBFw6f90Nfh9rP1dlXrb", true);
 * ````
 *
 * The method, along with {@link Scene#setObjectsXRayed}, {@link Scene#setObjectsHighlighted} etc, will internally expand
 * the given ID to refer to the instances of that Entity in both models.
 *
 * We can also, of course, reference each Entity directly, using its globalized ID:
 *
 * ````javascript
 * myViewer.scene.setObjectVisibilities("myModel1#0BTBFw6f90Nfh9rP1dlXrb", true);
 *````
 *
 * @class IFCOpenShellLoaderPlugin
 * @since 2.6.90
 */
export class IFCOpenShellLoaderPlugin extends Plugin {

    /**
     * @param {Viewer} viewer
     * @param {Object} cfg
     * @param {String} [cfg.id="IFCOpenShellLoader"]
     * @param {Object} [cfg.objectDefaults] Default object states (fallbacks to {@link IFCObjectDefaults}).
     * @param {Object} [cfg.dataSource] Custom data source (defaults to {@link IFCOpenShellDefaultDataSource}).
     * @param {Object} cfg.ifcopenshell       IfcOpenShell API (required).
     * @param {Object} cfg.ifcopenshell_geom  IfcOpenShell geometry API (required).
     */
    constructor(viewer, cfg) {

        super("IFCOpenShellLoader", viewer, cfg);

        if (!cfg) throw new Error("IFCOpenShellLoaderPlugin: No configuration given");
        if (!cfg.workerSrc) throw new Error("IFCOpenShellLoaderPlugin: No workerSrc given");
        if (!cfg.wheelURL) throw new Error("IFCOpenShellLoaderPlugin: No wheelURL given");

        this.dataSource = cfg.dataSource;
        this.objectDefaults = cfg.objectDefaults;

        if (!this._workerReadyPromise) {

            const workerURL = new URL(cfg.workerSrc, import.meta.url);
            const worker = new Worker(workerURL.href);

            this._worker = worker;

            this._workerReadyPromise = new Promise((resolve, reject) => {

                const onMessage = (ev) => {
                    const data = ev.data;
                    if (!data) {
                        return;
                    }
                    if (data.type === "ready") {
                        worker.removeEventListener("message", onMessage);
                        resolve(worker);

                    } else if (data.type === "error") {
                        worker.removeEventListener("message", onMessage);
                        reject(new Error(data.message + "\n" + (data.stack || "")));
                    }
                };

                worker.addEventListener("message", onMessage);

                worker.postMessage({
                    type: "init",
                    indexURL: cfg.indexURL || "https://cdn.jsdelivr.net/pyodide/v0.28.0a3/full",
                    wheelURL: cfg.wheelURL || "../../dist/ifcopenshell-0.8.3+34a1bc6-cp313-cp313-emscripten_4_0_9_wasm32.whl"
                });
            });
        }
    }

    // ----------------------
    // Data source
    // ----------------------

    set dataSource(value) {
        this._dataSource = value || new IFCOpenShellDefaultDataSource();
    }

    get dataSource() {
        return this._dataSource;
    }

    // ----------------------
    // Object defaults
    // ----------------------

    set objectDefaults(value) {
        this._objectDefaults = value || IFCObjectDefaults;
    }

    get objectDefaults() {
        return this._objectDefaults;
    }

    // ----------------------
    // Loading
    // ----------------------

    /**
     * Loads an IFC model from a file or text into the {@link Viewer}.
     *
     * @param {Object} params
     * @param {String} [params.id] Optional root Entity ID.
     * @param {String} [params.src] IFC file path (alternative to `text`).
     * @param {String} [params.text] IFC text (alternative to `src`).
     * @param {{String:Object}} [params.objectDefaults]
     * @param {String[]} [params.includeTypes]
     * @param {String[]} [params.excludeTypes]
     * @param {Number[]} [params.origin=[0,0,0]]
     * @param {Number[]} [params.position=[0,0,0]]
     * @param {Number[]} [params.rotation=[0,0,0]]
     * @param {Boolean} [params.backfaces=true]
     * @param {Boolean} [params.dtxEnabled=true]
     * @returns {Entity}
     */
    async load(params = {}) {

        let {id, backfaces, dtxEnabled, rotation, origin, loadMetadata} = params;

        if (id && this.viewer.scene.components[id]) {
            this.error(`Component with this ID already exists: ${id} - autogenerating SceneModel ID`);
            id = null;
        }

        const sceneModel = new SceneModel(this.viewer.scene, {
            id,
            isModel: true,
            backfaces,
            dtxEnabled,
            rotation,
            origin
        });

        const modelId = sceneModel.id;

        if (!params.src && !params.text) {
            this.error("load() expected 'src' or 'text'");
            return sceneModel; // Return empty model
        }

        const worker = await this._workerReadyPromise;

        const cache = {};

        const onMessage = (ev) => {
            const data = ev.data;
            if (!data) {
                return;
            }
            if (data.type === "object") {
                this._parseElement(sceneModel, data.payload, cache);

            } else if (data.type === "metamodel") {
                this.viewer.metaScene.createMetaModel(modelId, data.metaModel);

            } else if (data.type === "done") {
                worker.removeEventListener("message", onMessage);
                sceneModel.finalize();
                sceneModel.scene.once("tick", () => {
                    if (!sceneModel.destroyed) {
                        sceneModel.scene.fire("modelLoaded", sceneModel.id);
                        sceneModel.fire("loaded", true, false);
                    }
                });
                this.fire("loaded", {id, sceneModel, count: data.count});

            } else if (data.type === "error") {
                worker.removeEventListener("message", onMessage);
                console.error("Worker error:", data.message, data.stack);
                this.fire("error", {id, error: data.message});
            }
        };

        worker.addEventListener("message", onMessage);

        const geometryLibrary = "hybrid-cgal-simple-opencascade";

        worker.postMessage({
            type: "load",
            ifcUrl: params.src,
            exclude: params.excludeTypes,
            geometryLibrary,
            loadMetadata
        });

        sceneModel.once("destroyed", () => {
            this.viewer.metaScene.destroyMetaModel(modelId);
        });


        return sceneModel;
    }

    _parseElement(sceneModel, payload, cache) {

        const bundles = this._getOrBuildBundles(sceneModel, cache, payload);
        const {origin, matrix} = this._extractRTCTransform(payload);

        const meshIds = bundles.map((b) => {

            const meshId = math.createUUID();

            sceneModel.createMesh({
                id: meshId,
                origin,
                matrix,
                geometryId: b.geometryId,
                color: b.material.diffuse,    // expecting [r,g,b] in 0..1; map to 0..255 if your engine needs it
                opacity: 1.0 - b.material.transparency
            });
            return meshId;
        });

        return sceneModel.createEntity({
            id: payload.id,
            isObject: true,
            meshIds
        });
    }

    /**
     * Returns cached bundles for a geometry or builds them once and caches.
     */
    _getOrBuildBundles(sceneModel, cache, payload) {

        if (cache.last_mesh_id === payload.geometry_id) {
            return cache.last_bundles;
        }

        const {
            materials,
            mapping,
            positions,
            normals,
            edgeIndices,
            faceIndices
        } = this._buildMaterialsAndMapping(payload);

        const bundles = [];

        materials.forEach((material, mi) => {
            const faceList = mapping[mi] || [];
            if (faceList.length === 0) {
                return;
            }

            const indices = this._buildIndicesForFaces(faceList, faceIndices);

            const geometryId = math.createUUID()

            sceneModel.createGeometry({
                id: geometryId,
                primitive: "triangles",
                positions,
                normals,
                indices,
                edgeIndices
            });

            bundles.push({
                geometryId,
                material,
                kind: "tri"
            });
        });

        cache.last_mesh_id = payload.geometry_id;
        cache.last_bundles = bundles;

        return bundles;
    }

    /**
     * Builds materials, material->faces mapping, and base buffers.
     * Handles a missing material (-1) by injecting a default neutral material.
     */
    _buildMaterialsAndMapping(payload) {

        // Base buffers
        const positions = payload.verts;
        const normals = payload.normals;
        const edgeIndices = payload.edges;
        const faceIndices = payload.faces;

        // Raw material info
        const materials = payload.materials;
        const materialIds = payload.material_ids;

        // Inject default material for faces with -1
        let defaultMaterialIndex = -1;
        if (materialIds.some((id) => id === -1)) {
            defaultMaterialIndex = materials.length;
            materials.push({
                color: [0.6, 0.6, 0.6],
                opacity: 1.0,
                backfaces: true
            });
        }

        // Build mapping: materialIndex -> [faceIdx...]
        const mapping = {};
        for (let faceIdx = 0; faceIdx < materialIds.length; faceIdx++) {
            const rawId = materialIds[faceIdx];
            const matIndex = rawId === -1 ? defaultMaterialIndex : rawId;
            if (matIndex == null || matIndex < 0) {
                continue;
            }
            (mapping[matIndex] ||= []).push(faceIdx);
        }

        return {materials, mapping, positions, normals, edgeIndices, faceIndices};
    }

    /**
     * Builds a flat index buffer for a list of face indices.
     */
    _buildIndicesForFaces(faceList, faceIndices) {
        const indices = new Uint32Array(faceList.length * 3);
        let k = 0;
        for (const f of faceList) {
            indices[k++] = faceIndices[3 * f + 0];
            indices[k++] = faceIndices[3 * f + 1];
            indices[k++] = faceIndices[3 * f + 2];
        }
        return indices;
    }

    /**
     * Extracts RTC origin + adjusted matrix from an IFC transform.
     * - Converts the 2D matrix array into flat mat4 order
     * - Moves translation into RTC origin and patches the matrix translation
     */
    _extractRTCTransform(payload) {
        const matrix = this._flattenMatrixArray(payload.transform);
        const origin = math.vec3();
        const worldOrigin = matrix.slice(12, 15); // translation xyz
        worldToRTCPositions(worldOrigin, worldOrigin, origin);
        matrix.set(worldOrigin, 12);
        return {origin, matrix};
    }

    _flattenMatrixArray(m) {
        return math.mat4([
            m[0][0], m[2][0], -m[1][0], m[3][0],
            m[0][1], m[2][1], -m[1][1], m[3][1],
            m[0][2], m[2][2], -m[1][2], m[3][2],
            m[0][3], m[2][3], -m[1][3], m[3][3]
        ]);
    }

    destroy() {
        super.destroy();
    }
}
