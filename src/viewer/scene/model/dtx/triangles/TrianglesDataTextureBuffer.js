/**
 * @private
 */
export class TrianglesDataTextureBuffer {

    constructor() {
        this.positionsCompressed = [];
        this.metallicRoughness = [];
        this.indices8Bits = [];
        this.indices16Bits = [];
        this.indices32Bits = [];
        this.edgeIndices8Bits = [];
        this.edgeIndices16Bits = [];
        this.edgeIndices32Bits = [];
        this.perObjectColors = [];
        this.perObjectPickColors = [];
        this.perObjectSolid = [];
        this.perObjectOffsets = [];
        this.perObjectPositionsDecodeMatrices = [];
        this.perObjectInstancePositioningMatrices = [];
        this.perObjectVertexBases = [];
        this.perObjectIndexBaseOffsets = [];
        this.perObjectEdgeIndexBaseOffsets = [];
        this.perTriangleNumberPortionId8Bits = [];
        this.perTriangleNumberPortionId16Bits = [];
        this.perTriangleNumberPortionId32Bits = [];
        this.perEdgeNumberPortionId8Bits = [];
        this.perEdgeNumberPortionId16Bits = [];
        this.perEdgeNumberPortionId32Bits = [];
    }
}
