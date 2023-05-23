import {MetaModel} from "./MetaModel.js";
import {MetaObject} from "./MetaObject.js";
import {PropertySet} from "./PropertySet.js";
import {math} from "../scene/math/math.js";

/**
 * @desc Metadata corresponding to a {@link Scene}.
 *
 * * Located in {@link Viewer#metaScene}.
 * * Contains {@link MetaModel}s and {@link MetaObject}s.
 * * [Scene graph example with metadata](http://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_SceneGraph_metadata)
 */
class MetaScene {

    /**
     * @private
     */
    constructor(viewer, scene) {

        /**
         * The {@link Viewer}.
         * @property viewer
         * @type {Viewer}
         */
        this.viewer = viewer;

        /**
         * The {@link Scene}.
         * @property scene
         * @type {Scene}
         */
        this.scene = scene;

        /**
         * The {@link MetaModel}s belonging to this MetaScene, each mapped to its {@link MetaModel#modelId}.
         *
         * @type {{String:MetaModel}}
         */
        this.metaModels = {};

        /**
         * The {@link PropertySet}s belonging to this MetaScene, each mapped to its {@link PropertySet#id}.
         *
         * @type {{String:PropertySet}}
         */
        this.propertySets = {};

        /**
         * The {@link MetaObject}s belonging to this MetaScene, each mapped to its {@link MetaObject#id}.
         *
         * @type {{String:MetaObject}}
         */
        this.metaObjects = {};

        /**
         * The {@link MetaObject}s belonging to this MetaScene, each mapped to its {@link MetaObject#type}.
         *
         * @type {{String:MetaObject}}
         */
        this.metaObjectsByType = {};

        /**
         * The root {@link MetaObject}s belonging to this MetaScene, each mapped to its {@link MetaObject#id}.
         *
         * @type {{String:MetaObject}}
         */
        this.rootMetaObjects = {};

        /**
         * Tracks number of MetaObjects of each type.
         * @private
         */
        this._typeCounts = {};

        /**
         * Subscriptions to events sent with {@link fire}.
         * @private
         */
        this._eventSubs = {};
    }

    /**
     * Subscribes to an event fired at this Viewer.
     *
     * @param {String} event The event
     * @param {Function} callback Callback fired on the event
     */
    on(event, callback) {
        let subs = this._eventSubs[event];
        if (!subs) {
            subs = [];
            this._eventSubs[event] = subs;
        }
        subs.push(callback);
    }

    /**
     * Fires an event at this Viewer.
     *
     * @param {String} event Event name
     * @param {Object} value Event parameters
     */
    fire(event, value) {
        const subs = this._eventSubs[event];
        if (subs) {
            for (let i = 0, len = subs.length; i < len; i++) {
                subs[i](value);
            }
        }
    }

    /**
     * Unsubscribes from an event fired at this Viewer.
     * @param event
     */
    off(event) { // TODO

    }

