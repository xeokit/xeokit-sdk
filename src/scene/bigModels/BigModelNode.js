import {RENDER_FLAGS} from './renderFlags.js';

/**
 * @desc An element within a {@link BigModel}.
 *
 * * Created by {@link BigModel#createNode}.
 * * Has one or more {@link BigModelMesh}es.
 *
 * @implements {Entity}
 */
class BigModelNode {

    /**
     * @private
     */
    constructor(model, isObject, id, meshes, flags, aabb) {

        this._isObject = isObject;

        /**
         * The BigModel that contains this BigModelObject.
         * @property model
         * @type {BigModel}
         * @final
         */
        this.model = model;

        /**
         * The BigModelMesh instances contained by this BigModelObject
         * @property meshes
         * @type {{Array of BigModelMesh}}
         * @final
         */
        this.meshes = meshes;

        for (var i = 0, len = this.meshes.length; i < len; i++) {  // TODO: tidier way? Refactor?
            const mesh = this.meshes[i];
            mesh.object = this;
            mesh.parent = this;
        }

        /**
         * ID of this BigModelObject, unique within the {@link Scene}.
         * @property id
         * @type {String|Number
         * @final}
         */
        this.id = id;

        this._flags = flags;
        this._colorize = new Uint8Array([255, 255, 255, 255]);

        this._aabb = aabb;

        if (this._isObject) {
            model.scene._registerObject(this);
        }
    }

    /**
     * Always returns ````false```` because a BigModelNode can never represent a model.
     *
     * @type {Boolean}
     */
    get isModel() {
        return false;
    }

    /**
     * Returns ````true```` if this BigModelNode represents an object.
     *
     * When ````true```` the BigModelNode will be registered by {@link BigModelNode#id} in
     * {@link Scene#objects} and may also have a {@link MetaObject} with matching {@link MetaObject#id}.
     *
     * @type {Boolean}
     */
    get isObject() {
        return this._isObject;
    }

    /**
     * World-space 3D axis-aligned bounding box (AABB) of this BigModelNode.
     *
     * Represented by a six-element Float32Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Number[]}
     */
    get aabb() {
        return this._aabb;
    }

    /**
     * Sets if this BigModelNode is visible.
     *
     * Only rendered when {@link BigModelNode#visible} is ````true```` and {@link BigModelNode#culled} is ````false````.
     *
     * When both {@link BigModelNode#isObject} and {@link BigModelNode#visible} are ````true```` the BigModelNode will be
     * registered by {@link BigModelNode#id} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    set visible(visible) {
        if (!!(this._flags & RENDER_FLAGS.VISIBLE) === visible) {
            return; // Redundant update
        }
        if (visible) {
            this._flags = this._flags | RENDER_FLAGS.VISIBLE;
            this.model.numVisibleObjects++;
        } else {
            this._flags = this._flags & ~RENDER_FLAGS.VISIBLE;
            this.model.numVisibleObjects--;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setVisible(this._flags);
        }
        if (this._isObject) {
            this.model.scene._objectVisibilityUpdated(this);
        }
        this.model.glRedraw();
    }

    /**
     * Gets if this BigModelNode is visible.
     *
     * Only rendered when {@link BigModelNode#visible} is ````true```` and {@link BigModelNode#culled} is ````false````.
     *
     * When both {@link BigModelNode#isObject} and {@link BigModelNode#visible} are ````true```` the BigModelNode will be
     * registered by {@link BigModelNode#id} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    get visible() {
        return this._getFlag(RENDER_FLAGS.VISIBLE);
    }

    _getFlag(flag) {
        return !!(this._flags & flag);
    }

    /**
     * Sets if this BigModelNode is highlighted.
     *
     * When both {@link BigModelNode#isObject} and {@link BigModelNode#highlighted} are ````true```` the BigModelNode will be
     * registered by {@link BigModelNode#id} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     */
    set highlighted(highlighted) {
        if (!!(this._flags & RENDER_FLAGS.HIGHLIGHTED) === highlighted) {
            return; // Redundant update
        }
        if (highlighted) {
            this._flags = this._flags | RENDER_FLAGS.HIGHLIGHTED;
            this.model.numHighlightedObjects++;
        } else {
            this._flags = this._flags & ~RENDER_FLAGS.HIGHLIGHTED;
            this.model.numHighlightedObjects--;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setHighlighted(this._flags);
        }
        if (this._isObject) {
            this.model.scene._objectHighlightedUpdated(this);
        }
        this.model.glRedraw();
    }

