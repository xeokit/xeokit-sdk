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

        this._globalizeIDs(modelId, metaModelData, options)

        // Create MetaModel

        const metaModel = new MetaModel({
            metaScene: this,
            id: modelId,
            projectId: metaModelData.projectId || "none",
            revisionId: metaModelData.revisionId || "none",
            author: metaModelData.author || "none",
            createdAt: metaModelData.createdAt || "none",
            creatingApplication: metaModelData.creatingApplication || "none",
            schema: metaModelData.schema || "none",
            propertySets: []
        });

        this.metaModels[modelId] = metaModel;

        // Create global Property Sets

        if (metaModelData.propertySets) {
            for (let i = 0, len = metaModelData.propertySets.length; i < len; i++) {
                const propertySetData = metaModelData.propertySets[i];
                let propertySet = this.propertySets[propertySetData.id];
                if (!propertySet) {
                    propertySet = new PropertySet({
                        id: propertySetData.id,
                        originalSystemId: propertySetData.originalSystemId || propertySetData.id,
                        type: propertySetData.type,
                        name: propertySetData.name,
                        properties: propertySetData.properties
                    });
                    this.propertySets[propertySet.id] = propertySet;
                }
                propertySet.metaModels.push(metaModel);
                metaModel.propertySets.push(propertySet);
            }
        }

        // Create MetaObjects
        // Don't re-create reused MetaObjects
        // Save root MetaObjects on MetaModel
        // Save root MetaObjects on MetaScene

        if (metaModelData.metaObjects) {
            for (let i = 0, len = metaModelData.metaObjects.length; i < len; i++) {
                const metaObjectData = metaModelData.metaObjects[i];
                const type = metaObjectData.type;
                const id = metaObjectData.id;
                const propertySetIds = metaObjectData.propertySets || metaObjectData.propertySetIds;
                let metaObject = this.metaObjects[id];
                if (!metaObject) {
                    metaObject = new MetaObject({
                        id,
                        parentId: metaObjectData.parent,
                        type,
                        name: metaObjectData.name,
                        propertySetIds
                    });
                    this.metaObjects[id] = metaObject;
                }
                metaObject.metaModels.push(metaModel);
                if (!metaObjectData.parent) {
                    metaModel.rootMetaObjects.push(metaObject);
                    this.rootMetaObjects[id] = metaObject;
                }
                metaModel.metaObjects.push(metaObject);
            }
        }

        // Re-link entire MetaObject parent/child hierarchy

        for (let objectId in this.metaObjects) {
            const metaObject = this.metaObjects[objectId];
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
                    const propertySet = this.propertySets[propertySetId];
                    metaObject.propertySets.push(propertySet);
                }
            }
        }

        for (let objectId in this.metaObjects) {
            const metaObject = this.metaObjects[objectId];
            if (metaObject.parentId) {
                const parentMetaObject = this.metaObjects[metaObject.parentId];
                if (parentMetaObject) {
                    metaObject.parent = parentMetaObject;
                    (parentMetaObject.children || (parentMetaObject.children = [])).push(metaObject);
                }
            }
        }

        // Create MetaObjects-by-type lookup

        this.metaObjectsByType = {};
        for (let objectId in this.metaObjects) {
            const metaObject = this.metaObjects[objectId];
            const type = metaObject.type;
            (this.metaObjectsByType[type] || (this.metaObjectsByType[type] = {}))[objectId] = metaObject;
        }

        this.fire("metaModelCreated", modelId);

        return metaModel;
    }

    _globalizeIDs(modelId, metaModelData, options) {

        const globalize = !!options.globalizeObjectIds;

        if (metaModelData.metaObjects) {
            for (let i = 0, len = metaModelData.metaObjects.length; i < len; i++) {
                const metaObjectData = metaModelData.metaObjects[i];

                // Globalize MetaObject IDs and parent IDs

                metaObjectData.originalSystemId = metaObjectData.id;
                metaObjectData.originalParentSystemId = metaObjectData.parent;
                if (globalize) {
                    metaObjectData.id = math.globalizeObjectId(modelId, metaObjectData.id);
                    metaObjectData.parent = math.globalizeObjectId(modelId, metaObjectData.parent);
                }

                // Globalize MetaObject property set IDs

                if (globalize) {
                    const propertySetIds = metaObjectData.propertySetIds;
                    if (propertySetIds) {
                        const propertySetGlobalIds = [];
                        for (let j = 0, lenj = propertySetIds.length; j < lenj; j++) {
                            propertySetGlobalIds.push(math.globalizeObjectId(modelId, propertySetIds[j]));
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
                    propertySet.id = math.globalizeObjectId(modelId, propertySet.id);
                }
            }
        }
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

        // Remove global PropertySets

        if (metaModel.propertySets) {
            for (let i = 0, len = metaModel.propertySets.length; i < len; i++) {
                const propertySet = metaModel.propertySets[i];
                if (propertySet.metaModels.length === 1) { // Property set owned by one model, delete
                    delete this.propertySets[propertySet.id];
                } else {
                    const newMetaModels = [];
                    for (let j = 0, lenj = propertySet.metaModels.length; j < lenj; j++) {
                        if (propertySet.metaModels[i].id !== id) {
                            newMetaModels.push(propertySet.metaModels[i]);
                        }
                    }
                    propertySet.metaModels = newMetaModels;
                }
            }
        }

        // Remove MetaObjects

        if (metaModel.metaObjects) {
            for (let i = 0, len = metaModel.metaObjects.length; i < len; i++) {
                const metaObject = metaModel.metaObjects[i];
                const type = metaObject.type;
                const id = metaObject.id;
                if (metaObject.metaModels.length === 1) { // MetaObject owned by one model, delete
                    delete this.metaObjects[id];
                    if (!metaObject.parent) {
                        delete this.rootMetaObjects[id];
                    }
                } else {
                    const newMetaModels = [];
                    const metaModelId = metaModel.id;
                    for (let i = 0, len = metaObject.metaModels.length; i < len; i++) {
                        if (metaObject.metaModels[i].id !== metaModelId) {
                            newMetaModels.push(metaObject.metaModels[i]);
                        }
                    }
                    metaObject.metaModels = newMetaModels;
                }
            }
        }

        // Re-link entire MetaObject parent/child hierarchy

        for (let objectId in this.metaObjects) {
            const metaObject = this.metaObjects[objectId];
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
                    const propertySet = this.propertySets[propertySetId];
                    metaObject.propertySets.push(propertySet);
                }
            }
        }

        this.metaObjectsByType = {};

        for (let objectId in this.metaObjects) {
            const metaObject = this.metaObjects[objectId];
            const type = metaObject.type;
            if (metaObject.children) {
                metaObject.children = null;
            }
            (this.metaObjectsByType[type] || (this.metaObjectsByType[type] = {}))[objectId] = metaObject;
        }

        for (let objectId in this.metaObjects) {
            const metaObject = this.metaObjects[objectId];
            if (metaObject.parentId) {
                const parentMetaObject = this.metaObjects[metaObject.parentId];
                if (parentMetaObject) {
                    metaObject.parent = parentMetaObject;
                    (parentMetaObject.children || (parentMetaObject.children = [])).push(metaObject);
                }
            }
        }

        delete this.metaModels[id];

        this.fire("metaModelDestroyed", id);
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

        const visit = (metaObject) => {
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
