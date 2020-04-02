import {math} from "../../../math/math.js";
import {WEBGL_INFO} from "../../../webglInfo.js";
import {RenderState} from "../../../webgl/RenderState.js";
import {ArrayBuf} from "../../../webgl/ArrayBuf.js";

import {RENDER_FLAGS} from '../renderFlags.js';
import {RENDER_PASSES} from '../renderPasses.js';
import {geometryCompressionUtils} from "../../../math/geometryCompressionUtils.js";
import {getBatchingRenderers} from "./BatchingRenderers.js";

const tempMat4 = math.mat4();
const tempMat4b = math.mat4();
const tempVec3a = math.vec4([0, 0, 0, 1]);
const tempVec3b = math.vec4([0, 0, 0, 1]);
const tempVec3c = math.vec4([0, 0, 0, 1]);
const tempOBB3 = math.OBB3();

/**
 * @private
 */
class BatchingLayer {

    /**
     * @param model
     * @param cfg
     * @param cfg.buffer
     * @param cfg.scratchMemory
     * @param cfg.primitive
     */
    constructor(model, cfg) {
        this._batchingRenderers = getBatchingRenderers(model.scene);
        this.model = model;
        this._buffer = cfg.buffer;
        this._scratchMemory = cfg.scratchMemory;
        var primitiveName = cfg.primitive || "triangles";
        var primitive;
        const gl = model.scene.canvas.gl;
        switch (primitiveName) {
            case "points":
                primitive = gl.POINTS;
                break;
            case "lines":
                primitive = gl.LINES;
                break;
            case "line-loop":
                primitive = gl.LINE_LOOP;
                break;
            case "line-strip":
                primitive = gl.LINE_STRIP;
                break;
            case "triangles":
                primitive = gl.TRIANGLES;
                break;
            case "triangle-strip":
                primitive = gl.TRIANGLE_STRIP;
                break;
            case "triangle-fan":
                primitive = gl.TRIANGLE_FAN;
                break;
            default:
                model.error(`Unsupported value for 'primitive': '${primitiveName}' - supported values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'. Defaulting to 'triangles'.`);
                primitive = gl.TRIANGLES;
                primitiveName = "triangles";
        }

        this._state = new RenderState({
            primitiveName: primitiveName,
            primitive: primitive,
            positionsBuf: null,
            normalsBuf: null,
            colorsbuf: null,
            flagsBuf: null,
            flags2Buf: null,
            indicesBuf: null,
            edgeIndicesBuf: null,
            positionsDecodeMatrix: math.mat4()
        });

        // These counts are used to avoid unnecessary render passes
        this._numPortions = 0;
        this._numVisibleLayerPortions = 0;
        this._numTransparentLayerPortions = 0;
        this._numXRayedLayerPortions = 0;
        this._numSelectedLayerPortions = 0;
        this._numHighlightedLayerPortions = 0;
        this._numEdgesLayerPortions = 0;
        this._numPickableLayerPortions = 0;

        //this.pickObjectBaseIndex = cfg.pickObjectBaseIndex;

        this._modelAABB = math.collapseAABB3(); // Model-space AABB
        this._portions = [];

        this._finalized = false;
        this._positionsDecodeMatrix = cfg.positionsDecodeMatrix;
        this._preCompressed = (!!this._positionsDecodeMatrix);
    }

    /**
     * Tests if there is room for another portion in this BatchingLayer.
     *
     * @param lenPositions Number of positions we'd like to create in the portion.
     * @returns {boolean} True if OK to creatye another portion.
     */
    canCreatePortion(lenPositions) {
        if (this._finalized) {
            throw "Already finalized";
        }
        return (!this._finalized && this._buffer.lenPositions + lenPositions) < (this._buffer.maxVerts * 3);
    }

