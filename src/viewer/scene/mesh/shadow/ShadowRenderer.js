import {MeshRenderer} from "../MeshRenderer.js";
import {ShadowShaderSource} from "./ShadowShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";

export const ShadowRenderer = {
    getHash: (mesh) => [
        mesh._geometry._state.hash,
        mesh._state.hash
    ],
    instantiate: (mesh) => {
        const scene = mesh.scene;
        const gl = scene.canvas.gl;
        const meshRenderer = MeshRenderer(ShadowShaderSource(mesh), mesh);
        const program = new Program(gl, { vertex: meshRenderer.vertex, fragment: meshRenderer.fragment });
        if (program.errors) {
            return { errors: program.errors };
        } else {
            const getInputSetter = makeInputSetters(gl, program.handle, true);
            const setGeometryInputsState = meshRenderer.setupGeometryInputs(getInputSetter);
            const setMeshInputsState = meshRenderer.setupMeshInputs(getInputSetter);
            const setSectionPlanesInputsState = meshRenderer.setupSectionPlanesInputs(getInputSetter);

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

                    setMeshInputsState(mesh, frame.shadowViewMatrix, frame.shadowProjMatrix, scene.camera.project.far);

                    setSectionPlanesInputsState && setSectionPlanesInputsState(mesh.origin, mesh.renderFlags, meshState.clippable, scene._sectionPlanesState);

                    if (geometryState.id !== lastGeometryId) {
                        setGeometryInputsState(geometryState, () => frame.bindArray++);

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
