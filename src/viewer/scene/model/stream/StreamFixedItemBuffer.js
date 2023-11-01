import {StreamBlock} from "./StreamBlock";

/**
 * @abstract
 */
export class StreamFixedItemBuffer {

    constructor(size) {
        this.size = size;
        this.blocks = {};
        this.numBlocks = 0;
        this.lastBlockIndex = 0;
    }

    _createBlock() {
        let block = null;
        while (true) {
            if (!this.blocks[this.lastBlockIndex]) {
                const blockId = this.lastBlockIndex;
                const base = this.lastBlockIndex;
                const size = 1;
                block = new StreamBlock(this, blockId, base, size);
                this.blocks[blockId] = block;
                break;
            } else {
                this.lastBlockIndex++;
                if (this.lastBlockIndex > this.size) {
                    this.lastBlockIndex = 0;
                }
            }
        }
        return block;
    }

    _deleteBlock(blockId) {
        const block = this.blocks[blockId];
        if (!block) {
            return;
        }
        delete this.blocks[blockId];
        this.lastBlockIndex = blockId;
    }
}


