/**
 * @desc Metadata corresponding to an {@link Entity} that represents a model.
 *
 * An {@link Entity} represents a model when {@link Entity#isModel} is ````true````
 *
 * A MetaModel corresponds to an {@link Entity} by having the same {@link MetaModel#id} as the {@link Entity#id}.
 *
 * A MetaModel is created by {@link MetaScene#createMetaModel} and belongs to a {@link MetaScene}.
 *
 * Each MetaModel is registered by {@link MetaModel#id} in {@link MetaScene#metaModels}.
 *
 * A {@link MetaModel} represents its object structure with a tree of {@link MetaObject}s, with {@link MetaModel#rootMetaObject} referencing the root {@link MetaObject}.
 *
 * @class MetaModel
 */
class MetaModel {

    /**
     * @private
     */
    constructor(metaScene, id, projectId, revisionId, author, createdAt, creatingApplication, schema, rootMetaObject) {

        /**
         * Globally-unique ID.
         *
         * MetaModels are registered by ID in {@link MetaScene#metaModels}.
         *
         * When this MetaModel corresponds to an {@link Entity} then this ID will match the {@link Entity#id}.
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
         * The revision ID, if available.
         *
         * Will be undefined if not available.
         *
         * @property revisionId
         * @type {String|Number}
         */
        this.revisionId = revisionId;

        /**
         * The model author, if available.
         *
         * Will be undefined if not available.
         *
         * @property author
         * @type {String}
         */
        this.author = author;

        /**
         * The date the model was created, if available.
         *
         * Will be undefined if not available.
         *
         * @property createdAt
         * @type {String}
         */
        this.createdAt = createdAt;

        /**
         * The application that created the model, if available.
         *
         * Will be undefined if not available.
         *
         * @property creatingApplication
         * @type {String}
         */
        this.creatingApplication = creatingApplication;

        /**
         * The model schema version, if available.
         *
         * Will be undefined if not available.
         *
         * @property schema
         * @type {String}
         */
        this.schema = schema;

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
                id: metaObject.id,
                extId: metaObject.extId,
                type: metaObject.type,
                name: metaObject.name
            };
            if (metaObject.parent) {
                metaObjectCfg.parent = metaObject.parent.id;
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