    /**
     *
     * Creates a new portion within this InstancingLayer, returns the new portion ID.
     *
     * Gives the portion the specified geometry, flags, color and matrix.
     *
     * @param positions Flat float Local-space positions array.
     * @param normals Flat float normals array.
     * @param indices  Flat int indices array.
     * @param edgeIndices Flat int edges indices array.
     * @param flags Unsigned long int
     * @param color Quantized RGB color [0..255,0..255,0..255,0..255]
     * @param opacity Opacity [0..255]
     * @param [meshMatrix] Flat float 4x4 matrix
     * @param [worldMatrix] Flat float 4x4 matrix
     * @param worldAABB Flat float AABB World-space AABB
     * @param pickColor Quantized pick color
     * @returns {number} Portion ID
     */
    createPortion(positions, normals, indices, edgeIndices, flags, color, opacity, meshMatrix, worldMatrix, worldAABB, pickColor) {

        if (this._finalized) {
            throw "Already finalized";
        }

        const buffer = this._buffer;
        const positionsIndex = buffer.lenPositions;
        const vertsIndex = positionsIndex / 3;
        const numVerts = positions.length / 3;
        const lenPositions = positions.length;

        if (this._preCompressed) {

            buffer.positions.set(positions, buffer.lenPositions);
            buffer.lenPositions += lenPositions;

            const bounds = geometryCompressionUtils.getPositionsBounds(positions);

            const min = geometryCompressionUtils.decompressPosition(bounds.min, this._positionsDecodeMatrix, []);
            const max = geometryCompressionUtils.decompressPosition(bounds.max, this._positionsDecodeMatrix, []);

            worldAABB[0] = min[0];
            worldAABB[1] = min[1];
            worldAABB[2] = min[2];
            worldAABB[3] = max[0];
            worldAABB[4] = max[1];
            worldAABB[5] = max[2];

            if (worldMatrix) {
                math.AABB3ToOBB3(worldAABB, tempOBB3);
                math.transformOBB3(worldMatrix, tempOBB3);
                math.OBB3ToAABB3(tempOBB3, worldAABB);
            }

        } else {

            buffer.positions.set(positions, buffer.lenPositions);

            if (meshMatrix) {

                for (let i = buffer.lenPositions, len = buffer.lenPositions + lenPositions; i < len; i += 3) {

                    tempVec3a[0] = buffer.positions[i + 0];
                    tempVec3a[1] = buffer.positions[i + 1];
                    tempVec3a[2] = buffer.positions[i + 2];

                    math.transformPoint4(meshMatrix, tempVec3a, tempVec3b);

                    buffer.positions[i + 0] = tempVec3b[0];
                    buffer.positions[i + 1] = tempVec3b[1];
                    buffer.positions[i + 2] = tempVec3b[2];

                    math.expandAABB3Point3(this._modelAABB, tempVec3b);

                    if (worldMatrix) {
                        math.transformPoint4(worldMatrix, tempVec3b, tempVec3c);
                        math.expandAABB3Point3(worldAABB, tempVec3c);
                    } else {
                        math.expandAABB3Point3(worldAABB, tempVec3b);
                    }
                }

            } else {

                for (let i = buffer.lenPositions, len = buffer.lenPositions + lenPositions; i < len; i += 3) {

                    tempVec3a[0] = buffer.positions[i + 0];
                    tempVec3a[1] = buffer.positions[i + 1];
                    tempVec3a[2] = buffer.positions[i + 2];

                    math.expandAABB3Point3(this._modelAABB, tempVec3a);

                    if (worldMatrix) {
                        math.transformPoint4(worldMatrix, tempVec3a, tempVec3b);
                        math.expandAABB3Point3(worldAABB, tempVec3b);
                    } else {
                        math.expandAABB3Point3(worldAABB, tempVec3a);
                    }
                }
            }

            buffer.lenPositions += lenPositions;
        }

        if (normals) {

            if (this._preCompressed) {

                buffer.normals.set(normals, buffer.lenNormals);
                buffer.lenNormals += normals.length;

            } else {

                var modelNormalMatrix = tempMat4;

                if (meshMatrix) {
                    math.inverseMat4(math.transposeMat4(meshMatrix, tempMat4b), modelNormalMatrix); // Note: order of inverse and transpose doesn't matter

                } else {
                    math.identityMat4(modelNormalMatrix, modelNormalMatrix);
                }

                buffer.lenNormals = transformAndOctEncodeNormals(modelNormalMatrix, normals, normals.length, buffer.normals, buffer.lenNormals);
            }
        }

        if (flags !== undefined) {

            const lenFlags = (numVerts * 4);
            const visible = !!(flags & RENDER_FLAGS.VISIBLE) ? 255 : 0;
            const xrayed = !!(flags & RENDER_FLAGS.XRAYED) ? 255 : 0;
            const highlighted = !!(flags & RENDER_FLAGS.HIGHLIGHTED) ? 255 : 0;
            const selected = !!(flags & RENDER_FLAGS.SELECTED) ? 255 : 0;
            const clippable = !!(flags & RENDER_FLAGS.CLIPPABLE) ? 255 : 0;
            const edges = !!(flags & RENDER_FLAGS.EDGES) ? 255 : 0;
            const pickable = !!(flags & RENDER_FLAGS.PICKABLE) ? 255 : 0;

            for (var i = buffer.lenFlags, len = buffer.lenFlags + lenFlags; i < len; i += 4) {
                buffer.flags[i + 0] = visible;
                buffer.flags[i + 1] = xrayed;
                buffer.flags[i + 2] = highlighted;
                buffer.flags[i + 3] = selected;
                buffer.flags2[i + 0] = clippable;
                buffer.flags2[i + 1] = edges;
                buffer.flags2[i + 2] = pickable;
            }
            buffer.lenFlags += lenFlags;
            if (visible) {
                this._numVisibleLayerPortions++;
                this.model.numVisibleLayerPortions++;
            }
            if (xrayed) {
                this._numXRayedLayerPortions++;
                this.model.numXRayedLayerPortions++;
            }
            if (highlighted) {
                this._numHighlightedLayerPortions++;
                this.model.numHighlightedLayerPortions++;
            }
            if (selected) {
                this._numSelectedLayerPortions++;
                this.model.numSelectedLayerPortions++;
            }
            if (edges) {
                this._numEdgesLayerPortions++;
                this.model.numEdgesLayerPortions++;
            }
            if (pickable) {
                this._numPickableLayerPortions++;
                this.model.numPickableLayerPortions++;
            }
        }
        if (color) {
            const lenColors = (numVerts * 4);

            const r = color[0]; // Color is pre-quantized by PerformanceModel
            const g = color[1];
            const b = color[2];

            const a = opacity;

            for (var i = buffer.lenColors, len = buffer.lenColors + lenColors; i < len; i += 4) {
                buffer.colors[i + 0] = r;
                buffer.colors[i + 1] = g;
                buffer.colors[i + 2] = b;
                buffer.colors[i + 3] = opacity;
            }
            buffer.lenColors += lenColors;
            if (a < 255) {
                this._numTransparentLayerPortions++;
                this.model.numTransparentLayerPortions++;
            }
        }
        if (indices) {
            for (var i = 0, len = indices.length; i < len; i++) {
                buffer.indices[buffer.lenIndices + i] = indices[i] + vertsIndex;
            }
            buffer.lenIndices += indices.length;
        }
        if (edgeIndices) {
            for (var i = 0, len = edgeIndices.length; i < len; i++) {
                buffer.edgeIndices[buffer.lenEdgeIndices + i] = edgeIndices[i] + vertsIndex;
            }
            buffer.lenEdgeIndices += edgeIndices.length;
        }
        {
            const lenPickColors = numVerts * 4;
            for (var i = buffer.lenPickColors, len = buffer.lenPickColors + lenPickColors; i < len; i += 4) {
                buffer.pickColors[i + 0] = pickColor[0];
                buffer.pickColors[i + 1] = pickColor[1];
                buffer.pickColors[i + 2] = pickColor[2];
                buffer.pickColors[i + 3] = pickColor[3];
            }
            buffer.lenPickColors += lenPickColors;
        }

        var portionId = this._portions.length / 2;
        this._portions.push(vertsIndex);
        this._portions.push(numVerts);

        this._numPortions++;
        this.model.numPortions++;

        return portionId;
    }

