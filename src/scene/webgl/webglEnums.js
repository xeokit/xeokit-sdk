/**
 * @author xeolabs / https://github.com/xeolabs
 */

/**
 * Human-readable WebGL enumeration mappings.
 * @type {{rgba: string, dstAlpha: string, linearMipmapLinear: string, notequal: string, luminanceAlpha: string, nearest: string, zero: string, nearestMipmapLinear: string, oneMinusSrcColor: string, ccw: string, funcSubtract: string, unsignedByte: string, nearestMipmapNearest: string, oneMinusDstColor: string, greater: string, always: string, compareRToTexture: string, funcAdd: string, dstColor: string, gequal: string, less: string, funcReverseSubtract: string, linearMipmapNearest: string, never: string, mirroredRepeat: string, textureBinding2D: string, oneMinusDstAlpha: string, oneMinusSrcAlpha: string, srcAlpha: string, luminance: string, frontAndBack: string, lequal: string, back: string, rgb: string, oneMinusConstantAlpha: string, repeat: string, alpha: string, srcColor: string, textureBindingCubeMap: string, linear: string, one: string, contantColor: string, equal: string, oneMinusConstantColor: string, cw: string, constantAlpha: string, srcAlphaSaturate: string, clampToEdge: string, front: string}}
 */
const webglEnums = {
    funcAdd: "FUNC_ADD",
    funcSubtract: "FUNC_SUBTRACT",
    funcReverseSubtract: "FUNC_REVERSE_SUBTRACT",
    zero: "ZERO",
    one: "ONE",
    srcColor: "SRC_COLOR",
    oneMinusSrcColor: "ONE_MINUS_SRC_COLOR",
    dstColor: "DST_COLOR",
    oneMinusDstColor: "ONE_MINUS_DST_COLOR",
    srcAlpha: "SRC_ALPHA",
    oneMinusSrcAlpha: "ONE_MINUS_SRC_ALPHA",
    dstAlpha: "DST_ALPHA",
    oneMinusDstAlpha: "ONE_MINUS_DST_ALPHA",
    contantColor: "CONSTANT_COLOR",
    oneMinusConstantColor: "ONE_MINUS_CONSTANT_COLOR",
    constantAlpha: "CONSTANT_ALPHA",
    oneMinusConstantAlpha: "ONE_MINUS_CONSTANT_ALPHA",
    srcAlphaSaturate: "SRC_ALPHA_SATURATE",
    front: "FRONT",
    back: "BACK",
    frontAndBack: "FRONT_AND_BACK",
    never: "NEVER",
    less: "LESS",
    equal: "EQUAL",
    lequal: "LEQUAL",
    greater: "GREATER",
    notequal: "NOTEQUAL",
    gequal: "GEQUAL",
    always: "ALWAYS",
    cw: "CW",
    ccw: "CCW",
    linear: "LINEAR",
    nearest: "NEAREST",
    linearMipmapNearest: "LINEAR_MIPMAP_NEAREST",
    nearestMipmapNearest: "NEAREST_MIPMAP_NEAREST",
    nearestMipmapLinear: "NEAREST_MIPMAP_LINEAR",
    linearMipmapLinear: "LINEAR_MIPMAP_LINEAR",
    repeat: "REPEAT",
    clampToEdge: "CLAMP_TO_EDGE",
    mirroredRepeat: "MIRRORED_REPEAT",
    alpha: "ALPHA",
    rgb: "RGB",
    rgba: "RGBA",
    luminance: "LUMINANCE",
    luminanceAlpha: "LUMINANCE_ALPHA",
    textureBinding2D: "TEXTURE_BINDING_2D",
    textureBindingCubeMap: "TEXTURE_BINDING_CUBE_MAP",
    compareRToTexture: "COMPARE_R_TO_TEXTURE", // Hardware Shadowing Z-depth,
    unsignedByte: "UNSIGNED_BYTE"
};

export {webglEnums};