/**
 * @private
 */
export class DTXLinesBuffer {

    constructor() {
        this.positionsCompressed = [];
        this.lenPositionsCompressed = 0;
        this.indices8Bits = [];
        this.lenIndices8Bits = 0;
        this.indices16Bits = [];
        this.lenIndices16Bits = 0;
        this.indices32Bits = [];
        this.lenIndices32Bits = 0;
        this.perObjectColors = [];
        this.perObjectPickColors = [];
        this.perObjectSolid = [];
        this.perObjectOffsets = [];
        this.perObjectPositionsDecodeMatrices = [];
        this.perObjectInstancePositioningMatrices = [];
        this.perObjectVertexBases = [];
        this.perObjectIndexBaseOffsets = [];
        this.perLineNumberPortionId8Bits = [];
        this.perLineNumberPortionId16Bits = [];
        this.perLineNumberPortionId32Bits = [];
    }
}
