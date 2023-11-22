import {SceneModelTexture} from "./SceneModelTexture";


/**
 * A texture set within a {@link SceneModel}.
 *
 * * Created with {@link SceneModel#createTextureSet}
 * * Belongs to many {@link SceneModelMesh}es
 * * Stored by ID in {@link SceneModel#textureSets}
 * * Referenced by {@link SceneModelMesh#textureSet}
 */

export declare class SceneModelTextureSet {

    /**
     * Unique ID of this SceneModelTextureSet.
     *
     * The SceneModelTextureSet is registered against this ID in {@link SceneModel#textureSets}.
     */
    id: string | number;

    /**
     * The color texture.
     * @type {SceneModelTexture|*}
     */
    colorTexture: SceneModelTexture | null;

    /**
     * The metallic-roughness texture.
     * @type {SceneModelTexture|*}
     */
    metallicRoughnessTexture: SceneModelTexture | null;

    /**
     * The normal map texture.
     * @type {SceneModelTexture|*}
     */
    normalsTexture: SceneModelTexture | null;

    /**
     * The emissive color texture.
     * @type {SceneModelTexture|*}
     */
    emissiveTexture: SceneModelTexture | null;

    /**
     * The ambient occlusion texture.
     * @type {SceneModelTexture|*}
     */
    occlusionTexture: SceneModelTexture | null;
}
