import {Program} from "../../../../webgl/Program.js";
import {BatchingEdgesShaderSource} from "./BatchingEdgesShaderSource.js";
import {RENDER_PASSES} from "../../renderPasses.js";
import {createRTCViewMat} from "../../../../math/rtcCoords.js";

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
        const viewMat = (batchingLayer._state.rtcCenter) ? createRTCViewMat(model.viewMatrix, batchingLayer._state.rtcCenter) : model.viewMatrix;
        gl.uniformMatrix4fv(this._uViewMatrix, false, viewMat);
        gl.uniform1i(this._uRenderPass, renderPass);
        this._aPosition.bindArrayBuffer(state.positionsBuf);
        this._aOffset.bindArrayBuffer(state.offsetsBuf);
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

export {BatchingEdgesRenderer};