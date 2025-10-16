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

    // ---- helpers -----------------------------------------------------------
    const toStr = (v) => (v === undefined || v === null) ? "" : String(v);

    function getGlobalId(entity) {
        try { return String(entity.GlobalId); } catch { return null; }
    }

    function addNode(entity, parent) {
        const id = getGlobalId(entity);
        if (!id || visited.has(id)) return false;
        visited.add(id);
        metaObjects.push({
            id,
            type: String(entity.is_a()),
            parent: parent ? getGlobalId(parent) : null
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
    } catch {}
    if (!schema) {
        // Fallback to STEP header
        try {
            const ids = ifc.wrapped_data.header.file_schema.schema_identifiers;
            if (ids && ids.length > 0) schema = toStr(ids.get(0));
        } catch {}
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
                } catch {}

                // Creation time (UNIX seconds)
                try {
                    const ts = oh?.CreationDate;
                    if (typeof ts === "number" && isFinite(ts) && ts > 0) {
                        createdAt = new Date(ts * 1000).toISOString();
                    }
                } catch {}

                // Creating application
                try {
                    const app = oh?.OwningApplication;
                    const appName =
                        app?.ApplicationFullName ? toStr(app.ApplicationFullName) :
                            app?.ApplicationIdentifier ? toStr(app.ApplicationIdentifier) : "";
                    const appVer = app?.Version ? toStr(app.Version) : "";
                    creatingApplication = [appName, appVer].filter(Boolean).join(" ");
                } catch {}
            }
        } catch {}

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
            } catch {}
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
    } catch {}

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
        } catch {}
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
        id: "", // keep your placeholder fields as-is
        projectId,
        author,
        createdAt,
        schema,
        creatingApplication,
        metaObjects,
        propertySets: []
    };
}

