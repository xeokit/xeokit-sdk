import {Program} from "../../../../webgl/Program.js";
import {BatchingPickMeshShaderSource} from "./BatchingPickMeshShaderSource.js";

/**
 * @private
 */
class BatchingPickMeshRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._shaderSource = new BatchingPickMeshShaderSource(this._scene);
        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        return this._scene._sectionPlanesState.getHash();
    }

    drawLayer(frameCtx, layer) {
        const model = layer.model;
        const scene = model.scene;
        const gl = scene.canvas.gl;
        const state = layer._state;
        if (!this._program) {
            this._allocate(layer);
        }
        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram(frameCtx);
        }
        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, layer._state.positionsDecodeMatrix);
        gl.uniformMatrix4fv(this._uViewMatrix, false, frameCtx.pickViewMatrix ? model.getPickViewMatrix(frameCtx.pickViewMatrix) : model.viewMatrix);
        this._aPosition.bindArrayBuffer(state.positionsBuf);
        if (this._aFlags) {
            this._aFlags.bindArrayBuffer(state.flagsBuf);
        }
        if (this._aFlags2) {
            this._aFlags2.bindArrayBuffer(state.flags2Buf);
        }
        if (this._aPickColor) {
            this._aPickColor.bindArrayBuffer(state.pickColorsBuf);
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
        this._aPickColor = program.getAttribute("pickColor");
        this._aFlags = program.getAttribute("flags");
        this._aFlags2 = program.getAttribute("flags2");
    }

    _bindProgram(frameCtx) {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const sectionPlanesState = scene._sectionPlanesState;
        const camera = scene.camera;
        program.bind();
        gl.uniform1i(this._uPickInvisible, frameCtx.pickInvisible);
        gl.uniformMatrix4fv(this._uProjMatrix, false, frameCtx.pickProjMatrix || camera.project._state.matrix);
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

export {BatchingPickMeshRenderer};