/**
 * Texture wrapping mode in which the texture repeats to infinity.
 */
export const RepeatWrapping = 1000;

/**
 * Texture wrapping mode in which the last pixel of the texture stretches to the edge of the mesh.
 */
export const ClampToEdgeWrapping = 1001;

/**
 * Texture wrapping mode in which the texture repeats to infinity, mirroring on each repeat.
 */
export const MirroredRepeatWrapping = 1002;

/**
 * Texture magnification and minification filter that returns the nearest texel to the given sample coordinates.
 */
export const NearestFilter = 1003;

/**
 * Texture minification filter that chooses the mipmap that most closely matches the size of the pixel being textured and returns the nearest texel to the given sample coordinates.
 */
export const NearestMipMapNearestFilter = 1004;

/**
 * Texture minification filter that chooses the mipmap that most closely matches the size of the pixel being textured
 * and returns the nearest texel to the given sample coordinates.
 */
export const NearestMipmapNearestFilter = 1004;

/**
 * Texture minification filter that chooses two mipmaps that most closely match the size of the pixel being textured
 * and returns the nearest texel to the center of the pixel at the given sample coordinates.
 */
export const NearestMipmapLinearFilter = 1005;

/**
 * Texture minification filter that chooses two mipmaps that most closely match the size of the pixel being textured
 * and returns the nearest texel to the center of the pixel at the given sample coordinates.
 */
export const NearestMipMapLinearFilter = 1005;

/**
 * Texture magnification and minification filter that returns the weighted average of the four nearest texels to the given sample coordinates.
 */
export const LinearFilter = 1006;

/**
 * Texture minification filter that chooses the mipmap that most closely matches the size of the pixel being textured and
 * returns the weighted average of the four nearest texels to the given sample coordinates.
 */
export const LinearMipmapNearestFilter = 1007;

/**
 * Texture minification filter that chooses the mipmap that most closely matches the size of the pixel being textured and
 * returns the weighted average of the four nearest texels to the given sample coordinates.
 */
export const LinearMipMapNearestFilter = 1007;

/**
 * Texture minification filter that chooses two mipmaps that most closely match the size of the pixel being textured,
 * finds within each mipmap the weighted average of the nearest texel to the center of the pixel, then returns the
 * weighted average of those two values.
 */
export const LinearMipmapLinearFilter = 1008;

/**
 * Texture minification filter that chooses two mipmaps that most closely match the size of the pixel being textured,
 * finds within each mipmap the weighted average of the nearest texel to the center of the pixel, then returns the
 * weighted average of those two values.
 */
export const LinearMipMapLinearFilter = 1008;

/**
 * Unsigned 8-bit integer type.
 */
export const UnsignedByteType = 1009;

/**
 * Signed 8-bit integer type.
 */
export const ByteType = 1010;

/**
 * Signed 16-bit integer type.
 */
export const ShortType = 1011;

/**
 * Unsigned 16-bit integer type.
 */
export const UnsignedShortType = 1012;

/**
 * Signed 32-bit integer type.
 */
export const IntType = 1013;

/**
 * Unsigned 32-bit integer type.
 */
export const UnsignedIntType = 1014;

/**
 * Signed 32-bit floating-point type.
 */
export const FloatType = 1015;

/**
 * Signed 16-bit half-precision floating-point type.
 */
export const HalfFloatType = 1016;

/**
 * Texture packing mode in which each ````RGBA```` channel is packed into 4 bits, for a combined total of 16 bits.
 */
export const UnsignedShort4444Type = 1017;

/**
 * Texture packing mode in which the ````RGB```` channels are each packed into 5 bits, and the ````A```` channel is packed into 1 bit, for a combined total of 16 bits.
 */
export const UnsignedShort5551Type = 1018;

/**
 * Unsigned integer type for 24-bit depth texture data.
 */
export const UnsignedInt248Type = 1020;

/**
 * Texture sampling mode that discards the ````RGBA```` components and just reads the ````A```` component.
 */
export const AlphaFormat = 1021;

/**
 * Texture sampling mode that discards the ````A```` component and reads the ````RGB```` components.
 */
export const RGBFormat = 1022;

/**
 * Texture sampling mode that reads the ````RGBA```` components.
 */
export const RGBAFormat = 1023;

/**
 * Texture sampling mode that reads each ````RGB```` texture component as a luminance value, converted to a float and clamped
 * to ````[0,1]````, while always reading the ````A```` channel as ````1.0````.
 */
export const LuminanceFormat = 1024;

/**
 * Texture sampling mode that reads each of the ````RGBA```` texture components as a luminance/alpha value, converted to a float and clamped to ````[0,1]````.
 */
export const LuminanceAlphaFormat = 1025;

/**
 * Texture sampling mode that reads each element as a single depth value, converts it to a float and clamps to ````[0,1]````.
 */
export const DepthFormat = 1026;

