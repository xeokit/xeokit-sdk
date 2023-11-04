import {StreamFixedItemBuffer} from "./StreamFixedItemBuffer";
import {StreamDataTexture} from "./StreamDataTexture";

const MAX_OBJECTS = 100000;

/**
 * Stream buffer containing per-object elements.
 *
 * @private
 */
export class StreamMeshesBuffer extends StreamFixedItemBuffer {

    constructor(gl) {
        super(MAX_OBJECTS); // Never repack
        this.gl = gl;
        this.numObjects = 0;
        const maxObjects = MAX_OBJECTS;
        const textureWidth = 512 * 8;
        const textureHeight = Math.ceil(maxObjects / (textureWidth / 8));
        if (textureHeight === 0) {
            throw "texture height===0";
        }
        // 8 columns per texture row:
        // - col0: (RGBA) object color RGBA
        // - col1: (packed Uint32 as RGBA) object pick color
        // - col2: (packed 4 bytes as RGBA) object flags
        // - col3: (packed 4 bytes as RGBA) object flags2
        // - col4: (packed Uint32 bytes as RGBA) vertex base
        // - col5: (packed Uint32 bytes as RGBA) index base offset
        // - col6: (packed Uint32 bytes as RGBA) edge index base offset
        // - col7: (packed 4 bytes as RGBA) is-solid flag for objects
        this.texArray = new Uint8Array(4 * textureWidth * textureHeight);
        const texArray = this.texArray;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8UI, textureWidth, textureHeight);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, textureWidth, textureHeight, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, texArray, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.texture = new StreamDataTexture(gl, texture, textureWidth, textureHeight, texArray);
    }

    canCreateBlock() {
        this.numObjects < MAX_OBJECTS;
    }

    /**
     * Creates a block in this stream buffer.
     *
     * For positions, indices and edge indices, we pass in blocks to their respective stream blocks. Whenever those
     * streams are repacked, this stream buffer will catch an event off those and adjust this block accordingly.
     *
     * @param color RGBA color as 8-bit ints
     * @param pickColor RGBA pick color as 8-bit ints
     * @param flags
     * @param flags2
     * @param positionsBlock Handle to block in StreamPositionsBuffer
     * @param indicesBlock Handle to block in StreamIndices32Buffer
     * @param edgeIndicesBlock Handle to block in Edges32StreamBuffer
     * @param solid Indicates if object is a closed mesh
     * @returns {StreamBlock} Handle to the new block.
     */
    createBlock(color, pickColor, flags, flags2, positionsBlock, indicesBlock, edgeIndicesBlock, solid) {
       if (!this.canCreateBlock) {
           throw "Out of space for new object block";
       }
        const block = this._createBlock();
        if (!block) {
            throw "No room left for blocks";
        }
        const base = block.base;
        const texArray = this.texArray;
        texArray.set(color, base);
        texArray.set(pickColor, base + 4);     // object pick color
        texArray.set([0, 0, 0, 0], base + 8);  // object flags
        texArray.set([0, 0, 0, 0], base + 12); // object flags2
        // Update bases whenever their respective stream buffers are repacked
        positionsBlock.onPack = () => {
            const positionsBase = positionsBlock.base;
            texArray.set([// vertex base
                (positionsBase >> 24) & 255,
                (positionsBase >> 16) & 255,
                (positionsBase >> 8) & 255,
                (positionsBase) & 255,
            ], base + 16);
        }
        indicesBlock.onPack = () => {
            const indicesBase = indicesBlock.base;
            texArray.set([// triangles index base offset
                (indicesBase >> 24) & 255,
                (indicesBase >> 16) & 255,
                (indicesBase >> 8) & 255,
                (indicesBase) & 255,
            ], base + 20);
        }
        edgeIndicesBlock.onPack = () => {
            const edgeIndicesBase = edgeIndicesBlock.base;
            texArray.set([// edge index base offset
                (edgeIndicesBase >> 24) & 255,
                (edgeIndicesBase >> 16) & 255,
                (edgeIndicesBase >> 8) & 255,
                (edgeIndicesBase) & 255,
            ], base + 24);
        }
        positionsBlock.onPack();
        indicesBlock.onPack();
        edgeIndicesBlock.onPack();
        texArray.set([solid ? 1 : 0, 0, 0, 0], base + 28);// is-solid flag
        return block;
    }

    setColor(blockId, color) {
        const block = this.blocks[blockId];
        if (!block) {
            throw "Block not found";
        }
        this.texArray.set(color, block.base);
    }

    setFlags(blockId, flags) {
        const block = this.blocks[blockId];
        if (!block) {
            throw "Block not found";
        }
        this.texArray.set(flags, block.base + 8);
    }

    setFlags2(blockId, flags2) {
        const block = this.blocks[blockId];
        if (!block) {
            throw "Block not found";
        }
        this.texArray.set(flags2, block.base + 12);
    }

    deleteBlock(blockId) {
        this._deleteBlock(blockId);
    }
}