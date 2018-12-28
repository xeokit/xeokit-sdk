import {utils} from '../utils.js';
import {Component} from '../Component.js';
import {Mesh} from './../mesh/Mesh.js';
import {AABBGeometry} from '../geometry/AABBGeometry.js';
import {PhongMaterial} from '../materials/PhongMaterial.js';
import {math} from '../math/math.js';

const angleAxis = new Float32Array(4);
const q1 = new Float32Array(4);
const q2 = new Float32Array(4);
const xAxis = new Float32Array([1, 0, 0]);
const yAxis = new Float32Array([0, 1, 0]);
const zAxis = new Float32Array([0, 0, 1]);

const veca = new Float32Array(3);
const vecb = new Float32Array(3);

const identityMat = math.identityMat4();

/**
 A scene graph node within a {@link Viewer}'s {@link Scene}.

 @class Node
 */
class Node extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "Node";
    }

    /**
     * @private
     */
    get isNode() {
        return true;
    }

    /**
     @constructor

     @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
     @param {*} [cfg] Configs
     @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     @param [cfg.guid] {String} Optional globally unique identifier. This is unique not only within the {@link Scene}, but throughout the entire universe.
     @param {String:Object} [cfg.meta] Optional map of user-defined metadata.
     @param [cfg.objectId] {String} Optional object ID.
     @param [cfg.parent] {Node} The parent.
     @param [cfg.position=[0,0,0]] {Float32Array} Local 3D position.
     @param [cfg.scale=[1,1,1]] {Float32Array} Local scale.
     @param [cfg.rotation=[0,0,0]] {Float32Array} Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     @param [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] {Float32Array} Local modelling transform matrix. Overrides the position, scale and rotation parameters.
     @param [cfg.visible=true] {Boolean}        Indicates if visible.
     @param [cfg.culled=false] {Boolean}        Indicates if culled from view.
     @param [cfg.pickable=true] {Boolean}       Indicates if pickable.
     @param [cfg.clippable=true] {Boolean}      Indicates if clippable.
     @param [cfg.collidable=true] {Boolean}     Indicates if included in boundary calculations.
     @param [cfg.castShadow=true] {Boolean}     Indicates if casting shadows.
     @param [cfg.receiveShadow=true] {Boolean}  Indicates if receiving shadows.
     @param [cfg.outlined=false] {Boolean}      Indicates if outline is rendered.
     @param [cfg.ghosted=false] {Boolean}       Indicates if ghosted.
     @param [cfg.highlighted=false] {Boolean}   Indicates if highlighted.
     @param [cfg.selected=false] {Boolean}      Indicates if selected.
     @param [cfg.edges=false] {Boolean}         Indicates if edges are emphasized.
     @param [cfg.aabbVisible=false] {Boolean}   Indicates if axis-aligned World-space bounding box is visible.
     @param [cfg.colorize=[1.0,1.0,1.0]] {Float32Array}  RGB colorize color, multiplies by the rendered fragment colors.
     @param [cfg.opacity=1.0] {Number}          Opacity factor, multiplies by the rendered fragment alpha.
     @param [cfg.children] {Array(Node)}      Children to add. Children must be in the same {@link Scene} and will be removed from whatever parents they may already have.
     @param [cfg.inheritStates=true] {Boolean}  Indicates if children given to this constructor should inherit state from this parent as they are added. RenderState includes {@link Node/visible}, {@link Node/culled}, {@link Node/pickable},
     {@link Node/clippable}, {@link Node/castShadow}, {@link Node/receiveShadow},
     {@link Node/outlined}, {@link Node/ghosted}, {@link Node/highlighted},
     {@link Node/selected}, {@link Node/colorize} and {@link Node/opacity}.

     */

    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._parent = null;
        this._childList = [];
        this._childMap = {};
        this._childIDs = null;

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

        // Add children, which inherit state from this Node

        if (cfg.children) {
            const children = cfg.children;
            for (let i = 0, len = children.length; i < len; i++) {
                this.addChild(children[i], cfg.inheritStates);
            }
        }

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
    }

    _setLocalMatrixDirty() {
        this._localMatrixDirty = true;
        this._setWorldMatrixDirty();
    }

    _setWorldMatrixDirty() {
        this._worldMatrixDirty = true;
        this._worldNormalMatrixDirty = true;
        if (this._childList) {
            for (let i = 0, len = this._childList.length; i < len; i++) {
                this._childList[i]._setWorldMatrixDirty();
            }
        }
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

    _setSubtreeAABBsDirty(object) {
        object._aabbDirty = true;
        object.fire("boundary", true);
        if (object._childList) {
            for (let i = 0, len = object._childList.length; i < len; i++) {
                this._setSubtreeAABBsDirty(object._childList[i]);
            }
        }
    }

    _setAABBDirty() {
        this._setSubtreeAABBsDirty(this);
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
        if (this._buildAABB) {
            this._buildAABB(this.worldMatrix, this._aabb); // Mesh or BigModel
        } else { // Node | Node | Model
            math.collapseAABB3(this._aabb);
            let object;
            for (let i = 0, len = this._childList.length; i < len; i++) {
                object = this._childList[i];
                if (!object.collidable) {
                    continue;
                }
                math.expandAABB3(this._aabb, object.aabb);
            }
            if (!this._aabbCenter) {
                this._aabbCenter = new Float32Array(3);
            }
            math.getAABB3Center(this._aabb, this._aabbCenter);
        }
        this._aabbDirty = false;
    }

    /**
     Adds a child {@link Node}.

     The child must be a {@link Node} in the same {@link Scene}.

     If the child already has a parent, will be removed from that parent first.

     Does nothing if already a child.

     @param {Node|String} child Instance or ID of the child to add.
     @param [inheritStates=false] Indicates if the child should inherit state from this parent as it is added. RenderState includes
     {@link Node/visible}, {@link Node/culled}, {@link Node/pickable},
     {@link Node/clippable}, {@link Node/castShadow}, {@link Node/receiveShadow},
     {@link Node/outlined}, {@link Node/ghosted}, {@link Node/highlighted},
     {@link Node/selected}, {@link Node/edges}, {@link Node/colorize} and {@link Node/opacity}.
     @returns {Node} The child.
     */
    addChild(child, inheritStates) {
        if (utils.isNumeric(child) || utils.isString(child)) {
            const nodeId = child;
            child = this.scene.component[nodeId];
            if (!child) {
                this.warn("Component not found: " + utils.inQuotes(nodeId));
                return;
            }
            if (!child.isNode && !child.isMesh) {
                this.error("Not a Node or Mesh: " + nodeId);
                return;
            }
        } else {
            if (!child.isNode && !child.isMesh) {
                this.error("Not a Node or Mesh: " + child.id);
                return;
            }
            if (child._parent) {
                if (child._parent.id === this.id) {
                    this.warn("Already a child: " + child.id);
                    return;
                }
                child._parent.removeChild(child);
            }
        }
        const id = child.id;
        if (child.scene.id !== this.scene.id) {
            this.error("Child not in same Scene: " + child.id);
            return;
        }
        this._childList.push(child);
        this._childMap[child.id] = child;
        this._childIDs = null;
        child._parent = this;
        if (!!inheritStates) {
            child.visible = this.visible;
            child.culled = this.culled;
            child.ghosted = this.ghosted;
            child.highlited = this.highlighted;
            child.selected = this.selected;
            child.edges = this.edges;
            child.outlined = this.outlined;
            child.clippable = this.clippable;
            child.pickable = this.pickable;
            child.collidable = this.collidable;
            child.castShadow = this.castShadow;
            child.receiveShadow = this.receiveShadow;
            child.colorize = this.colorize;
            child.opacity = this.opacity;
        }
        child._setWorldMatrixDirty();
        child._setAABBDirty();
        return child;
    }

    /**
     Removes the given child.

     @method removeChild
     @param {Node} child Child to remove.
     */
    removeChild(child) {
        for (let i = 0, len = this._childList.length; i < len; i++) {
            if (this._childList[i].id === child.id) {
                child._parent = null;
                this._childList = this._childList.splice(i, 1);
                delete this._childMap[child.id];
                this._childIDs = null;
                child._setWorldMatrixDirty();
                child._setAABBDirty();
                this._setAABBDirty();
                return;
            }
        }
    }

    /**
     Removes all children.

     @method removeChildren
     */
    removeChildren() {
        let child;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            child = this._childList[i];
            child._parent = null;
            child._setWorldMatrixDirty();
            child._setAABBDirty();
        }
        this._childList = [];
        this._childMap = {};
        this._childIDs = null;
        this._setAABBDirty();
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
     Optional ID to identify this Node as a {@link Model}.

     @property modelId
     @default null
     @type String
     @final
     */
    get modelId() {
        return this._modelId;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Children and parent properties
    //------------------------------------------------------------------------------------------------------------------

    /**
     Number of child {@link Node}s.

     @property numChildren
     @final
     @type Number
     */
    get numChildren() {
        return this._childList.length;
    }

    /**
     Array of child {@link Node}s.

     @property children
     @final
     @type Array
     */
    get children() {
        return this._childList;
    }

    /**
     Child {@link Node}s mapped to their IDs.

     @property childMap
     @final
     @type {*}
     */
    get childMap() {
        return this._childMap;
    }

    /**
     IDs of child {@link Node}s.

     @property childIDs
     @final
     @type Array
     */
    get childIDs() {
        if (!this._childIDs) {
            this._childIDs = Object.keys(this._childMap);
        }
        return this._childIDs;
    }

    /**
     The parent.

     The parent Node may also be set by passing the Node to the
     Node/Model's {@link Node/addChild:method"}}addChild(){{/crossLink}} method.

     @property parent
     @type Node
     */
    set parent(node) {
        if (utils.isNumeric(node) || utils.isString(node)) {
            const nodeId = node;
            node = this.scene.components[nodeId];
            if (!node) {
                this.warn("Node not found: " + utils.inQuotes(nodeId));
                return;
            }
            if (!node.isNode) {
                this.error("Not a Node: " + node.id);
                return;
            }
        }
        if (node.scene.id !== this.scene.id) {
            this.error("Node not in same Scene: " + node.id);
            return;
        }
        if (this._parent && this._parent.id === node.id) {
            this.warn("Already a child of Node: " + node.id);
            return;
        }
        node.addChild(this);
    }

    get parent() {
        return this._parent;
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

    // worldPosition: {
    //     get: function (optionalTarget) {
    //         var result = optionalTarget || new Vector3();
    //         this.updateMatrixWorld(true);
    //         return result.setFromMatrixPosition(this.matrixWorld);
    //     }
    // },
    //
    // worldQuaternion: {
    //     get: function () {
    //         var position = new Vector3();
    //         var scale = new Vector3();
    //         return function getWorldQuaternion(optionalTarget) {
    //             var result = optionalTarget || new Quaternion();
    //             this.updateMatrixWorld(true);
    //             this.matrixWorld.decompose(position, result, scale);
    //             return result;
    //         };
    //     }()
    // },
    //
    // worldRotation: {
    //     get: function () {
    //         var quaternion = new Quaternion();
    //         return function getWorldRotation(optionalTarget) {
    //             var result = optionalTarget || new Euler();
    //             this.getWorldQuaternion(quaternion);
    //             return result.setFromQuaternion(quaternion, this.rotation.order, false)
    //         };
    //     }
    // }(),
    //
    // worldScale: {
    //     get: (function () {
    //         var position = new Float32Array(3);
    //         var quaternion = new Float32Array(4);
    //         return function getWorldScale(optionalTarget) {
    //             var result = optionalTarget || new Float32Array(3);
    //             math.decomposeMat4(this.worldMatrix, position, quaternion, result);
    //             return result;
    //         };
    //     })()
    // },
    //
    // worldDirection: {
    //     get: (function () {
    //         var quaternion = new Quaternion();
    //         return function getWorldDirection(optionalTarget) {
    //             var result = optionalTarget || new Vector3();
    //             this.getWorldQuaternion(quaternion);
    //             return result.set(0, 0, 1).applyQuaternion(quaternion);
    //         };
    //     })()
    // },

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

    /**
     Indicates if visible.

     Only rendered when {@link Node/visible} is true and
     {@link Node/culled} is false.

     Each visible Node is registered in its {@link Scene}'s
     {@link Scene#visibleObjects} map while its {@link Node/objectId}
     is set to a value.

     @property visible
     @default true
     @type Boolean
     */
    set visible(visible) {
        visible = visible !== false;
        this._visible = visible;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].visible = visible;
        }
        if (this._objectId) {
            this.scene._objectVisibilityUpdated(this, visible);
        }
    }

    get visible() {
        return this._visible;
    }

    /**
     Indicates if highlighted.

     Each highlighted Node is registered in its {@link Scene}'s
     {@link Scene#highlightedObjects} map while its {@link Node/objectId}
     is set to a value.

     @property highlighted
     @default false
     @type Boolean
     */
    set highlighted(highlighted) {
        highlighted = !!highlighted;
        this._highlighted = highlighted;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].highlighted = highlighted;
        }
        if (this._objectId) {
            this.scene._objectHighlightedUpdated(this, highlighted);
        }
    }

    get highlighted() {
        return this._highlighted;
    }

    /**
     Indicates if ghosted.

     Each ghosted Node is registered in its {@link Scene}'s
     {@link Scene#ghostedObjects} map while its {@link Node/objectId}
     is set to a value.

     @property ghosted
     @default false
     @type Boolean
     */
    set ghosted(ghosted) {
        ghosted = !!ghosted;
        this._ghosted = ghosted;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].ghosted = ghosted;
        }
        if (this._objectId) {
            this.scene._objectGhostedUpdated(this, ghosted);
        }
    }

    get ghosted() {
        return this._ghosted;
    }

    /**
     Indicates if selected.

     Each selected Node is registered in its {@link Scene}'s
     {@link Scene#selectedObjects} map while its {@link Node/objectId}
     is set to a value.

     @property selected
     @default false
     @type Boolean
     */
    set selected(selected) {
        selected = !!selected;
        this._selected = selected;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].selected = selected;
        }
        if (this._objectId) {
            this.scene._objectSelectedUpdated(this, selected);
        }
    }

    get selected() {
        return this._selected;
    }

    /**
     Indicates if edges are emphasized.

     @property edges
     @default false
     @type Boolean
     */
    set edges(edges) {
        edges = !!edges;
        this._edges = edges;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].edges = edges;
        }
    }

    get edges() {
        return this._edges;
    }

    /**
     Indicates if culled from view.

     Only rendered when {@link Node/visible} is true and
     {@link Node/culled} is false.

     @property culled
     @default false
     @type Boolean
     */
    set culled(culled) {
        culled = !!culled;
        this._culled = culled;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].culled = culled;
        }
    }

    get culled() {
        return this._culled;
    }

    /**
     Indicates if clippable.

     Clipping is done by the {@link Clip} components in {@link Scene#clips}.

     @property clippable
     @default true
     @type Boolean
     */
    set clippable(clippable) {
        clippable = clippable !== false;
        this._clippable = clippable;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].clippable = clippable;
        }
    }

    get clippable() {
        return this._clippable;
    }

    /**
     Indicates if included in boundary calculations.

     @property collidable
     @default true
     @type Boolean
     */
    set collidable(collidable) {
        collidable = collidable !== false;
        this._collidable = collidable;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].collidable = collidable;
        }
    }

    get collidable() {
        return this._collidable;
    }

    /**
     Whether or not to allow picking.

     Picking is done via calls to {@link Scene#pick}.

     @property pickable
     @default true
     @type Boolean
     */
    set pickable(pickable) {
        pickable = pickable !== false;
        this._pickable = pickable;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].pickable = pickable;
        }
    }

    get pickable() {
        return this._pickable;
    }

    /**
     RGB colorize color, multiplies by the rendered fragment color.

     @property colorize
     @default [1.0, 1.0, 1.0]
     @type Float32Array
     */
    set colorize(rgb) {
        let colorize = this._colorize;
        if (!colorize) {
            colorize = this._colorize = new Float32Array(4);
            colorize[3] = 1.0;
        }
        if (rgb) {
            colorize[0] = rgb[0];
            colorize[1] = rgb[1];
            colorize[2] = rgb[2];
        } else {
            colorize[0] = 1;
            colorize[1] = 1;
            colorize[2] = 1;
        }
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].colorize = colorize;
        }
    }

    get colorize() {
        return this._colorize.slice(0, 3);
    }

    /**
     Opacity factor, multiplies by the rendered fragment alpha.

     This is a factor in range ````[0..1]````.

     @property opacity
     @default 1.0
     @type Number
     */
    set opacity(opacity) {
        let colorize = this._colorize;
        if (!colorize) {
            colorize = this._colorize = new Float32Array(4);
            colorize[0] = 1;
            colorize[1] = 1;
            colorize[2] = 1;
        }
        colorize[3] = opacity !== null && opacity !== undefined ? opacity : 1.0;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].opacity = opacity;
        }
    }

    get opacity() {
        return this._colorize[3];
    }

    /**
     Indicates if outlined.

     @property outlined
     @default false
     @type Boolean
     */
    set outlined(outlined) {
        outlined = !!outlined;
        this._outlined = outlined;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].outlined = outlined;
        }
    }

    get outlined() {
        return this._outlined;
    }

    /**
     Indicates if casting shadows.

     @property castShadow
     @default true
     @type Boolean
     */
    set castShadow(castShadow) {
        castShadow = !!castShadow;
        this._castShadow = castShadow;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].castShadow = castShadow;
        }
    }

    get castShadow() {
        return this._castShadow;
    }

    /**
     Indicates if receiving shadows.

     @property receiveShadow
     @default true
     @type Boolean
     */
    set receiveShadow(receiveShadow) {
        receiveShadow = !!receiveShadow;
        this._receiveShadow = receiveShadow;
        for (let i = 0, len = this._childList.length; i < len; i++) {
            this._childList[i].receiveShadow = receiveShadow;
        }
    }

    get receiveShadow() {
        return this._receiveShadow;
    }

    /**
     Indicates if the 3D World-space axis-aligned bounding box (AABB) is visible.

     @property aabbVisible
     @default false
     @type {Boolean}
     */
    set aabbVisible(visible) {
        if (!visible && !this._aabbHelper) {
            return;
        }
        if (!this._aabbHelper) {
            this._aabbHelper = new Mesh(this, {
                geometry: new AABBGeometry(this, {
                    target: this
                }),
                material: new PhongMaterial(this, {
                    diffuse: [0.5, 1.0, 0.5],
                    emissive: [0.5, 1.0, 0.5],
                    lineWidth: 2
                })
            });
        }
        this._aabbHelper.visible = visible;
    }

    get aabbVisible() {
        return this._aabbHelper ? this._aabbHelper.visible : false;
    }

    destroy() {
        super.destroy();
        if (this._parent) {
            this._parent.removeChild(this);
        }
        if (this._objectId) {
            const scene = this.scene;
            scene._deregisterObject(this);
            if (this._visible) {
                scene._objectVisibilityUpdated(this, false);
            }
            if (this._ghosted) {
                scene._objectGhostedUpdated(this, false);
            }
            if (this._selected) {
                scene._objectSelectedUpdated(this, false);
            }
            if (this._highlighted) {
                scene._objectHighlightedUpdated(this, false);
            }
        }
        if (this._modelId) {
            const scene = this.scene;
            scene._deregisterModel(this);
        }
        if (this._childList.length) {
            // Clone the _childList before iterating it, so our children don't mess us up when calling removeChild().
            const tempChildList = this._childList.splice();
            let child;
            for (let i = 0, len = tempChildList.length; i < len; i++) {
                child = tempChildList[i];
                child.destroy();
            }
        }
        this._childList = [];
        this._childMap = {};
        this._childIDs = null;
        this._setAABBDirty();
        this.scene._aabbDirty = true;
    }
}

export {Node};
