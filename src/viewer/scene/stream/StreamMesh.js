
/**
 * @private
 */
export class StreamMesh {

    constructor(streamModel, id, color, opacity, streamLayer = null, portionId = 0) {
        this.streamModel = streamModel;
        this.object = null;
        this.parent = null;
        this.id = id;
        this._aabb = null;
        this.streamLayer = streamLayer;
        this.portionId = portionId;
        this._color = [color[0], color[1], color[2], opacity]; // [0..255]
        this._colorize = [color[0], color[1], color[2], opacity]; // [0..255]
        this._colorizing = false;
        this._transparent = (opacity < 255);
        this.numTriangles = 0;
        this.origin = null;
    }

    _finalize(entityFlags) {
        this.streamLayer.initFlags(this.portionId, entityFlags, this._transparent);
    }

    _finalize2() {
        if (this.streamLayer.flushInitFlags) {
            this.streamLayer.flushInitFlags();
        }
    }

    _setVisible(entityFlags) {
        this.streamLayer.setVisible(this.portionId, entityFlags, this._transparent);
    }

    _setColor(color) {
        this._color[0] = color[0];
        this._color[1] = color[1];
        this._color[2] = color[2];
        if (!this._colorizing) {
            this.streamLayer.setColor(this.portionId, this._color, false);
        }
    }

    _setColorize(colorize) {
        const setOpacity = false;
        if (colorize) {
            this._colorize[0] = colorize[0];
            this._colorize[1] = colorize[1];
            this._colorize[2] = colorize[2];
            this.streamLayer.setColor(this.portionId, this._colorize, setOpacity);
            this._colorizing = true;
        } else {
            this.streamLayer.setColor(this.portionId, this._color, setOpacity);
            this._colorizing = false;
        }
    }

    _setOpacity(opacity, entityFlags) {
        const newTransparent = (opacity < 255);
        const lastTransparent = this._transparent;
        const changingTransparency = (lastTransparent !== newTransparent);
        this._color[3] = opacity;
        this._colorize[3] = opacity;
        this._transparent = newTransparent;
        if (this._colorizing) {
            this.streamLayer.setColor(this.portionId, this._colorize);
        } else {
            this.streamLayer.setColor(this.portionId, this._color);
        }
        if (changingTransparency) {
            this.streamLayer.setTransparent(this.portionId, entityFlags, newTransparent);
        }
    }

    _setOffset(offset) {
        this.streamLayer.setOffset(this.portionId, offset);
    }

    _setHighlighted(entityFlags) {
        this.streamLayer.setHighlighted(this.portionId, entityFlags, this._transparent);
    }

    _setXRayed(entityFlags) {
        this.streamLayer.setXRayed(this.portionId, entityFlags, this._transparent);
    }

    _setSelected(entityFlags) {
        this.streamLayer.setSelected(this.portionId, entityFlags, this._transparent);
    }

    _setEdges(entityFlags) {
        this.streamLayer.setEdges(this.portionId, entityFlags, this._transparent);
    }

    _setClippable(entityFlags) {
        this.streamLayer.setClippable(this.portionId, entityFlags, this._transparent);
    }

    _setCollidable(entityFlags) {
        this.streamLayer.setCollidable(this.portionId, entityFlags);
    }

    _setPickable(flags) {
        this.streamLayer.setPickable(this.portionId, flags, this._transparent);
    }

    _setCulled(flags) {
        this.streamLayer.setCulled(this.portionId, flags, this._transparent);
    }

    canPickTriangle() {
        return false;
    }

    drawPickTriangles(renderFlags, frameCtx) {
        // NOP
    }

    pickTriangleSurface(pickResult) {
        // NOP
    }

    precisionRayPickSurface(worldRayOrigin, worldRayDir, worldSurfacePos, worldSurfaceNormal) {
        return this.streamLayer.precisionRayPickSurface ? this.layer.precisionRayPickSurface(this.portionId, worldRayOrigin, worldRayDir, worldSurfacePos, worldSurfaceNormal) : false;
    }

    canPickWorldPos() {
        return true;
    }

    drawPickDepths(frameCtx) {
        this.streamModel.drawPickDepths(frameCtx);
    }

    drawPickNormals(frameCtx) {
        this.streamModel.drawPickNormals(frameCtx);
    }

    delegatePickedEntity() {
        return this.parent;
    }

    getEachVertex(callback) {
        this.layer.getEachVertex(this.portionId, callback);
    }

    set aabb(aabb) { // Called by ScenestreamModel
        this._aabb = aabb;
    }

    get aabb() { // called by SceneModelEntity
        return this._aabb;
    }

    _destroy() {
        this.streamModel.scene._renderer.putPickID(this.pickId);
    }
}
