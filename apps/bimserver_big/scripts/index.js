/**
 * Info on this example: https://github.com/xeolabs/xeokit.io/wiki/Loading-IFC-Models-from-BIMServer
 */

import BimServerClient from "http://localhost:8082/apps/bimserverjavascriptapi/bimserverclient.js";
import {Viewer} from "./../../../src/viewer/Viewer.js";
import {BIMServerBigLoaderPlugin} from "./../../../src/viewer/plugins/BIMServerLoaderPlugin/BIMServerBigLoaderPlugin.js";
import {StructurePanelPlugin} from "./../../../src/viewer/plugins/StructurePanelPlugin/StructurePanelPlugin.js";
import {PropertiesPanelPlugin} from "./../../../src/viewer/plugins/PropertiesPanelPlugin/PropertiesPanelPlugin.js";

const bimServerAddress = "http://localhost:8082";
const username = "admin@bimserver.org";
const password = "admin";
const poid = 131073;
//const poid = 393217;
//const poid = 458753;

const viewer = new Viewer({
    canvasId: "myCanvas"
});

const bimServerClient = new BimServerClient(bimServerAddress);

const bimServerBigLoader = new BIMServerBigLoaderPlugin(viewer, {
    bimServerClient: bimServerClient
});

const structurePanel = new StructurePanelPlugin(viewer, {
    domElementId: "structurePanel"
});

const propertiesPanel = new PropertiesPanelPlugin(viewer, {
    domElementId: "propertiesPanel"
});

structurePanel.on("clicked", e => {

    const objectId = e.objectId;
    const objectIds = viewer.metaScene.getSubObjectIDs(objectId);
    const aabb = viewer.scene.getAABB(objectIds);

    // viewer.scene.setSelected(viewer.scene.selectedObjectIds, false);
    // viewer.scene.setSelected(objectIds, true);

    viewer.cameraFlight.flyTo(aabb);
});

viewer.scene.input.on("mouseclicked", function (coords) {

    var hit = viewer.scene.pick({
        canvasPos: coords
    });

    if (hit) {
        var mesh = hit.mesh;
        var metaObject = viewer.metaScene.metaObjects[mesh.id];
        if (metaObject) {
            console.log(JSON.stringify(metaObject.getJSON(), null, "\t"));
        } else {
            const parent = mesh.parent;
            if (parent) {
                metaObject = viewer.metaScene.metaObjects[parent.id];
                if (metaObject) {
                    console.log(JSON.stringify(metaObject.getJSON(), null, "\t"));
                }
            }
        }
    }
});


bimServerClient.init(() => {

    bimServerClient.login(username, password, () => {

        bimServerClient.call("ServiceInterface", "getProjectByPoid", {
            poid: poid
        }, (project) => {

            // Load the latest revision of the project
            // Use whatever IFC schema that's for

            const roid = project.lastRevisionId;
            const schema = project.schema;

            const xeokitlModel = bimServerBigLoader.load({
                id: "myModel",
                poid: poid,
                roid: roid,
                schema: schema,
                scale: [0.001, 0.001, 0.001],   // Shrink the model a bit
                rotation: [-90, 0, 0],          // xeoglModel has Z+ axis as "up"
                edges: true,                    // Emphasize edges
                lambertMaterials: true          // Fast flat shaded rendering
            });

            xeokitlModel.on("loaded", () => {

                viewer.cameraFlight.flyTo(xeokitlModel);

                structurePanel.on("clicked", e => {
                    const objectId = e.objectId;
                    const objectIds = viewer.metaScene.getSubObjectIDs(objectId);
                    const aabb = viewer.scene.getAABB(objectIds);

                    viewer.scene.setSelected(viewer.scene.selectedObjectIds, false);
                    viewer.scene.setSelected(objectIds, true);

                    viewer.cameraFlight.flyTo(aabb);
                });
            });
        });
    });
});
