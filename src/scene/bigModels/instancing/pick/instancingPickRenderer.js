import {Map} from "../../../utils/Map.js";
import {stats} from "../../../stats.js"
import {Program} from "../../../webgl/Program.js";
import {InstancingPickShaderSource} from "./instancingPickShaderSource.js";

const ids = new Map({});

/**
 * @private
 */
const InstancingPickRenderer = function (hash, layer) {
    this.id = ids.addItem({});
    this._hash = hash;
    this._scene = layer.model.scene;
    this._useCount = 0;
    this._shaderSource = new InstancingPickShaderSource(layer);
    this._allocate(layer);
};

const renderers = {};

InstancingPickRenderer.get = function (layer) {
    const scene = layer.model.scene;
    const hash = getHash(scene);
    let renderer = renderers[hash];
    if (!renderer) {
        renderer = new InstancingPickRenderer(hash, layer);
        if (renderer.errors) {
            console.log(renderer.errors.join("\n"));
            return null;
        }
        renderers[hash] = renderer;
        stats.memory.programs++;
    }
    renderer._useCount++;
    return renderer;
};

function getHash(scene) {
    return [scene.canvas.canvas.id, "", scene._sectionPlanesState.getHash()].join(";")
}

InstancingPickRenderer.prototype.getValid = function () {
    return this._hash === getHash(this._scene);
};

InstancingPickRenderer.prototype.put = function () {
    if (--this._useCount === 0) {
        ids.removeItem(this.id);
        if (this._program) {
            this._program.destroy();
        }
        delete renderers[this._hash];
        stats.memory.programs--;
    }
};

InstancingPickRenderer.prototype.webglContextRestored = function () {
    this._program = null;
};

InstancingPickRenderer.prototype.drawLayer = function (frameCtx, layer) {

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
        this._bindProgram(frameCtx, layer);
    }

    this._aModelMatrixCol0.bindArrayBuffer(state.modelMatrixCol0Buf, gl.FLOAT, false);
    this._aModelMatrixCol1.bindArrayBuffer(state.modelMatrixCol1Buf, gl.FLOAT, false);
    this._aModelMatrixCol2.bindArrayBuffer(state.modelMatrixCol2Buf, gl.FLOAT, false);
    instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 1);
    instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 1);
    instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 1);
    frameCtx.bindArray+=3;

    this._aPickColor.bindArrayBuffer(state.pickColorsBuf, gl.UNSIGNED_BYTE, false);
    instanceExt.vertexAttribDivisorANGLE(this._aPickColor.location, 1);
    frameCtx.bindArray++;

    this._aPosition.bindArrayBuffer(state.positionsBuf, gl.UNSIGNED_SHORT, false);
    frameCtx.bindArray++;

    this._aFlags.bindArrayBuffer(state.flagsBuf, gl.UNSIGNED_BYTE, true);
    instanceExt.vertexAttribDivisorANGLE(this._aFlags.location, 1);
    frameCtx.bindArray++;

    state.indicesBuf.bind();
    frameCtx.bindArray++;

    instanceExt.drawElementsInstancedANGLE(state.primitive, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);

    // Cleanup

    instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol0.location, 0); // TODO: Is this needed
    instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol1.location, 0);
    instanceExt.vertexAttribDivisorANGLE(this._aModelMatrixCol2.location, 0);
    instanceExt.vertexAttribDivisorANGLE(this._aPickColor.location, 0);
    instanceExt.vertexAttribDivisorANGLE(this._aFlags.location, 0);

    frameCtx.drawElements++;
};

InstancingPickRenderer.prototype._allocate = function (layer) {
    var scene = layer.model.scene;
    const gl = scene.canvas.gl;
    const lightsState = scene._lightsState;
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
    this._aPickColor = program.getAttribute("pickColor");
    this._aFlags = program.getAttribute("flags");

    this._aModelMatrixCol0 = program.getAttribute("modelMatrixCol0");
    this._aModelMatrixCol1 = program.getAttribute("modelMatrixCol1");
    this._aModelMatrixCol2 = program.getAttribute("modelMatrixCol2");
};

InstancingPickRenderer.prototype._bindProgram = function (frameCtx, layer) {
    const scene = this._scene;
    const gl = scene.canvas.gl;
    const program = this._program;
    const lightsState = scene._lightsState;
    const sectionPlanesState = scene._sectionPlanesState;
    const lights = lightsState.lights;
    let light;
    program.bind();
    frameCtx.useProgram++;
    const camera = scene.camera;
    const cameraState = camera._state;
    gl.uniformMatrix4fv(this._uViewMatrix, false, cameraState.matrix);
    gl.uniformMatrix4fv(this._uProjMatrix, false, camera._project._state.matrix);
    gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, layer._state.positionsDecodeMatrix);
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
};

export {InstancingPickRenderer};
