/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {DrawShaderSource} from "./DrawShaderSource.js";
import {LambertShaderSource} from "./LambertShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";
import {math} from "../../math/math.js";
import {getPlaneRTCPos} from "../../math/rtcCoords.js";

const tempVec3a = math.vec3();

/**
 * @private
 */
export const DrawRenderer = function(mesh) {
    const scene = mesh.scene;
    const gl = scene.canvas.gl;
    const programSetup = (mesh._material._state.type === "LambertMaterial") ? LambertShaderSource(mesh) : DrawShaderSource(mesh);
    const meshRenderer = MeshRenderer(programSetup, mesh);
    const program = new Program(gl, { vertex: meshRenderer.vertex, fragment: meshRenderer.fragment });
    if (program.errors) {
        this.errors = program.errors;
    } else {
        this._scene = scene;
        this._program = program;
        const getInputSetter = makeInputSetters(gl, program.handle, true);
        this._setInputsState = programSetup.setupInputs && programSetup.setupInputs(getInputSetter);
        this._setMaterialInputsState = programSetup.setupMaterialInputs && programSetup.setupMaterialInputs(getInputSetter);
        this._setLightInputState = programSetup.setupLightInputs && programSetup.setupLightInputs(getInputSetter);
        this._setGeometryInputsState = meshRenderer.setupGeometryInputs && meshRenderer.setupGeometryInputs(getInputSetter);
        this._setGeneralMaterialInputsState = meshRenderer.setupGeneralMaterialInputs && meshRenderer.setupGeneralMaterialInputs(getInputSetter);
        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uModelMatrix = program.getLocation("modelMatrix");
        this._uModelNormalMatrix = program.getLocation("modelNormalMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uViewNormalMatrix = program.getLocation("viewNormalMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");

        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }

        this._uSectionPlanes = [];
        for (let i = 0, len = scene._sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        this._aPosition = program.getAttribute("position");
        this._aNormal = program.getAttribute("normal");
        this._aUV = program.getAttribute("uv");
        this._aColor = program.getAttribute("color");

        this._uClippable = program.getLocation("clippable");
        this._uOffset = program.getLocation("offset");
        this._uScale = program.getLocation("scale");

        this._lastMaterialId = null;
        this._lastVertexBufsId = null;
        this._lastGeometryId = null;
    }
};

DrawRenderer.getHash = (mesh) => [
    mesh._geometry._state.hash,
    mesh._state.drawHash,
    mesh.scene.gammaOutput ? "go" : "",
    mesh.scene._lightsState.getHash(),
    mesh._material._state.hash
];

DrawRenderer.prototype.drawMesh = function (frameCtx, mesh) {
    const scene = mesh.scene;
    const material = mesh._material;
    const gl = scene.canvas.gl;
    const program = this._program;
    const meshState = mesh._state;
    const materialState = mesh._material._state;
    const geometryState = mesh._geometry._state;
    const camera = scene.camera;
    const origin = mesh.origin;
    const background = meshState.background;

    if (frameCtx.lastProgramId !== this._program.id) {
        frameCtx.lastProgramId = this._program.id;
        if (background) {
            gl.depthFunc(gl.LEQUAL);
        }

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const lightsState = scene._lightsState;
        const project = scene.camera.project;
        let light;

        const program = this._program;

        program.bind();

        frameCtx.useProgram++;

        this._lastMaterialId = null;
        this._lastVertexBufsId = null;
        this._lastGeometryId = null;

        gl.uniformMatrix4fv(this._uProjMatrix, false, project.matrix);

        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }

        this._setLightInputState && this._setLightInputState();
    }

    gl.uniformMatrix4fv(this._uViewMatrix, false, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix);
    gl.uniformMatrix4fv(this._uViewNormalMatrix, false, camera.viewNormalMatrix);

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

        if (frameCtx.lineWidth !== materialState.lineWidth) {
            gl.lineWidth(materialState.lineWidth);
            frameCtx.lineWidth = materialState.lineWidth;
        }

        this._setMaterialInputsState && this._setMaterialInputsState(material);
        this._setGeneralMaterialInputsState && this._setGeneralMaterialInputsState(material);

        this._lastMaterialId = materialState.id;
    }

    gl.uniformMatrix4fv(this._uModelMatrix, gl.FALSE, mesh.worldMatrix);
    if (this._uModelNormalMatrix) {
        gl.uniformMatrix4fv(this._uModelNormalMatrix, gl.FALSE, mesh.worldNormalMatrix);
    }

    if (this._uClippable) {
        gl.uniform1i(this._uClippable, meshState.clippable);
    }

    this._setInputsState && this._setInputsState(frameCtx, mesh._state);

    gl.uniform3fv(this._uOffset, meshState.offset);
    gl.uniform3fv(this._uScale, mesh.scale);

    // Bind VBOs

    if (geometryState.id !== this._lastGeometryId) {
        this._setGeometryInputsState && this._setGeometryInputsState(geometryState);
        if (this._uPositionsDecodeMatrix) {
            gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, geometryState.positionsDecodeMatrix);
        }
        if (this._aPosition) {
            this._aPosition.bindArrayBuffer(geometryState.positionsBuf);
            frameCtx.bindArray++;
        }
        if (this._aNormal) {
            this._aNormal.bindArrayBuffer(geometryState.normalsBuf);
            frameCtx.bindArray++;
        }
        if (this._aUV) {
            this._aUV.bindArrayBuffer(geometryState.uvBuf);
            frameCtx.bindArray++;
        }
        if (this._aColor) {
            this._aColor.bindArrayBuffer(geometryState.colorsBuf);
            frameCtx.bindArray++;
        }
        if (geometryState.indicesBuf) {
            geometryState.indicesBuf.bind();
            frameCtx.bindArray++;
        }
        this._lastGeometryId = geometryState.id;
    }

    // Draw (indices bound in prev step)

    if (geometryState.indicesBuf) {
        gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
        frameCtx.drawElements++;
    } else if (geometryState.positionsBuf) {
        gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
        frameCtx.drawArrays++;
    }

    if (background) {
        gl.depthFunc(gl.LESS);
    }
};
