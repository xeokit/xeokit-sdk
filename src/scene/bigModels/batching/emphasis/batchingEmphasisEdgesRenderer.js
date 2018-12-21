import {Map} from "../../../utils/Map.js";
import {stats} from "../../../stats.js"
import {Program} from "../../../webgl/Program.js";
import {BatchingEmphasisEdgesShaderSource} from "./batchingEmphasisEdgesShaderSource.js";
import {RENDER_PASSES} from '../../renderPasses.js';

const ids = new Map({});

/**
 * @private
 * @constructor
 */
const BatchingEmphasisEdgesRenderer = function (hash, layer) {
    this.id = ids.addItem({});
    this._hash = hash;
    this._scene = layer.model.scene;
    this._useCount = 0;
    this._shaderSource = new BatchingEmphasisEdgesShaderSource(layer);
    this._allocate(layer);
};

const renderers = {};
const defaultColorize = new Float32Array([1.0, 1.0, 1.0, 1.0]);

BatchingEmphasisEdgesRenderer.get = function (layer) {
    const scene = layer.model.scene;
    const hash = getHash(scene);
    let renderer = renderers[hash];
    if (!renderer) {
        renderer = new BatchingEmphasisEdgesRenderer(hash, layer);
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
    return [scene.canvas.canvas.id, "", scene._clipsState.getHash()].join(";")
}

BatchingEmphasisEdgesRenderer.prototype.getValid = function () {
    return this._hash === getHash(this._scene);
};

BatchingEmphasisEdgesRenderer.prototype.put = function () {
    if (--this._useCount === 0) {
        ids.removeItem(this.id);
        if (this._program) {
            this._program.destroy();
        }
        delete renderers[this._hash];
        stats.memory.programs--;
    }
};

BatchingEmphasisEdgesRenderer.prototype.webglContextRestored = function () {
    this._program = null;
};

BatchingEmphasisEdgesRenderer.prototype.drawLayer = function (frameCtx, layer, renderPass) {
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
    if (renderPass === RENDER_PASSES.GHOSTED) {
        const material = scene.ghostMaterial._state;
        const edgeColor = material.edgeColor;
        const edgeAlpha = material.edgeAlpha;
        gl.uniform4f(this._uColor, edgeColor[0], edgeColor[1], edgeColor[2], edgeAlpha);
    } else if (renderPass === RENDER_PASSES.HIGHLIGHTED) {
        const material = scene.highlightMaterial._state;
        const edgeColor = material.edgeColor;
        const edgeAlpha = material.edgeAlpha;
        gl.uniform4f(this._uColor, edgeColor[0], edgeColor[1], edgeColor[2], edgeAlpha);
    } else {
        const material = scene.edgeMaterial._state;
        const edgeColor = material.edgeColor;
        const edgeAlpha = material.edgeAlpha;
        gl.uniform4f(this._uColor, edgeColor[0], edgeColor[1], edgeColor[2], edgeAlpha);
    }
    gl.uniform1i(this._uRenderPass, renderPass);
    this._aPosition.bindArrayBuffer(state.positionsBuf);
    frameCtx.bindArray++;
    if (this._aFlags) {
        this._aFlags.bindArrayBuffer(state.flagsBuf);
        frameCtx.bindArray++;
    }
    state.edgeIndicesBuf.bind();
    frameCtx.bindArray++;
    gl.drawElements(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0);
    frameCtx.drawElements++;
};

BatchingEmphasisEdgesRenderer.prototype._allocate = function (layer) {
    var scene = layer.model.scene;
    const gl = scene.canvas.gl;
    const clipsState = scene._clipsState;
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
    this._uClips = [];
    const clips = clipsState.clips;
    for (var i = 0, len = clips.length; i < len; i++) {
        this._uClips.push({
            active: program.getLocation("clipActive" + i),
            pos: program.getLocation("clipPos" + i),
            dir: program.getLocation("clipDir" + i)
        });
    }
    this._aPosition = program.getAttribute("position");
    this._aFlags = program.getAttribute("flags");
};

BatchingEmphasisEdgesRenderer.prototype._bindProgram = function (frameCtx, layer) {
    const scene = this._scene;
    const gl = scene.canvas.gl;
    const program = this._program;
    const clipsState = scene._clipsState;
    program.bind();
    frameCtx.useProgram++;
    const camera = scene.camera;
    const cameraState = camera._state;
    gl.uniformMatrix4fv(this._uViewMatrix, false, cameraState.matrix);
    gl.uniformMatrix4fv(this._uProjMatrix, false, camera._project._state.matrix);
    gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, layer._state.positionsDecodeMatrix);
    if (clipsState.clips.length > 0) {
        const clips = scene._clipsState.clips;
        let clipUniforms;
        let uClipActive;
        let clip;
        let uClipPos;
        let uClipDir;
        for (var i = 0, len = this._uClips.length; i < len; i++) {
            clipUniforms = this._uClips[i];
            uClipActive = clipUniforms.active;
            clip = clips[i];
            if (uClipActive) {
                gl.uniform1i(uClipActive, clip.active);
            }
            uClipPos = clipUniforms.pos;
            if (uClipPos) {
                gl.uniform3fv(clipUniforms.pos, clip.pos);
            }
            uClipDir = clipUniforms.dir;
            if (uClipDir) {
                gl.uniform3fv(clipUniforms.dir, clip.dir);
            }
        }
    }
};

export {BatchingEmphasisEdgesRenderer};
