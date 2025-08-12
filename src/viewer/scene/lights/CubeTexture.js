import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {Texture2D} from '../webgl/Texture2D.js';
import {stats} from '../stats.js';
import {ClampToEdgeWrapping, LinearEncoding, LinearFilter, LinearMipmapLinearFilter, sRGBEncoding} from "../constants/constants.js";

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

/**
 * @desc A cube texture map.
 */
class CubeTexture extends Component {

    /**
     @private
     */
    get type() {
        return "CubeTexture";
    }

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID for this CubeTexture, unique among all components in the parent scene, generated automatically when omitted.
     * @param {String[]} [cfg.src=null]  Paths to six image files to load into this CubeTexture.
     * @param {Boolean} [cfg.flipY=false] Flips this CubeTexture's source data along its vertical axis when true.
     * @param {Number} [cfg.encoding=LinearEncoding] Encoding format. Supported values are {@link LinearEncoding} and {@link sRGBEncoding}.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        const gl = this.scene.canvas.gl;

        this._state = new RenderState({
            texture: new Texture2D({gl, target: gl.TEXTURE_CUBE_MAP}),
            flipY: this._checkFlipY(cfg.minFilter),
            encoding: this._checkEncoding(cfg.encoding),
            minFilter: LinearMipmapLinearFilter,
            magFilter: LinearFilter,
            wrapS: ClampToEdgeWrapping,
            wrapT: ClampToEdgeWrapping,
            mipmaps: true
        });

        this._src = cfg.src;
        this._images = [];

        this._loadSrc(cfg.src);

        stats.memory.textures++;
    }

    _checkFlipY(value) {
        return !!value;
    }

    _checkEncoding(value) {
        value = value || LinearEncoding;
        if (value !== LinearEncoding && value !== sRGBEncoding) {
            this.error("Unsupported value for 'encoding' - supported values are LinearEncoding and sRGBEncoding. Defaulting to LinearEncoding.");
            value = LinearEncoding;
        }
        return value;
    }

    _loadSrc(src) {
        const self = this;
        const gl = this.scene.canvas.gl;
        this._images = [];
        let loadFailed = false;
        let numLoaded = 0;
        for (let i = 0; i < src.length; i++) {
            const image = new Image();
            image.onload = (function () {
                let _image = image;
                const index = i;
                return function () {
                    if (loadFailed) {
                        return;
                    }
                    _image = ensureImageSizePowerOfTwo(_image);
                    self._images[index] = _image;
                    numLoaded++;
                    if (numLoaded === 6) {
                        let texture = self._state.texture;
                        if (!texture) {
                            texture = new Texture2D({gl, target: gl.TEXTURE_CUBE_MAP});
                            self._state.texture = texture;
                        }
                        texture.setImage(self._images, self._state);
                        self.fire("loaded", self._src, false);
                        self.glRedraw();
                    }
                };
            })();
            image.onerror = function () {
                loadFailed = true;
            };
            image.src = src[i];
        }
    }

    /**
     * Destroys this CubeTexture
     *
     */
    destroy() {
        super.destroy();
        if (this._state.texture) {
            this._state.texture.destroy();
        }
        stats.memory.textures--;
        this._state.destroy();
    }
}

export {CubeTexture};