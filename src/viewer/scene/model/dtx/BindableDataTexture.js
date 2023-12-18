/**
 * @private
 */
export class BindableDataTexture {

    constructor(gl, texture, textureWidth, textureHeight, textureData = null) {
        this._gl = gl;
        this._texture = texture;
        this._textureWidth = textureWidth;
        this._textureHeight = textureHeight;
        this._textureData = textureData;
    }

    bindTexture(glProgram, shaderName, glTextureUnit) {
        return glProgram.bindTexture(shaderName, this, glTextureUnit);
    }

    bind(unit) {
        this._gl.activeTexture(this._gl["TEXTURE" + unit]);
        this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
        return true;
    }

    unbind(unit) {
        // This `unbind` method is ignored at the moment to allow avoiding
        // to rebind same texture already bound to a texture unit.

        // this._gl.activeTexture(this.state.gl["TEXTURE" + unit]);
        // this._gl.bindTexture(this.state.gl.TEXTURE_2D, null);
    }
}