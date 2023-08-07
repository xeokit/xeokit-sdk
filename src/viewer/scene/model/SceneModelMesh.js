
/**
 * @private
 */
export class SceneModelMesh {

    constructor(model, id, color, opacity, layer = null, portionId = 0) {
        this.model = model;
        this.object = null;
        this.parent = null;
        this.id = id;
        this.aabb = null;
        this.layer = layer;
        this.portionId = portionId;
        this._color = [color[0], color[1], color[2], opacity]; // [0..255]
        this._colorize = [color[0], color[1], color[2], opacity]; // [0..255]
        this._colorizing = false;
        this._transparent = (opacity < 255);
        this.numTriangles = 0;
        this.origin = null;
    }

    _finalize(entityFlags) {
        this.layer.initFlags(this.portionId, entityFlags, this._transparent);
    }

    _finalize2() {
        if (this.layer.flushInitFlags) {
            this.layer.flushInitFlags();
        }
    }

    _setVisible(entityFlags) {
        this.layer.setVisible(this.portionId, entityFlags, this._transparent);
    }

    _setColor(color) {
        this._color[0] = color[0];
        this._color[1] = color[1];
        this._color[2] = color[2];
        if (!this._colorizing) {
            this.layer.setColor(this.portionId, this._color, false);
        }
    }

    _setColorize(colorize) {
        const setOpacity = false;
        if (colorize) {
            this._colorize[0] = colorize[0];
            this._colorize[1] = colorize[1];
            this._colorize[2] = colorize[2];
            this.layer.setColor(this.portionId, this._colorize, setOpacity);
            this._colorizing = true;
        } else {
            this.layer.setColor(this.portionId, this._color, setOpacity);
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
            this.layer.setColor(this.portionId, this._colorize);
        } else {
            this.layer.setColor(this.portionId, this._color);
        }
        if (changingTransparency) {
            this.layer.setTransparent(this.portionId, entityFlags, newTransparent);
        }
    }

    _setOffset(offset) {
        this.layer.setOffset(this.portionId, offset);
    }

    _setHighlighted(entityFlags) {
        this.layer.setHighlighted(this.portionId, entityFlags, this._transparent);
    }

    _setXRayed(entityFlags) {
        this.layer.setXRayed(this.portionId, entityFlags, this._transparent);
    }

    _setSelected(entityFlags) {
        this.layer.setSelected(this.portionId, entityFlags, this._transparent);
    }

    _setEdges(entityFlags) {
        this.layer.setEdges(this.portionId, entityFlags, this._transparent);
    }

    _setClippable(entityFlags) {
        this.layer.setClippable(this.portionId, entityFlags, this._transparent);
    }

    _setCollidable(entityFlags) {
        this.layer.setCollidable(this.portionId, entityFlags);
    }

    _setPickable(flags) {
        this.layer.setPickable(this.portionId, flags, this._transparent);
    }

    _setCulled(flags) {
        this.layer.setCulled(this.portionId, flags, this._transparent);
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
        return this.layer.precisionRayPickSurface ? this.layer.precisionRayPickSurface(this.portionId, worldRayOrigin, worldRayDir, worldSurfacePos, worldSurfaceNormal) : false;
    }

    canPickWorldPos() {
        return true;
    }

    drawPickDepths(frameCtx) {
        this.model.drawPickDepths(frameCtx);
    }

    drawPickNormals(frameCtx) {
        this.model.drawPickNormals(frameCtx);
    }

    delegatePickedEntity() {
        return this.parent;
    }

    getEachVertex(callback) {
        this.layer.getEachVertex(this.portionId, callback);
    }

    _destroy() {
        this.model.scene._renderer.putPickID(this.pickId);
    }
}
