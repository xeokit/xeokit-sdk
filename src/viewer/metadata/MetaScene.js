import {MetaModel} from "./MetaModel.js";
import {MetaObject} from "./MetaObject.js";

/**
 * @desc Metadata corresponding to a {@link Scene}.
 *
 * * Located in {@link Viewer#metaScene}.
 * * Contains {@link MetaModel}s and {@link MetaObject}s.
 *
 * ## Usage
 *
 * * [Metadata Tutorial]()
 * * [Metadata Example](/examples/#metadata_BasicExample)
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
     * @param {String} id ID for the new {@link MetaModel}, which will have {@link MetaModel#id} set to this value.
     * @param {Object} metaModelData Data for the {@link MetaModel} - (see [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     * @returns {MetaModel} The new MetaModel.
     */
    createMetaModel(id, metaModelData) {

        // TODO: validate metadata
        // TODO: replace MetaModel if ID already used

        var projectId = metaModelData.projectId || "none";
        var revisionId = metaModelData.revisionId || "none";
        var newObjects = metaModelData.metaObjects;

        const metaModel = new MetaModel(this, id, projectId, revisionId, null);

        this.metaModels[id] = metaModel;

        for (let i = 0, len = newObjects.length; i < len; i++) {
            let newObject = newObjects[i];
            let id = newObject.id;
            let name = newObject.name;
            let type = newObject.type;
            let properties = newObject.properties;
            let parent = null;
            let children = null;
            let external = newObject.external;
            this.metaObjects[id] = new MetaObject(metaModel, id, name, type, properties, parent, children, external);
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

        this.fire("metaModelCreated", id);

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
        var metaModel = this.metaModels[id];
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
        delete this.metaModels[id];
        this.fire("metaModelDestroyed", id);
    }

    /**
     * Gets an array of IDs of the {@link MetaObject}s within the given subtree.
     *
     * @param {String} id  ID of the root {@link MetaObject} of the given subtree.
     * @returns {String[]}
     */
    getSubObjectIDs(id) {
        const list = [];
        const metaObject = this.metaObjects[id];

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
}

export {MetaScene};