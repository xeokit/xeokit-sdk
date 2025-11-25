import {math, Plugin, SceneModel, worldToRTCPositions} from "../../viewer/index.js";

import {IFCOpenShellDefaultDataSource} from "./IFCOpenShellDefaultDataSource.js";


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
 * * Filter which IFC types don't get loaded.
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
 *     ifcOpenShellURL: "./my/directory/ifcopenshell-0.8.3+34a1bc6-cp313-cp313-emscripten_4_0_9_wasm32.whl"
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
     * @param {Viewer} viewer The {@link Viewer} that will own this plugin.
     * @param {Object} cfg Plugin configuration.
     * @param {String} [cfg.id="IFCOpenShellLoader"] Optional ID for this plugin instance.
     * @param {Object} [cfg.dataSource] Custom data source (defaults to {@link IFCOpenShellDefaultDataSource}).
     * @param {Object} cfg.ifcopenshell IfcOpenShell API object.
     * @param {Object} cfg.ifcopenshell_geom IfcOpenShell geometry API object.
     */
    constructor(viewer, cfg) {

        super("IFCOpenShellLoader", viewer, cfg);

        if (!cfg) {
            throw new Error("IFCOpenShellLoaderPlugin: No configuration given");
        }

        if (!cfg.ifcopenshell) {
            throw new Error("IFCOpenShellLoaderPlugin: No ifcopenshell given");
        }

        if (!cfg.ifcopenshell_geom) {
            throw new Error("IFCOpenShellLoaderPlugin: No ifcopenshell_geom given");
        }

        this.ifcopenshell = cfg.ifcopenshell;
        this.ifcopenshell_geom = cfg.ifcopenshell_geom;

        this.dataSource = cfg.dataSource;
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
     * @param {String[]} [params.excludeTypes] Array of IFC types to exclude.
     * @param {Number[]} [params.origin=[0,0,0]] Optional World-coordinate origin to apply to the model.
     * @param {Number[]} [params.position=[0,0,0]] Optional position offset to apply to the model.
     * @param {Number[]} [params.rotation=[0,0,0]] Optional XYZ Euler rotation (degrees) to apply to the model.
     * @param {Boolean} [params.backfaces=true] Whether to render backfaces.
     * @param {Boolean} [params.dtxEnabled=true] Whether to enable data texture storage for geometry buffers.
     * @param {Boolean} [params.loadMetadata=true] Whether to load metadata.
     * @param {Boolean} [params.loadMetadataPropertySets=true] Whether to load property sets within the metadata. Only works when `loadMetadata` is true.
     * @param {Boolean} [params.edges=false] Whether to generate edge lines for the model.
     * @param {Boolean} [params.saoEnabled=false] Whether to enable SAO for the model.
     * @param {Boolean} [params.globalizeObjectIds=false] Whether to globalize each {@link Entity#id} and {@link MetaObject#id} as it loads the model.
     * @returns {Entity}
     */
    async load(params = {}) {

        let {
            id,
            backfaces = true,
            dtxEnabled = true,
            position,
            rotation,
            origin,
            loadMetadata,
            loadMetadataPropertySets,
            edges,
            saoEnabled,
            globalizeObjectIds,
            excludeTypes
        } = params;

        if (id && this.viewer.scene.components[id]) {
            this.error(`Component with this ID already exists: ${id} - autogenerating SceneModel ID`);
            id = null;
        }

        const sceneModel = new SceneModel(this.viewer.scene, {
            id,
            isModel: true,
            globalizeObjectIds,
            backfaces,
            dtxEnabled,
            position,
            rotation,
            origin,
            edges,
            saoEnabled
        });

        const modelId = sceneModel.id;

        if (!params.src && !params.text) {
            this.error("load() expected 'src' or 'text'");
            return sceneModel; // Return empty model
        }

        const spinner = this.viewer.scene.canvas.spinner;
        spinner.processes++;

        const loadIFC = (fileData) => {
            const ifc = this.ifcopenshell.file.from_string(fileData);
            const ctx = {
                loadMetadataPropertySets: (loadMetadataPropertySets !== false),
                globalizeObjectIds: globalizeObjectIds || this._globalizeObjectIds,
                geometryCache: new Map(),
                ifc,
                sceneModel
            };
            if (excludeTypes) {
                ctx.excludeTypes = excludeTypes;
            }
            this._loadIFCGeometry(ctx);
            if (loadMetadata !== false) {
                const metaModelData = this._loadIFCMetaModel(ctx, ifc);
                this.viewer.metaScene.createMetaModel(modelId, metaModelData);
            }
            this.viewer.scene.canvas.spinner.processes--;
        }

        if (params.src) {
            this.viewer.scene.canvas.spinner.processes++;
            this._dataSource.getIFC(
                params.src,
                (fileData) => {
                    loadIFC(fileData);
                    this.viewer.scene.canvas.spinner.processes--;
                },
                (err) => {
                    this.viewer.scene.canvas.spinner.processes--;
                    this.error(err);
                }
            );
        } else {
            loadIFC(params.text);
        }

        sceneModel.once("destroyed", () => {
            this.viewer.metaScene.destroyMetaModel(modelId);
        });

        return sceneModel;
    }

    _loadIFCGeometry(ctx) {
        const {ifc, sceneModel} = ctx;
        const {ifcopenshell_geom} = this;

        const settings = ifcopenshell_geom.settings();
        settings.set(settings.WELD_VERTICES, false);

        const iterator = ifcopenshell_geom.iterator.callKwargs({
            settings,
            file_or_filename: ifc,
            exclude: ctx.excludeTypes,
            geometry_library: "hybrid-cgal-simple-opencascade"
        });

        if (iterator.initialize()) {
            do {
                const obj = iterator.get();
                if (obj) {
                    const entity = ifc.by_id(obj.id)
                    this._parseIFCEntity(ctx, obj, entity);
                }
            } while (iterator.next());
        }

        sceneModel.finalize();

        sceneModel.scene.once("tick", () => {
            if (!sceneModel.destroyed) {
                sceneModel.scene.fire("modelLoaded", sceneModel.id);
                sceneModel.fire("loaded", true, false);
            }
        });
    }

    _parseIFCEntity(ctx, obj, ifcEntity) {
        const {sceneModel, geometryCache} = ctx;
        const geometry_id = obj.geometry.id;

        const M = obj.transformation.data().components.toJs();
        const {origin, matrix} = extractRTCTransform(M);

        if (!geometryCache.get(geometry_id)) {

            const srcMaterials = obj.geometry.materials.toJs();
            const materials = srcMaterials.map((m) => ({
                diffuse: m.diffuse.components.toJs(),
                transparency: (m.transparency
                    && !isNaN(m.transparency)) ? m.transparency : 0.0,
            }));

            const materialIds = new Int32Array(obj.geometry.material_ids.toJs());

            // Build mapping: materialIndex -> [faceIdx...]
            const mapping = buildMaterialMapping(materialIds);

            // Create sub-geometry per materialIndex, once
            const subGeoms = new Map();

            for (const [matIndexStr, faceList] of Object.entries(mapping)) {

                if (!faceList || faceList.length === 0) {
                    continue;
                }

                // xeokit auto-generates normals on the GPU side

                const positions = new Float32Array(obj.geometry.verts.toJs());
                const edgeIndices = new Uint32Array(obj.geometry.edges.toJs());
                const faces = new Uint32Array(obj.geometry.faces.toJs());
                const matIndex = Number(matIndexStr);
                const indices = buildIndicesForFaces(faceList, faces);
                const sceneGeometryId = makeSubGeometryId(geometry_id, matIndex); // deterministic

                sceneModel.createGeometry({
                    id: sceneGeometryId,
                    primitive: "triangles",
                    positions,
                    indices,
                    edgeIndices
                });

                subGeoms.set(matIndex, sceneGeometryId);
            }

            geometryCache.set(geometry_id, {
                subGeoms,
                materials,
                // store mapping as Map<number, Uint32Array> to avoid recomputing
                mapping: new Map(Object.entries(mapping).map(
                    ([k, v]) => [Number(k), new Uint32Array(v)]
                ))
            });
        }

        // Reuse cached sub-geometries to create per-object meshes

        const cached = geometryCache.get(geometry_id);
        const meshIds = [];

        for (const [matIndex, sceneGeometryId] of cached.subGeoms.entries()) {
            const material = cached.materials[matIndex] || {diffuse: [0.6, 0.6, 0.6], transparency: 0.0};
            const meshId = generateUUID();
            const diffuse = material.diffuse;
            sceneModel.createMesh({
                id: meshId,
                geometryId: sceneGeometryId,
                origin,
                matrix,
                color: [diffuse[0], diffuse[1], diffuse[2]],
                opacity: 1.0 - material.transparency
            });
            meshIds.push(meshId);
        }

        sceneModel.createEntity({
            id: ctx.globalizeObjectIds ? math.globalizeObjectId(ctx.sceneModel.id, ifcEntity.GlobalId) : ifcEntity.GlobalId,
            isObject: true,
            meshIds
        });
    }

    _loadIFCMetaModel(ctx, ifc) {

        const visited = new Set();
        const metaObjects = [];
        const propertySets = [];
        const metaObjectPropertySetIds = new Map();

        // ---- helpers -----------------------------------------------------------
        const toStr = (v) => (v === undefined || v === null) ? "" : String(v);

        function getGlobalId(entity) {
            try {
                return String(entity.GlobalId);
            } catch {
                return null;
            }
        }

        function addNode(entity, parent) {
            const id = getGlobalId(entity);
            if (!id || visited.has(id)) return false;
            visited.add(id);
            const globalizeObjectIds = ctx.globalizeObjectIds;
            const modelId = ctx.sceneModel.id;
            const propertySetIds = [];
            if (ctx.loadMetadataPropertySets) {
                // Try all possible association fields
                const associationFields = ["HasAssociations", "IsDefinedBy", "IsDecomposedBy", "ContainsElements"];
                for (const field of associationFields) {
                    const associations = entity[field];
                    if (associations && associations.length > 0) {
                        for (let j = 0; j < associations.length; j++) {
                            const rel = associations.get(j);
                            if (rel.is_a && rel.is_a() === "IfcRelDefinesByProperties") {
                                const propSet = rel.RelatingPropertyDefinition;
                                if (propSet && propSet.is_a) {
                                    // Accept both IfcPropertySet and IfcElementQuantity
                                    if (["IfcPropertySet", "IfcElementQuantity"].includes(propSet.is_a())) {
                                        const propSetId = propSet.GlobalId ? String(propSet.GlobalId) : null;
                                        const propSetName = propSet.Name ? String(propSet.Name) : "";
                                        const propSetType = propSet.is_a ? String(propSet.is_a()) : "";
                                        const properties = [];
                                        const props = propSet.HasProperties || propSet.Quantities;
                                        if (props && props.length > 0) {
                                            for (let k = 0; k < props.length; k++) {
                                                const p = props.get(k);
                                                const propName = p.Name ? String(p.Name) : "";
                                                let propValue = "";
                                                let propType = p.is_a ? String(p.is_a()) : "";
                                                if (p.is_a && p.is_a() === "IfcPropertySingleValue") {
                                                    try {
                                                        propValue = p.NominalValue ? String(p.NominalValue.wrappedValue) : "";
                                                    } catch {
                                                        propValue = "";
                                                    }
                                                } else if (p.is_a && p.is_a() === "IfcPropertyEnumeratedValue") {
                                                    try {
                                                        const values = p.EnumerationValues;
                                                        if (values && values.length > 0) {
                                                            const arr = [];
                                                            for (let vi = 0; vi < values.length; vi++) {
                                                                arr.push(String(values.get(vi).wrappedValue));
                                                            }
                                                            propValue = arr.join(", ");
                                                        }
                                                    } catch {
                                                        propValue = "";
                                                    }
                                                } else if (p.is_a && p.is_a() === "IfcQuantityArea") {
                                                    propValue = p.AreaValue ? String(p.AreaValue) : "";
                                                } else if (p.is_a && p.is_a() === "IfcQuantityLength") {
                                                    propValue = p.LengthValue ? String(p.LengthValue) : "";
                                                } else if (p.is_a && p.is_a() === "IfcQuantityVolume") {
                                                    propValue = p.VolumeValue ? String(p.VolumeValue) : "";
                                                } else {
                                                    try {
                                                        propValue = p.NominalValue ? String(p.NominalValue) : "";
                                                    } catch {
                                                        propValue = "";
                                                    }
                                                }
                                                properties.push({
                                                    name: propName,
                                                    value: propValue,
                                                    type: propType
                                                });
                                                p.destroy?.();
                                            }
                                            props.destroy?.();
                                        }
                                        propertySets.push({
                                            id: propSetId,
                                            //    objectId: ctx.globalizeObjectIds ? math.globalizeObjectId(ctx.sceneModel.id, objectId) : objectId,
                                            name: propSetName,
                                            type: propSetType,
                                            properties
                                        });
                                        propertySetIds.push(propSetId);
                                        propSet.destroy?.();
                                    }
                                }
                                rel.destroy?.();
                            }
                        }
                        associations.destroy?.();
                    }
                }
            }
            metaObjects.push({
                id: globalizeObjectIds ? math.globalizeObjectId(modelId, id) : id,
                type: String(entity.is_a()),
                parent: parent
                    ? (globalizeObjectIds
                        ? math.globalizeObjectId(modelId, getGlobalId(parent))
                        : getGlobalId(parent))
                    : null,
                propertySetIds
            });
            return true;
        }

        function walk(entity, parent = null) {
            if (!entity) return;

            // add current node (skip children if already visited)
            if (!addNode(entity, parent)) {
                entity.destroy?.();
                return;
            }

            // 1) Decomposition (IfcRelAggregates / IfcRelNests)
            const decos = entity.IsDecomposedBy;
            if (decos) {
                for (let i = 0; i < decos.length; i++) {
                    const rel = decos.get(i);
                    const children = rel.RelatedObjects;
                    if (children) {
                        for (let j = 0; j < children.length; j++) {
                            const child = children.get(j);
                            walk(child, entity);
                            child.destroy?.();
                        }
                        children.destroy?.();
                    }
                    rel.destroy?.();
                }
            }

            // 2) Spatial containment (IfcRelContainedInSpatialStructure)
            const contains = entity.ContainsElements;
            if (contains) {
                for (let i = 0; i < contains.length; i++) {
                    const rel = contains.get(i);
                    const elems = rel.RelatedElements;
                    if (elems) {
                        for (let j = 0; j < elems.length; j++) {
                            const elem = elems.get(j);
                            walk(elem, entity);
                            elem.destroy?.();
                        }
                        elems.destroy?.();
                    }
                    rel.destroy?.();
                }
            }

            entity.destroy?.();
        }

        // ---- metadata extraction ----------------------------------------------
        let projectId = "";
        let author = "";
        let createdAt = ""; // ISO string
        let schema = "";
        let creatingApplication = "";

        // Schema (primary)
        try {
            // ifcopenshell.file usually exposes a `schema` string property
            schema = toStr(ifc.schema);
        } catch {
        }
        if (!schema) {
            // Fallback to STEP header
            try {
                const ids = ifc.wrapped_data.header.file_schema.schema_identifiers;
                if (ids && ids.length > 0) schema = toStr(ids.get(0));
            } catch {
            }
        }

        // Project (also gives us OwnerHistory on many files)
        const projects = ifc.by_type("IfcProject");
        if (projects && projects.length > 0) {
            const project = projects.get(0);
            projectId = toStr(project.GlobalId);

            // OwnerHistory path (preferred when present)
            try {
                const oh = project.OwnerHistory; // deprecated in newer IFC4.x, but present in many files
                if (oh) {
                    // Author: IfcPersonAndOrganization → ThePerson (GivenName/FamilyName) and TheOrganization.Name
                    try {
                        const user = oh.OwningUser;
                        const person = user?.ThePerson;
                        const org = user?.TheOrganization;
                        const gn = person?.GivenName ? toStr(person.GivenName) : "";
                        const fn = person?.FamilyName ? toStr(person.FamilyName) : "";
                        const personName = (gn || fn) ? [gn, fn].filter(Boolean).join(" ") : "";
                        const orgName = org?.Name ? toStr(org.Name) : "";
                        author = [personName, orgName].filter(Boolean).join(" / ");
                    } catch {
                    }

                    // Creation time (UNIX seconds)
                    try {
                        const ts = oh?.CreationDate;
                        if (typeof ts === "number" && isFinite(ts) && ts > 0) {
                            createdAt = new Date(ts * 1000).toISOString();
                        }
                    } catch {
                    }

                    // Creating application
                    try {
                        const app = oh?.OwningApplication;
                        const appName =
                            app?.ApplicationFullName ? toStr(app.ApplicationFullName) :
                                app?.ApplicationIdentifier ? toStr(app.ApplicationIdentifier) : "";
                        const appVer = app?.Version ? toStr(app.Version) : "";
                        creatingApplication = [appName, appVer].filter(Boolean).join(" ");
                    } catch {
                    }
                }
            } catch {
            }

            // Clean first project (we’ll traverse below with a fresh pointer anyway)
            project.destroy?.();
        }

        // Fallbacks via STEP header if OwnerHistory wasn’t there / incomplete
        try {
            const fileName = ifc.wrapped_data.header.file_name;
            if (!author) {
                try {
                    const authors = fileName.author;
                    if (authors && authors.length > 0) {
                        // `author` is a LIST in the STEP header; join if multiple
                        const parts = [];
                        for (let i = 0; i < authors.length; i++) parts.push(toStr(authors.get(i)));
                        author = parts.filter(Boolean).join(", ");
                    }
                } catch {
                }
            }
            if (!createdAt) {
                const ts = toStr(fileName.time_stamp); // already a string like "2023-08-10T12:34:56"
                if (ts) {
                    // normalize to ISO if possible
                    const maybe = new Date(ts);
                    if (!isNaN(maybe.getTime())) createdAt = maybe.toISOString();
                }
            }
            if (!creatingApplication) {
                // STEP header carries "originating_system" and "preprocessor_version"
                const orig = toStr(fileName.originating_system);
                const prep = toStr(fileName.preprocessor_version);
                creatingApplication = [orig, prep].filter(Boolean).join(" / ");
            }
        } catch {
        }

        // If createdAt still missing, sweep for earliest OwnerHistory timestamp across roots
        if (!createdAt) {
            try {
                let minTs = Infinity;
                const roots = ifc.by_type("IfcRoot");
                for (let i = 0; i < roots.length; i++) {
                    const r = roots.get(i);
                    const oh = r?.OwnerHistory;
                    const ts = oh?.CreationDate;
                    if (typeof ts === "number" && isFinite(ts) && ts > 0 && ts < minTs) {
                        minTs = ts;
                    }
                    r.destroy?.();
                }
                roots.destroy?.();
                if (isFinite(minTs)) createdAt = new Date(minTs * 1000).toISOString();
            } catch {
            }
        }

        // ---- hierarchy walk ----------------------------------------------------
        // Re-query projects since we destroyed the first pointer above
        const projects2 = ifc.by_type("IfcProject");
        for (let i = 0; i < projects2.length; i++) {
            const project = projects2.get(i);
            walk(project, null);
            project.destroy?.();
        }
        projects2.destroy?.();

        return {
            id: "",
            projectId,
            author,
            createdAt,
            schema,
            creatingApplication,
            metaObjects,
            propertySets
        };
    }

    /**
     * Destroys this IFCOpenShellLoaderPlugin instance.
     */
    destroy() {
        super.destroy();
    }
}

function makeSubGeometryId(geometry_id, matIndex) {
    return `${geometry_id}:${matIndex}#geom`;
}

function buildMaterialMapping(materialIds) {
    const mapping = {};
    for (let faceIdx = 0; faceIdx < materialIds.length; faceIdx++) {
        const materialId = materialIds[faceIdx];
        if (materialId == null || materialId < 0) continue; // skip invalid / missing
        (mapping[materialId] ||= []).push(faceIdx);
    }
    return mapping;
}

function buildIndicesForFaces(faceList, faceIndices) {
    const indices = new Uint32Array(faceList.length * 3);
    let k = 0;
    for (const faceIdx of faceList) {
        const base = faceIdx * 3;
        indices[k++] = faceIndices[base + 0];
        indices[k++] = faceIndices[base + 1];
        indices[k++] = faceIndices[base + 2];
    }
    return indices;
}

function generateUUID() {
    return Math.random().toString(36).substr(2, 9);
}

function extractRTCTransform(transform) {
    const matrix = flattenMatrixArray(transform);
    const origin = [];
    const worldOrigin = matrix.slice(12, 15); // translation xyz
    worldToRTCPositions(worldOrigin, worldOrigin, origin);
    matrix.set(worldOrigin, 12);
    return {origin, matrix};
}

function flattenMatrixArray(m) {
    return new Float64Array([
        m[0][0], m[2][0], -m[1][0], m[3][0],
        m[0][1], m[2][1], -m[1][1], m[3][1],
        m[0][2], m[2][2], -m[1][2], m[3][2],
        m[0][3], m[2][3], -m[1][3], m[3][3]
    ]);
}

