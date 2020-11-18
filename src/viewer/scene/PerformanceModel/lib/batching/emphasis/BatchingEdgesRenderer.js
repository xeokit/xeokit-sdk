import {Program} from "../../../../webgl/Program.js";
import {BatchingEdgesShaderSource} from "./BatchingEdgesShaderSource.js";
import {RENDER_PASSES} from "../../renderPasses.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../math/rtcCoords.js";
import {math} from "../../../../math/math.js";

const tempVec3a = math.vec3();

/**
 * @private
 */
class BatchingEdgesRenderer {

    constructor(scene) {
        this._scene = scene;
        this._shaderSource = new BatchingEdgesShaderSource(this._scene);
        this._allocate();
        this._hash = this._getHash();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        return this._scene._sectionPlanesState.getHash();
    }

    drawLayer(frameCtx, batchingLayer, renderPass) {

        const model = batchingLayer.model;
        const scene = model.scene;
        const gl = scene.canvas.gl;
        const state = batchingLayer._state;
        const rtcCenter = batchingLayer._state.rtcCenter;

        if (!this._program) {
            this._allocate(batchingLayer);
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram();
        }

        const viewMat = (rtcCenter) ? createRTCViewMat(model.viewMatrix, rtcCenter) : model.viewMatrix;
        gl.uniformMatrix4fv(this._uViewMatrix, false, viewMat);

        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = batchingLayer.layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                const active = renderFlags.sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                if (active) {
                    const sectionPlane = sectionPlanes[sectionPlaneIndex];
                    if (rtcCenter) {
                        const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, rtcCenter, tempVec3a);
                        gl.uniform3fv(sectionPlaneUniforms.pos, rtcSectionPlanePos);
                    } else {
                        gl.uniform3fv(sectionPlaneUniforms.pos, sectionPlane.pos);
                    }
                    gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                }
            }
        }

        let material;

        if (renderPass === RENDER_PASSES.XRAYED) {
            material = scene.xrayMaterial._state;
        } else if (renderPass === RENDER_PASSES.HIGHLIGHTED) {
            material = scene.highlightMaterial._state;
        } else if (renderPass === RENDER_PASSES.SELECTED) {
            material = scene.selectedMaterial._state;
        } else {
            material = scene.edgeMaterial._state;
        }

        const edgeColor = material.edgeColor;
        const edgeAlpha = material.edgeAlpha;
        gl.uniform4f(this._uColor, edgeColor[0], edgeColor[1], edgeColor[2], edgeAlpha);

        if (frameCtx.lineWidth !== material.edgeWidth) {
            gl.lineWidth(material.edgeWidth);
            frameCtx.lineWidth = material.edgeWidth;
        }

        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, batchingLayer._state.positionsDecodeMatrix);

        gl.uniform1i(this._uRenderPass, renderPass);

        this._aPosition.bindArrayBuffer(state.positionsBuf);
        if (this._aOffset) {
            this._aOffset.bindArrayBuffer(state.offsetsBuf);
        }
        if (this._aFlags) {
            this._aFlags.bindArrayBuffer(state.flagsBuf);
        }
        if (this._aFlags2) {
            this._aFlags2.bindArrayBuffer(state.flags2Buf);
        }
        state.edgeIndicesBuf.bind();

        gl.drawElements(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0);
    }

    _allocate() {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const sectionPlanesState = scene._sectionPlanesState;
        this._program = new Program(gl, this._shaderSource);
        if (this._program.errors) {
            this.errors = this._program.errors;
            return;
        }
        const program = this._program;
        this._uColor = program.getLocation("color");
        this._uRenderPass = program.getLocation("renderPass");
        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");
        this._uSectionPlanes = [];
        const sectionPlanes = sectionPlanesState.sectionPlanes;
        for (var i = 0, len = sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }
        this._aPosition = program.getAttribute("position");
        this._aOffset = program.getAttribute("offset");
        this._aFlags = program.getAttribute("flags");
        this._aFlags2 = program.getAttribute("flags2");
    }

    _bindProgram() {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        program.bind();
        const camera = scene.camera;
        gl.uniformMatrix4fv(this._uProjMatrix, false, camera._project._state.matrix);
    }

    webglContextRestored() {
        this._program = null;
    }

    destroy() {
        if (this._program) {
            this._program.destroy();
        }
        this._program = null;
    }
}

export {BatchingEdgesRenderer};