import {Program} from "../../../../webgl/Program.js";
import {InstancingPickNormalsShaderSource} from "./InstancingPickNormalsShaderSource.js";
import {createRTCViewMat} from "../../../../math/rtcCoords.js";

/**
 * @private
 */
class InstancingPickNormalsRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._shaderSource = new InstancingPickNormalsShaderSource(this._scene);
        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        return this._scene._sectionPlanesState.getHash();
    }

    drawLayer(frameCtx, instancingLayer) {
        const model = instancingLayer.model;
        const scene = model.scene;
        const gl = scene.canvas.gl;
        const state = instancingLayer._state;
        const instanceExt = this._instanceExt;

        if (!this._program) {
            this._allocate(instancingLayer);
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram(frameCtx);
        }

        // In practice, these binds will only happen once per frame
        // because we pick normals on a single previously-picked mesh

        gl.uniform1i(this._uPickInvisible, frameCtx.pickInvisible);

        const pickViewMatrix = frameCtx.pickViewMatrix ? model.getPickViewMatrix(frameCtx.pickViewMatrix) : model.viewMatrix;
        const rtcPickViewMatrix = (instancingLayer._state.rtcCenter) ? createRTCViewMat(pickViewMatrix, instancingLayer._state.rtcCenter) : pickViewMatrix;

        gl.uniformMatrix4fv(this._uViewMatrix, false, rtcPickViewMatrix);
        gl.uniformMatrix4fv(this._uProjMatrix, false, frameCtx.pickProjMatrix);

        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, instancingLayer._state.positionsDecodeMatrix);

        this._aModelMatrixCol0.bindArrayBuffer(state.modelMatrixCol0Buf);
        this._aModelMatrixCol1.bindArrayBuffer(state.modelMatrixCol1Buf);
        this._aModelMatrixCol2.bindArrayBuffer(state.modelMatrixCol2Buf);

        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 1);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 1);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 1);

        this._aModelNormalMatrixCol0.bindArrayBuffer(state.modelNormalMatrixCol0Buf);
        this._aModelNormalMatrixCol1.bindArrayBuffer(state.modelNormalMatrixCol1Buf);
        this._aModelNormalMatrixCol2.bindArrayBuffer(state.modelNormalMatrixCol2Buf);

        instanceExt.vertexAttribDivisorANGLE(this._aModelNormalMatrixCol0.location, 1);
        instanceExt.vertexAttribDivisorANGLE(this._aModelNormalMatrixCol1.location, 1);
        instanceExt.vertexAttribDivisorANGLE(this._aModelNormalMatrixCol2.location, 1);

        this._aPosition.bindArrayBuffer(state.positionsBuf);
        this._aNormal.bindArrayBuffer(state.normalsBuf);
        this._aFlags.bindArrayBuffer(state.flagsBuf);
        instanceExt.vertexAttribDivisorANGLE(this._aFlags.location, 1);

        if (this._aFlags2) {
            this._aFlags2.bindArrayBuffer(state.flags2Buf);
            instanceExt.vertexAttribDivisorANGLE(this._aFlags2.location, 1);
        }

        this._aOffset.bindArrayBuffer(state.offsetsBuf);
        instanceExt.vertexAttribDivisorANGLE(this._aOffset.location, 1);

        state.indicesBuf.bind();

        instanceExt.drawElementsInstancedANGLE(state.primitive, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);

        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelNormalMatrixCol0.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelNormalMatrixCol1.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelNormalMatrixCol2.location, 0);
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
        this._uPickInvisible = program.getLocation("pickInvisible");
        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uViewNormalMatrix = program.getLocation("viewNormalMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");

        this._uSectionPlanes = [];
        const clips = sectionPlanesState.sectionPlanes;
        for (let i = 0, len = clips.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        this._aPosition = program.getAttribute("position");
        this._aOffset = program.getAttribute("offset");
        this._aNormal = program.getAttribute("normal");
        this._aFlags = program.getAttribute("flags");
        this._aFlags2 = program.getAttribute("flags2");

        this._aModelMatrixCol0 = program.getAttribute("modelMatrixCol0");
        this._aModelMatrixCol1 = program.getAttribute("modelMatrixCol1");
        this._aModelMatrixCol2 = program.getAttribute("modelMatrixCol2");

        this._aModelNormalMatrixCol0 = program.getAttribute("modelNormalMatrixCol0");
        this._aModelNormalMatrixCol1 = program.getAttribute("modelNormalMatrixCol1");
        this._aModelNormalMatrixCol2 = program.getAttribute("modelNormalMatrixCol2");
    }

    _bindProgram() {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const sectionPlanesState = scene._sectionPlanesState;
        program.bind();
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

export {InstancingPickNormalsRenderer};