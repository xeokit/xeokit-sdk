import {Program} from "../../../../webgl/Program.js";
import {BatchingPickDepthShaderSource} from "./BatchingPickDepthShaderSource.js";
import {createRTCViewMat} from "../../../../math/rtcCoords.js";

/**
 * @private
 */
class BatchingPickDepthRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._shaderSource = new BatchingPickDepthShaderSource(this._scene);
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
        const projectState = scene.camera.project._state;
        if (!this._program) {
            this._allocate();
        }
        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram();
        }
        gl.uniform1i(this._uPickInvisible, frameCtx.pickInvisible);

        const pickViewMatrix = frameCtx.pickViewMatrix ? model.getPickViewMatrix(frameCtx.pickViewMatrix) : model.viewMatrix;
        const viewMatrix = batchingLayer._state.rtcCenter ? createRTCViewMat(pickViewMatrix, batchingLayer._state.rtcCenter) : pickViewMatrix;

        gl.uniformMatrix4fv(this._uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(this._uProjMatrix, false, frameCtx.pickProjMatrix);
        gl.uniform1f(this._uZNear, projectState.near);
        gl.uniform1f(this._uZFar, projectState.far);
        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, batchingLayer._state.positionsDecodeMatrix);
        this._aPosition.bindArrayBuffer(state.positionsBuf);
        this._aOffset.bindArrayBuffer(state.offsetsBuf);
        if (this._aFlags) {
            this._aFlags.bindArrayBuffer(state.flagsBuf);
        }
        if (this._aFlags2) {
            this._aFlags2.bindArrayBuffer(state.flags2Buf);
        }
        state.indicesBuf.bind();

        //=============================================================
        // TODO: Use drawElements count and offset to draw only one entity
        //=============================================================

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
        this._uPickInvisible = program.getLocation("pickInvisible");
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
        this._uZNear = program.getLocation("zNear");
        this._uZFar = program.getLocation("zFar");
    }

    _bindProgram() {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const sectionPlanesState = scene._sectionPlanesState;
        const camera = scene.camera;
        program.bind();
        if (sectionPlanesState.sectionPlanes.length > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            let sectionPlaneUniforms;
            let uSectionPlaneActive;
            let sectionPlane;
            let uSectionPlanePos;
            let uSectionPlaneDir;
            for (var i = 0, len = this._uSectionPlanes.length; i < len; i++) {
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

export {BatchingPickDepthRenderer};