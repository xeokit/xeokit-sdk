/**
 * A texture set within a {@link SceneModel}.
 *
 * * Created with {@link SceneModel#createTextureSet}
 * * Belongs to many {@link SceneModelMesh}es
 * * Stored by ID in {@link SceneModel#textureSets}
 * * Referenced by {@link SceneModelMesh#textureSet}
 */
export class SceneModelTextureSet {

    constructor(cfg) {

        /**
         * Unique ID of this SceneModelTextureSet.
         *
         * The SceneModelTextureSet is registered against this ID in {@link SceneModel#textureSets}.
         */
        this.id = cfg.id;
        this.colorTexture = cfg.colorTexture;
        this.metallicRoughnessTexture = cfg.metallicRoughnessTexture;
        this.normalsTexture = cfg.normalsTexture;
        this.emissiveTexture = cfg.emissiveTexture;
        this.occlusionTexture = cfg.occlusionTexture;
    }

    destroy() {
    }
}
