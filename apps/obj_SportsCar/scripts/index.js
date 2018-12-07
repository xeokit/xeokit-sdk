/*
 * A minimal app that views an OBJ file.
 */

import {Viewer} from "../../../src/viewer/Viewer.js";
import {OBJModelsPlugin} from "../../../src/viewer/plugins/OBJModelsPlugin/OBJModelsPlugin.js";
import {AxisGizmoPlugin} from "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";

const viewer = new Viewer({
    canvasId: "myCanvas"
});

const objModels = new OBJModelsPlugin(viewer);

const axisGizmo = new AxisGizmoPlugin(viewer, {size: [250, 250]});

const model = objModels.load({
    id: "myModel",
    src: "./../../models/obj/sportsCar/sportsCar.obj",
    edges: true
});

const scene = viewer.scene;
const camera = scene.camera;

camera.orbitPitch(20);

model.on("loaded", () => {
    viewer.cameraFlight.flyTo(model);
    viewer.scene.on("tick", () => {
        camera.orbitYaw(0.4);
    })
});
