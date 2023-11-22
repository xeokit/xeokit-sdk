import {SceneModelMesh} from "./SceneModelMesh";

/**
 * A dynamically-updatable transform within a {@link SceneModel}.
 *
 * * Can be composed into hierarchies
 * * Shared by multiple {@link SceneModelMesh}es
 * * Created with {@link SceneModel#createTransform}
 * * Stored by ID in {@link SceneModel#transforms}
 * * Referenced by {@link SceneModelMesh#transform}
 */
export declare class SceneModelTransform {

    /**
     * Unique ID of this SceneModelTransform.
     *
     * The SceneModelTransform is registered against this ID in {@link SceneModel#transforms}.
     */
    id: string | number;

    /**
     * The optional parent SceneModelTransform.
     *
     * @type {SceneModelTransform}
     */
    get parentTransform(): SceneModelTransform | null;

    /**
     * The {@link SceneModelMesh}es transformed by this SceneModelTransform.
     *
     * @returns {[]}
     */
    get meshes(): SceneModelMesh[];

    /**
     * Sets the SceneModelTransform's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {number[]}
     */
    set position(value: number[]);

    /**
     * Gets the SceneModelTransform's translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {number[]}
     */
    get position(): number[];

    /**
     * Sets the SceneModelTransform's rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {number[]}
     */
    set rotation(value: number[]);

    /**
     * Gets the SceneModelTransform's rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {number[]}
     */
    get rotation(): number[];

    /**
     * Sets the SceneModelTransform's rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {number[]}
     */
    set quaternion(value: number[]);

    /**
     * Gets the SceneModelTransform's rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {number[]}
     */
    get quaternion(): number[];

    /**
     * Sets the SceneModelTransform's scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {number[]}
     */
    set scale(value: number[]);

    /**
     * Gets the SceneModelTransform's scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {number[]}
     */
    get scale(): number[];

    /**
     * Sets the SceneModelTransform's transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {number[]}
     */
    set matrix(value: number[]);

    /**
     * Gets the SceneModelTransform's transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {number[]}
     */
    get matrix(): number[];

    /**
     * Gets the SceneModelTransform's World matrix.
     *
     * @property worldMatrix
     * @type {number[]}
     */
    get worldMatrix(): number[];

    /**
     * Rotates the SceneModelTransform about the given axis by the given increment.
     *
     * @param {number[]} axis Local axis about which to rotate.
     * @param {number} angle Angle increment in degrees.
     */
    rotate(axis: number[], angle: number): void;

    /**
     * Rotates the SceneModelTransform about the given World-space axis by the given increment.
     *
     * @param {number[]} axis Local axis about which to rotate.
     * @param {number} angle Angle increment in degrees.
     */
    rotateOnWorldAxis(axis: number[], angle: number): void;

    /**
     * Rotates the SceneModelTransform about the local X-axis by the given increment.
     *
     * @param {number} angle Angle increment in degrees.
     */
    rotateX(angle: number): void;

    /**
     * Rotates the SceneModelTransform about the local Y-axis by the given increment.
     *
     * @param {number} angle Angle increment in degrees.
     */
    rotateY(angle: number): void;

    /**
     * Rotates the SceneModelTransform about the local Z-axis by the given increment.
     *
     * @param {number} angle Angle increment in degrees.
     */
    rotateZ(angle: number): void;

    /**
     * Translates the SceneModelTransform along the local axis by the given increment.
     *
     * @param {number[]} axis Normalized local space 3D vector along which to translate.
     */
    translate(axis: number[]): void;

    /**
     * Translates the SceneModelTransform along the local X-axis by the given increment.
     *
     * @param {number} distance Distance to translate along  the X-axis.
     */
    translateX(distance: number): void;

    /**
     * Translates the SceneModelTransform along the local Y-axis by the given increment.
     *
     * @param {number} distance Distance to translate along  the Y-axis.
     */
    translateY(distance: number): void;

    /**
     * Translates the SceneModelTransform along the local Z-axis by the given increment.
     *
     * @param {number} distance Distance to translate along  the Z-axis.
     */
    translateZ(distance: number): void;
}
