import {Configs} from "../../../../../Configs.js";

const configs = new Configs();

/**
 * @private
 */
export class VBOBatchingTrianglesBuffer {

    constructor() {
        this.maxVerts = configs.maxGeometryBatchSize;
        this.maxIndices = configs.maxGeometryBatchSize * 3; // Rough rule-of-thumb
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

