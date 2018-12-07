import {Plugin} from "./../../../viewer/Plugin.js";

/**
 * A viewer plugin that supports WebVR.
 *
 * @class WebVRPlugin
 */
class WebVRPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="WebVR"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {
        super("WebVR", viewer, cfg);
    }
}

export {WebVRPlugin}