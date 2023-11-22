/**
 * A texture within a {@link SceneModelTextureSet}.
 *
 * * Created with {@link SceneModel#createTexture}
 * * Belongs to many {@link SceneModelTextureSet}s
 * * Stored by ID in {@link SceneModel#textures}}
 */
export declare class SceneModelTexture {

    /**
     * Unique ID of this SceneModelTexture.
     *
     * The SceneModelTexture is registered against this ID in {@link SceneModel#textures}.
     */
    id: string | number;
}
