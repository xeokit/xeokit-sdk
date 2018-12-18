import {Viewer} from "../../../src/viewer/Viewer.js";
import {GLTFBigModelLoaderPlugin} from "../../../src/viewer/plugins/GLTFBigModelLoaderPlugin/GLTFBigModelLoaderPlugin.js";
import {AxisGizmoPlugin} from "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";

const viewer = new Viewer({
    canvasId: "myCanvas"
});

const glTFBigModelLoader = new GLTFBigModelLoaderPlugin(viewer);

const axisGizmo = new AxisGizmoPlugin(viewer, {size: [250, 250]});

const model = glTFBigModelLoader.load({
    id: "myModel",
    src: "./../../models/gltf/modern_office/scene.gltf",
    edges: true
});

viewer.scene.camera.orbitPitch(20);

model.on("loaded", () => {
    viewer.cameraFlight.flyTo(model);
});