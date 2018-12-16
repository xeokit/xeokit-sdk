import {Plugin} from "./../../Plugin.js";
import {Clip} from "../../../scene/clipping/Clip.js"
import {math} from "../../../scene/math/math.js"

/**
 * A viewer plugin that manages user cross-section planes.
 *
 * @example
 *
 * // Create a viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * // Add a GLTFModelsPlugin
 * var gltfModelsPlugin = new GLTFModelsPlugin(viewer, {
 *      id: "GLTFModels"
 * });
 *
 * // Add a ClipsPlugin
 * var clipsPlugin = new ClipsPlugin(viewer, {
 *      id: "Clips"
 * });
 *
 * // Load a glTF model
 * gltfModelsPlugin.load({
 *      id: "myModel",
 *      src: "./models/gltf/mygltfmodel.gltf"
 * });
 *
 * // When the model has loaded, create some cross-sections
 * model.on("loaded", function() {
 *
 *     clipsPlugin.createClip({
 *         id: "myClip",
 *         pos: [0,0,0],
 *         dir: [0.5, 0.5, 0.5]
 *     });
 *
 *     clipsPlugin.createClip({
 *         id: "myClip2",
 *         pos: [0,0,0],
 *         dir: [0.5, -0.5, 0.5]
 *     });
 * });
 *
 * @class ClipsPlugin
 */
class ClipsPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="Clips"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     */
    constructor(viewer, cfg) {
        super("Clips", viewer);
        this.clips = viewer.scene.clips;
    }

    /**
     * @private
     */
    send(name, value) {
        switch (name) {
            case "clearClips":
                this.clear();
                break;
        }
    }

    /**
     * @private
     */
    writeBookmark(bookmark) {
        var states = [];
        var vecToArray = math.vecToArray;
        for (var id in this.clips) {
            if (this.clips.hasOwnProperty(id)) {
                var clip = this.clips[id];
                states.push({
                    id: id,
                    pos: vecToArray(clip.pos),
                    dir: vecToArray(clip.dir),
                    active: clip.active
                });
            }
        }
        if (states.length > 0) {
            (bookmark.plugins = bookmark.plugins || {}).clips = states;
        }
    }

    /**
     * @private
     */
    readBookmark(bookmark) {
        this.clear();
        var plugins = bookmark.plugins;
        if (plugins) {
            var states = plugins.clips;
            if (states) {
                for (var i = 0, len = states.length; i < len; i++) {
                    var state = states[i];
                    this.createClip(state.id, state);
                }
            }
        }
    }

    /**
     Creates a clipping plane.

     @param {Object} params Clip plane configuration.
     @param {String} params.id Unique ID to assign to the clipping plane. Must be unique among all components in the Viewer.
     @param {[Number, Number, Number]} [params.pos=0,0,0] World-space position of the clip plane.
     @param {[Number, Number, Number]} [params.dir=[0,0,-1]} Vector indicating the orientation of the clip plane.
     @param {Boolean} [params.active=true] Whether the clip plane is initially active. Only clips while this is true.
     @param {Boolean} [params.shown=true] Whether to show a helper object to indicate the clip plane's position and orientation.
     @returns {Clip}  A <a href="http://xeokit.org/docs/classes/Clip.html">xeokit.Model</a> representing the clipping plane.
     */
    createClip(params) {
        if (this.viewer.scene.components[params.id]) {
            this.error("Viewer component with this ID already exists: " + id);
            return this;
        }
        return new Clip(this.viewer.scene, {
            id: params.id,
            pos: params.pos,
            dir: params.dir,
            active: true || params.active
        });
    }

    /**
     Destroys a clipping plane.

     @param {String} id ID of clipping plane to destroy.
     */
    destroyClip(id) {
        var clip = viewer.scene.clips[id];
        if (!clip) {
            this.log("Clip not found: " + id);
            return;
        }
        clip.destroy();
    }

    /**
     Destroys all clipping planes.
     */
    clear() {
        var ids = Object.keys(this.viewer.scene.clips);
        for (var i = 0, len = ids.length; i < len; i++) {
            this.destroyClip(ids[i]);
        }
    }

    /**
     * Destroys this plugin.
     *
     * Removes all cross-section planes from the viewer first.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {ClipsPlugin}
