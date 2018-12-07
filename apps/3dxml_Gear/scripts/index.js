/*
 * A minimal app that views a glTF file.
 */
import {Viewer} from "../../../src/viewer/Viewer.js";
import {XML3DModelsPlugin} from "../../../src/viewer/plugins/XML3DModelsPlugin/XML3DModelsPlugin.js";
import {AxisGizmoPlugin} from "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";
import {ReflectionMap} from "./../../../src/xeogl/xeogl.module.js";

const viewer = new Viewer({
    canvasId: "myCanvas"
});

new ReflectionMap(viewer.scene, {
    src: [
        "./textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_PX.png",
        "./textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_NX.png",
        "./textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_PY.png",
        "./textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_NY.png",
        "./textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_PZ.png",
        "./textures/reflect/Uffizi_Gallery/Uffizi_Gallery_Radiance_NZ.png"
    ],
    encoding: "sRGB"
});

const xml3dModels = new XML3DModelsPlugin(viewer, {
    workerScriptsPath: "./../../../src/viewer/plugins/XML3DModelsPlugin/zipjs/"
});

const axisGizmo = new AxisGizmoPlugin(viewer, {size: [250, 250]});

const model = xml3dModels.load({
    id: "myModel",
    src: "./../../models/xml3d/3dpreview.3dxml",
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
