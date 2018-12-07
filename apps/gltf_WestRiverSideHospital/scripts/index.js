/*
 * A minimal app that loads multiple large glTF files
 */
import {Viewer} from "../../../src/viewer/Viewer.js";
import {GLTFBigModelsPlugin} from "../../../src/viewer/plugins/GLTFBigModelsPlugin/GLTFBigModelsPlugin.js";
import {AxisGizmoPlugin} from "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";

const viewer = new Viewer({
    canvasId: "myCanvas"
});

const axisGizmo = new AxisGizmoPlugin(viewer, {size: [250, 250]});

const loader = new GLTFBigModelsPlugin(viewer);

const structure = loader.load({
    id: "structure",
    src: "../../models/gltf/WestRiverSideHospital/structure.gltf"
});

const electrical = loader.load({
    id: "electrical",
    src: "../../models/gltf/WestRiverSideHospital/electrical.gltf"
});

const fireAlarms = loader.load({
    id: "fireAlarms",
    src: "../../models/gltf/WestRiverSideHospital/fireAlarms.gltf"
});

const sprinklers = loader.load({
    id: "sprinklers",
    src: "../../models/gltf/WestRiverSideHospital/sprinklers.gltf"
});

viewer.scene.camera.orbitPitch(20);

structure.on("loaded", () => {
    viewer.cameraFlight.jumpTo(structure);
});
