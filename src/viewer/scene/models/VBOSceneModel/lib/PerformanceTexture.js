import {Texture2D} from "../../../webgl/Texture2D";

/**
 * Instantiated by VBOSceneModel#createTexture
 *
 * @private
 */
export class PerformanceTexture {

    /**
     * @param {*} cfg Texture properties.
     * @param {String|Number} cfg.id Mandatory ID for the texture, to refer to with {@link VBOSceneModel#createMaterial}.
     * @param {String} [cfg.model] VBOSceneModel that owns this texture.
     * @param {*} [cfg.image] Texture image data.
     * @param {String} [cfg.src] Texture image source.
     * @param {Boolean} [cfg.flipY] Whether to flip on Y-axis.
     * @param {number[]} [cfg.preloadColor] Texture preload color.
     */
    constructor(cfg) {

        /**
         * ID of this PerformanceTexture, unique within the VBOSceneModel.
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
        this.texture = new Texture2D(cfg.model.scene.canvas.gl);

        const scene = cfg.model.scene;

        if (cfg.preloadColor) {
            this.texture.setPreloadColor(cfg.preloadColor);
            scene.glRedraw();
        }

        if (cfg.image) {
            const image = cfg.image;
            image.crossOrigin = "Anonymous";
            this.texture.setImage(image, {});
            this.texture.setProps({
                minFilter: cfg.minFilter || "linearMipmapLinear",
                magFilter: cfg.magFilter || "linear",
                wrapS: cfg.wrapS || "repeat",
                wrapT: cfg.wrapT || "repeat",
                flipY: cfg.flipY || false,
                encoding: cfg.encoding || "linear"
            });
            scene.glRedraw();
        } else if (cfg.src) {
            scene.loading++;
            scene.canvas.spinner.processes++;
            const image = new Image();
            image.onload = () => {
                this.texture.setImage(image, {});
                this.texture.setProps({
                    minFilter: cfg.minFilter || "linearMipmapLinear",
                    magFilter: cfg.magFilter || "linear",
                    wrapS: cfg.wrapS || "repeat",
                    wrapT: cfg.wrapT || "repeat",
                    flipY: cfg.flipY || false,
                    encoding: cfg.encoding || "linear"
                });
                scene.glRedraw();
                scene.loading--;
                scene.canvas.spinner.processes--;
            };
            image.src = cfg.src;
        }
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
