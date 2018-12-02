import {_apply} from "../../../xeogl/xeogl.module.js"
import {GLTFModel} from "././../../../xeogl/GLTFModel/GLTFModel.js";

import {ModelsPlugin} from "./../../../viewer/ModelsPlugin.js";

/**
 A viewer plugin that loads models from [glTF](https://www.khronos.org/gltf/).

 Depends on: xeogl.GLTFModel

 @class GLTFModelsPlugin
 @constructor
 @param viewer {Viewer} The xeoviewer viewer.
 */
class GLTFModelsPlugin extends ModelsPlugin {

    constructor(viewer, cfg) {
        super("GLTFModels", viewer, GLTFModel, cfg);
    }

    /**
     Loads a glTF model from the file system into the viewer.
     */
    load(params) {

        var modelId = params.id;
        var self = this;

        return super.load(_apply(params, {
            handleNode: function (nodeInfo, actions) {
                return self._defaultHhandleNode(modelId, nodeInfo, actions);
            }
        }));
    }

    _defaultHhandleNode(modelId, nodeInfo, actions) {
        var name = nodeInfo.name;
        if (!name) {
            return true; // Continue descending this node subtree
        }
        actions.createObject = {
            id: modelId + "#" + name,
            entityType: "default",
            visible: true
        };
        return true; // Continue descending this glTF node subtree
    }
}

export {GLTFModelsPlugin}