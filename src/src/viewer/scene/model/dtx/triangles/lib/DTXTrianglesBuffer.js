/**
 * @private
 */
export class DTXTrianglesBuffer {

    constructor() {
        this.positionsCompressed = [];
        this.lenPositionsCompressed = 0;

        this.metallicRoughness = [];

        this.indices8Bits = [];
        this.lenIndices8Bits = 0;

        this.indices16Bits = [];
        this.lenIndices16Bits = 0;

        this.indices32Bits = [];
        this.lenIndices32Bits = 0;

        this.edgeIndices8Bits = [];
        this.lenEdgeIndices8Bits = 0;

        this.edgeIndices16Bits = [];
        this.lenEdgeIndices16Bits = 0;

        this.edgeIndices32Bits = [];
        this.lenEdgeIndices32Bits = 0;

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
