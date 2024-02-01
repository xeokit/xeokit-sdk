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
        this.texturePerObjectOffsets = null;

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

    finalize() {
        this.indicesPerBitnessTextures = {
            8: this.texturePerPolygonIdIndices8Bits,
            16: this.texturePerPolygonIdIndices16Bits,
            32: this.texturePerPolygonIdIndices32Bits,
        };

        this.indicesPortionIdsPerBitnessTextures = {
            8: this.texturePerPolygonIdPortionIds8Bits,
            16: this.texturePerPolygonIdPortionIds16Bits,
            32: this.texturePerPolygonIdPortionIds32Bits,
        };

        this.edgeIndicesPerBitnessTextures = {
            8: this.texturePerPolygonIdEdgeIndices8Bits,
            16: this.texturePerPolygonIdEdgeIndices16Bits,
            32: this.texturePerPolygonIdEdgeIndices32Bits,
        };

        this.edgeIndicesPortionIdsPerBitnessTextures = {
            8: this.texturePerEdgeIdPortionIds8Bits,
            16: this.texturePerEdgeIdPortionIds16Bits,
            32: this.texturePerEdgeIdPortionIds32Bits,
        };
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
        this.texturePerObjectPositionsDecodeMatrix.bindTexture(glProgram, objectDecodeMatricesShaderName, 1);
        this.texturePerVertexIdCoordinates.bindTexture(glProgram, vertexTextureShaderName, 2);
        this.texturePerObjectColorsAndFlags.bindTexture(glProgram, objectAttributesTextureShaderName, 3);
        this.texturePerObjectInstanceMatrices.bindTexture(glProgram, objectMatricesShaderName, 4);
    }

    /**
     *
     * @param {Program} glProgram
     * @param {string} portionIdsShaderName
     * @param {string} polygonIndicesShaderName
     * @param {8|16|32} textureBitness
     */
    bindTriangleIndicesTextures(
        glProgram,
        portionIdsShaderName,
        polygonIndicesShaderName,
        textureBitness,
    ) {
        this.indicesPortionIdsPerBitnessTextures[textureBitness].bindTexture(
            glProgram,
            portionIdsShaderName,
            5 // webgl texture unit
        );

        this.indicesPerBitnessTextures[textureBitness].bindTexture(
            glProgram,
            polygonIndicesShaderName,
            6 // webgl texture unit
        );
    }

    /**
     *
     * @param {Program} glProgram
     * @param {string} edgePortionIdsShaderName
     * @param {string} edgeIndicesShaderName
     * @param {8|16|32} textureBitness
     */
    bindEdgeIndicesTextures(
        glProgram,
        edgePortionIdsShaderName,
        edgeIndicesShaderName,
        textureBitness,
    ) {
        this.edgeIndicesPortionIdsPerBitnessTextures[textureBitness].bindTexture(
            glProgram,
            edgePortionIdsShaderName,
            5 // webgl texture unit
        );

        this.edgeIndicesPerBitnessTextures[textureBitness].bindTexture(
            glProgram,
            edgeIndicesShaderName,
            6 // webgl texture unit
        );
    }
}

