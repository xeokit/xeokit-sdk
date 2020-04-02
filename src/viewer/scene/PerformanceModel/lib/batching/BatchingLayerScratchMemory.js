/**
 * Provides scratch memory for methods like BatchingLayer setFlags() and setColors(),
 * so they don't need to allocate temporary arrays that need garbage collection.
 *
 * @private
 */
class BatchingLayerScratchMemory {

    constructor() {
        this._uint8Arrays = {};
    }

    _clear() {
        this._uint8Arrays = {};
    }

    getUInt8Array(len) {
        let uint8Array = this._uint8Arrays[len];
        if (!uint8Array) {
            uint8Array = new Uint8Array(len);
            this._uint8Arrays[len] = uint8Array;
        }
        return uint8Array;
    }
}

const batchingLayerScratchMemory = new BatchingLayerScratchMemory();

/**
 * @private
 */
function getBatchingLayerScratchMemory(performanceModel) {
    performanceModel.once("destroyed", () => {
        batchingLayerScratchMemory.clear();
    });
    return batchingLayerScratchMemory;
}


export {getBatchingLayerScratchMemory};