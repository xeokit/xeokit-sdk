/**
 * Provides scratch memory for methods like BatchingLayer setFlags() and setColors(),
 * so they don't need to allocate temporary arrays that need garbage collection.
 *
 * @private
 */
class BatchingLayerScratchMemory {

    constructor() {
        this._uint8Arrays = {};
        this._float32Arrays = {};
    }

    _clear() {
        this._uint8Arrays = {};
        this._float32Arrays = {};
    }

    getUInt8Array(len) {
        let uint8Array = this._uint8Arrays[len];
        if (!uint8Array) {
            uint8Array = new Uint8Array(len);
            this._uint8Arrays[len] = uint8Array;
        }
        return uint8Array;
    }

    getFloat32Array(len) {
        let float32Array = this._float32Arrays[len];
        if (!float32Array) {
            float32Array = new Float32Array(len);
            this._float32Arrays[len] = float32Array;
        }
        return float32Array;
    }
}

const batchingLayerScratchMemory = new BatchingLayerScratchMemory();

/**
 * @private
 */
function getBatchingLayerScratchMemory(performanceModel) {
    performanceModel.once("destroyed", () => {
        batchingLayerScratchMemory._clear();
    });
    return batchingLayerScratchMemory;
}


export {getBatchingLayerScratchMemory};