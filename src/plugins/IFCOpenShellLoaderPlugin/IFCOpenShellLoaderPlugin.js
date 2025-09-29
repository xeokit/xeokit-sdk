import {Plugin, SceneModel, utils, worldToRTCPositions} from "../../viewer/index.js";
import {math} from "../../viewer/scene/math/math.js";
import {IFCOpenShellDefaultDataSource} from "./IFCOpenShellDefaultDataSource.js";
import {IFCObjectDefaults} from "../../viewer/metadata/IFCObjectDefaults.js";

/**
 * {@link Viewer} plugin that loads models from IFC format using IfcOpenShell.
 *
 * @class IFCOpenShellLoaderPlugin
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
            id: payload.guid || `payload_${payload.geometry_id}`,
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
