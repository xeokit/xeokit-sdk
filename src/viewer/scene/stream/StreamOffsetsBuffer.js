import {StreamFixedItemBuffer} from "./StreamFixedItemBuffer";
import {StreamDataTexture} from "./StreamDataTexture";

const NUM_PORTIONS = 100000;

/**
 * @private
 */
export class StreamOffsetsBuffer extends StreamFixedItemBuffer {

    constructor(gl) {
        super(NUM_PORTIONS);
        this.gl = gl;
        const textureWidth = 4096;
        const textureHeight = Math.ceil(NUM_PORTIONS / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 3;
        this.texArray = new Float32Array(texArraySize);
        const texArray = this.texArray;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32F, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB, gl.FLOAT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.texture = new StreamDataTexture(gl, texture, textureWidth, textureHeight, texArray);
    }

    canCreateBlock() {
        // TODO
    }

    createBlock(offset) {
        const block = this._createBlock();
        if (!block) {
            throw "No room left for blocks";
        }
        const base = block.base;
        const texArray = this.texArray;
        texArray.set(offset, base);
        return block;
    }

    setOffset(blockId, offset) {
        const block = this.blocks[blockId];
        if (!block) {
            throw "Block not found";
        }
        this.texArray.set(offset, block.base);
    }

    deleteBlock(blockId) {
        this._deleteBlock(blockId);
    }
}