import {MetaObject} from "./MetaObject.js";

/**
 * @desc Metadata corresponding to a model within a {@link Scene}.
 *
 * * Belongs to a {@link MetaScene}.
 * * Corresponds to a model loaded into a {@link Scene}.
 * * Created by {@link MetaScene#createMetaModel}.
 * * Registered by {@link MetaModel#modelId} in {@link MetaScene#metaModels}.
 * * Each model within a {@link Scene} is represented either by a {@link Node} that has a {@link Node#modelId} or a {@link Mesh} that has a {@link Mesh#modelId}.
 * * Contains {@link MetaObject}s, which  are connected into a hierarchy with {@link MetaModel#rootMetaObject} referencing the root.
 *
 * @class MetaModel
 */
class MetaModel {

    /**
     * @private
     */
    constructor(metaScene, modelId, projectId, revisionId, rootMetaObject) {

        /**
         * Unique ID.
         *
         * MetaModels are registered by ID in {@link MetaScene#metaModels}.
         *
         * @property id
         * @type {String|Number}
         */
        this.modelId = modelId;

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