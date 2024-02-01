import {SceneModel} from "./SceneModel.js";

/**
 * @desc A high-performance model representation for efficient rendering and low memory usage.
 *
 * * VBOSceneModel was replaced with {@link SceneModel} in ````xeokit-sdk v2.4````.
 * * VBOSceneModel currently extends {@link SceneModel}, in order to maintain backward-compatibility until we remove VBOSceneModel.
 * * See {@link SceneModel} for API details.
 *
 * @deprecated
 * @implements {Drawable}
 * @implements {Entity}
 * @extends {SceneModel}
 */
export class VBOSceneModel extends SceneModel {

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
