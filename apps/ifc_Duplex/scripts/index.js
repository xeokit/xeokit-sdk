import {Viewer} from "./../../../src/viewer/Viewer.js";
import {GLTFLoaderPlugin} from "./../../../src/viewer/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
import {StructurePanelPlugin} from "./../../../src/viewer/plugins/StructurePanelPlugin/StructurePanelPlugin.js";
import {PropertiesPanelPlugin} from "./../../../src/viewer/plugins/PropertiesPanelPlugin/PropertiesPanelPlugin.js";

import {ifcDefaultMaterials} from "./ifcDefaults.js";

const viewer = new Viewer({
    canvasId: "myCanvas",
    transparent: true
});

const cameraControl = viewer.cameraControl;
const scene = viewer.scene;
const camera = scene.camera;
const cameraFlight = viewer.cameraFlight;

cameraControl.panToPointer = true;
cameraControl.doublePickFlyTo = true;
cameraFlight.duration = 1.0;
cameraFlight.fitFOV = 25;

camera.orbitPitch(20);


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

        const objectId = name;
        const metaScene = viewer.metaScene;
        const metaObject = metaScene.metaObjects[objectId];
        const ifcType = (metaObject ? metaObject.type : "DEFAULT") || "DEFAULT";

        var colorize = ifcDefaultMaterials[ifcType];
        actions.createObject = {
            id: objectId,
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
        }
        return true; // Continue descending this glTF node subtree
    }
});

model.on("loaded", () => {

    viewer.cameraFlight.flyTo(model);

    structurePanel.on("clicked", e => {
        const objectId = e.objectId;
        const objectIds = viewer.metaScene.getSubObjectIDs(objectId);
        const aabb = scene.getAABB(objectIds);

        viewer.scene.setSelected(viewer.scene.selectedEntityIds, false);
        viewer.scene.setSelected(objectIds, true);

        viewer.cameraFlight.flyTo(aabb);
    });
});


function getSubSobjects(rootId) {
    const list = [];

    function visit(objectId) {
        const object = viewer.metadata.objects[objectId];
        if (!object) {
            return;
        }
        list.push(objectId);
        const children = object.children;
        if (children) {
            for (var i = 0, len = children; i < len; i++) {
                visit(children[i]);
            }
        }
    }

    visit(rootId);
    return list;
}

var input = scene.input;

input.on("mouseclicked", function (coords) {

    var hit = scene.pick({
        canvasPos: coords
    });

    if (hit) {
        var mesh = hit.mesh;
        var metaObject = viewer.metaScene.metaObjects[mesh.id];
        if (metaObject) {
            console.log(JSON.stringify(metaObject.getJSON(), null, "\t"));
        } else {
            const parent = mesh.parent;
            if (parent) {
                metaObject = viewer.metaScene.metaObjects[parent.id];
                if (metaObject) {
                    console.log(JSON.stringify(metaObject.getJSON(), null, "\t"));
                }
            }
        }
    }
});








