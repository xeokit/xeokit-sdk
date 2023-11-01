import {StreamVariableItemBuffer} from "./StreamVariableItemBuffer";
import {BindableDataTexture} from "./BindableDataTexture";

const LEN_POSITIONS = 100000;

/**
 * @private
 */
export class PositionsStreamBuffer extends StreamVariableItemBuffer {

    constructor(gl) {
        super(LEN_POSITIONS);
        this.gl = gl;
        const textureWidth = 4096;
        const textureHeight = Math.ceil(LEN_POSITIONS / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight * 3;
        this.texArray = new Uint16Array(texArraySize);
        const texArray = this.texArray;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB16UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB_INTEGER, gl.UNSIGNED_SHORT, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.texture = new BindableDataTexture(gl, texture, textureWidth, textureHeight, texArray);
    }

    canCreateBlock() {
        // TODO
    }

    createBlock(positions) {
        const block = this._createBlock(positions.size);
        if (!block) {
            throw "No room left for blocks";
        }
        const base = block.base;
        const texArray = this.texArray;
        texArray.set(positions, base);
        return block;
    }

    deleteBlock(blockId) {
        this._deleteBlock(blockId);
    }
}