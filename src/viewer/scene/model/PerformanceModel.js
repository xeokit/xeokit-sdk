import {SceneModel} from "./SceneModel.js";

/**
 * @desc A high-performance model representation for efficient rendering and low memory usage.
 *
 * * PerformanceModel was replaced with {@link SceneModel} in ````xeokit-sdk v2.4````.
 * * PerformanceModel currently extends {@link SceneModel}, in order to maintain backward-compatibility until we remove PerformanceModel.
 * * See {@link SceneModel} for API details.
 *
 * @deprecated
 * @implements {Drawable}
 * @implements {Entity}
 * @extends {SceneModel}
 */
export class PerformanceModel extends SceneModel {

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
