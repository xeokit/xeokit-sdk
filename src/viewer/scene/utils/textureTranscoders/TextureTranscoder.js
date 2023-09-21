/**
 * Transcodes texture data.
 *
 * A {@link SceneModel} configured with an appropriate TextureTranscoder will allow us to add textures from
 * transcoded buffers or files. For a concrete example, see {@link VBOSceneModel}, which can be configured with
 * a {@link KTX2TextureTranscoder}, which allows us to add textures from KTX2 buffers and files.
 *
 * @interface
 */
class TextureTranscoder {

    /**
     * Transcodes texture data from transcoded buffers into a {@link Texture2D}.
     *
     * @param {ArrayBuffer[]} buffers Transcoded texture data. Given as an array of buffers so that we can support
     * multi-image textures, such as cube maps.
     * @param {*} config Transcoding options.
     * @param {Texture2D} texture The texture to load.
     * @returns {Promise} Resolves when the texture has loaded.
     */
    transcode(buffers, texture, config = {}) {
    }

    /**
     * Destroys this transcoder.
     */
    destroy() {
    }
}

export {TextureTranscoder};