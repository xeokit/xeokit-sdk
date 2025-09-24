import { Plugin, SceneModel, utils, worldToRTCPositions } from "../../viewer/index.js";
import { math } from "../../viewer/scene/math/math.js";
import { IFCOpenShellDefaultDataSource } from "./IFCOpenShellDefaultDataSource.js";
import { IFCObjectDefaults } from "../../viewer/metadata/IFCObjectDefaults.js";

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
        if (!cfg.ifcopenshell) throw new Error("IFCOpenShellLoaderPlugin: No ifcopenshell given");
        if (!cfg.ifcopenshell_geom) throw new Error("IFCOpenShellLoaderPlugin: No ifcopenshell_geom given");

        this.ifcopenshell = cfg.ifcopenshell;
        this.ifcopenshell_geom = cfg.ifcopenshell_geom;

        this.dataSource = cfg.dataSource;
        this.objectDefaults = cfg.objectDefaults;
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
    load(params = {}) {
        let { id, backfaces, dtxEnabled, rotation, origin } = params;

        if (id && this.viewer.scene.components[id]) {
            this.error(`Component with this ID already exists: ${id} - autogenerating ID`);
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

        if (params.src) {
            this.viewer.scene.canvas.spinner.processes++;
            this._dataSource.getIFC(
                params.src,
                (fileData) => {
                    this._parseIFC({ fileData, sceneModel });
                    this.viewer.scene.canvas.spinner.processes--;
                },
                (err) => {
                    this.viewer.scene.canvas.spinner.processes--;
                    this.error(err);
                }
            );
        } else {
            this._parseIFC({ fileData: params.text, sceneModel });
        }

        sceneModel.once("destroyed", () => {
            this.viewer.metaScene.destroyMetaModel(modelId);
        });

        return sceneModel;
    }

    // ----------------------
    // Parsing
    // ----------------------

    _parseIFC(ctx) {
        const { fileData, sceneModel } = ctx;
        const { ifcopenshell, ifcopenshell_geom } = this;

        const ifc = ifcopenshell.file.from_string(fileData);

        const iterator = ifcopenshell_geom.iterator.callKwargs({
            settings, // external
            file_or_filename: ifc,
            exclude: ["IfcSpace", "IfcOpeningElement"],
            geometry_library: "hybrid-cgal-simple-opencascade"
        });

        // Single-entry micro-cache to speed repeated geometry
        const cache = { last_mesh_id: undefined, last_bundles: undefined };

        if (iterator.initialize()) {
            do {
                const obj = iterator.get();
                if (obj) {
                    this._parseElement(sceneModel, obj, cache);
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

    _parseElement(sceneModel, obj, cache) {
        const bundles = this._getOrBuildBundles(sceneModel, cache, obj);
        const { origin, matrix } = this._extractRTCTransform(obj);

        const meshIds = bundles.map((b) => {
            const sceneMesh = sceneModel.createMesh({
                origin,
                matrix,
                geometryId: b.geometry.id,
                color: b.material.color,    // expecting [r,g,b] in 0..1; map to 0..255 if your engine needs it
                opacity: b.material.opacity
            });
            return sceneMesh.id;
        });

        return sceneModel.createEntity({
            id: obj.guid || `obj_${obj.geometry.id}`,
            isObject: true,
            meshIds
        });
    }

    /**
     * Returns cached bundles for a geometry or builds them once and caches.
     */
    _getOrBuildBundles(sceneModel, cache, obj) {
        if (cache.last_mesh_id === obj.geometry.id) {
            return cache.last_bundles;
        }

        const {
            materials,
            mapping,
            positions,
            normals,
            edgeIndices,
            faceIndices
        } = this._buildMaterialsAndMapping(obj);

        const bundles = [];

        materials.forEach((material, mi) => {
            const faceList = mapping[mi] || [];
            if (faceList.length === 0) return;

            const indices = this._buildIndicesForFaces(faceList, faceIndices);

            const geometry = sceneModel.createGeometry({
                primitive: "triangles",
                positions,
                normals,
                indices,
                edgeIndices
            });

            bundles.push({
                geometry,
                material,
                kind: "tri"
            });
        });

        cache.last_mesh_id = obj.geometry.id;
        cache.last_bundles = bundles;

        return bundles;
    }

    /**
     * Builds materials, material->faces mapping, and base buffers.
     * Handles a missing material (-1) by injecting a default neutral material.
     */
    _buildMaterialsAndMapping(obj) {

        // Base buffers
        const positions   = new Float32Array(obj.geometry.verts.toJs());
        const normals     = new Float32Array(obj.geometry.normals.toJs());
        const edgeIndices = new Uint32Array(obj.geometry.edges.toJs());
        const faceIndices = obj.geometry.faces.toJs();

        // Raw material info
        const rawMaterials = obj.geometry.materials.toJs();
        const materialIds  = obj.geometry.material_ids.toJs();

        // Normalize materials
        const materials = rawMaterials.map((m) => ({
            color: m.diffuse.components.toJs(),          // [r,g,b] in 0..1
            opacity: 1.0 - (m.transparency ?? 0),        // IfcOpenShell transparency -> engine opacity
            backfaces: true
        }));

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
            if (matIndex == null || matIndex < 0) continue;
            (mapping[matIndex] ||= []).push(faceIdx);
        }

        return { materials, mapping, positions, normals, edgeIndices, faceIndices };
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
    _extractRTCTransform(obj) {
        const matrix4x4 = obj.transformation.data().components.toJs();
        const matrix = this._flattenMatrixArray(matrix4x4);

        const origin = math.vec3();
        const worldOrigin = matrix.slice(12, 15); // translation xyz
        worldToRTCPositions(worldOrigin, worldOrigin, origin);
        matrix.splice(12, 3, ...worldOrigin);

        return { origin, matrix };
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
