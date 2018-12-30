/**
 Fired when this Mesh is picked via a call to {@link Scene/pick:method"}}Scene#pick(){{/crossLink}}.

 The event parameters will be the hit result returned by the {@link Scene/pick:method"}}Scene#pick(){{/crossLink}} method.
 @event picked
 */
import {math} from '../math/math.js';
import {Component} from './../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {DrawRenderer} from "./draw/DrawRenderer.js";
import {EmphasisFillRenderer} from "./emphasis/EmphasisFillRenderer.js";
import {EmphasisEdgesRenderer} from "./emphasis/EmphasisEdgesRenderer.js";
import {PickMeshRenderer} from "./pick/PickMeshRenderer.js";
import {PickVertexRenderer} from "./pick/PickVertexRenderer.js";
import {PickTriangleRenderer} from "./pick/PickTriangleRenderer.js";

const obb = math.OBB3();
const angleAxis = new Float32Array(4);
const q1 = new Float32Array(4);
const q2 = new Float32Array(4);
const xAxis = new Float32Array([1, 0, 0]);
const yAxis = new Float32Array([0, 1, 0]);
const zAxis = new Float32Array([0, 0, 1]);

const veca = new Float32Array(3);
const vecb = new Float32Array(3);

const identityMat = math.identityMat4();


const getPickResult = (function () {

    // Cached vars to avoid garbage collection

    const localRayOrigin = math.vec3();
    const localRayDir = math.vec3();
    const positionA = math.vec3();
    const positionB = math.vec3();
    const positionC = math.vec3();
    const triangleVertices = math.vec3();
    const position = math.vec4();
    const worldPos = math.vec3();
    const viewPos = math.vec3();
    const bary = math.vec3();
    const normalA = math.vec3();
    const normalB = math.vec3();
    const normalC = math.vec3();
    const uva = math.vec3();
    const uvb = math.vec3();
    const uvc = math.vec3();
    const tempVec4a = math.vec4();
    const tempVec4b = math.vec4();
    const tempVec4c = math.vec4();
    const tempVec3 = math.vec3();
    const tempVec3b = math.vec3();
    const tempVec3c = math.vec3();
    const tempVec3d = math.vec3();
    const tempVec3e = math.vec3();
    const tempVec3f = math.vec3();
    const tempVec3g = math.vec3();
    const tempVec3h = math.vec3();
    const tempVec3i = math.vec3();
    const tempVec3j = math.vec3();
    const tempVec3k = math.vec3();

    return function (mesh, pickResult) {

        var primIndex = pickResult.primIndex;

        if (primIndex !== undefined && primIndex !== null && primIndex > -1) {

            const geometry = mesh.geometry._state;
            const scene = mesh.scene;
            const camera = scene.camera;

            if (geometry.primitiveName === "triangles") {

                // Triangle picked; this only happens when the
                // Mesh has a Geometry that has primitives of type "triangle"

                pickResult.primitive = "triangle";

                // Get the World-space positions of the triangle's vertices

                const i = primIndex; // Indicates the first triangle index in the indices array

                const indices = geometry.indices; // Indices into geometry arrays, not into shared VertexBufs
                const positions = geometry.positions;

                let ia3;
                let ib3;
                let ic3;

                if (indices) {

                    var ia = indices[i + 0];
                    var ib = indices[i + 1];
                    var ic = indices[i + 2];

                    triangleVertices[0] = ia;
                    triangleVertices[1] = ib;
                    triangleVertices[2] = ic;

                    pickResult.indices = triangleVertices;

                    ia3 = ia * 3;
                    ib3 = ib * 3;
                    ic3 = ic * 3;

                } else {

                    ia3 = i * 3;
                    ib3 = ia3 + 3;
                    ic3 = ib3 + 3;
                }

                positionA[0] = positions[ia3 + 0];
                positionA[1] = positions[ia3 + 1];
                positionA[2] = positions[ia3 + 2];

                positionB[0] = positions[ib3 + 0];
                positionB[1] = positions[ib3 + 1];
                positionB[2] = positions[ib3 + 2];

                positionC[0] = positions[ic3 + 0];
                positionC[1] = positions[ic3 + 1];
                positionC[2] = positions[ic3 + 2];

                if (geometry.compressGeometry) {

                    // Decompress vertex positions

                    const positionsDecodeMatrix = geometry.positionsDecodeMatrix;
                    if (positionsDecodeMatrix) {
                        math.decompressPosition(positionA, positionsDecodeMatrix, positionA);
                        math.decompressPosition(positionB, positionsDecodeMatrix, positionB);
                        math.decompressPosition(positionC, positionsDecodeMatrix, positionC);
                    }
                }

                // Attempt to ray-pick the triangle in local space

                let canvasPos;

                if (pickResult.canvasPos) {
                    canvasPos = pickResult.canvasPos;
                    math.canvasPosToLocalRay(camera, mesh.worldMatrix, canvasPos, localRayOrigin, localRayDir);

                } else if (pickResult.origin && pickResult.direction) {
                    math.worldRayToLocalRay(mesh.worldMatrix, pickResult.origin, pickResult.direction, localRayOrigin, localRayDir);
                }

                math.normalizeVec3(localRayDir);
                math.rayPlaneIntersect(localRayOrigin, localRayDir, positionA, positionB, positionC, position);

                // Get Local-space cartesian coordinates of the ray-triangle intersection

                pickResult.localPos = position;
                pickResult.position = position;

                // Get interpolated World-space coordinates

                // Need to transform homogeneous coords

                tempVec4a[0] = position[0];
                tempVec4a[1] = position[1];
                tempVec4a[2] = position[2];
                tempVec4a[3] = 1;

                // Get World-space cartesian coordinates of the ray-triangle intersection

                math.transformVec4(mesh.worldMatrix, tempVec4a, tempVec4b);

                worldPos[0] = tempVec4b[0];
                worldPos[1] = tempVec4b[1];
                worldPos[2] = tempVec4b[2];

                pickResult.worldPos = worldPos;

                // Get View-space cartesian coordinates of the ray-triangle intersection

                math.transformVec4(camera.matrix, tempVec4b, tempVec4c);

                viewPos[0] = tempVec4c[0];
                viewPos[1] = tempVec4c[1];
                viewPos[2] = tempVec4c[2];

                pickResult.viewPos = viewPos;

                // Get barycentric coordinates of the ray-triangle intersection

                math.cartesianToBarycentric(position, positionA, positionB, positionC, bary);

                pickResult.bary = bary;

                // Get interpolated normal vector

                const normals = geometry.normals;

                if (normals) {

                    if (geometry.compressGeometry) {

                        // Decompress vertex normals

                        const ia2 = ia * 2;
                        const ib2 = ib * 2;
                        const ic2 = ic * 2;

                        math.octDecodeVec2(normals.subarray(ia2, ia2 + 2), normalA);
                        math.octDecodeVec2(normals.subarray(ib2, ib2 + 2), normalB);
                        math.octDecodeVec2(normals.subarray(ic2, ic2 + 2), normalC);

                    } else {

                        normalA[0] = normals[ia3];
                        normalA[1] = normals[ia3 + 1];
                        normalA[2] = normals[ia3 + 2];

                        normalB[0] = normals[ib3];
                        normalB[1] = normals[ib3 + 1];
                        normalB[2] = normals[ib3 + 2];

                        normalC[0] = normals[ic3];
                        normalC[1] = normals[ic3 + 1];
                        normalC[2] = normals[ic3 + 2];
                    }

                    const normal = math.addVec3(math.addVec3(
                        math.mulVec3Scalar(normalA, bary[0], tempVec3),
                        math.mulVec3Scalar(normalB, bary[1], tempVec3b), tempVec3c),
                        math.mulVec3Scalar(normalC, bary[2], tempVec3d), tempVec3e);

                    pickResult.normal = math.transformVec3(mesh.worldNormalMatrix, normal, tempVec3f);
                }

                // Get interpolated UV coordinates

                const uvs = geometry.uv;

                if (uvs) {

                    uva[0] = uvs[(ia * 2)];
                    uva[1] = uvs[(ia * 2) + 1];

                    uvb[0] = uvs[(ib * 2)];
                    uvb[1] = uvs[(ib * 2) + 1];

                    uvc[0] = uvs[(ic * 2)];
                    uvc[1] = uvs[(ic * 2) + 1];

                    if (geometry.compressGeometry) {

                        // Decompress vertex UVs

                        const uvDecodeMatrix = geometry.uvDecodeMatrix;
                        if (uvDecodeMatrix) {
                            math.decompressUV(uva, uvDecodeMatrix, uva);
                            math.decompressUV(uvb, uvDecodeMatrix, uvb);
                            math.decompressUV(uvc, uvDecodeMatrix, uvc);
                        }
                    }

                    pickResult.uv = math.addVec3(
                        math.addVec3(
                            math.mulVec2Scalar(uva, bary[0], tempVec3g),
                            math.mulVec2Scalar(uvb, bary[1], tempVec3h), tempVec3i),
                        math.mulVec2Scalar(uvc, bary[2], tempVec3j), tempVec3k);
                }
            }
        }
    }
})();

