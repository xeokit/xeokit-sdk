/*
 * A minimal app that views a glTF file.
 */

import {Viewer} from "../../../src/viewer/Viewer.js";
import {GLTFModelsPlugin} from "../../../src/viewer/plugins/GLTFModelsPlugin/GLTFModelsPlugin.js";
import {AxisGizmoPlugin} from "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";

const viewer = new Viewer({
    canvasId: "myCanvas"
});

new GLTFModelsPlugin(viewer, {id: "gltf"});
new AxisGizmoPlugin(viewer, {id: "axis", size: [250, 250]});

const model = viewer.plugins.gltf.load({
    id: "foo",
    src: "./../../models/gltf/schependomlaan/schependomlaan.gltf",
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
