import {Program} from "../../../../webgl/Program.js";
import {BatchingFillShaderSource} from "./BatchingFillShaderSource.js";
import {RENDER_PASSES} from "../../renderPasses.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../math/rtcCoords.js";
import {math} from "../../../../math/math.js";

const defaultColor = new Float32Array([1, 1, 1]);
const tempVec3a = math.vec3();

/**
 * @private
 */
class BatchingFillRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._shaderSource = new BatchingFillShaderSource(this._scene);
        this._allocate();
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
            this._allocate();
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

        gl.uniformMatrix4fv(this._uModelMatrix, false, model.worldMatrix);

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

        gl.uniform1i(this._uRenderPass, renderPass);

        if (renderPass === RENDER_PASSES.XRAYED) {
            const material = scene.xrayMaterial._state;
            const fillColor = material.fillColor;
            const fillAlpha = material.fillAlpha;
            gl.uniform4f(this._uColor, fillColor[0], fillColor[1], fillColor[2], fillAlpha);
        } else if (renderPass === RENDER_PASSES.HIGHLIGHTED) {
            const material = scene.highlightMaterial._state;
            const fillColor = material.fillColor;
            const fillAlpha = material.fillAlpha;
            gl.uniform4f(this._uColor, fillColor[0], fillColor[1], fillColor[2], fillAlpha);
        } else if (renderPass === RENDER_PASSES.SELECTED) {
            const material = scene.selectedMaterial._state;
            const fillColor = material.fillColor;
            const fillAlpha = material.fillAlpha;
            gl.uniform4f(this._uColor, fillColor[0], fillColor[1], fillColor[2], fillAlpha);
        } else {
            gl.uniform4fv(this._uColor, defaultColor);
        }

        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, batchingLayer._state.positionsDecodeMatrix);

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

        state.indicesBuf.bind();

        gl.drawElements(state.primitive, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
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
        this._uRenderPass = program.getLocation("renderPass");
        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uModelMatrix = program.getLocation("modelMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");
        this._uColor = program.getLocation("color");
        this._uSectionPlanes = [];
        const sectionPlanes = sectionPlanesState.sectionPlanes;
        for (let i = 0, len = sectionPlanes.length; i < len; i++) {
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

export {BatchingFillRenderer};