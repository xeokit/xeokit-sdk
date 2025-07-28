/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {PickTriangleShaderSource} from "./PickTriangleShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {stats} from "../../stats.js";
import {getPlaneRTCPos} from "../../math/rtcCoords.js";
import {math} from "../../math/math.js";

const tempVec3a = math.vec3();

/**
 * @private
 */
const PickTriangleRenderer = function (hash, mesh) {
    this._hash = hash;
    this._scene = mesh.scene;
    this._useCount = 0;
    this._programSetup = PickTriangleShaderSource(mesh);
    this._allocate(mesh);
};

const renderers = {};

PickTriangleRenderer.get = function (mesh) {
    const hash = [
        mesh.scene.canvas.canvas.id,
        mesh.scene._sectionPlanesState.getHash(),
        mesh._geometry._state.compressGeometry ? "cp" : "",
        mesh._state.hash
    ].join(";");
    let renderer = renderers[hash];
    if (!renderer) {
        renderer = new PickTriangleRenderer(hash, mesh);
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

PickTriangleRenderer.prototype.put = function () {
    if (--this._useCount === 0) {
        if (this._program) {
            this._program.destroy();
        }
        delete renderers[this._hash];
        stats.memory.programs--;
    }
};

PickTriangleRenderer.prototype.webglContextRestored = function () {
    this._program = null;
};

PickTriangleRenderer.prototype.drawMesh = function (frameCtx, mesh) {

    if (!this._program) {
        this._allocate(mesh);
    }

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

    gl.uniform2fv(this._uPickClipPos, frameCtx.pickClipPos);

    pickColorsBuf.bind();
    gl.enableVertexAttribArray(this._pickColor.location);
    gl.vertexAttribPointer(this._pickColor.location, pickColorsBuf.itemSize, pickColorsBuf.itemType, true, 0, 0); // Normalize
    gl.drawArrays(geometryState.primitive, 0, positionsBuf.numItems / 3);
};

PickTriangleRenderer.prototype._allocate = function (mesh) {
    const scene = mesh.scene;
    const gl = scene.canvas.gl;
    this._program = new Program(gl, MeshRenderer(this._programSetup, mesh));
    this._useCount = 0;
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
    for (let i = 0, len = scene._sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
        this._uSectionPlanes.push({
            active: program.getLocation("sectionPlaneActive" + i),
            pos: program.getLocation("sectionPlanePos" + i),
            dir: program.getLocation("sectionPlaneDir" + i)
        });
    }
    this._aPosition = program.getAttribute("position");
    this._pickColor = program.getAttribute("pickColor");
    this._uPickClipPos = program.getLocation("pickClipPos");
    this._uClippable = program.getLocation("clippable");
    this._uOffset = program.getLocation("offset");
    if (scene.logarithmicDepthBufferEnabled ) {
        this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
    }
};

export {PickTriangleRenderer};



