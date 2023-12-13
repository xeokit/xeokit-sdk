import {Configs} from "../../../../Configs";

const configs = new Configs();

/**
 * @private
 */
class TrianglesBatchingBuffer {

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

export {TrianglesBatchingBuffer};