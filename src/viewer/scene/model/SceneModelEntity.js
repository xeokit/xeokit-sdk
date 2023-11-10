import {ENTITY_FLAGS} from './ENTITY_FLAGS.js';
import {math} from "../math/math.js";

const tempFloatRGB = new Float32Array([0, 0, 0]);
const tempIntRGB = new Uint16Array([0, 0, 0]);

const tempOBB3a = math.OBB3();

/**
 * @private
 */
export class SceneModelEntity {

    constructor(model, isObject, id, meshes, flags, aabb, lodCullable) {

        this._isObject = isObject;
        this.scene = model.scene;
        this.model = model;
        this.meshes = meshes;
        this._numPrimitives = 0;

        for (let i = 0, len = this.meshes.length; i < len; i++) {  // TODO: tidier way? Refactor?
            const mesh = this.meshes[i];
            mesh.parent = this;
            this._numPrimitives += mesh.numPrimitives;
        }

        this.id = id;
      //  this.originalSystemId = math.unglobalizeObjectId(model.id, id);

        this._flags = flags;
        this._aabb = aabb;
        this._worldAABB = math.AABB3(aabb); // Computed from Meshes and SceneModel.matrix
        this._offsetAABB = math.AABB3(aabb); // TODO - only used for offsets, current disabled
        this._localAABBDirty = true;
        this._worldAABBDirty = true;

        this._offset = math.vec3();
        this._colorizeUpdated = false;
        this._opacityUpdated = false;

        this._lodCullable = (!!lodCullable);
        this._culled = false;
        this._culledVFC = false;
        this._culledLOD = false;

        if (this._isObject) {
            model.scene._registerObject(this);
        }
    }

    _setLocalAABBDirty() { // Called when mesh AABBs updated
        this._localAABBDirty = true;
    }

    _setWorldAABBDirty() { // called when SceneModel world transform updated
        this._worldAABBDirty = true;
    }

    get aabb() {
        if (this._localAABBDirty) {
            math.collapseAABB3(this._aabb);
            for (let i = 0, len = this.meshes.length; i < len; i++) {
                math.expandAABB3(this._aabb, this.meshes[i].aabb);
            }
            this._localAABBDirty = false;
            this._worldAABBDirty = true;
        }
        if (this._worldAABBDirty) {
            math.AABB3ToOBB3(this._aabb, tempOBB3a);
            math.transformOBB3(this.model.matrix, tempOBB3a);
            math.OBB3ToAABB3(tempOBB3a, this._worldAABB);
            this._worldAABB[0] += this._offset[0];
            this._worldAABB[1] += this._offset[1];
            this._worldAABB[2] += this._offset[2];
            this._worldAABB[3] += this._offset[0];
            this._worldAABB[4] += this._offset[1];
            this._worldAABB[5] += this._offset[2];
            this._worldAABBDirty = false;
        }
        return this._worldAABB;
    }

    get isEntity() {
        return true;
    }

    get isModel() {
        return false;
    }

    get isObject() {
        return this._isObject;
    }


    get numPrimitives() {
        return this._numPrimitives;
    }

    get numTriangles() {
        return this._numPrimitives;
    }

    get visible() {
        return this._getFlag(ENTITY_FLAGS.VISIBLE);
    }

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

    get highlighted() {
        return this._getFlag(ENTITY_FLAGS.HIGHLIGHTED);
    }

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

    get xrayed() {
        return this._getFlag(ENTITY_FLAGS.XRAYED);
    }

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

    get selected() {
        return this._getFlag(ENTITY_FLAGS.SELECTED);
    }

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

    get edges() {
        return this._getFlag(ENTITY_FLAGS.EDGES);
    }

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

    get culledVFC() {
        return !!(this._culledVFC);
    }

    set culledVFC(culled) {
        this._culledVFC = culled;
        this._setCulled();
    }

    get culledLOD() {
        return !!(this._culledLOD);
    }

    set culledLOD(culled) {
        this._culledLOD = culled;
        this._setCulled();
    }

    get culled() {
        return !!(this._culled);
        // return this._getFlag(ENTITY_FLAGS.CULLED);
    }

    set culled(culled) {
        this._culled = culled;
        this._setCulled();
    }

    _setCulled() {
        let culled = !!(this._culled) || !!(this._culledLOD && this._lodCullable) || !!(this._culledVFC);
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

    get clippable() {
        return this._getFlag(ENTITY_FLAGS.CLIPPABLE);
    }

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

    get collidable() {
        return this._getFlag(ENTITY_FLAGS.COLLIDABLE);
    }

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

    get pickable() {
        return this._getFlag(ENTITY_FLAGS.PICKABLE);
    }

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

    get opacity() {
        if (this.meshes.length > 0) {
            return (this.meshes[0]._colorize[3] / 255.0);
        } else {
            return 1.0;
        }
    }

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

    get offset() {
        return this._offset;
    }

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
        this._worldAABBDirty  = true;
        this.model._aabbDirty = true;
        this.scene._aabbDirty = true;
        this.scene._objectOffsetUpdated(this, offset);
        this.model.glRedraw();
    }

    get saoEnabled() {
        return this.model.saoEnabled;
    }

    getEachVertex(callback) {
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i].getEachVertex(callback)
        }
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

    _destroy() {
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
        scene.viewer.putFastId(this.id);
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._destroy();
        }
        scene._aabbDirty = true;
    }
}
