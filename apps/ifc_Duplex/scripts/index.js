import {Viewer} from "./../../../src/viewer/Viewer.js";
import {GLTFModelsPlugin} from "./../../../src/viewer/plugins/GLTFModelsPlugin/GLTFModelsPlugin.js";
import {StructurePanelPlugin} from "./../../../src/viewer/plugins/StructurePanelPlugin/StructurePanelPlugin.js";
import {PropertiesPanelPlugin} from "./../../../src/viewer/plugins/PropertiesPanelPlugin/PropertiesPanelPlugin.js";

import {ifcDefaultMaterials} from "./ifcDefaults.js";

const viewer = new Viewer({
    canvasId: "myCanvas"
});

var cameraControl = viewer.cameraControl;
cameraControl.panToPointer = true;
cameraControl.doublePickFlyTo = true;

const structurePanel = new StructurePanelPlugin(viewer, {
    domElementId: "structurePanel"
});

const propertiesPanel = new PropertiesPanelPlugin(viewer, {
    domElementId: "propertiesPanel"
});

const gltfModels = new GLTFModelsPlugin(viewer);

const model = gltfModels.load({
    id: "myModel",
    src: "./../../../models/gltf/duplex/duplex.gltf",
    metadataSrc: "./../../../models/metadata/duplex/flatStructure.json",
    edges: true
});

const scene = viewer.scene;
const camera = scene.camera;

camera.orbitPitch(20);

model.on("loaded", () => {
    viewer.cameraFlight.flyTo(model);
});

model.on("metadata-loaded", function () {
    var objects = model.objects;

    console.log(JSON.stringify(viewer.metadata.structures[model.id], null, "\t"));
});


var input = scene.input;

input.on("mouseclicked", function (coords) {

    var hit = scene.pick({
        canvasPos: coords
    });

    if (hit) {
        hit.mesh.material.emissive = [1, 1, 0];

        var oid = hit.mesh.id;
        var objectMetadata = viewer.metadata.objects[oid];

        console.log(hit.mesh.id);

        if (objectMetadata) {
            console.log(JSON.stringify(objectMetadata, null, "\t"));
        }
    }
});