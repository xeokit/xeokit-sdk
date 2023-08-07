/**
 * @private
 */
export class SceneModelTextureSet {

    constructor(cfg) {
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
