import {utils} from "./../scene/utils.js"
import {Model} from "./../scene/models/Model.js";
import {Plugin} from "./Plugin.js";

/**
 Base class for {@link Viewer} plugins that load models.

 @class ModelsPlugin
 */
class ModelsPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {String} [id] ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Viewer} viewer The Viewer.
     * @param {Class} loader The JavaScript class that will load {@link Model}s for this plugin.
     * @param {Object} cfg  Plugin configuration.
     */
    constructor(id, viewer, loader, cfg) {

        super(id, viewer, cfg);

        /**
         * @private
         */
        this._loader = loader;

        /**
         * <a href="http://xeokit.org/docs/classes/Model.html">xeokit.Models</a> currently loaded by this Plugin.
         * @type {{String:Model}}
         */
        this.models = {};

        /**
         * Saves load params for bookmarks.
         * @private
         */
        this._modelLoadParams = {};
    }

    /**
     * Loads a model into this Plugin's {@link Viewer}.
     *
     * @param {*} params  Loading params.
     * @param {String} [params.metadataSrc] Path to an optional metadata file (see: [Model Metadata](https://github.com/xeolabs/xeokit.io/wiki/Model-Metadata)).
     * @param {String} params.id ID to assign to the model, unique among all components in the Viewer's xeokit.Scene.
     * @returns {{Model}} A {@link Model} representing the loaded model
     */
    load(params) {
        const self = this;
        const id = params.id;
        if (!id) {
            this.error("load() param expected: id");
            return;
        }
        const src = params.src;
        if (!src) {
            this.error("load() param expected: src");
            return;
        }
        if (this.viewer.scene.components[id]) {
            this.error(`Component with this ID already exists in viewer: ${id}`);
            return;
        }
        var model = new Model(this.viewer.scene, params);
        this._modelLoadParams[id] = utils.apply(params, {});
        if (params.metadataSrc) {
            const metadataSrc = params.metadataSrc;
            utils.loadJSON(metadataSrc, function (metadata) {
                self.viewer.createMetadata(id, metadata);
                self._loader.load(model, src, params);
            }, function (errMsg) {
                self.error(`load(): Failed to load model metadata for model '${id} from  '${metadataSrc}' - ${errMsg}`);
            });
        } else {
            this._loader.load(model, src, params);
        }
        this.models[id] = model;
        model.once("destroyed", () => {
            delete this.models[id];
            delete this._modelLoadParams[id];
            this.viewer.destroyMetadata(id);
            this.fire("unloaded", id);
        });
        return model;
    }

    /**
     * Unloads a model that was previously loaded by this Plugin.
     *
     * @param {String} id  ID of model to unload.
     */
    unload(id) {
        const model = this.models;
        if (!model) {
            this.error(`unload() model with this ID not found: ${id}`);
            return;
        }
        model.destroy();
    }

    /**
     * @private
     */
    send(name, value) {
        switch (name) {
            case "clear":
                this.clear();
                break;
        }
    }

    /**
     * @private
     */
    writeBookmark(bookmark) {
        bookmark[this.id] = this._modelLoadParams;
    }

    /**
     * @private
     */
    readBookmarkAsynch(bookmark, ok) {
        this.clear();
        var modelLoadParams = bookmark[this.id];
        if (modelLoadParams) {
            var modelParamsList = [];
            for (const id in modelLoadParams) {
                modelParamsList.push(modelLoadParams[id]);
            }
            if (modelParamsList.length === 0) {
                ok();
                return;
            }
            this._loadModel(modelParamsList, modelParamsList.length - 1, ok);
        }
    }

    _loadModel(modelLoadParams, i, ok) {
        this.load(modelLoadParams[i], function () {
            if (i === 0) {
                ok();
            } else {
                this._loadModel(modelLoadParams, i - 1, ok);
            }
        });
    }

    /**
     * Unloads models loaded by this plugin.
     */
    clear() {
        for (const id in this.models) {
            this.models[id].destroy();
        }
    }

    /**
     * Destroys this plugin, after first destroying any models it has loaded.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {ModelsPlugin}