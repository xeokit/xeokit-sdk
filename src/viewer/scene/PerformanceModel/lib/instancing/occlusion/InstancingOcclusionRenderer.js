import {Program} from "../../../../webgl/Program.js";
import {InstancingOcclusionShaderSource} from "./InstancingOcclusionShaderSource.js";

/**
 * @private
 */
class InstancingOcclusionRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._shaderSource = new InstancingOcclusionShaderSource(this._scene);
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
        const instanceExt = this._instanceExt;

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

        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, layer._state.positionsDecodeMatrix);
        gl.uniformMatrix4fv(this._uViewMatrix, false, model.viewMatrix);

        this._aModelMatrixCol0.bindArrayBuffer(state.modelMatrixCol0Buf);
        this._aModelMatrixCol1.bindArrayBuffer(state.modelMatrixCol1Buf);
        this._aModelMatrixCol2.bindArrayBuffer(state.modelMatrixCol2Buf);

        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 1);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 1);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 1);

        if (this._aColor) {
            this._aColor.bindArrayBuffer(state.colorsBuf);
            instanceExt.vertexAttribDivisorANGLE(this._aColor.location, 1);
        }

        this._aPosition.bindArrayBuffer(state.positionsBuf);

        this._aOffset.bindArrayBuffer(state.offsetsBuf);
        instanceExt.vertexAttribDivisorANGLE(this._aOffset.location, 1);

        this._aFlags.bindArrayBuffer(state.flagsBuf);
        instanceExt.vertexAttribDivisorANGLE(this._aFlags.location, 1);

        if (this._aFlags2) {
            this._aFlags2.bindArrayBuffer(state.flags2Buf);
            instanceExt.vertexAttribDivisorANGLE(this._aFlags2.location, 1);
        }

        state.indicesBuf.bind();

        instanceExt.drawElementsInstancedANGLE(state.primitive, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);

        // Cleanup

        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 0);
        if (this._aColor) {
            instanceExt.vertexAttribDivisorANGLE(this._aColor.location, 0);
        }
        instanceExt.vertexAttribDivisorANGLE(this._aFlags.location, 0);
        if (this._aFlags2) { // Won't be in shader when not clipping
            instanceExt.vertexAttribDivisorANGLE(this._aFlags2.location, 0);
        }
        instanceExt.vertexAttribDivisorANGLE(this._aOffset.location, 0);
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
        this._instanceExt = gl.getExtension("ANGLE_instanced_arrays");
        const program = this._program;
        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");
        this._uSectionPlanes = [];
        const clips = sectionPlanesState.sectionPlanes;
        for (var i = 0, len = clips.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }
        this._aPosition = program.getAttribute("position");
        this._aOffset = program.getAttribute("offset");
        this._aColor = program.getAttribute("color");
        this._aFlags = program.getAttribute("flags");
        this._aFlags2 = program.getAttribute("flags2");
        this._aModelMatrixCol0 = program.getAttribute("modelMatrixCol0");
        this._aModelMatrixCol1 = program.getAttribute("modelMatrixCol1");
        this._aModelMatrixCol2 = program.getAttribute("modelMatrixCol2");
    }

    _bindProgram() {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const sectionPlanesState = scene._sectionPlanesState;
        program.bind();
        const camera = scene.camera;
        const cameraState = camera._state;
        gl.uniformMatrix4fv(this._uProjMatrix, false, camera._project._state.matrix);
        if (sectionPlanesState.sectionPlanes.length > 0) {
            const clips = scene._sectionPlanesState.sectionPlanes;
            let sectionPlaneUniforms;
            let uSectionPlaneActive;
            let sectionPlane;
            let uSectionPlanePos;
            let uSectionPlaneDir;
            for (var i = 0, len = this._uSectionPlanes.length; i < len; i++) {
                sectionPlaneUniforms = this._uSectionPlanes[i];
                uSectionPlaneActive = sectionPlaneUniforms.active;
                sectionPlane = clips[i];
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

export {InstancingOcclusionRenderer};