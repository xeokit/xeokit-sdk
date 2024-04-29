import {math} from "../math/index.js";

const angleAxis = math.vec4(4);
const q1 = math.vec4();
const q2 = math.vec4();
const xAxis = math.vec3([1, 0, 0]);
const yAxis = math.vec3([0, 1, 0]);
const zAxis = math.vec3([0, 0, 1]);

const veca = math.vec3(3);
const vecb = math.vec3(3);

const identityMat = math.identityMat4();

/**
 * A dynamically-updatable transform within a {@link SceneModel}.
 *
 * * Can be composed into hierarchies
 * * Shared by multiple {@link SceneModelMesh}es
 * * Created with {@link SceneModel#createTransform}
 * * Stored by ID in {@link SceneModel#transforms}
 * * Referenced by {@link SceneModelMesh#transform}
 */
export class SceneModelTransform {

    /**
     * @private
     */
    constructor(cfg) {
        this._model = cfg.model;

        /**
         * Unique ID of this SceneModelTransform.
         *
         * The SceneModelTransform is registered against this ID in {@link SceneModel#transforms}.
         */
        this.id = cfg.id;

        this._parentTransform = cfg.parent;
        this._childTransforms = [];
        this._meshes = [];
        this._scale = new Float32Array([1,1,1]);
        this._quaternion = math.identityQuaternion(new Float32Array(4));
        this._rotation = new Float32Array(3);
        this._position = new Float32Array(3);
        this._localMatrix = math.identityMat4(new Float32Array(16));
        this._worldMatrix = math.identityMat4(new Float32Array(16));
        this._localMatrixDirty = true;
        this._worldMatrixDirty = true;

        if (cfg.matrix) {
            this.matrix = cfg.matrix;
        } else {
            this.scale = cfg.scale;
            this.position = cfg.position;
            if (cfg.quaternion) {
            } else {
                this.rotation = cfg.rotation;
            }
        }
        if (cfg.parent) {
            cfg.parent._addChildTransform(this);
        }
    }

    _addChildTransform(childTransform) {
        this._childTransforms.push(childTransform);
        childTransform._parentTransform = this;
        childTransform._transformDirty();
        childTransform._setSubtreeAABBsDirty(this);
    }

    _addMesh(mesh) {
        this._meshes.push(mesh);
        mesh.transform = this;
        // childTransform._setWorldMatrixDirty();
        // childTransform._setAABBDirty();
    }

    /**
     * The optional parent SceneModelTransform.
     *
     * @type {SceneModelTransform}
     */
    get parentTransform() {
        return this._parentTransform;
    }

    /**
     * The {@link SceneModelMesh}es transformed by this SceneModelTransform.
     *
     * @returns {[]}
     */
    get meshes() {
        return this._meshes;
    }

    /**
     * Sets the SceneModelTransform's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    set position(value) {
        this._position.set(value || [0, 0, 0]);
        this._setLocalMatrixDirty();
        this._model.glRedraw();
    }

    /**
     * Gets the SceneModelTransform's translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get position() {
        return this._position;
    }

    /**
     * Sets the SceneModelTransform's rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    set rotation(value) {
        this._rotation.set(value || [0, 0, 0]);
        math.eulerToQuaternion(this._rotation, "XYZ", this._quaternion);
        this._setLocalMatrixDirty();
        this._model.glRedraw();
    }

    /**
     * Gets the SceneModelTransform's rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get rotation() {
        return this._rotation;
    }

    /**
     * Sets the SceneModelTransform's rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {Number[]}
     */
    set quaternion(value) {
        this._quaternion.set(value || [0, 0, 0, 1]);
        math.quaternionToEuler(this._quaternion, "XYZ", this._rotation);
        this._setLocalMatrixDirty();
        this._model.glRedraw();
    }

    /**
     * Gets the SceneModelTransform's rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {Number[]}
     */
    get quaternion() {
        return this._quaternion;
    }

    /**
     * Sets the SceneModelTransform's scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     */
    set scale(value) {
        this._scale.set(value || [1, 1, 1]);
        this._setLocalMatrixDirty();
        this._model.glRedraw();
    }

    /**
     * Gets the SceneModelTransform's scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     */
    get scale() {
        return this._scale;
    }

    /**
     * Sets the SceneModelTransform's transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     */
    set matrix(value) {
        if (!this._localMatrix) {
            this._localMatrix = math.identityMat4();
        }
        this._localMatrix.set(value || identityMat);
        math.decomposeMat4(this._localMatrix, this._position, this._quaternion, this._scale);
        this._localMatrixDirty = false;
        this._transformDirty();
        this._model.glRedraw();
    }

    /**
     * Gets the SceneModelTransform's transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     */
    get matrix() {
        if (this._localMatrixDirty) {
            if (!this._localMatrix) {
                this._localMatrix = math.identityMat4();
            }
            math.composeMat4(this._position, this._quaternion, this._scale, this._localMatrix);
            this._localMatrixDirty = false;
        }
        return this._localMatrix;
    }

