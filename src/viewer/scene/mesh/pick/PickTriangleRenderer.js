/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {PickTriangleShaderSource} from "./PickTriangleShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";

export const PickTriangleRenderer = {
    getHash: (mesh) => [
        mesh._geometry._state.compressGeometry ? "cp" : "",
        mesh._state.hash
    ],
    instantiate: (mesh) => {
        const scene = mesh.scene;
        const gl = scene.canvas.gl;
        const programSetup = PickTriangleShaderSource(mesh);
        const meshRenderer = MeshRenderer(programSetup, mesh);
        const program = new Program(gl, { vertex: meshRenderer.vertex, fragment: meshRenderer.fragment });
        if (program.errors) {
            return { errors: program.errors };
        } else {
            const getInputSetter = makeInputSetters(gl, program.handle, true);
            const setInputsState = programSetup.setupInputs && programSetup.setupInputs(getInputSetter);
            const setGeometryInputsState = meshRenderer.setupGeometryInputs(getInputSetter);
            const setMeshInputsState = meshRenderer.setupMeshInputs(getInputSetter);
            const setSectionPlanesInputsState = meshRenderer.setupSectionPlanesInputs(getInputSetter);

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

                    program.bind();

                    frameCtx.useProgram++;

                    setSectionPlanesInputsState && setSectionPlanesInputsState(mesh.origin, mesh.renderFlags, meshState.clippable, scene._sectionPlanesState);

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

                    setMeshInputsState(mesh, origin ? frameCtx.getRTCPickViewMatrix(meshState.originHash, origin) : frameCtx.pickViewMatrix, scene.camera.viewNormalMatrix, frameCtx.pickProjMatrix, project.far);

                    const positionsBuf = geometry._getPickTrianglePositions();
                    setGeometryInputsState(geometryState, () => frameCtx.bindArray++, { positionsBuf: positionsBuf, pickColorsBuf: geometry._getPickTriangleColors() });

                    setInputsState && setInputsState(frameCtx, mesh._state);

                    gl.drawArrays(geometryState.primitive, 0, positionsBuf.numItems / 3);
                }
            };
        }
    }
};
