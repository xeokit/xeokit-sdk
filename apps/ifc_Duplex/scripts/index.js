import {Viewer} from "./../../../src/viewer/Viewer.js";
import {GLTFLoaderPlugin} from "./../../../src/viewer/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
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

const gltfLoader = new GLTFLoaderPlugin(viewer);

const model = gltfLoader.load({
    id: "myModel",
    src: "./../../../models/gltf/duplex/duplex.gltf",
    metadataSrc: "./../../../models/metadata/duplex/structure.json",
    edges: true,
    handleNode(modelId, nodeInfo, actions) {
        const name = nodeInfo.name;
        if (!name) {
            return true; // Continue descending this node subtree
        }
        const objectId = modelId + "#" + name;
        const objectMetadata = viewer.metadata.objects[objectId];

        const ifcType = (objectMetadata ? objectMetadata.type : "DEFAULT") || "DEFAULT";
        var colorize = ifcDefaultMaterials[ifcType];

        actions.createObject = {
            id: modelId + "#" + name,
            visible: true,
            entityType: ifcType, // Registers Object in Scene#entities
            colorize: colorize
        };

        switch (ifcType) { // Configure initial state of object depending on its type

            case "IfcWindow":
                actions.createObject.pickable = false;
                actions.createObject.opacity = 0.5;
                break;

            case "IfcSpace":
                actions.createObject.pickable = false;
                actions.createObject.visible = false;

                break;

            case "IfcOpeningElement":
                actions.createObject.pickable = false;
                actions.createObject.visible = false;
                break;

            default: // Unrecognized type
                actions.createObject.pickable = true;
                //actions.createObject.opacity = 0.2;
              //  actions.createObject.visible = false;
        }

        return true; // Continue descending this glTF node subtree
    }
});

const scene = viewer.scene;
const camera = scene.camera;

camera.orbitPitch(20);

model.on("loaded", () => {
    //model.ghosted = true;
    //model.opacity = 0.5;
    viewer.cameraFlight.flyTo(model);
    var modelMetadata = viewer.metadata.structures[model.id];
    if (modelMetadata) {

    }
});


var input = scene.input;

input.on("mouseclicked", function (coords) {

    var hit = scene.pick({
        canvasPos: coords
    });

    if (hit) {
        var mesh = hit.mesh;
        var objectMetadata = viewer.metadata.objects[mesh.id];
        if (objectMetadata) {
            console.log(JSON.stringify(objectMetadata, null, "\t"));
        } else {
            const parent = mesh.parent;
            if (parent) {
                objectMetadata = viewer.metadata.objects[parent.id]
                if (objectMetadata) {
                    console.log(JSON.stringify(objectMetadata, null, "\t"));
                }
            }
        }
    }
});








