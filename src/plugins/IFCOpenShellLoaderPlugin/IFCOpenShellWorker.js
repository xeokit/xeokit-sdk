let pyodide, ifcopenshell, ifcopenshell_geom, settings;

// geometry_id -> {
//   subGeoms: Map<matIndex, sceneGeometryId>,
//   materials: Array<{diffuse:[r,g,b], transparency:number}>,
//   mapping: Map<matIndex, Uint32Array(faceIdx list)>
// }
const geometryCache = new Map();

self.onmessage = async (e) => {
    const msg = e.data;

    //   try {
    if (msg.type === "init") {
        const {
            indexURL = "https://cdn.jsdelivr.net/pyodide/v0.28.0a3/full",
            wheelURL = "../../dist/ifcopenshell-0.8.3+34a1bc6-cp313-cp313-emscripten_4_0_9_wasm32.whl",
        } = msg;

        self.importScripts(`${indexURL}/pyodide.js`);
        pyodide = await self.loadPyodide({ indexURL });

        await pyodide.loadPackage("micropip");
        await pyodide.loadPackage("numpy");
        await pyodide.loadPackage("shapely");

        const micropip = pyodide.pyimport("micropip");
        await micropip.install("typing-extensions");
        await micropip.install(wheelURL);

        ifcopenshell = pyodide.pyimport("ifcopenshell");
        ifcopenshell_geom = pyodide.pyimport("ifcopenshell.geom");

        settings = ifcopenshell_geom.settings();
        settings.set(settings.WELD_VERTICES, false);

        self.postMessage({ type: "ready" });
        return;
    }

    if (msg.type === "load") {

        const { ifcUrl, exclude, geometryLibrary, loadMetadata } = msg;

        if (!ifcopenshell || !ifcopenshell_geom || !settings) {
            throw new Error("Worker not initialized properly.");
        }

        const resp = await fetch(ifcUrl);
        const ifcText = await resp.text();
        const ifc = ifcopenshell.file.from_string(ifcText);

        if (loadMetadata !== false) {
            const metaModel = extractMetaModel(ifc);
            self.postMessage({ type: "metamodel", metaModel });
        }

        const it = ifcopenshell_geom.iterator.callKwargs({
            settings,
            file_or_filename: ifc,
            exclude,
            geometry_library: geometryLibrary,
        });

        let count = 0;

        if (it.initialize()) {
            do {
                const obj = it.get();
                const ifcEntity = ifc.by_id(obj.id);
                parseEntity(obj, ifcEntity);
                count++;
            } while (it.next());
        }

        self.postMessage({ type: "done", count });
        return;
    }
    // } catch (err) {
    //     debugger;
    //     // postError(err);
    // }
};