/**
 * @desc TODO
 *
 * ## Meshes Representing Objects
 *
 * When a Mesh has an {@link Mesh#objectId} then
 *
 * * it represents an object,
 * * will be registered by {@link Mesh#objectId} in {@link Scene#objects} and
 * * may have a corresponding {@link MetaObject} to specify object metadata for it.
 *
 * ## Meshes Representing Models
 *
 * When a Mesh has a {@link Mesh#modelId} then
 *
 * * it represents a model,
 * * will be registered by {@link Mesh#modelId} in {@link Scene#models}, and
 * * may have a corresponding {@link MetaModel} to specify model metadata for it.
 */
class Mesh extends Component {

    /**
     * @private
     */
    get type() {
        return "Mesh";
    }

    /**
     @private
     */
    get isMesh() {
        return true;
    }

    /**
     @private
     */
    get isDrawable() {
        return true;
    }

    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._state = new RenderState({ // NOTE: Renderer gets modeling and normal matrices from xeokit.Object#matrix and xeokit.Object.#normalMatrix
            visible: true,
            culled: false,
            pickable: null,
            clippable: null,
            collidable: null,
            castShadow: null,
            receiveShadow: null,
            outlined: null,
            ghosted: false,
            highlighted: false,
            selected: false,
            edges: false,
            stationary: !!cfg.stationary,
            billboard: this._checkBillboard(cfg.billboard),
            layer: null,
            colorize: null,
            pickID: this.scene._renderer.getPickID(this), // TODO: somehow puch this down into xeokit framework?
            drawHash: "",
            pickHash: ""
        });

        this._drawRenderer = null;
        this._shadowRenderer = null;
        this._emphasisFillRenderer = null;
        this._emphasisEdgesRenderer = null;
        this._pickMeshRenderer = null;
        this._pickTriangleRenderer = null;

        this._worldPositions = null;
        this._worldPositionsDirty = true;
        this._geometry = cfg.geometry ? this._checkComponent("Geometry", cfg.geometry) : this.scene.geometry;
        this._vertexBufs = this._geometry._getVertexBufs();
        this._material = cfg.material ? this._checkComponent2(["PhongMaterial", "MetallicMaterial", "SpecularMaterial", "LambertMaterial"], cfg.material) : this.scene.material;
        this._ghostMaterial = cfg.ghostMaterial ? this._checkComponent("EmphasisMaterial", cfg.ghostMaterial) : this.scene.ghostMaterial;
        this._outlineMaterial = cfg.outlineMaterial ? this._checkComponent("EmphasisMaterial", cfg.outlineMaterial) : this.scene.outlineMaterial;
        this._highlightMaterial = cfg.highlightMaterial ? this._checkComponent("EmphasisMaterial", cfg.highlightMaterial) : this.scene.highlightMaterial;
        this._selectedMaterial = cfg.selectedMaterial ? this._checkComponent("EmphasisMaterial", cfg.selectedMaterial) : this.scene.selectedMaterial;
        this._edgeMaterial = cfg.edgeMaterial ? this._checkComponent("EdgeMaterial", cfg.edgeMaterial) : this.scene.edgeMaterial;

