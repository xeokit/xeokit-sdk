import {Texture2D} from "../../../webgl/Texture2D";

/**
 * Instantiated by VBOSceneModel#createTexture
 *
 * @private
 */
export class VBOSceneModelTexture {

    /**
     * @param {*} cfg Texture properties.
     * @param {String|Number} cfg.id Mandatory ID for the texture, to refer to with {@link VBOSceneModel#createTexture}.
     * @param {String} [cfg.model] VBOSceneModel that owns this texture.
     * @param {*} [cfg.image] Texture image data.
     * @param {String} [cfg.src] Texture image source.
     * @param {Boolean} [cfg.flipY] Whether to flip on Y-axis.
     * @param {number[]} [cfg.preloadColor] Texture preload color.
     */
    constructor(cfg) {

        /**
         * ID of this VBOSceneModelTexture, unique within the VBOSceneModel.
         *
         * @property id
         * @type {String}
         */
        this.id = cfg.id;

        /**
         * The texture.
         *
         * @property texture
         * @type {Texture2D}
         */
        this.texture = cfg.texture;
    }

    /**
     * @private
     */
    destroy() {
        if (this.texture) {
            this.texture.destroy();
            this.texture = null;
        }
    }
}