/**
 * Texture sampling mode that
 */
export const DepthStencilFormat = 1027;

/**
 * Texture sampling mode that discards the ````GBA```` components and just reads the ````R```` component.
 */
export const RedFormat = 1028;

/**
 * Texture sampling mode that discards the ````GBA```` components and just reads the ````R```` component, as an integer instead of as a float.
 */
export const RedIntegerFormat = 1029;

/**
 * Texture sampling mode that discards the ````A```` and ````B```` components and just reads the ````R```` and ````G```` components.
 */
export const RGFormat = 1030;

/**
 * Texture sampling mode that discards the ````A```` and ````B```` components and just reads the ````R```` and ````G```` components, as integers instead of floats.
 */
export const RGIntegerFormat = 1031;

/**
 * Texture sampling mode that reads the ````RGBA```` components as integers instead of floats.
 */
export const RGBAIntegerFormat = 1033;

/**
 * Texture format mode in which the texture is formatted as a <a href="https://en.wikipedia.org/wiki/S3_Texture_Compression">DXT1 compressed</a> ````RGB```` image.
 */
export const RGB_S3TC_DXT1_Format = 33776;

/**
 * Texture format mode in which the texture is formatted as a <a href="https://en.wikipedia.org/wiki/S3_Texture_Compression">DXT1 compressed</a> ````RGBA```` image.
 */
export const RGBA_S3TC_DXT1_Format = 33777;

/**
 * Texture format mode in which the texture is formatted as a <a href="https://en.wikipedia.org/wiki/S3_Texture_Compression">DXT3 compressed</a> ````RGBA```` image.
 */
export const RGBA_S3TC_DXT3_Format = 33778;

/**
 * Texture format mode in which the texture is formatted as a <a href="https://en.wikipedia.org/wiki/S3_Texture_Compression">DXT5 compressed</a> ````RGBA```` image.
 */
export const RGBA_S3TC_DXT5_Format = 33779;

/**
 * Texture format mode in which the texture is formatted as a <a href="https://en.wikipedia.org/wiki/PVRTC">PVRTC compressed</a>
 * image, with ````RGB```` compression in 4-bit mode and one block for each 4×4 pixels.
 */
export const RGB_PVRTC_4BPPV1_Format = 35840;

/**
 * Texture format mode in which the texture is formatted as a <a href="https://en.wikipedia.org/wiki/PVRTC">PVRTC compressed</a>
 * image, with ````RGB```` compression in 2-bit mode and one block for each 8×4 pixels.
 */
export const RGB_PVRTC_2BPPV1_Format = 35841;

/**
 * Texture format mode in which the texture is formatted as a <a href="https://en.wikipedia.org/wiki/PVRTC">PVRTC compressed</a>
 * image, with ````RGBA```` compression in 4-bit mode and one block for each 4×4 pixels.
 */
export const RGBA_PVRTC_4BPPV1_Format = 35842;

/**
 * Texture format mode in which the texture is formatted as a <a href="https://en.wikipedia.org/wiki/PVRTC">PVRTC compressed</a>
 * image, with ````RGBA```` compression in 2-bit mode and one block for each 8×4 pixels.
 */
export const RGBA_PVRTC_2BPPV1_Format = 35843;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_etc1/">ETC1 compressed</a>
 * ````RGB```` image.
 */
export const RGB_ETC1_Format = 36196;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_etc2/">ETC2 compressed</a>
 * ````RGB```` image.
 */
export const RGB_ETC2_Format = 37492;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_etc2/">ETC2 compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ETC2_EAC_Format = 37496;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_4x4_Format = 37808;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_5x4_Format = 37809;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_5x5_Format = 37810;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_6x5_Format = 37811;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_6x6_Format = 37812;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_8x5_Format = 37813;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_8x6_Format = 37814;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_8x8_Format = 37815;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_10x5_Format = 37816;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_10x6_Format = 37817;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_10x8_Format = 37818;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_10x10_Format = 37819;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_12x10_Format = 37820;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/">ATSC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_ASTC_12x12_Format = 37821;

/**
 * Texture format mode in which the texture is formatted as an <a href="https://www.khronos.org/opengl/wiki/BPTC_Texture_Compression">BPTC compressed</a>
 * ````RGBA```` image.
 */
export const RGBA_BPTC_Format = 36492;

/**
 * Texture encoding mode in which the texture image is in linear color space.
 */
export const LinearEncoding = 3000;

/**
 * Texture encoding mode in which the texture image is in sRGB color space.
 */
export const sRGBEncoding = 3001;

/**
 * Media type for GIF images.
 */
export const GIFMediaType = 10000;

/**
 * Media type for JPEG images.
 */
export const JPEGMediaType = 10001;

/**
 * Media type for PNG images.
 */
export const PNGMediaType = 10002;

/**
 * Media type for compressed texture data.
 */
export const CompressedMediaType = 10003;