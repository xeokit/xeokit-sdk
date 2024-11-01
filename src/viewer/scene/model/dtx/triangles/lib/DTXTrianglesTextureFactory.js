import {dataTextureRamStats} from "./dataTextureRamStats.js";

/**
 * @private
 */
class BindableDataTexture {

    constructor(gl, texture, textureWidth, textureHeight, textureData = null) {
        this._gl = gl;
        this._texture = texture;
        this._textureWidth = textureWidth;
        this._textureHeight = textureHeight;
        this._textureData = textureData;
    }

    bindTexture(glProgram, shaderName, glTextureUnit) {
        return glProgram.bindTexture(shaderName, this, glTextureUnit);
    }

    bind(unit) {
        this._gl.activeTexture(this._gl["TEXTURE" + unit]);
        this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
        return true;
    }

    unbind(unit) {
        // This `unbind` method is ignored at the moment to allow avoiding
        // to rebind same texture already bound to a texture unit.

        // this._gl.activeTexture(this.state.gl["TEXTURE" + unit]);
        // this._gl.bindTexture(this.state.gl.TEXTURE_2D, null);
    }
}

/**
 * @private
 */
export class DTXTrianglesTextureFactory {

    constructor() {

    }

    _createBindableDataTexture(gl, dataCnt, type, entrySize, textureWidth, populateTexArray, statsProp, passTexArray) {
        if ((entrySize > 4) && ((entrySize % 4) > 0)) {
            throw "Unhandled data size " + entrySize;
        }
        const size = 1 + (entrySize - 1) % 4;
        const [ arrayType, internalFormat, format ] = (function() {
            switch(type) {
            case gl.UNSIGNED_BYTE:
                return [ Uint8Array,   ...((size === 1) ? [ gl.R8UI,  gl.RED_INTEGER ] : ((size === 2) ? [ gl.RG8UI,  gl.RG_INTEGER ] : ((size === 3) ? [ gl.RGB8UI,  gl.RGB_INTEGER ] : [ gl.RGBA8UI,  gl.RGBA_INTEGER ]))) ];
            case gl.UNSIGNED_SHORT:
                return [ Uint16Array,  ...((size === 1) ? [ gl.R16UI, gl.RED_INTEGER ] : ((size === 2) ? [ gl.RG16UI, gl.RG_INTEGER ] : ((size === 3) ? [ gl.RGB16UI, gl.RGB_INTEGER ] : [ gl.RGBA16UI, gl.RGBA_INTEGER ]))) ];
            case gl.UNSIGNED_INT:
                return [ Uint32Array,  ...((size === 1) ? [ gl.R32UI, gl.RED_INTEGER ] : ((size === 2) ? [ gl.RG32UI, gl.RG_INTEGER ] : ((size === 3) ? [ gl.RGB32UI, gl.RGB_INTEGER ] : [ gl.RGBA32UI, gl.RGBA_INTEGER ]))) ];
            case gl.FLOAT:
                return [ Float32Array, ...((size === 1) ? [ gl.R32F,  gl.RED ]         : ((size === 2) ? [ gl.RG32F,  gl.RG ]         : ((size === 3) ? [ gl.RGB32F,  gl.RGB ]         : [ gl.RGBA32F,  gl.RGBA ]))) ];
            default:
                throw "Unhandled data type " + type;
            }
        })();

        const textureHeight = Math.ceil(dataCnt / size / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArray = new arrayType(textureWidth * textureHeight * size);
        dataTextureRamStats[statsProp] += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;

        populateTexArray(texArray);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, format, type, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight, passTexArray ? texArray : null);
    }

    /**
     * This will generate an RGBA texture for:
     * - colors
     * - pickColors
     * - flags
     * - flags2
     * - vertex bases
     * - vertex base offsets
     *
     * The texture will have:
     * - 4 RGBA columns per row: for each object (pick) color and flags(2)
     * - N rows where N is the number of objects
     *
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<ArrayLike<int>>} colors Array of colors for all objects in the layer
     * @param {ArrayLike<ArrayLike<int>>} pickColors Array of pickColors for all objects in the layer
     * @param {ArrayLike<int>} vertexBases Array of position-index-bases foteh all objects in the layer
     * @param {ArrayLike<int>} indexBaseOffsets For triangles: array of offests between the (gl_VertexID / 3) and the position where the indices start in the texture layer
     * @param {ArrayLike<int>} edgeIndexBaseOffsets For edges: Array of offests between the (gl_VertexID / 2) and the position where the edge indices start in the texture layer
     * @param {ArrayLike<boolean>} solid Array is-solid flag for all objects in the layer
     *
     * @returns {BindableDataTexture}
     */
    createTextureForColorsAndFlags(gl, colors, pickColors, vertexBases, indexBaseOffsets, edgeIndexBaseOffsets, solid) {
        // The number of rows in the texture is the number of objects in the layer.
        const numPortions = colors.length;

        const pack32as4x8 = ui32 => [
            (ui32 >> 24) & 255,
            (ui32 >> 16) & 255,
            (ui32 >>  8) & 255,
            (ui32)       & 255
        ];

        const populateTexArray = texArray => {
            for (let i = 0; i < numPortions; i++) {
                // 8 columns per texture row:
                texArray.set(colors[i],                            i * 32 +  0); // - col0: (RGBA) object color RGBA
                texArray.set(pickColors[i],                        i * 32 +  4); // - col1: (packed Uint32 as RGBA) object pick color
                texArray.set([0, 0, 0, 0],                         i * 32 +  8); // - col2: (packed 4 bytes as RGBA) object flags
                texArray.set([0, 0, 0, 0],                         i * 32 + 12); // - col3: (packed 4 bytes as RGBA) object flags2
                texArray.set(pack32as4x8(vertexBases[i]),          i * 32 + 16); // - col4: (packed Uint32 bytes as RGBA) vertex base
                texArray.set(pack32as4x8(indexBaseOffsets[i]),     i * 32 + 20); // - col5: (packed Uint32 bytes as RGBA) index base offset
                texArray.set(pack32as4x8(edgeIndexBaseOffsets[i]), i * 32 + 24); // - col6: (packed Uint32 bytes as RGBA) edge index base offset
                texArray.set([solid[i] ? 1 : 0, 0, 0, 0],          i * 32 + 28); // - col7: (packed 4 bytes as RGBA) is-solid flag for objects
            }
        };

        const size = 4;
        return this._createBindableDataTexture(gl, numPortions * 8 * size, gl.UNSIGNED_BYTE, size, 512 * 8, populateTexArray, "sizeDataColorsAndFlags", true);
    }

