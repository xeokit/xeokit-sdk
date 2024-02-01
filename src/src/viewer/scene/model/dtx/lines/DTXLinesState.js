/**
 * @private
 */
export class DTXLinesState {

    constructor() {
        this.texturePerObjectColorsAndFlags = null;
        this.texturePerObjectOffsets = null;
        this.texturePerObjectInstanceMatrices = null;
        this.texturePerObjectPositionsDecodeMatrix = null;
        this.texturePerVertexIdCoordinates = null;
        this.texturePerLineIdPortionIds8Bits = null;
        this.texturePerLineIdPortionIds16Bits = null;
        this.texturePerLineIdPortionIds32Bits = null;
        this.texturePerLineIdIndices8Bits = null;
        this.texturePerLineIdIndices16Bits = null;
        this.texturePerLineIdIndices32Bits = null;
        this.textureModelMatrices = null;
    }

    finalize() {
        this.indicesPerBitnessTextures = {
            8: this.texturePerLineIdIndices8Bits,
            16: this.texturePerLineIdIndices16Bits,
            32: this.texturePerLineIdIndices32Bits,
        };
        this.indicesPortionIdsPerBitnessTextures = {
            8: this.texturePerLineIdPortionIds8Bits,
            16: this.texturePerLineIdPortionIds16Bits,
            32: this.texturePerLineIdPortionIds32Bits,
        };
    }

    bindCommonTextures(glProgram, objectDecodeMatricesShaderName, vertexTextureShaderName, objectAttributesTextureShaderName, objectMatricesShaderName) {
        this.texturePerObjectPositionsDecodeMatrix.bindTexture(glProgram, objectDecodeMatricesShaderName, 1);
        this.texturePerVertexIdCoordinates.bindTexture(glProgram, vertexTextureShaderName, 2);
        this.texturePerObjectColorsAndFlags.bindTexture(glProgram, objectAttributesTextureShaderName, 3);
        this.texturePerObjectInstanceMatrices.bindTexture(glProgram, objectMatricesShaderName, 4);
    }

    bindLineIndicesTextures(glProgram, portionIdsShaderName, lineIndicesShaderName, textureBitness) {
        this.indicesPortionIdsPerBitnessTextures[textureBitness].bindTexture(glProgram, portionIdsShaderName, 5);
        this.indicesPerBitnessTextures[textureBitness].bindTexture(glProgram, lineIndicesShaderName, 6);
    }
}

