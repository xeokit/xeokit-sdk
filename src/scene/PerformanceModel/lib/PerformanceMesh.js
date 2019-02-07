import {math} from "../../math/math.js";

/**
 * @private
 */
class PerformanceMesh {

    constructor(model, id, layer = null, portionId = 0) {

        /**
         * The PerformanceModel that contains this PerformanceModelMesh.
         *
         * A PerformanceModelMesh always belongs to exactly one PerformanceModel.
         *
         * @property model
         * @type {PerformanceModel}
         * @final
         */
        this.model = model;

        /**
         * The PerformanceModelObject that contains this PerformanceModelMesh.
         *
         * A PerformanceModelMesh always belongs to exactly one PerformanceModelObject.
         *
         * @property object
         * @type {PerformanceNode}
         * @final
         */
        this.object = null;

        /**
         * The PerformanceModelObject that contains this PerformanceModelMesh.
         *
         * A PerformanceModelMesh always belongs to exactly one PerformanceModelObject.
         *
         * @property object
         * @type {PerformanceNode}
         * @final
         */
        this.parent = null;

        /**
         * ID of this PerformanceModelMesh, unique within the xeokit.Scene.
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
         * @type {Number[]}
         */
        this.aabb = math.AABB3();

        this._layer = layer;
        this._portionId = portionId;
    }

    fire() { // TODO
    }

    /**
     * @private
     */
    _initFlags(flags) {
        this._layer.initFlags(this._portionId, flags);
    }

    /**
     * @private
     */
    _setVisible(flags) {
        this._layer.setVisible(this._portionId, flags);
    }

    /**
     * @private
     */
    _setHighlighted(flags) {
        this._layer.setHighlighted(this._portionId, flags);
    }

    /**
     * @private
     */
    _setXRayed(flags) {
        this._layer.setXRayed(this._portionId, flags);
    }

    /**
     * @private
     */
    _setSelected(flags) {
        this._layer.setSelected(this._portionId, flags);
    }

    /**
     * @private
     */
    _setEdges(flags) {
        this._layer.setEdges(this._portionId, flags);
    }

    /**
     * @private
     */
    _setClippable(flags) {
        this._layer.setClippable(this._portionId, flags);
    }

    /**
     * @private
     */
    _setCollidable(flags) {
        this._layer.setCollidable(this._portionId, flags);
    }

    /**
     * @private
     */
    _setPickable(flags) {
        this._layer.setPickable(this._portionId, flags);
    }

    /**
     * @private
     */
    isSurfacePickable() {
        return false; // No geometry data in memory - can't support surface picking
    }

    /**
     * @private
     */
    surfacePick(pickResult) {
        // NOP
    }

    /**
     * @private
     * @returns {PerformanceNode}
     */
    delegatePickedEntity() {
        return this.parent;
    }

    /**
     * @private
     */
    _destroy() {
        this.model.scene._renderer.putPickID(this.pickId);
    }
}

export {PerformanceMesh};