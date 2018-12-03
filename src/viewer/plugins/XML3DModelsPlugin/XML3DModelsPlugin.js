import {ModelsPlugin} from "./../../ModelsPlugin.js";
import {XML3DModel} from "./XML3DModel.js";


/**
 * A viewer plugin that loads models from [3DXML](https://en.wikipedia.org/wiki/3DXML).
 *
 * # Overview
 *
 * - Supports the 3DXML V4.2 Schema
 * - We've massaged the name to XML3DModelsPlugin because it's not permitted to start a ECMA6 class name with a numeral.
 *
 * @example
 * const viewer = new Viewer({
 *      canvasId: "glcanvas"
 * });
 *
 * const plugin = new XML3DModelsPlugin(viewer, {
 *    id: "xml3d",                                               // Optional plugin ID
 *    workerScriptsPath : "../../src/plugins/XML3DModels/zipjs/" // Path to zip.js workers dir
 * });
 *
 * const model = viewer.plugins.xml3d.load({                     // Find plugin on Viewer using its ID
 *   id: "myModel",
 *   src: "./models/XML3D/3dpreview.3dxml",
 *   edges: true,                                                // Default is false
 *   scale: [1.0, 1.0, 1.0]                                      // Default
 * });
 *
 * @class XML3DModelsPlugin
 */
class XML3DModelsPlugin extends ModelsPlugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="XML3DModels"] Optional ID for this plugin, with which we can find it within {@link Viewer#plugins}.
     * @param {String} cfg.workerScriptsPath Path to the directory that contains the
     * bundled [zip.js](https://gildas-lormeau.github.io/zip.js/) archive, which is a dependency of this plugin. This directory
     * contains the script that is used by zip.js to instantiate Web workers, which assist with unzipping the 3DXML, which is a ZIP archive.
     */
    constructor(viewer, cfg) {
        super("XML3DModels", viewer, XML3DModel, cfg);
        cfg = cfg || {};
        if (!cfg.workerScriptsPath) {
            this.error("Config expected: workerScriptsPath");
            return
        }
        this._workerScriptsPath = cfg.workerScriptsPath;
    }

    /**
     Loads a 3DXML model into the viewer.

     */
    load(params) {
        params.workerScriptsPath = this._workerScriptsPath;
        return super.load(params);
    }
}

export {XML3DModelsPlugin}