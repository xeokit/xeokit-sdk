import {MeshRenderer} from "../MeshRenderer.js";
import {ShadowShaderSource} from "./ShadowShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {math} from "../../math/math.js";
import {getPlaneRTCPos} from "../../math/rtcCoords.js";

const tempVec3a = math.vec3();

export const ShadowRenderer = {
    getHash: (mesh) => [
        mesh._geometry._state.hash,
        mesh._state.hash
    ],
    instantiate: (mesh) => {
        const useNormals = false;

        const scene = mesh.scene;
        const program = new Program(scene.canvas.gl, MeshRenderer(ShadowShaderSource(mesh), mesh));
        if (program.errors) {
            return { errors: program.errors };
        } else {
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
            const uClippable = program.getLocation("clippable");
            const uOffset = program.getLocation("offset");

            let lastMaterialId = null;
            let lastGeometryId = null;

            return {
                destroy: () => program.destroy(),
                drawMesh: (frame, mesh) => {
                    const gl = scene.canvas.gl;
                    const materialState = mesh._material._state;
                    const meshState = mesh._state;
                    const geometryState = mesh._geometry._state;

                    if (frame.lastProgramId !== program.id) {
                        frame.lastProgramId = program.id;
                        const sectionPlanesState = scene._sectionPlanesState;
                        program.bind();
                        frame.useProgram++;
                        gl.uniformMatrix4fv(uViewMatrix, false, frame.shadowViewMatrix);
                        gl.uniformMatrix4fv(uProjMatrix, false, frame.shadowProjMatrix);
                        lastMaterialId = null;
                        lastGeometryId = null;
                    }

                    if (materialState.id !== lastMaterialId) {
                        const backfaces = materialState.backfaces;
                        if (frame.backfaces !== backfaces) {
                            if (backfaces) {
                                gl.disable(gl.CULL_FACE);
                            } else {
                                gl.enable(gl.CULL_FACE);
                            }
                            frame.backfaces = backfaces;
                        }
                        const frontface = materialState.frontface;
                        if (frame.frontface !== frontface) {
                            if (frontface) {
                                gl.frontFace(gl.CCW);
                            } else {
                                gl.frontFace(gl.CW);
                            }
                            frame.frontface = frontface;
                        }
                        if (frame.lineWidth !== materialState.lineWidth) {
                            gl.lineWidth(materialState.lineWidth);
                            frame.lineWidth = materialState.lineWidth;
                        }
                        lastMaterialId = materialState.id;
                    }
                    gl.uniformMatrix4fv(uModelMatrix, gl.FALSE, mesh.worldMatrix);
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
                    uClippable && gl.uniform1i(uClippable, meshState.clippable);

                    gl.uniform3fv(uOffset, mesh._state.offset);
                    if (geometryState.id !== lastGeometryId) {
                        uPositionsDecodeMatrix && gl.uniformMatrix4fv(uPositionsDecodeMatrix, false, geometryState.positionsDecodeMatrix);

                        if (aPosition) {
                            aPosition.bindArrayBuffer(geometryState.positionsBuf);
                            frame.bindArray++;
                        }
                        if (geometryState.indicesBuf) {
                            geometryState.indicesBuf.bind();
                            frame.bindArray++;
                        }
                        lastGeometryId = geometryState.id;
                    }
                    if (geometryState.indicesBuf) {
                        gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
                        frame.drawElements++;
                    } else if (geometryState.positionsBuf) {
                        gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
                        frame.drawArrays++;
                    }
                }
            };
        }
    }
};
