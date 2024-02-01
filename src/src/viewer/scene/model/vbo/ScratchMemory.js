/**
 * Provides scratch memory for methods like TrianglesBatchingLayer setFlags() and setColors(),
 * so they don't need to allocate temporary arrays that need garbage collection.
 *
 * @private
 */
class ScratchMemory {

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

const batchingLayerScratchMemory = new ScratchMemory();

let countUsers = 0;

/**
 * @private
 */
function getScratchMemory() {
    countUsers++;
    return batchingLayerScratchMemory;
}

/**
 * @private
 */
function putScratchMemory() {
    if (countUsers === 0) {
        return;
    }
    countUsers--;
    if (countUsers === 0) {
        batchingLayerScratchMemory._clear();
    }
}

export {getScratchMemory, putScratchMemory};