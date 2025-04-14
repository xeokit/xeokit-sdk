import {SceneModelEntity} from "./SceneModelEntity";
import {SceneModelTransform} from "./SceneModelTransform";
import {SceneModelTextureSet} from "./SceneModelTextureSet";
import {SceneModel} from "./SceneModel";

/**
 * A mesh within a {@link SceneModel}.
 *
 * * Created with {@link SceneModel#createMesh}
 * * Belongs to exactly one {@link SceneModelEntity}
 * * Stored by ID in {@link SceneModel#meshes}
 * * Referenced by {@link SceneModelEntity#meshes}
 * * Can have a {@link SceneModelTransform} to dynamically scale, rotate and translate it.
 */
export declare class SceneModelMesh {

    /**
     * The {@link SceneModel} that owns this SceneModelMesh.
     *
     * @type {SceneModel}
     */
    model: SceneModel;

    /**
     * The {@link SceneModelEntity} that owns this SceneModelMesh.
     *
     * @type {SceneModelEntity}
     */
    object: SceneModelEntity;

    /**
     * The {@link SceneModelTransform} that transforms this SceneModelMesh.
     *
     * * This only exists when the SceneModelMesh is instancing its geometry.
     * * These are created with {@link SceneModel#createTransform}
     * * Each of these is also registered in {@link SceneModel#transforms}.
     *
     * @type {SceneModelTransform}
     */
    transform: SceneModelTransform | null;


    /**
     * The {@link SceneModelTextureSet} that optionally textures this SceneModelMesh.
     *
     * * This only exists when the SceneModelMesh has texture.
     * * These are created with {@link SceneModel#createTextureSet}
     * * Each of these is also registered in {@link SceneModel#textureSets}.
     *
     * @type {SceneModelTextureSet}
     */
    textureSet: SceneModelTextureSet | null;

    /**
     * Unique ID of this SceneModelMesh.
     *
     * The SceneModelMesh is registered against this ID in {@link SceneModel#meshes}.
     */
    id: string | number;

    /**
     * The {@link SceneModelEntity} that owns this SceneModelMesh.
     *
     * @type {SceneModelEntity}
     */
    entity: SceneModelEntity;

    /**
     * Tells whether this SceneModelMesh is a solid or not
     * 
     * @type {Boolean}
     */
    isSolid(): boolean;

    /**
     * Returns the volume of this SceneModelMesh.
     * @returns {number}
     */
    get volume(): number;

    /**
     * Returns the surface area of this SceneModelMesh.
     * @returns {number}
     */
    get surfaceArea(): number;

}