    /**
     * Gets if this BigModelNode is highlighted.
     *
     * When both {@link BigModelNode#isObject} and {@link BigModelNode#highlighted} are ````true```` the BigModelNode will be
     * registered by {@link BigModelNode#id} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return this._getFlag(RENDER_FLAGS.HIGHLIGHTED);
    }

    /**
     * Sets if this BigModelNode is ghosted.
     *
     * When both {@link BigModelNode#isObject} and {@link BigModelNode#ghosted} are ````true```` the BigModelNode will be
     * registered by {@link BigModelNode#id} in {@link Scene#ghostedObjects}.
     *
     * @type {Boolean}
     */
    set ghosted(ghosted) {
        if (!!(this._flags & RENDER_FLAGS.GHOSTED) === ghosted) {
            return; // Redundant update
        }
        if (ghosted) {
            this._flags = this._flags | RENDER_FLAGS.GHOSTED;
            this.model.numGhostedObjects++;
        } else {
            this._flags = this._flags & ~RENDER_FLAGS.GHOSTED;
            this.model.numGhostedObjects--;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setGhosted(this._flags);
        }
        if (this._isObject) {
            this.model.scene._objectGhostedUpdated(this);
        }
        this.model.glRedraw();
    }

    /**
     * Gets if this BigModelNode is ghosted.
     *
     * When both {@link BigModelNode#isObject} and {@link BigModelNode#highlighted} are ````true```` the BigModelNode will be
     * registered by {@link BigModelNode#id} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     */
    get ghosted() {
        return this._getFlag(RENDER_FLAGS.GHOSTED);
    }

    /**
     * Gets if this BigModelNode is selected.
     *
     * When both {@link BigModelNode#isObject} and {@link BigModelNode#selected} are ````true```` the BigModelNode will be
     * registered by {@link BigModelNode#id} in {@link Scene#selectedObjects}.
     *
     * @type {Boolean}
     */
    set selected(selected) {
        if (!!(this._flags & RENDER_FLAGS.SELECTED) === selected) {
            return; // Redundant update
        }
        if (selected) {
            this._flags = this._flags | RENDER_FLAGS.SELECTED;
            this.model.numSelectedObjects++;
        } else {
            this._flags = this._flags & ~RENDER_FLAGS.SELECTED;
            this.model.numSelectedObjects--;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setSelected(this._flags);
        }
        if (this._isObject) {
            this.model.scene._objectSelectedUpdated(this);
        }
        this.model.glRedraw();
    }

    /**
     * Sets if this BigModelNode's edges are enhanced.
     *
     * @type {Boolean}
     */
    get selected() {
        return this._getFlag(RENDER_FLAGS.SELECTED);
    }

    /**
     * Sets if this BigModelNode's edges are enhanced.
     *
     * @type {Boolean}
     */
    set edges(edges) {
        if (!!(this._flags & RENDER_FLAGS.EDGES) === edges) {
            return; // Redundant update
        }
        if (edges) {
            this._flags = this._flags | RENDER_FLAGS.EDGES;
            this.model.numEdgesObjects++;
        } else {
            this._flags = this._flags & ~RENDER_FLAGS.EDGES;
            this.model.numEdgesObjects--;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setEdges(this._flags);
        }
        this.model.glRedraw();
    }

    /**
     * Gets if this BigModelNode's edges are enhanced.
     *
     * @type {Boolean}
     */
    get edges() {
        return this._getFlag(RENDER_FLAGS.EDGES);
    }

    /**
     * Sets if this BigModelNode is culled.
     *
     * Only rendered when {@link BigModelNode#visible} is ````true```` and {@link BigModelNode#culled} is ````false````.
     *
     * @type {Boolean}
     */
    set culled(culled) { // TODO
    }

    /**
     * Gets if this BigModelNode is culled.
     *
     * Only rendered when {@link BigModelNode#visible} is ````true```` and {@link BigModelNode#culled} is ````false````.
     *
     * @type {Boolean}
     */
    get culled() { // TODO
        return false;
    }

    /**
     * Sets if this BigModelNode is clippable.
     *
     * Clipping is done by the {@link Clip}s in {@link Scene#clips}.
     *
     * @type {Boolean}
     */
    set clippable(clippable) {
        if ((!!(this._flags & RENDER_FLAGS.CLIPPABLE)) === clippable) {
            return; // Redundant update
        }
        if (clippable) {
            this._flags = this._flags | RENDER_FLAGS.CLIPPABLE;
        } else {
            this._flags = this._flags & ~RENDER_FLAGS.CLIPPABLE;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setClippable(this._flags);
        }
        this.model.glRedraw();
    }

    /**
     * Gets if this BigModelNode is clippable.
     *
     * Clipping is done by the {@link Clip}s in {@link Scene#clips}.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._getFlag(RENDER_FLAGS.CLIPPABLE);
    }

    /**
     * Sets if this BigModelNode is included in boundary calculations.
     *
     * @type {Boolean}
     */
    set collidable(collidable) {
        if (!!(this._flags & RENDER_FLAGS.COLLIDABLE) === collidable) {
            return; // Redundant update
        }
        if (collidable) {
            this._flags = this._flags | RENDER_FLAGS.COLLIDABLE;
        } else {
            this._flags = this._flags & ~RENDER_FLAGS.COLLIDABLE;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setCollidable(this._flags);
        }
    }

