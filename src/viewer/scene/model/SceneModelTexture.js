/**
 * A texture within a {@link SceneModelTextureSet}.
 *
 * * Created with {@link SceneModel#createTexture}
 * * Belongs to many {@link SceneModelTextureSet}s
 * * Stored by ID in {@link SceneModel#textures}}
 */
export class SceneModelTexture {

    /**
     * @private
     * @param cfg
     */
    constructor(cfg) {

        /**
         * Unique ID of this SceneModelTexture.
         *
         * The SceneModelTexture is registered against this ID in {@link SceneModel#textures}.
         */
        this.id = cfg.id;

        /**
         * @private
         */
        this.texture = cfg.texture;
    }

    /**
     * @private
     */
    destroy() {
        if (this.texture) {
            this.texture.destroy();
            this.texture = null;
        }
    }
}
