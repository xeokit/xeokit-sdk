import {utils} from '../utils.js';
import {convertConstant} from "./convertConstant.js";
import {
    NearestFilter,
    NearestMipmapLinearFilter,
    NearestMipMapNearestFilter,
    RGBAFormat,
    sRGBEncoding,
    UnsignedByteType,
    RepeatWrapping,
    ClampToEdgeWrapping,
    LinearFilter,
    NearestMipmapNearestFilter
} from "../constants/constants.js";
import {getExtension} from "./getExtension.js";

const color = new Uint8Array([0, 0, 0, 1]);

/**
 * @desc A low-level component that represents a 2D WebGL texture.
 *
 * @private
 */
class Texture2D {

    constructor({gl, target, format, type, wrapS, wrapT, wrapR, encoding, preloadColor, premultiplyAlpha, flipY}) {

        this.gl = gl;

        this.target = target || gl.TEXTURE_2D;
        this.format = format || RGBAFormat;
        this.type = type || UnsignedByteType;
        this.internalFormat = null;
        this.premultiplyAlpha = !!premultiplyAlpha;
        this.flipY = !!flipY;
        this.unpackAlignment = 4;
        this.wrapS = wrapS || RepeatWrapping;
        this.wrapT = wrapT || RepeatWrapping;
        this.wrapR = wrapR || RepeatWrapping;
        this.encoding = encoding || sRGBEncoding;
        this.texture = gl.createTexture();

        if (preloadColor) {
            this.setPreloadColor(preloadColor); // Prevents "there is no texture bound to the unit 0" error
        }

        this.allocated = true;
    }

    setPreloadColor(value) {
        if (!value) {
            color[0] = 0;
            color[1] = 0;
            color[2] = 0;
            color[3] = 255;
        } else {
            color[0] = Math.floor(value[0] * 255);
            color[1] = Math.floor(value[1] * 255);
            color[2] = Math.floor(value[2] * 255);
            color[3] = Math.floor((value[3] !== undefined ? value[3] : 1) * 255);
        }
        const gl = this.gl;
        gl.bindTexture(this.target, this.texture);
        if (this.target === gl.TEXTURE_CUBE_MAP) {
            const faces = [
                gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
            ];
            for (let i = 0, len = faces.length; i < len; i++) {
                gl.texImage2D(faces[i], 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, color);
            }
        } else {
            gl.texImage2D(this.target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, color);
        }
        gl.bindTexture(this.target, null);
    }

    setTarget(target) {
        this.target = target || this.gl.TEXTURE_2D;
    }

    setImage(image, props = {}) {

        const gl = this.gl;

        if (props.format !== undefined) {
            this.format = props.format;
        }
        if (props.internalFormat !== undefined) {
            this.internalFormat = props.internalFormat;
        }
        if (props.encoding !== undefined) {
            this.encoding = props.encoding;
        }
        if (props.type !== undefined) {
            this.type = props.type;
        }
        if (props.flipY !== undefined) {
            this.flipY = props.flipY;
        }
        if (props.premultiplyAlpha !== undefined) {
            this.premultiplyAlpha = props.premultiplyAlpha;
        }
        if (props.unpackAlignment !== undefined) {
            this.unpackAlignment = props.unpackAlignment;
        }
        if (props.minFilter !== undefined) {
            this.minFilter = props.minFilter;
        }
        if (props.magFilter !== undefined) {
            this.magFilter = props.magFilter;
        }
        if (props.wrapS !== undefined) {
            this.wrapS = props.wrapS;
        }
        if (props.wrapT !== undefined) {
            this.wrapT = props.wrapT;
        }
        if (props.wrapR !== undefined) {
            this.wrapR = props.wrapR;
        }

        let generateMipMap = false;

        gl.bindTexture(this.target, this.texture);

        const bak1 = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);