    /**
     * Gets if this BigModelNode is included in boundary calculations.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._getFlag(RENDER_FLAGS.COLLIDABLE);
    }

    /**
     * Sets if this BigModelNode is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    set pickable(pickable) {
        if (!!(this._flags & RENDER_FLAGS.PICKABLE) === pickable) {
            return; // Redundant update
        }
        if (pickable) {
            this._flags = this._flags | RENDER_FLAGS.PICKABLE;
        } else {
            this._flags = this._flags & ~RENDER_FLAGS.PICKABLE;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setPickable(this._flags);
        }
    }

    /**
     * Gets if this BigModelNode is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    get pickable() {
        return this._getFlag(RENDER_FLAGS.PICKABLE);
    }

    /**
     * Gets the BigModelNode's RGB colorize color, multiplies by the BigModelNode's rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    set colorize(color) {
        this._colorize[0] = Math.floor(color[0] * 255.0); // Quantize
        this._colorize[1] = Math.floor(color[1] * 255.0);
        this._colorize[2] = Math.floor(color[2] * 255.0);
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setColorize(this._colorize);
        }
        this.model.glRedraw();
    }

    /**
     * Gets the BigModelNode's RGB colorize color, multiplies by the BigModelNode's rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    get colorize() {
        tempColor[0] = this._colorize[0] / 255.0; // Unquantize
        tempColor[1] = this._colorize[1] / 255.0;
        tempColor[2] = this._colorize[2] / 255.0;
        return tempColor;
    }

    /**
     * Sets the BigModelNode's opacity factor, multiplies by the BigModelNode's rendered fragment alphas.
     *
     * This is a factor in range ````[0..1]````.
     *
     * @type {Number}
     */
    set opacity(opacity) {
        if (opacity < 0) {
            opacity = 0;
        } else if (opacity > 1) {
            opacity = 1;
        }
        opacity = Math.floor(opacity * 255.0); // Quantize
        var lastOpacity = this._colorize[3];
        if (lastOpacity === opacity) {
            return;
        }
        if (opacity < 255) {
            if (lastOpacity === 255) {
                this._layer.numTransparentObjects++;
                this.model.numTransparentObjects++;
            }
        } else {
            if (lastOpacity < 255) {
                this._layer.numTransparentObjects--;
                this.model.numTransparentObjects--;
            }
        }
        this._colorize[3] = opacity; // Only set alpha
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setColor(this._colorize);
        }
        this.model.glRedraw();
    }

    /**
     * Gets the BigModelNode's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        return this._colorize[3] / 255.0;
    }

    /**
     * Sets if to this BigModelNode casts shadows.
     *
     * @type {Boolean}
     */
    set castsShadow(pickable) { // TODO

    }

    /**
     * Gets if this BigModelNode casts shadows.
     *
     * @type {Boolean}
     */
    get castsShadow() { // TODO
        return false;
    }

    /**
     * Whether or not this BigModelNode can have shadows cast upon it
     *
     * @type {Boolean}
     */
    set receivesShadow(pickable) { // TODO

    }

    /**
     * Whether or not this BigModelNode can have shadows cast upon it
     *
     * @type {Boolean}
     */
    get receivesShadow() { // TODO
        return false;
    }

    _finalize() {
        const meshes = this.meshes;
        const flags = this._flags;
        var mesh;
        for (var i = 0, len = meshes.length; i < len; i++) {
            mesh = meshes[i];

            if (this.visible) {
                mesh._setVisible(flags);
            }
            if (this.highlighted) {
                mesh._setHighlighted(flags);
            }
            if (this.selected) {
                mesh._setSelected(flags);
            }
            if (this.edges) {
                mesh._setEdges(flags);
            }
            if (this.clippable) {
                mesh._setClippable(flags);
            }
            if (this.collidable) {
                mesh._setCollidable(flags);
            }
            if (this.pickable) {
                mesh._setPickable(flags);
            }


            //    meshes[i]._setColor(this._colorize);
        }
    }

    _destroy() { // Called by BigModel
        const scene = this.model.scene;
        if (this._isObject) {
            scene._deregisterObject(this);
            if (this.visible) {
                scene._objectVisibilityUpdated(this, false);
            }
            if (this.ghosted) {
                scene._objectGhostedUpdated(this, false);
            }
            if (this.selected) {
                scene._objectSelectedUpdated(this, false);
            }
            if (this.highlighted) {
                scene._objectHighlightedUpdated(this, false);
            }
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._destroy();
        }
        scene._aabbDirty = true;
    }

}

export {BigModelNode};