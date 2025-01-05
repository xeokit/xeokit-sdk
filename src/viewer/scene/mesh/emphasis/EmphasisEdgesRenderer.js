/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {Map} from "../../utils/Map.js";
import {EmphasisEdgesShaderSource} from "./EmphasisEdgesShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";
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
    this._programSetup = EmphasisEdgesShaderSource(mesh);
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
    const meshState = mesh._state;
    const geometry = mesh._geometry;
    const geometryState = geometry._state;
    const origin = mesh.origin;

    if (frameCtx.lastProgramId !== this._program.id) {
        frameCtx.lastProgramId = this._program.id;
        this._bindProgram(frameCtx);
    }

    gl.uniformMatrix4fv(this._uViewMatrix, false, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix);

    if (meshState.clippable) {
        const numAllocatedSectionPlanes = scene._sectionPlanesState.getNumAllocatedSectionPlanes();
        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numAllocatedSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const renderFlags = mesh.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    if (sectionPlaneIndex < numSectionPlanes) {
                        const active = renderFlags.sectionPlanesActivePerLayer[sectionPlaneIndex];
                        gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                        if (active) {
                            const sectionPlane = sectionPlanes[sectionPlaneIndex];
                            if (origin) {
                                const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3a);
                                gl.uniform3fv(sectionPlaneUniforms.pos, rtcSectionPlanePos);
                            } else {
                                gl.uniform3fv(sectionPlaneUniforms.pos, sectionPlane.pos);
                            }
                            gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                        }
                    } else {
                        gl.uniform1i(sectionPlaneUniforms.active, 0);
                    }
                }
            }
        }
    }

    let material;
    switch (mode) {
        case 0:
            material = mesh._xrayMaterial;
            break;
        case 1:
            material = mesh._highlightMaterial;
            break;
        case 2:
            material = mesh._selectedMaterial;
            break;
        case 3:
        default:
            material = mesh._edgeMaterial;
            break;
    }

    const materialState = material._state;

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
        this._setMaterialInputsState && this._setMaterialInputsState(material);
        this._lastMaterialId = materialState.id;
    }

    gl.uniformMatrix4fv(this._uModelMatrix, gl.FALSE, mesh.worldMatrix);

    if (this._uClippable) {
        gl.uniform1i(this._uClippable, meshState.clippable);
    }

    gl.uniform3fv(this._uOffset, meshState.offset);

    this._setInputsState && this._setInputsState();

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
                this._aPosition.bindArrayBuffer(geometryState.positionsBuf);
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

    this._program = new Program(gl, MeshRenderer(this._programSetup, mesh));

    if (this._program.errors) {
        this.errors = this._program.errors;
        return;
    }

    const program = this._program;
    const getInputSetter = makeInputSetters(gl, program.handle);
    this._setInputsState = this._programSetup.setupInputs && this._programSetup.setupInputs(getInputSetter);
    this._setMaterialInputsState = this._programSetup.setupMaterialInputs && this._programSetup.setupMaterialInputs(getInputSetter);

    this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
    this._uModelMatrix = program.getLocation("modelMatrix");
    this._uViewMatrix = program.getLocation("viewMatrix");
    this._uProjMatrix = program.getLocation("projMatrix");
    this._uSectionPlanes = [];
    for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
        this._uSectionPlanes.push({
            active: program.getLocation("sectionPlaneActive" + i),
            pos: program.getLocation("sectionPlanePos" + i),
            dir: program.getLocation("sectionPlaneDir" + i)
        });
    }
    this._aPosition = program.getAttribute("position");
    this._uClippable = program.getLocation("clippable");
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
};

export {EmphasisEdgesRenderer};