        const bak2 = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);

        const bak3 = gl.getParameter(gl.UNPACK_ALIGNMENT);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, this.unpackAlignment);

        const bak4 = gl.getParameter(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL);;
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

        const minFilter = convertConstant(gl, this.minFilter);
        gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, minFilter);

        if (minFilter === gl.NEAREST_MIPMAP_NEAREST
            || minFilter === gl.LINEAR_MIPMAP_NEAREST
            || minFilter === gl.NEAREST_MIPMAP_LINEAR
            || minFilter === gl.LINEAR_MIPMAP_LINEAR) {
            generateMipMap = true;
        }

        const magFilter = convertConstant(gl, this.magFilter);
        if (magFilter) {
            gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, magFilter);
        }

        const wrapS = convertConstant(gl, this.wrapS);
        if (wrapS) {
            gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, wrapS);
        }

        const wrapT = convertConstant(gl, this.wrapT);
        if (wrapT) {
            gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, wrapT);
        }

        const glFormat = convertConstant(gl, this.format, this.encoding);
        const glType = convertConstant(gl, this.type);
        const glInternalFormat = getInternalFormat(gl, this.internalFormat, glFormat, glType, this.encoding, false);

        if (this.target === gl.TEXTURE_CUBE_MAP) {
            if (utils.isArray(image)) {
                const images = image;
                const faces = [
                    gl.TEXTURE_CUBE_MAP_POSITIVE_X,
                    gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
                    gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
                    gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
                    gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
                    gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
                ];
                for (let i = 0, len = faces.length; i < len; i++) {
                    gl.texImage2D(faces[i], 0, glInternalFormat, glFormat, glType, images[i]);
                }
            }
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, glFormat, glType, image);
        }

        if (generateMipMap) {
            gl.generateMipmap(this.target);
        }

        gl.bindTexture(this.target, null);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, bak1);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, bak2);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, bak3);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, bak4);
    }

    setCompressedData({mipmaps, props = {}}) {

        const gl = this.gl;
        const levels = mipmaps.length;

        // Cache props

        if (props.format !== undefined) {
            this.format = props.format;
        }
        if (props.internalFormat !== undefined) {
            this.internalFormat = props.internalFormat;
        }
        if (props.encoding !== undefined) {
            this.encoding = props.encoding;
        }
        if (props.type !== undefined) {
            this.type = props.type;
        }
        if (props.flipY !== undefined) {
            this.flipY = props.flipY;
        }
        if (props.premultiplyAlpha !== undefined) {
            this.premultiplyAlpha = props.premultiplyAlpha;
        }
        if (props.unpackAlignment !== undefined) {
            this.unpackAlignment = props.unpackAlignment;
        }
        if (props.minFilter !== undefined) {
            this.minFilter = props.minFilter;
        }
        if (props.magFilter !== undefined) {
            this.magFilter = props.magFilter;
        }
        if (props.wrapS !== undefined) {
            this.wrapS = props.wrapS;
        }
        if (props.wrapT !== undefined) {
            this.wrapT = props.wrapT;
        }
        if (props.wrapR !== undefined) {
            this.wrapR = props.wrapR;
        }

        gl.activeTexture(gl.TEXTURE0 + 0);
        gl.bindTexture(this.target, this.texture);

        let supportsMips = mipmaps.length > 1;

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, this.unpackAlignment);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

        const wrapS = convertConstant(gl, this.wrapS);
        if (wrapS) {
            gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, wrapS);
        }

        const wrapT = convertConstant(gl, this.wrapT);
        if (wrapT) {
            gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, wrapT);
        }

        if (this.type === gl.TEXTURE_3D || this.type === gl.TEXTURE_2D_ARRAY) {
            const wrapR = convertConstant(gl, this.wrapR);
            if (wrapR) {
                gl.texParameteri(this.target, gl.TEXTURE_WRAP_R, wrapR);
            }
            gl.texParameteri(this.type, gl.TEXTURE_WRAP_R, wrapR);
        }

        if (supportsMips) {
            gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, filterFallback(gl, this.minFilter));
            gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, filterFallback(gl, this.magFilter));

        } else {
            gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, convertConstant(gl, this.minFilter));
            gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, convertConstant(gl, this.magFilter));
        }

        const glFormat = convertConstant(gl, this.format, this.encoding);
        const glType = convertConstant(gl, this.type);
        const glInternalFormat = getInternalFormat(gl, this.internalFormat, glFormat, glType, this.encoding, false);

        gl.texStorage2D(gl.TEXTURE_2D, levels, glInternalFormat, mipmaps[0].width, mipmaps[0].height);

        for (let i = 0, len = mipmaps.length; i < len; i++) {

            const mipmap = mipmaps[i];

            if (this.format !== RGBAFormat) {
                if (glFormat !== null) {
                    gl.compressedTexSubImage2D(gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, mipmap.data);
                } else {
                    console.warn('Attempt to load unsupported compressed texture format in .setCompressedData()');
                }
            } else {
                gl.texSubImage2D(gl.TEXTURE_2D, i, 0, 0, mipmap.width, mipmap.height, glFormat, glType, mipmap.data);
            }
        }

        //    if (generateMipMap) {
        // //       gl.generateMipmap(this.target); // Only for roughness textures?
        //    }

        gl.bindTexture(this.target, null);
    }

    setProps(props) {
        const gl = this.gl;
        gl.bindTexture(this.target, this.texture);
        this._uploadProps(props);
        gl.bindTexture(this.target, null);
    }

    _uploadProps(props) {
        const gl = this.gl;
        if (props.format !== undefined) {
            this.format = props.format;
        }
        if (props.internalFormat !== undefined) {
            this.internalFormat = props.internalFormat;
        }
        if (props.encoding !== undefined) {
            this.encoding = props.encoding;
        }
        if (props.type !== undefined) {
            this.type = props.type;
        }
        if (props.minFilter !== undefined) {
            const minFilter = convertConstant(gl, props.minFilter);
            if (minFilter) {
                this.minFilter = props.minFilter;
                gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, minFilter);
                if (minFilter === gl.NEAREST_MIPMAP_NEAREST || minFilter === gl.LINEAR_MIPMAP_NEAREST || minFilter === gl.NEAREST_MIPMAP_LINEAR || minFilter === gl.LINEAR_MIPMAP_LINEAR) {
                    gl.generateMipmap(this.target);
                }
            }
        }
        if (props.magFilter !== undefined) {
            const magFilter = convertConstant(gl, props.magFilter);
            if (magFilter) {
                this.magFilter = props.magFilter;
                gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, magFilter);
            }
        }
        if (props.wrapS !== undefined) {
            const wrapS = convertConstant(gl, props.wrapS);
            if (wrapS) {
                this.wrapS = props.wrapS;
                gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, wrapS);
            }
        }
        if (props.wrapT !== undefined) {
            const wrapT = convertConstant(gl, props.wrapT);
            if (wrapT) {
                this.wrapT = props.wrapT;
                gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, wrapT);
            }
        }
    }

    bind(unit) {
        if (!this.allocated) {
            return;
        }
        if (this.texture) {
            const gl = this.gl;
            gl.activeTexture(gl["TEXTURE" + unit]);
            gl.bindTexture(this.target, this.texture);
            return true;
        }
        return false;
    }

    unbind(unit) {
        if (!this.allocated) {
            return;
        }
        if (this.texture) {
            const gl = this.gl;
            gl.activeTexture(gl["TEXTURE" + unit]);
            gl.bindTexture(this.target, null);
        }
    }

    destroy() {
        if (!this.allocated) {
            return;
        }
        if (this.texture) {
            this.gl.deleteTexture(this.texture);
            this.texture = null;
        }
    }
}