    /**
     * Builds batch VBOs from appended geometries.
     * No more portions can then be created.
     */
    finalize() {
        if (this._finalized) {
            this.error("Already finalized");
            return;
        }

        const state = this._state;
        const gl = this.model.scene.canvas.gl;
        const buffer = this._buffer;

        if (this._preCompressed) {
            state.positionsDecodeMatrix = this._positionsDecodeMatrix;
            state.positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, buffer.positions.slice(0, buffer.lenPositions), buffer.lenPositions, 3, gl.STATIC_DRAW);
        } else {
            quantizePositions(buffer.positions, buffer.lenPositions, this._modelAABB, buffer.quantizedPositions, state.positionsDecodeMatrix); // BOTTLENECK

            if (buffer.lenPositions > 0) {
                state.positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, buffer.quantizedPositions.slice(0, buffer.lenPositions), buffer.lenPositions, 3, gl.STATIC_DRAW);
            }
        }

        if (buffer.lenNormals > 0) {
            let normalized = true; // For oct encoded UInts
            //let normalized = false; // For scaled
            state.normalsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, buffer.normals.slice(0, buffer.lenNormals), buffer.lenNormals, 3, gl.STATIC_DRAW, normalized);
        }
        if (buffer.lenColors > 0) {
            let normalized = false;
            state.colorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, buffer.colors.slice(0, buffer.Colors), buffer.lenColors, 4, gl.DYNAMIC_DRAW, normalized);
        }
        if (buffer.lenFlags > 0) {
            let normalized = true;
            state.flagsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, buffer.flags.slice(0, buffer.lenFlags), buffer.lenFlags, 4, gl.DYNAMIC_DRAW, normalized);
            state.flags2Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, buffer.flags2.slice(0, buffer.lenFlags), buffer.lenFlags, 4, gl.DYNAMIC_DRAW, normalized);
        }
        if (buffer.lenPickColors > 0) {
            let normalized = false;
            state.pickColorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, buffer.pickColors.slice(0, buffer.lenPickColors), buffer.lenPickColors, 4, gl.STATIC_DRAW, normalized);
        }
        if (buffer.lenIndices > 0) {
            state.indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, buffer.indices.slice(0, buffer.lenIndices), buffer.lenIndices, 1, gl.STATIC_DRAW);
        }
        if (buffer.lenEdgeIndices > 0) {
            state.edgeIndicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, buffer.edgeIndices.slice(0, buffer.lenEdgeIndices), buffer.lenEdgeIndices, 1, gl.STATIC_DRAW);
        }

        buffer.lenPositions = 0;
        buffer.lenColors = 0;
        buffer.lenNormals = 0;
        buffer.lenFlags = 0;
        buffer.lenPickColors = 0;
        buffer.lenIndices = 0;
        buffer.lenEdgeIndices = 0;

        this._buffer = null;
        this._finalized = true;
    }

    // The following setters are called by PerformanceModelMesh, in turn called by PerformanceModelNode, only after the layer is finalized.
    // It's important that these are called after finalize() in order to maintain integrity of counts like _numVisibleLayerPortions etc.

    initFlags(portionId, flags) {
        if (flags & RENDER_FLAGS.VISIBLE) {
            this._numVisibleLayerPortions++;
            this.model.numVisibleLayerPortions++;
        }
        if (flags & RENDER_FLAGS.HIGHLIGHTED) {
            this._numHighlightedLayerPortions++;
            this.model.numHighlightedLayerPortions++;
        }
        if (flags & RENDER_FLAGS.XRAYED) {
            this._numXRayedLayerPortions++;
            this.model.numXRayedLayerPortions++;
        }
        if (flags & RENDER_FLAGS.SELECTED) {
            this._numSelectedLayerPortions++;
            this.model.numSelectedLayerPortions++;
        }
        if (flags & RENDER_FLAGS.EDGES) {
            this._numEdgesLayerPortions++;
            this.model.numEdgesLayerPortions++;
        }
        if (flags & RENDER_FLAGS.PICKABLE) {
            this._numPickableLayerPortions++;
            this.model.numPickableLayerPortions++;
        }
        this._setFlags(portionId, flags);
        this._setFlags2(portionId, flags);
    }

    setVisible(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & RENDER_FLAGS.VISIBLE) {
            this._numVisibleLayerPortions++;
            this.model.numVisibleLayerPortions++;
        } else {
            this._numVisibleLayerPortions--;
            this.model.numVisibleLayerPortions--;
        }
        this._setFlags(portionId, flags);
    }

    setHighlighted(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & RENDER_FLAGS.HIGHLIGHTED) {
            this._numHighlightedLayerPortions++;
            this.model.numHighlightedLayerPortions++;
        } else {
            this._numHighlightedLayerPortions--;
            this.model.numHighlightedLayerPortions--;
        }
        this._setFlags(portionId, flags);
    }

    setXRayed(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & RENDER_FLAGS.XRAYED) {
            this._numXRayedLayerPortions++;
            this.model.numXRayedLayerPortions++;
        } else {
            this._numXRayedLayerPortions--;
            this.model.numXRayedLayerPortions--;
        }
        this._setFlags(portionId, flags);
    }

    setSelected(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & RENDER_FLAGS.SELECTED) {
            this._numSelectedLayerPortions++;
            this.model.numSelectedLayerPortions++;
        } else {
            this._numSelectedLayerPortions--;
            this.model.numSelectedLayerPortions--;
        }
        this._setFlags(portionId, flags);
    }

    setEdges(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & RENDER_FLAGS.EDGES) {
            this._numEdgesLayerPortions++;
            this.model.numEdgesLayerPortions++;
        } else {
            this._numEdgesLayerPortions--;
            this.model.numEdgesLayerPortions--;
        }
        this._setFlags2(portionId, flags);
    }

    setClippable(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        this._setFlags2(portionId, flags);
    }

    setCollidable(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
    }

    setPickable(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        if (flags & RENDER_FLAGS.PICKABLE) {
            this._numPickableLayerPortions++;
            this.model.numPickableLayerPortions++;
        } else {
            this._numPickableLayerPortions--;
            this.model.numPickableLayerPortions--;
        }
        this._setFlags2(portionId, flags);
    }

    setColor(portionId, color, setOpacity = false) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        var portionsIdx = portionId * 2;
        var vertexBase = this._portions[portionsIdx];
        var numVerts = this._portions[portionsIdx + 1];
        var firstColor = vertexBase * 4;
        var lenColor = numVerts * 4;
        const tempArray = this._scratchMemory.getUInt8Array(numVerts);
        const r = color[0];
        const g = color[1];
        const b = color[2];
        const a = color[3];
        for (var i = 0; i < lenColor; i += 4) {
            tempArray[i + 0] = r;
            tempArray[i + 1] = g;
            tempArray[i + 2] = b;
            tempArray[i + 3] = a;
        }
        if (setOpacity) {
            const opacity = color[3];
            if (opacity < 255) {  // TODO: only increment transparency count when  this actually changes from initial value
                this._numTransparentLayerPortions++;
                this.model.numTransparentLayerPortions++;
            } else {
                this._numTransparentLayerPortions--;
                this.model.numTransparentLayerPortions--;
            }
        }
        this._state.colorsBuf.setData(tempArray, firstColor, lenColor);
    }

    _setFlags(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        var portionsIdx = portionId * 2;
        var vertexBase = this._portions[portionsIdx];
        var numVerts = this._portions[portionsIdx + 1];
        var firstFlag = vertexBase * 4;
        var lenFlags = numVerts * 4;
        const tempArray = this._scratchMemory.getUInt8Array(lenFlags);
        var visible = !!(flags & RENDER_FLAGS.VISIBLE) ? 255 : 0;
        var xrayed = !!(flags & RENDER_FLAGS.XRAYED) ? 255 : 0;
        var highlighted = !!(flags & RENDER_FLAGS.HIGHLIGHTED) ? 255 : 0;
        var selected = !!(flags & RENDER_FLAGS.SELECTED) ? 255 : 0; // TODO
        for (var i = 0; i < lenFlags; i += 4) {
            tempArray[i + 0] = visible;
            tempArray[i + 1] = xrayed;
            tempArray[i + 2] = highlighted;
            tempArray[i + 3] = selected;
        }
        this._state.flagsBuf.setData(tempArray, firstFlag, lenFlags);
    }

    _setFlags2(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        var portionsIdx = portionId * 2;
        var vertexBase = this._portions[portionsIdx];
        var numVerts = this._portions[portionsIdx + 1];
        var firstFlag = vertexBase * 4;
        var lenFlags = numVerts * 4;
        var clippable = !!(flags & RENDER_FLAGS.CLIPPABLE) ? 255 : 0;
        var edges = !!(flags & RENDER_FLAGS.EDGES) ? 255 : 0;
        var pickable = !!(flags & RENDER_FLAGS.PICKABLE) ? 255 : 0;
        const tempArray = this._scratchMemory.getUInt8Array(lenFlags);
        for (var i = 0; i < lenFlags; i += 4) {
            tempArray[i + 0] = clippable;
            tempArray[i + 1] = edges;
            tempArray[i + 2] = pickable;
        }
        this._state.flags2Buf.setData(tempArray, firstFlag, lenFlags);
    }

    //-- NORMAL --------------------------------------------------------------------------------------------------------

    drawNormalFillOpaque(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        if (frameCtx.withSAO) {
            if (this._batchingRenderers.drawRendererWithSAO) {
                this._batchingRenderers.drawRendererWithSAO.drawLayer(frameCtx, this, RENDER_PASSES.NORMAL_OPAQUE);
            }
        } else {
            if (this._batchingRenderers.drawRenderer) {
                this._batchingRenderers.drawRenderer.drawLayer(frameCtx, this, RENDER_PASSES.NORMAL_OPAQUE);
            }
        }
    }

    drawNormalEdgesOpaque(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.edgesRenderer) {
            this._batchingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.NORMAL_OPAQUE);
        }
    }

    drawNormalFillTransparent(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === 0 || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        if (this._batchingRenderers.drawRenderer) {
            this._batchingRenderers.drawRenderer.drawLayer(frameCtx, this, RENDER_PASSES.NORMAL_TRANSPARENT);
        }
    }

    drawNormalTransparentEdges(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numEdgesLayerPortions === 0 || this._numTransparentLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.edgesRenderer) {
            this._batchingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.NORMAL_TRANSPARENT);
        }
    }

    //-- SPost effects supprt------------------------------------------------------------------------------------------------

    drawDepth(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        if (this._batchingRenderers.depthRenderer) {
            this._batchingRenderers.depthRenderer.drawLayer(frameCtx, this);
        }
    }

    drawNormals(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numTransparentLayerPortions === this._numPortions || this._numXRayedLayerPortions === this._numPortions) {
            return;
        }
        if (this._batchingRenderers.normalsRenderer) {
            this._batchingRenderers.normalsRenderer.drawLayer(frameCtx, this);
        }
    }

    //-- XRAYED--------------------------------------------------------------------------------------------------------

    drawXRayedFillOpaque(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.fillRenderer) {
            this._batchingRenderers.fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.XRAYED);
        }
    }

    drawXRayedEdgesOpaque(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.edgesRenderer) {
            this._batchingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.XRAYED);
        }
    }

    drawXRayedFillTransparent(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.fillRenderer) {
            this._batchingRenderers.fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.XRAYED);
        }
    }

    drawXRayedEdgesTransparent(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numXRayedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.edgesRenderer) {
            this._batchingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.XRAYED);
        }
    }

    //-- HIGHLIGHTED ---------------------------------------------------------------------------------------------------

    drawHighlightedFillOpaque(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.fillRenderer) {
            this._batchingRenderers.fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.HIGHLIGHTED);
        }
    }

    drawHighlightedEdgesOpaque(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.edgesRenderer) {
            this._batchingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.HIGHLIGHTED);
        }
    }

    drawHighlightedFillTransparent(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.fillRenderer) {
            this._batchingRenderers.fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.HIGHLIGHTED);
        }
    }

    drawHighlightedEdgesTransparent(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numHighlightedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.edgesRenderer) {
            this._batchingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.HIGHLIGHTED);
        }
    }

    //-- SELECTED ------------------------------------------------------------------------------------------------------

    drawSelectedFillOpaque(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.fillRenderer) {
            this._batchingRenderers.fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SELECTED);
        }
    }

    drawSelectedEdgesOpaque(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.edgesRenderer) {
            this._batchingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SELECTED);
        }
    }

    drawSelectedFillTransparent(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.fillRenderer) {
            this._batchingRenderers.fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SELECTED);
        }
    }

    drawSelectedEdgesTransparent(frameCtx) {
        if (this._numVisibleLayerPortions === 0 || this._numSelectedLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.edgesRenderer) {
            this._batchingRenderers.edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SELECTED);
        }
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    drawPickMesh(frameCtx) {
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.pickMeshRenderer) {
            this._batchingRenderers.pickMeshRenderer.drawLayer(frameCtx, this);
        }
    }

    drawPickDepths(frameCtx) {
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.pickDepthRenderer) {
            this._batchingRenderers.pickDepthRenderer.drawLayer(frameCtx, this);
        }
    }

    drawPickNormals(frameCtx) {
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.pickNormalsRenderer) {
            this._batchingRenderers.pickNormalsRenderer.drawLayer(frameCtx, this);
        }
    }

    //---- OCCLUSION TESTING -------------------------------------------------------------------------------------------

    drawOcclusion(frameCtx) {
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        if (this._batchingRenderers.occlusionRenderer) {
            this._batchingRenderers.occlusionRenderer.drawLayer(frameCtx, this);
        }
    }

    destroy() {
        const state = this._state;
        if (state.positionsBuf) {
            state.positionsBuf.destroy();
            state.positionsBuf = null;
        }
        if (state.normalsBuf) {
            state.normalsBuf.destroy();
            state.normalsBuf = null;
        }
        if (state.colorsBuf) {
            state.colorsBuf.destroy();
            state.colorsBuf = null;
        }
        if (state.flagsBuf) {
            state.flagsBuf.destroy();
            state.flagsBuf = null;
        }
        if (state.flags2Buf) {
            state.flags2Buf.destroy();
            state.flags2Buf = null;
        }
        if (state.pickColorsBuf) {
            state.pickColorsBuf.destroy();
            state.pickColorsBuf = null;
        }
        if (state.indicesBuf) {
            state.indicesBuf.destroy();
            state.indicessBuf = null;
        }
        if (state.edgeIndicesBuf) {
            state.edgeIndicesBuf.destroy();
            state.edgeIndicessBuf = null;
        }
        state.destroy();
    }
}

