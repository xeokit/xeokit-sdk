import {MetaModel} from "./MetaModel.js";
import {MetaObject} from "./MetaObject.js";
import {PropertySet} from "./PropertySet.js";

/**
 * @desc Metadata corresponding to a {@link Scene}.
 *
 * * Located in {@link Viewer#metaScene}.
 * * Contains {@link MetaModel}s and {@link MetaObject}s.
 * * [Scene graph example with metadata](http://xeokit.github.io/xeokit-sdk/examples/index.html#sceneRepresentation_SceneGraph_metadata)
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
     * @param {Boolean} [options.globalizeObjectIds=false] Whether to globalize each {@link MetaObject#id}. Set this ````true```` when you need to load multiple instances of the same meta model, to avoid ID clashes between the meta objects in the different instances.
     * @returns {MetaModel} The new MetaModel.
     */
    createMetaModel(modelId, metaModelData, options = {}) {

        const metaModel = new MetaModel({ // Registers MetaModel in #metaModels
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

        metaModel.loadData(metaModelData);

        metaModel.finalize();

        return metaModel;
    }

    /**
     * Removes a {@link MetaModel} from this MetaScene.
     *
     * Fires a "metaModelDestroyed" event with the value of the {@link MetaModel#id}.
     *
     * @param {String} metaModelId ID of the target {@link MetaModel}.
     */
    destroyMetaModel(metaModelId) {

        const metaModel = this.metaModels[metaModelId];
        if (!metaModel) {
            return;
        }

        // Remove global PropertySets

        if (metaModel.propertySets) {
            for (let i = 0, len = metaModel.propertySets.length; i < len; i++) {
                const propertySet = metaModel.propertySets[i];
                if (propertySet.metaModels.length === 1 && propertySet.metaModels[0].id === metaModelId) { // Property set owned only by this model, delete
                    delete this.propertySets[propertySet.id];
                } else {
                    const newMetaModels = [];
                    for (let j = 0, lenj = propertySet.metaModels.length; j < lenj; j++) {
                        if (propertySet.metaModels[j].id !== metaModelId) {
                            newMetaModels.push(propertySet.metaModels[j]);
                        }
                    }
                    propertySet.metaModels = newMetaModels;
                }
            }
        }

        // Remove MetaObjects

        if (metaModel.metaObjects) {
            for (let objectId in metaModel.metaObjects) {
                const metaObject = metaModel.metaObjects[objectId];
                if (metaObject.metaModels.length === 1 && metaObject.metaModels[0].id === metaModelId) { // MetaObject owned only by this model, delete
                    delete this.metaObjects[objectId];
                    if (!metaObject.parent) {
                        delete this.rootMetaObjects[objectId];
                    }
                } else {
                    metaObject.metaModels = metaObject.metaModels.filter(metaModel => metaModel.id !== metaModelId);
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

        delete this.metaModels[metaModelId];

        // Relink MetaObjects to their MetaModels

        for (let objectId in this.metaObjects) {
            const metaObject = this.metaObjects[objectId];
            metaObject.metaModels = [];
        }

        for (let modelId in this.metaModels) {
            const metaModel = this.metaModels[modelId];
            for (let objectId in metaModel.metaObjects) {
                const metaObject = metaModel.metaObjects[objectId];
                metaObject.metaModels.push(metaModel);
            }
        }

        this.fire("metaModelDestroyed", metaModelId);
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