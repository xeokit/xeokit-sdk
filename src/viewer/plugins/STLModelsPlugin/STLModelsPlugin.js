import {ModelsPlugin} from "./../../../viewer/ModelsPlugin.js";
import {STLModel} from "./../../../xeogl/STLModel/STLModel.js";

/**
 A viewer plugin that loads models from <a href="https://en.wikipedia.org/wiki/STL_(file_format)">STL</a> format.

 Depends on: xeogl.STLFModel

 @class STLModelsPlugin
 @constructor
 @param viewer {Viewer} The xeoviewer viewer.
 */
class STLModelsPlugin extends ModelsPlugin {

    constructor(viewer, cfg) {
        super("STLModels", viewer, STLModel, cfg);
    }

    // TODO: comment
    load(params) {
        return super.load(params);
    }
}

export {STLModelsPlugin}