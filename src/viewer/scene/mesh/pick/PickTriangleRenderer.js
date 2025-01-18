/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {PickTriangleShaderSource} from "./PickTriangleShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";
import {math} from "../../math/math.js";

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
            const setSectionPlanesInputsState = meshRenderer.setupSectionPlanesInputs(getInputSetter);

            const uModelMatrix = program.getLocation("modelMatrix");
            const uViewMatrix = program.getLocation("viewMatrix");
            const uProjMatrix = program.getLocation("projMatrix");

            const pickColor = program.getAttribute("pickColor");

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

                    setSectionPlanesInputsState && setSectionPlanesInputsState(mesh.origin, mesh.renderFlags, meshState.clippable, scene._sectionPlanesState);

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

                    gl.uniform3fv(uOffset, mesh._state.offset);

                    setGeometryInputsState(geometryState, () => frameCtx.bindArray++, { positionsBuf: positionsBuf });

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
