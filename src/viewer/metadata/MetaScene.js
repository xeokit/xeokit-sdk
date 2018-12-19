import {MetaModel} from "./MetaModel.js";
import {MetaObject} from "./MetaObject.js";

/**
 * Metadata on a {@link Viewer}'s {@link Scene}.
 *
 * * Is provided by {@link Viewer#metaScene}.
 * * Contains {@link MetaModel}s and {@link MetaObject}s.
 */
class MetaScene {

    /**
     * @private
     */
    constructor(viewer, scene) {

        /**
         * The Viewer.
         * @property viewer
         * @type {Viewer}
         */
        this.viewer = viewer;

        /**
         * The Scene.
         * @property scene
         * @type {Scene}
         */
        this.scene = scene;

        /**
         * The {@link MetaModel}s belonging to this MetaScene, each mapped to its {@link MetaModel#id}.
         *
         * @type {{String:MetaModel}}
         */
        this.metaModels = {};

        /**
         * The {@link MetaObject}s belonging to this MetaScene, each mapped to its {@link MetaObject#id}.
         *
         * @type {{String:MetaObject}}
         */
        this.metaObjects = {};

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
     * Fires a "metaModelCreated" event with the ID of the new {@link MetaModel}.
     *
     * @param {string} metaModelId ID for the new {@link MetaModel}.
     * @param {object} metaModelData Data for the {@link MetaModel} - (see [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     */
    createMetaModel(metaModelId, metaModelData) {
        var newObjects = metaModelData.objects;
        const metaModel = new MetaModel(this, metaModelId, null);
        this.metaModels[metaModelId] = metaModel;
        for (let i = 0, len = newObjects.length; i < len; i++) {
            let newObject = newObjects[i];
            let id = newObject.id;
            let name = newObject.name;
            let type = newObject.type;
            let gid = newObject.gid;
            let properties = newObject.properties;
            let parent = null;
            let children = null;
            this.metaObjects[newObject.id] = new MetaObject(metaModel, id, name, type, gid, properties, parent, children);
        }
        for (let i = 0, len = newObjects.length; i < len; i++) {
            let newObject = newObjects[i];
            let id = newObject.id;
            let metaObject = this.metaObjects[id];
            if (newObject.parent === undefined || newObject.parent === null) {
                metaModel.rootMetaObject = metaObject;
            } else {
                let parentMetaObject = this.metaObjects[newObject.parent];
                metaObject.parent = parentMetaObject;
                parentMetaObject.children = parentMetaObject.children || [];
                parentMetaObject.children.push(metaObject);
            }
        }
        this.fire("metaModelCreated", metaModelId);
    }

    /**
     * Removes a {@link MetaModel} from this MetaScene.
     *
     * Fires a "metaModelDestroyed" event with the ID of the {@link Model}.
     *
     * @param {string} metaModelId ID of the target {@link MetaModel}.
     */
    destroyMetaModel(metaModelId) {
        var metaModel = this.metaModels[metaModelId];
        if (!metaModel) {
            return;
        }
        var metaObjects = this.metaObjects;

        function visit(metaObject) {
            delete metaObjects[metaObject.id];
            const children = metaObject.children;
            if (children) {
                for (let i = 0, len = children.length; i < len; i++) {
                    const childMetaObject = children[i];
                    visit(childMetaObject);
                }
            }
        }

        visit(metaModel.rootMetaObject);
        delete this.metaModels[metaModelId];
        this.fire("metaModelDestroyed", metaModelId);
    }

    /**
     * Gets an array of IDs of the {@link MetaObject}s in the given subtree.
     *
     * @param metaObjectId {string} ID of the root {@link MetaObject} in the given subtree.
     * @returns {Array}
     */
    getSubObjectsIDs(metaObjectId) {
        const self = this;
        const list = [];
        const metaObject = this.metaObjects[metaObjectId];

        function visit(metaObject) {
            if (!metaObject) {
                return;
            }
            list.push(metaObject.id);
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

    transform(metadata) {
        var objects = metadata.objects;
        var map = {};
        for (var i = 0, len = objects.length; i < len; i++) {
            const object = objects[i];
            map[object.id] = object;
        }
        for (var i = 0, len = objects.length; i < len; i++) {
            const object = objects[i];
            object.oid = object.id;
            object.id = object.guid;
            if (object.parent !== undefined) {
                object.parent = map[object.parent].guid;
            }
        }

        for (var i = 0, len = objects.length; i < len; i++) {
            const object = objects[i];
            delete object.guid;
        }
    }
}

export {MetaScene};