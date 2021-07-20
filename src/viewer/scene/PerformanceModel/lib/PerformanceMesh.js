import {math} from "../../math/math.js";

/**
 * @private
 * @implements Pickable
 */
class PerformanceMesh {

    constructor(model, id, color, opacity, layer = null, portionId = 0) {

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
         * The PerformanceNode that contains this PerformanceModelMesh.
         *
         * A PerformanceModelMesh always belongs to exactly one PerformanceNode.
         *
         * @property object
         * @type {PerformanceNode}
         * @final
         */
        this.object = null;

        /**
         * The PerformanceNode that contains this PerformanceModelMesh.
         *
         * A PerformanceModelMesh always belongs to exactly one PerformanceNode.
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
         * Represented by a six-element Float64Array containing the min/max extents of the
         * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
         *
         * @property aabb
         * @final
         * @type {Float64Array}
         */
        this.aabb = math.AABB3();

        this._layer = layer;
        this._portionId = portionId;

        this._color = [color[0], color[1], color[2], opacity]; // [0..255]
        this._colorize = [color[0], color[1], color[2], opacity]; // [0..255]
        this._colorizing = false;

        this._transparent = (opacity < 255);

        this.numTriangles = 0;

        /**
         * 3D origin of the PerformanceMesh's vertex positions, if they are in relative-to-center (RTC) coordinates.
         *
         * When this is defined, then the positions are RTC, which means that they are relative to this position.
         *
         * @property rtcCenter
         * @type {Float64Array}
         */
        this.rtcCenter = null;
    }

    /**
     * @private
     */
    _finalize(entityFlags) {
        this._layer.initFlags(this._portionId, entityFlags, this._transparent);
    }

    /**
     * @private
     */
    _setVisible(entityFlags) {
        this._layer.setVisible(this._portionId, entityFlags, this._transparent);
    }

    /**
     * @private
     */
    _setColor(color) {
        this._color[0] = color[0];
        this._color[1] = color[1];
        this._color[2] = color[2];
        if (!this._colorizing) {
            this._layer.setColor(this._portionId, this._color, false);
        }
    }

    /** @private */
    _setColorize(colorize) {
        const setOpacity = false;
        if (colorize) {
            this._colorize[0] = colorize[0];
            this._colorize[1] = colorize[1];
            this._colorize[2] = colorize[2];
            this._layer.setColor(this._portionId, this._colorize, setOpacity);
            this._colorizing = true;
        } else {
            this._layer.setColor(this._portionId, this._color, setOpacity);
            this._colorizing = false;
        }
    }

    /** @private */
    _setOpacity(opacity, entityFlags) {
        const newTransparent = (opacity < 255);
        const lastTransparent = this._transparent;
        const changingTransparency = (lastTransparent !== newTransparent);
        this._color[3] = opacity;
        this._colorize[3] = opacity;
        this._transparent = newTransparent;
        if (this._colorizing) {
            this._layer.setColor(this._portionId, this._colorize);
        } else {
            this._layer.setColor(this._portionId, this._color);
        }
        if (changingTransparency) {
            this._layer.setTransparent(this._portionId, entityFlags, newTransparent);
        }
    }

    /**
     * @private
     */
    _setOffset(offset) {
        this._layer.setOffset(this._portionId, offset);
    }

    /**
     * @private
     */
    _setHighlighted(entityFlags) {
        this._layer.setHighlighted(this._portionId, entityFlags, this._transparent);
    }

    /**
     * @private
     */
    _setXRayed(entityFlags) {
        this._layer.setXRayed(this._portionId, entityFlags, this._transparent);
    }

    /**
     * @private
     */
    _setSelected(entityFlags) {
        this._layer.setSelected(this._portionId, entityFlags, this._transparent);
    }

    /**
     * @private
     */
    _setEdges(entityFlags) {
        this._layer.setEdges(this._portionId, entityFlags, this._transparent);
    }

    /**
     * @private
     */
    _setClippable(entityFlags) {
        this._layer.setClippable(this._portionId, entityFlags, this._transparent);
    }

    /**
     * @private
     */
    _setCollidable(entityFlags) {
        this._layer.setCollidable(this._portionId, entityFlags);
    }

    /**
     * @private
     */
    _setPickable(flags) {
        this._layer.setPickable(this._portionId, flags, this._transparent);
    }

    /**
     * @private
     */
    _setCulled(flags) {
        this._layer.setCulled(this._portionId, flags, this._transparent);
    }

    /** @private */
    canPickTriangle() {
        return false;
    }

    /** @private */
    drawPickTriangles(renderFlags, frameCtx) {
        // NOP
    }

    /** @private */
    pickTriangleSurface(pickResult) {
        // NOP
    }

    /** @private */
    precisionRayPickSurface(worldRayOrigin, worldRayDir, worldSurfacePos) {
        return this._layer.precisionRayPickSurface ? this._layer.precisionRayPickSurface(this._portionId, worldRayOrigin, worldRayDir, worldSurfacePos) : false;
    }

    /** @private */
    canPickWorldPos() {
        return true;
    }

    /** @private */
    drawPickDepths(frameCtx) {
        this.model.drawPickDepths(frameCtx);
    }

    /** @private */
    drawPickNormals(frameCtx) {
        this.model.drawPickNormals(frameCtx);
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