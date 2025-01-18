/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {DrawShaderSource} from "./DrawShaderSource.js";
import {LambertShaderSource} from "./LambertShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {makeInputSetters} from "../../webgl/WebGLRenderer.js";
import {math} from "../../math/math.js";

export const DrawRenderer = {
    getHash: (mesh) => [
        mesh._geometry._state.hash,
        mesh._state.drawHash,
        mesh.scene.gammaOutput ? "go" : "",
        mesh.scene._lightsState.getHash(),
        mesh._material._state.hash
    ],
    instantiate: (mesh) => {
        const scene = mesh.scene;
        const gl = scene.canvas.gl;
        const programSetup = (mesh._material._state.type === "LambertMaterial") ? LambertShaderSource(mesh) : DrawShaderSource(mesh);
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
            const setSectionPlanesInputsState = meshRenderer.setupSectionPlanesInputs(getInputSetter);

            const uModelMatrix = program.getLocation("modelMatrix");
            const uModelNormalMatrix = program.getLocation("modelNormalMatrix");
            const uViewMatrix = program.getLocation("viewMatrix");
            const uViewNormalMatrix = program.getLocation("viewNormalMatrix");
            const uProjMatrix = program.getLocation("projMatrix");

            const uLogDepthBufFC = scene.logarithmicDepthBufferEnabled && program.getLocation("logDepthBufFC");

            const aNormal = program.getAttribute("normal");
            const aUV = program.getAttribute("uv");
            const aColor = program.getAttribute("color");

            const uOffset = program.getLocation("offset");
            const uScale = program.getLocation("scale");

            let lastMaterialId = null;
            let lastGeometryId = null;

            return {
                destroy: () => program.destroy(),
                drawMesh: (frameCtx, mesh) => {
                    const scene = mesh.scene;
                    const material = mesh._material;
                    const gl = scene.canvas.gl;
                    const meshState = mesh._state;
                    const materialState = mesh._material._state;
                    const geometryState = mesh._geometry._state;
                    const camera = scene.camera;
                    const origin = mesh.origin;
                    const background = meshState.background;

                    if (frameCtx.lastProgramId !== program.id) {
                        frameCtx.lastProgramId = program.id;
                        if (background) {
                            gl.depthFunc(gl.LEQUAL);
                        }

                        const gl = scene.canvas.gl;
                        const lightsState = scene._lightsState;
                        const project = scene.camera.project;
                        let light;

                        program.bind();

                        frameCtx.useProgram++;

                        lastMaterialId = null;
                        lastGeometryId = null;

                        gl.uniformMatrix4fv(uProjMatrix, false, project.matrix);

                        if (uLogDepthBufFC) {
                            const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
                            gl.uniform1f(uLogDepthBufFC, logDepthBufFC);
                        }

                        setLightInputState && setLightInputState();
                    }

                    gl.uniformMatrix4fv(uViewMatrix, false, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix);
                    gl.uniformMatrix4fv(uViewNormalMatrix, false, camera.viewNormalMatrix);

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

                        if (frameCtx.lineWidth !== materialState.lineWidth) {
                            gl.lineWidth(materialState.lineWidth);
                            frameCtx.lineWidth = materialState.lineWidth;
                        }

                        setMaterialInputsState && setMaterialInputsState(material);
                        setGeneralMaterialInputsState && setGeneralMaterialInputsState(material);

                        lastMaterialId = materialState.id;
                    }

                    gl.uniformMatrix4fv(uModelMatrix, gl.FALSE, mesh.worldMatrix);
                    uModelNormalMatrix && gl.uniformMatrix4fv(uModelNormalMatrix, gl.FALSE, mesh.worldNormalMatrix);

                    setInputsState && setInputsState(frameCtx, mesh._state);

                    gl.uniform3fv(uOffset, meshState.offset);
                    gl.uniform3fv(uScale, mesh.scale);

                    // Bind VBOs

                    if (geometryState.id !== lastGeometryId) {
                        setGeometryInputsState(geometryState, () => frameCtx.bindArray++);

                        if (aNormal) {
                            aNormal.bindArrayBuffer(geometryState.normalsBuf);
                            frameCtx.bindArray++;
                        }
                        if (aUV) {
                            aUV.bindArrayBuffer(geometryState.uvBuf);
                            frameCtx.bindArray++;
                        }
                        if (aColor) {
                            aColor.bindArrayBuffer(geometryState.colorsBuf);
                            frameCtx.bindArray++;
                        }
                        if (geometryState.indicesBuf) {
                            geometryState.indicesBuf.bind();
                            frameCtx.bindArray++;
                        }
                        lastGeometryId = geometryState.id;
                    }

                    // Draw (indices bound in prev step)

                    if (geometryState.indicesBuf) {
                        gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
                        frameCtx.drawElements++;
                    } else if (geometryState.positionsBuf) {
                        gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
                        frameCtx.drawArrays++;
                    }

                    if (background) {
                        gl.depthFunc(gl.LESS);
                    }
                }
            };
        }
    }
};
