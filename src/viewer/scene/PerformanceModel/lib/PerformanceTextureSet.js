/**
 * Instantiated by Model#createTextureSet
 *
 * @private
 */
export class PerformanceTextureSet {

    /**
     * @param {*} cfg PerformanceTextureSet properties.
     * @param {String|Number} cfg.id Mandatory ID for the texture set, to refer to with {@link PerformanceModel#createMesh}.
     * @param {PerformanceModel} cfg.model PerformanceModel that owns this texture set.
     * @param {PerformanceTexture} [cfg.colorTexture] RGBA texture with base color in RGB and opacity in A.
     * @param {PerformanceTexture} [cfg.metallicRoughnessTexture] RGBA texture with metallic in R and roughness in G.
     * @param {PerformanceTexture} [cfg.normalsTexture] RGBA texture with surface normals in RGB.
     * @param {PerformanceTexture} [cfg.emissiveTexture] RGBA texture with emissive color in RGB.
     * @param {PerformanceTexture} [cfg.aoTexture] RGBA texture with ambient occlusion factors in RGB.
     */
    constructor(cfg) {

        /**
         * ID of this PerformanceTextureSet, unique within the PerformanceModel.
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
         * @type {PerformanceTexture}
         * @final
         */
        this.colorTexture = cfg.colorTexture;

        /**
         * RGBA texture containing metallic and roughness factors in R and G.
         *
         * @property metallicRoughnessTexture
         * @type {PerformanceTexture}
         * @final
         */
        this.metallicRoughnessTexture = cfg.metallicRoughnessTexture;

        /**
         * RGBA texture with surface normals in RGB.
         *
         * @property normalsTexture
         * @type {PerformanceTexture}
         * @final
         */
        this.normalsTexture = cfg.normalsTexture;

        /**
         * RGBA texture with emissive color in RGB.
         *
         * @property emissiveTexture
         * @type {PerformanceTexture}
         * @final
         */
        this.emissiveTexture = cfg.emissiveTexture;

        /**
         * RGBA texture with ambient occlusion factors in RGB.
         *
         * @property aoTexture
         * @type {PerformanceTexture}
         * @final
         */
        this.aoTexture = cfg.aoTexture;
    }

    /**
     * @private
     */
    destroy() {
    }
}
