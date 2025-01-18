/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {OcclusionShaderSource} from "./OcclusionShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";
import {math} from "../../math/math.js";
import {getPlaneRTCPos} from "../../math/rtcCoords.js";

const tempVec3a = math.vec3();

export const OcclusionRenderer = {
    getHash: (mesh) => [
        mesh._geometry._state.hash,
        mesh._state.pickOcclusionHash
    ],
    instantiate: (mesh) => { // There is exactly one OcclusionRenderer per scene
        const scene = mesh.scene;
        const gl = scene.canvas.gl;
        const programSetup = OcclusionShaderSource();
        const program = new Program(gl, MeshRenderer(programSetup, mesh));
        if (program.errors) {
            return { errors: program.errors };
        } else {
            const useNormals = false;

            const getInputSetter = makeInputSetters(gl, program.handle, true);
            const setInputsState = programSetup.setupInputs && programSetup.setupInputs(getInputSetter);
            const setMaterialInputsState = programSetup.setupMaterialInputs && programSetup.setupMaterialInputs(getInputSetter);
            const setLightInputState = programSetup.setupLightInputs && programSetup.setupLightInputs(getInputSetter);

            const uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
            const uModelMatrix = program.getLocation("modelMatrix");
            const uModelNormalMatrix = useNormals && program.getLocation("modelNormalMatrix");
            const uViewMatrix = program.getLocation("viewMatrix");
            const uViewNormalMatrix = useNormals && program.getLocation("viewNormalMatrix");
            const uProjMatrix = program.getLocation("projMatrix");
            const uSectionPlanes = [];
            for (let i = 0, len = scene._sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                uSectionPlanes.push({
                    active: program.getLocation("sectionPlaneActive" + i),
                    pos: program.getLocation("sectionPlanePos" + i),
                    dir: program.getLocation("sectionPlaneDir" + i)
                });
            }
            const aPosition = program.getAttribute("position");
            const uClippable = program.getLocation("clippable");
            const uOffset = program.getLocation("offset");
            const uLogDepthBufFC = scene.logarithmicDepthBufferEnabled && program.getLocation("logDepthBufFC");

            let lastMaterialId = null;
            let lastGeometryId = null;

            return {
                destroy: () => program.destroy(),
                drawMesh: (frameCtx, mesh) => {
                    const material = mesh._material;

                    const camera = scene.camera;
                    const gl = scene.canvas.gl;
                    const meshState = mesh._state;
                    const geometry = mesh._geometry;
                    const geometryState = geometry._state;
                    const origin = mesh.origin;
                    const materialState = material._state;

                    if (materialState.alpha < 1.0) {
                        return;
                    }

                    if (frameCtx.lastProgramId !== program.id) {
                        frameCtx.lastProgramId = program.id;
                        const project = camera.project;
                        program.bind();
                        frameCtx.useProgram++;
                        lastMaterialId = null;
                        lastGeometryId = null;
                        if (uLogDepthBufFC ) {
                            const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
                            gl.uniform1f(uLogDepthBufFC, logDepthBufFC);
                        }
                        setLightInputState && setLightInputState();
                    }

                    gl.uniformMatrix4fv(uViewMatrix, false, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix);
                    useNormals && gl.uniformMatrix4fv(uViewNormalMatrix, false, camera.viewNormalMatrix);

                    if (meshState.clippable) {
                        const numAllocatedSectionPlanes = scene._sectionPlanesState.getNumAllocatedSectionPlanes();
                        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
                        if (numAllocatedSectionPlanes > 0) {
                            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
                            const renderFlags = mesh.renderFlags;
                            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                                const sectionPlaneUniforms = uSectionPlanes[sectionPlaneIndex];
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

                    if (materialState.id !== lastMaterialId) {
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
                        setMaterialInputsState && setMaterialInputsState(material);
                        lastMaterialId = materialState.id;
                    }

                    gl.uniformMatrix4fv(uProjMatrix, false, camera._project._state.matrix);
                    gl.uniformMatrix4fv(uModelMatrix, gl.FALSE, mesh.worldMatrix);
                    useNormals && uModelNormalMatrix && gl.uniformMatrix4fv(uModelNormalMatrix, gl.FALSE, mesh.worldNormalMatrix);

                    uClippable && gl.uniform1i(uClippable, meshState.clippable);

                    gl.uniform3fv(uOffset, meshState.offset);

                    setInputsState && setInputsState();

                    if (geometryState.id !== lastGeometryId) {
                        uPositionsDecodeMatrix && gl.uniformMatrix4fv(uPositionsDecodeMatrix, false, geometryState.positionsDecodeMatrix);

                        if (aPosition) {
                            aPosition.bindArrayBuffer(geometryState.positionsBuf);
                            frameCtx.bindArray++;
                        }
                        if (geometryState.indicesBuf) {
                            geometryState.indicesBuf.bind();
                            frameCtx.bindArray++;
                        }
                        lastGeometryId = geometryState.id;
                    }
                    if (geometryState.indicesBuf) {
                        gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
                        frameCtx.drawElements++;
                    } else if (geometryState.positionsBuf) {
                        gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
                    }
                }
            };
        }
    }
};
