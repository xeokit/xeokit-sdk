/**
 * Metadata for a {@link Model} within a {@link Viewer}'s {@link Scene}.
 *
 * * Each MetaModel corresponds to at least one {@link Model} in the {@link Scene}.
 * * MetaModels are created by {@link MetaScene#createMetaModel}, which registers them by ID in {@link MetaScene#metaModels}.
 * * {@link MetaObject}s are connected into a structural composition hierarchy, with {@link MetaModel#rootMetaObject} pointing to the root.
 *
 * @class MetaModel
 */
class MetaModel {

    /**
     * @private
     */
    constructor(metaScene, id, rootMetaObject) {

        /**
         * Unique ID.
         *
         * MetaModels are registered by ID in {@link MetaScene#metaModels}.
         *
         * @property id
         * @type {String|Number}
         */
        this.id = id;

        /**
         * Metadata on the {@link Scene}.
         *
         * @property metaScene
         * @type {MetaScene}
         */
        this.metaScene = metaScene;

        /**
         * The root {@link MetaObject} in this MetaModel's composition structure hierarchy.
         *
         * @property rootMetaObject
         * @type {MetaObject}
         */
        this.rootMetaObject = rootMetaObject;
    }
}

export {MetaModel};