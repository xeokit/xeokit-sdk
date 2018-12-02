import {ModelsPlugin} from "./../../../viewer/ModelsPlugin.js";
import {OBJModel} from "./../../../xeogl/OBJModel/OBJModel.js";

/**
 A viewer plugin that loads models from <a href="https://en.wikipedia.org/wiki/Wavefront_.obj_file">OBJ</a> format.

 Depends on: xeogl.OBJModel

 @class OBJModelsPlugin
 @constructor
 @param viewer {Viewer} The xeoviewer viewer.
 */
class OBJModelsPlugin extends ModelsPlugin {

    constructor(viewer, cfg) {
        super("OBJModels", viewer, OBJModel, cfg);
    }

    // TODO: comment
    load(params) {
        return super.load(params);
    }
}

export {OBJModelsPlugin}