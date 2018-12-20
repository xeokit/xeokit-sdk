import {Viewer} from "../../../src/viewer/Viewer.js";
import {GLTFLoaderPlugin} from "../../../src/viewer/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
import {AxisGizmoPlugin} from  "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";

const viewer = new Viewer({
    canvasId: "myCanvas"
});

const gltfModels = new GLTFLoaderPlugin(viewer);

new AxisGizmoPlugin(viewer, {size: [250, 250]});

const model = gltfModels.load({
    id: "myModel",
    src: "./../../models/gltf/schependomlaan/schependomlaan.gltf",
    metaModelSrc: "./../../metaModels/schependomlaan/structure.json",
    edges: true
});

const scene = viewer.scene;
const camera = scene.camera;

camera.orbitPitch(20);

model.on("loaded", () => {
    viewer.cameraFlight.flyTo(model);
    scene.on("tick", () => {
        camera.orbitYaw(0.4);
    })
});