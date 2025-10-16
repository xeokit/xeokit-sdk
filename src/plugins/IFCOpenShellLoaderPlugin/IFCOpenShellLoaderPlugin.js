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
 * * Uses [IfcOpenShell API](https://ifcopenshell.org/) to parse IFC files in the browser.
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
 * ````javascript
 * import {Viewer, IFCOpenShellLoaderPlugin, NavCubePlugin, TreeViewPlugin} from "../../dist/xeokit-sdk.es.js";
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
 * viewer.camera.eye = [-3.933, 2.855, 27.018];
 * viewer.camera.look = [4.400, 3.724, 8.899];
 * viewer.camera.up = [-0.018, 0.999, 0.039];
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // 1. Create the IFCOpenShellLoaderPlugin,
 * // 2. Load an IFC model
 * //------------------------------------------------------------------------------------------------------------------
 *
 * // 1
 *
 * const ifcLoader = new IFCOpenShellLoaderPlugin(viewer, {
 *     workerSrc: "./my/directory/IFCOpenShellWorker.js",
 *     wheelURL: "./my/directory/ifcopenshell-0.8.3+34a1bc6-cp313-cp313-emscripten_4_0_9_wasm32.whl"
 * });
 *
 * // 2
 * const model = ifcLoader.load({          // Returns an Entity that represents the model
 *    id: "myModel",
 *    src: "../assets/models/ifc/Duplex.ifc",
 *    excludeTypes: ["IfcSpace"],
 *    edges: true
 * });
 *
 * model.on("loaded", () => {
 *
 *    //----------------------------------------------------------------------------------------------------------
 *    // 1. Find metadata on the bottom storey
 *    // 2. X-ray all the objects except for the bottom storey
 *    // 3. Fit the bottom storey in view
 *    //----------------------------------------------------------------------------------------------------------
 *
 *    // 1
 *    const metaModel = viewer.metaScene.metaModels["myModel"];       // MetaModel with ID "myModel"
 *    const metaObject
 *            = viewer.metaScene.metaObjects["1xS3BCk291UvhgP2dvNsgp"];  // MetaObject with ID "1xS3BCk291UvhgP2dvNsgp"
 *
 *    const name = metaObject.name;                                   // "01 eerste verdieping"
 *    const type = metaObject.type;                                   // "IfcBuildingStorey"
 *    const parent = metaObject.parent;                               // MetaObject with type "IfcBuilding"
 *    const children = metaObject.children;                           // Array of child MetaObjects
 *    const objectId = metaObject.id;                                 // "1xS3BCk291UvhgP2dvNsgp"
 *    const objectIds = viewer.metaScene.getObjectIDsInSubtree(objectId);   // IDs of leaf sub-objects
 *    const aabb = viewer.scene.getAABB(objectIds);                   // Axis-aligned boundary of the leaf sub-objects
 *
 *    // 2
 *    viewer.scene.setObjectsXRayed(viewer.scene.objectIds, true);
 *    viewer.scene.setObjectsXRayed(objectIds, false);
 *
 *    // 3
 *    viewer.cameraFlight.flyTo(aabb);
 *
 *    // Find the model Entity by ID
 *    model = viewer.scene.models["myModel"];
 *
 *    // Destroy the model
 *    model.destroy();
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

    /**
     * Sets a custom data source for IFC files.
     * @param value
     */
    set dataSource(value) {
        this._dataSource = value || new IFCOpenShellDefaultDataSource();
    }

    /**
     * Gets the data source for IFC files.
     * @returns {*|IFCOpenShellDefaultDataSource}
     */
    get dataSource() {
        return this._dataSource;
    }

    /**
     *  Sets default object states for objects loaded with this IFCOpenShellLoaderPlugin.
     * @param value
     */
    set objectDefaults(value) {
        this._objectDefaults = value || IFCObjectDefaults;
    }

    /**
     * Gets default object states for objects loaded with this IFCOpenShellLoaderPlugin.
     * @returns {*|{String: Object}}
     */
    get objectDefaults() {
        return this._objectDefaults;
    }

    /**
     * Gets whether IFCOpenShellLoaderPlugin globalizes each {@link Entity#id} and {@link MetaObject#id} as it loads a model.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    get globalizeObjectIds() {
        return this._globalizeObjectIds;
    }

    /**
     * Sets whether IFCOpenShellLoaderPlugin globalizes each {@link Entity#id} and {@link MetaObject#id} as it loads a model.
     *
     * Set  this ````true```` when you need to load multiple instances of the same model, to avoid ID clashes
     * between the objects in the different instances.
     *
     * When we load a model with this set ````true````, then each {@link Entity#id} and {@link MetaObject#id} will be
     * prefixed by the ID of the model, ie. ````<modelId>#<objectId>````.
     *
     * {@link Entity#originalSystemId} and {@link MetaObject#originalSystemId} will always hold the original, un-prefixed, ID values.
     *
     * Default value is ````false````.
     *
     * See the main {@link IFCOpenShellLoaderPlugin} class documentation for usage info.
     *
     * @type {Boolean}
     */
    set globalizeObjectIds(value) {
        this._globalizeObjectIds = !!value;
    }

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
            if (data.type === "metamodel") {
                this.viewer.metaScene.createMetaModel(modelId, data.metaModel);

            } else  if (data.type === "geometry") {
                sceneModel.createGeometry(data.payload);

            } else if (data.type === "mesh") {
                sceneModel.createMesh(data.payload);

            } else if (data.type === "entity") {
                sceneModel.createEntity(data.payload);

            }  else  if (data.type === "done") {
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

    /**
     * Destroys this IFCOpenShellLoaderPlugin instance.
     */
    destroy() {
        super.destroy();
    }
}
