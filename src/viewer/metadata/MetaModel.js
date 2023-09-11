import {PropertySet} from "./PropertySet";
import {MetaObject} from "./MetaObject";
import {math} from "../scene";

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
     * Creates a new, unfinalized MetaModel.
     *
     * * The MetaModel is immediately registered by {@link MetaModel#id} in {@link MetaScene#metaModels}, even though it's not yet populated.
     * * The MetaModel then needs to be populated with one or more calls to {@link metaModel#loadData}.
     * * As we populate it, the MetaModel will create {@link MetaObject}s and {@link PropertySet}s in itself, and in the MetaScene.
     * * When populated, call {@link MetaModel#finalize} to finish it off, which causes MetaScene to fire a "metaModelCreated" event.
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

        this.metaScene.metaModels[this.id] = this;

        /**
         * True when this MetaModel has been finalized.
         * @type {boolean}
         */
        this.finalized = false;
    }

    /**
     * Load metamodel data into this MetaModel.
     * @param metaModelData
     */
    loadData(metaModelData, options={}) {

        if (this.finalized) {
            throw "MetaScene already finalized - can't add more data";
        }

        this._globalizeIDs(metaModelData, options)

        const metaScene = this.metaScene;

        // Create global Property Sets

        if (metaModelData.propertySets) {
            for (let i = 0, len = metaModelData.propertySets.length; i < len; i++) {
                const propertySetData = metaModelData.propertySets[i];
                let propertySet = metaScene.propertySets[propertySetData.id];
                if (!propertySet) {
                    propertySet = new PropertySet({
                        id: propertySetData.id,
                        originalSystemId: propertySetData.originalSystemId || propertySetData.id,
                        type: propertySetData.type,
                        name: propertySetData.name,
                        properties: propertySetData.properties
                    });
                    metaScene.propertySets[propertySet.id] = propertySet;
                }
                propertySet.metaModels.push(this);
                this.propertySets.push(propertySet);
            }
        }

        if (metaModelData.metaObjects) {
            for (let i = 0, len = metaModelData.metaObjects.length; i < len; i++) {
                const metaObjectData = metaModelData.metaObjects[i];
                let metaObject = metaScene.metaObjects[id];
                if (!metaObject) {
                    const type = metaObjectData.type;
                    const id = metaObjectData.id;
                    const originalSystemId = metaObjectData.originalSystemId;
                    const propertySetIds = metaObjectData.propertySets || metaObjectData.propertySetIds;
                    metaObject = new MetaObject({
                        id,
                        originalSystemId,
                        parentId: metaObjectData.parent,
                        type,
                        name: metaObjectData.name,
                        attributes: metaObjectData.attributes,
                        propertySetIds
                    });
                    this.metaScene.metaObjects[id] = metaObject;
                }
                metaObject.metaModels.push(this);
                if (!metaObjectData.parent) {
                    this.rootMetaObjects.push(metaObject);
                    metaScene.rootMetaObjects[id] = metaObject;
                }
                this.metaObjects.push(metaObject);
            }
        }
    }

    finalize() {

        if (this.finalized) {
            throw "MetaScene already finalized - can't re-finalize";
        }

        // Re-link MetaScene's entire MetaObject parent/child hierarchy

        const metaScene = this.metaScene;

        for (let objectId in metaScene.metaObjects) {
            const metaObject = metaScene.metaObjects[objectId];
            if (metaObject.children) {
                metaObject.children = [];
            }

            // Re-link each MetaObject's property sets

            if (metaObject.propertySets) {
                metaObject.propertySets = [];
            }
            if (metaObject.propertySetIds) {
                for (let i = 0, len = metaObject.propertySetIds.length; i < len; i++) {
                    const propertySetId = metaObject.propertySetIds[i];
                    const propertySet = metaScene.propertySets[propertySetId];
                    metaObject.propertySets.push(propertySet);
                }
            }
        }

        for (let objectId in metaScene.metaObjects) {
            const metaObject = metaScene.metaObjects[objectId];
            if (metaObject.parentId) {
                const parentMetaObject = metaScene.metaObjects[metaObject.parentId];
                if (parentMetaObject) {
                    metaObject.parent = parentMetaObject;
                    (parentMetaObject.children || (parentMetaObject.children = [])).push(metaObject);
                }
            }
        }

        // Rebuild MetaScene's MetaObjects-by-type lookup

        metaScene.metaObjectsByType = {};
        for (let objectId in metaScene.metaObjects) {
            const metaObject = metaScene.metaObjects[objectId];
            const type = metaObject.type;
            (metaScene.metaObjectsByType[type] || (metaScene.metaObjectsByType[type] = {}))[objectId] = metaObject;
        }

        this.finalized = true;

        this.metaScene.fire("metaModelCreated", this.id);
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

    _globalizeIDs(metaModelData, options) {

        const globalize = !!options.globalizeObjectIds;

        if (metaModelData.metaObjects) {
            for (let i = 0, len = metaModelData.metaObjects.length; i < len; i++) {
                const metaObjectData = metaModelData.metaObjects[i];

                // Globalize MetaObject IDs and parent IDs

                metaObjectData.originalSystemId = metaObjectData.id;
                metaObjectData.originalParentSystemId = metaObjectData.parent;
                if (globalize) {
                    metaObjectData.id = math.globalizeObjectId(this.id, metaObjectData.id);
                    metaObjectData.parent = math.globalizeObjectId(this.id, metaObjectData.parent);
                }

                // Globalize MetaObject property set IDs

                if (globalize) {
                    const propertySetIds = metaObjectData.propertySetIds;
                    if (propertySetIds) {
                        const propertySetGlobalIds = [];
                        for (let j = 0, lenj = propertySetIds.length; j < lenj; j++) {
                            propertySetGlobalIds.push(math.globalizeObjectId(this.id, propertySetIds[j]));
                        }
                        metaObjectData.propertySetIds = propertySetGlobalIds;
                        metaObjectData.originalSystemPropertySetIds = propertySetIds;
                    }
                } else {
                    metaObjectData.originalSystemPropertySetIds = metaObjectData.propertySetIds;
                }
            }
        }

        // Globalize global PropertySet IDs

        if (metaModelData.propertySets) {
            for (let i = 0, len = metaModelData.propertySets.length; i < len; i++) {
                const propertySet = metaModelData.propertySets[i];
                propertySet.originalSystemId = propertySet.id;
                if (globalize) {
                    propertySet.id = math.globalizeObjectId(mothis.id, propertySet.id);
                }
            }
        }
    }
}


export {MetaModel};