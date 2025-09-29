let pyodide, ifcopenshell, ifcopenshell_geom, settings;

function postError(err) {
    const message = (err && err.message) ? err.message : String(err);
    const stack = err && err.stack ? err.stack : "";
    self.postMessage({ type: "error", message, stack });
}

self.onmessage = async (e) => {
    const msg = e.data;

    try {
        if (msg.type === "init") {
            const {
                indexURL = "https://cdn.jsdelivr.net/pyodide/v0.28.0a3/full",
                wheelURL = "../../dist/ifcopenshell-0.8.3+34a1bc6-cp313-cp313-emscripten_4_0_9_wasm32.whl",
            } = msg;

            // Load Pyodide in the worker
            self.importScripts(`${indexURL}/pyodide.js`);
            pyodide = await self.loadPyodide({ indexURL });

            // Basic packages
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
            const {
                ifcUrl,
                exclude = ["IfcSpace", "IfcOpeningElement"],
                geometryLibrary = "hybrid-cgal-simple-opencascade",
                loadMetadata
            } = msg;

            if (!ifcopenshell || !ifcopenshell_geom || !settings) {
                throw new Error("Worker not initialized. Send an 'init' message first.");
            }

            const resp = await fetch(ifcUrl);
            const ifcText = await resp.text();

            const ifc = ifcopenshell.file.from_string(ifcText);

            if (loadMetadata !== false) {
                const metaModel = extractMetaModel(ifc);
                self.postMessage({type: "metamodel", metaModel});
            }

            const it = ifcopenshell_geom.iterator.callKwargs({
                settings,
                file_or_filename: ifc,
                exclude,
                geometry_library: geometryLibrary,
            });

            let count = 0;

            if (it.initialize()) {
                while (true) {
                    const obj = it.get();

                    const entity = ifc.by_id(obj.id);
                    const id = entity.GlobalId;

                    const srcMaterials = obj.geometry.materials.toJs();
                    const materials = srcMaterials.map((m) => ({
                        diffuse: m.diffuse.components.toJs(),
                        transparency: m.transparency ?? 0.0,
                    }));

                    const material_ids = new Int32Array(obj.geometry.material_ids.toJs());

                    const verts = new Float32Array(obj.geometry.verts.toJs());
                    const normals = new Float32Array(obj.geometry.normals.toJs());
                    const edges = new Uint32Array(obj.geometry.edges.toJs());
                    const fsArray = obj.geometry.faces.toJs();
                    const faces = new Uint32Array(fsArray);

                    const M = obj.transformation.data().components.toJs();

                    const payload = {
                        id,
                        guid: obj.guid,
                        geometry_id: obj.geometry.id,
                        materials,
                        material_ids,
                        verts, normals, edges, faces,
                        transform: M,
                    };

                    self.postMessage(
                        { type: "object", payload },
                        // *Transfer* large buffers to main thread in order to avoid copies
                        [verts.buffer, normals.buffer, edges.buffer, faces.buffer, material_ids.buffer]
                    );

                    count++;
                    if (!it.next()) {
                        break;
                    }
                }
            }

            self.postMessage({ type: "done", count });

            return;
        }
    } catch (err) {
        postError(err);
    }
};

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