    /**
     * Creates a {@link MetaModel} in this MetaScene.
     *
     * The MetaModel will contain a hierarchy of {@link MetaObject}s, created from the
     * meta objects in ````metaModelData````.
     *
     * The meta object hierarchy in ````metaModelData```` is expected to be non-cyclic, with a single root. If the meta
     * objects are cyclic, then this method will log an error and attempt to recover by creating a dummy root MetaObject
     * of type "Model" and connecting all other MetaObjects as its direct children. If the meta objects contain multiple
     * roots, then this method similarly attempts to recover by creating a dummy root MetaObject of type "Model" and
     * connecting all the root MetaObjects as its children.
     *
     * @param {String} modelId ID for the new {@link MetaModel}, which will have {@link MetaModel#id} set to this value.
     * @param {Object} metaModelData Data for the {@link MetaModel}.
     * @param {Object} [options] Options for creating the {@link MetaModel}.
     * @param {Object} [options.includeTypes] When provided, only create {@link MetaObject}s with types in this list.
     * @param {Object} [options.excludeTypes] When provided, never create {@link MetaObject}s with types in this list.
     * @param {Boolean} [options.globalizeObjectIds=false] Whether to globalize each {@link MetaObject#id}. Set this ````true```` when you need to load multiple instances of the same meta model, to avoid ID clashes between the meta objects in the different instances.
     * @returns {MetaModel} The new MetaModel.
     */
    createMetaModel(modelId, metaModelData, options = {}) {

        const projectId = metaModelData.projectId || "none";
        const revisionId = metaModelData.revisionId || "none";
        const newPropertySets = metaModelData.propertySets || [];
        const newObjects = metaModelData.metaObjects || [];
        const author = metaModelData.author;
        const createdAt = metaModelData.createdAt;
        const creatingApplication = metaModelData.creatingApplication;
        const schema = metaModelData.schema;

        let includeTypes;
        // if (options.includeTypes) {
        //     includeTypes = {};
        //     for (let i = 0, len = options.includeTypes.length; i < len; i++) {
        //         includeTypes[options.includeTypes[i]] = true;
        //     }
        // }
        //
        let excludeTypes;
        // if (options.excludeTypes) {
        //     excludeTypes = {};
        //     for (let i = 0, len = options.excludeTypes.length; i < len; i++) {
        //         includeTypes[options.excludeTypes[i]] = true;
        //     }
        // }

        const metaModel = new MetaModel(this, modelId, projectId, revisionId, author, createdAt, creatingApplication, schema, [], null);

        this.metaModels[modelId] = metaModel;

        for (let i = 0, len = newPropertySets.length; i < len; i++) {
            const propertySetCfg = newPropertySets[i];
            const propertySetId = propertySetCfg.id;
            const propertySet = new PropertySet(propertySetId, propertySetCfg.originalSystemId, propertySetCfg.name, propertySetCfg.type, propertySetCfg.properties);
            metaModel.propertySets[propertySetId] = propertySet;
            this.propertySets[propertySetId] = propertySet;
        }

        const filteredObjectsParams = []; // Params for each new metaobject that passes our filters
        const existingObjects = []; // List of our metaobjects that are already existing, to which we'll also append new metaobjects we'll create
        const createObjectsParams = []; // List of params for metaobjects we'll create

        const rootMetaObjects = [];


        // Filter out the parameters we'll create

        for (let i = 0, len = newObjects.length; i < len; i++) {
            const newObject = newObjects[i];
            const type = newObject.type;
            if (excludeTypes && excludeTypes[type]) {
                continue;
            }
            if (includeTypes && !includeTypes[type]) {
                continue;
            }
            filteredObjectsParams.push(newObject);
        }

        // Build list of params for metaobjects we'll create

        for (let i = 0, len = filteredObjectsParams.length; i < len; i++) {
            let filteredObject = filteredObjectsParams[i];
            const existingObject = this.metaObjects[filteredObject.id];
            if (existingObject) {
                existingObject.metaModels.push(metaModel);
                existingObjects.push(existingObject);
                continue;
            }
            createObjectsParams.push(filteredObject);
        }

        // Create metaobjects in the creation list, add them to list of existing metaobjects

        for (let i = 0, len = createObjectsParams.length; i < len; i++) {
            const createObject = createObjectsParams[i];
            const type = createObject.type;
            const objectId = options.globalizeObjectIds ? math.globalizeObjectId(modelId, createObject.id) : createObject.id;
            const originalSystemId = createObject.id;
            const name = createObject.name;
            const propertySets = [];
            if (createObject.propertySetIds && createObject.propertySetIds.length > 0) {
                for (let j = 0, lenj = createObject.propertySetIds.length; j < lenj; j++) {
                    const propertySetId = createObject.propertySetIds[j];
                    const propertySet = metaModel.propertySets[propertySetId];
                    if (propertySet) {
                        propertySets.push(propertySet)
                    }
                }
            }
            const parent = null;
            const children = null;
            const external = createObject.external;
            const metaObject = new MetaObject(metaModel, objectId, originalSystemId, name, type, propertySets, parent, children, external);
            metaObject._parentId = createObject.parent;
            this.metaObjects[objectId] = metaObject;
            (this.metaObjectsByType[type] || (this.metaObjectsByType[type] = {}))[objectId] = metaObject;
            if (this._typeCounts[type] === undefined) {
                this._typeCounts[type] = 1;
            } else {
                this._typeCounts[type]++;
            }
            existingObjects.push(metaObject);
            if (createObject.parent === undefined || createObject.parent === null) {
                rootMetaObjects.push(createObject);
            }
        }

        // Ensure that metaobjects in the existing metaobject list are all attached to their parents,
        // or registered as root metaobjects

        for (let i = 0, len = existingObjects.length; i < len; i++) {
            const existingObject = existingObjects[i];
            const objectId = options.globalizeObjectIds ? math.globalizeObjectId(modelId, existingObject.id) : existingObject.id;
            if ((existingObject._parentId === undefined || existingObject._parentId === null) && !existingObject.parent) {
                metaModel.rootMetaObject = existingObject; // Deprecated, and won't work for federated models
                metaModel.rootMetaObjects[objectId] = existingObject;
                this.rootMetaObjects[objectId] = existingObject;
            } else if (existingObject._parentId) {
                const parentId = options.globalizeObjectIds ? math.globalizeObjectId(modelId, existingObject._parentId) : existingObject._parentId;
                existingObject._parentId = null;
                let parentMetaObject = this.metaObjects[parentId];
                if (parentMetaObject) {
                    existingObject.parent = parentMetaObject;
                    parentMetaObject.children = parentMetaObject.children || [];
                    parentMetaObject.children.push(existingObject);
                }
            }
        }

        this.fire("metaModelCreated", modelId);
        return metaModel;
    }