function getInternalFormat(gl, internalFormatName, glFormat, glType, encoding, isVideoTexture = false) {
    if (internalFormatName !== null) {
        if (gl[internalFormatName] !== undefined) {
            return gl[internalFormatName];
        }
        console.warn('Attempt to use non-existing WebGL internal format \'' + internalFormatName + '\'');
    }
    let internalFormat = glFormat;
    if (glFormat === gl.RED) {
        if (glType === gl.FLOAT) internalFormat = gl.R32F;
        if (glType === gl.HALF_FLOAT) internalFormat = gl.R16F;
        if (glType === gl.UNSIGNED_BYTE) internalFormat = gl.R8;
    }
    if (glFormat === gl.RG) {
        if (glType === gl.FLOAT) internalFormat = gl.RG32F;
        if (glType === gl.HALF_FLOAT) internalFormat = gl.RG16F;
        if (glType === gl.UNSIGNED_BYTE) internalFormat = gl.RG8;
    }
    if (glFormat === gl.RGBA) {
        if (glType === gl.FLOAT) internalFormat = gl.RGBA32F;
        if (glType === gl.HALF_FLOAT) internalFormat = gl.RGBA16F;
        if (glType === gl.UNSIGNED_BYTE) internalFormat = (encoding === sRGBEncoding && isVideoTexture === false) ? gl.SRGB8_ALPHA8 : gl.RGBA8;
        if (glType === gl.UNSIGNED_SHORT_4_4_4_4) internalFormat = gl.RGBA4;
        if (glType === gl.UNSIGNED_SHORT_5_5_5_1) internalFormat = gl.RGB5_A1;
    }
    if (internalFormat === gl.R16F || internalFormat === gl.R32F ||
        internalFormat === gl.RG16F || internalFormat === gl.RG32F ||
        internalFormat === gl.RGBA16F || internalFormat === gl.RGBA32F) {
        getExtension(gl, 'EXT_color_buffer_float');
    }
    return internalFormat;
}

function filterFallback(gl, f) {
    if (f === NearestFilter || f === NearestMipmapNearestFilter || f === NearestMipmapLinearFilter) {
        return gl.NEAREST;
    }
    return gl.LINEAR;

}

export {Texture2D};