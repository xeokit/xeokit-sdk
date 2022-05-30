import {math} from "../../../math";
import {ArrayBuf} from "../../../webgl/ArrayBuf";
import {geometryCompressionUtils} from "../../../math/geometryCompressionUtils";
import {octEncodeNormals, quantizePositions} from "./compression";
import {buildEdgeIndices} from "../../../math/buildEdgeIndices";

/**
 * Instantiated by VBOSceneModel#createGeometry
 *
 * @private
 */
export class PerformanceGeometry {

    /**
     * @param {*} cfg Geometry properties.
     * @param {String|Number} id Mandatory ID for the geometry, to refer to with {@link VBOSceneModel#createMesh}.
     * @param {VBOSceneModel} model VBOSceneModel that owns this geometry.
     * @param {*} cfg.primitive
     * @param {*} cfg.positions
     * @param {*} cfg.positionsCompressed
     * @param {*} cfg.normals
     * @param {*} cfg.normalsCompressed
     * @param {*} cfg.colors
     * @param {*} cfg.colorsCompressed
     * @param {*} cfg.uv
     * @param {*} cfg.uvCompressed
     * @param {*} cfg.uvDecodeMatrix
     * @param {*} cfg.indices
     * @param {*} cfg.edgeIndices
     */
    constructor(id, model, cfg) {

        ///////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////
        // TODO: optional origin param, or create from positions automatically if required - then offset from mesh origin in createMesh

        /**
         * ID of this PerformanceGeometry, unique within the VBOSceneModel.
         *
         * @property id
         * @type {String}
         * @final
         */
        this.id = cfg.id;

        /**
         * The VBOSceneModel that contains this PerformanceGeometry.
         *
         * @property model
         * @type {VBOSceneModel}
         * @final
         */
        this.model = cfg.model;

        this.primitive = cfg.primitive;
        this.positions = null;
        this.positionsCompressed = null;
        this.quantizedPositions = null; // If pickSurfacePrecisionEnabled is true
        this.positionsDecodeMatrix = math.mat4();
        this.normals = null;
        this.normalsCompressed = null;
        this.colors = null;
        this.colorsCompressed = null;
        this.uv = null;
        this.uvCompressed = null;
        this.uvDecodeMatrix = null;
        this.indices = null;
        this.numIndices = 0;
        this.obb = math.OBB3();
        this.positionsBuf = null;
        this.normalsBuf = null;
        this.edgeIndicesBuf = null;
        this.uvBuf = null;
        this.colorsBuf = null;

        const pickSurfacePrecisionEnabled = model.scene.pickSurfacePrecisionEnabled;
        const gl = model.scene.canvas.gl;

        if (cfg.positionsCompressed && cfg.positionsCompressed.length > 0) {
            const normalized = false;
            this.positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, cfg.positionsCompressed, cfg.positionsCompressed.length, 3, gl.STATIC_DRAW, normalized);
            this.positionsDecodeMatrix.set(cfg.positionsDecodeMatrix);
            const localAABB = math.collapseAABB3();
            math.expandAABB3Points3(localAABB, cfg.positionsCompressed);
            geometryCompressionUtils.decompressAABB(localAABB, this.positionsDecodeMatrix);
            math.AABB3ToOBB3(localAABB, this.obb);
            if (pickSurfacePrecisionEnabled) {
                this.quantizedPositions = cfg.positionsCompressed;
            }

        } else if (cfg.positions && cfg.positions.length > 0) {
            const lenPositions = cfg.positions.length;
            const localAABB = math.collapseAABB3();
            math.expandAABB3Points3(localAABB, cfg.positions);
            math.AABB3ToOBB3(localAABB, this.obb);
            const quantizedPositions = quantizePositions(cfg.positions, localAABB, this.positionsDecodeMatrix);
            let normalized = false;
            this.positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, quantizedPositions, lenPositions, 3, gl.STATIC_DRAW, normalized);
            if (pickSurfacePrecisionEnabled) {
                this.quantizedPositions = quantizedPositions;
            }
        }

        if (cfg.normalsCompressed && cfg.normalsCompressed.length > 0) {
            const normalized = true; // For oct-encoded UInt8
            this.normalsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, cfg.normalsCompressed, cfg.normalsCompressed.length, 3, gl.STATIC_DRAW, normalized);

        } else if (cfg.normals && cfg.normals.length > 0) {
            const compressedNormals = octEncodeNormals(cfg.normals);
            const normalized = true; // For oct-encoded UInt8
            this.normalsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, compressedNormals, compressedNormals.length, 3, gl.STATIC_DRAW, normalized);
        }

        if (cfg.colorsCompressed && cfg.colorsCompressed.length > 0) {
            const colorsCompressed = new Uint8Array(cfg.colorsCompressed);
            const notNormalized = false;
            this.colorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, colorsCompressed, colorsCompressed.length, 4, gl.STATIC_DRAW, notNormalized);

        } else if (cfg.colors && cfg.colors.length > 0) {
            const colors = cfg.colors;
            const colorsCompressed = new Uint8Array(colors.length);
            for (let i = 0, len = colors.length; i < len; i++) {
                colorsCompressed[i] = colors[i] * 255;
            }
            const notNormalized = false;
            this.colorsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, colorsCompressed, colorsCompressed.length, 4, gl.STATIC_DRAW, notNormalized);
        }

        if (cfg.uvCompressed && cfg.uvCompressed.length > 0) {
            const uvCompressed = new Uint16Array(cfg.uvCompressed);
            this.uvDecodeMatrix = math.mat4(cfg.uvDecodeMatrix);
            this.uvBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, cfg.uvCompressed, uvCompressed.length, 2, gl.STATIC_DRAW, false);

        } else if (cfg.uv && cfg.uv.length > 0) {
            const bounds = geometryCompressionUtils.getUVBounds(cfg.uv);
            const result = geometryCompressionUtils.compressUVs(cfg.uv, bounds.min, bounds.max);
            const uvCompressed = result.quantized;
            this.uvDecodeMatrix = result.decodeMatrix;
            this.uvBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, uvCompressed, uvCompressed.length, 2, gl.STATIC_DRAW, false);
        }

        if (cfg.indices && cfg.indices.length > 0) {
            this.indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(cfg.indices), cfg.indices.length, 1, gl.STATIC_DRAW);
            if (pickSurfacePrecisionEnabled) {
                this.indices = cfg.indices;
            }
            this.numIndices = cfg.indices.length;
        }

        if (cfg.primitive === "triangles" || cfg.primitive === "solid" || cfg.primitive === "surface") {
            let edgeIndices = cfg.edgeIndices;
            if (!edgeIndices) {
                edgeIndices = buildEdgeIndices(cfg.positions, cfg.indices, null, cfg.edgeThreshold || 10);
            }
            this.edgeIndicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(edgeIndices), edgeIndices.length, 1, gl.STATIC_DRAW);
        }
    }

    /**
     * @private
     */
    destroy() {
    }
}