        this._parent = null;

        this._aabb = null;
        this._aabbDirty = true;
        this.scene._aabbDirty = true;

        this._scale = math.vec3();
        this._quaternion = math.identityQuaternion();
        this._rotation = math.vec3();
        this._position = math.vec3();

        this._worldMatrix = math.identityMat4();
        this._worldNormalMatrix = math.identityMat4();

        this._localMatrixDirty = true;
        this._worldMatrixDirty = true;
        this._worldNormalMatrixDirty = true;

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

        if (cfg.objectId) {
            this._objectId = cfg.objectId;
            this.scene._registerObject(this); // Must assign type before setting properties
        }

        if (cfg.modelId) {
            this._modelId = cfg.modelId;
            this.scene._registerModel(this);
        }

        this.visible = cfg.visible;
        this.culled = cfg.culled;
        this.pickable = cfg.pickable;
        this.clippable = cfg.clippable;
        this.collidable = cfg.collidable;
        this.castShadow = cfg.castShadow;
        this.receiveShadow = cfg.receiveShadow;
        this.outlined = cfg.outlined;
        this.ghosted = cfg.ghosted;
        this.highlighted = cfg.highlighted;
        this.selected = cfg.selected;
        this.edges = cfg.edges;
        this.aabbVisible = cfg.aabbVisible;
        this.layer = cfg.layer;
        this.colorize = cfg.colorize;
        this.opacity = cfg.opacity;

        if (cfg.parentId) {
            const parentNode = this.scene.components[cfg.parentId];
            if (!parentNode) {
                this.error("Parent not found: '" + cfg.parentId + "'");
            } else if (!parentNode.isNode) {
                this.error("Parent is not a Node: '" + cfg.parentId + "'");
            } else {
                parentNode.addChild(this);
            }
        } else if (cfg.parent) {
            if (!cfg.parent.isNode) {
                this.error("Parent is not a Node");
            }
            cfg.parent.addChild(this);
        }

