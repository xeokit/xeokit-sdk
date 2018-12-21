import {math} from "../../math/math.js";
import {WEBGL_INFO} from "../../webglInfo.js";

import {RenderState} from "../../webgl/RenderState.js";
import {ArrayBuf} from "../../webgl/ArrayBuf.js";

import {InstancingDrawRenderer} from "./draw/instancingDrawRenderer.js";
import {InstancingPickRenderer} from "./pick/instancingPickRenderer.js";

import {RENDER_FLAGS} from '../renderFlags.js';
import {RENDER_PASSES} from '../renderPasses.js';

const bigIndicesSupported = WEBGL_INFO.SUPPORTED_EXTENSIONS["OES_element_index_uint"];
const MAX_VERTS = bigIndicesSupported ? 5000000 : 65530;
const quantizedPositions = new Uint16Array(MAX_VERTS * 3);
const compressedNormals = new Int8Array(MAX_VERTS * 3);
const tempUint8Vec4 = new Uint8Array(4);
const tempFloat32Vec4 = new Float32Array(4);
const tempVec3a = math.vec4([0, 0, 0, 1]);
const tempVec3b = math.vec4([0, 0, 0, 1]);

/**
 * @private
 */
class InstancingLayer {

    /**
     * @param model
     * @param cfg
     * @param cfg.primitive
     * @param cfg.positions Flat float Local-space positions array.
     * @param cfg.normals Flat float normals array.
     * @param cfg.indices Flat int indices array.
     * @param cfg.edgeIndices Flat int edges indices array.
     */
    constructor(model, cfg) {
        this.model = model;
        this._aabb = math.collapseAABB3();
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
                throw `Unsupported value for 'primitive': '${primitiveName}' - supported values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'. Defaulting to 'triangles'.`;
                primitive = gl.TRIANGLES;
                primitiveName = "triangles";
        }
        var stateCfg = {
            primitiveName: primitiveName,
            primitive: primitive,
            positionsDecodeMatrix: math.mat4(),
            numInstances: 0,
            obb: math.OBB3()
        };
        if (cfg.positions) {
            var lenPositions = cfg.positions.length;
            var localAABB = math.collapseAABB3();
            math.expandAABB3Points3(localAABB, cfg.positions);
            math.AABB3ToOBB3(localAABB, stateCfg.obb);
            quantizePositions(cfg.positions, lenPositions, localAABB, quantizedPositions, stateCfg.positionsDecodeMatrix);
            let normalized = false;
            stateCfg.positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, quantizedPositions, lenPositions, 3, gl.STATIC_DRAW, normalized);
        }
        if (cfg.normals) {
            var lenCompressedNormals = octEncodeNormals(cfg.normals, cfg.normals.length, compressedNormals, 0);
            var normalized = true; // For oct-encoded UInt8
            stateCfg.normalsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, compressedNormals, lenCompressedNormals, 3, gl.STATIC_DRAW, normalized);
        }
        if (cfg.indices) {
            stateCfg.indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, bigIndicesSupported ? new Uint32Array(cfg.indices) : new Uint16Array(cfg.indices), cfg.indices.length, 1, gl.STATIC_DRAW);
        }
        if (cfg.edgeIndices) {
            stateCfg.edgeIndicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, bigIndicesSupported ? new Uint32Array(cfg.edgeIndices) : new Uint16Array(cfg.edgeIndices), cfg.edgeIndices.length, 1, gl.STATIC_DRAW);
        }
        this._state = new RenderState(stateCfg);

        // These counts are used to avoid unnecessary render passes
        this.numObjects = 0;
        this.numVisibleObjects = 0;
        this.numTransparentObjects = 0;
        this.numGhostedObjects = 0;
        this.numHighlightedObjects = 0;
        this.numEdgesObjects = 0;

        // Vertex arrays
        this._flags = [];
        this._colors = [];
        this._pickColors = [];

        // Modeling matrix per instance, array for each column
        this._modelMatrixCol0 = [];
        this._modelMatrixCol1 = [];
        this._modelMatrixCol2 = [];

        // Modeling normal matrix per instance, array for each column
        this._modelNormalMatrixCol0 = [];
        this._modelNormalMatrixCol1 = [];
        this._modelNormalMatrixCol2 = [];

        this._portions = [];

        this._finalized = false;

        this.compileShaders();
    }

    /**
     * Creates a new portion within this InstancingLayer, returns the new portion ID.
     *
     * The portion will instance this InstancingLayer's geometry.
     *
     * Gives the portion the specified flags, color and matrix.
     *
     * @param flags Unsigned long int
     * @param color Quantized RGBA color
     * @param matrix Flat float 4x4 matrix
     * @param aabb Flat float AABB
     * @param pickColor Quantized pick color
     * @returns {number} Portion ID
     */
    createPortion(flags, color, matrix, aabb, pickColor) {

        if (this._finalized) {
            throw "Already finalized";
        }

        // TODO: find AABB for portion by transforming the geometry local AABB by the given matrix?

        var visible = !!(flags & RENDER_FLAGS.VISIBLE) ? 255 : 0;
        var ghosted = !!(flags & RENDER_FLAGS.GHOSTED) ? 255 : 0;
        var highlighted = !!(flags & RENDER_FLAGS.HIGHLIGHTED) ? 255 : 0;
        var clippable = !!(flags & RENDER_FLAGS.CLIPPABLE) ? 255 : 0;
        var edges = !!(flags & RENDER_FLAGS.EDGES) ? 255 : 0;

        this._flags.push(visible);
        this._flags.push(ghosted);
        this._flags.push(highlighted);
        this._flags.push(clippable);

        if (visible) {
            this.numVisibleObjects++;
        }
        if (ghosted) {
            this.numGhostedObjects++;
        }
        if (highlighted) {
            this.numHighlightedObjects++;
        }
        if (edges) {
            this.numEdgesObjects++;
        }

        const r = color[0]; // Color is pre-quantized
        const g = color[1];
        const b = color[2];
        const a = color[3];
        if (a < 255) {
            this.numTransparentObjects++;
        }
        this._colors.push(r);
        this._colors.push(g);
        this._colors.push(b);
        this._colors.push(a);

        this._modelMatrixCol0.push(matrix[0]);
        this._modelMatrixCol0.push(matrix[4]);
        this._modelMatrixCol0.push(matrix[8]);
        this._modelMatrixCol0.push(matrix[12]);

        this._modelMatrixCol1.push(matrix[1]);
        this._modelMatrixCol1.push(matrix[5]);
        this._modelMatrixCol1.push(matrix[9]);
        this._modelMatrixCol1.push(matrix[13]);

        this._modelMatrixCol2.push(matrix[2]);
        this._modelMatrixCol2.push(matrix[6]);
        this._modelMatrixCol2.push(matrix[10]);
        this._modelMatrixCol2.push(matrix[14]);

        // Note: order of inverse and transpose doesn't matter

        let transposedMat = math.transposeMat4(matrix, math.mat4()); // TODO: Use cached matrix
        let normalMatrix = math.inverseMat4(transposedMat);

        this._modelNormalMatrixCol0.push(normalMatrix[0]);
        this._modelNormalMatrixCol0.push(normalMatrix[4]);
        this._modelNormalMatrixCol0.push(normalMatrix[8]);
        this._modelNormalMatrixCol0.push(normalMatrix[12]);

        this._modelNormalMatrixCol1.push(normalMatrix[1]);
        this._modelNormalMatrixCol1.push(normalMatrix[5]);
        this._modelNormalMatrixCol1.push(normalMatrix[9]);
        this._modelNormalMatrixCol1.push(normalMatrix[13]);

        this._modelNormalMatrixCol2.push(normalMatrix[2]);
        this._modelNormalMatrixCol2.push(normalMatrix[6]);
        this._modelNormalMatrixCol2.push(normalMatrix[10]);
        this._modelNormalMatrixCol2.push(normalMatrix[14]);

        // Per-vertex pick colors

        this._pickColors.push(pickColor[0]);
        this._pickColors.push(pickColor[1]);
        this._pickColors.push(pickColor[2]);
        this._pickColors.push(pickColor[3]);

        // Expand AABB

        math.collapseAABB3(aabb);
        var obb = this._state.obb;
        var lenPositions = obb.length;
        for (var i = 0; i < lenPositions; i += 4) {
            tempVec3a[0] = obb[i + 0];
            tempVec3a[1] = obb[i + 1];
            tempVec3a[2] = obb[i + 2];
            math.transformPoint4(matrix, tempVec3a, tempVec3b);
            math.expandAABB3Point3(aabb, tempVec3b); // Expand portion AABB
        }

        this._state.numInstances++;

        var portionId = this._portions.length;
        this._portions.push({});
        this.numObjects++;

        return portionId;
    }

    finalize() {
        if (this._finalized) {
            throw "Already finalized";
        }
        const gl = this.model.scene.canvas.gl;
        if (this._colors.length > 0) {
            let normalized = false;
            this._state.colorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Uint8Array(this._colors), this._colors.length, 4, gl.STATIC_DRAW, normalized);
            this._colors = []; // Release memory
        }
        if (this._flags.length > 0) {
            let normalized = true;
            this._state.flagsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Uint8Array(this._flags), this._flags.length, 4, gl.STATIC_DRAW, normalized);
            this._flags = [];
        }
        if (this._modelMatrixCol0.length > 0) {

            let normalized = false;

            this._state.modelMatrixCol0Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol0), this._modelMatrixCol0.length, 4, gl.STATIC_DRAW, normalized);
            this._state.modelMatrixCol1Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol1), this._modelMatrixCol1.length, 4, gl.STATIC_DRAW, normalized);
            this._state.modelMatrixCol2Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelMatrixCol2), this._modelMatrixCol2.length, 4, gl.STATIC_DRAW, normalized);
            this._modelMatrixCol0 = [];
            this._modelMatrixCol1 = [];
            this._modelMatrixCol2 = [];

            this._state.modelNormalMatrixCol0Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelNormalMatrixCol0), this._modelNormalMatrixCol0.length, 4, gl.STATIC_DRAW, normalized);
            this._state.modelNormalMatrixCol1Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelNormalMatrixCol1), this._modelNormalMatrixCol1.length, 4, gl.STATIC_DRAW, normalized);
            this._state.modelNormalMatrixCol2Buf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this._modelNormalMatrixCol2), this._modelNormalMatrixCol2.length, 4, gl.STATIC_DRAW, normalized);
            this._modelNormalMatrixCol0 = [];
            this._modelNormalMatrixCol1 = [];
            this._modelNormalMatrixCol2 = [];
        }
        if (this._pickColors.length > 0) {
            let normalized = false;
            this._state.pickColorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Uint8Array(this._pickColors), this._colors.length, 4, gl.STATIC_DRAW, normalized);
            this._pickColors = []; // Release memory
        }
        this._finalized = true;
    }

    setFlags(portionId, flags) {
        if (!this._finalized) {
            throw "Not finalized";
        }
        tempUint8Vec4[0] = !!(flags & RENDER_FLAGS.VISIBLE) ? 255 : 0;
        tempUint8Vec4[1] = !!(flags & RENDER_FLAGS.GHOSTED) ? 255 : 0;
        tempUint8Vec4[2] = !!(flags & RENDER_FLAGS.HIGHLIGHTED) ? 255 : 0;
        tempUint8Vec4[3] = !!(flags & RENDER_FLAGS.CLIPPABLE) ? 255 : 0;
        this._state.flagsBuf.setData(tempUint8Vec4, portionId * 4, 4);
    }

    setColor(portionId, color) { // TODO
        if (!this._finalized) {
            throw "Not finalized";
        }
        tempUint8Vec4[0] = color[0];
        tempUint8Vec4[1] = color[1];
        tempUint8Vec4[2] = color[2];
        tempUint8Vec4[3] = color[3];
        this._state.colorsBuf.setData(tempUint8Vec4, portionId * 4, 4);
    }

    setMatrix(portionId, matrix) {

        if (!this._finalized) {
            throw "Not finalized";
        }

        var offset = portionId * 4;

        tempFloat32Vec4[0] = matrix[0];
        tempFloat32Vec4[1] = matrix[4];
        tempFloat32Vec4[2] = matrix[8];
        tempFloat32Vec4[3] = matrix[12];

        this._state.modelMatrixCol0Buf.setData(tempFloat32Vec4, offset, 4);

        tempFloat32Vec4[0] = matrix[1];
        tempFloat32Vec4[1] = matrix[5];
        tempFloat32Vec4[2] = matrix[9];
        tempFloat32Vec4[3] = matrix[13];

        this._state.modelMatrixCol1Buf.setData(tempFloat32Vec4, offset, 4);

        tempFloat32Vec4[0] = matrix[2];
        tempFloat32Vec4[1] = matrix[6];
        tempFloat32Vec4[2] = matrix[10];
        tempFloat32Vec4[3] = matrix[14];

        this._state.modelMatrixCol2Buf.setData(tempFloat32Vec4, offset, 4);

        // tempFloat32Vec4[0] = matrix[3];
        // tempFloat32Vec4[1] = matrix[7];
        // tempFloat32Vec4[2] = matrix[11];
        // tempFloat32Vec4[3] = matrix[15];
        //
        // this._state.modelMatrixCol3Buf.setData(tempFloat32Vec4, offset, 4);
    }

    //-- NORMAL --------------------------------------------------------------------------------------------------------

    drawNormalFillOpaque(frameCtx) {
        if (this.numVisibleObjects === 0 || this.numTransparentObjects === this.numObjects || this.numGhostedObjects === this.numObjects) {
            return;
        }
        if (this._drawRenderer) {
            this._drawRenderer.drawLayer(frameCtx, this, RENDER_PASSES.OPAQUE);
        }
    }

    drawNormalEdgesOpaque(frameCtx) {
        return;
        if (this.numEdgesObjects === 0) {
            return;
        }
        if (this._edgesRenderer) {
            this._edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.OPAQUE);
        }
    }

    drawNormalFillTransparent(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numTransparentObjects === 0 || this.numGhostedObjects === this.numObjects) {
            return;
        }
        if (this._drawRenderer) {
            this._drawRenderer.drawLayer(frameCtx, this, RENDER_PASSES.TRANSPARENT);
        }
    }

    drawNormalTransparentEdges(frameCtx) {
        return;
        if (this.numEdgesObjects === 0 || this.numTransparentObjects === 0) {
            return;
        }
        if (this._edgesRenderer) {
            this._edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.TRANSPARENT);
        }
    }

    //-- GHOSTED--------------------------------------------------------------------------------------------------------

    drawGhostedFillOpaque(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numGhostedObjects === 0) {
            return;
        }
        if (this._fillRenderer) {
            this._fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.GHOSTED); // TODO: pass in transparent flag
        }
    }

    drawGhostedEdgesOpaque(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numGhostedObjects === 0) {
            return;
        }
        if (this._edgesRenderer) {
            this._edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.GHOSTED);
        }
    }

    drawGhostedFillTransparent(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numGhostedObjects === 0) {
            return;
        }
        if (this._fillRenderer) {
            this._fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.GHOSTED); // TODO: pass in transparent flag
        }
    }

    drawGhostedEdgesTransparent(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numGhostedObjects === 0) {
            return;
        }
        if (this._edgesRenderer) {
            this._edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.GHOSTED);
        }
    }

    //-- HIGHLIGHTED ---------------------------------------------------------------------------------------------------

    drawHighlightedFillOpaque(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numHighlightedObjects === 0) {
            return;
        }
        if (this._fillRenderer) {
            this._fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.HIGHLIGHTED);
        }
    }

    drawHighlightedEdgesOpaque(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numHighlightedObjects === 0) {
            return;
        }
        if (this._edgesRenderer) {
            this._edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.HIGHLIGHTED);
        }
    }

    drawHighlightedFillTransparent(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numHighlightedObjects === 0) {
            return;
        }
        if (this._fillRenderer) {
            this._fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.HIGHLIGHTED);
        }
    }

    drawHighlightedEdgesTransparent(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numHighlightedObjects === 0) {
            return;
        }
        if (this._edgesRenderer) {
            this._edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.HIGHLIGHTED);
        }
    }

    //-- SELECTED ------------------------------------------------------------------------------------------------------

    drawSelectedFillOpaque(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numSelectedObjects === 0) {
            return;
        }
        if (this._fillRenderer) {
            this._fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SELECTED);
        }
    }

    drawSelectedEdgesOpaque(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numSelectedObjects === 0) {
            return;
        }
        if (this._edgesRenderer) {
            this._edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SELECTED);
        }
    }

    drawSelectedFillTransparent(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numSelectedObjects === 0) {
            return;
        }
        if (this._fillRenderer) {
            this._fillRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SELECTED);
        }
    }

    drawSelectedEdgesTransparent(frameCtx) {
        return;
        if (this.numVisibleObjects === 0 || this.numSelectedObjects === 0) {
            return;
        }
        if (this._edgesRenderer) {
            this._edgesRenderer.drawLayer(frameCtx, this, RENDER_PASSES.SELECTED);
        }
    }

    //---- PICKING ----------------------------------------------------------------------------------------------------

    drawPickMesh(frameCtx) {
        if (this.numVisibleObjects === 0) {
            return;
        }
        if (this._pickRenderer) {
            this._pickRenderer.drawLayer(frameCtx, this);
        }
    }

    compileShaders() {
        if (this._drawRenderer && this._drawRenderer.getValid() === false) {
            this._drawRenderer.put();
            this._drawRenderer = null;
        }
        if (this._fillRenderer && this._fillRenderer.getValid() === false) {
            this._fillRenderer.put();
            this._fillRenderer = null;
        }
        if (this._edgesRenderer && this._edgesRenderer.getValid() === false) {
            this._edgesRenderer.put();
            this._edgesRenderer = null;
        }
        if (this._pickRenderer && this._pickRenderer.getValid() === false) {
            this._pickRenderer.put();
            this._pickRenderer = null;
        }
        if (!this._drawRenderer) {
            this._drawRenderer = InstancingDrawRenderer.get(this);
        }
        // if (!this._fillRenderer) {
        //     this._fillRenderer = InstancingEmphasisFillRenderer.get(this);
        // }
        // if (!this._edgesRenderer) {
        //     this._edgesRenderer = InstancingEmphasisEdgesRenderer.get(this);
        // }
        if (!this._pickRenderer) {
            this._pickRenderer = InstancingPickRenderer.get(this);
        }
    }

    destroy() {

        if (this._drawRenderer) {
            this._drawRenderer.put();
            this._drawRenderer = null;
        }
        if (this._fillRenderer) {
            this._fillRenderer.put();
            this._fillRenderer = null;
        }
        if (this._edgesRenderer) {
            this._edgesRenderer.put();
            this._edgesRenderer = null;
        }
        if (this._pickRenderer) {
            this._pickRenderer.put();
            this._pickRenderer = null;
        }

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
        if (state.modelMatrixCol0Buf) {
            state.modelMatrixCol0Buf.destroy();
            state.modelMatrixCol0Buf = null;
        }
        if (state.modelMatrixCol1Buf) {
            state.modelMatrixCol1Buf.destroy();
            state.modelMatrixCol1Buf = null;
        }
        if (state.modelMatrixCol2Buf) {
            state.modelMatrixCol2Buf.destroy();
            state.modelMatrixCol2Buf = null;
        }
        if (state.modelNormalMatrixCol0Buf) {
            state.modelNormalMatrixCol0Buf.destroy();
            state.modelNormalMatrixCol0Buf = null;
        }
        if (state.modelNormalMatrixCol1Buf) {
            state.modelNormalMatrixCol1Buf.destroy();
            state.modelNormalMatrixCol1Buf = null;
        }
        if (state.modelNormalMatrixCol2Buf) {
            state.modelNormalMatrixCol2Buf.destroy();
            state.modelNormalMatrixCol2Buf = null;
        }
        if (state.indicesBuf) {
            state.indicesBuf.destroy();
            state.indicessBuf = null;
        }
        if (state.edgeIndicesBuf) {
            state.edgeIndicesBuf.destroy();
            state.edgeIndicessBuf = null;
        }
        if (state.pickColorsBuf) {
            state.pickColorsBuf.destroy();
            state.pickColorsBuf = null;
        }
        state.destroy();
    }
}

