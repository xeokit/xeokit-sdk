/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {EmphasisEdgesShaderSource} from "./EmphasisEdgesShaderSource.js";
import {EmphasisFillShaderSource} from "./EmphasisFillShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";
import {math} from "../../math/math.js";
import {getPlaneRTCPos} from "../../math/rtcCoords.js";

const tempVec3a = math.vec3();

/**
 * @private
 */
export const EmphasisRenderer = function(mesh, isFill) {
    const scene = mesh.scene;
    const gl = scene.canvas.gl;
    const programSetup = isFill ? EmphasisFillShaderSource(mesh) : EmphasisEdgesShaderSource(mesh);
    const program = new Program(gl, MeshRenderer(programSetup, mesh));
    if (program.errors) {
        this.errors = program.errors;
    } else {
        this._isFill = isFill;
        const useNormals = isFill;
        this._useNormals = useNormals;

        this._scene = scene;
        this._program = program;

        const getInputSetter = makeInputSetters(gl, program.handle, true);
        this._setInputsState = programSetup.setupInputs && programSetup.setupInputs(getInputSetter);
        this._setMaterialInputsState = programSetup.setupMaterialInputs && programSetup.setupMaterialInputs(getInputSetter);
        this._setLightInputState = programSetup.setupLightInputs && programSetup.setupLightInputs(getInputSetter);

        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uModelMatrix = program.getLocation("modelMatrix");
        this._uModelNormalMatrix = useNormals && program.getLocation("modelNormalMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uViewNormalMatrix = useNormals && program.getLocation("viewNormalMatrix");
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
        this._aNormal = useNormals && program.getAttribute("normal");
        this._uClippable = program.getLocation("clippable");
        this._uOffset = program.getLocation("offset");
        if (scene.logarithmicDepthBufferEnabled ) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }
        this._lastMaterialId = null;
        this._lastVertexBufsId = null;
        this._lastGeometryId = null;
    }
};

EmphasisRenderer.getHash = (mesh, isFill) => [
    mesh._state.hash,
    mesh.scene.gammaOutput ? "go" : "", // Gamma input not needed
    isFill && mesh.scene._lightsState.getHash(),
    (isFill && mesh._geometry._state.normalsBuf) ? "n" : "",
    mesh._geometry._state.compressGeometry ? "cp" : ""
];

EmphasisRenderer.prototype.drawMesh = function (frameCtx, mesh, mode) {
    const isFill = this._isFill;
    const material = (mode === 0) ? mesh._xrayMaterial : ((mode === 1) ? mesh._highlightMaterial : ((mode === 2) ? mesh._selectedMaterial : mesh._edgeMaterial));

    const useNormals = this._useNormals;
    const scene = this._scene;
    const camera = scene.camera;
    const gl = scene.canvas.gl;
    const meshState = mesh._state;
    const geometry = mesh._geometry;
    const geometryState = geometry._state;
    const origin = mesh.origin;
    const materialState = material._state;

    const program = this._program;
    if (frameCtx.lastProgramId !== program.id) {
        frameCtx.lastProgramId = program.id;
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
        this._setLightInputState && this._setLightInputState();
    }

    gl.uniformMatrix4fv(this._uViewMatrix, false, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix);
    useNormals && gl.uniformMatrix4fv(this._uViewNormalMatrix, false, camera.viewNormalMatrix);

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
        if ((! isFill) && (frameCtx.lineWidth !== materialState.edgeWidth)) {
            gl.lineWidth(materialState.edgeWidth);
            frameCtx.lineWidth = materialState.edgeWidth;
        }
        this._setMaterialInputsState && this._setMaterialInputsState(material);
        this._lastMaterialId = materialState.id;
    }

    gl.uniformMatrix4fv(this._uModelMatrix, gl.FALSE, mesh.worldMatrix);
    if (useNormals && this._uModelNormalMatrix) {
        gl.uniformMatrix4fv(this._uModelNormalMatrix, gl.FALSE, mesh.worldNormalMatrix);
    }

    if (this._uClippable) {
        gl.uniform1i(this._uClippable, meshState.clippable);
    }

    gl.uniform3fv(this._uOffset, meshState.offset);

    this._setInputsState && this._setInputsState();

    // Bind VBOs
    if (isFill) {
        if (geometryState.id !== this._lastGeometryId) {
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
            if (geometryState.indicesBuf) {
                geometryState.indicesBuf.bind();
                frameCtx.bindArray++;
                // gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
                // frameCtx.drawElements++;
            } else if (geometryState.positionsBuf) {
                // gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
                //  frameCtx.drawArrays++;
            }
            this._lastGeometryId = geometryState.id;
        }

        if (geometryState.indicesBuf) {
            gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
            frameCtx.drawElements++;
        } else if (geometryState.positionsBuf) {
            gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
            frameCtx.drawArrays++;
        }
    } else {
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
    }
};
