/**
 * @desc A plan view managed by a {@link StoreyViewsPlugin}.
 */
class StoreyView {

    /**
     * @private
     */
    constructor(aabb, modelId, storeyObjectId, snapshotData) {

        /**
         *
         */
        this.aabb = aabb.slice();

        /**
         *
         */
        this.modelId = modelId;

        /**
         *
         */
        this.storeyObjectId = storeyObjectId;

        /**
         *
         */
        this.snapshotData = snapshotData;
    }
}

export {StoreyView};