var quantizePositions = (function () { // http://cg.postech.ac.kr/research/mesh_comp_mobile/mesh_comp_mobile_conference.pdf
    const translate = math.mat4();
    const scale = math.mat4();
    const scalar = math.vec3();
    return function (positions, lenPositions, aabb, quantizedPositions, positionsDecodeMatrix) {
        const xmin = aabb[0];
        const ymin = aabb[1];
        const zmin = aabb[2];
        const xwid = aabb[3] - xmin;
        const ywid = aabb[4] - ymin;
        const zwid = aabb[5] - zmin;
        // const maxInt = 2000000;
        const maxInt = 65535;
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
        scalar[0] = xwid / maxInt;
        scalar[1] = ywid / maxInt;
        scalar[2] = zwid / maxInt;
        math.scalingMat4v(scalar, scale);
        math.mulMat4(translate, scale, positionsDecodeMatrix);
    };
})();

function octEncodeNormals(normals, lenNormals, compressedNormals, lenCompressedNormals) { // http://jcgt.org/published/0003/02/01/
    let oct, dec, best, currentCos, bestCos;
    for (let i = 0; i < lenNormals; i += 3) {
        // Test various combinations of ceil and floor to minimize rounding errors
        best = oct = octEncodeVec3(normals, i, "floor", "floor");
        dec = octDecodeVec2(oct);
        currentCos = bestCos = dot(normals, i, dec);
        oct = octEncodeVec3(normals, i, "ceil", "floor");
        dec = octDecodeVec2(oct);
        currentCos = dot(normals, i, dec);
        if (currentCos > bestCos) {
            best = oct;
            bestCos = currentCos;
        }
        oct = octEncodeVec3(normals, i, "floor", "ceil");
        dec = octDecodeVec2(oct);
        currentCos = dot(normals, i, dec);
        if (currentCos > bestCos) {
            best = oct;
            bestCos = currentCos;
        }
        oct = octEncodeVec3(normals, i, "ceil", "ceil");
        dec = octDecodeVec2(oct);
        currentCos = dot(normals, i, dec);
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

function octEncodeVec3(array, i, xfunc, yfunc) { // Oct-encode single normal vector in 2 bytes
    let x = array[i] / (Math.abs(array[i]) + Math.abs(array[i + 1]) + Math.abs(array[i + 2]));
    let y = array[i + 1] / (Math.abs(array[i]) + Math.abs(array[i + 1]) + Math.abs(array[i + 2]));
    if (array[i + 2] < 0) {
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

function dot(array, i, vec3) { // Dot product of a normal in an array against a candidate decoding
    return array[i] * vec3[0] + array[i + 1] * vec3[1] + array[i + 2] * vec3[2];
}

export {InstancingLayer};