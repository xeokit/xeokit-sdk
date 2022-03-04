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
     * @param {*} [cfg.imageData] Texture image data.
     * @param {String} [cfg.src] Texture image source.
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

        if (cfg.preloadColor) {
          //  this.texture.setPreloadColor(cfg.preloadColor);
        }

        if (cfg.imageData) {
            const image = ensureImageSizePowerOfTwo(cfg.imageData);
           // image.crossOrigin = "Anonymous";
            this.texture.setImage(image, { flipY: false});
            this.texture.setProps({
                minFilter: "linearMipmapLinear",
                magFilter: "linear",
                wrapS: "repeat",
                wrapT: "repeat",
                flipY: false,
                encoding: "linear"
            }); // Generate mipmaps

        } else if (cfg.src) {
            const scene = cfg.model.scene;
            scene.loading++;
            scene.canvas.spinner.processes++;
            const image = new Image();
            const self = this;
            image.onload = function() {
            //    image.crossOrigin = "Anonymous";
                self.texture.setImage(ensureImageSizePowerOfTwo(image), {flipY: false});
                self.texture.setProps({
                    minFilter: "linearMipmapLinear",
                    magFilter: "linear",
                     wrapS: "repeat",
                    wrapT: "repeat",
                    flipY: false,
                    encoding: "linear"
                }); // Generate mipmaps
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