var quantizePositions = (function () { // http://cg.postech.ac.kr/research/mesh_comp_mobile/mesh_comp_mobile_conference.pdf
    const translate = math.mat4();
    const scale = math.mat4();
    return function (positions, lenPositions, aabb, quantizedPositions, positionsDecodeMatrix) {
        const xmin = aabb[0];
        const ymin = aabb[1];
        const zmin = aabb[2];
        const xwid = aabb[3] - xmin;
        const ywid = aabb[4] - ymin;
        const zwid = aabb[5] - zmin;
        // const maxInt = 2000000;
        const maxInt = 65525;
        const xMultiplier = maxInt / xwid;
        const yMultiplier = maxInt / ywid;
        const zMultiplier = maxInt / zwid;
        let i;
        for (i = 0; i < lenPositions; i += 3) {
            quantizedPositions[i + 0] = Math.floor((positions[i + 0] - xmin) * xMultiplier);
            quantizedPositions[i + 1] = Math.floor((positions[i + 1] - ymin) * yMultiplier);
            quantizedPositions[i + 2] = Math.floor((positions[i + 2] - zmin) * zMultiplier);
        }
        math.identityMat4(translate);
        math.translationMat4v(aabb, translate);
        math.identityMat4(scale);
        math.scalingMat4v([xwid / maxInt, ywid / maxInt, zwid / maxInt], scale);
        math.mulMat4(translate, scale, positionsDecodeMatrix);
    };
})();

