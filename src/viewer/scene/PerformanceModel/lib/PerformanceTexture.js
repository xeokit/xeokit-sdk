import {Texture2D} from "../../webgl/Texture2D";

/**
 * Instantiated by PerformanceModel#createTexture
 *
 * @private
 */
export class PerformanceTexture {

    /**
     * @param {*} cfg Texture properties.
     * @param {String|Number} cfg.id Mandatory ID for the texture, to refer to with {@link PerformanceModel#createMaterial}.
     * @param {String} [cfg.model] PerformanceModel that owns this texture.
     * @param {*} [cfg.image] Texture image data.
     * @param {String} [cfg.src] Texture image source.
     * @param {Boolean} [cfg.flipY] Whether to flip on Y-axis.
     * @param {number[]} [cfg.preloadColor] Texture preload color.
     */
    constructor(cfg) {

        /**
         * ID of this PerformanceTexture, unique within the PerformanceModel.
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
            const image = ensureImageSizePowerOfTwo(cfg.image);
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
                image.crossOrigin = "Anonymous";
                this.texture.setImage(ensureImageSizePowerOfTwo(image), {});
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

function ensureImageSizePowerOfTwo(image) {
    if (!isPowerOfTwo(image.width) || !isPowerOfTwo(image.height)) {
        const canvas = document.createElement("canvas");
        canvas.width = nextHighestPowerOfTwo(image.width);
        canvas.height = nextHighestPowerOfTwo(image.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image,
            0, 0, image.width, image.height,
            0, 0, canvas.width, canvas.height);
        image = canvas;
    }
    return image;
}

function isPowerOfTwo(x) {
    return (x & (x - 1)) === 0;
}

function nextHighestPowerOfTwo(x) {
    --x;
    for (let i = 1; i < 32; i <<= 1) {
        x = x | x >> i;
    }
    return x + 1;
}