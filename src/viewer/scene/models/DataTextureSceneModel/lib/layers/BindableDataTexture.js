export class BindableDataTexture {
    /**
     *
     * @param {WebGL2RenderingContext} gl
     * @param {WebGLTexture} texture
     * @param {int} textureWidth
     * @param {int} textureHeight
     * @param {TypedArray} textureData
     */
    constructor(gl, texture, textureWidth, textureHeight, textureData = null) {

        /**
         * The WebGL context.
         *
         * @type WebGL2RenderingContext
         * @private
         */
        this._gl = gl;

        /**
         * The WebGLTexture handle.
         *
         * @type {WebGLTexture}
         * @private
         */
        this._texture = texture;

        /**
         * The texture width.
         *
         * @type {number}
         * @private
         */
        this._textureWidth = textureWidth;

        /**
         * The texture height.
         *
         * @type {number}
         * @private
         */
        this._textureHeight = textureHeight;

        /**
         * (nullable) When the texture data array is kept in the JS side, it will be stored here.
         *
         * @type {TypedArray}
         * @private
         */
        this._textureData = textureData;
    }

    /**
     * Convenience method to be used by the renderers to bind the texture before draw calls.
     *
     * @param {Program} glProgram
     * @param {string} shaderName The name of the shader attribute
     * @param {number} glTextureUnit The WebGL texture unit
     *
     * @returns {bool}
     */
    bindTexture(glProgram, shaderName, glTextureUnit) {
        return glProgram.bindTexture(shaderName, this, glTextureUnit);
    }

    /**
     *
     * Used internally by the `program` passed to `bindTexture` in order to bind the texture to an active `texture-unit`.
     *
     * @param {number} unit The WebGL texture unit
     *
     * @returns {bool}
     * @private
     */
    bind(unit) {
        this._gl.activeTexture(this._gl["TEXTURE" + unit]);
        this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
        return true;
    }

    /**
     * Used internally by the `program` passed to `bindTexture` in order to bind the texture to an active `texture-unit`.
     *
     * @param {number} unit The WebGL texture unit
     * @private
     */
    unbind(unit) {
        // This `unbind` method is ignored at the moment to allow avoiding to rebind same texture already bound to a texture unit.

        // this._gl.activeTexture(this.state.gl["TEXTURE" + unit]);
        // this._gl.bindTexture(this.state.gl.TEXTURE_2D, null);
    }
}