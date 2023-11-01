import {StreamVariableItemBuffer} from "./StreamVariableItemBuffer";
import {BindableDataTexture} from "./BindableDataTexture";

const LEN_INDICES = 100000;

/**
 * @private
 */
export class Indices32StreamBuffer extends StreamVariableItemBuffer {

    constructor(gl) {
        super(LEN_INDICES);
        this.gl = gl;
        const textureWidth = 4096;
        const textureHeight = Math.ceil(LEN_INDICES / textureWidth);
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        const texArraySize = textureWidth * textureHeight;
        this.texArray = new Uint32Array(texArraySize);
        const texArray = this.texArray;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGB_INTEGER, gl.UNSIGNED_BYTE, texArray, 0);
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

    createBlock(indices) {
        const block = this._createBlock(indices.size);
        if (!block) {
            throw "No room left for blocks";
        }
        const base = block.base;
        const texArray = this.texArray;
        texArray.set(indices, base);
        return block;
    }

    deleteBlock(blockId) {
        this._deleteBlock(blockId);
    }
}