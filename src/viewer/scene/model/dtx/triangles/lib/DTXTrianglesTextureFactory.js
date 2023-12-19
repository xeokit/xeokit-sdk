import {BindableDataTexture} from "./../../BindableDataTexture.js";
import {dataTextureRamStats} from "./dataTextureRamStats.js";

/**
 * @private
 */
export class DTXTrianglesTextureFactory {

    constructor() {

    }

    /**
     * Enables the currently binded ````WebGLTexture```` to be used as a data texture.
     *
     * @param {WebGL2RenderingContext} gl
     *
     * @private
     */
    disableBindedTextureFiltering(gl) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight, texArray);
    }

    /**
     * This will generate a texture for all object offsets.
     *
     * @param {WebGL2RenderingContext} gl
     * @param {int[]} offsets Array of int[3], one XYZ offset array for each object
     *
     * @returns {BindableDataTexture}
     */
    createTextureForObjectOffsets(gl, numOffsets) {
        const textureWidth = 512;
        const textureHeight = Math.ceil(numOffsets / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArray = new Float32Array(3 * textureWidth * textureHeight).fill(0);
        dataTextureRamStats.sizeDataTextureOffsets += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32F, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB, gl.FLOAT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight, texArray);
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
        const numMatrices = instanceMatrices.length;
        if (numMatrices === 0) {
            throw "num instance matrices===0";
        }
        // in one row we can fit 512 matrices
        const textureWidth = 512 * 4;
        const textureHeight = Math.ceil(numMatrices / (textureWidth / 4));
        const texArray = new Float32Array(4 * textureWidth * textureHeight);
        // dataTextureRamStats.sizeDataPositionDecodeMatrices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        for (let i = 0; i < instanceMatrices.length; i++) {            // 4x4 values
            texArray.set(instanceMatrices[i], i * 16);
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGBA, gl.FLOAT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight, texArray);
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
        const numMatrices = positionDecodeMatrices.length;
        if (numMatrices === 0) {
            throw "num decode+entity matrices===0";
        }
        // in one row we can fit 512 matrices
        const textureWidth = 512 * 4;
        const textureHeight = Math.ceil(numMatrices / (textureWidth / 4));
        const texArray = new Float32Array(4 * textureWidth * textureHeight);
        dataTextureRamStats.sizeDataPositionDecodeMatrices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        for (let i = 0; i < positionDecodeMatrices.length; i++) {            // 4x4 values
            texArray.set(positionDecodeMatrices[i], i * 16);
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGBA, gl.FLOAT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor8BitIndices(gl, indicesArrays, lenIndices) {
        if (lenIndices === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(lenIndices / 3 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint8Array(texArraySize);
        dataTextureRamStats.sizeDataTextureIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        for (let i = 0, j = 0, len = indicesArrays.length; i < len; i++) {
            const pc = indicesArrays[i];
            texArray.set(pc, j);
            j += pc.length;
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB8UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB_INTEGER, gl.UNSIGNED_BYTE, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor16BitIndices(gl, indicesArrays, lenIndices) {
        if (lenIndices === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(lenIndices / 3 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint16Array(texArraySize);
        dataTextureRamStats.sizeDataTextureIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        for (let i = 0, j = 0, len = indicesArrays.length; i < len; i++) {
            const pc = indicesArrays[i];
            texArray.set(pc, j);
            j += pc.length;
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB16UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB_INTEGER, gl.UNSIGNED_SHORT, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor32BitIndices(gl, indicesArrays, lenIndices) {
        if (lenIndices === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(lenIndices / 3 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint32Array(texArraySize);
        dataTextureRamStats.sizeDataTextureIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        for (let i = 0, j = 0, len = indicesArrays.length; i < len; i++) {
            const pc = indicesArrays[i];
            texArray.set(pc, j);
            j += pc.length;
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB_INTEGER, gl.UNSIGNED_INT, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor8BitsEdgeIndices(gl, indicesArrays, lenIndices) {
        if (lenIndices === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(lenIndices / 2 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 2;
        const texArray = new Uint8Array(texArraySize);
        dataTextureRamStats.sizeDataTextureEdgeIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        for (let i = 0, j = 0, len = indicesArrays.length; i < len; i++) {
            const pc = indicesArrays[i];
            texArray.set(pc, j);
            j += pc.length;
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG8UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RG_INTEGER, gl.UNSIGNED_BYTE, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor16BitsEdgeIndices(gl, indicesArrays, lenIndices) {
        if (lenIndices === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(lenIndices / 2 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 2;
        const texArray = new Uint16Array(texArraySize);
        dataTextureRamStats.sizeDataTextureEdgeIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        for (let i = 0, j = 0, len = indicesArrays.length; i < len; i++) {
            const pc = indicesArrays[i];
            texArray.set(pc, j);
            j += pc.length;
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG16UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RG_INTEGER, gl.UNSIGNED_SHORT, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param indicesArrays
     * @param lenIndices
     *
     * @returns {BindableDataTexture}
     */
    createTextureFor32BitsEdgeIndices(gl, indicesArrays, lenIndices) {
        if (lenIndices === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const textureWidth = 4096;
        const textureHeight = Math.ceil(lenIndices / 2 / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 2;
        const texArray = new Uint32Array(texArraySize);
        dataTextureRamStats.sizeDataTextureEdgeIndices += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        for (let i = 0, j = 0, len = indicesArrays.length; i < len; i++) {
            const pc = indicesArrays[i];
            texArray.set(pc, j);
            j += pc.length;
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG32UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RG_INTEGER, gl.UNSIGNED_INT, texArray, 0);
        this.disableBindedTextureFiltering(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
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
        const numVertices = lenPositions / 3;
        const textureWidth = 4096;
        const textureHeight = Math.ceil(numVertices / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint16Array(texArraySize);
        dataTextureRamStats.sizeDataTexturePositions += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        for (let i = 0, j = 0, len = positionsArrays.length; i < len; i++) {
            const pc = positionsArrays[i];
            texArray.set(pc, j);
            j += pc.length;
        }
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB16UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB_INTEGER, gl.UNSIGNED_SHORT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} portionIdsArray
     *
     * @returns {BindableDataTexture}
     */
    createTextureForPackedPortionIds(gl, portionIdsArray) {
        if (portionIdsArray.length === 0) {
            return {texture: null, textureHeight: 0,};
        }
        const lenArray = portionIdsArray.length;
        const textureWidth = 4096;
        const textureHeight = Math.ceil(lenArray / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight;
        const texArray = new Uint16Array(texArraySize);
        texArray.set(portionIdsArray, 0);
        dataTextureRamStats.sizeDataTexturePortionIds += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R16UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RED_INTEGER, gl.UNSIGNED_SHORT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return new BindableDataTexture(gl, texture, textureWidth, textureHeight);
    }
}