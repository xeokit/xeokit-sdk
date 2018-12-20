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

//----------------------------------------------------------------------------------------------------------------------
//
//----------------------------------------------------------------------------------------------------------------------

const model = gltfLoader.load({
    id: "myModel",
    src: "./../../../models/gltf/schependomlaan/scene2.gltf",
    metaModelSrc: "./../../../metaModels/schependomlaan/metaModel.json", // Creates a MetaObject instances in scene.metaScene.metaObjects
    edges: true,
    handleNode(modelId, nodeInfo, actions) {

        //-------------------------------------------------------------------------------------------------------------
        // The "name" property of the glTF scene node contains the object ID, with which we can find a MetaObject
        // in the MetaModel we loaded. We'll create Object3D components in the Scene for all the nodes as we
        // descend into them, but will give special treatment to those nodes that have a "name", ie. set initial
        // visuzl state for those according to the MetaModel.
        //-------------------------------------------------------------------------------------------------------------

        const name = nodeInfo.name;

        if (!name) {
            return true; // Continue descending this node subtree
        }

        const objectId = name;
        const metaObject = viewer.metaScene.metaObjects[objectId];
        const ifcType = (metaObject ? metaObject.type : "DEFAULT") || "DEFAULT";

        var colorize = ifcDefaultMaterials[ifcType];

        //-------------------------------------------------------------------------------------------------------------
        // Instruct GLTFLoaderPlugin to create an Object3D for this glTF scene node
        //
        // Assigning the Object3D an "objectId" causes xeokit to register it in
        // Scene#objects, Scene#visibleObjectIds, Scene#highlightedObjectIds etc.
        // which is just useful for easy visibility state management via those ID maps.
        //-------------------------------------------------------------------------------------------------------------

        actions.createObject = {
            objectId: objectId,
            visible: true,
            colorize: colorize
        };

        //-------------------------------------------------------------------------------------------------------------
        // Configure the initial visible state of the Object3D depending on its IFC type
        //-------------------------------------------------------------------------------------------------------------

        switch (ifcType) {
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

        // Continue descending this glTF node subtree
        return true;
    }
});

model.on("loaded", () => {

    viewer.cameraFlight.flyTo(model);

    structurePanel.on("clicked", e => {
        const objectId = e.objectId;
        const objectIds = viewer.metaScene.getSubObjectIDs(objectId);
        const aabb = scene.getAABB(objectIds);

        viewer.scene.setSelected(viewer.scene.selectedObjectIds, false);
        viewer.scene.setSelected(objectIds, true);

        viewer.cameraFlight.flyTo(aabb);
    });
});

scene.input.on("mouseclicked", function (coords) {

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








