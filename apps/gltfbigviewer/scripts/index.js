/*
 * A minimal app that views a huge glTF file.
 */
import {Viewer} from "../../../src/viewer/Viewer.js";
import {GLTFBigModelsPlugin} from "../../../src/viewer/plugins/GLTFBigModelsPlugin/GLTFBigModelsPlugin.js";
import {AxisGizmoPlugin} from "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";

export default class HugeGLTFViewerApp {

    constructor(cfg) {
    }

    start() {

        const viewer = new Viewer({
            canvasId: "glcanvas"
        });

        new GLTFBigModelsPlugin(viewer, {id: "gltf"});
        new AxisGizmoPlugin(viewer, {id: "axis", size: [250, 250]});

        const model = viewer.plugins["gltf"].load({
            id: "./../../models/gltf/modern_office/scene.gltf",
            src: this.src,
            edges: true
        });

        viewer.scene.camera.orbitPitch(20);

        model.on("loaded", () => {
            viewer.cameraFlight.flyTo(model);
        });
    }
}

new HugeGLTFViewerApp().start();