function transformAndOctEncodeNormals(modelNormalMatrix, normals, lenNormals, compressedNormals, lenCompressedNormals) {
    // http://jcgt.org/published/0003/02/01/
    let oct, dec, best, currentCos, bestCos;
    let i, ei;
    let localNormal = new Float32Array([0, 0, 0, 0]);
    let worldNormal = new Float32Array([0, 0, 0, 0]);
    for (i = 0; i < lenNormals; i += 3) {
        localNormal[0] = normals[i];
        localNormal[1] = normals[i + 1];
        localNormal[2] = normals[i + 2];

        math.transformVec3(modelNormalMatrix, localNormal, worldNormal);
        math.normalizeVec3(worldNormal, worldNormal);

        // Test various combinations of ceil and floor to minimize rounding errors
        best = oct = octEncodeVec3(worldNormal, "floor", "floor");
        dec = octDecodeVec2(oct);
        currentCos = bestCos = dot(worldNormal, dec);
        oct = octEncodeVec3(worldNormal, "ceil", "floor");
        dec = octDecodeVec2(oct);
        currentCos = dot(worldNormal, dec);
        if (currentCos > bestCos) {
            best = oct;
            bestCos = currentCos;
        }
        oct = octEncodeVec3(worldNormal, "floor", "ceil");
        dec = octDecodeVec2(oct);
        currentCos = dot(worldNormal, dec);
        if (currentCos > bestCos) {
            best = oct;
            bestCos = currentCos;
        }
        oct = octEncodeVec3(worldNormal, "ceil", "ceil");
        dec = octDecodeVec2(oct);
        currentCos = dot(worldNormal, dec);
        if (currentCos > bestCos) {
            best = oct;
            bestCos = currentCos;
        }
        compressedNormals[lenCompressedNormals + i + 0] = best[0];
        compressedNormals[lenCompressedNormals + i + 1] = best[1];
        compressedNormals[lenCompressedNormals + i + 2] = 0.0; // Unused
    }
    lenCompressedNormals += lenNormals;
    return lenCompressedNormals;
}

