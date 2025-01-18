/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";

export const PickMeshRenderer = {
    instantiate: (programSetup, mesh) => {
        const scene = mesh.scene;
        const gl = scene.canvas.gl;
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
            const setGeneralMaterialInputsState = meshRenderer.setupGeneralMaterialInputs && meshRenderer.setupGeneralMaterialInputs(getInputSetter);
            const setMeshInputsState = meshRenderer.setupMeshInputs(getInputSetter);
            const setSectionPlanesInputsState = meshRenderer.setupSectionPlanesInputs(getInputSetter);

            let lastMaterialId = null;
            let lastGeometryId = null;

            return {
                destroy: () => program.destroy(),
                drawMesh: (frameCtx, mesh, material) => {
                    const materialState = material._state;
                    const meshState = mesh._state;
                    const geometry = mesh._geometry;
                    const geometryState = geometry._state;
                    const origin = mesh.origin;
                    const camera = scene.camera;
                    const project = camera.project;
                    const actsAsBackground = programSetup.canActAsBackground && meshState.background;

                    if (programSetup.skipIfTransparent && (materialState.alpha < 1.0)) {
                        return;
                    }

                    if (frameCtx.lastProgramId !== program.id) {
                        frameCtx.lastProgramId = program.id;
                        program.bind();
                        frameCtx.useProgram++;
                        lastMaterialId = null;
                        lastGeometryId = null;
                        setLightInputState && setLightInputState();
                        if (actsAsBackground) {
                            gl.depthFunc(gl.LEQUAL);
                        }
                    }

                    setSectionPlanesInputsState && setSectionPlanesInputsState(mesh.origin, mesh.renderFlags, meshState.clippable, scene._sectionPlanesState);

                    if (materialState.id !== lastMaterialId) {
                        if (frameCtx.backfaces !== materialState.backfaces) {
                            if (materialState.backfaces) {
                                gl.disable(gl.CULL_FACE);
                            } else {
                                gl.enable(gl.CULL_FACE);
                            }
                            frameCtx.backfaces = materialState.backfaces;
                        }

                        if (programSetup.setsFrontFace && (frameCtx.frontface !== materialState.frontface)) {
                            gl.frontFace(materialState.frontface ? gl.CCW : gl.CW);
                            frameCtx.frontface = materialState.frontface;
                        }

                        if (programSetup.setsEdgeWidth && (frameCtx.lineWidth !== materialState.edgeWidth)) {
                            gl.lineWidth(materialState.edgeWidth);
                            frameCtx.lineWidth = materialState.edgeWidth;
                        }

                        if (programSetup.setsLineWidth && (frameCtx.lineWidth !== materialState.lineWidth)) {
                            gl.lineWidth(materialState.lineWidth);
                            frameCtx.lineWidth = materialState.lineWidth;
                        }

                        setMaterialInputsState && setMaterialInputsState(material);
                        setGeneralMaterialInputsState && setGeneralMaterialInputsState(material);

                        lastMaterialId = materialState.id;
                    }

                    setInputsState && setInputsState(frameCtx, meshState);

                    if (programSetup.usePickView) {
                        setMeshInputsState(mesh, origin ? frameCtx.getRTCPickViewMatrix(meshState.originHash, origin) : frameCtx.pickViewMatrix, camera.viewNormalMatrix, frameCtx.pickProjMatrix, project.far);
                    } else if (programSetup.useShadowView) {
                        setMeshInputsState(mesh, frameCtx.shadowViewMatrix, camera.viewNormalMatrix, frameCtx.shadowProjMatrix, camera.project.far);
                    } else {
                        setMeshInputsState(mesh, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix, camera.viewNormalMatrix, project.matrix, project.far);
                    }

                    if (programSetup.trianglePick) {
                        const positionsBuf = geometry._getPickTrianglePositions();
                        if (geometryState.id !== lastGeometryId) {
                            setGeometryInputsState(geometryState, () => frameCtx.bindArray++, { positionsBuf: positionsBuf, pickColorsBuf: geometry._getPickTriangleColors() });
                            lastGeometryId = geometryState.id;
                        }

                        gl.drawArrays(geometryState.primitive, 0, positionsBuf.numItems / 3);
                    } else if (programSetup.setsEdgeWidth) {
                        const indicesBuf = ((geometryState.primitive === gl.TRIANGLES)
                                            ? geometry._getEdgeIndices()
                                            : ((geometryState.primitive === gl.LINES) && geometryState.indicesBuf));

                        if (indicesBuf) {
                            if (geometryState.id !== lastGeometryId) {
                                setGeometryInputsState(geometryState, () => frameCtx.bindArray++);

                                indicesBuf.bind();
                                frameCtx.bindArray++;
                                lastGeometryId = geometryState.id;
                            }

                            gl.drawElements(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0);

                            frameCtx.drawElements++;
                        }
                    } else {
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
                            frameCtx.drawArrays++;
                        }
                    }

                    if (actsAsBackground) {
                        gl.depthFunc(gl.LESS);
                    }
                }
            };
        }
    }
};
