/**
 * Instantiated by Model#createTextureSet
 *
 * @private
 */
export class VBOSceneModelTextureSet {

    /**
     * @param {*} cfg VBOSceneModelTextureSet properties.
     * @param {String|Number} cfg.id Mandatory ID for the texture set, to refer to with {@link VBOSceneModel#createMesh}.
     * @param {VBOSceneModel} cfg.model VBOSceneModel that owns this texture set.
     * @param {VBOSceneModelTexture} [cfg.colorTexture] RGBA texture with base color in RGB and opacity in A.
     * @param {VBOSceneModelTexture} [cfg.metallicRoughnessTexture] RGBA texture with metallic in R and roughness in G.
     * @param {VBOSceneModelTexture} [cfg.normalsTexture] RGBA texture with surface normals in RGB.
     * @param {VBOSceneModelTexture} [cfg.emissiveTexture] RGBA texture with emissive color in RGB.
     * @param {VBOSceneModelTexture} [cfg.occlusionTexture] RGBA texture with ambient occlusion factors in RGB.
     */
    constructor(cfg) {

        /**
         * ID of this VBOSceneModelTextureSet, unique within the VBOSceneModel.
         *
         * @property id
         * @type {String}
         * @final
         */
        this.id = cfg.id;

        /**
         * RGBA texture containing base color in RGB and opacity in A.
         *
         * @property colorTexture
         * @type {VBOSceneModelTexture}
         * @final
         */
        this.colorTexture = cfg.colorTexture;

        /**
         * RGBA texture containing metallic and roughness factors in R and G.
         *
         * @property metallicRoughnessTexture
         * @type {VBOSceneModelTexture}
         * @final
         */
        this.metallicRoughnessTexture = cfg.metallicRoughnessTexture;

        /**
         * RGBA texture with surface normals in RGB.
         *
         * @property normalsTexture
         * @type {VBOSceneModelTexture}
         * @final
         */
        this.normalsTexture = cfg.normalsTexture;

        /**
         * RGBA texture with emissive color in RGB.
         *
         * @property emissiveTexture
         * @type {VBOSceneModelTexture}
         * @final
         */
        this.emissiveTexture = cfg.emissiveTexture;

        /**
         * RGBA texture with ambient occlusion factors in RGB.
         *
         * @property occlusionTexture
         * @type {VBOSceneModelTexture}
         * @final
         */
        this.occlusionTexture = cfg.occlusionTexture;
    }

    /**
     * @private
     */
    destroy() {
    }
}
