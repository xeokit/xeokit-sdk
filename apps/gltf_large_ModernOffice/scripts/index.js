/*
 * A minimal app that views a huge glTF file.
 */
import {Viewer} from "../../../src/viewer/Viewer.js";
import {GLTFBigModelsPlugin} from "../../../src/viewer/plugins/GLTFBigModelsPlugin/GLTFBigModelsPlugin.js";
import {AxisGizmoPlugin} from "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";

const viewer = new Viewer({
    canvasId: "myCanvas"
});

const glTFBigModels = new GLTFBigModelsPlugin(viewer);

const axisGizmo = new AxisGizmoPlugin(viewer, {size: [250, 250]});

const model = glTFBigModels.load({
    id: "myModel",
    src: "./../../models/gltf/modern_office/scene.gltf"
    edges: true
});

viewer.scene.camera.orbitPitch(20);

model.on("loaded", () => {
    viewer.cameraFlight.flyTo(model);
});
