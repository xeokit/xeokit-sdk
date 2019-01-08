import {utils} from '../utils.js';
import {Component} from '../Component.js';
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
 * @desc A scene graph node within a {@link Viewer}'s {@link Scene}.
 *
 * ## Nodes that Represent Models
 *
 * A Node represents a model when it has a {@link Node#modelId}, in which case it is also registered
 * by {@link Node#modelId} in {@link Scene#models}, and may also have a corresponding {@link MetaModel}.
 *
 * ## Nodes that Represent Objects
 *
 * A Node represents an object when it has an {@link Node#objectId}, in which case it is also registered
 * by {@link Node#objectId} in {@link Scene#objects}, and may also have a corresponding {@link MetaObject}.
 *
 * @implements {Entity}
 */
class Node extends Component {

    /**
     @constructor
     @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     @param {*} [cfg] Configs
     @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     @param {Number|String} [cfg.modelId] Model ID, given if this Node represents a model. When this property is defined, the Node will be registered by {@link Node#modelId} in {@link Scene#models} and may also have a corresponding {@link MetaModel}.
     @param {Number|String} [cfg.objectId] Object ID, given if this Node represents an object. When this property is defined, the Node will be registered by {@link Node#objectId} in {@link Scene#objects} and may also have a corresponding {@link MetaObject}.
     @param {Node} [cfg.parent] The parent Node.
     @param {Float32Array} [cfg.position=[0,0,0]] Local 3D position.
     @param {Float32Array} [cfg.scale=[1,1,1]] Local scale.
     @param {Float32Array} [cfg.rotation=[0,0,0]] Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     @param {Float32Array} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] Local modelling transform matrix. Overrides the position, scale and rotation parameters.
     @param {Boolean} [cfg.visible=true] Indicates if the Node is initially visible.
     @param {Boolean} [cfg.culled=false] Indicates if the Node is initially culled from view.
     @param {Boolean} [cfg.pickable=true] Indicates if the Node is initially pickable.
     @param {Boolean} [cfg.clippable=true] Indicates if the Node is initially clippable.
     @param {Boolean} [cfg.collidable=true] Indicates if the Node is initially included in boundary calculations.
     @param {Boolean} [cfg.castsShadow=true] Indicates if the Node initially casts shadows.
     @param {Boolean} [cfg.receivesShadow=true]  Indicates if the Node initially receives shadows.
     @param {Boolean} [cfg.ghosted=false] Indicates if the Node is initially ghosted.
     @param {Boolean} [cfg.highlighted=false] Indicates if the Node is initially highlighted.
     @param {Boolean} [cfg.selected=false] Indicates if the Mesh is initially selected.
     @param {Boolean} [cfg.edges=false] Indicates if the Node's edges are initially emphasized.
     @param {Float32Array} [cfg.colorize=[1.0,1.0,1.0]] Node's initial RGB colorize color, multiplies by the rendered fragment colors.
     @param {Number} [cfg.opacity=1.0] Node's initial opacity factor, multiplies by the rendered fragment alpha.
     @param {Array} [cfg.children] Child Nodes or {@link Mesh}es to add initially. Children must be in the same {@link Scene} and will be removed first from whatever parents they may already have.
     @param {Boolean} [cfg.inheritStates=true] Indicates if children given to this constructor should inherit rendering state from this parent as they are added. Rendering state includes {@link Node#visible}, {@link Node#culled}, {@link Node#pickable}, {@link Node#clippable}, {@link Node#castsShadow}, {@link Node#receivesShadow}, {@link Node#selected}, {@link Node#highlighted}, {@link Node#colorize} and {@link Node#opacity}.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._parentNode = null;
        this._children = [];

        this._aabb = null;
        this._aabbDirty = true;

        this.scene._aabbDirty = true;

        this._scale = math.vec3();
        this._quaternion = math.identityQuaternion();
        this._rotation = math.vec3();
        this._position = math.vec3();

        this._localMatrix = math.identityMat4();
        this._worldMatrix = math.identityMat4();

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

        if (cfg.modelId) {
            this._modelId = cfg.modelId;
            this.scene._registerModel(this);
        }

        if (cfg.objectId) {
            this._objectId = cfg.objectId;
            this.scene._registerObject(this);
        }

        this.visible = cfg.visible;
        this.culled = cfg.culled;
        this.pickable = cfg.pickable;
        this.clippable = cfg.clippable;
        this.collidable = cfg.collidable;
        this.castsShadow = cfg.castsShadow;
        this.receivesShadow = cfg.receivesShadow;
        this.ghosted = cfg.ghosted;
        this.highlighted = cfg.highlighted;
        this.selected = cfg.selected;
        this.edges = cfg.edges;
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

    //------------------------------------------------------------------------------------------------------------------
    // Entity members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that this Component is an Entity.
     * @type {Boolean}
     */
    get isEntity() {
        return true;
    }

    /**
     * Model ID, defined if this Node represents a model.
     *
     * When this returns a value, the Node will be registered by {@link Node#modelId} in {@link Scene#models} and may also have a corresponding {@link MetaModel}.
     *
     * @type {Number|String}
     */
    get modelId() {
        return this._modelId;
    }

    /**
     * Object ID, defined if this Node represents an object.
     *
     * When this returns a value, the Node will be registered by {@link Node#objectId} in {@link Scene#objects} and may also have a corresponding {@link MetaObject}.
     *
     * @type {Number|String}
     */
    get objectId() {
        return this._objectId;
    }

    /**
     * Gets the Node's World-space 3D axis-aligned bounding box.
     *
     * Represented by a six-element Float32Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Float32Array}
     */
    get aabb() {
        if (this._aabbDirty) {
            this._updateAABB();
        }
        return this._aabb;
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es are visible.
     *
     * Only rendered when {@link Node#visible} returns true and {@link Node#culled} returns false.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#visible} returns true the Node will be
     * registered by {@link Node#objectId} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    set visible(visible) {
        visible = visible !== false;
        this._visible = visible;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].visible = visible;
        }
        if (this._objectId) {
            this.scene._objectVisibilityUpdated(this, visible);
        }
    }

    /**
     * Gets if this Node is visible.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * Node is only rendered when {@link Node#visible} returns true and {@link Node#culled} returns false.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#visible} returns true the Node will be registered by {@link Node#objectId} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    get visible() {
        return this._visible;
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es are ghosted.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#ghosted} returns true the Node will be registered by {@link Node#objectId} in {@link Scene#ghostedObjects}.
     *
     * @type {Boolean}
     */
    set ghosted(ghosted) {
        ghosted = !!ghosted;
        this._ghosted = ghosted;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].ghosted = ghosted;
        }
        if (this._objectId) {
            this.scene._objectGhostedUpdated(this, ghosted);
        }
    }

    /**
     * Gets if this Node is ghosted.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#ghosted} returns true the Node will be registered by {@link Node#objectId} in {@link Scene#ghostedObjects}.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Boolean}
     */
    get ghosted() {
        return this._ghosted;
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es are highlighted.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#highlighted} returns true the Node will be registered by {@link Node#objectId} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     */
    set highlighted(highlighted) {
        highlighted = !!highlighted;
        this._highlighted = highlighted;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].highlighted = highlighted;
        }
        if (this._objectId) {
            this.scene._objectHighlightedUpdated(this, highlighted);
        }
    }

    /**
     * Gets if this Node is highlighted.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#highlighted} returns true the Node will be registered by {@link Node#objectId} in {@link Scene#highlightedObjects}.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return this._highlighted;
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es are selected.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#selected} returns true the Node will be registered by {@link Node#objectId} in {@link Scene#selectedObjects}.
     *
     * @type {Boolean}
     */
    set selected(selected) {
        selected = !!selected;
        this._selected = selected;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].selected = selected;
        }
        if (this._objectId) {
            this.scene._objectSelectedUpdated(this, selected);
        }
    }

    /**
     * Gets if this Node is selected.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#selected} returns true the Node will be registered by {@link Node#objectId} in {@link Scene#selectedObjects}.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Boolean}
     */
    get selected() {
        return this._selected;
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es are edge-enhanced.
     *
     * @type {Boolean}
     */
    set edges(edges) {
        edges = !!edges;
        this._edges = edges;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].edges = edges;
        }
    }

    /**
     * Gets if this Node's edges are enhanced.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Boolean}
     */
    get edges() {
        return this._edges;
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es are culled.
     *
     * Only rendered when {@link Node#visible} returns true and {@link Node#culled} returns false.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#visible} returns true the Node will be
     * registered by {@link Node#objectId} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    set culled(culled) {
        culled = !!culled;
        this._culled = culled;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].culled = culled;
        }
    }

    /**
     * Gets if this Node is culled.
     *
     * Only rendered when {@link Node#visible} returns true and {@link Node#culled} returns false.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#visible} returns true the Node will be
     * registered by {@link Node#objectId} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    get culled() {
        return this._culled;
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es are clippable.
     *
     * Clipping is done by the {@link Clip}s in {@link Scene#clips}.
     *
     * @type {Boolean}
     */
    set clippable(clippable) {
        clippable = clippable !== false;
        this._clippable = clippable;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].clippable = clippable;
        }
    }

    /**
     * Gets if this Node is clippable.
     *
     * Clipping is done by the {@link Clip}s in {@link Scene#clips}.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._clippable;
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es are included in boundary calculations.
     *
     * @type {Boolean}
     */
    set collidable(collidable) {
        collidable = collidable !== false;
        this._collidable = collidable;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].collidable = collidable;
        }
    }

    /**
     * Gets if this Node is included in boundary calculations.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._collidable;
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es are pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    set pickable(pickable) {
        pickable = pickable !== false;
        this._pickable = pickable;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].pickable = pickable;
        }
    }

    /**
     * Gets if to this Node is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Boolean}
     */
    get pickable() {
        return this._pickable;
    }

    /**
     * Sets the RGB colorize color for this Node and all child Nodes and {@link Mesh}es}.
     *
     * Multiplies by rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Float32Array}
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
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].colorize = colorize;
        }
    }

    /**
     * Gets the RGB colorize color for this Node.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Float32Array}
     */
    get colorize() {
        return this._colorize.slice(0, 3);
    }

    /**
     * Sets the opacity factor for this Node and all child Nodes and {@link Mesh}es.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
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
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].opacity = opacity;
        }
    }

    /**
     * Gets this Node's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Number}
     */
    get opacity() {
        return this._colorize[3];
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es cast shadows.
     *
     * @type {Boolean}
     */
    set castsShadow(castsShadow) {
        castsShadow = !!castsShadow;
        this._castsShadow = castsShadow;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].castsShadow = castsShadow;
        }
    }

    /**
     * Gets if this Node casts shadows.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Boolean}
     */
    get castsShadow() {
        return this._castsShadow;
    }

    /**
     * Sets if this Node and all child Nodes and {@link Mesh}es can have shadows cast upon them.
     *
     * @type {Boolean}
     */
    set receivesShadow(receivesShadow) {
        receivesShadow = !!receivesShadow;
        this._receivesShadow = receivesShadow;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i].receivesShadow = receivesShadow;
        }
    }

    /**
     * Whether or not to this Node can have shadows cast upon it.
     *
     * Child Nodes and {@link Mesh}es may have different values for this property.
     *
     * @type {Boolean}
     */
    get receivesShadow() {
        return this._receivesShadow;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Node members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that this Component is a Node.
     * @type {Boolean}
     */
    get isNode() {
        return true;
    }

    _setLocalMatrixDirty() {
        this._localMatrixDirty = true;
        this._setWorldMatrixDirty();
    }

    _setWorldMatrixDirty() {
        this._worldMatrixDirty = true;
        for (let i = 0, len = this._children.length; i < len; i++) {
            this._children[i]._setWorldMatrixDirty();
        }
    }

    _buildWorldMatrix() {
        const localMatrix = this.matrix;
        if (!this._parentNode) {
            for (let i = 0, len = localMatrix.length; i < len; i++) {
                this._worldMatrix[i] = localMatrix[i];
            }
        } else {
            math.mulMat4(this._parentNode.worldMatrix, localMatrix, this._worldMatrix);
        }
        this._worldMatrixDirty = false;
    }

    _setSubtreeAABBsDirty(node) {
        node._aabbDirty = true;
        if (node._children) {
            for (let i = 0, len = node._children.length; i < len; i++) {
                this._setSubtreeAABBsDirty(node._children[i]);
            }
        }
    }

    _setAABBDirty() {
        this._setSubtreeAABBsDirty(this);
        if (this.collidable) {
            for (let node = this; node; node = node._parentNode) {
                node._aabbDirty = true;
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
            let node;
            for (let i = 0, len = this._children.length; i < len; i++) {
                node = this._children[i];
                if (!node.collidable) {
                    continue;
                }
                math.expandAABB3(this._aabb, node.aabb);
            }
        }
        this._aabbDirty = false;
    }

    /**
     * Adds a child Node or {@link Mesh}.
     *
     * The child must be a Node or {@link Mesh} in the same {@link Scene}.
     *
     * If the child already has a parent, will be removed from that parent first.
     *
     * Does nothing if already a child.
     *
     * @param {Node|Mesh|String} child Instance or ID of the child to add.
     * @param [inheritStates=false] Indicates if the child should inherit rendering states from this parent as it is added. Rendering state includes {@link Node#visible}, {@link Node#culled}, {@link Node#pickable}, {@link Node#clippable}, {@link Node#castsShadow}, {@link Node#receivesShadow}, {@link Node#selected}, {@link Node#highlighted}, {@link Node#colorize} and {@link Node#opacity}.
     * @returns {Node|Mesh} The child.
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
            if (child._parentNode) {
                if (child._parentNode.id === this.id) {
                    this.warn("Already a child: " + child.id);
                    return;
                }
                child._parentNode.removeChild(child);
            }
        }
        const id = child.id;
        if (child.scene.id !== this.scene.id) {
            this.error("Child not in same Scene: " + child.id);
            return;
        }
        this._children.push(child);
        child._parentNode = this;
        if (!!inheritStates) {
            child.visible = this.visible;
            child.culled = this.culled;
            child.ghosted = this.ghosted;
            child.highlited = this.highlighted;
            child.selected = this.selected;
            child.edges = this.edges;
            child.clippable = this.clippable;
            child.pickable = this.pickable;
            child.collidable = this.collidable;
            child.castsShadow = this.castsShadow;
            child.receivesShadow = this.receivesShadow;
            child.colorize = this.colorize;
            child.opacity = this.opacity;
        }
        child._setWorldMatrixDirty();
        child._setAABBDirty();
        return child;
    }

    /**
     * Removes the given child Node or {@link Mesh}.
     *
     * @param {Node|Mesh} child Child to remove.
     */
    removeChild(child) {
        for (let i = 0, len = this._children.length; i < len; i++) {
            if (this._children[i].id === child.id) {
                child._parentNode = null;
                this._children = this._children.splice(i, 1);
                child._setWorldMatrixDirty();
                child._setAABBDirty();
                this._setAABBDirty();
                return;
            }
        }
    }

    /**
     * Removes all child Nodes and {@link Mesh}es.
     *
     * @method removeChildren
     */
    removeChildren() {
        let child;
        for (let i = 0, len = this._children.length; i < len; i++) {
            child = this._children[i];
            child._parentNode = null;
            child._setWorldMatrixDirty();
            child._setAABBDirty();
        }
        this._children = [];
        this._setAABBDirty();
    }

    /**
     * Number of child Nodes or {@link Mesh}es.
     *
     * @type {Number}
     */
    get numChildren() {
        return this._children.length;
    }

    /**
     * Array of child Nodes or {@link Mesh}es.
     *
     * @type {Array}
     */
    get children() {
        return this._children;
    }

    /**
     * The parent Node.
     *
     * The parent Node may also be set by passing the Node to the parent's {@link Node#addChild} method.
     *
     * @type {Node}
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
        if (this._parentNode && this._parentNode.id === node.id) {
            this.warn("Already a child of Node: " + node.id);
            return;
        }
        node.addChild(this);
    }

    /**
     * The parent Node.
     *
     * @type {Node}
     */
    get parent() {
        return this._parentNode;
    }

    /**
     * Sets the Node's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Float32Array}
     */
    set position(value) {
        this._position.set(value || [0, 0, 0]);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the Node's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Float32Array}
     */
    get position() {
        return this._position;
    }

    /**
     * Sets the Node's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Float32Array}
     */
    set rotation(value) {
        this._rotation.set(value || [0, 0, 0]);
        math.eulerToQuaternion(this._rotation, "XYZ", this._quaternion);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the Node's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Float32Array}
     */
    get rotation() {
        return this._rotation;
    }

    /**
     * Sets the Node's local rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {Float32Array}
     */
    set quaternion(value) {
        this._quaternion.set(value || [0, 0, 0, 1]);
        math.quaternionToEuler(this._quaternion, "XYZ", this._rotation);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the Node's local rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {Float32Array}
     */
    get quaternion() {
        return this._quaternion;
    }

    /**
     * Sets the Node's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Float32Array}
     */
    set scale(value) {
        this._scale.set(value || [1, 1, 1]);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the Node's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Float32Array}
     */
    get scale() {
        return this._scale;
    }

    /**
     * Sets the Node's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Float32Array}
     */
    set matrix(value) {
        if (!this._localMatrix) {
            this._localMatrix = math.identityMat4();
        }
        this._localMatrix.set(value || identityMat);
        math.decomposeMat4(this._localMatrix, this._position, this._quaternion, this._scale);
        this._localMatrixDirty = false;
        this._setWorldMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the Node's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Float32Array}
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
     * Gets the Node's World matrix.
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
     * Rotates the Node about the given local axis by the given increment.
     *
     * @param {Float32Array} axis Local axis about which to rotate.
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
        this._setAABBDirty();
        this.glRedraw();
        return this;
    }

    /**
     * Rotates the Node about the given World-space axis by the given increment.
     *
     * @param {Float32Array} axis Local axis about which to rotate.
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
     * Rotates the Node about the local X-axis by the given increment.
     *
     * @param {Number} angle Angle increment in degrees.
     */
    rotateX(angle) {
        return this.rotate(xAxis, angle);
    }

    /**
     * Rotates the Node about the local Y-axis by the given increment.
     *
     * @param {Number} angle Angle increment in degrees.
     */
    rotateY(angle) {
        return this.rotate(yAxis, angle);
    }

    /**
     * Rotates the Node about the local Z-axis by the given increment.
     *
     * @param {Number} angle Angle increment in degrees.
     */
    rotateZ(angle) {
        return this.rotate(zAxis, angle);
    }

    /**
     * Translates the Node along local space vector by the given increment.
     *
     * @param {Float32Array} axis Normalized local space 3D vector along which to translate.
     * @param {Number} distance Distance to translate along  the vector.
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
     * Translates the Node along the local X-axis by the given increment.
     *
     * @param {Number} distance Distance to translate along  the X-axis.
     */
    translateX(distance) {
        return this.translate(xAxis, distance);
    }

    /**
     * Translates the Node along the local Y-axis by the given increment.
     *
     * @param {Number} distance Distance to translate along  the Y-axis.
     */
    translateY(distance) {
        return this.translate(yAxis, distance);
    }

    /**
     * Translates the Node along the local Z-axis by the given increment.
     *
     * @param {Number} distance Distance to translate along  the Z-axis.
     */
    translateZ(distance) {
        return this.translate(zAxis, distance);
    }

    //------------------------------------------------------------------------------------------------------------------
    // Component members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * JavaScript class name for this Component.
     *
     * @type {String}
     */
    get type() {
        return "Node";
    }

    /**
     * Destroys this Node.
     */
    destroy() {
        super.destroy();
        if (this._parentNode) {
            this._parentNode.removeChild(this);
        }
        if (this._objectId) {
            this.scene._deregisterObject(this);
            if (this._visible) {
                this.scene._objectVisibilityUpdated(this, false);
            }
            if (this._ghosted) {
                this.scene._objectGhostedUpdated(this, false);
            }
            if (this._selected) {
                this.scene._objectSelectedUpdated(this, false);
            }
            if (this._highlighted) {
                this.scene._objectHighlightedUpdated(this, false);
            }
        }
        if (this._modelId) {
            this.scene._deregisterModel(this);
        }
        if (this._children.length) {
            // Clone the _children before iterating, so our children don't mess us up when calling removeChild().
            const tempChildList = this._children.splice();
            let child;
            for (let i = 0, len = tempChildList.length; i < len; i++) {
                child = tempChildList[i];
                child.destroy();
            }
        }
        this._children = [];
        this._setAABBDirty();
        this.scene._aabbDirty = true;
    }

}

export {Node};