function octEncodeVec3(p, xfunc, yfunc) { // Oct-encode single normal vector in 2 bytes
    let x = p[0] / (Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2]));
    let y = p[1] / (Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2]));
    if (p[2] < 0) {
        let tempx = x;
        let tempy = y;
        tempx = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1);
        tempy = (1 - Math.abs(x)) * (y >= 0 ? 1 : -1);
        x = tempx;
        y = tempy;
    }
    return new Int8Array([
        Math[xfunc](x * 127.5 + (x < 0 ? -1 : 0)),
        Math[yfunc](y * 127.5 + (y < 0 ? -1 : 0))
    ]);
}

function octDecodeVec2(oct) { // Decode an oct-encoded normal
    let x = oct[0];
    let y = oct[1];
    x /= x < 0 ? 127 : 128;
    y /= y < 0 ? 127 : 128;
    const z = 1 - Math.abs(x) - Math.abs(y);
    if (z < 0) {
        x = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1);
        y = (1 - Math.abs(x)) * (y >= 0 ? 1 : -1);
    }
    const length = Math.sqrt(x * x + y * y + z * z);
    return [
        x / length,
        y / length,
        z / length
    ];
}

function dot(p, vec3) { // Dot product of a normal in an array against a candidate decoding
    return p[0] * vec3[0] + p[1] * vec3[1] + p[2] * vec3[2];
}

export {BatchingLayer};