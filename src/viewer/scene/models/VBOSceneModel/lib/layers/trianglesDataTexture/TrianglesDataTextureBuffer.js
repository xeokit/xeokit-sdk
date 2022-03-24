import {WEBGL_INFO} from "../../../../webglInfo.js";

const bigIndicesSupported = WEBGL_INFO.SUPPORTED_EXTENSIONS["OES_element_index_uint"];

/**
 * @private
 */
class TrianglesDataTextureBuffer {

    constructor() {

        this.positions = [];
        this.metallicRoughness = [];

        this.offsets = [];
        this.indices8Bits = [];
        this.indices16Bits = [];
        this.indices32Bits = [];
        this.edgeIndices8Bits = [];
        this.edgeIndices16Bits = [];
        this.edgeIndices32Bits = [];

        this.perObjectColors = [];
        this.perObjectPickColors = [];

        this.perObjectPositionsDecodeMatrices = []; // chipmunk
        this.perObjectInstancePositioningMatrices = [];
        this.perObjectInstanceNormalsMatrices = [];

        this.perObjectVertexBases = [];
        this.perObjectIndexBaseOffsets = [];
        this.perObjectEdgeIndexBaseOffsets = [];

        this.perTriangleNumberPortionId8Bits = []; // chipmunk
        this.perTriangleNumberPortionId16Bits = []; // chipmunk
        this.perTriangleNumberPortionId32Bits = []; // chipmunk
        this.perEdgeNumberPortionId8Bits = []; // chipmunk
        this.perEdgeNumberPortionId16Bits = []; // chipmunk
        this.perEdgeNumberPortionId32Bits = []; // chipmunk
    }
}

export {TrianglesDataTextureBuffer};