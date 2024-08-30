import {Configs} from "../../../../../Configs.js";

const configs = new Configs();

/**
 * @private
 */
export class VBOBatchingTrianglesBuffer {

    constructor(maxBatchSize = configs.maxGeometryBatchSize) {
        this.maxVerts = maxBatchSize;
        this.maxIndices = maxBatchSize * 3; // Rough rule-of-thumb
        this.positions = [];
        this.colors = [];
        this.uv = [];
        this.metallicRoughness = [];
        this.normals = [];
        this.pickColors = [];
        this.offsets = [];
        this.indices = [];
        this.edgeIndices = [];
    }
}

