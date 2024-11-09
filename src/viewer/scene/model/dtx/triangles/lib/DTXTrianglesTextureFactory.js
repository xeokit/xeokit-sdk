import {dataTextureRamStats} from "./dataTextureRamStats.js";

/**
 * @private
 */
export class DTXTrianglesTextureFactory {
    /*
     * @param {WebGL2RenderingContext} gl
     */
    constructor(gl) {
        this._gl = gl;
    }

    _createBindableDataTexture(entitiesCnt, entitySize, type, entitiesPerRow, populateTexArray, statsProp, exposeData) {
        if ((entitySize > 4) && ((entitySize % 4) > 0)) {
            throw "Unhandled data size " + entitySize;
        }
        const pixelsPerEntity = Math.ceil(entitySize / 4);
        const pixelWidth = entitySize / pixelsPerEntity;

        const gl = this._gl;
        const [ arrayType, internalFormat, format ] = (function() {
            switch(type) {
            case gl.UNSIGNED_BYTE:
                return [ Uint8Array,   ...((pixelWidth === 1) ? [ gl.R8UI,  gl.RED_INTEGER ] : ((pixelWidth === 2) ? [ gl.RG8UI,  gl.RG_INTEGER ] : ((pixelWidth === 3) ? [ gl.RGB8UI,  gl.RGB_INTEGER ] : [ gl.RGBA8UI,  gl.RGBA_INTEGER ]))) ];
            case gl.UNSIGNED_SHORT:
                return [ Uint16Array,  ...((pixelWidth === 1) ? [ gl.R16UI, gl.RED_INTEGER ] : ((pixelWidth === 2) ? [ gl.RG16UI, gl.RG_INTEGER ] : ((pixelWidth === 3) ? [ gl.RGB16UI, gl.RGB_INTEGER ] : [ gl.RGBA16UI, gl.RGBA_INTEGER ]))) ];
            case gl.UNSIGNED_INT:
                return [ Uint32Array,  ...((pixelWidth === 1) ? [ gl.R32UI, gl.RED_INTEGER ] : ((pixelWidth === 2) ? [ gl.RG32UI, gl.RG_INTEGER ] : ((pixelWidth === 3) ? [ gl.RGB32UI, gl.RGB_INTEGER ] : [ gl.RGBA32UI, gl.RGBA_INTEGER ]))) ];
            case gl.FLOAT:
                return [ Float32Array, ...((pixelWidth === 1) ? [ gl.R32F,  gl.RED ]         : ((pixelWidth === 2) ? [ gl.RG32F,  gl.RG ]         : ((pixelWidth === 3) ? [ gl.RGB32F,  gl.RGB ]         : [ gl.RGBA32F,  gl.RGBA ]))) ];
            default:
                throw "Unhandled data type " + type;
            }
        })();

        const textureWidth = entitiesPerRow * pixelsPerEntity;
        const textureHeight = Math.ceil(entitiesCnt / entitiesPerRow);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArray = new arrayType(textureWidth * textureHeight * pixelWidth);
        dataTextureRamStats[statsProp] += texArray.byteLength;
        dataTextureRamStats.numberOfTextures++;

        populateTexArray(texArray);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, format, type, texArray);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return {
            // called by Sampler::bindTexture
            bind(unit) {
                gl.activeTexture(gl["TEXTURE" + unit]);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                return true;
            },

            unbind(unit) {
                // This `unbind` method is ignored at the moment to allow avoiding
                // to rebind same texture already bound to a texture unit.

                // this._gl.activeTexture(this.state.gl["TEXTURE" + unit]);
                // this._gl.bindTexture(this.state.gl.TEXTURE_2D, null);
            },

            textureData: exposeData && {
                setData(data, subPortionId, offset = 0, load = false) {
                    texArray.set(data, subPortionId * entitySize + offset * pixelWidth);
                    if (load) {
                        gl.bindTexture(gl.TEXTURE_2D, texture);
                        const xoffset = (subPortionId % entitiesPerRow) * pixelsPerEntity + offset;
                        const yoffset = Math.floor(subPortionId / entitiesPerRow);
                        const width = data.length / pixelWidth;
                        gl.texSubImage2D(gl.TEXTURE_2D, 0, xoffset, yoffset, width, 1, format, type, data);
                        // gl.bindTexture (gl.TEXTURE_2D, null);
                    }
                },

                reloadData() {
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, format, type, texArray);
                }
            }
        };
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
     * @param {ArrayLike<ArrayLike<int>>} colors Array of colors for all objects in the layer
     * @param {ArrayLike<ArrayLike<int>>} pickColors Array of pickColors for all objects in the layer
     * @param {ArrayLike<int>} vertexBases Array of position-index-bases foteh all objects in the layer
     * @param {ArrayLike<int>} indexBaseOffsets For triangles: array of offests between the (gl_VertexID / 3) and the position where the indices start in the texture layer
     * @param {ArrayLike<int>} edgeIndexBaseOffsets For edges: Array of offests between the (gl_VertexID / 2) and the position where the edge indices start in the texture layer
     * @param {ArrayLike<boolean>} solid Array is-solid flag for all objects in the layer
     *
     * @returns {BindableDataTexture}
     */
    createTextureForColorsAndFlags(colors, pickColors, vertexBases, indexBaseOffsets, edgeIndexBaseOffsets, solid) {
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

        return this._createBindableDataTexture(numPortions, 32, this._gl.UNSIGNED_BYTE, 512, populateTexArray, "sizeDataColorsAndFlags", true);
    }

    _createDataTexture(dataArrays, entitiesCnt, entitySize, type, entitiesPerRow, statsProp, exposeData) {
        const populateTexArray = texArray => {
            for (let i = 0, j = 0, len = dataArrays.length; i < len; i++) {
                const pc = dataArrays[i];
                texArray.set(pc, j);
                j += pc.length;
            }
        };
        return this._createBindableDataTexture(entitiesCnt, entitySize, type, entitiesPerRow, populateTexArray, statsProp, exposeData);
    }


    _createTextureForMatrices(matrices, statsProp, exposeData) {
        const numMatrices = matrices.length;
        if (numMatrices === 0) {
            throw "num " + statsProp + " matrices===0";
        }
        // in one row we can fit 512 matrices
        return this._createDataTexture(matrices, numMatrices, 16, this._gl.FLOAT, 512, statsProp, exposeData);
    }

    /**
     * This will generate a texture for all positions decode matrices in the layer.
     *
     * The texture will have:
     * - 4 RGBA columns per row (each column will contain 4 packed half-float (16 bits) components).
     *   Thus, each row will contain 16 packed half-floats corresponding to a complete positions decode matrix)
     * - N rows where N is the number of objects
     *
     * @param {ArrayLike<Matrix4x4>} instanceMatrices Array of geometry instancing matrices for all objects in the layer. Null if the objects are not instanced.
     *
     * @returns {BindableDataTexture}
     */
    createTextureForInstancingMatrices(instanceMatrices) {
        return this._createTextureForMatrices(instanceMatrices, "sizeDataInstancesMatrices", true);
    }

    /**
     * This will generate a texture for all positions decode matrices in the layer.
     *
     * The texture will have:
     * - 4 RGBA columns per row (each column will contain 4 packed half-float (16 bits) components).
     *   Thus, each row will contain 16 packed half-floats corresponding to a complete positions decode matrix)
     * - N rows where N is the number of objects
     *
     * @param {ArrayLike<Matrix4x4>} positionDecodeMatrices Array of positions decode matrices for all objects in the layer
     *
     * @returns {BindableDataTexture}
     */
    createTextureForPositionsDecodeMatrices(positionDecodeMatrices) {
        return this._createTextureForMatrices(positionDecodeMatrices, "sizeDataPositionDecodeMatrices", false);
    }


    _createTextureForSingleItems(dataArrays, dataCnt, entitySize, type, statsProp) {
        return ((dataCnt === 0)
                ? { texture: null, textureHeight: 0 }
                : this._createDataTexture(dataArrays, dataCnt / entitySize, entitySize, type, 4096, statsProp, false));
    }


    createTextureForIndices(indicesArrays, lenIndices, type) {
        return this._createTextureForSingleItems(indicesArrays, lenIndices, 3, type, "sizeDataTextureIndices");
    }

    createTextureForEdgeIndices(indicesArrays, lenIndices, type) {
        return this._createTextureForSingleItems(indicesArrays, lenIndices, 2, type, "sizeDataTextureEdgeIndices");
    }

    /**
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
    createTextureForPositions(positionsArrays, lenPositions) {
        return this._createTextureForSingleItems(positionsArrays, lenPositions, 3, this._gl.UNSIGNED_SHORT, "sizeDataTexturePositions");
    }

    /**
     * @param {ArrayLike<int>} portionIdsArray
     *
     * @returns {BindableDataTexture}
     */
    createTextureForPackedPortionIds(portionIdsArray) {
        return this._createTextureForSingleItems([ portionIdsArray ], portionIdsArray.length, 1, this._gl.UNSIGNED_SHORT, "sizeDataTexturePortionIds");
    }
}