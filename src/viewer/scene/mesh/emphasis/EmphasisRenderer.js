/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {EmphasisEdgesShaderSource} from "./EmphasisEdgesShaderSource.js";
import {EmphasisFillShaderSource} from "./EmphasisFillShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";

export const EmphasisRenderer = {
    getHash: (mesh, isFill) => [
        mesh._state.hash,
        mesh.scene.gammaOutput ? "go" : "", // Gamma input not needed
        isFill && mesh.scene._lightsState.getHash(),
        (isFill && mesh._geometry._state.normalsBuf) ? "n" : "",
        mesh._geometry._state.compressGeometry ? "cp" : ""
    ],
    instantiate: (mesh, isFill) => {
        const scene = mesh.scene;
        const gl = scene.canvas.gl;
        const programSetup = isFill ? EmphasisFillShaderSource(mesh) : EmphasisEdgesShaderSource(mesh);
        const meshRenderer = MeshRenderer(programSetup, mesh);
        const program = new Program(gl, { vertex: meshRenderer.vertex, fragment: meshRenderer.fragment });
        if (program.errors) {
            return { errors: program.errors };
        } else {
            const useNormals = isFill;

            const getInputSetter = makeInputSetters(gl, program.handle, true);
            const setInputsState = programSetup.setupInputs && programSetup.setupInputs(getInputSetter);
            const setMaterialInputsState = programSetup.setupMaterialInputs && programSetup.setupMaterialInputs(getInputSetter);
            const setLightInputState = programSetup.setupLightInputs && programSetup.setupLightInputs(getInputSetter);
            const setGeometryInputsState = meshRenderer.setupGeometryInputs(getInputSetter);
            const setMeshInputsState = meshRenderer.setupMeshInputs(getInputSetter);
            const setSectionPlanesInputsState = meshRenderer.setupSectionPlanesInputs(getInputSetter);

            const uModelNormalMatrix = useNormals && program.getLocation("modelNormalMatrix");
            const uViewNormalMatrix = useNormals && program.getLocation("viewNormalMatrix");

            let lastMaterialId = null;
            let lastGeometryId = null;

            return {
                destroy: () => program.destroy(),
                drawMesh: (frameCtx, mesh, mode) => {
                    const material = (mode === 0) ? mesh._xrayMaterial : ((mode === 1) ? mesh._highlightMaterial : ((mode === 2) ? mesh._selectedMaterial : mesh._edgeMaterial));

                    const camera = scene.camera;
                    const gl = scene.canvas.gl;
                    const meshState = mesh._state;
                    const geometry = mesh._geometry;
                    const geometryState = geometry._state;
                    const origin = mesh.origin;
                    const materialState = material._state;
                    const project = camera.project;

                    if (frameCtx.lastProgramId !== program.id) {
                        frameCtx.lastProgramId = program.id;
                        program.bind();
                        frameCtx.useProgram++;
                        lastMaterialId = null;
                        lastGeometryId = null;
                        setLightInputState && setLightInputState();
                    }

                    useNormals && gl.uniformMatrix4fv(uViewNormalMatrix, false, camera.viewNormalMatrix);

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
                        if ((! isFill) && (frameCtx.lineWidth !== materialState.edgeWidth)) {
                            gl.lineWidth(materialState.edgeWidth);
                            frameCtx.lineWidth = materialState.edgeWidth;
                        }
                        setMaterialInputsState && setMaterialInputsState(material);
                        lastMaterialId = materialState.id;
                    }

                    setMeshInputsState(mesh, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix, project.matrix, project.far);

                    useNormals && uModelNormalMatrix && gl.uniformMatrix4fv(uModelNormalMatrix, gl.FALSE, mesh.worldNormalMatrix);

                    setInputsState && setInputsState();

                    // Bind VBOs
                    if (isFill) {
                        if (geometryState.id !== lastGeometryId) {
                            setGeometryInputsState(geometryState, () => frameCtx.bindArray++);

                            if (geometryState.indicesBuf) {
                                geometryState.indicesBuf.bind();
                                frameCtx.bindArray++;
                                // gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
                                // frameCtx.drawElements++;
                            } else if (geometryState.positionsBuf) {
                                // gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
                                //  frameCtx.drawArrays++;
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
                    } else {
                        let indicesBuf;
                        if (geometryState.primitive === gl.TRIANGLES) {
                            indicesBuf = geometry._getEdgeIndices();
                        } else if (geometryState.primitive === gl.LINES) {
                            indicesBuf = geometryState.indicesBuf;
                        }

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
                    }
                }
            };
        }
    }
};
