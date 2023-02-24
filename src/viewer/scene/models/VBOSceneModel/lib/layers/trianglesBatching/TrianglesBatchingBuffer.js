/**
 * @private
 */
class TrianglesBatchingBuffer {

    constructor(maxGeometryBatchSize = 5000000) {

        if (maxGeometryBatchSize > 5000000) {
            maxGeometryBatchSize = 5000000;
        }

        this.maxVerts = maxGeometryBatchSize;
        this.maxIndices = maxGeometryBatchSize * 3; // Rough rule-of-thumb
        this.positions = [];
        this.colors = [];
        this.uv = [];
        this.metallicRoughness = [];
        this.normals = [];
        this.pickColors = [];
        this.flags = [];
        this.flags2 = [];
        this.offsets = [];
        this.indices = [];
        this.edgeIndices = [];
    }
}

export {TrianglesBatchingBuffer};