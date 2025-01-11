/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {PickTriangleShaderSource} from "./PickTriangleShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";
import {getPlaneRTCPos} from "../../math/rtcCoords.js";
import {math} from "../../math/math.js";

const tempVec3a = math.vec3();

/**
 * @private
 */
export const PickTriangleRenderer = function(mesh) {
    const scene = mesh.scene;
    const gl = scene.canvas.gl;
    const programSetup = PickTriangleShaderSource(mesh);
    const program = new Program(gl, MeshRenderer(programSetup, mesh));
    if (program.errors) {
        this.errors = program.errors;
    } else {
        this._scene = mesh.scene;
        this._program = program;
        const getInputSetter = makeInputSetters(gl, program.handle, true);
        this._setInputsState = programSetup.setupInputs && programSetup.setupInputs(getInputSetter);

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
        this._pickColor = program.getAttribute("pickColor");
        this._uClippable = program.getLocation("clippable");
        this._uOffset = program.getLocation("offset");
        if (scene.logarithmicDepthBufferEnabled ) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }
    }
};

PickTriangleRenderer.getHash = (mesh) => [
    mesh._geometry._state.compressGeometry ? "cp" : "",
    mesh._state.hash
];

PickTriangleRenderer.prototype.drawMesh = function (frameCtx, mesh) {
    const scene = this._scene;
    const gl = scene.canvas.gl;
    const meshState = mesh._state;
    const materialState = mesh._material._state;
    const geometry = mesh._geometry;
    const geometryState = mesh._geometry._state;
    const origin = mesh.origin;
    const backfaces = materialState.backfaces;
    const frontface = materialState.frontface;
    const project = scene.camera.project;
    const positionsBuf = geometry._getPickTrianglePositions();
    const pickColorsBuf = geometry._getPickTriangleColors();

    this._program.bind();

    frameCtx.useProgram++;

    if (scene.logarithmicDepthBufferEnabled ) {
        const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
        gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
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

    gl.uniformMatrix4fv(this._uProjMatrix, false, frameCtx.pickProjMatrix);

    if (frameCtx.backfaces !== backfaces) {
        if (backfaces) {
            gl.disable(gl.CULL_FACE);
        } else {
            gl.enable(gl.CULL_FACE);
        }
        frameCtx.backfaces = backfaces;
    }
    if (frameCtx.frontface !== frontface) {
        if (frontface) {
            gl.frontFace(gl.CCW);
        } else {
            gl.frontFace(gl.CW);
        }
        frameCtx.frontface = frontface;
    }

    gl.uniformMatrix4fv(this._uModelMatrix, false, mesh.worldMatrix);
    if (this._uClippable) {
        gl.uniform1i(this._uClippable, mesh._state.clippable);
    }
    gl.uniform3fv(this._uOffset, mesh._state.offset);
    if (this._uPositionsDecodeMatrix) {
        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, geometryState.positionsDecodeMatrix);
    }
    this._aPosition.bindArrayBuffer(positionsBuf);

    this._setInputsState && this._setInputsState(frameCtx, mesh._state);

    pickColorsBuf.bind();
    gl.enableVertexAttribArray(this._pickColor.location);
    gl.vertexAttribPointer(this._pickColor.location, pickColorsBuf.itemSize, pickColorsBuf.itemType, true, 0, 0); // Normalize
    gl.drawArrays(geometryState.primitive, 0, positionsBuf.numItems / 3);
};
