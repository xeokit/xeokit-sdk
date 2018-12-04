/**
 * Info on this example: https://github.com/xeolabs/xeokit.io/wiki/Loading-IFC-Models-from-BIMServer
 */

import BimServerClient from "http://localhost:8082/apps/bimserverjavascriptapi/bimserverclient.js";
import {Viewer} from "../../../src/viewer/Viewer.js";
import {BIMServerModelsPlugin} from "../../../src/viewer/plugins/BIMServerModelsPlugin/BIMServerModelsPlugin.js";

const bimServerAddress = "http://localhost:8082";
const username = "admin@bimserver.org";
const password = "admin";
const poid = 131073;

// Create a Viewer
const viewer = new Viewer({});

// Create a BIMServer client

const bimServerAPI = new BimServerClient(bimServerAddress);

// Add a BIMServerModelsPlugin that uses the client

const bimServerModelsPlugin = new BIMServerModelsPlugin(viewer, {
    bimServerAPI: bimServerAPI
});

// Initialize the BIMServer client

bimServerAPI.init(() => {

    // Login to BIMServer

    bimServerAPI.login(username, password, () => {

        // Query a project by ID

        bimServerAPI.call("ServiceInterface", "getProjectByPoid", {
            poid: poid
        }, (project) => {

            // Load the latest revision of the project

            const roid = project.lastRevisionId;
            const schema = project.schema;

            const model = bimServerModelsPlugin.load({
                id: "myModel",
                poid: poid,
                roid: roid,
                schema: schema,
                scale: [0.001, 0.001, 0.001],   // Shrink the model a bit
                rotation: [-90, 0, 0],          // Model has Z+ axis as "up"
                edges: true                     // Emphasize edges
            });

            const scene = viewer.scene;  // xeogl.Scene
            const camera = scene.camera; // xeogl.Camera

            model.on("loaded", () => {
                camera.orbitPitch(20);
                viewer.cameraFlight.flyTo(model);
                scene.on("tick", () => {
                    camera.orbitYaw(0.3);
                })
            });
        });
    });
});
