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
    constructor(params) {

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
        this.id = params.id;

        /**
         * The project ID
         * @property projectId
         * @type {String|Number}
         */
        this.projectId = params.projectId;

        /**
         * The revision ID, if available.
         *
         * Will be undefined if not available.
         *
         * @property revisionId
         * @type {String|Number}
         */
        this.revisionId = params.revisionId;

        /**
         * The model author, if available.
         *
         * Will be undefined if not available.
         *
         * @property author
         * @type {String}
         */
        this.author = params.author;

        /**
         * The date the model was created, if available.
         *
         * Will be undefined if not available.
         *
         * @property createdAt
         * @type {String}
         */
        this.createdAt = params.createdAt;

        /**
         * The application that created the model, if available.
         *
         * Will be undefined if not available.
         *
         * @property creatingApplication
         * @type {String}
         */
        this.creatingApplication = params.creatingApplication;

        /**
         * The model schema version, if available.
         *
         * Will be undefined if not available.
         *
         * @property schema
         * @type {String}
         */
        this.schema = params.schema;

        /**
         * Metadata on the {@link Scene}.
         *
         * @property metaScene
         * @type {MetaScene}
         */
        this.metaScene = params.metaScene;

        /**
         * The {@link PropertySet}s in this MetaModel.
         *
         * @property propertySets
         * @type  {PropertySet[]}
         */
        this.propertySets = [];

        /**
         * The root {@link MetaObject} in this MetaModel's composition structure hierarchy.
         *
         * @property rootMetaObject
         * @type {MetaObject}
         * @deprecated
         */
        this.rootMetaObject = null;

        /**
         * The root {@link MetaObject}s in this MetaModel's composition structure hierarchy.
         *
         * @property rootMetaObject
         * @type {MetaObject[]}
         */
        this.rootMetaObjects = [];

        /**
         * The {@link MetaObject}s in this MetaModel, each mapped to its ID.
         *
         * @property metaObjects
         * @type  {MetaObject[]}
         */
        this.metaObjects=[];

        /**
         * Connectivity graph.
         * @type {{}}
         */
        this.graph = params.graph || {};
    }

    getJSON() {

        const metaObjects = [];

        function visit(metaObject) {
            const metaObjectCfg = {
                id: metaObject.id,
                extId: metaObject.extId,
                type: metaObject.type,
                name: metaObject.name
            };
            if (metaObject.parent) {
                metaObjectCfg.parent = metaObject.parent.id;
            }
            metaObjects.push(metaObjectCfg);
            const children = metaObject.children;
            if (children) {
                for (let i = 0, len = children.length; i < len; i++) {
                    visit(children[i]);
                }
            }
        }

        visit(this.rootMetaObject);

        const json = {
            id: this.id,
            projectId: this.projectId,
            revisionId: this.revisionId,
            metaObjects: metaObjects
        };
        return json;
    }
}


export {MetaModel};