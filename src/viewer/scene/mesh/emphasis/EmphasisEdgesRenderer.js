/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {Map} from "../../utils/Map.js";
import {EmphasisEdgesShaderSource} from "./EmphasisEdgesShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {stats} from '../../stats.js';
import {math} from "../../math/math.js";
import {getPlaneRTCPos} from "../../math/rtcCoords.js";

const ids = new Map({});

const tempVec3a = math.vec3();

/**
 * @private
 */
const EmphasisEdgesRenderer = function (hash, mesh) {
    this.id = ids.addItem({});
    this._hash = hash;
    this._scene = mesh.scene;
    this._useCount = 0;
    this._shaderSource = new EmphasisEdgesShaderSource(mesh);
    this._allocate(mesh);
};

const renderers = {};

EmphasisEdgesRenderer.get = function (mesh) {
    const hash = [
        mesh.scene.id,
        mesh.scene.gammaOutput ? "go" : "", // Gamma input not needed
        mesh.scene._sectionPlanesState.getHash(),
        mesh._geometry._state.compressGeometry ? "cp" : "",
        mesh._state.hash
    ].join(";");
    let renderer = renderers[hash];
    if (!renderer) {
        renderer = new EmphasisEdgesRenderer(hash, mesh);
        renderers[hash] = renderer;
        stats.memory.programs++;
    }
    renderer._useCount++;
    return renderer;
};

EmphasisEdgesRenderer.prototype.put = function () {
    if (--this._useCount === 0) {
        ids.removeItem(this.id);
        if (this._program) {
            this._program.destroy();
        }
        delete renderers[this._hash];
        stats.memory.programs--;
    }
};

EmphasisEdgesRenderer.prototype.webglContextRestored = function () {
    this._program = null;
};

EmphasisEdgesRenderer.prototype.drawMesh = function (frameCtx, mesh, mode) {

    if (!this._program) {
        this._allocate(mesh);
    }

    const scene = this._scene;
    const camera = scene.camera;
    const gl = scene.canvas.gl;
    let materialState;
    const meshState = mesh._state;
    const geometry = mesh._geometry;
    const geometryState = geometry._state;
    const rtcCenter = mesh.rtcCenter;

    if (frameCtx.lastProgramId !== this._program.id) {
        frameCtx.lastProgramId = this._program.id;
        this._bindProgram(frameCtx);
    }

    gl.uniformMatrix4fv(this._uViewMatrix, false, rtcCenter ? frameCtx.getRTCViewMatrix(meshState.rtcCenterHash, rtcCenter) : camera.viewMatrix);

    if (meshState.clippable) {
        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const renderFlags = mesh.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    const active = renderFlags.sectionPlanesActivePerLayer[sectionPlaneIndex];
                    gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                    if (active) {
                        const sectionPlane = sectionPlanes[sectionPlaneIndex];
                        gl.uniform3fv(sectionPlaneUniforms.pos, rtcCenter ? getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, rtcCenter, tempVec3a) : sectionPlane.pos);
                        gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                    }
                }
            }
        }
    }

    switch (mode) {
        case 0:
            materialState = mesh._xrayMaterial._state;
            break;
        case 1:
            materialState = mesh._highlightMaterial._state;
            break;
        case 2:
            materialState = mesh._selectedMaterial._state;
            break;
        case 3:
        default:
            materialState = mesh._edgeMaterial._state;
            break;
    }

    if (materialState.id !== this._lastMaterialId) {
        const backfaces = materialState.backfaces;
        if (frameCtx.backfaces !== backfaces) {
            if (backfaces) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }
            frameCtx.backfaces = backfaces;
        }
        if (frameCtx.lineWidth !== materialState.edgeWidth) {
            gl.lineWidth(materialState.edgeWidth);
            frameCtx.lineWidth = materialState.edgeWidth;
        }
        if (this._uEdgeColor) {
            const edgeColor = materialState.edgeColor;
            const edgeAlpha = materialState.edgeAlpha;
            gl.uniform4f(this._uEdgeColor, edgeColor[0], edgeColor[1], edgeColor[2], edgeAlpha);
        }
        this._lastMaterialId = materialState.id;
    }

    gl.uniformMatrix4fv(this._uModelMatrix, gl.FALSE, mesh.worldMatrix);

    if (this._uClippable) {
        gl.uniform1i(this._uClippable, meshState.clippable);
    }

    gl.uniform3fv(this._uOffset, meshState.offset);

    // Bind VBOs
    let indicesBuf;
    if (geometryState.primitive === gl.TRIANGLES) {
        indicesBuf = geometry._getEdgeIndices();
    } else if (geometryState.primitive === gl.LINES) {
        indicesBuf = geometryState.indicesBuf;
    }

    if (indicesBuf) {
        if (geometryState.id !== this._lastGeometryId) {
            if (this._uPositionsDecodeMatrix) {
                gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, geometryState.positionsDecodeMatrix);
            }
            if (this._aPosition) {
                this._aPosition.bindArrayBuffer(geometryState.positionsBuf, geometryState.compressGeometry ? gl.UNSIGNED_SHORT : gl.FLOAT);
                frameCtx.bindArray++;
            }
            indicesBuf.bind();
            frameCtx.bindArray++;
            this._lastGeometryId = geometryState.id;
        }

        gl.drawElements(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0);

        frameCtx.drawElements++;
    }
};

EmphasisEdgesRenderer.prototype._allocate = function (mesh) {

    const scene = mesh.scene;
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
    for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
        this._uSectionPlanes.push({
            active: program.getLocation("sectionPlaneActive" + i),
            pos: program.getLocation("sectionPlanePos" + i),
            dir: program.getLocation("sectionPlaneDir" + i)
        });
    }
    this._uEdgeColor = program.getLocation("edgeColor");
    this._aPosition = program.getAttribute("position");
    this._uClippable = program.getLocation("clippable");
    this._uGammaFactor = program.getLocation("gammaFactor");
    this._uOffset = program.getLocation("offset");

    if (scene.logarithmicDepthBufferEnabled ) {
        this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
    }

    this._lastMaterialId = null;
    this._lastVertexBufsId = null;
    this._lastGeometryId = null;
};

EmphasisEdgesRenderer.prototype._bindProgram = function (frameCtx) {

    const program = this._program;
    const scene = this._scene;
    const gl = scene.canvas.gl;
    const camera = scene.camera;
    const project = camera.project;

    program.bind();

    frameCtx.useProgram++;

    this._lastMaterialId = null;
    this._lastVertexBufsId = null;
    this._lastGeometryId = null;

    gl.uniformMatrix4fv(this._uProjMatrix, false, project.matrix);

    if (scene.logarithmicDepthBufferEnabled ) {
        const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
        gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
    }

    if (this._uGammaFactor) {
        gl.uniform1f(this._uGammaFactor, scene.gammaFactor);
    }
};

export {EmphasisEdgesRenderer};
