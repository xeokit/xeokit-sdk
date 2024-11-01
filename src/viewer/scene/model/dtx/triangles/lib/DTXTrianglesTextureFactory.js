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

    _createBindableDataTexture(gl, internalFormat, textureWidth, textureHeight, format, type, texArray, passTexArray) {
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
        const numPortions = colors.length;

        // The number of rows in the texture is the number of
        // objects in the layer.

        this.numPortions = numPortions;

        const textureWidth = 512 * 8;
        const textureHeight = Math.ceil(numPortions / (textureWidth / 8));

        if (textureHeight === 0) {
            throw "texture height===0";
        }

        // 8 columns per texture row:
        // - col0: (RGBA) object color RGBA
        // - col1: (packed Uint32 as RGBA) object pick color
        // - col2: (packed 4 bytes as RGBA) object flags
        // - col3: (packed 4 bytes as RGBA) object flags2
        // - col4: (packed Uint32 bytes as RGBA) vertex base
        // - col5: (packed Uint32 bytes as RGBA) index base offset
        // - col6: (packed Uint32 bytes as RGBA) edge index base offset
        // - col7: (packed 4 bytes as RGBA) is-solid flag for objects

        const texArray = new Uint8Array(4 * textureWidth * textureHeight);

        dataTextureRamStats.sizeDataColorsAndFlags += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;

        for (let i = 0; i < numPortions; i++) {
            // object color
            texArray.set(colors [i], i * 32 + 0);
            texArray.set(pickColors [i], i * 32 + 4); // object pick color
            texArray.set([0, 0, 0, 0], i * 32 + 8);     // object flags
            texArray.set([0, 0, 0, 0], i * 32 + 12);        // object flags2

            // vertex base
            texArray.set([
                    (vertexBases[i] >> 24) & 255,
                    (vertexBases[i] >> 16) & 255,
                    (vertexBases[i] >> 8) & 255,
                    (vertexBases[i]) & 255,
                ],
                i * 32 + 16
            );

            // triangles index base offset
            texArray.set(
                [
                    (indexBaseOffsets[i] >> 24) & 255,
                    (indexBaseOffsets[i] >> 16) & 255,
                    (indexBaseOffsets[i] >> 8) & 255,
                    (indexBaseOffsets[i]) & 255,
                ],
                i * 32 + 20
            );

            // edge index base offset
            texArray.set(
                [
                    (edgeIndexBaseOffsets[i] >> 24) & 255,
                    (edgeIndexBaseOffsets[i] >> 16) & 255,
                    (edgeIndexBaseOffsets[i] >> 8) & 255,
                    (edgeIndexBaseOffsets[i]) & 255,
                ],
                i * 32 + 24
            );

            // is-solid flag
            texArray.set([solid[i] ? 1 : 0, 0, 0, 0], i * 32 + 28);
        }

        return this._createBindableDataTexture(gl, gl.RGBA8UI, textureWidth, textureHeight, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, texArray, true);
    }

    _createDataTexture(gl, dataArrays, dataLen, dataWidth, arrayType, internalFormat, type, textureWidth, format, statsProp, passTexArray) {
        const textureHeight = Math.ceil(dataLen / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArray = new arrayType(textureWidth * textureHeight * dataWidth);
        dataTextureRamStats[statsProp] += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        for (let i = 0, j = 0, len = dataArrays.length; i < len; i++) {
            const pc = dataArrays[i];
            texArray.set(pc, j);
            j += pc.length;
        }
        return this._createBindableDataTexture(gl, internalFormat, textureWidth, textureHeight, format, type, texArray, passTexArray);
    }


    _createTextureForMatrices(gl, name, matrices, statsProp, passTexArray) {

        const numMatrices = matrices.length;
        if (numMatrices === 0) {
            throw "num " + name + " matrices===0";
        }
        // in one row we can fit 512 matrices
        return this._createDataTexture(gl, matrices, numMatrices, 16, Float32Array, gl.RGBA32F, gl.FLOAT, 512 * 4, gl.RGBA, statsProp, passTexArray);
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


    _createTextureForSingleItems(gl, dataArrays, lenData, arrayType, internalFormat, type, itemWidth, format, statsProp) {
        return ((lenData === 0)
                ? { texture: null, textureHeight: 0 }
                : this._createDataTexture(gl, dataArrays, lenData / itemWidth, itemWidth, arrayType, internalFormat, type, 4096, format, statsProp, false));
    }


    _createTextureForIndices(gl, indicesArrays, lenIndices, arrayType, internalFormat, type) {
        return this._createTextureForSingleItems(gl, indicesArrays, lenIndices, arrayType, internalFormat, type, 3, gl.RGB_INTEGER, "sizeDataTextureIndices");
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor8BitIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForIndices(gl, indicesArrays, lenIndices, Uint8Array, gl.RGB8UI, gl.UNSIGNED_BYTE);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor16BitIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForIndices(gl, indicesArrays, lenIndices, Uint16Array, gl.RGB16UI, gl.UNSIGNED_SHORT);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor32BitIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForIndices(gl, indicesArrays, lenIndices, Uint32Array, gl.RGB32UI, gl.UNSIGNED_INT);
    }


    _createTextureForEdgeIndices(gl, indicesArrays, lenIndices, arrayType, internalFormat, type) {
        return this._createTextureForSingleItems(gl, indicesArrays, lenIndices, arrayType, internalFormat, type, 2, gl.RG_INTEGER, "sizeDataTextureEdgeIndices");
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor8BitsEdgeIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForEdgeIndices(gl, indicesArrays, lenIndices, Uint8Array, gl.RG8UI, gl.UNSIGNED_BYTE);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor16BitsEdgeIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForEdgeIndices(gl, indicesArrays, lenIndices, Uint16Array, gl.RG16UI, gl.UNSIGNED_SHORT);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor32BitsEdgeIndices(gl, indicesArrays, lenIndices) {
        return this._createTextureForEdgeIndices(gl, indicesArrays, lenIndices, Uint32Array, gl.RG32UI, gl.UNSIGNED_INT);
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
        return this._createTextureForSingleItems(gl, positionsArrays, lenPositions, Uint16Array, gl.RGB16UI, gl.UNSIGNED_SHORT, 3, gl.RGB_INTEGER, "sizeDataTexturePositions");
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} portionIdsArray
     *
     * @returns {BindableDataTexture}
     */
    createTextureForPackedPortionIds(gl, portionIdsArray) {
        return this._createTextureForSingleItems(gl, [ portionIdsArray ], portionIdsArray.length, Uint16Array, gl.R16UI, gl.UNSIGNED_SHORT, 1, gl.RED_INTEGER, "sizeDataTexturePortionIds");
    }
}