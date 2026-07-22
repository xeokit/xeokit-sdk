import {math} from "../../math/math.js";
import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {packSplats} from "../splats/packSplats.js";
import {GaussianSplatTechnique} from "../splats/GaussianSplatTechnique.js";

const COUNTED_FLAGS = [
    [ENTITY_FLAGS.VISIBLE, "numVisibleLayerPortions"],
    [ENTITY_FLAGS.CULLED, "numCulledLayerPortions"],
    [ENTITY_FLAGS.PICKABLE, "numPickableLayerPortions"],
    [ENTITY_FLAGS.CLIPPABLE, "numClippableLayerPortions"],
    [ENTITY_FLAGS.XRAYED, "numXRayedLayerPortions"],
    [ENTITY_FLAGS.HIGHLIGHTED, "numHighlightedLayerPortions"],
    [ENTITY_FLAGS.SELECTED, "numSelectedLayerPortions"]
];

function toPackedColors(colors, count) {
    if (!colors) {
        const result = new Uint8Array(count * 4);
        result.fill(255);
        return result;
    }
    if (colors instanceof Uint8Array || colors instanceof Uint8ClampedArray) {
        return new Uint8Array(colors);
    }
    const result = new Uint8Array(colors.length);
    for (let i = 0, len = colors.length; i < len; i++) {
        result[i] = Math.round(Math.max(0, Math.min(1, colors[i])) * 255);
    }
    return result;
}

function getCentresAABB(positions) {
    const aabb = math.collapseAABB3();
    math.expandAABB3Points3(aabb, positions);
    return aabb;
}

/**
 * SceneModel layer for one Gaussian-splat mesh.
 *
 * The one-mesh restriction keeps depth sorting internally coherent. Merging or
 * globally sorting multiple splat meshes is deliberately outside this layer.
 *
 * @private
 */
export class GaussianSplatLayer {

    constructor(model, origin) {
        this.model = model;
        this.primitive = "gaussian-splats";
        this.origin = origin;
        this.solid = false;
        this.sortId = "GaussianSplats";
        this.layerIndex = 0;
        this.layerTextureSet = null;
        this.drawCalls = 1;

        this._meshes = [];
        this._portion = null;
        this._technique = null;
        this._finalized = false;
        this._aabb = math.collapseAABB3();
        this._aabbDirty = true;
    }

    canCreatePortion() {
        return this._portion === null;
    }

    createPortion(mesh, cfg) {
        if (!this.canCreatePortion()) {
            throw new Error("GaussianSplatLayer supports exactly one mesh portion");
        }
        const count = cfg.positions.length / 3;
        const colors = toPackedColors(cfg.colors, count);
        const packed = packSplats({
            positions: cfg.positions,
            scales: cfg.scales,
            rotations: cfg.rotations,
            colors
        });
        const aabb = cfg.aabb || getCentresAABB(cfg.positions);

        this._portion = {
            mesh,
            count,
            packed,
            flags: 0,
            color: new Uint8Array([255, 255, 255, 255]),
            matrix: cfg.meshMatrix || null,
            offset: math.vec3()
        };
        this._meshes.push(mesh);
        this.model.numPortions++;
        mesh.aabb = aabb;
        this._aabbDirty = true;
        return 0;
    }

    finalize() {
        if (this._finalized || !this._portion) {
            return;
        }
        this._technique = new GaussianSplatTechnique(
            this.model.scene.canvas.gl,
            this._portion.packed,
            this._portion.count
        );
        this._finalized = true;
    }

    initFlags(portionId, flags) {
        this._assertPortion(portionId);
        this._updateFlagCounts(0, flags);
        this._portion.flags = flags;
        // Gaussian splats always participate in the transparent pass because
        // opacity is stored per splat, independently of mesh opacity.
        this.model.numTransparentLayerPortions++;
    }

    flushInitFlags() {
    }

    getAABB() {
        if (this._aabbDirty) {
            math.collapseAABB3(this._aabb);
            for (let i = 0, len = this._meshes.length; i < len; i++) {
                math.expandAABB3(this._aabb, this._meshes[i].aabb);
            }
            this._aabbDirty = false;
        }
        return this._aabb;
    }

    aabbChanged() {
        this._aabbDirty = true;
    }

    setVisible(portionId, flags) { this._setFlags(portionId, flags); }
    setCulled(portionId, flags) { this._setFlags(portionId, flags); }
    setPickable(portionId, flags) { this._setFlags(portionId, flags); }
    setClippable(portionId, flags) { this._setFlags(portionId, flags); }
    setXRayed(portionId, flags) { this._setFlags(portionId, flags); }
    setHighlighted(portionId, flags) { this._setFlags(portionId, flags); }
    setSelected(portionId, flags) { this._setFlags(portionId, flags); }
    setEdges(portionId, flags) { this._setFlags(portionId, flags); }
    setCollidable(portionId, flags) { this._setFlags(portionId, flags); }

    setTransparent(portionId) {
        this._assertPortion(portionId);
        // Always transparent; changing mesh opacity must not move this layer to
        // the opaque pass.
    }

    setColor(portionId, color) {
        this._assertPortion(portionId);
        this._portion.color.set(color);
    }

    setMatrix(portionId, matrix) {
        this._assertPortion(portionId);
        this._portion.matrix = matrix ? matrix.slice() : null;
        this.aabbChanged();
    }

    setOffset(portionId, offset) {
        this._assertPortion(portionId);
        this._portion.offset.set(offset);
        this.aabbChanged();
    }

    drawColorTransparent(renderFlags, frameCtx) {
        if (!this._technique || !this._portion) {
            return;
        }
        const flags = this._portion.flags;
        if (!(flags & ENTITY_FLAGS.VISIBLE) || (flags & ENTITY_FLAGS.CULLED)) {
            return;
        }
        this._technique.drawColorTransparent(frameCtx);
    }

    drawColorOpaque() {}
    drawDepth() {}
    drawSilhouetteXRayed() {}
    drawSilhouetteHighlighted() {}
    drawSilhouetteSelected() {}
    drawEdgesColorOpaque() {}
    drawEdgesColorTransparent() {}
    drawEdgesXRayed() {}
    drawEdgesHighlighted() {}
    drawEdgesSelected() {}
    drawOcclusion() {}
    drawShadow() {}
    drawPickMesh() {}
    drawPickDepths() {}
    drawPickNormals() {}
    drawSnap() {}

    destroy() {
        if (this._technique) {
            this._technique.destroy();
        }
        this._technique = null;
        this._portion = null;
        this._meshes = [];
        this._finalized = false;
    }

    _setFlags(portionId, flags) {
        this._assertPortion(portionId);
        this._updateFlagCounts(this._portion.flags, flags);
        this._portion.flags = flags;
    }

    _updateFlagCounts(oldFlags, newFlags) {
        for (let i = 0, len = COUNTED_FLAGS.length; i < len; i++) {
            const [flag, property] = COUNTED_FLAGS[i];
            const wasSet = !!(oldFlags & flag);
            const isSet = !!(newFlags & flag);
            if (wasSet !== isSet) {
                this.model[property] += isSet ? 1 : -1;
            }
        }
    }

    _assertPortion(portionId) {
        if (portionId !== 0 || !this._portion) {
            throw new Error(`GaussianSplatLayer portion not found: ${portionId}`);
        }
    }
}