function parseEntity(obj, ifcEntity) {
    const geometry_id = obj.geometry.id;

    const M = obj.transformation.data().components.toJs();
    const {origin, matrix} = extractRTCTransform(M);

    if (!geometryCache.has(geometry_id)) {

        const srcMaterials = obj.geometry.materials.toJs();
        const materials = srcMaterials.map((m) => ({
            diffuse: m.diffuse.components.toJs(),
            transparency: m.transparency ?? 0.0,
        }));

        const materialIds = new Int32Array(obj.geometry.material_ids.toJs());

        // Build mapping: materialIndex -> [faceIdx...]
        const mapping = buildMaterialMapping(materialIds);

        // Create sub-geometry per materialIndex, once
        const subGeoms = new Map();

        for (const [matIndexStr, faceList] of Object.entries(mapping)) {

            const positions = new Float32Array(obj.geometry.verts.toJs());
            const normals = new Float32Array(obj.geometry.normals.toJs());
            const edgeIndices = new Uint32Array(obj.geometry.edges.toJs());
            const faces = new Uint32Array(obj.geometry.faces.toJs());

            const matIndex = Number(matIndexStr);
            if (!faceList || faceList.length === 0) continue;

            const indices = buildIndicesForFaces(faceList, faces);
            const sceneGeometryId = makeSubGeometryId(geometry_id, matIndex); // deterministic

            self.postMessage({
                type: "geometry",
                payload: {
                    id: sceneGeometryId,
                    primitive: "triangles",
                    positions,
                    normals,
                    indices,
                    edgeIndices
                }
            }, [
                positions.buffer,
                normals.buffer,
                indices.buffer,
                edgeIndices.buffer
            ]);

            subGeoms.set(matIndex, sceneGeometryId);
        }

        // Cache everything needed to reuse this geometry later without re-sending it
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
        const material = cached.materials[matIndex] || { diffuse: [0.6, 0.6, 0.6], transparency: 0.0 };

        const meshId = generateUUID();
        self.postMessage({
            type: "mesh",
            payload: {
                id: meshId,
                geometryId: sceneGeometryId, // <-- reuse!
                origin,
                matrix,
                color: material.diffuse,
                opacity: 1.0 - material.transparency
            }
        });
        meshIds.push(meshId);
    }

    self.postMessage({
        type: "entity",
        payload: {
            id: ifcEntity.GlobalId,
            isObject: true,
            meshIds
        }
    });
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

function worldToRTCPositions(worldPositions, rtcPositions, rtcCenter, cellSize = 1000) {
    const center = getPositionsCenter(worldPositions);

    const rtcCenterX = Math.round(center[0] / cellSize) * cellSize;
    const rtcCenterY = Math.round(center[1] / cellSize) * cellSize;
    const rtcCenterZ = Math.round(center[2] / cellSize) * cellSize;

    rtcCenter[0] = rtcCenterX;
    rtcCenter[1] = rtcCenterY;
    rtcCenter[2] = rtcCenterZ;

    const rtcNeeded = (rtcCenter[0] !== 0 || rtcCenter[1] !== 0 || rtcCenter[2] !== 0);

    if (rtcNeeded) {
        for (let i = 0, len = worldPositions.length; i < len; i += 3) {
            rtcPositions[i + 0] = worldPositions[i + 0] - rtcCenterX;
            rtcPositions[i + 1] = worldPositions[i + 1] - rtcCenterY;
            rtcPositions[i + 2] = worldPositions[i + 2] - rtcCenterZ;
        }
    }

    return rtcNeeded;
}

function getPositionsCenter(positions, center = new Float64Array(3)) {
    let xCenter = 0;
    let yCenter = 0;
    let zCenter = 0;
    for (let i = 0, len = positions.length; i < len; i += 3) {
        xCenter += positions[i + 0];
        yCenter += positions[i + 1];
        zCenter += positions[i + 2];
    }
    const numPositions = positions.length / 3;
    center[0] = xCenter / numPositions;
    center[1] = yCenter / numPositions;
    center[2] = zCenter / numPositions;
    return center;
}

function extractMetaModel(ifc) {
    const visited = new Set();
    const metaObjects = [];

    function getGlobalId(entity) {
        try {
            return String(entity.GlobalId);
        } catch {
            return null;
        }
    }

    function walk(entity, parent = null) {
        if (!entity) {
            return;
        }

        const globalId = getGlobalId(entity);
        const type = String(entity.is_a());
        const parentId = parent ? getGlobalId(parent) : null;

        if (!globalId || visited.has(globalId)) {
            return;
        }
        visited.add(globalId);

        metaObjects.push({ id: globalId, type, parent: parentId });

        const rels = entity.IsDecomposedBy;
        if (rels) {
            for (let i = 0; i < rels.length; i++) {
                const rel = rels.get(i);
                if (String(rel.is_a()) === "IfcRelAggregates") {
                    const children = rel.RelatedObjects;
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

        entity.destroy?.();
    }

    const projects = ifc.by_type("IfcProject");
    for (let i = 0; i < projects.length; i++) {
        const project = projects.get(i);
        walk(project, null);
        project.destroy?.();
    }
    projects.destroy?.();

    return {
        id: "",
        projectId: "",
        author: "",
        createdAt: "",
        schema: "",
        creatingApplication: "",
        metaObjects,
        propertySets: []
    }
}
