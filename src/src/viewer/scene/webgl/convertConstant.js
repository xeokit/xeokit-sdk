import {
    RGBA_ASTC_4x4_Format,
    RGBA_ASTC_5x4_Format,
    RGBA_ASTC_5x5_Format,
    RGBA_ASTC_6x5_Format,
    RGBA_ASTC_6x6_Format,
    RGBA_ASTC_8x5_Format,
    RGBA_ASTC_8x6_Format,
    RGBA_ASTC_8x8_Format,
    RGBA_ASTC_10x5_Format,
    RGBA_ASTC_10x6_Format,
    RGBA_ASTC_10x8_Format,
    RGBA_ASTC_10x10_Format,
    RGBA_ASTC_12x10_Format,
    RGBA_ASTC_12x12_Format,
    RGB_ETC1_Format,
    RGB_ETC2_Format,
    RGBA_ETC2_EAC_Format,
    RGBA_PVRTC_2BPPV1_Format,
    RGBA_PVRTC_4BPPV1_Format,
    RGB_PVRTC_2BPPV1_Format,
    RGB_PVRTC_4BPPV1_Format,
    RGBA_S3TC_DXT5_Format,
    RGBA_S3TC_DXT3_Format,
    RGBA_S3TC_DXT1_Format,
    RGB_S3TC_DXT1_Format,
    DepthFormat,
    DepthStencilFormat,
    LuminanceAlphaFormat,
    LuminanceFormat,
    RedFormat,
    RGBFormat,
    RGBAFormat,
    AlphaFormat,
    RedIntegerFormat,
    RGFormat,
    RGIntegerFormat,
    RGBAIntegerFormat,
    HalfFloatType,
    FloatType,
    UnsignedIntType,
    IntType,
    UnsignedShortType,
    ShortType,
    ByteType,
    UnsignedInt248Type,
    UnsignedShort5551Type,
    UnsignedShort4444Type,
    UnsignedByteType,
    RGBA_BPTC_Format,
    sRGBEncoding,
    // _SRGBAFormat,
    RepeatWrapping,
    ClampToEdgeWrapping,
    NearestFilter,
    LinearFilter,
    NearestMipMapNearestFilter,
    LinearMipMapNearestFilter,
    NearestMipMapLinearFilter, LinearMipMapLinearFilter
} from '../constants/constants.js';

import {getExtension} from "./getExtension.js";

/**
 * @private
 */