    /**
     * Removes a {@link MetaModel} from this MetaScene.
     *
     * Fires a "metaModelDestroyed" event with the value of the {@link MetaModel#id}.
     *
     * @param {String} id ID of the target {@link MetaModel}.
     */
    destroyMetaModel(id) {
        const metaModel = this.metaModels[id];
        if (!metaModel) {
            return;
        }
        this._removeMetaModel(metaModel);
        this.fire("metaModelDestroyed", id);
    }

    _removeMetaModel(metaModel) {
        const metaObjects = this.metaObjects;
        const metaObjectsByType = this.metaObjectsByType;
        let visit = (metaObject) => {
            delete metaObjects[metaObject.id];
            const types = metaObjectsByType[metaObject.type];
            if (types && types[metaObject.id]) {
                delete types[metaObject.id];
                if (--this._typeCounts[metaObject.type] === 0) {
                    delete this._typeCounts[metaObject.type];
                    delete metaObjectsByType[metaObject.type];
                }
            }
            const children = metaObject.children;
            if (children) {
                for (let i = 0, len = children.length; i < len; i++) {
                    const childMetaObject = children[i];
                    visit(childMetaObject);
                }
            }
        };
        visit(metaModel.rootMetaObject);
        for (let propertySetId in metaModel.propertySets) {
            if (metaModel.propertySets.hasOwnProperty(propertySetId)) {
                delete this.propertySets[propertySetId];
            }
        }
        delete this.metaModels[metaModel.id];
    }

    /**
     * Gets the {@link MetaObject#id}s of the {@link MetaObject}s that have the given {@link MetaObject#type}.
     *
     * @param {String} type The type.
     * @returns {String[]} Array of {@link MetaObject#id}s.
     */
    getObjectIDsByType(type) {
        const metaObjects = this.metaObjectsByType[type];
        return metaObjects ? Object.keys(metaObjects) : [];
    }

    /**
     * Gets the {@link MetaObject#id}s of the {@link MetaObject}s within the given subtree.
     *
     * @param {String} id  ID of the root {@link MetaObject} of the given subtree.
     * @param {String[]} [includeTypes] Optional list of types to include.
     * @param {String[]} [excludeTypes] Optional list of types to exclude.
     * @returns {String[]} Array of {@link MetaObject#id}s.
     */
    getObjectIDsInSubtree(id, includeTypes, excludeTypes) {
        const list = [];
        const metaObject = this.metaObjects[id];
        const includeMask = (includeTypes && includeTypes.length > 0) ? arrayToMap(includeTypes) : null;
        const excludeMask = (excludeTypes && excludeTypes.length > 0) ? arrayToMap(excludeTypes) : null;

        function visit(metaObject) {
            if (!metaObject) {
                return;
            }
            var include = true;
            if (excludeMask && excludeMask[metaObject.type]) {
                include = false;
            } else if (includeMask && (!includeMask[metaObject.type])) {
                include = false;
            }
            if (include) {
                list.push(metaObject.id);
            }
            const children = metaObject.children;
            if (children) {
                for (var i = 0, len = children.length; i < len; i++) {
                    visit(children[i]);
                }
            }
        }

        visit(metaObject);
        return list;
    }

    /**
     * Iterates over the {@link MetaObject}s within the subtree.
     *
     * @param {String} id ID of root {@link MetaObject}.
     * @param {Function} callback Callback fired at each {@link MetaObject}.
     */
    withMetaObjectsInSubtree(id, callback) {
        const metaObject = this.metaObjects[id];
        if (!metaObject) {
            return;
        }
        metaObject.withMetaObjectsInSubtree(callback);
    }
}

function arrayToMap(array) {
    const map = {};
    for (var i = 0, len = array.length; i < len; i++) {
        map[array[i]] = true;
    }
    return map;
}

export {MetaScene};