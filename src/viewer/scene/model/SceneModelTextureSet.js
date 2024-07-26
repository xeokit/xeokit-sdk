/**
 * A texture set within a {@link SceneModel}.
 *
 * * Created with {@link SceneModel#createTextureSet}
 * * Belongs to many {@link SceneModelMesh}es
 * * Stored by ID in {@link SceneModel#textureSets}
 * * Referenced by {@link SceneModelMesh#textureSet}
 */
export class SceneModelTextureSet {

    /**
     * @private
     */
    constructor(cfg) {

        /**
         * Unique ID of this SceneModelTextureSet.
         *
         * The SceneModelTextureSet is registered against this ID in {@link SceneModel#textureSets}.
         */
        this.id = cfg.id;

        /**
         * The color texture.
         * @type {SceneModelTexture|*}
         */
        this.colorTexture = cfg.colorTexture;

        /**
         * The alpha cutoff [float]
         */
        this.alphaCutoff = cfg.alphaCutoff;

        /**
         * The metallic-roughness texture.
         * @type {SceneModelTexture|*}
         */
        this.metallicRoughnessTexture = cfg.metallicRoughnessTexture;

        /**
         * The normal map texture.
         * @type {SceneModelTexture|*}
         */
        this.normalsTexture = cfg.normalsTexture;

        /**
         * The emissive color texture.
         * @type {SceneModelTexture|*}
         */
        this.emissiveTexture = cfg.emissiveTexture;

        /**
         * The ambient occlusion texture.
         * @type {SceneModelTexture|*}
         */
        this.occlusionTexture = cfg.occlusionTexture;
    }

    /**
     * @private
     */
    destroy() {
    }
}
