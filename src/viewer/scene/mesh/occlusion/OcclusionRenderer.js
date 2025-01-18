/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {OcclusionShaderSource} from "./OcclusionShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";

export const OcclusionRenderer = {
    getHash: (mesh) => [
        mesh._geometry._state.hash,
        mesh._state.pickOcclusionHash
    ],
    instantiate: (mesh) => { // There is exactly one OcclusionRenderer per scene
        const scene = mesh.scene;
        const gl = scene.canvas.gl;
        const programSetup = OcclusionShaderSource();
        const meshRenderer = MeshRenderer(programSetup, mesh);
        const program = new Program(gl, { vertex: meshRenderer.vertex, fragment: meshRenderer.fragment });
        if (program.errors) {
            return { errors: program.errors };
        } else {
            const getInputSetter = makeInputSetters(gl, program.handle, true);
            const setInputsState = programSetup.setupInputs && programSetup.setupInputs(getInputSetter);
            const setMaterialInputsState = programSetup.setupMaterialInputs && programSetup.setupMaterialInputs(getInputSetter);
            const setLightInputState = programSetup.setupLightInputs && programSetup.setupLightInputs(getInputSetter);
            const setGeometryInputsState = meshRenderer.setupGeometryInputs(getInputSetter);
            const setMeshInputsState = meshRenderer.setupMeshInputs(getInputSetter);
            const setSectionPlanesInputsState = meshRenderer.setupSectionPlanesInputs(getInputSetter);

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
                    const project = camera.project;

                    if (materialState.alpha < 1.0) {
                        return;
                    }

                    if (frameCtx.lastProgramId !== program.id) {
                        frameCtx.lastProgramId = program.id;
                        program.bind();
                        frameCtx.useProgram++;
                        lastMaterialId = null;
                        lastGeometryId = null;
                        setLightInputState && setLightInputState();
                    }

                    setSectionPlanesInputsState && setSectionPlanesInputsState(mesh.origin, mesh.renderFlags, meshState.clippable, scene._sectionPlanesState);

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

                    setMeshInputsState(mesh, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix, camera.viewNormalMatrix, project.matrix, project.far);

                    setInputsState && setInputsState();

                    if (geometryState.id !== lastGeometryId) {
                        setGeometryInputsState(geometryState, () => frameCtx.bindArray++);

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
