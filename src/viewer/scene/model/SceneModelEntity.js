import {ENTITY_FLAGS} from './ENTITY_FLAGS.js';
import {math} from "../math/math.js";
import { Material } from '../materials/Material.js';

const tempFloatRGB = new Float32Array([0, 0, 0]);
const tempIntRGB = new Uint16Array([0, 0, 0]);

const tempOBB3a = math.OBB3();

/**
 * An entity within a {@link SceneModel}
 *
 * * Created with {@link SceneModel#createEntity}
 * * Stored by ID in {@link SceneModel#entities}
 * * Has one or more {@link SceneModelMesh}es
 *
 * @implements {Entity}
 */
export class SceneModelEntity {

    /**
     * @private
     */
    constructor(model, isObject, id, meshes, flags, lodCullable) {

        this._isObject = isObject;

        /**
         * The {@link Scene} to which this SceneModelEntity belongs.
         */
        this.scene = model.scene;

        /**
         * The {@link SceneModel} to which this SceneModelEntity belongs.
         */
        this.model = model;

        /**
         * Identifies if it's a SceneModelEntity
         */
        this.isSceneModelEntity = true;

        /**
         * The {@link SceneModelMesh}es belonging to this SceneModelEntity.
         *
         * * These are created with {@link SceneModel#createMesh} and registered in {@ilnk SceneModel#meshes}
         * * Each SceneModelMesh belongs to one SceneModelEntity
         */
        this.meshes = meshes;

        this._numPrimitives = 0;
        this._capMaterial = null;

        for (let i = 0, len = this.meshes.length; i < len; i++) {  // TODO: tidier way? Refactor?
            const mesh = this.meshes[i];
            mesh.parent = this;
            mesh.entity = this;
            this._numPrimitives += mesh.numPrimitives;
        }

        /**
         * The unique ID of this SceneModelEntity.
         */
        this.id = id;

        /**
         * The original system ID of this SceneModelEntity.
         */
        this.originalSystemId = math.unglobalizeObjectId(model.id, id);

        this._flags = flags;
        this._aabb = math.AABB3();
        this._aabbDirty = true;

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

    _transformDirty() {
        this._aabbDirty = true;
        this.model._transformDirty();

    }

    _sceneModelDirty() { // Called by SceneModel when SceneModel's matrix is updated
        this._aabbDirty = true;
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._sceneModelDirty();
        }
    }

    /**
     * World-space 3D axis-aligned bounding box (AABB) of this SceneModelEntity.
     *
     * Represented by a six-element Float64Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin, zmin, xmax, ymax, zmax]````.
     *
     * @type {Float64Array}
     */
    get aabb() {
        if (this._aabbDirty) {
            math.collapseAABB3(this._aabb);
            for (let i = 0, len = this.meshes.length; i < len; i++) {
                math.expandAABB3(this._aabb, this.meshes[i].aabb);
            }
            this._aabbDirty = false;
        }
        // if (this._aabbDirty) {
        //     math.AABB3ToOBB3(this._aabb, tempOBB3a);
        //     math.transformOBB3(this.model.matrix, tempOBB3a);
        //     math.OBB3ToAABB3(tempOBB3a, this._worldAABB);
        //     this._worldAABB[0] += this._offset[0];
        //     this._worldAABB[1] += this._offset[1];
        //     this._worldAABB[2] += this._offset[2];
        //     this._worldAABB[3] += this._offset[0];
        //     this._worldAABB[4] += this._offset[1];
        //     this._worldAABB[5] += this._offset[2];
        //     this._aabbDirty = false;
        // }
        return this._aabb;
    }

    get isEntity() {
        return true;
    }

    /**
     * Returns false to indicate that this Entity subtype is not a model.
     * @returns {boolean}
     */
    get isModel() {
        return false;
    }

    /**
     * Returns ````true```` if this SceneModelEntity represents an object.
     *
     * When this is ````true````, the SceneModelEntity will be registered by {@link SceneModelEntity#id}
     * in {@link Scene#objects} and may also have a corresponding {@link MetaObject}.
     *
     * @type {Boolean}
     */
    get isObject() {
        return this._isObject;
    }

    get numPrimitives() {
        return this._numPrimitives;
    }

    /**
     * The approximate number of triangles in this SceneModelEntity.
     *
     * @type {Number}
     */
    get numTriangles() {
        return this._numPrimitives;
    }

