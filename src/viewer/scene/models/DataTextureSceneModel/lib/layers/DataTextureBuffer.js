export class DataTextureBuffer {
    constructor() {
        this.positions = [];
        this.indices8Bits = [];
        this.indices16Bits = [];
        this.indices32Bits = [];
        this.edgeIndices8Bits = [];
        this.edgeIndices16Bits = [];
        this.edgeIndices32Bits = [];
        this.edgeIndices = [];
        this._objectDataColors = [];
        this._objectDataPickColors = [];
        this._vertexBasesForObject = [];
        this._indexBaseOffsetsForObject = [];
        this._edgeIndexBaseOffsetsForObject = [];
        this._objectDataPositionsMatrices = [];
        this._objectDataInstanceGeometryMatrices = [];
        this._objectDataInstanceNormalsMatrices = [];
        this._portionIdForIndices8Bits = [];
        this._portionIdForIndices16Bits = [];
        this._portionIdForIndices32Bits = [];
        this._portionIdForEdges8Bits = [];
        this._portionIdForEdges16Bits = [];
        this._portionIdForEdges32Bits = [];
        this._portionIdFanOut = [];
    }
}