import {math} from "../scene/math/math.js";
import {Scene} from "../scene/scene/Scene.js";
import {CameraFlightAnimation} from "../scene/camera/CameraFlightAnimation.js";
import {CameraControl} from "../scene/camera/CameraControl.js";
import {MetaScene} from "./metadata/MetaScene.js";

/**
 * The WebGL-based 3D Viewer class at the heart of the xeokit SDK.
 *
 * * A Viewer wraps a single {@link Scene}
 * * Add {@link Plugin}s to a Viewer to extend its functionality.
 * * {@link Viewer#metaScene} holds metadata about {@link Model}s in the
 * Viewer's {@link Scene}. Load and unload metadata using {@link Viewer#createMetadata}
 * and {@link Viewer#destroyMetadata}.
 * * Save and load the state of a Viewer as JSON with {@link Viewer#getBookmark} and {@link Viewer#setBookmark}. Installed
 * {@link Plugin} instances will also save and load their state to and from the JSON.
 * * Use {@link Viewer#cameraFlight} to fly or jump the {@link Scene}'s
 * {@link Camera} to target positions, boundaries or {@link Node}s.
 *
 * @public
 */
class Viewer {

    /**
     * @constructor
     * @param {Object} cfg  Viewer configuration.
     * @param {String} [cfg.id] Optional ID for this Viewer, defaults to the ID of {@link Viewer#scene}, which xeokit automatically generates.
     * @param {String} [cfg.canvasId]  ID of existing HTML5 canvas for the {@link Viewer#scene} - creates a full-page canvas automatically if this is omitted
     * @param [cfg.passes=1] {Number} The number of times the {@link Viewer#scene} renders per frame.
     * @param [cfg.clearEachPass=false] {Boolean} When doing multiple passes per frame, specifies if to clear the
     * canvas before each pass (true) or just before the first pass (false).
     * @param [cfg.transparent=false] {Boolean} Whether or not the canvas is transparent.
     * @param [cfg.backgroundColor] {Number[]} RGBA color for canvas background, when canvas is not transparent. Overridden by backgroundImage.
     * @param [cfg.backgroundImage] {String} URL of an image to show as the canvas background, when canvas is not transparent. Overrides backgroundImage.
     * @param [cfg.gammaInput=false] {Boolean} When true, expects that all textures and colors are premultiplied gamma.
     * @param [cfg.gammaOutput=true] {Boolean} Whether or not to render with pre-multiplied gama.
     * @param [cfg.gammaFactor=2.2] {Number} The gamma factor to use when rendering with pre-multiplied gamma.
     */
    constructor(cfg) {

        /**
         * The Viewer's {@link Scene}.
         * @property scene
         * @type {Scene}
         */
        this.scene = new Scene({
            viewer: this,
            canvasId: cfg.canvasId,
            webgl2: false,
            contextAttr: {preserveDrawingBuffer: false},
            transparent: cfg.transparent !== false,
            gammaInput: true,
            gammaOutput: true
        });

        /**
         * Metadata about the {@link Scene} and the models and objects within it.
         * @property metaScene
         * @type {MetaScene}
         * @readonly
         */
        this.metaScene = new MetaScene(this, this.scene);

        /**
         * The Viewer's ID.
         * @property id
         *
         * @type {String|Number}
         */
        this.id = cfg.id || this.scene.id;

        /**
         * The Viewer's {@link Camera}. This is also found on {@link Scene#camera}.
         * @property camera
         * @type {Camera}
         */
        this.camera = this.scene.camera;

        /**
         * The Viewer's {@link CameraFlightAnimation}, which
         * is used to fly the {@link Scene}'s {@link Camera} to given targets.
         * @property cameraFlight
         * @type {CameraFlightAnimation}
         */
        this.cameraFlight = new CameraFlightAnimation(this.scene, {
            duration: 0.5
        });

        /**
         * The Viewer's {@link CameraControl}, which
         * controls the {@link Scene}'s {@link Camera} with mouse,  touch and keyboard input.
         * @property cameraControl
         * @type {CameraControl}
         */
        this.cameraControl = new CameraControl(this.scene, {
            // panToPointer: true,
            doublePickFlyTo: true
        });

        /**
         * {@link Plugin}s that have been installed into this Viewer, mapped to their IDs.
         * @property plugins
         * @type {{string:Plugin}}
         */
        this.plugins = {};

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
     * Logs a message to the JavaScript developer console, prefixed with the ID of this Viewer.
     *
     * @param {String} msg The message
     */
    log(msg) {
        console.log(`[xeoviewer viewer ${this.id}]: ${msg}`);
    }

    /**
     * Logs an error message to the JavaScript developer console, prefixed with the ID of this Viewer.
     *
     * @param {String} msg The error message
     */
    error(msg) {
        console.error(`[xeoviewer viewer ${this.id}]: ${msg}`);
    }

    /**
     * Installs a Plugin.
     *
     * @private
     */
    addPlugin(plugin) {
        if (this.plugins[plugin.id]) {
            this.error(`Plugin with this ID already installed: ${plugin.id}`);
        }
        this.plugins[plugin.id] = plugin;
        this.log(`Installed plugin: ${plugin.id}`);
    }

    /**
     * Uninstalls a Plugin, clearing content from it first.
     *
     * @private
     */
    removePlugin(plugin) {
        const installedPlugin = this.plugins[plugin.id];
        if (!installedPlugin) {
            this.error(`Can't remove plugin - no plugin with this ID is installed: ${plugin.id}`);
            return;
        }
        if (!installedPlugin !== plugin) {
            this.error(`Can't remove plugin - a different plugin is installed with this ID: ${plugin.id}`);
            return;
        }
        if (installedPlugin.clear) {
            installedPlugin.clear();
        }
        delete this.plugins[id];
        this.log(`Removed plugin: ${plugin.id}`);
    }

    /**
     * Sends a message to installed Plugins.
     *
     * The message can optionally be accompanied by a value.
     * @private
     */
    sendToPlugins(name, value) {
        const plugins = this.plugins;
        for (const id in plugins) {
            if (plugins.hasOwnProperty(id)) {
                plugins[id].send(name, value);
            }
        }
    }

    /**
     * Clears content from this Viewer and all installed {@link Plugin}s.
     */
    clear() {
        this.sendToPlugins("clear");
    }

    /**
     * Resets viewing state.
     *
     * Sends a "resetView" message to each installed {@link Plugin}.
     */
    resetView() {
        this.sendToPlugins("resetView");

        // Clear sectionPlanes at xeokit level

        // TODO
        // this.show();
        // this.hide("space");
        // this.hide("DEFAULT");
    }

    getSnapshot(params = {}, ok) {
        return this.scene.canvas.getSnapshot({
            width: params.width, // Defaults to size of canvas
            height: params.height,
            format: params.format || "png" // Options are "jpeg" (default), "png" and "bmp"
        }, ok);
    }

    destroy() {

    }
}

function getPosition(object) {
    const position = object.position;
    if (position[0] !== 0 || position[1] !== 0 || position[2] !== 0) {
        return vecToArray(position);
    }
}

function getScale(object) {
    const scale = object.scale;
    if (scale[0] !== 1 || scale[1] !== 1 || scale[2] !== 1) {
        return vecToArray(scale);
    }
}

function getRotation(object) {
    const rotation = object.rotation;
    if (rotation[0] !== 0 || rotation[1] !== 0 || rotation[2] !== 0) {
        return vecToArray(rotation);
    }
}

export {Viewer}