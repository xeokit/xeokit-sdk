import {Program} from "../../../../webgl/Program.js";
import {InstancingEdgesShaderSource} from "./InstancingEdgesShaderSource.js";
import {RENDER_PASSES} from "../../renderPasses.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../math/rtcCoords.js";
import {math} from "../../../../math/math.js";

const tempVec3a = math.vec3();

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

    drawLayer(frameCtx, instancingLayer, renderPass) {

        const model = instancingLayer.model;
        const scene = model.scene;
        const gl = scene.canvas.gl;
        const state = instancingLayer._state;
        const instanceExt = this._instanceExt;
        const rtcCenter = instancingLayer._state.rtcCenter;

        if (!this._program) {
            this._allocate(instancingLayer);
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram();
        }

        gl.uniformMatrix4fv(this._uViewMatrix, false, (rtcCenter) ? createRTCViewMat(model.viewMatrix, rtcCenter) : model.viewMatrix);

        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = instancingLayer.layerIndex * numSectionPlanes;
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

        gl.uniform1i(this._uRenderPass, renderPass);
        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, instancingLayer._state.positionsDecodeMatrix);

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

        if (this._aOffset) {
            this._aOffset.bindArrayBuffer(state.offsetsBuf);
            instanceExt.vertexAttribDivisorANGLE(this._aOffset.location, 1);
        }

        state.edgeIndicesBuf.bind();

        instanceExt.drawElementsInstancedANGLE(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0, state.numInstances);

        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 0); // TODO: Is this needed
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 0);
        instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 0);

        if (this._aOffset) {
            instanceExt.vertexAttribDivisorANGLE(this._aOffset.location, 0);
        }

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
        this._aOffset = program.getAttribute("offset");
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

export {InstancingEdgesRenderer};