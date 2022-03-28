import {ENTITY_FLAGS} from './ENTITY_FLAGS.js';
import {math} from "../../../math/math.js";

const tempFloatRGB = new Float32Array([0, 0, 0]);
const tempIntRGB = new Uint16Array([0, 0, 0]);

/**
 * @private
 */
class VBOSceneModelNode {

    /**
     * @private
     */
    constructor(model, isObject, id, meshes, flags, aabb) {

        this._isObject = isObject;

        /**
         * The {@link Scene} that contains this VBOSceneModelNode.
         *
         * @property scene
         * @type {Scene}
         * @final
         */
        this.scene = model.scene;

        /**
         * The VBOSceneModel that contains this VBOSceneModelNode.
         * @property model
         * @type {VBOSceneModel}
         * @final
         */
        this.model = model;

        /**
         * The PerformanceModelMesh instances contained by this VBOSceneModelNode
         * @property meshes
         * @type {{Array of PerformanceModelMesh}}
         * @final
         */
        this.meshes = meshes;

        this._numTriangles = 0;

        for (var i = 0, len = this.meshes.length; i < len; i++) {  // TODO: tidier way? Refactor?
            const mesh = this.meshes[i];
            mesh.parent = this;
            this._numTriangles += mesh.numTriangles;
        }

        /**
         * ID of this VBOSceneModelNode, unique within the {@link Scene}.
         * @property id
         * @type {String|Number}
         * @final
         */
        this.id = id;

        /**
         * ID of the corresponding object within the originating system.
         *
         * @type {String}
         * @abstract
         */
        this.originalSystemId = math.unglobalizeObjectId(model.id, id);

        this._flags = flags;
        this._aabb = aabb;
        this._offsetAABB = math.AABB3(aabb);

        this._offset = math.vec3();
        this._colorizeUpdated = false;
        this._opacityUpdated = false;

        if (this._isObject) {
            model.scene._registerObject(this);
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Entity members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that VBOSceneModelNode is an {@link Entity}.
     * @type {Boolean}
     */
    get isEntity() {
        return true;
    }

    /**
     * Always returns ````false```` because a VBOSceneModelNode can never represent a model.
     *
     * @type {Boolean}
     */
    get isModel() {
        return false;
    }

    /**
     * Returns ````true```` if this VBOSceneModelNode represents an object.
     *
     * When ````true```` the VBOSceneModelNode will be registered by {@link VBOSceneModelNode#id} in
     * {@link Scene#objects} and may also have a {@link MetaObject} with matching {@link MetaObject#id}.
     *
     * @type {Boolean}
     */
    get isObject() {
        return this._isObject;
    }

    /**
     * World-space 3D axis-aligned bounding box (AABB) of this VBOSceneModelNode.
     *
     * Represented by a six-element Float64Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Float64Array}
     */
    get aabb() {
        return this._offsetAABB;
    }

    /**
     * The approximate number of triangles in this VBOSceneModelNode.
     *
     * @type {Number}
     */
    get numTriangles() {
        return this._numTriangles;
    }

    /**
     * Gets if this VBOSceneModelNode is visible.
     *
     * Only rendered when {@link VBOSceneModelNode#visible} is ````true```` and {@link VBOSceneModelNode#culled} is ````false````.
     *
     * When both {@link VBOSceneModelNode#isObject} and {@link VBOSceneModelNode#visible} are ````true```` the VBOSceneModelNode will be
     * registered by {@link VBOSceneModelNode#id} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    get visible() {
        return this._getFlag(ENTITY_FLAGS.VISIBLE);
    }

    /**
     * Sets if this VBOSceneModelNode is visible.
     *
     * Only rendered when {@link VBOSceneModelNode#visible} is ````true```` and {@link VBOSceneModelNode#culled} is ````false````.
     *
     * When both {@link VBOSceneModelNode#isObject} and {@link VBOSceneModelNode#visible} are ````true```` the VBOSceneModelNode will be
     * registered by {@link VBOSceneModelNode#id} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    set visible(visible) {
        if (!!(this._flags & ENTITY_FLAGS.VISIBLE) === visible) {
            return; // Redundant update
        }
        if (visible) {
            this._flags = this._flags | ENTITY_FLAGS.VISIBLE;
        } else {
            this._flags = this._flags & ~ENTITY_FLAGS.VISIBLE;
        }
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setVisible(this._flags);
        }
        if (this._isObject) {
            this.model.scene._objectVisibilityUpdated(this);
        }
        this.model.glRedraw();
    }

    /**
     * Gets if this VBOSceneModelNode is highlighted.
     *
     * When both {@link VBOSceneModelNode#isObject} and {@link VBOSceneModelNode#highlighted} are ````true```` the VBOSceneModelNode will be
     * registered by {@link VBOSceneModelNode#id} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return this._getFlag(ENTITY_FLAGS.HIGHLIGHTED);
    }

    /**
     * Sets if this VBOSceneModelNode is highlighted.
     *
     * When both {@link VBOSceneModelNode#isObject} and {@link VBOSceneModelNode#highlighted} are ````true```` the VBOSceneModelNode will be
     * registered by {@link VBOSceneModelNode#id} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     */
    set highlighted(highlighted) {
        if (!!(this._flags & ENTITY_FLAGS.HIGHLIGHTED) === highlighted) {
            return; // Redundant update
        }
        if (highlighted) {
            this._flags = this._flags | ENTITY_FLAGS.HIGHLIGHTED;
        } else {
            this._flags = this._flags & ~ENTITY_FLAGS.HIGHLIGHTED;
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
     * Gets if this VBOSceneModelNode is xrayed.
     *
     * When both {@link VBOSceneModelNode#isObject} and {@link VBOSceneModelNode#xrayed} are ````true```` the VBOSceneModelNode will be
     * registered by {@link VBOSceneModelNode#id} in {@link Scene#xrayedObjects}.
     *
     * @type {Boolean}
     */
    get xrayed() {
        return this._getFlag(ENTITY_FLAGS.XRAYED);
    }

    /**
     * Sets if this VBOSceneModelNode is xrayed.
     *
     * When both {@link VBOSceneModelNode#isObject} and {@link VBOSceneModelNode#xrayed} are ````true```` the VBOSceneModelNode will be
     * registered by {@link VBOSceneModelNode#id} in {@link Scene#xrayedObjects}.
     *
     * @type {Boolean}
     */
    set xrayed(xrayed) {
        if (!!(this._flags & ENTITY_FLAGS.XRAYED) === xrayed) {
            return; // Redundant update
        }
        if (xrayed) {
            this._flags = this._flags | ENTITY_FLAGS.XRAYED;
        } else {
            this._flags = this._flags & ~ENTITY_FLAGS.XRAYED;
        }
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setXRayed(this._flags);
        }
        if (this._isObject) {
            this.model.scene._objectXRayedUpdated(this);
        }
        this.model.glRedraw();
    }

    /**
     * Sets if this VBOSceneModelNode is selected.
     *
     * When both {@link VBOSceneModelNode#isObject} and {@link VBOSceneModelNode#selected} are ````true```` the VBOSceneModelNode will be
     * registered by {@link VBOSceneModelNode#id} in {@link Scene#selectedObjects}.
     *
     * @type {Boolean}
     */
    get selected() {
        return this._getFlag(ENTITY_FLAGS.SELECTED);
    }

    /**
     * Gets if this VBOSceneModelNode is selected.
     *
     * When both {@link VBOSceneModelNode#isObject} and {@link VBOSceneModelNode#selected} are ````true```` the VBOSceneModelNode will be
     * registered by {@link VBOSceneModelNode#id} in {@link Scene#selectedObjects}.
     *
     * @type {Boolean}
     */
    set selected(selected) {
        if (!!(this._flags & ENTITY_FLAGS.SELECTED) === selected) {
            return; // Redundant update
        }
        if (selected) {
            this._flags = this._flags | ENTITY_FLAGS.SELECTED;
        } else {
            this._flags = this._flags & ~ENTITY_FLAGS.SELECTED;
        }
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setSelected(this._flags);
        }
        if (this._isObject) {
            this.model.scene._objectSelectedUpdated(this);
        }
        this.model.glRedraw();
    }

    /**
     * Gets if this VBOSceneModelNode's edges are enhanced.
     *
     * @type {Boolean}
     */
    get edges() {
        return this._getFlag(ENTITY_FLAGS.EDGES);
    }

    /**
     * Sets if this VBOSceneModelNode's edges are enhanced.
     *
     * @type {Boolean}
     */
    set edges(edges) {
        if (!!(this._flags & ENTITY_FLAGS.EDGES) === edges) {
            return; // Redundant update
        }
        if (edges) {
            this._flags = this._flags | ENTITY_FLAGS.EDGES;
        } else {
            this._flags = this._flags & ~ENTITY_FLAGS.EDGES;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setEdges(this._flags);
        }
        this.model.glRedraw();
    }

    get culledLOD() {
        return !!(this._culledLOD);
    }
    set culledLOD(culled) {
        this._culledLOD = culled;
        this.internalSetCulled ();
    }

    /**
     * Gets if this VBOSceneModelNode is culled.
     *
     * Only rendered when {@link VBOSceneModelNode#visible} is ````true```` and {@link VBOSceneModelNode#culled} is ````false````.
     *
     * @type {Boolean}
     */
    get culled() {
        return !!(this._culled);
        // return this._getFlag(ENTITY_FLAGS.CULLED);
    }

    /**
     * Sets if this VBOSceneModelNode is culled.
     *
     * Only rendered when {@link VBOSceneModelNode#visible} is ````true```` and {@link VBOSceneModelNode#culled} is ````false````.
     *
     * @type {Boolean}
     */
    set culled(culled) {
        this._culled = culled;
        this.internalSetCulled ();
    }

    internalSetCulled()
    {
        let culled = !!(this._culled) || !!(this._culledLOD);
        if (!!(this._flags & ENTITY_FLAGS.CULLED) === culled) {
            return; // Redundant update
        }
        if (culled) {
            this._flags = this._flags | ENTITY_FLAGS.CULLED;
        } else {
            this._flags = this._flags & ~ENTITY_FLAGS.CULLED;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setCulled(this._flags);
        }
        this.model.glRedraw();
    }

    /**
     * Gets if this VBOSceneModelNode is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._getFlag(ENTITY_FLAGS.CLIPPABLE);
    }

    /**
     * Sets if this VBOSceneModelNode is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    set clippable(clippable) {
        if ((!!(this._flags & ENTITY_FLAGS.CLIPPABLE)) === clippable) {
            return; // Redundant update
        }
        if (clippable) {
            this._flags = this._flags | ENTITY_FLAGS.CLIPPABLE;
        } else {
            this._flags = this._flags & ~ENTITY_FLAGS.CLIPPABLE;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setClippable(this._flags);
        }
        this.model.glRedraw();
    }

    /**
     * Gets if this VBOSceneModelNode is included in boundary calculations.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._getFlag(ENTITY_FLAGS.COLLIDABLE);
    }

    /**
     * Sets if this VBOSceneModelNode is included in boundary calculations.
     *
     * @type {Boolean}
     */
    set collidable(collidable) {
        if (!!(this._flags & ENTITY_FLAGS.COLLIDABLE) === collidable) {
            return; // Redundant update
        }
        if (collidable) {
            this._flags = this._flags | ENTITY_FLAGS.COLLIDABLE;
        } else {
            this._flags = this._flags & ~ENTITY_FLAGS.COLLIDABLE;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setCollidable(this._flags);
        }
    }

    /**
     * Gets if this VBOSceneModelNode is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    get pickable() {
        return this._getFlag(ENTITY_FLAGS.PICKABLE);
    }

    /**
     * Sets if this VBOSceneModelNode is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    set pickable(pickable) {
        if (!!(this._flags & ENTITY_FLAGS.PICKABLE) === pickable) {
            return; // Redundant update
        }
        if (pickable) {
            this._flags = this._flags | ENTITY_FLAGS.PICKABLE;
        } else {
            this._flags = this._flags & ~ENTITY_FLAGS.PICKABLE;
        }
        for (var i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setPickable(this._flags);
        }
    }

    /**
     * Gets the VBOSceneModelNode's RGB colorize color.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    get colorize() { // [0..1, 0..1, 0..1]
        if (this.meshes.length === 0) {
            return null;
        }
        const colorize = this.meshes[0]._colorize;
        tempFloatRGB[0] = colorize[0] / 255.0; // Unquantize
        tempFloatRGB[1] = colorize[1] / 255.0;
        tempFloatRGB[2] = colorize[2] / 255.0;
        return tempFloatRGB;
    }

    /**
     * Sets the VBOSceneModelNode's RGB colorize color.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    set colorize(color) { // [0..1, 0..1, 0..1]
        if (color) {
            tempIntRGB[0] = Math.floor(color[0] * 255.0); // Quantize
            tempIntRGB[1] = Math.floor(color[1] * 255.0);
            tempIntRGB[2] = Math.floor(color[2] * 255.0);
            for (let i = 0, len = this.meshes.length; i < len; i++) {
                this.meshes[i]._setColorize(tempIntRGB);
            }
        } else {
            for (let i = 0, len = this.meshes.length; i < len; i++) {
                this.meshes[i]._setColorize(null);
            }
        }
        if (this._isObject) {
            const colorized = (!!color);
            this.scene._objectColorizeUpdated(this, colorized);
            this._colorizeUpdated = colorized;
        }
        this.model.glRedraw();
    }

    /**
     * Gets the VBOSceneModelNode's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        if (this.meshes.length > 0) {
            return (this.meshes[0]._colorize[3] / 255.0);
        } else {
            return 1.0;
        }
    }

    /**
     * Sets the VBOSceneModelNode's opacity factor, multiplies by the VBOSceneModelNode's rendered fragment alphas.
     *
     * This is a factor in range ````[0..1]````.
     *
     * @type {Number}
     */
    set opacity(opacity) {
        if (this.meshes.length === 0) {
            return;
        }
        const opacityUpdated = (opacity !== null && opacity !== undefined);
        const lastOpacityQuantized = this.meshes[0]._colorize[3];
        let opacityQuantized = 255;
        if (opacityUpdated) {
            if (opacity < 0) {
                opacity = 0;
            } else if (opacity > 1) {
                opacity = 1;
            }
            opacityQuantized = Math.floor(opacity * 255.0); // Quantize
            if (lastOpacityQuantized === opacityQuantized) {
                return;
            }
        } else {
            opacityQuantized = 255.0;
            if (lastOpacityQuantized === opacityQuantized) {
                return;
            }
        }
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setOpacity(opacityQuantized, this._flags);
        }
        if (this._isObject) {
            this.scene._objectOpacityUpdated(this, opacityUpdated);
            this._opacityUpdated = opacityUpdated;
        }
        this.model.glRedraw();
    }

    /**
     * Gets the VBOSceneModelNode's 3D World-space offset.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get offset() {
        return this._offset;
    }

    /**
     * Sets the VBOSceneModelNode's 3D World-space offset.
     *
     * The offset dynamically translates the VBOSceneModelNode in World-space.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * Provide a null or undefined value to reset to the default value.
     *
     * @type {Number[]}
     */
    set offset(offset) {
        if (offset) {
            this._offset[0] = offset[0];
            this._offset[1] = offset[1];
            this._offset[2] = offset[2];
        } else {
            this._offset[0] = 0;
            this._offset[1] = 0;
            this._offset[2] = 0;
        }
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._setOffset(this._offset);
        }
        this._offsetAABB[0] = this._aabb[0] + this._offset[0];
        this._offsetAABB[1] = this._aabb[1] + this._offset[1];
        this._offsetAABB[2] = this._aabb[2] + this._offset[2];
        this._offsetAABB[3] = this._aabb[3] + this._offset[0];
        this._offsetAABB[4] = this._aabb[4] + this._offset[1];
        this._offsetAABB[5] = this._aabb[5] + this._offset[2];
        this.scene._aabbDirty = true;
        this.scene._objectOffsetUpdated(this, offset);
        this.model._aabbDirty = true;
        this.model.glRedraw();
    }

    /**
     * Gets if this VBOSceneModelNode casts shadows.
     *
     * @type {Boolean}
     */
    get castsShadow() { // TODO
        return false;
    }

    /**
     * Sets if to this VBOSceneModelNode casts shadows.
     *
     * @type {Boolean}
     */
    set castsShadow(pickable) { // TODO

    }

    /**
     * Whether or not this VBOSceneModelNode can have shadows cast upon it
     *
     * @type {Boolean}
     */
    get receivesShadow() { // TODO
        return false;
    }

    /**
     * Whether or not this VBOSceneModelNode can have shadows cast upon it
     *
     * @type {Boolean}
     */
    set receivesShadow(pickable) { // TODO

    }

    /**
     * Gets if Scalable Ambient Obscurance (SAO) will apply to this VBOSceneModelNode.
     *
     * SAO is configured by the Scene's {@link SAO} component.
     *
     * @type {Boolean}
     * @abstract
     */
    get saoEnabled() {
        return this.model.saoEnabled;
    }

    _getFlag(flag) {
        return !!(this._flags & flag);
    }

    _finalize() {
        const scene = this.model.scene;
        if (this._isObject) {
            if (this.visible) {
                scene._objectVisibilityUpdated(this);
            }
            if (this.highlighted) {
                scene._objectHighlightedUpdated(this);
            }
            if (this.xrayed) {
                scene._objectXRayedUpdated(this);
            }
            if (this.selected) {
                scene._objectSelectedUpdated(this);
            }
        }
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._finalize(this._flags);
        }
    }

    _finalize2() {
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._finalize2();
        }
    }

    _destroy() { // Called by VBOSceneModel
        const scene = this.model.scene;
        if (this._isObject) {
            scene._deregisterObject(this);
            if (this.visible) {
                scene._objectVisibilityUpdated(this, false);
            }
            if (this.xrayed) {
                scene._objectXRayedUpdated(this);
            }
            if (this.selected) {
                scene._objectSelectedUpdated(this);
            }
            if (this.highlighted) {
                scene._objectHighlightedUpdated(this);
            }
            if (this._opacityUpdated) {
                this.scene._objectColorizeUpdated(this, false);
            }
            if (this._opacityUpdated) {
                this.scene._objectOpacityUpdated(this, false);
            }
            this.scene._objectOffsetUpdated(this, false);
        }
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._destroy();
        }
        scene._aabbDirty = true;
    }

}

export {VBOSceneModelNode};