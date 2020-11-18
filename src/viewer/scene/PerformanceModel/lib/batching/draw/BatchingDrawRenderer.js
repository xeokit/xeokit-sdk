import {Program} from "../../../../webgl/Program.js";
import {BatchingDrawShaderSource} from "./batchingDrawShaderSource.js";
import {math} from "../../../../math/math.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../math/rtcCoords.js";

const tempVec4 = math.vec4();
const tempVec3a = math.vec3();

/**
 * @private
 */
class BatchingDrawRenderer {

    constructor(scene, withSAO) {

        this._scene = scene;
        this._withSAO = withSAO;
        this._hash = this._getHash();
        this._shaderSource = new BatchingDrawShaderSource(this._scene, this._withSAO);

        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        const scene = this._scene;
        return [scene._lightsState.getHash(), scene._sectionPlanesState.getHash(), (this._withSAO ? "sao" : "nosao")].join(";");
    }

    drawLayer(frameCtx, batchingLayer, renderPass) {

        const scene = this._scene;
        const model = batchingLayer.model;
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
            this._bindProgram(frameCtx);
        }

        gl.uniformMatrix4fv(this._uViewMatrix, false, (rtcCenter) ? createRTCViewMat(model.viewMatrix, rtcCenter) : model.viewMatrix);

        gl.uniformMatrix4fv(this._uViewNormalMatrix, false, model.viewNormalMatrix);

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

        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, batchingLayer._state.positionsDecodeMatrix);

        this._aPosition.bindArrayBuffer(state.positionsBuf);

        if (this._aNormal) {
            this._aNormal.bindArrayBuffer(state.normalsBuf);
        }

        if (this._aColor) {
            this._aColor.bindArrayBuffer(state.colorsBuf);
        }

        if (this._aFlags) {
            this._aFlags.bindArrayBuffer(state.flagsBuf);
        }

        if (this._aFlags2) {
            this._aFlags2.bindArrayBuffer(state.flags2Buf);
        }

        if (this._aOffset) {
            this._aOffset.bindArrayBuffer(state.offsetsBuf);
        }

        state.indicesBuf.bind();

        gl.drawElements(state.primitive, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
    }

    _allocate() {

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const lightsState = scene._lightsState;
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
        this._uLightAmbient = [];
        this._uLightColor = [];
        this._uLightDir = [];
        this._uLightPos = [];
        this._uLightAttenuation = [];

        const lights = lightsState.lights;
        let light;

        for (let i = 0, len = lights.length; i < len; i++) {
            light = lights[i];
            switch (light.type) {
                case "ambient":
                    this._uLightAmbient[i] = program.getLocation("lightAmbient");
                    break;
                case "dir":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = null;
                    this._uLightDir[i] = program.getLocation("lightDir" + i);
                    break;
                case "point":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = program.getLocation("lightPos" + i);
                    this._uLightDir[i] = null;
                    this._uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
                case "spot":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = program.getLocation("lightPos" + i);
                    this._uLightDir[i] = program.getLocation("lightDir" + i);
                    this._uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
            }
        }

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
        this._aFlags2 = program.getAttribute("flags2");

        if (this._withSAO) {
            this._uOcclusionTexture = "uOcclusionTexture";
            this._uSAOParams = program.getLocation("uSAOParams");
        }
    }

    _bindProgram(frameCtx) {

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const lights = scene._lightsState.lights;
        const camera = scene.camera;

        program.bind();

        gl.uniformMatrix4fv(this._uProjMatrix, false, camera._project._state.matrix);

        for (let i = 0, len = lights.length; i < len; i++) {

            const light = lights[i];

            if (this._uLightAmbient[i]) {
                gl.uniform4f(this._uLightAmbient[i], light.color[0], light.color[1], light.color[2], light.intensity);
            } else {
                if (this._uLightColor[i]) {
                    gl.uniform4f(this._uLightColor[i], light.color[0], light.color[1], light.color[2], light.intensity);
                }
                if (this._uLightPos[i]) {
                    gl.uniform3fv(this._uLightPos[i], light.pos);
                    if (this._uLightAttenuation[i]) {
                        gl.uniform1f(this._uLightAttenuation[i], light.attenuation);
                    }
                }
                if (this._uLightDir[i]) {
                    gl.uniform3fv(this._uLightDir[i], light.dir);
                }
            }
        }

        if (this._withSAO) {
            const sao = scene.sao;
            const saoEnabled = sao.possible;
            if (saoEnabled) {
                const viewportWidth = gl.drawingBufferWidth;
                const viewportHeight = gl.drawingBufferHeight;
                tempVec4[0] = viewportWidth;
                tempVec4[1] = viewportHeight;
                tempVec4[2] = sao.blendCutoff;
                tempVec4[3] = sao.blendFactor;
                gl.uniform4fv(this._uSAOParams, tempVec4);
                this._program.bindTexture(this._uOcclusionTexture, frameCtx.occlusionTexture, 0);
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

export {BatchingDrawRenderer};