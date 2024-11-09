// Imports used to complete the JSDocs arguments to methods
import {Program} from "../../../../webgl/Program.js"

/**
 * @private
 */
export class DTXTrianglesState {
    constructor() {
        /**
         * Texture that holds colors/pickColors/flags/flags2 per-object:
         * - columns: one concept per column => color / pick-color / ...
         * - row: the object Id
         *
         * @type BindableDataTexture
         */
        this.texturePerObjectColorsAndFlags = null;

        /**
         * Texture that holds the XYZ offsets per-object:
         * - columns: just 1 column with the XYZ-offset
         * - row: the object Id
         *
         * @type BindableDataTexture
         */
        this.texturePerObjectOffsets = null; // NEVER ASSIGNED TO

        this.texturePerObjectInstanceMatrices = null;

        /**
         * Texture that holds the objectDecodeAndInstanceMatrix per-object:
         * - columns: each column is one column of the matrix
         * - row: the object Id
         *
         * @type BindableDataTexture
         */
        this.texturePerObjectPositionsDecodeMatrix = null;

        /**
         * Texture that holds all the `different-vertices` used by the layer.
         *
         * @type BindableDataTexture
         */
        this.texturePerVertexIdCoordinates = null;

        /**
         * Texture that holds the PortionId that corresponds to a given polygon-id.
         *
         * Variant of the texture for 8-bit based polygon-ids.
         *
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdPortionIds8Bits = null;

        /**
         * Texture that holds the PortionId that corresponds to a given polygon-id.
         *
         * Variant of the texture for 16-bit based polygon-ids.
         *
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdPortionIds16Bits = null;

        /**
         * Texture that holds the PortionId that corresponds to a given polygon-id.
         *
         * Variant of the texture for 32-bit based polygon-ids.
         *
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdPortionIds32Bits = null;

        /**
         * Texture that holds the PortionId that corresponds to a given edge-id.
         *
         * Variant of the texture for 8-bit based polygon-ids.
         *
         * @type BindableDataTexture
         */
        this.texturePerEdgeIdPortionIds8Bits = null;

        /**
         * Texture that holds the PortionId that corresponds to a given edge-id.
         *
         * Variant of the texture for 16-bit based polygon-ids.
         *
         * @type BindableDataTexture
         */
        this.texturePerEdgeIdPortionIds16Bits = null;

        /**
         * Texture that holds the PortionId that corresponds to a given edge-id.
         *
         * Variant of the texture for 32-bit based polygon-ids.
         *
         * @type BindableDataTexture
         */
        this.texturePerEdgeIdPortionIds32Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 8-bit based indices.
         *
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdIndices8Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 16-bit based indices.
         *
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdIndices16Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 32-bit based indices.
         *
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdIndices32Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 8-bit based edge indices.
         *
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdEdgeIndices8Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 16-bit based edge indices.
         *
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdEdgeIndices16Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 32-bit based edge indices.
         *
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdEdgeIndices32Bits = null;

        /**
         * Texture that holds the model matrices
         * - columns: each column in the texture is a model matrix column.
         * - row: each row is a different model matrix.
         *
         * @type BindableDataTexture
         */
        this.textureModelMatrices = null;
    }

    /**
     *
     * @param {Program} glProgram
     * @param {string} objectDecodeMatricesShaderName
     * @param {string} vertexTextureShaderName
     * @param {string} objectAttributesTextureShaderName
     * @param {string} objectMatricesShaderName
     */
    bindCommonTextures(
        glProgram,
        objectDecodeMatricesShaderName,
        vertexTextureShaderName,
        objectAttributesTextureShaderName,
        objectMatricesShaderName
    ) {
        glProgram.bindTexture(objectDecodeMatricesShaderName, this.texturePerObjectPositionsDecodeMatrix, 1);
        glProgram.bindTexture(vertexTextureShaderName, this.texturePerVertexIdCoordinates, 2);
        glProgram.bindTexture(objectAttributesTextureShaderName, this.texturePerObjectColorsAndFlags, 3);
        glProgram.bindTexture(objectMatricesShaderName, this.texturePerObjectInstanceMatrices, 4);
    }
}

