/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {PickMeshShaderSource} from "./PickMeshShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";
import {math} from "../../math/math.js";
import {getPlaneRTCPos} from "../../math/rtcCoords.js";

const tempVec3a = math.vec3();

// No ID, because there is exactly one PickMeshRenderer per scene

/**
 * @private
 */
const PickMeshRenderer = function(mesh) {
    this._programSetup = PickMeshShaderSource(mesh);
    this._scene = mesh.scene;
    this._allocate(mesh);
};

PickMeshRenderer.getHash = (mesh, ...rest) => [
    mesh.scene.canvas.canvas.id,
    mesh.scene._sectionPlanesState.getHash(),
    mesh._geometry._state.hash,
    mesh._state.hash
].join(";");

PickMeshRenderer.prototype.drawMesh = function (frameCtx, mesh) {

    if (!this._program) {
        this._allocate(mesh);
    }

    const scene = this._scene;
    const gl = scene.canvas.gl;
    const meshState = mesh._state;
    const material = mesh._material;
    const materialState = material._state;
    const geometryState = mesh._geometry._state;
    const origin = mesh.origin;

    if (frameCtx.lastProgramId !== this._program.id) {
        frameCtx.lastProgramId = this._program.id;
        this._bindProgram(frameCtx);
    }

    gl.uniformMatrix4fv(this._uViewMatrix, false, origin ? frameCtx.getRTCPickViewMatrix(meshState.originHash, origin) : frameCtx.pickViewMatrix);

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
        const frontface = materialState.frontface;
        if (frameCtx.frontface !== frontface) {
            if (frontface) {
                gl.frontFace(gl.CCW);
            } else {
                gl.frontFace(gl.CW);
            }
            frameCtx.frontface = frontface;
        }
        this._setMaterialInputsState && this._setMaterialInputsState(material);
        this._lastMaterialId = materialState.id;
    }

    gl.uniformMatrix4fv(this._uProjMatrix, false, frameCtx.pickProjMatrix);
    gl.uniformMatrix4fv(this._uModelMatrix, false, mesh.worldMatrix);
    if (this._uClippable) {
        gl.uniform1i(this._uClippable, mesh._state.clippable);
    }
    gl.uniform3fv(this._uOffset, mesh._state.offset);

    if (geometryState.id !== this._lastGeometryId) {
        if (this._uPositionsDecodeMatrix) {
            gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, geometryState.positionsDecodeMatrix);
        }
        if (this._aPosition) {
            this._aPosition.bindArrayBuffer(geometryState.positionsBuf);
            frameCtx.bindArray++;
        }
        if (geometryState.indicesBuf) {
            geometryState.indicesBuf.bind();
            frameCtx.bindArray++;
        }
        this._lastGeometryId = geometryState.id;
    }

    this._setInputsState && this._setInputsState(frameCtx, mesh._state);

    if (geometryState.indicesBuf) {
        gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
        frameCtx.drawElements++;
    } else if (geometryState.positionsBuf) {
        gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
    }
};

PickMeshRenderer.prototype._allocate = function (mesh) {
    const scene = mesh.scene;
    const gl = scene.canvas.gl;
    this._program = new Program(gl, MeshRenderer(this._programSetup, mesh));
    if (this._program.errors) {
        this.errors = this._program.errors;
        return;
    }
    const program = this._program;
    const getInputSetter = makeInputSetters(gl, program.handle, true);
    this._setInputsState = this._programSetup.setupInputs && this._programSetup.setupInputs(getInputSetter);
    this._setMaterialInputsState = this._programSetup.setupMaterialInputs && this._programSetup.setupMaterialInputs(getInputSetter);

    this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
    this._uModelMatrix = program.getLocation("modelMatrix");
    this._uViewMatrix = program.getLocation("viewMatrix");
    this._uProjMatrix = program.getLocation("projMatrix");
    this._uSectionPlanes = [];
    for (let i = 0, len = scene._sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
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
    this._lastGeometryId = null;
};

PickMeshRenderer.prototype._bindProgram = function (frameCtx) {
    const scene = this._scene;
    const gl = scene.canvas.gl;
    const project = scene.camera.project;
    this._program.bind();
    frameCtx.useProgram++;
    if (scene.logarithmicDepthBufferEnabled ) {
        const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
        gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
    }
    this._lastMaterialId = null;
    this._lastGeometryId = null;
};

export {PickMeshRenderer};
