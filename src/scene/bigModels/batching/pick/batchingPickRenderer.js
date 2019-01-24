import {Map} from "../../../utils/Map.js";
import {stats} from "../../../stats.js"
import {Program} from "../../../webgl/Program.js";
import {BatchingPickShaderSource} from "./batchingPickShaderSource.js";

const ids = new Map({});

/**
 * @private
 * @constructor
 */
const BatchingPickRenderer = function (hash, layer) {
    this.id = ids.addItem({});
    this._hash = hash;
    this._scene = layer.model.scene;
    this._useCount = 0;
    this._shaderSource = new BatchingPickShaderSource(layer);
    this._allocate(layer);
};

const renderers = {};

BatchingPickRenderer.get = function (layer) {
    const scene = layer.model.scene;
    const hash = getHash(scene);
    let renderer = renderers[hash];
    if (!renderer) {
        renderer = new BatchingPickRenderer(hash, layer);
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

BatchingPickRenderer.prototype.getValid = function () {
    return this._hash === getHash(this._scene);
};

BatchingPickRenderer.prototype.put = function () {
    if (--this._useCount === 0) {
        ids.removeItem(this.id);
        if (this._program) {
            this._program.destroy();
        }
        delete renderers[this._hash];
        stats.memory.programs--;
    }
};

BatchingPickRenderer.prototype.webglContextRestored = function () {
    this._program = null;
};

BatchingPickRenderer.prototype.drawLayer = function (frameCtx, layer) {
    const model = layer.model;
    const scene = model.scene;
    const gl = scene.canvas.gl;
    const state = layer._state;
    if (!this._program) {
        this._allocate(layer);
    }
    if (frameCtx.lastProgramId !== this._program.id) {
        frameCtx.lastProgramId = this._program.id;
        this._bindProgram(frameCtx, layer);
    }
    gl.uniformMatrix4fv(this._uModelMatrix, gl.FALSE, model.worldMatrix);
    this._aPosition.bindArrayBuffer(state.positionsBuf, gl.UNSIGNED_SHORT, false); // TODO: Don't need these params, these are now derived from the buffer.
    frameCtx.bindArray++;
    if (this._aFlags) {
        this._aFlags.bindArrayBuffer(state.flagsBuf, gl.UNSIGNED_BYTE, true);
        frameCtx.bindArray++;
    }
    if (this._aPickColor) {
        this._aPickColor.bindArrayBuffer(state.pickColorsBuf, gl.UNSIGNED_BYTE, true);
        frameCtx.bindArray++;
    }

    state.indicesBuf.bind();
    frameCtx.bindArray++;
    gl.uniform1i(this._uPickMeshIndexBase, frameCtx.pickMeshIndex);
    frameCtx.pickMeshIndex += layer.numObjects;
    gl.drawElements(state.primitive, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
    frameCtx.drawElements++;
};

BatchingPickRenderer.prototype._allocate = function (layer) {
    var scene = layer.model.scene;
    const gl = scene.canvas.gl;
    const sectionPlanesState = scene._sectionPlanesState;
    this._program = new Program(gl, this._shaderSource);
    if (this._program.errors) {
        this.errors = this._program.errors;
        return;
    }
    const program = this._program;
    this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
    this._uModelMatrix = program.getLocation("modelMatrix");
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
    this._uPickMeshIndexBase = program.getLocation("pickMeshIndexBase");
};

BatchingPickRenderer.prototype._bindProgram = function (frameCtx, layer) {
    const scene = this._scene;
    const gl = scene.canvas.gl;
    const program = this._program;
    const sectionPlanesState = scene._sectionPlanesState;
    const camera = scene.camera;
    const cameraState = camera._state;
    program.bind();
    frameCtx.useProgram++;
    gl.uniformMatrix4fv(this._uViewMatrix, false, frameCtx.pickViewMatrix || cameraState.matrix);
    gl.uniformMatrix4fv(this._uProjMatrix, false, frameCtx.pickProjMatrix || camera.project._state.matrix);
    gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, layer._state.positionsDecodeMatrix);
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
};

export {BatchingPickRenderer};
