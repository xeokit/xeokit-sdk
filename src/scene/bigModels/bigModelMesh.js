import {RENDER_FLAGS} from './renderFlags.js';
import {math} from "../math/math.js";

/**
 A **BigModelMesh** represents an instance of a geometry within a {@link BigModel}.

 * A BigModelMesh is created with {@link BigModel/createMesh:method"}}BigModel#createMesh(){{/crossLink}}.
 * Each BigModelMesh is owned by exactly one {@link BigModelObject}.
 * A BigModelObject can own multiple BigModelMeshes.
 * A BigModelMesh can have its own geometry, or can reused a geometry previously created with {@link BigModel/createGeometry:method"}}BigModel#createGeometry(){{/crossLink}}.

 @class BigModelMesh
 @module xeokit
 @submodule models

 */
class BigModelMesh {

    constructor(model, id, layer = null, portionId = 0) {

        /**
         * The BigModel that contains this BigModelMesh.
         *
         * A BigModelMesh always belongs to exactly one BigModel.
         *
         * @property model
         * @type {BigModel}
         * @final
         */
        this.model = model;

        /**
         * The BigModelObject that contains this BigModelMesh.
         *
         * A BigModelMesh always belongs to exactly one BigModelObject.
         *
         * @property object
         * @type {BigModelObject}
         * @final
         */
        this.object = null;

        /**
         * The BigModelObject that contains this BigModelMesh.
         *
         * A BigModelMesh always belongs to exactly one BigModelObject.
         *
         * @property object
         * @type {BigModelObject}
         * @final
         */
        this.parent = null;

        /**
         * ID of this BigModelMesh, unique within the xeokit.Scene.
         *
         * @property id
         * @type {String}
         * @final
         */
        this.id = id;

        /**
         *
         * @type {Number}
         * @private
         */
        this.pickId = this.model.scene._renderer.getPickID(this);

        /**
         * World-space 3D axis-aligned bounding box (AABB).
         *
         * Represented by a six-element Float32Array containing the min/max extents of the
         * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
         *
         * @property aabb
         * @final
         * @type {Float32Array}
         */
        this.aabb = math.AABB3();

        this._layer = layer;
        this._portionId = portionId;
    }

    _setFlags(flags) {
        this._layer.setFlags(this._portionId, flags);
    }

    _setVisible(flags) {
        (flags & RENDER_FLAGS.VISIBLE) ? this._layer.numVisibleObjects++ : this._layer.numVisibleObjects--;
        this._layer.setFlags(this._portionId, flags);
    }

    _setHighlighted(flags) {
        (flags & RENDER_FLAGS.HIGHLIGHTED) ? this._layer.numHighlightedObjects++ : this._layer.numHighlightedObjects--;
        this._layer.setFlags(this._portionId, flags);
    }

    _setGhosted(flags) {
        (flags & RENDER_FLAGS.GHOSTED) ? this._layer.numGhostedObjects++ : this._layer.numGhostedObjects--;
        this._layer.setFlags(this._portionId, flags);
    }

    _setSelected(flags) {
        (flags & RENDER_FLAGS.SELECTED) ? this._layer.numSelectedObjects++ : this._layer.numSelectedObjects--;
        this._layer.setFlags(this._portionId, flags);
    }

    _setEdges(flags) {
        (flags & RENDER_FLAGS.EDGES) ? this._layer.numEdgesObjects++ : this._layer.numEdgesObjects--;
        this._layer.setFlags(this._portionId, flags);
    }

    _setClippable(flags) {
        this._layer.setFlags(this._portionId, flags);
    }

    _setCollidable(flags) {
        this._layer.setFlags(this._portionId, flags);
    }

    _setPickable(flags) {
        this._layer.setFlags(this._portionId, flags);
    }

    _setColor(rgba) {
        this._layer.setColor(this._portionId, rgba);
    }

    drawPickTriangles() { // TODO: refactor, put somewhere else

    }

    getPickResult(pickResult) { // TODO: refactor

    }

    fire() { // TODO: refactor

    }

    /**
     * Given a pick hit record containing picking parameters, get geometry about the pick intersection
     * on the surface of this BigModelMesh, adding it to the hit record.
     *
     * @param hit
     * @param [hit.primIndex]
     * @param [hit.canvasPos]
     * @param [hit.origin]
     * @param [hit.direction]
     * @private
     */
    getPickHitInfo(hit) {
        // BigModelMesh retains no geometry info in memory, so has nothing to add to the pick hit record.
    }

    _destroy() {
        this.model.scene._renderer.putPickID(this.pickId);
    }
}

export {BigModelMesh};