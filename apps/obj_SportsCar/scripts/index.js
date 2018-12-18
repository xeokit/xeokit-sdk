
import {Viewer} from "../../../src/viewer/Viewer.js";
import {OBJLoaderPlugin} from "../../../src/viewer/plugins/OBJLoaderPlugin/OBJLoaderPlugin.js";
import {AxisGizmoPlugin} from "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";

const viewer = new Viewer({
    canvasId: "myCanvas"
});

const objLoader = new OBJLoaderPlugin(viewer);

const axisGizmo = new AxisGizmoPlugin(viewer, {size: [250, 250]});

const model = objLoader.load({
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
    });

    viewer.scene.setSelected(["myModel#221", "myModel#238"], true);
});

window.viewer = viewer;