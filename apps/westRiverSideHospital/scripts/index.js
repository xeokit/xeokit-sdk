/*
 * A minimal app that loads multiple large glTF files
 */
import {Viewer} from "../../../src/viewer/Viewer.js";
import {GLTFBigModelsPlugin} from "../../../src/viewer/plugins/GLTFBigModelsPlugin/GLTFBigModelsPlugin.js";
import {AxisGizmoPlugin} from "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";

const viewer = new Viewer({
    canvasId: "myCanvas"
});

new AxisGizmoPlugin(viewer, {size: [250, 250]});

var loader = new GLTFBigModelsPlugin(viewer, {id: "GLTFBigModels"});

var structure = loader.load({
    id: "structure",
    src: "../../models/gltf/WestRiverSideHospital/structure.gltf"
});

var electrical = loader.load({
    id: "electrical",
    src: "../../models/gltf/WestRiverSideHospital/electrical.gltf"
});

var fireAlarms = loader.load({
    id: "fireAlarms",
    src: "../../models/gltf/WestRiverSideHospital/fireAlarms.gltf"
});

var sprinklers = loader.load({
    id: "sprinklers",
    src: "../../models/gltf/WestRiverSideHospital/sprinklers.gltf"
});

viewer.scene.camera.orbitPitch(20);

structure.on("loaded", () => {
    viewer.cameraFlight.jumpTo(structure);
});
