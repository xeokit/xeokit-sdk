import {VBOSceneModel} from "./../VBOSceneModel/index.js";

/**
 * @desc A high-performance model representation for efficient rendering and low memory usage.
 *
 * * This class was replaced with {@link VBOSceneModel} in ````xeokit-sdk v2.3.0````.
 * * This class currently extends {@link VBOSceneModel}, in order to maintain backward-compatibility until we remove it.
 * * See {@link VBOSceneModel} for API details.
 *
 * @deprecated
 * @implements {Drawable}
 * @implements {Entity}
 * @implements {SceneModel}
 */
class PerformanceModel extends VBOSceneModel {

    /**
     * See {@link VBOSceneModel} for details.
     *
     * @param owner
     * @param cfg
     */
    constructor(owner, cfg = {}) {
        super(owner, cfg);
    }
}

export {PerformanceModel};