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

export const PickTriangleRenderer = {
    getHash: (mesh) => [
        mesh._geometry._state.compressGeometry ? "cp" : "",
        mesh._state.hash
    ],
    instantiate: (mesh) => {
        const scene = mesh.scene;
        const gl = scene.canvas.gl;
        const programSetup = PickTriangleShaderSource(mesh);
        const program = new Program(gl, MeshRenderer(programSetup, mesh));
        if (program.errors) {
            return { errors: program.errors };
        } else {
            const scene = mesh.scene;
            const getInputSetter = makeInputSetters(gl, program.handle, true);
            const setInputsState = programSetup.setupInputs && programSetup.setupInputs(getInputSetter);

            const uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
            const uModelMatrix = program.getLocation("modelMatrix");
            const uViewMatrix = program.getLocation("viewMatrix");
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
            const pickColor = program.getAttribute("pickColor");
            const uClippable = program.getLocation("clippable");
            const uOffset = program.getLocation("offset");
            const uLogDepthBufFC = scene.logarithmicDepthBufferEnabled && program.getLocation("logDepthBufFC");

            return {
                destroy: () => program.destroy(),
                drawMesh: (frameCtx, mesh) => {
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

                    program.bind();

                    frameCtx.useProgram++;

                    if (uLogDepthBufFC ) {
                        const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
                        gl.uniform1f(uLogDepthBufFC, logDepthBufFC);
                    }

                    gl.uniformMatrix4fv(uViewMatrix, false, origin ? frameCtx.getRTCPickViewMatrix(meshState.originHash, origin) : frameCtx.pickViewMatrix);

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

                    gl.uniformMatrix4fv(uProjMatrix, false, frameCtx.pickProjMatrix);

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

                    gl.uniformMatrix4fv(uModelMatrix, false, mesh.worldMatrix);
                    uClippable && gl.uniform1i(uClippable, mesh._state.clippable);

                    gl.uniform3fv(uOffset, mesh._state.offset);
                    if (uPositionsDecodeMatrix) {
                        gl.uniformMatrix4fv(uPositionsDecodeMatrix, false, geometryState.positionsDecodeMatrix);
                    }
                    aPosition.bindArrayBuffer(positionsBuf);

                    setInputsState && setInputsState(frameCtx, mesh._state);

                    pickColorsBuf.bind();
                    gl.enableVertexAttribArray(pickColor.location);
                    gl.vertexAttribPointer(pickColor.location, pickColorsBuf.itemSize, pickColorsBuf.itemType, true, 0, 0); // Normalize
                    gl.drawArrays(geometryState.primitive, 0, positionsBuf.numItems / 3);
                }
            };
        }
    }
};
