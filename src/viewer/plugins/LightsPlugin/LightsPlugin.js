import {Plugin} from "./../../Plugin.js";
import {DirLight} from "../../../scene/lighting/DirLight.js"

/**
 * A viewer plugin that manages light sources.
 *
 * @example
 *
 * // Create a Viewer
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * // Add a GLTFModelsPlugin
 * var gltfModelsPlugin = new GLTFModelsPlugin(viewer, {
 *     id: "GLTFModels"  // Default value
 * });
 *
 * // Add a LightsPlugin
 * var lightsPlugin = new LightsPlugin(viewer, {
 *     id: "Lights" // Default value
 * });
 *
 * // Load a glTF model
 * const model = gltfModelsPlugin.load({
 *     id: "myModel",
 *     src: "./models/gltf/mygltfmodel.gltf"
 * });
 *
 * // Clear default lights
 * lightsPlugin.clear();
 *
 * // Create three directional World-space lights. "World" means that they will appear as if part
 * // of the world, instead of "View", where they move with the user's head.
 *
 * lightsPlugin.createLight({
 *     id: "keyLight",
 *     dir: [0.8, -0.6, -0.8],
 *     color: [1.0, 0.3, 0.3],
 *     intensity: 1.0,
 *     space: "world"
 * });
 *
 * lightsPlugin.createLight({
 *     id: "fillLight",
 *     dir: [-0.8, -0.4, -0.4],
 *     color: [0.3, 1.0, 0.3],
 *     intensity: 1.0,
 *     space: "world"
 * });
 *
 * lightsPlugin.createDirLight({
 *     id: "rimLight",
 *     dir: [0.2, -0.8, 0.8],
 *     color: [0.6, 0.6, 0.6],
 *     intensity: 1.0,
 *     space: "world"
 * });
 *
 * @class LightsPlugin
 */
class LightsPlugin extends Plugin {

    constructor(viewer) {
        super("lights", viewer);
        this.lights = viewer.scene.lights;
    }

    /**
     * @private
     */
    send(propName, propValue) {
    }

    /**
     * @private
     */
    writeBookmark(bookmark) {
        var states = [];
        var vecToArray = xeokit.math.vecToArray;
        for (var id in this.lights) {
            if (this.lights.hasOwnProperty(id)) {
                var light = this.lights[id];
                states.push({
                    id: id,
                    pos: vecToArray(light.pos),
                    dir: vecToArray(light.dir),
                    intensity: light.intensity
                });
            }
        }
        if (states.length > 0) {
            (bookmark.plugins = bookmark.plugins || {}).lights = states;
        }
    }

    /**
     * @private
     */
    readBookmark(bookmark) {
        this.clear();
        var plugins = bookmark.plugins;
        if (plugins) {
            var states = plugins.lights;
            if (states) {
                for (var i = 0, len = states.length; i < len; i++) {
                    var state = states[i];
                    this.createLight(state.id, state);
                }
            }
        }
    }

    /**
     Creates a directional light source.

     @param {Object} params Light source configuration.
     @param {String} [params.id] Unique ID to assign to the light source.
     @param {[Number, Number, Number]} [params.dir=[0,0,-1]] Direction vector.
     @param {[Number, Number, Number]} [params.color=[0,0,-1]] RGB color.
     @param {Number} [params.intensity=1] Intensity.
     @param {String} [params.space="view"] "view" for head-mounted, "world" to position in world-space.
     @returns {DirLight} The new light source.
     */
    createLight(params) {
        if (params.id) {
            if (this.viewer.scene.components[params.id]) {
                this.error("Component with this ID already exists: " + params.id);
                return this;
            }
        }
        return new DirLight(this.viewer.scene, params);
    }

    /**
     Destroys all lights. Note that the Viewer will have initially have some default lights, so you may want to call this before defining your own.
     */
    clear() {
        this.viewer.scene.clearLights();
    }

    /**
     * Destroys this plugin.
     *
     * Clears cross-section planes from the Viewer first.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {LightsPlugin}
