import {Plugin} from "../../viewer/Plugin.js";
import {Skybox} from "../../viewer/scene/skybox/Skybox.js"

/**
 * {@link Viewer} plugin that manages skyboxes
 *
 * @example
 *
 * // Create a Viewer
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * // Add a GLTFModelsPlugin
 * var xktLoaderPlugin = new XKTLoaderPlugin(viewer);
 *
 * // Add a SkyboxesPlugin
 * var skyboxesPlugin = new SkyboxesPlugin(viewer);
 * 
 * // Create a skybox
 * skyBoxesPlugin.createSkybox({
 *     src: [
 *         "./assets/images/posx.jpg",
 *         "./assets/images/negx.jpg",
 *         "./assets/images/posy.jpg",
 *         "./assets/images/negy.jpg",
 *         "./assets/images/posz.jpg",
 *         "./assets/images/negz.jpg"
 *     ]
 * })
 *
 * // Load an XKT model
 * const model = xktLoaderPlugin.load({
 *     id: "myModel",
 *     src: "./models/xkt/myModel.xkt"
 * });
 *
 * @class SkyboxesPlugin
 */
class SkyboxesPlugin extends Plugin {

    constructor(viewer) {
        super("skyboxes", viewer);
        this.skyboxes = {};
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
     Creates a skybox.

     @param {Object} params Skybox configuration.
     @param {String} [params.id] Optional ID, unique among all components in the parent {Scene}, generated automatically when omitted.
     @param {String | String[]} [params.src=null] Path to skybox texture
     @param {Number} [params.encoding=LinearEncoding] Texture encoding format.  See the {@link Texture#encoding} property for more info.
     @param {Number} [params.size=1000] Size of this Skybox, given as the distance from the center at ````[0,0,0]```` to each face.
     @param {Boolean} [params.active=true] Whether the skybox plane is initially active. Only skyboxes while this is true.
     @returns {Skybox} The new skybox.
     */
    createSkybox(params) {
        const skybox = new Skybox(this.viewer.scene, params);
        this.skyboxes[skybox.id] = skybox;
        return skybox;
    }

    /**
     Destroys a skybox.
     @param id
     */
    destroySkybox(id) {
        var skybox = this.skyboxes[id];
        if (!skybox) {
            this.error("Skybox not found: " + id);
            return;
        }
        skybox.destroy();
    }

    /**
     Destroys all skyboxes.
     */
    clear() {
        var ids = Object.keys(this.viewer.scene.skyboxes);
        for (var i = 0, len = ids.length; i < len; i++) {
            this.destroySkybox(ids[i]);
        }
    }

    /**
     * Destroys this plugin.
     *
     * Clears skyboxes from the Viewer first.
     */
    destroy() {
        this.clear();
        super.clear();
    }
}

export {SkyboxesPlugin}
