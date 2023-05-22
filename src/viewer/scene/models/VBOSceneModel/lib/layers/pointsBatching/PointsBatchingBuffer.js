/**
 * @private
 */
class PointsBatchingBuffer {

    constructor(maxGeometryBatchSize = 5000000) {

        if (maxGeometryBatchSize > 5000000) {
            maxGeometryBatchSize = 5000000;
        }

        this.maxVerts = maxGeometryBatchSize;
        this.maxIndices = maxGeometryBatchSize * 3; // Rough rule-of-thumb
        this.positions = [];
        this.colors = [];
        this.intensities = [];
        this.pickColors = [];
        this.offsets = [];
    }
}

export {PointsBatchingBuffer};