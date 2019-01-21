import {Plugin} from "./../../../viewer/Plugin.js";

class PlanViewPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="PlanView"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {
        super("PlanView", viewer, cfg);
    }

    /**
     *
     * @param params
     */
    createPlanView(params) {
        // const modelId = params.modelId;
        // const metaModel = this.viewer.metaScene.metaModels[modelId];
        // if (!metaModel) {
        //     this.error("Model not found: " + modelId);
        //     return;
        // }
        const viewer = this.viewer;
        const scene = viewer.scene;
        scene.setObjectsVisible(scene.visibleObjectIds,  false);
        const wallObjectIds = viewer.metaScene.getObjectIDsByType("IfcWallStandardCase");
        scene.setObjectsVisible(wallObjectIds,  true);
        scene.canvas.getSnapshot({
        }, function(snapshot) {
            console.log(snapshot);
        });
    }
}

export {PlanViewPlugin}