function convertConstant(gl, constantVal, encoding = null) {

    let extension;
    const p = constantVal;

    if (p === UnsignedByteType) return gl.UNSIGNED_BYTE;
    if (p === UnsignedShort4444Type) return gl.UNSIGNED_SHORT_4_4_4_4;
    if (p === UnsignedShort5551Type) return gl.UNSIGNED_SHORT_5_5_5_1;

    if (p === ByteType) return gl.BYTE;
    if (p === ShortType) return gl.SHORT;
    if (p === UnsignedShortType) return gl.UNSIGNED_SHORT;
    if (p === IntType) return gl.INT;
    if (p === UnsignedIntType) return gl.UNSIGNED_INT;
    if (p === FloatType) return gl.FLOAT;

    if (p === HalfFloatType) {
        return gl.HALF_FLOAT;
    }

    if (p === AlphaFormat) return gl.ALPHA;
    if (p === RGBAFormat) return gl.RGBA;
    if (p === LuminanceFormat) return gl.LUMINANCE;
    if (p === LuminanceAlphaFormat) return gl.LUMINANCE_ALPHA;
    if (p === DepthFormat) return gl.DEPTH_COMPONENT;
    if (p === DepthStencilFormat) return gl.DEPTH_STENCIL;
    if (p === RedFormat) return gl.RED;

    if (p === RGBFormat) {
        return gl.RGBA;
    }

    // WebGL2 formats.

    if (p === RedIntegerFormat) return gl.RED_INTEGER;
    if (p === RGFormat) return gl.RG;
    if (p === RGIntegerFormat) return gl.RG_INTEGER;
    if (p === RGBAIntegerFormat) return gl.RGBA_INTEGER;

    // S3TC

    if (p === RGB_S3TC_DXT1_Format || p === RGBA_S3TC_DXT1_Format || p === RGBA_S3TC_DXT3_Format || p === RGBA_S3TC_DXT5_Format) {
        if (encoding === sRGBEncoding) {
            const extension = getExtension(gl, 'WEBGL_compressed_texture_s3tc_srgb');
            if (extension !== null) {
                if (p === RGB_S3TC_DXT1_Format) return extension.COMPRESSED_SRGB_S3TC_DXT1_EXT;
                if (p === RGBA_S3TC_DXT1_Format) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
                if (p === RGBA_S3TC_DXT3_Format) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
                if (p === RGBA_S3TC_DXT5_Format) return extension.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
            } else {
                return null;
            }
        } else {
            extension = getExtension(gl, 'WEBGL_compressed_texture_s3tc');
            if (extension !== null) {
                if (p === RGB_S3TC_DXT1_Format) return extension.COMPRESSED_RGB_S3TC_DXT1_EXT;
                if (p === RGBA_S3TC_DXT1_Format) return extension.COMPRESSED_RGBA_S3TC_DXT1_EXT;
                if (p === RGBA_S3TC_DXT3_Format) return extension.COMPRESSED_RGBA_S3TC_DXT3_EXT;
                if (p === RGBA_S3TC_DXT5_Format) return extension.COMPRESSED_RGBA_S3TC_DXT5_EXT;
            } else {
                return null;
            }
        }
    }

    // PVRTC

    if (p === RGB_PVRTC_4BPPV1_Format || p === RGB_PVRTC_2BPPV1_Format || p === RGBA_PVRTC_4BPPV1_Format || p === RGBA_PVRTC_2BPPV1_Format) {
        const extension = getExtension(gl, 'WEBGL_compressed_texture_pvrtc');
        if (extension !== null) {
            if (p === RGB_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
            if (p === RGB_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
            if (p === RGBA_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
            if (p === RGBA_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
        } else {
            return null;
        }
    }

    // ETC1

    if (p === RGB_ETC1_Format) {
        const extension = getExtension(gl, 'WEBGL_compressed_texture_etc1');
        if (extension !== null) {
            return extension.COMPRESSED_RGB_ETC1_WEBGL;
        } else {
            return null;
        }
    }

    // ETC2

    if (p === RGB_ETC2_Format || p === RGBA_ETC2_EAC_Format) {
        const extension = getExtension(gl, 'WEBGL_compressed_texture_etc');
        if (extension !== null) {
            if (p === RGB_ETC2_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ETC2 : extension.COMPRESSED_RGB8_ETC2;
            if (p === RGBA_ETC2_EAC_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : extension.COMPRESSED_RGBA8_ETC2_EAC;
        } else {
            return null;
        }
    }

    // ASTC

    if (p === RGBA_ASTC_4x4_Format || p === RGBA_ASTC_5x4_Format || p === RGBA_ASTC_5x5_Format ||
        p === RGBA_ASTC_6x5_Format || p === RGBA_ASTC_6x6_Format || p === RGBA_ASTC_8x5_Format ||
        p === RGBA_ASTC_8x6_Format || p === RGBA_ASTC_8x8_Format || p === RGBA_ASTC_10x5_Format ||
        p === RGBA_ASTC_10x6_Format || p === RGBA_ASTC_10x8_Format || p === RGBA_ASTC_10x10_Format ||
        p === RGBA_ASTC_12x10_Format || p === RGBA_ASTC_12x12_Format) {
        const extension = getExtension(gl, 'WEBGL_compressed_texture_astc');
        if (extension !== null) {
            if (p === RGBA_ASTC_4x4_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : extension.COMPRESSED_RGBA_ASTC_4x4_KHR;
            if (p === RGBA_ASTC_5x4_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : extension.COMPRESSED_RGBA_ASTC_5x4_KHR;
            if (p === RGBA_ASTC_5x5_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : extension.COMPRESSED_RGBA_ASTC_5x5_KHR;
            if (p === RGBA_ASTC_6x5_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : extension.COMPRESSED_RGBA_ASTC_6x5_KHR;
            if (p === RGBA_ASTC_6x6_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : extension.COMPRESSED_RGBA_ASTC_6x6_KHR;
            if (p === RGBA_ASTC_8x5_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : extension.COMPRESSED_RGBA_ASTC_8x5_KHR;
            if (p === RGBA_ASTC_8x6_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : extension.COMPRESSED_RGBA_ASTC_8x6_KHR;
            if (p === RGBA_ASTC_8x8_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : extension.COMPRESSED_RGBA_ASTC_8x8_KHR;
            if (p === RGBA_ASTC_10x5_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : extension.COMPRESSED_RGBA_ASTC_10x5_KHR;
            if (p === RGBA_ASTC_10x6_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : extension.COMPRESSED_RGBA_ASTC_10x6_KHR;
            if (p === RGBA_ASTC_10x8_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : extension.COMPRESSED_RGBA_ASTC_10x8_KHR;
            if (p === RGBA_ASTC_10x10_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : extension.COMPRESSED_RGBA_ASTC_10x10_KHR;
            if (p === RGBA_ASTC_12x10_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : extension.COMPRESSED_RGBA_ASTC_12x10_KHR;
            if (p === RGBA_ASTC_12x12_Format) return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : extension.COMPRESSED_RGBA_ASTC_12x12_KHR;
        } else {
            return null;
        }
    }

    // BPTC

    if (p === RGBA_BPTC_Format) {
        const extension = getExtension(gl, 'EXT_texture_compression_bptc');
        if (extension !== null) {
            if (p === RGBA_BPTC_Format) {
                return (encoding === sRGBEncoding) ? extension.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : extension.COMPRESSED_RGBA_BPTC_UNORM_EXT;
            }
        } else {
            return null;
        }
    }

    //

    if (p === UnsignedInt248Type) {
        return gl.UNSIGNED_INT_24_8;
    }
    if (p === RepeatWrapping) {
        return gl.REPEAT;
    }
    if (p === ClampToEdgeWrapping) {
        return gl.CLAMP_TO_EDGE;
    }
    if (p === NearestMipMapNearestFilter) {
        return gl.NEAREST_MIPMAP_LINEAR;
    }
    if (p === NearestMipMapLinearFilter) {
        return gl.NEAREST_MIPMAP_LINEAR;
    }
    if (p === LinearMipMapNearestFilter) {
        return gl.LINEAR_MIPMAP_NEAREST;
    }
    if (p === LinearMipMapLinearFilter) {
        return gl.LINEAR_MIPMAP_LINEAR;
    }
    if (p === NearestFilter) {
        return gl.NEAREST;
    }
    if (p === LinearFilter) {
        return gl.LINEAR;
    }

    return null;
}


export {convertConstant};