    /**
     * Gets if this SceneModelEntity is visible.
     *
     * Only rendered when {@link SceneModelEntity#visible} is ````true````
     * and {@link SceneModelEntity#culled} is ````false````.
     *
     * When {@link SceneModelEntity#isObject} and {@link SceneModelEntity#visible} are
     * both ````true```` the SceneModelEntity will be registered
     * by {@link SceneModelEntity#id} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    get visible() {
        return this._getFlag(ENTITY_FLAGS.VISIBLE);
    }

    /**
     * Sets if this SceneModelEntity is visible.
     *
     * Only rendered when {@link SceneModelEntity#visible} is ````true```` and {@link SceneModelEntity#culled} is ````false````.
     *
     * When {@link SceneModelEntity#isObject} and {@link SceneModelEntity#visible} are
     * both ````true```` the SceneModelEntity will be
     * registered by {@link SceneModelEntity#id} in {@link Scene#visibleObjects}.
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
     * Gets if this SceneModelEntity is highlighted.
     *
     * When {@link SceneModelEntity#isObject} and {@link SceneModelEntity#highlighted} are both ````true```` the SceneModelEntity will be
     * registered by {@link SceneModelEntity#id} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return this._getFlag(ENTITY_FLAGS.HIGHLIGHTED);
    }

    /**
     * Sets if this SceneModelEntity is highlighted.
     *
     * When {@link SceneModelEntity#isObject} and {@link SceneModelEntity#highlighted} are both ````true```` the SceneModelEntity will be
     * registered by {@link SceneModelEntity#id} in {@link Scene#highlightedObjects}.
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
     * Gets if this SceneModelEntity is xrayed.
     *
     * When {@link SceneModelEntity#isObject} and {@link SceneModelEntity#xrayed} are both ````true``` the SceneModelEntity will be
     * registered by {@link SceneModelEntity#id} in {@link Scene#xrayedObjects}.
     *
     * @type {Boolean}
     */
    get xrayed() {
        return this._getFlag(ENTITY_FLAGS.XRAYED);
    }

    /**
     * Sets if this SceneModelEntity is xrayed.
     *
     * When {@link SceneModelEntity#isObject} and {@link SceneModelEntity#xrayed} are both ````true``` the SceneModelEntity will be
     * registered by {@link SceneModelEntity#id} in {@link Scene#xrayedObjects}.
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
     * Gets if this SceneModelEntity is selected.
     *
     * When {@link SceneModelEntity#isObject} and {@link SceneModelEntity#selected} are both ````true``` the SceneModelEntity will be
     * registered by {@link SceneModelEntity#id} in {@link Scene#selectedObjects}.
     *
     * @type {Boolean}
     */
    get selected() {
        return this._getFlag(ENTITY_FLAGS.SELECTED);
    }

    /**
     * Gets if this SceneModelEntity is selected.
     *
     * When {@link SceneModelEntity#isObject} and {@link SceneModelEntity#selected} are both ````true``` the SceneModelEntity will be
     * registered by {@link SceneModelEntity#id} in {@link Scene#selectedObjects}.
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
     * Gets if this SceneModelEntity's edges are enhanced.
     *
     * @type {Boolean}
     */
    get edges() {
        return this._getFlag(ENTITY_FLAGS.EDGES);
    }

    /**
     * Sets if this SceneModelEntity's edges are enhanced.
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

    /**
     * Gets if this SceneModelEntity is culled.
     *
     * Only rendered when {@link SceneModelEntity#visible} is ````true```` and {@link SceneModelEntity#culled} is ````false````.
     *
     * @type {Boolean}
     */
    get culled() {
        return !!(this._culled);
        // return this._getFlag(ENTITY_FLAGS.CULLED);
    }

    /**
     * Sets if this SceneModelEntity is culled.
     *
     * Only rendered when {@link SceneModelEntity#visible} is ````true```` and {@link SceneModelEntity#culled} is ````false````.
     *
     * @type {Boolean}
     */
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

