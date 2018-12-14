/**
 * Info on this example: https://github.com/xeolabs/xeokit.io/wiki/Loading-IFC-Models-from-BIMServer
 */

import BimServerClient from "http://localhost:8082/apps/bimserverjavascriptapi/bimserverclient.js";
import {Viewer} from "../../../src/viewer/Viewer.js";
import {BIMServerModelsPlugin} from "../../../src/viewer/plugins/BIMServerModelsPlugin/BIMServerModelsPlugin.js";
import {StructurePanelPlugin} from "../../../src/viewer/plugins/StructurePanelPlugin/StructurePanelPlugin.js";
import {PropertiesPanelPlugin} from "../../../src/viewer/plugins/PropertiesPanelPlugin/PropertiesPanelPlugin.js";

const bimServerAddress = "http://localhost:8082";
const username = "admin@bimserver.org";
const password = "admin";
//const poid = 131073;
//const poid = 393217;
const poid = 458753;

const viewer = new Viewer({
    canvasId: "myCanvas"
});

const bimServerClient = new BimServerClient(bimServerAddress);

const bimServerModels = new BIMServerModelsPlugin(viewer, {
    bimServerClient: bimServerClient
});

const structurePanel = new StructurePanelPlugin(viewer, {
    domElementId: "structurePanel"
});

const propertiesPanel = new PropertiesPanelPlugin(viewer, {
    domElementId: "propertiesPanel"
});

bimServerClient.init(() => {

    bimServerClient.login(username, password, () => {

        bimServerClient.call("ServiceInterface", "getProjectByPoid", {
            poid: poid
        }, (project) => {

            // Load the latest revision of the project

            const roid = project.lastRevisionId;
            const schema = project.schema;

            const xeoglModel = bimServerModels.load({
                id: "myModel",
                poid: poid,
                roid: roid,
                schema: schema,
                scale: [0.001, 0.001, 0.001],   // Shrink the model a bit
                rotation: [-90, 0, 0],          // xeoglModel has Z+ axis as "up"
                edges: true,                    // Emphasize edges
                lambertMaterials: true          // Fast flat shaded rendering
            });

            const scene = viewer.scene;  // xeogl.Scene
            const camera = scene.camera; // xeogl.Camera

            xeoglModel.on("loaded", () => {

                camera.orbitPitch(20);
                viewer.cameraFlight.flyTo(xeoglModel);

                structurePanel.on("selection-changed", function (e) {

                });

                structurePanel.on("click", function (e) {

                    const viewerObjectId = e.viewerObjectId;
                    const objectId = e.objectId; // TODO: rename "elementId" or something

                    scene.setSelected(scene.selectedEntityIds, false);
                    scene.setSelected(viewerObjectId, true);

                    const elementData = viewer.metadata.elements[objectId];

                    //---------------------- TODO -------------------------------
                    // propertiesPanel.setElement(objectId);
                    //-----------------------------------------------------------

                    console.log(JSON.stringify(elementData, null, "\t"));
                });
            });

            window.xeoglModel = xeoglModel;
        });
    });
});
