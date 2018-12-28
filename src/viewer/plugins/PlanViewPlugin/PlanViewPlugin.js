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
}

export {PlanViewPlugin}