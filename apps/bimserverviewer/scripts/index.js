import BimServerClient from "http://localhost:8082/apps/bimserverjavascriptapi/bimserverclient.js"
import {Viewer} from "../../../src/viewer/Viewer.js";
import {BIMServerModelsPlugin} from "../../../src/viewer/plugins/BIMServerModelsPlugin/BIMServerModelsPlugin.js";
import {AxisGizmoPlugin} from "../../../src/viewer/plugins/AxisGizmoPlugin/AxisGizmoPlugin.js";

const bimServerAddress = "http://localhost:8082";
const username = "admin@bimserver.org";
const password = "admin";
const poid = 196609;

const viewer = new Viewer({});

// Create a BIMServer client API

const bimServerClient = new BimServerClient(bimServerAddress);

// Fire up the client API

bimServerClient.init(() => {

    // Login to the client API

    bimServerClient.login(username, password, () => {

        // Query BIMServer project

        bimServerClient.call("ServiceInterface", "getProjectByPoid", { // TODO: Redundant?
            poid: poid
        }, (project) => {

            // Create a viewer plugin to load BIMServer models into the viewer via the client API

            const bimServerModelsPlugin = new BIMServerModelsPlugin(viewer, bimServerClient);

            // Load the latest revision of a project from BIMServer

            const model = bimServerModelsPlugin.load({
                id: "myModel",
                poid: 196609,
                roid: project.lastRevisionId,
                schema: project.schema
            });
        });
    });
});