        this.compile();
    }

    /**
     Optional ID to identify this Mesh as an {@link Object}.

     @property objectId
     @default null
     @type String
     @final
     */
    get objectId() {
        return this._objectId;
    }

    /**
     Optional ID to identify this Mesh as a {@link Model}.

     @property modelId
     @default null
     @type String
     @final
     */
    get modelId() {
        return this._modelId;
    }

    _checkBillboard(value) {
        value = value || "none";
        if (value !== "spherical" && value !== "cylindrical" && value !== "none") {
            this.error("Unsupported value for 'billboard': " + value + " - accepted values are " +
                "'spherical', 'cylindrical' and 'none' - defaulting to 'none'.");
            value = "none";
        }
        return value;
    }

    /**
     * Called by xeokit to compile shaders for this Mesh.
     * @public
     */
    compile() {
        var drawHash = this._makeDrawHash();
        if (this._state.drawHash !== drawHash) {
            this._state.drawHash = drawHash;
            this._putDrawRenderers();
            this._drawRenderer = DrawRenderer.get(this);
            // this._shadowRenderer = ShadowRenderer.get(this);
            this._emphasisFillRenderer = EmphasisFillRenderer.get(this);
            this._emphasisEdgesRenderer = EmphasisEdgesRenderer.get(this);
        }
        var pickHash = this._makePickHash();
        if (this._state.pickHash !== pickHash) {
            this._state.pickHash = pickHash;
            this._putPickRenderers();
            this._pickMeshRenderer = PickMeshRenderer.get(this);
        }
    }

    _setLocalMatrixDirty() {
        this._localMatrixDirty = true;
        this._setWorldMatrixDirty();
    }

    _setWorldMatrixDirty() {
        this._worldMatrixDirty = true;
        this._worldNormalMatrixDirty = true;
    }

    _buildWorldMatrix() {
        const localMatrix = this.matrix;
        if (!this._parent) {
            for (let i = 0, len = localMatrix.length; i < len; i++) {
                this._worldMatrix[i] = localMatrix[i];
            }
        } else {
            math.mulMat4(this._parent.worldMatrix, localMatrix, this._worldMatrix);
        }
        this._worldMatrixDirty = false;
    }

    _buildWorldNormalMatrix() {
        if (this._worldMatrixDirty) {
            this._buildWorldMatrix();
        }
        if (!this._worldNormalMatrix) {
            this._worldNormalMatrix = math.mat4();
        }
        // Note: order of inverse and transpose doesn't matter
        math.transposeMat4(this._worldMatrix, this._worldNormalMatrix);
        math.inverseMat4(this._worldNormalMatrix);
        this._worldNormalMatrixDirty = false;
    }

    _setAABBDirty() {
        if (this.collidable) {
            for (let object = this; object; object = object._parent) {
                object._aabbDirty = true;
                object.fire("boundary", true);
            }
        }
    }

    _updateAABB() {
        this.scene._aabbDirty = true;
        if (!this._aabb) {
            this._aabb = math.AABB3();
        }
        this._buildAABB(this.worldMatrix, this._aabb); // Mesh or BigModel
        this._aabbDirty = false;
    }

    _webglContextRestored() {
        if (this._drawRenderer) {
            this._drawRenderer.webglContextRestored();
        }
        if (this._shadowRenderer) {
            this._shadowRenderer.webglContextRestored();
        }
        if (this._emphasisFillRenderer) {
            this._emphasisFillRenderer.webglContextRestored();
        }
        if (this._emphasisEdgesRenderer) {
            this._emphasisEdgesRenderer.webglContextRestored();
        }
        if (this._pickMeshRenderer) {
            this._pickMeshRenderer.webglContextRestored();
        }
        if (this._pickTriangleRenderer) {
            this._pickMeshRenderer.webglContextRestored();
        }
    }

    _makeDrawHash() {
        const scene = this.scene;
        const drawHash = [
            scene.canvas.canvas.id,
            (scene.gammaInput ? "gi;" : ";") + (scene.gammaOutput ? "go" : ""),
            scene._lightsState.getHash(),
            scene._clipsState.getHash(),
        ];
        const state = this._state;
        if (state.stationary) {
            drawHash.push("/s");
        }
        if (state.billboard === "none") {
            drawHash.push("/n");
        } else if (state.billboard === "spherical") {
            drawHash.push("/s");
        } else if (state.billboard === "cylindrical") {
            drawHash.push("/c");
        }
        if (state.receiveShadow) {
            drawHash.push("/rs");
        }
        drawHash.push(";");
        return drawHash.join("");
    }

    _makePickHash() {
        const pickHash = [];
        const state = this._state;
        if (state.stationary) {
            pickHash.push("/s");
        }
        if (state.billboard === "none") {
            pickHash.push("/n");
        } else if (state.billboard === "spherical") {
            pickHash.push("/s");
        } else if (state.billboard === "cylindrical") {
            pickHash.push("/c");
        }
        if (state.receiveShadow) {
            pickHash.push("/rs");
        }
        pickHash.push(";");
        return pickHash.join("");
    }

    _buildAABB(worldMatrix, aabb) {
        math.transformOBB3(worldMatrix, this._geometry.obb, obb);
        math.OBB3ToAABB3(obb, aabb);
    }

    /**
     World-space 3D vertex positions.

     These are internally generated on-demand and cached. To free the cached
     vertex World positions when you're done with them, set this property to null or undefined.

     @property worldPositions
     @type Float32Array
     @final
     */
    get worldPositions() {
        if (this._worldPositionsDirty) {
            const positions = this._geometry.positions;
            if (!this._worldPositions) {
                this._worldPositions = new Float32Array(positions.length);
            }
            math.transformPositions3(this.worldMatrix, positions, this._worldPositions);
            this._worldPositionsDirty = false;
        }
        return this._worldPositions;
    }

    set worldPositions(value) {
        if (value = undefined || value === null) {
            this._worldPositions = null; // Release memory
            this._worldPositionsDirty = true;
        }
    }

    /**
     Defines the shape of this Mesh.

     @property geometry
     @type Geometry
     @final
     */
    get geometry() {
        return this._geometry;
    }

    /**
     Defines appearance when rendering normally, ie. when not ghosted, highlighted or selected.

     @property material
     @type Material
     @final
     */
    get material() {
        return this._material;
    }

    /**
     Defines surface appearance when ghosted.

     @property ghostMaterial
     @type EmphasisMaterial
     @final
     */
    get ghostMaterial() {
        return this._ghostMaterial;
    }

    /**
     Defines surface appearance when highlighted.

     @property highlightMaterial
     @type EmphasisMaterial
     @final
     */
    get highlightMaterial() {
        return this._highlightMaterial;
    }

    /**
     Defines surface appearance when selected.

     @property selectedMaterial
     @type EmphasisMaterial
     */
    get selectedMaterial() {
        return this._selectedMaterial;
    }

    /**
     Defines surface appearance when edges are shown.

     @property edgeMaterial
     @type EdgeMaterial
     */
    get edgeMaterial() {
        return this._edgeMaterial;
    }

    /**
     Defines surface appearance when outlined.

     @property outlineMaterial
     @type OutlineMaterial
     */
    get outlineMaterial() {
        return this._outlineMaterial;
    }


    //------------------------------------------------------------------------------------------------------------------
    // Transform properties
    //------------------------------------------------------------------------------------------------------------------

    /**
     Local translation.

     @property position
     @default [0,0,0]
     @type {Float32Array}
     */
    set position(value) {
        this._position.set(value || [0, 0, 0]);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    get position() {
        return this._position;
    }

    /**
     Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.

     @property rotation
     @default [0,0,0]
     @type {Float32Array}
     */
    set rotation(value) {
        this._rotation.set(value || [0, 0, 0]);
        math.eulerToQuaternion(this._rotation, "XYZ", this._quaternion);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    get rotation() {
        return this._rotation;
    }

    /**
     Local rotation quaternion.

     @property quaternion
     @default [0,0,0, 1]
     @type {Float32Array}
     */
    set quaternion(value) {
        this._quaternion.set(value || [0, 0, 0, 1]);
        math.quaternionToEuler(this._quaternion, "XYZ", this._rotation);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    get quaternion() {
        return this._quaternion;
    }

    /**
     Local scale.

     @property scale
     @default [1,1,1]
     @type {Float32Array}
     */
    set scale(value) {
        this._scale.set(value || [1, 1, 1]);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    get scale() {
        return this._scale;
    }

    /**
     * Local matrix.
     *
     * @property matrix
     * @default [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
     * @type {Float32Array}
     */
    set matrix(value) {
        if (!this.__localMatrix) {
            this.__localMatrix = math.identityMat4();
        }
        this.__localMatrix.set(value || identityMat);
        math.decomposeMat4(this.__localMatrix, this._position, this._quaternion, this._scale);
        this._localMatrixDirty = false;
        this._setWorldMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    get matrix() {
        if (this._localMatrixDirty) {
            if (!this.__localMatrix) {
                this.__localMatrix = math.identityMat4();
            }
            math.composeMat4(this._position, this._quaternion, this._scale, this.__localMatrix);
            this._localMatrixDirty = false;
        }
        return this.__localMatrix;
    }

    /**
     * The World matrix.
     *
     * @property worldMatrix
     * @type {Float32Array}
     */
    get worldMatrix() {
        if (this._worldMatrixDirty) {
            this._buildWorldMatrix();
        }
        return this._worldMatrix;
    }

    /**
     * This World normal matrix.
     *
     * @property worldNormalMatrix
     * @default [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
     * @type {Float32Array}
     */
    get worldNormalMatrix() {
        if (this._worldNormalMatrixDirty) {
            this._buildWorldNormalMatrix();
        }
        return this._worldNormalMatrix;
    }


    /**
     Rotates about the given local axis by the given increment.

     @method rotate
     @param {Float32Array} axis Local axis about which to rotate.
     @param {Number} angle Angle increment in degrees.
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
        this._setAABBDirty();
        this.glRedraw();
        return this;
    }

    /**
     Rotates about the given World-space axis by the given increment.

     @method rotate
     @param {Float32Array} axis Local axis about which to rotate.
     @param {Number} angle Angle increment in degrees.
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
     Rotates about the local X-axis by the given increment.

     @method rotateX
     @param {Number} angle Angle increment in degrees.
     */
    rotateX(angle) {
        return this.rotate(xAxis, angle);
    }

    /**
     Rotates about the local Y-axis by the given increment.

     @method rotateY
     @param {Number} angle Angle increment in degrees.
     */
    rotateY(angle) {
        return this.rotate(yAxis, angle);
    }

    /**
     Rotates about the local Z-axis by the given increment.

     @method rotateZ
     @param {Number} angle Angle increment in degrees.
     */
    rotateZ(angle) {
        return this.rotate(zAxis, angle);
    }

    /**
     Translates along local space vector by the given increment.

     @method translate
     @param {Float32Array} axis Normalized local space 3D vector along which to translate.
     @param {Number} distance Distance to translate along  the vector.
     */
    translate(axis, distance) {
        math.vec3ApplyQuaternion(this.quaternion, axis, veca);
        math.mulVec3Scalar(veca, distance, vecb);
        math.addVec3(this.position, vecb, this.position);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
        return this;
    }

    /**
     Translates along the local X-axis by the given increment.

     @method translateX
     @param {Number} distance Distance to translate along  the X-axis.
     */
    translateX(distance) {
        return this.translate(xAxis, distance);
    }

    /**
     * Translates along the local Y-axis by the given increment.
     *
     * @method translateX
     * @param {Number} distance Distance to translate along  the Y-axis.
     */
    translateY(distance) {
        return this.translate(yAxis, distance);
    }

    /**
     Translates along the local Z-axis by the given increment.

     @method translateX
     @param {Number} distance Distance to translate along  the Z-axis.
     */
    translateZ(distance) {
        return this.translate(zAxis, distance);
    }

    /**
     Optional ID to identify this Node as an {@link Object}.

     @property objectId
     @default null
     @type String
     @final
     */
    get objectId() {
        return this._objectId;
    }

    /**
     Optional ID to identify this Mesh as a {@link Model}.

     @property modelId
     @default null
     @type String
     @final
     */
    get modelId() {
        return this._modelId;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Boundary properties
    //------------------------------------------------------------------------------------------------------------------

    /**
     World-space 3D axis-aligned bounding box (AABB).

     Represented by a six-element Float32Array containing the min/max extents of the
     axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.

     @property aabb
     @final
     @type {Float32Array}
     */
    get aabb() {
        if (this._aabbDirty) {
            this._updateAABB();
        }
        return this._aabb;
    }

    /**
     World-space 3D center.

     @property center
     @final
     @type {Float32Array}
     */
    get center() {
        if (this._aabbDirty) {
            this._updateAABB();
        }
        return this._aabbCenter;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Rendering states
    //------------------------------------------------------------------------------------------------------------------

    /**
     Indicates if visible.

     The Mesh is only rendered when {@link Mesh#visible} is true and
     {@link Mesh#culled} is false.

     Each visible Mesh is registered in the {@link Scene}'s
     {@link Scene/visibleObjects} map when its {@link Mesh#objectId}
     is set to a value.

     @property visible
     @default true
     @type Boolean
     */
    set visible(visible) {
        visible = visible !== false;
        this._state.visible = visible;
        if (this._objectId) {
            this.scene._objectVisibilityUpdated(this, visible);
        }
        this.glRedraw();
    }

    get visible() {
        return this._state.visible;
    }

    /**
     Indicates if ghosted.

     The ghosted appearance is configured by {@link Mesh#ghostMaterial:property"}}ghostMaterial{{/crossLink}}.

     Each ghosted Mesh is registered in its {@link Scene}'s
     {@link Scene/ghostedObjects} map when its {@link Mesh#objectId}
     is set to a value.

     @property ghosted
     @default false
     @type Boolean
     */
    set ghosted(ghosted) {
        ghosted = !!ghosted;
        if (this._state.ghosted === ghosted) {
            return;
        }
        this._state.ghosted = ghosted;
        if (this._objectId) {
            this.scene._objectGhostedUpdated(this, ghosted);
        }
        this.glRedraw();
    }

    get ghosted() {
        return this._state.ghosted;
    }

    /**
     Indicates if highlighted.

     The highlight appearance is configured by {@link Mesh#highlightMaterial:property"}}highlightMaterial{{/crossLink}}.

     Each highlighted Mesh is registered in its {@link Scene}'s
     {@link Scene/highlightedObjects} map when its {@link Mesh#objectId}
     is set to a value.

     @property highlighted
     @default false
     @type Boolean
     */
    set highlighted(highlighted) {
        highlighted = !!highlighted;
        if (highlighted === this._state.highlighted) {
            return;
        }
        this._state.highlighted = highlighted;
        if (this._objectId) {
            this.scene._objectHighlightedUpdated(this, highlighted);
        }
        this.glRedraw();
    }

    get highlighted() {
        return this._state.highlighted;
    }

    /**
     Indicates if selected.

     The selected appearance is configured by {@link Mesh#selectedMaterial:property"}}selectedMaterial{{/crossLink}}.

     Each selected Mesh is registered in its {@link Scene}'s
     {@link Scene/selectedObjects} map when its {@link Mesh#objectId}
     is set to a value.

     @property selected
     @default false
     @type Boolean
     */
    set selected(selected) {
        selected = !!selected;
        if (selected === this._state.selected) {
            return;
        }
        this._state.selected = selected;
        if (this._objectId) {
            this.scene._objectSelectedUpdated(this, selected);
        }
        this.glRedraw();
    }

    get selected() {
        return this._state.selected;
    }

    /**
     Indicates if edges are shown.

     The edges appearance is configured by {@link Mesh#edgeMaterial:property"}}edgeMaterial{{/crossLink}}.

     @property edges
     @default false
     @type Boolean
     */
    set edges(edges) {
        edges = !!edges;
        if (edges === this._state.edges) {
            return;
        }
        this._state.edges = edges;
        this.glRedraw();
    }

    get edges() {
        return this._state.edges;
    }

    /**
     Indicates if culled from view.

     The Mesh is only rendered when {@link Mesh#visible} is true and
     {@link Mesh#culled} is false.

     @property culled
     @default false
     @type Boolean
     */
    set culled(value) {
        this._state.culled = !!value;
        this.glRedraw();
    }

    get culled() {
        return this._state.culled;
    }

    /**
     Indicates if pickable.

     When false, the Mesh will never be picked by calls to the {@link Scene/pick:method"}}Scene pick(){{/crossLink}} method, and picking will happen as "through" the Mesh, to attempt to pick whatever lies on the other side of it.

     @property pickable
     @default true
     @type Boolean
     */
    set pickable(value) {
        value = value !== false;
        if (this._state.pickable === value) {
            return;
        }
        this._state.pickable = value;
        // No need to trigger a render;
        // state is only used when picking
    }

    get pickable() {
        return this._state.pickable;
    }

    /**
     Indicates if clippable.

     When false, the {@link Scene}'s {@link Clips} will have no effect on the Mesh.

     @property clippable
     @default true
     @type Boolean
     */
    set clippable(value) {
        value = value !== false;
        if (this._state.clippable === value) {
            return;
        }
        this._state.clippable = value;
        this.glRedraw();
        if (this._state.castShadow) {
            this.glRedraw();
        }
    }

    get clippable() {
        return this._state.clippable;
    }

    /**
     Indicates if included in boundary calculations.

     When false, this Mesh will not be included in the bounding boxes provided by parent components.

     @property collidable
     @default true
     @type Boolean
     */
    set collidable(value) {
        value = value !== false;
        if (value === this._state.collidable) {
            return;
        }
        this._state.collidable = value;
    }

    get collidable() {
        return this._state.collidable;
    }

    /**
     Indicates if casting shadows.

     @property castShadow
     @default true
     @type Boolean
     */
    set castShadow(value) {
        value = value !== false;
        if (value === this._state.castShadow) {
            return;
        }
        this._state.castShadow = value;
        this.glRedraw();
    }

    get castShadow() {
        return this._state.castShadow;
    }

    /**
     Indicates if receiving shadows.

     @property receiveShadow
     @default true
     @type Boolean
     */
    set receiveShadow(value) {
        this._state.receiveShadow = false; // Disables shadows for now
        // value = value !== false;
        // if (value === this._state.receiveShadow) {
        //     return;
        // }
        // this._state.receiveShadow = value;
        // this._state.hash = value ? "/mod/rs;" : "/mod;";
        // this.fire("dirty", this); // Now need to (re)compile objectRenderers to include/exclude shadow mapping
    }

    get receiveShadow() {
        return this._state.receiveShadow;
    }

    /**
     Indicates if rendered with an outline.

     The outline appearance is configured by {@link Mesh#outlineMaterial:property"}}outlineMaterial{{/crossLink}}.

     @property outlined
     @default false
     @type Boolean
     */
    set outlined(value) {
        value = !!value;
        if (value === this._state.outlined) {
            return;
        }
        this._state.outlined = value;
        this.glRedraw();
    }

    get outlined() {
        return this._state.outlined;
    }

    /**
     RGB colorize color, multiplies by the rendered fragment colors.

     @property colorize
     @default [1.0, 1.0, 1.0]
     @type Float32Array
     */
    set colorize(value) {
        let colorize = this._state.colorize;
        if (!colorize) {
            colorize = this._state.colorize = new Float32Array(4);
            colorize[3] = 1;
        }
        if (value) {
            colorize[0] = value[0];
            colorize[1] = value[1];
            colorize[2] = value[2];
        } else {
            colorize[0] = 1;
            colorize[1] = 1;
            colorize[2] = 1;
        }
        this.glRedraw();
    }

    get colorize() {
        return this._state.colorize;
    }

    /**
     Opacity factor, multiplies by the rendered fragment alpha.

     This is a factor in range ````[0..1]````.

     @property opacity
     @default 1.0
     @type Number
     */
    set opacity(opacity) {
        let colorize = this._state.colorize;
        if (!colorize) {
            colorize = this._state.colorize = new Float32Array(4);
            colorize[0] = 1;
            colorize[1] = 1;
            colorize[2] = 1;
        }
        colorize[3] = opacity !== null && opacity !== undefined ? opacity : 1.0;
        this.glRedraw();
    }

    get opacity() {
        return this._state.colorize[3];
    }

    /**
     Returns whether or not this Mesh is transparent.
     @returns {boolean}
     */
    get transparent() {
        return this._material.alphaMode === 2 /* blend */ || this._state.colorize[3] < 1
    }

    /**
     The rendering order.

     This can be set on multiple transparent Meshes, to make them render in a specific order
     for correct alpha blending.

     @property layer
     @default 0
     @type Number
     */
    set layer(value) {
        // TODO: Only accept rendering layer in range [0...MAX_layer]
        value = value || 0;
        value = Math.round(value);
        if (value === this._state.layer) {
            return;
        }
        this._state.layer = value;
        this._renderer.needStateSort();
    }

    get layer() {
        return this._state.layer;
    }

    /**
     Indicates if the position is stationary.

     When true, will disable the effect of {@link Lookat"}}view transform{{/crossLink}}
     translations for this Mesh, while still allowing it to rotate. This is useful for skybox Meshes.

     @property stationary
     @default false
     @type Boolean
     @final
     */
    get stationary() {
        return this._state.stationary;
    }

    /**
     Indicates the billboarding behaviour.

     Options are:

     * **"none"** -  **(default)** - No billboarding.
     * **"spherical"** - Mesh is billboarded to face the viewpoint, rotating both vertically and horizontally.
     * **"cylindrical"** - Mesh is billboarded to face the viewpoint, rotating only about its vertically
     axis. Use this mode for things like trees on a landscape.

     @property billboard
     @default "none"
     @type String
     @final
     */
    get billboard() {
        return this._state.billboard;
    }

    /**
     Property with final value ````true```` to indicate that xeokit should render this Mesh Drawable in sorted order, relative to
     other Mesh Drawables of the same class.

     The sort order is determined by the Mesh's {@link Mesh#stateSortCompare:methd"}}Mesh#stateSortCompare(){{/crossLink}} method.

     Sorting is essential for rendering performance, so that xeokit is able to avoid applying runs of the same state changes
     to the GPU, ie. can collapse them.

     @property isStateSortable
     @returns {boolean}
     */
    get isStateSortable() {
        return true;
    }

    /**
     Comparison function used by the renderer to determine the order in which xeokit should render the Mesh,
     relative to to other Meshes.

     The renderer requires this because Mesh defines
     {@link Mesh#isStateSortable:property"}}Drawable#isStateSortable{{/crossLink}}, which returns true.

     Sorting is essential for rendering performance, so that xeokit is able to avoid needlessly applying runs of the same
     rendering state changes to the GPU, ie. can collapse them.

     @method stateSortCompare
     @param {Mesh} mesh1
     @param {Mesh} mesh2
     @returns {number}
     */
    stateSortCompare(mesh1, mesh2) {
        return (mesh1._state.layer - mesh2._state.layer)
            || (mesh1._drawRenderer.id - mesh2._drawRenderer.id) // Program state
            || (mesh1._material._state.id - mesh2._material._state.id) // Material state
            || (mesh1._vertexBufs.id - mesh2._vertexBufs.id)  // Shared vertex bufs
            || (mesh1._geometry._state.id - mesh2._geometry._state.id); // Geometry state
    }

    /**
     *  Called by xeokit, when about to render this Mesh Drawable, to get flags indicating what rendering effects to apply for it.
     *
     * @method getRenderFlags
     * @param {RenderFlags} renderFlags Returns the rendering flags.
     */
    getRenderFlags(renderFlags) {

        renderFlags.reset();

        const state = this._state;

        if (state.ghosted) {
            const ghostMaterial = this._ghostMaterial._state;
            if (ghostMaterial.fill) {
                if (ghostMaterial.fillAlpha < 1.0) {
                    renderFlags.ghostedFillTransparent = true;
                } else {
                    renderFlags.ghostedFillOpaque = true;
                }
            }
            if (ghostMaterial.edges) {
                if (ghostMaterial.edgeAlpha < 1.0) {
                    renderFlags.ghostedEdgesTransparent = true;
                } else {
                    renderFlags.ghostedEdgesOpaque = true;
                }
            }
        } else {
            const normalMaterial = this._material._state;
            if (normalMaterial.alpha < 1.0 || state.colorize[3] < 1.0) {
                renderFlags.normalFillTransparent = true;
            } else {
                renderFlags.normalFillOpaque = true;
            }
            if (state.edges) {
                const edgeMaterial = this._edgeMaterial._state;
                if (edgeMaterial.alpha < 1.0) {
                    renderFlags.normalEdgesTransparent = true;
                } else {
                    renderFlags.normalEdgesOpaque = true;
                }
            }
            if (state.selected) {
                const selectedMaterial = this._selectedMaterial._state;
                if (selectedMaterial.fill) {
                    if (selectedMaterial.fillAlpha < 1.0) {
                        renderFlags.selectedFillTransparent = true;
                    } else {
                        renderFlags.selectedFillOpaque = true;
                    }
                }
                if (selectedMaterial.edges) {
                    if (selectedMaterial.edgeAlpha < 1.0) {
                        renderFlags.selectedEdgesTransparent = true;
                    } else {
                        renderFlags.selectedEdgesOpaque = true;
                    }
                }
            } else if (state.highlighted) {
                const highlightMaterial = this._highlightMaterial._state;
                if (highlightMaterial.fill) {
                    if (highlightMaterial.fillAlpha < 1.0) {
                        renderFlags.highlightedFillTransparent = true;
                    } else {
                        renderFlags.highlightedFillOpaque = true;
                    }
                }
                if (highlightMaterial.edges) {
                    if (highlightMaterial.edgeAlpha < 1.0) {
                        renderFlags.highlightedEdgesTransparent = true;
                    } else {
                        renderFlags.highlightedEdgesOpaque = true;
                    }
                }
            }
        }
    }

    //-- NORMAL --------------------------------------------------------------------------------------------------------

    drawNormalFillOpaque(frameCtx) {
        if (this._drawRenderer || (this._drawRenderer = DrawRenderer.get(this))) {
            this._drawRenderer.drawMesh(frameCtx, this);
        }
    }

    drawNormalEdgesOpaque(frameCtx) {
        if (this._emphasisEdgesRenderer || (this._emphasisEdgesRenderer = EmphasisEdgesRenderer.get(this))) {
            this._emphasisEdgesRenderer.drawMesh(frameCtx, this, 3); // 3 == edges
        }
    }

    drawNormalFillTransparent(frameCtx) {
        if (this._drawRenderer || (this._drawRenderer = DrawRenderer.get(this))) {
            this._drawRenderer.drawMesh(frameCtx, this);
        }
    }

    drawNormalEdgesTransparent(frameCtx) {
        if (this._emphasisEdgesRenderer || (this._emphasisEdgesRenderer = EmphasisEdgesRenderer.get(this))) {
            this._emphasisEdgesRenderer.drawMesh(frameCtx, this, 3); // 3 == edges
        }
    }

    //-- GHOSTED--------------------------------------------------------------------------------------------------------

    drawGhostedFillOpaque(frameCtx) {
        if (this._emphasisFillRenderer || (this._emphasisFillRenderer = EmphasisFillRenderer.get(this))) {
            this._emphasisFillRenderer.drawMesh(frameCtx, this, 0); // 0 == ghost
        }
    }

    drawGhostedEdgesOpaque(frameCtx) {
        if (this._emphasisEdgesRenderer || (this._emphasisEdgesRenderer = EmphasisEdgesRenderer.get(this))) {
            this._emphasisEdgesRenderer.drawMesh(frameCtx, this, 0); // 0 == ghost
        }
    }

    drawGhostedFillTransparent(frameCtx) {
        if (this._emphasisFillRenderer || (this._emphasisFillRenderer = EmphasisFillRenderer.get(this))) {
            this._emphasisFillRenderer.drawMesh(frameCtx, this, 0); // 0 == ghost
        }
    }

    drawGhostedEdgesTransparent(frameCtx) {
        if (this._emphasisEdgesRenderer || (this._emphasisEdgesRenderer = EmphasisEdgesRenderer.get(this))) {
            this._emphasisEdgesRenderer.drawMesh(frameCtx, this, 0); // 0 == ghost
        }
    }

    //-- HIGHLIGHTED ---------------------------------------------------------------------------------------------------

    drawHighlightedFillOpaque(frameCtx) {
        if (this._emphasisFillRenderer || (this._emphasisFillRenderer = EmphasisFillRenderer.get(this))) {
            this._emphasisFillRenderer.drawMesh(frameCtx, this, 1); // 1 == highlight
        }
    }

    drawHighlightedEdgesOpaque(frameCtx) {
        if (this._emphasisEdgesRenderer || (this._emphasisEdgesRenderer = EmphasisEdgesRenderer.get(this))) {
            this._emphasisEdgesRenderer.drawMesh(frameCtx, this, 1); // 1 == highlight
        }
    }

    drawHighlightedFillTransparent(frameCtx) {
        if (this._emphasisFillRenderer || (this._emphasisFillRenderer = EmphasisFillRenderer.get(this))) {
            this._emphasisFillRenderer.drawMesh(frameCtx, this, 1); // 1 == highlight
        }
    }

    drawHighlightedEdgesTransparent(frameCtx) {
        if (this._emphasisEdgesRenderer || (this._emphasisEdgesRenderer = EmphasisEdgesRenderer.get(this))) {
            this._emphasisEdgesRenderer.drawMesh(frameCtx, this, 1); // 1 == highlight
        }
    }

    //-- SELECTED ------------------------------------------------------------------------------------------------------

    drawSelectedFillOpaque(frameCtx) {
        if (this._emphasisFillRenderer || (this._emphasisFillRenderer = EmphasisFillRenderer.get(this))) {
            this._emphasisFillRenderer.drawMesh(frameCtx, this, 2); // 2 == selected
        }
    }

    drawSelectedEdgesOpaque(frameCtx) {
        if (this._emphasisEdgesRenderer || (this._emphasisEdgesRenderer = EmphasisEdgesRenderer.get(this))) {
            this._emphasisEdgesRenderer.drawMesh(frameCtx, this, 2); // 2 == selected
        }
    }

    drawSelectedFillTransparent(frameCtx) {
        if (this._emphasisFillRenderer || (this._emphasisFillRenderer = EmphasisFillRenderer.get(this))) {
            this._emphasisFillRenderer.drawMesh(frameCtx, this, 2); // 2 == selected
        }
    }

    drawSelectedEdgesTransparent(frameCtx) {
        if (this._emphasisEdgesRenderer || (this._emphasisEdgesRenderer = EmphasisEdgesRenderer.get(this))) {
            this._emphasisEdgesRenderer.drawMesh(frameCtx, this, 2); // 2 == selected
        }
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    drawPickMesh(frameCtx) {
        if (this._pickMeshRenderer || (this._pickMeshRenderer = PickMeshRenderer.get(this))) {
            this._pickMeshRenderer.drawMesh(frameCtx, this);
        }
    }

    drawPickTriangles(frameCtx) {
        if (this._pickTriangleRenderer || (this._pickTriangleRenderer = PickTriangleRenderer.get(this))) {
            this._pickTriangleRenderer.drawMesh(frameCtx, this);
        }
    }

    drawPickVertices(frameCtx) {
        if (this._pickVertexRenderer || (this._pickVertexRenderer = PickVertexRenderer.get(this))) {
            this._pickVertexRenderer.drawMesh(frameCtx, this);
        }
    }

    /**
     Given a {@link PickResult} that contains a
     {@link PickResult/primIndex}, which indicates that a primitive was picked
     on the Mesh, then add more information to the PickResult about the picked position on the surface of the Mesh.

     This method is part of the {@link Drawable} contract, and is documented here for reference
     in case you're plugging your own Drawable components into xeokit.

     Architecturally, this delegates collection of that Drawable-specific info to the Drawable, allowing it to
     provide whatever info it's able to.

     @method getPickResult
     @param {PickResult} pickResult The PickResult to augment with pick intersection information specific to this Mesh.
     @param [pickResult.primIndex] Index of the primitive that was picked on this Mesh. Essential for obtaining the intersection information.
     @param [pickResult.canvasPos] Canvas coordinates, provided when picking through the Canvas.
     @param [pickResult.origin] World-space 3D ray origin, when ray picking.
     @param [pickResult.direction] World-space 3D ray direction, provided when ray picking.
     */
    getPickResult(pickResult) {
        getPickResult(this, pickResult);
    }

    _putDrawRenderers() {
        if (this._drawRenderer) {
            this._drawRenderer.put();
            this._drawRenderer = null;
        }
        if (this._shadowRenderer) {
            this._shadowRenderer.put();
            this._shadowRenderer = null;
        }
        if (this._emphasisFillRenderer) {
            this._emphasisFillRenderer.put();
            this._emphasisFillRenderer = null;
        }
        if (this._emphasisEdgesRenderer) {
            this._emphasisEdgesRenderer.put();
            this._emphasisEdgesRenderer = null;
        }
        if (this._outlineRenderer) {
            this._outlineRenderer.put();
            this._outlineRenderer = null;
        }
    }

    _putPickRenderers() {
        if (this._pickMeshRenderer) {
            this._pickMeshRenderer.put();
            this._pickMeshRenderer = null;
        }
        if (this._pickTriangleRenderer) {
            this._pickTriangleRenderer.put();
            this._pickTriangleRenderer = null;
        }
        if (this._pickVertexRenderer) {
            this._pickVertexRenderer.put();
            this._pickVertexRenderer = null;
        }
    }

    /**
     * @method destroy
     */
    destroy() {
        super.destroy(); // xeokit.Object
        this._putDrawRenderers();
        this._putPickRenderers();
        this.scene._renderer.putPickID(this._state.pickID); // TODO: somehow puch this down into xeokit framework?
        this.glRedraw();
    }
}

export {Mesh};