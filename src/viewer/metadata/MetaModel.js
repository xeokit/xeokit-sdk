import {PropertySet} from "./PropertySet.js";
import {MetaObject} from "./MetaObject.js";
import {math} from "../scene/math/math.js";

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
         * @type  {{String:MetaObject}}
         */
        this.metaObjects = {};

        /**
         * Connectivity graph.
         * @type {{}}
         */
        this.graph = params.graph || {};

        this.metaScene.metaModels[this.id] = this;

        this._propertyLookup = [];

        /**
         * True when this MetaModel has been finalized.
         * @type {boolean}
         */
        this.finalized = false;
    }

    /**
     * Backwards compatibility with the model having a single root MetaObject.
     *
     * @property rootMetaObject
     * @type {MetaObject|null}
     */
    get rootMetaObject() {
        if (this.rootMetaObjects.length === 1) {
            return this.rootMetaObjects[0];
        }
        return null;
    }

    /**
     * Load metamodel data into this MetaModel.
     * @param metaModelData
     */
    loadData(metaModelData, options = {}) {

        if (this.finalized) {
            throw "MetaScene already finalized - can't add more data";
        }

        this._globalizeIDs(metaModelData, options)

        const metaScene = this.metaScene;
        const propertyLookup = metaModelData.properties;

        if (propertyLookup) {
            for (let i = 0, len = propertyLookup.length; i < len; i++) {
                this._propertyLookup.push(propertyLookup[i]);
            }
        }

        // Create global Property Sets

        if (metaModelData.propertySets) {
            for (let i = 0, len = metaModelData.propertySets.length; i < len; i++) {
                const propertySetData = metaModelData.propertySets[i];
                if (!propertySetData.properties) { // HACK: https://github.com/Creoox/creoox-ifc2gltfcxconverter/issues/8
                    propertySetData.properties = [];
                }
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
                const id = metaObjectData.id;
                let metaObject = metaScene.metaObjects[id];
                if (!metaObject) {
                    const type = metaObjectData.type;
                    const originalSystemId = metaObjectData.originalSystemId;
                    const propertySetIds = metaObjectData.propertySets || metaObjectData.propertySetIds;
                    metaObject = new MetaObject({
                        id,
                        originalSystemId,
                        parentId: metaObjectData.parent,
                        type,
                        name: metaObjectData.name,
                        attributes: metaObjectData.attributes,
                        propertySetIds,
                        external: metaObjectData.external,
                    });
                    this.metaScene.metaObjects[id] = metaObject;
                    metaObject.metaModels = [];
                }
                this.metaObjects[id] = metaObject;
                if (!metaObjectData.parent) {
                    this.rootMetaObjects.push(metaObject);
                    metaScene.rootMetaObjects[id] = metaObject;
                }
                metaObject.metaModels.push(this);
            }
        }
    }

    _decompressProperties(propertyLookup, properties) {
        const propsNotFound = [];
        for (let i = 0, len = properties.length; i < len; i++) {
            const property = properties[i];
            if (Number.isInteger(property)) {
                const lookupProperty = propertyLookup[property];
                if (lookupProperty) {
                    properties[i] = lookupProperty;
                } else {
                    propsNotFound.push(property);
                }
            }
        }
        if (propsNotFound.length > 0) {
            console.error(`[MetaModel._decompressProperties] Properties not found: ${propsNotFound}`);
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

        // Relink MetaObjects to their MetaModels

        for (let objectId in metaScene.metaObjects) {
            const metaObject = metaScene.metaObjects[objectId];
            metaObject.metaModels = [];
        }

        for (let modelId in metaScene.metaModels) {
            const metaModel = metaScene.metaModels[modelId];
            for (let objectId in metaModel.metaObjects) {
                const metaObject = metaModel.metaObjects[objectId];
                metaObject.metaModels.push(metaModel);
            }
        }

        // Rebuild MetaScene's MetaObjects-by-type lookup

        metaScene.metaObjectsByType = {};
        for (let objectId in metaScene.metaObjects) {
            const metaObject = metaScene.metaObjects[objectId];
            const type = metaObject.type;
            (metaScene.metaObjectsByType[type] || (metaScene.metaObjectsByType[type] = {}))[objectId] = metaObject;
        }

        // Decompress properties

        if (this.propertySets) {
            for (let i = 0, len = this.propertySets.length; i < len; i++) {
                const propertySet = this.propertySets[i];
                this._decompressProperties(this._propertyLookup, propertySet.properties);
            }
        }


        this._propertyLookup = [];

        this.finalized = true;

        this.metaScene.fire("metaModelCreated", this.id);
    }

    /**
     * Gets this MetaModel as JSON.
     * @returns {{schema: (String|string|*), createdAt: (String|string|*), metaObjects: *[], author: (String|string|*), id: (String|Number|string|number|*), creatingApplication: (String|string|*), projectId: (String|Number|string|number|*), propertySets: *[]}}
     */
    getJSON() {
        const json = {
            id: this.id,
            projectId: this.projectId,
            author: this.author,
            createdAt: this.createdAt,
            schema: this.schema,
            creatingApplication: this.creatingApplication,
            metaObjects: [],
            propertySets: []
        };
        const metaObjectsList = Object.values(this.metaObjects);
        for (let i = 0, len = metaObjectsList.length; i < len; i++) {
            const metaObject = metaObjectsList[i];
            const metaObjectCfg = {
                id: metaObject.id,
                originalSystemId: metaObject.originalSystemId,
                extId: metaObject.extId,
                type: metaObject.type,
                name: metaObject.name
            };
            if (metaObject.parent) {
                metaObjectCfg.parent = metaObject.parent.id;
            }
            if (metaObject.attributes) {
                metaObjectCfg.attributes = metaObject.attributes;
            }
            if (metaObject.propertySetIds) {
                metaObjectCfg.propertySetIds = metaObject.propertySetIds;
            }
            json.metaObjects.push(metaObjectCfg);
        }
        for (let i = 0, len = this.propertySets.length; i < len; i++) {
            const propertySet = this.propertySets[i];
            const propertySetCfg = {
                id: propertySet.id,
                originalSystemId: propertySet.originalSystemId,
                extId: propertySet.extId,
                type: propertySet.type,
                name: propertySet.name,
                propertyies: []
            };
            for (let j = 0, lenj = propertySet.properties.length; j < lenj; j++) {
                const property = propertySet.properties[j];
                const propertyCfg = {
                    id: property.id,
                    description: property.description,
                    type: property.type,
                    name: property.name,
                    value: property.value,
                    valueType: property.valueType
                };
                propertySetCfg.properties.push(propertyCfg);
            }
            json.propertySets.push(propertySetCfg);
        }
        return json;
    }

    _globalizeIDs(metaModelData, options) {

        const globalize = !!options.globalizeObjectIds;

        if (metaModelData.metaObjects) {
            for (let i = 0, len = metaModelData.metaObjects.length; i < len; i++) {
                const metaObjectData = metaModelData.metaObjects[i];

                // Globalize MetaObject IDs and parent IDs

                metaObjectData.originalSystemId = metaObjectData.id;
                if (metaObjectData.parent) {
                    metaObjectData.originalParentSystemId = metaObjectData.parent;
                }
                if (globalize) {
                    metaObjectData.id = math.globalizeObjectId(this.id, metaObjectData.id);
                    if (metaObjectData.parent) {
                        metaObjectData.parent = math.globalizeObjectId(this.id, metaObjectData.parent);
                    }
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
                    propertySet.id = math.globalizeObjectId(this.id, propertySet.id);
                }
            }
        }
    }
}


export {MetaModel};