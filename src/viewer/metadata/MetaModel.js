import {MetaObject} from "./MetaObject.js";

/**
 * @desc Metadata corresponding to an {@link Entity} that represents a model.
 *
 * * Belongs to a {@link MetaScene}.
 * * Created by {@link MetaScene#createMetaModel}.
 * * Registered by {@link MetaModel#id} in {@link MetaScene#metaModels}.
 * * Contains {@link MetaObject}s, which  are connected into a hierarchy with {@link MetaModel#rootMetaObject} referencing the root.
 * * An {@link Entity} represents a model when it has a {@link Entity#modelId}.
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