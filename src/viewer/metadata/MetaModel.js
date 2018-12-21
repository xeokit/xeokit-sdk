import {MetaObject} from "./MetaObject.js";

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
    constructor(metaScene, id, projectId, revisionId, rootMetaObject) {

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
         * The project ID
         * @property projectId
         * @type {String|Number}
         */
        this.projectId = projectId;

        /**
         * The revision ID
         * @property revisionId
         * @type {String|Number}
         */
        this.revisionId = revisionId;

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

    getJSON() {

        var metaObjects = [];

        function visit(metaObject) {
            var metaObjectCfg = {
                objectId: metaObject.objectId,
                extId: metaObject.extId,
                type: metaObject.type,
                name: metaObject.name
            };
            if (metaObject.parent) {
                metaObjectCfg.parent = metaObject.parent.objectId;
            }
            metaObjects.push(metaObjectCfg);
            var children = metaObject.children;
            if (children) {
                for (var i = 0, len = children.length; i < len; i++) {
                    visit(children[i]);
                }
            }
        }

        visit(this.rootMetaObject);

        var json = {
            id: this.id,
            projectId: this.projectId,
            revisionId: this.revisionId,
            metaObjects: metaObjects
        };
        return json;
    }
}


export {MetaModel};