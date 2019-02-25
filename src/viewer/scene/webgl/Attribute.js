/**
 * @desc Represents a WebGL vertex attribute buffer (VBO).
 * @private
 * @param gl {WebGLRenderingContext} The WebGL rendering context.
 */
class Attribute {

    constructor(gl, location) {
        this._gl = gl;
        this.location = location;
    }

    bindArrayBuffer(arrayBuf, type, normalized = false, stride = 0, offset = 0) {
        if (!arrayBuf) {
            return;
        }
        arrayBuf.bind();
        this._gl.enableVertexAttribArray(this.location);
        this._gl.vertexAttribPointer(this.location, arrayBuf.itemSize, arrayBuf.itemType, arrayBuf.normalized, arrayBuf.stride, arrayBuf.offset);
    }
}

export {Attribute};