    /**
     * Gets the SceneModelTransform's World matrix.
     *
     * @property worldMatrix
     * @type {Number[]}
     */
    get worldMatrix() {
        if (this._worldMatrixDirty) {
            this._buildWorldMatrix();
        }
        return this._worldMatrix;
    }

    /**
     * Rotates the SceneModelTransform about the given axis by the given increment.
     *
     * @param {Number[]} axis Local axis about which to rotate.
     * @param {Number} angle Angle increment in degrees.
     */
    rotate(axis, angle) {
        angleAxis[0] = axis[0];
        angleAxis[1] = axis[1];
        angleAxis[2] = axis[2];
        angleAxis[3] = angle * math.DEGTORAD;
        math.angleAxisToQuaternion(angleAxis, q1);
        math.mulQuaternions(this.quaternion, q1, q2);
        this.quaternion = q2;
        this._setLocalMatrixDirty();
        this._model.glRedraw();
        return this;
    }

    /**
     * Rotates the SceneModelTransform about the given World-space axis by the given increment.
     *
     * @param {Number[]} axis Local axis about which to rotate.
     * @param {Number} angle Angle increment in degrees.
     */
    rotateOnWorldAxis(axis, angle) {
        angleAxis[0] = axis[0];
        angleAxis[1] = axis[1];
        angleAxis[2] = axis[2];
        angleAxis[3] = angle * math.DEGTORAD;
        math.angleAxisToQuaternion(angleAxis, q1);
        math.mulQuaternions(q1, this.quaternion, q1);
        //this.quaternion.premultiply(q1);
        return this;
    }

    /**
     * Rotates the SceneModelTransform about the local X-axis by the given increment.
     *
     * @param {Number} angle Angle increment in degrees.
     */
    rotateX(angle) {
        return this.rotate(xAxis, angle);
    }

    /**
     * Rotates the SceneModelTransform about the local Y-axis by the given increment.
     *
     * @param {Number} angle Angle increment in degrees.
     */
    rotateY(angle) {
        return this.rotate(yAxis, angle);
    }

    /**
     * Rotates the SceneModelTransform about the local Z-axis by the given increment.
     *
     * @param {Number} angle Angle increment in degrees.
     */
    rotateZ(angle) {
        return this.rotate(zAxis, angle);
    }

    /**
     * Translates the SceneModelTransform along the local axis by the given increment.
     *
     * @param {Number[]} axis Normalized local space 3D vector along which to translate.
     * @param {Number} distance Distance to translate along  the vector.
     */
    translate(axis) {
        this._position[0] += axis[0];
        this._position[1] += axis[1];
        this._position[2] += axis[2];
        this._setLocalMatrixDirty();
        this._model.glRedraw();
        return this;
    }

    /**
     * Translates the SceneModelTransform along the local X-axis by the given increment.
     *
     * @param {Number} distance Distance to translate along  the X-axis.
     */
    translateX(distance) {
        this._position[0] += distance;
        this._setLocalMatrixDirty();
        this._model.glRedraw();
        return this;
    }

    /**
     * Translates the SceneModelTransform along the local Y-axis by the given increment.
     *
     * @param {Number} distance Distance to translate along  the Y-axis.
     */
    translateY(distance) {
        this._position[1] += distance;
        this._setLocalMatrixDirty();
        this._model.glRedraw();
        return this;
    }

    /**
     * Translates the SceneModelTransform along the local Z-axis by the given increment.
     *
     * @param {Number} distance Distance to translate along  the Z-axis.
     */
    translateZ(distance) {
        this._position[2] += distance;
        this._setLocalMatrixDirty();
        this._model.glRedraw();
        return this;
    }

    _setLocalMatrixDirty() {
        this._localMatrixDirty = true;
        this._transformDirty();
    }

    _transformDirty() {
        this._worldMatrixDirty = true;
        for (let i = 0, len = this._childTransforms.length; i < len; i++) {
            const childTransform = this._childTransforms[i];
            childTransform._transformDirty();
            if (childTransform._meshes && childTransform._meshes.length > 0) {
               const meshes = childTransform._meshes;
               for (let j =0, lenj = meshes.length; j < lenj; j++) {
                 meshes[j]._transformDirty();
               }
            }
        }
        if (this._meshes && this._meshes.length > 0) {
            const meshes = this._meshes;
            for (let j =0, lenj = meshes.length; j < lenj; j++) {
                meshes[j]._transformDirty();
            }
        }
    }

    _buildWorldMatrix() {
        const localMatrix = this.matrix;
        if (!this._parentTransform) {
            for (let i = 0, len = localMatrix.length; i < len; i++) {
                this._worldMatrix[i] = localMatrix[i];
            }
        } else {
            math.mulMat4(this._parentTransform.worldMatrix, localMatrix, this._worldMatrix);
        }
        this._worldMatrixDirty = false;
    }

    _setSubtreeAABBsDirty(sceneTransform) {
        sceneTransform._aabbDirty = true;
        if (sceneTransform._childTransforms) {
            for (let i = 0, len = sceneTransform._childTransforms.length; i < len; i++) {
                this._setSubtreeAABBsDirty(sceneTransform._childTransforms[i]);
            }
        }
    }
}
