import {StreamFixedItemBuffer} from "./StreamFixedItemBuffer";
import {StreamDataTexture} from "./StreamDataTexture";

const NUM_PORTIONS = 100000;

/**
 * @private
 */
export class StreamMatricesBuffer extends StreamFixedItemBuffer {

    constructor(gl) {
        super(NUM_PORTIONS);
        this.gl = gl;
        const textureWidth = 512 * 4;
        const textureHeight = Math.ceil(NUM_PORTIONS / (textureWidth / 4));
        this.texArray = new Float32Array(4 * textureWidth * textureHeight);
        const texArray = this.texArray;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGBA, gl.FLOAT, texArray, 0);
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

    createBlock(matrix, decompressMatrix) {
        const block = this._createBlock();
        if (!block) {
            throw "No room left for blocks";
        }
        const base = block.base;
        const texArray = this.texArray;
        texArray.set(matrix, base);
        texArray.set(decompressMatrix, base + 16);
        return block;
    }

    setMatrix(blockId, matrix) {
        const block = this.blocks[blockId];
        if (!block) {
            throw "Block not found";
        }
        this.texArray.set(matrix, block.base);
    }

    setDecompressMatrix(blockId, matrix) {
        const block = this.blocks[blockId];
        if (!block) {
            throw "Block not found";
        }
        this.texArray.set(matrix, block.base + 16);
    }

    deleteBlock(blockId) {
        this._deleteBlock(blockId);
    }
}