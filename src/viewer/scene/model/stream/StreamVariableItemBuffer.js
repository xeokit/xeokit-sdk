import {StreamBlock} from "./StreamBlock";

const MAX_BLOCKS = 1000000;

/**
 * @abstract
 */
export class StreamVariableItemBuffer {

    constructor(size) {
        this.size = size;
        this.bitmap = new Int8Array(size);
        this.blocks = {};
        this.numBlocks = 0;
        this.lastBlockIndex = 0;
    }

    _createBlock(size) {
        let base = this._allocate(size);
        if (base === -1) {
            this._pack();
            base = this._allocate(size);
            if (base === -1) { // No space after pack
                return null;
            }
        }
        let block = null;
        while (true) { // Create block
            if (!this.blocks[this.lastBlockIndex]) {
                const blockId = this.lastBlockIndex;
                block = new StreamBlock(this, blockId, base, size);
                this.blocks[blockId] = block;
                break;
            } else {
                this.lastBlockIndex++;
                if (this.lastBlockIndex > MAX_BLOCKS) {
                    this.lastBlockIndex = 0;
                }
            }
        }
        return block;
    }

    _allocate(size) {
        let start = -1;
        let count = 0;
        for (let i = 0; i < this.size; i++) {
            if (this.bitmap[i] === 0) {
                if (count === 0) { // Found a free block
                    start = i;
                }
                count++;
                if (count === size) {
                    for (let j = start; j < start + size; j++) {
                        this.bitmap[j] = 1;// Allocate the block by updating the bitmap
                    }
                    return start;
                }
            } else {
                count = 0; // Reset count if the block is not free
            }
        }
        return -1;   // No suitable free block found
    }

    _pack() {
        let lastEnd = -1;
        let subtract = 0;
        for (let blockId in this.blocks) {
            const block = this.blocks[blockId];
            if (lastEnd !== -1) {
                if (block.base > lastEnd) { // Gap found
                    // Gap
                    if (block.onPacked) { // Notify Block repacked to fill gap
                        block.onPacked(block);
                    }
                }
            }
        }
    }

    //
    // _createBlock(base, offset) {
    //     while (true) {
    //         if (!this.blocks[this.lastBlockIndex]) {
    //             const blockId = this.lastBlockIndex;
    //             const block = new StreamBlock(this, blockId, base, offset);
    //             this.blocks[blockId] = block;
    //             return block;
    //         } else {
    //             this.lastBlockIndex++;
    //             if (this.lastBlockIndex > MAX_BLOCKS) {
    //                 this.lastBlockIndex = 0;
    //             }
    //         }
    //     }
    // }

    _deleteBlock(blockId) {
        const block = this.blocks[blockId];
        if (!block) {
            return;
        }
        this._deallocate(block.base, block.size);
        delete this.blocks[blockId];
        this.lastBlockIndex = blockId;
    }

    _deallocate(start, size) {
        for (let i = start, len = start + size; i < len; i++) {
            this.bitmap[i] = 0;
        }
    }
}


