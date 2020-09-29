import {Program} from "../../../../webgl/Program.js";
import {BatchingNormalsShaderSource} from "./BatchingNormalsShaderSource.js";
import {createRTCViewMat} from "../../../../math/rtcCoords.js";
import {math} from "../../../../math/math.js";

/**
 * @private
 */
class BatchingNormalsRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._shaderSource = new BatchingNormalsShaderSource(this._scene);
        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        return this._scene._sectionPlanesState.getHash();
    }

    drawLayer(frameCtx, batchingLayer) {
        const model = batchingLayer.model;
        const scene = model.scene;
        const gl = scene.canvas.gl;
        const state = batchingLayer._state;
        if (!this._program) {
            this._allocate(batchingLayer);
        }
        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram();
        }
        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, batchingLayer._state.positionsDecodeMatrix);

        const rtcCenter = batchingLayer._state.rtcCenter;

        if (rtcCenter) {

            const viewMatrix = createRTCViewMat(model.viewMatrix, rtcCenter);
            gl.uniformMatrix4fv(this._uViewMatrix, false, viewMatrix);

            math.inverseMat4(viewMatrix, viewNormalMatrix);
            math.transposeMat4(viewNormalMatrix);
            gl.uniformMatrix4fv(this._uViewNormalMatrix, false, viewNormalMatrix);

        } else {

            gl.uniformMatrix4fv(this._uViewMatrix, false, model.viewMatrix);
            gl.uniformMatrix4fv(this._uViewNormalMatrix, false, model.viewNormalMatrix);
        }

        this._aPosition.bindArrayBuffer(state.positionsBuf);
        this._aOffset.bindArrayBuffer(state.offsetsBuf);
        this._aNormal.bindArrayBuffer(state.normalsBuf);
        this._aColor.bindArrayBuffer(state.colorsBuf);// Needed for masking out transparent entities using alpha channel
        this._aFlags.bindArrayBuffer(state.flagsBuf);
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
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uViewNormalMatrix = program.getLocation("viewNormalMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");
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
        this._aNormal = program.getAttribute("normal");
        this._aColor = program.getAttribute("color");
        this._aFlags = program.getAttribute("flags");

        if (this._aFlags2) { // Won't be in shader when not clipping
            this._aFlags2 = program.getAttribute("flags2");
        }
    }

    _bindProgram() {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const sectionPlanesState = scene._sectionPlanesState;
        program.bind();
        const camera = scene.camera;
        gl.uniformMatrix4fv(this._uProjMatrix, false, camera._project._state.matrix);
        if (sectionPlanesState.sectionPlanes.length > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            let sectionPlaneUniforms;
            let uSectionPlaneActive;
            let sectionPlane;
            let uSectionPlanePos;
            let uSectionPlaneDir;
            for (let i = 0, len = this._uSectionPlanes.length; i < len; i++) {
                sectionPlaneUniforms = this._uSectionPlanes[i];
                uSectionPlaneActive = sectionPlaneUniforms.active;
                sectionPlane = sectionPlanes[i];
                if (uSectionPlaneActive) {
                    gl.uniform1i(uSectionPlaneActive, sectionPlane.active);
                }
                uSectionPlanePos = sectionPlaneUniforms.pos;
                if (uSectionPlanePos) {
                    gl.uniform3fv(sectionPlaneUniforms.pos, sectionPlane.pos);
                }
                uSectionPlaneDir = sectionPlaneUniforms.dir;
                if (uSectionPlaneDir) {
                    gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                }
            }
        }
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

export {BatchingNormalsRenderer};