    _createDataTexture(gl, dataArrays, dataCnt, type, size, textureWidth, statsProp, passTexArray) {
        const populateTexArray = texArray => {
            for (let i = 0, j = 0, len = dataArrays.length; i < len; i++) {
                const pc = dataArrays[i];
                texArray.set(pc, j);
                j += pc.length;
            }
        };
        return this._createBindableDataTexture(gl, dataCnt, type, size, textureWidth, populateTexArray, statsProp, passTexArray);
    }


    _createTextureForMatrices(gl, name, matrices, statsProp, passTexArray) {

        const numMatrices = matrices.length;
        if (numMatrices === 0) {
            throw "num " + name + " matrices===0";
        }
        // in one row we can fit 512 matrices
        return this._createDataTexture(gl, matrices, numMatrices * 16, gl.FLOAT, 16, 512 * 4, statsProp, passTexArray);
    }

    /**
     * This will generate a texture for all positions decode matrices in the layer.
     *
     * The texture will have:
     * - 4 RGBA columns per row (each column will contain 4 packed half-float (16 bits) components).
     *   Thus, each row will contain 16 packed half-floats corresponding to a complete positions decode matrix)
     * - N rows where N is the number of objects
     *
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<Matrix4x4>} instanceMatrices Array of geometry instancing matrices for all objects in the layer. Null if the objects are not instanced.
     *
     * @returns {BindableDataTexture}
     */
    createTextureForInstancingMatrices(gl, instanceMatrices) {
        return this._createTextureForMatrices(gl, "instance", instanceMatrices, "sizeDataInstancesMatrices", true);
    }

    /**
     * This will generate a texture for all positions decode matrices in the layer.
     *
     * The texture will have:
     * - 4 RGBA columns per row (each column will contain 4 packed half-float (16 bits) components).
     *   Thus, each row will contain 16 packed half-floats corresponding to a complete positions decode matrix)
     * - N rows where N is the number of objects
     *
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<Matrix4x4>} positionDecodeMatrices Array of positions decode matrices for all objects in the layer
     *
     * @returns {BindableDataTexture}
     */
    createTextureForPositionsDecodeMatrices(gl, positionDecodeMatrices) {
        return this._createTextureForMatrices(gl, "decode+entity", positionDecodeMatrices, "sizeDataPositionDecodeMatrices", false);
    }


    _createTextureForSingleItems(gl, dataArrays, dataCnt, type, size, statsProp) {
        return ((dataCnt === 0)
                ? { texture: null, textureHeight: 0 }
                : this._createDataTexture(gl, dataArrays, dataCnt, type, size, 4096, statsProp, false));
    }


    _createTextureForIndices(gl, indicesArrays, lenIndices, type) {
        return this._createTextureForSingleItems(gl, indicesArrays, lenIndices, type, 3, "sizeDataTextureIndices");
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor8BitIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForIndices(gl, indicesArrays, lenIndices, gl.UNSIGNED_BYTE);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor16BitIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForIndices(gl, indicesArrays, lenIndices, gl.UNSIGNED_SHORT);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor32BitIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForIndices(gl, indicesArrays, lenIndices, gl.UNSIGNED_INT);
    }


    _createTextureForEdgeIndices(gl, indicesArrays, lenIndices, type) {
        return this._createTextureForSingleItems(gl, indicesArrays, lenIndices, type, 2, "sizeDataTextureEdgeIndices");
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor8BitsEdgeIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForEdgeIndices(gl, indicesArrays, lenIndices, gl.UNSIGNED_BYTE);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor16BitsEdgeIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForEdgeIndices(gl, indicesArrays, lenIndices, gl.UNSIGNED_SHORT);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor32BitsEdgeIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForEdgeIndices(gl, indicesArrays, lenIndices, gl.UNSIGNED_INT);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} positionsArrays Arrays of  quantized positions in the layer
     * @param lenPositions
     *
     * This will generate a texture for positions in the layer.
     *
     * The texture will have:
     * - 1024 columns, where each pixel will be a 16-bit-per-component RGB texture, corresponding to the XYZ of the position
     * - a number of rows R where R*1024 is just >= than the number of vertices (positions / 3)
     *
     * @returns {BindableDataTexture}
     */
    createTextureForPositions(gl, positionsArrays, lenPositions) {
        return this._createTextureForSingleItems(gl, positionsArrays, lenPositions, gl.UNSIGNED_SHORT, 3, "sizeDataTexturePositions");
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} portionIdsArray
     *
     * @returns {BindableDataTexture}
     */
    createTextureForPackedPortionIds(gl, portionIdsArray) {
        return this._createTextureForSingleItems(gl, [ portionIdsArray ], portionIdsArray.length, gl.UNSIGNED_SHORT, 1, "sizeDataTexturePortionIds");
    }
}