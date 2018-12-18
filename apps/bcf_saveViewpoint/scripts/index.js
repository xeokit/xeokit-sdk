/*
 * A minimal app that loads a glTF file and saves a BCF viewpoint
 */

import {Viewer} from "../../../src/viewer/Viewer.js";
import {GLTFLoaderPlugin} from "../../../src/viewer/plugins/GLTFModelsPlugin/GLTFModelsPlugin.js";
import {ClipsPlugin} from "../../../src/viewer/plugins/ClipsPlugin/ClipsPlugin.js";
import {BCFViewpointsPlugin} from "../../../src/viewer/plugins/BCFViewpointsPlugin/BCFViewpointsPlugin.js";

// Create a xeokit Viewer
const viewer = new Viewer({
    canvasId: "myCanvas"
});

// Add a GLTFModelsPlugin
const glTFModels = new GLTFLoaderPlugin(viewer);

// Add a ClipsPlugin
const clips = new ClipsPlugin(viewer);

// Add a BCFViewpointsPlugin
const bcfViewpoints = new BCFViewpointsPlugin(viewer);

// Load a glTF model
const model = glTFModels.load({
    id: "myModel",
    src: "./../../models/gltf/schependomlaan/schependomlaan.gltf",
    edges: true
});

// Create a clipping plane
clips.createClip({
    id: "myClip",
    pos: [0, 0, 0],
    dir: [0.5, 0.0, 0.5]
});

// When the model has loaded, arrange the camera and save a BCF viewpoint
model.on("loaded", () => {

    var scene = viewer.scene;
    var camera = scene.camera;

    camera.eye = [-2.37, 18.97, -26.12];
    camera.look = [10.97, 5.82, -11.22];
    camera.up = [0.36, 0.83, 0.40];

    scene.setSelected([
        "myModel#product-d5af753d-e8ff-467d-951c-bc66b940831a-body",
        "myModel#product-4e6cfbe8-2c4a-4b2e-92d8-dbaeeefe19f3-body.1",
        "myModel#product-4d959014-d715-4be0-9646-04ddb9384fe7-body",
        "myModel#product-42df0fcb-3410-43c8-af51-84653eecbfa3-body",
        "myModel#product-83ba020a-23c6-4a17-aa77-750345793211-body.0",
        "myModel#product-05f386ae-4fb9-420a-8bc7-c7b76aa264e6-body",
        "myModel#product-bc6847c1-5f7c-48ce-8f58-7834d0f8cc1c-body",
        "myModel#product-0e80f652-d76e-47f8-9beb-d1163367ad9e-body.3"
    ], true);

    const viewpoint = bcfViewpoints.getViewpoint();

    console.log(JSON.stringify(viewpoint, null, "  "));
});

window.viewer = viewer;

// const cameraControl = viewer.cameraControl;
//
// cameraControl.on("hoverEnter", function (hit) {
//     hit.mesh.highlighted = true;
//     console.log(hit.mesh.id);
// });
//
// cameraControl.on("hoverOut", function (hit) {
//     hit.mesh.highlighted = false;
// });

// cameraControl.on("picked", function (hit) {
//     var mesh = hit.mesh;
//     if (input.keyDown[input.KEY_SHIFT]) {
//         mesh.selected = !mesh.selected;
//         mesh.highlighted = !mesh.selected;
//     } else {
//         cameraFlight.flyTo(mesh);
//     }
// });
//
// cameraControl.on("pickedNothing", function (hit) {
//     cameraFlight.flyTo(model);
// });