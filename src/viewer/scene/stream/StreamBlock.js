export class StreamBlock {

    constructor(streamVariableItemBuffer, blockId, base, size) {
        this.streamVariableItemBuffer = streamVariableItemBuffer;
        this.blockId = blockId;
        this.base = base;
        this.size = size;
        this.onPacked = null;
    }

    pack() {
        if (this.onPacked) {
            this.onPacked(this);
        }
    }
}