    /**
     * Gets if this SceneModelEntity is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._getFlag(ENTITY_FLAGS.CLIPPABLE);
    }

    /**
     * Sets if this SceneModelEntity is clippable.
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
     * Gets if this SceneModelEntity is included in boundary calculations.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._getFlag(ENTITY_FLAGS.COLLIDABLE);
    }

    /**
     * Sets if this SceneModelEntity is included in boundary calculations.
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
     * Gets if this SceneModelEntity is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    get pickable() {
        return this._getFlag(ENTITY_FLAGS.PICKABLE);
    }

    /**
     * Sets if this SceneModelEntity is pickable.
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
     * Gets the SceneModelEntity's RGB colorize color, multiplies by the SceneModelEntity's rendered fragment colors.
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
     * Sets the SceneModelEntity's RGB colorize color, multiplies by the SceneModelEntity's rendered fragment colors.
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
     * Gets the SceneModelEntity's opacity factor.
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
     * Sets the SceneModelEntity's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
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
     * Gets the SceneModelEntity's 3D World-space offset.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get offset() {
        return this._offset;
    }

    /**
     * Sets the SceneModelEntity's 3D World-space offset.
     *
     * Default value is ````[0,0,0]````.
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
        this._aabbDirty = true;
        this.model._aabbDirty = true;
        this.scene._aabbDirty = true;
        this.scene._objectOffsetUpdated(this, offset);
        this.model.glRedraw();
    }

  get saoEnabled() {
    return this.model.saoEnabled;
  }

  rotate(conf) {
    for (let i = 0, len = this.meshes.length; i < len; i++) {
      this.meshes[i].rotate(conf);
      }
      this.model.glRedraw();
    }

  translate(conf) {
    for (let i = 0, len = this.meshes.length; i < len; i++) {
      this.meshes[i].translate(conf);
    }
    this.model.glRedraw();
    }

    /**
     * Sets the SceneModelEntity's capMaterial that will be used on the caps generated when this entity is sliced
     *
     * Default value is ````null````.
     *
     * @type {Material}
     */
    set capMaterial(value) {
        if(!this.scene.readableGeometryEnabled) return;
        this._capMaterial = value instanceof Material ? value : null;
        this.scene._capMaterialUpdated(this.id, this.model.id);
    }

    /**
     * Gets the SceneModelEntity's capMaterial.
     *
     * Default value is ````null````.
     *
     * @type {Material}
     */
    get capMaterial() {
        return this._capMaterial;
    }

    getEachVertex(callback) {
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i].getEachVertex(callback)
        }
    }

    getEachIndex(callback) {
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i].getEachIndex(callback)
        }
    }

    /**
     * Returns the volume of this SceneModelEntity.
     *
     * Only works when {@link Scene.readableGeometryEnabled | Scene.readableGeometryEnabled} is `true` and the
     * SceneModelEntity contains solid triangle meshes; returns `0` otherwise.
     *
     * @returns {number}
     */
    get volume() {
        let volume = 0;
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            const meshVolume = this.meshes[i].volume;
            if (meshVolume < 0) {
                return -1;
            }
            volume += meshVolume;
        }
        return volume;
    }

    /**
     * Returns the surface area of this SceneModelEntity.
     *
     * Only works when {@link Scene.readableGeometryEnabled | Scene.readableGeometryEnabled} is `true` and the
     * SceneModelEntity contains triangle meshes; returns `0` otherwise.
     *
     * @returns {number}
     */
    get surfaceArea() {
        let surfaceArea = 0;
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            const meshSurfaceArea = this.meshes[i].surfaceArea;
            if (meshSurfaceArea >= 0) {
                surfaceArea += meshSurfaceArea;
            }
        }
        return surfaceArea > 0 ? surfaceArea : -1;
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
                scene._deRegisterVisibleObject(this);
            }
            if (this.xrayed) {
                scene._deRegisterXRayedObject(this);
            }
            if (this.selected) {
                scene._deRegisterSelectedObject(this);
            }
            if (this.highlighted) {
                scene._deRegisterHighlightedObject(this);
            }
            if (this._colorizeUpdated) {
                this.scene._deRegisterColorizedObject(this);
            }
            if (this._opacityUpdated) {
                this.scene._deRegisterOpacityObject(this);
            }
            if (this._offset && (this._offset[0] !== 0 || this._offset[1] !== 0 || this._offset[2] !== 0)) {
                this.scene._deRegisterOffsetObject(this);
            }
        }
        for (let i = 0, len = this.meshes.length; i < len; i++) {
            this.meshes[i]._destroy();
        }
        scene._aabbDirty = true;
    }
}
