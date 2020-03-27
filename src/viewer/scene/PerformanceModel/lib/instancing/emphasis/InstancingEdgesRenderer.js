import {Program} from "../../../../webgl/Program.js";
import {InstancingEdgesShaderSource} from "./InstancingEdgesShaderSource.js";
import {RENDER_PASSES} from "../../renderPasses.js";

/**
 * @private
 */
class InstancingEdgesRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._shaderSource = new InstancingEdgesShaderSource(this._scene);
        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        return this._scene._sectionPlanesState.getHash();
    }

    drawLayer(frameCtx, layer, renderPass) {
        const model = layer.model;
        const scene = model.scene;
        const gl = scene.canvas.gl;
        const state = layer._state;
        const instanceExt = this._instanceExt;

        if (!this._program) {
            this._allocate(layer);
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram();
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

        gl.uniform1i(this._uRenderPass, renderPass);
        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, layer._state.positionsDecodeMatrix);

        gl.uniformMatrix4fv(this._uViewMatrix, false, model.viewMatrix);

        this._aModelMatrixCol0.bindArrayBuffer(state.modelMatrixCol0Buf);
        this._aModelMatrixCol1.bindArrayBuffer(state.modelMatrixCol1Buf);
        this._aModelMatrixCol2.bindArrayBuffer(state.modelMatrixCol2Buf);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 1);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 1);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 1);

        this._aPosition.bindArrayBuffer(state.positionsBuf);

        if (this._aFlags) {
            this._aFlags.bindArrayBuffer(state.flagsBuf, gl.UNSIGNED_BYTE, true);
            instanceExt.vertexAttribDivisorANGLE(this._aFlags.location, 1);
        }

        if (this._aFlags2) {
            this._aFlags2.bindArrayBuffer(state.flags2Buf, gl.UNSIGNED_BYTE, true);
            instanceExt.vertexAttribDivisorANGLE(this._aFlags2.location, 1);
        }

        state.edgeIndicesBuf.bind();
        instanceExt.drawElementsInstancedANGLE(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0, state.numInstances);

        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 0); // TODO: Is this needed
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 0);

        if (this._aFlags) {
            instanceExt.vertexAttribDivisorANGLE(this._aFlags.location, 0);
        }

        if (this._aFlags2) {
            instanceExt.vertexAttribDivisorANGLE(this._aFlags2.location, 0);
        }
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
        this._uColor = program.getLocation("color");
        this._uRenderPass = program.getLocation("renderPass");
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
        program.bind();
        const camera = scene.camera;
        const cameraState = camera._state;
        gl.uniformMatrix4fv(this._uProjMatrix, false, camera._project._state.matrix);
        const sectionPlanesState = scene._sectionPlanesState;
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

export {InstancingEdgesRenderer};