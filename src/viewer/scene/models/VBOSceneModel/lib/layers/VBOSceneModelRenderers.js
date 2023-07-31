import {getPlaneRTCPos} from "../../../../math/rtcCoords.js";
import {math} from "../../../../math/math.js";
import {Program} from "../../../../webgl/Program.js";
import {stats} from "../../../../stats.js"
import {WEBGL_INFO} from "../../../../webglInfo.js";
import {RENDER_PASSES} from "../RENDER_PASSES.js";

const defaultColor = new Float32Array([1, 1, 1, 1]);
const edgesDefaultColor = new Float32Array([0, 0, 0, 1]);

const tempVec4 = math.vec4();
const tempVec3a = math.vec3();

class VBOSceneModelRenderer {
    constructor(scene, withSAO = false, { instancing = false, edges = false } = {}) {
        this._scene = scene;
        this._withSAO = withSAO;
        this._instancing = instancing;
        this._edges = edges;
        this._hash = this._getHash();
        this._allocate();
    }

    /**
     * Must be overrided by subclasses.
     * @returns { string }
     */
    _getHash() {
        return "";
    }

    _buildShader() {
        return {
            vertex: this._buildVertexShader(),
            fragment: this._buildFragmentShader()
        };
    }

    getValid() {
        return this._hash === this._getHash();
    }

    setSectionPlanesStateUniforms(layer) {
        const scene = this._scene;
        const { gl } =   scene.canvas;
        const { model, layerIndex } = layer;

        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    const active = renderFlags.sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                    gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                    if (active) {
                        const sectionPlane = sectionPlanes[sectionPlaneIndex];
                        const origin = layer._state.origin;
                        if (origin) {
                            const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3a);
                            gl.uniform3fv(sectionPlaneUniforms.pos, rtcSectionPlanePos);
                        } else {
                            gl.uniform3fv(sectionPlaneUniforms.pos, sectionPlane.pos);
                        }
                        gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                    }
                }
            }
        }
    }

    _allocate() {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const lightsState = scene._lightsState;

        this._program = new Program(gl, this._buildShader());

        if (this._program.errors) {
            this.errors = this._program.errors;
            return;
        }

        const program = this._program;

        this._uRenderPass = program.getLocation("renderPass");

        this._uColor = program.getLocation("color");
        if (!this._uColor) {
            // some shader may have color as attribute, in this case the uniform must be renamed silhouetteColor
            this._uColor = program.getLocation("silhouetteColor");
        }
        this._uUVDecodeMatrix = program.getLocation("uvDecodeMatrix");
        this._uPickInvisible = program.getLocation("pickInvisible");
        this._uGammaFactor = program.getLocation("gammaFactor");

        gl.uniformBlockBinding(
            program.handle,
            gl.getUniformBlockIndex(program.handle, "Matrices"),
            0 // layer.matricesUniformBlockBufferBindingPoint
        );

        this._uShadowViewMatrix = program.getLocation("shadowViewMatrix");
        this._uShadowProjMatrix = program.getLocation("shadowProjMatrix");
        if (scene.logarithmicDepthBufferEnabled) {
            this._uZFar = program.getLocation("zFar");
        }

        this._uLightAmbient = program.getLocation("lightAmbient");
        this._uLightColor = [];
        this._uLightDir = [];
        this._uLightPos = [];
        this._uLightAttenuation = [];

        // TODO add a gard to prevent light params if not affected by light ?
        const lights = lightsState.lights;
        let light;

        for (let i = 0, len = lights.length; i < len; i++) {
            light = lights[i];
            switch (light.type) {
                case "dir":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = null;
                    this._uLightDir[i] = program.getLocation("lightDir" + i);
                    break;
                case "point":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = program.getLocation("lightPos" + i);
                    this._uLightDir[i] = null;
                    this._uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
                case "spot":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = program.getLocation("lightPos" + i);
                    this._uLightDir[i] = program.getLocation("lightDir" + i);
                    this._uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
            }
        }

        if (lightsState.reflectionMaps.length > 0) {
            this._uReflectionMap = "reflectionMap";
        }

        if (lightsState.lightMaps.length > 0) {
            this._uLightMap = "lightMap";
        }

        this._uSectionPlanes = [];

        for (let i = 0, len = scene._sectionPlanesState.sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        this._aPosition = program.getAttribute("position");
        this._aOffset = program.getAttribute("offset");
        this._aNormal = program.getAttribute("normal");
        this._aUV = program.getAttribute("uv");
        this._aColor = program.getAttribute("color");
        this._aMetallicRoughness = program.getAttribute("metallicRoughness");
        this._aFlags = program.getAttribute("flags");
        this._aPickColor = program.getAttribute("pickColor");
        this._uPickZNear = program.getLocation("pickZNear");
        this._uPickZFar = program.getLocation("pickZFar");

        this._uColorMap = "uColorMap";
        this._uMetallicRoughMap = "uMetallicRoughMap";
        this._uEmissiveMap = "uEmissiveMap";
        this._uNormalMap = "uNormalMap";
        this._uAOMap = "uAOMap";

        if (this._instancing) {
            this._aModelMatrixCol0 = program.getAttribute("modelMatrixCol0");
            this._aModelMatrixCol1 = program.getAttribute("modelMatrixCol1");
            this._aModelMatrixCol2 = program.getAttribute("modelMatrixCol2");
    
            this._aModelNormalMatrixCol0 = program.getAttribute("modelNormalMatrixCol0");
            this._aModelNormalMatrixCol1 = program.getAttribute("modelNormalMatrixCol1");
            this._aModelNormalMatrixCol2 = program.getAttribute("modelNormalMatrixCol2");
        }

        if (this._withSAO) {
            this._uOcclusionTexture = "uOcclusionTexture";
            this._uSAOParams = program.getLocation("uSAOParams");
        }

        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }

        if (scene.pointsMaterial._state.filterIntensity) {
            this._uIntensityRange = program.getLocation("intensityRange");
        }

        this._uPointSize = program.getLocation("pointSize");
        this._uNearPlaneHeight = program.getLocation("nearPlaneHeight");
    }

    drawLayer(frameCtx, layer, renderPass, { colorUniform = false, incrementDrawState = false } = {}) {
        const maxTextureUnits = WEBGL_INFO.MAX_TEXTURE_IMAGE_UNITS;

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const state = layer._state;
        const { textureSet, geometry } = state;
        const lightsState = scene._lightsState;
        const pointsMaterial = scene.pointsMaterial;

        if (!this._program) {
            this._allocate();
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram(frameCtx);
        }

        gl.uniform1i(this._uRenderPass, renderPass);

        this.setSectionPlanesStateUniforms(layer);

        if (scene.logarithmicDepthBufferEnabled) {
            if (this._uLogDepthBufFC ) {
                const logDepthBufFC = 2.0 / (Math.log(frameCtx.pickZFar + 1.0) / Math.LN2); // TODO: Far from pick project matrix?
                gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
            }
            if (this._uZFar) {
                gl.uniform1f(this._uZFar, scene.camera.project.far)
            }
        }

        if (this._uPickInvisible) {
            gl.uniform1i(this._uPickInvisible, frameCtx.pickInvisible);
        }

        if (this._uPickZNear) {
            gl.uniform1f(this._uPickZNear, frameCtx.pickZNear);
        }

        if (this._uPickZFar) {
            gl.uniform1f(this._uPickZFar, frameCtx.pickZFar);
        }

        if (this._uPositionsDecodeMatrix) {
            gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, layer._state.positionsDecodeMatrix);
        }

        if (this._uUVDecodeMatrix) {
            gl.uniformMatrix3fv(this._uUVDecodeMatrix, false, this._instancing ? geometry.uvDecodeMatrix : state.uvDecodeMatrix);
        }

        if (this._uIntensityRange && pointsMaterial.filterIntensity) {
            gl.uniform2f(this._uIntensityRange, pointsMaterial.minIntensity, pointsMaterial.maxIntensity);
        }

        if (this._uPointSize) {
            gl.uniform1f(this._uPointSize, pointsMaterial.pointSize);
        }

        if (this._uNearPlaneHeight) {
            const nearPlaneHeight = (scene.camera.projection === "ortho") ? 1.0 : (gl.drawingBufferHeight / (2 * Math.tan(0.5 * scene.camera.perspective.fov * Math.PI / 180.0)));
            gl.uniform1f(this._uNearPlaneHeight, nearPlaneHeight);
        }

        if (this._instancing) {
            this._aModelMatrixCol0.bindArrayBuffer(state.modelMatrixCol0Buf);
            this._aModelMatrixCol1.bindArrayBuffer(state.modelMatrixCol1Buf);
            this._aModelMatrixCol2.bindArrayBuffer(state.modelMatrixCol2Buf);
    
            gl.vertexAttribDivisor(this._aModelMatrixCol0.location, 1);
            gl.vertexAttribDivisor(this._aModelMatrixCol1.location, 1);
            gl.vertexAttribDivisor(this._aModelMatrixCol2.location, 1);
    
            if (this._aModelNormalMatrixCol0) {
                this._aModelNormalMatrixCol0.bindArrayBuffer(state.modelNormalMatrixCol0Buf);
                gl.vertexAttribDivisor(this._aModelNormalMatrixCol0.location, 1);
            }
            if (this._aModelNormalMatrixCol1) {
                this._aModelNormalMatrixCol1.bindArrayBuffer(state.modelNormalMatrixCol1Buf);
                gl.vertexAttribDivisor(this._aModelNormalMatrixCol1.location, 1);
            }
            if (this._aModelNormalMatrixCol2) {
                this._aModelNormalMatrixCol2.bindArrayBuffer(state.modelNormalMatrixCol2Buf);
                gl.vertexAttribDivisor(this._aModelNormalMatrixCol2.location, 1);
            }
    
        }

        this._aPosition.bindArrayBuffer(this._instancing ? geometry.positionsBuf : state.positionsBuf);

        if (this._aUV) {
            this._aUV.bindArrayBuffer(this._instancing ? geometry.uvBuf : state.uvBuf);
        }

        if (this._aNormal) {
            this._aNormal.bindArrayBuffer(this._instancing ? geometry.normalsBuf : state.normalsBuf);
        }

        if (this._aMetallicRoughness) {
            this._aMetallicRoughness.bindArrayBuffer(state.metallicRoughnessBuf);
            if (this._instancing) {
                gl.vertexAttribDivisor(this._aMetallicRoughness.location, 1);
            }
        }

        if (this._aColor) {
            this._aColor.bindArrayBuffer(state.colorsBuf ? state.colorsBuf : geometry.colorsBuf);
            if (this._instancing && geometry && !geometry.colorsBuf) {
                gl.vertexAttribDivisor(this._aColor.location, 1);
            }
        }

        if (this._aFlags) {
            this._aFlags.bindArrayBuffer(state.flagsBuf);
            if (this._instancing) {
                gl.vertexAttribDivisor(this._aFlags.location, 1);
            }
        }

        if (this._aOffset) {
            this._aOffset.bindArrayBuffer(state.offsetsBuf);
            if (this._instancing) {
                gl.vertexAttribDivisor(this._aOffset.location, 1);
            }
        }

        if (this._aPickColor) {
            this._aPickColor.bindArrayBuffer(state.pickColorsBuf);
            if (this._instancing) {
                gl.vertexAttribDivisor(this._aPickColor.location, 1);
            }
        }

        if (textureSet) {
            const {
                colorTexture,
                metallicRoughnessTexture,
                emissiveTexture,
                normalsTexture,
                occlusionTexture,
            } = textureSet;

            if (this._uColorMap && colorTexture) {
                this._program.bindTexture(this._uColorMap, colorTexture.texture, frameCtx.textureUnit);
                frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
            }
            if (this._uMetallicRoughMap && metallicRoughnessTexture) {
                this._program.bindTexture(this._uMetallicRoughMap, metallicRoughnessTexture.texture, frameCtx.textureUnit);
                frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
            }
            if (this._uEmissiveMap && emissiveTexture) {
                this._program.bindTexture(this._uEmissiveMap, emissiveTexture.texture, frameCtx.textureUnit);
                frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
            }
            if (this._uNormalMap && normalsTexture) {
                this._program.bindTexture(this._uNormalMap, normalsTexture.texture, frameCtx.textureUnit);
                frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
            }
            if (this._uAOMap && occlusionTexture) {
                this._program.bindTexture(this._uAOMap, occlusionTexture.texture, frameCtx.textureUnit);
                frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
            }

        }

        if (lightsState.reflectionMaps.length > 0 && lightsState.reflectionMaps[0].texture && this._uReflectionMap) {
            this._program.bindTexture(this._uReflectionMap, lightsState.reflectionMaps[0].texture, frameCtx.textureUnit);
            frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
            frameCtx.bindTexture++;
        }

        if (lightsState.lightMaps.length > 0 && lightsState.lightMaps[0].texture && this._uLightMap) {
            this._program.bindTexture(this._uLightMap, lightsState.lightMaps[0].texture, frameCtx.textureUnit);
            frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
            frameCtx.bindTexture++;
        }

        if (this._withSAO) {
            const sao = scene.sao;
            const saoEnabled = sao.possible;
            if (saoEnabled) {
                const viewportWidth = gl.drawingBufferWidth;
                const viewportHeight = gl.drawingBufferHeight;
                tempVec4[0] = viewportWidth;
                tempVec4[1] = viewportHeight;
                tempVec4[2] = sao.blendCutoff;
                tempVec4[3] = sao.blendFactor;
                gl.uniform4fv(this._uSAOParams, tempVec4);
                this._program.bindTexture(this._uOcclusionTexture, frameCtx.occlusionTexture, frameCtx.textureUnit);
                frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                frameCtx.bindTexture++;
            }
        }

        if (colorUniform) {
            const colorKey = this._edges ? "edgeColor" : "fillColor";
            const alphaKey = this._edges ? "edgeAlpha" : "fillAlpha";

            if (renderPass === RENDER_PASSES[`${this._edges ? "EDGES" : "SILHOUETTE"}_XRAYED`]) {
                const material = scene.xrayMaterial._state;
                const color = material[colorKey];
                const alpha = material[alphaKey];
                gl.uniform4f(this._uColor, color[0], color[1], color[2], alpha);
    
            } else if (renderPass === RENDER_PASSES[`${this._edges ? "EDGES" : "SILHOUETTE"}_HIGHLIGHTED`]) {
                const material = scene.highlightMaterial._state;
                const color = material[colorKey];
                const alpha = material[alphaKey];
                gl.uniform4f(this._uColor, color[0], color[1], color[2], alpha);
    
            } else if (renderPass === RENDER_PASSES[`${this._edges ? "EDGES" : "SILHOUETTE"}_SELECTED`]) {
                const material = scene.selectedMaterial._state;
                const color = material[colorKey];
                const alpha = material[alphaKey];
                gl.uniform4f(this._uColor, color[0], color[1], color[2], alpha);
    
            } else {
                gl.uniform4fv(this._uColor, this._edges ? edgesDefaultColor : defaultColor);
            }
        }

        if (this._instancing) {
            if (this._edges) {
                geometry.edgeIndicesBuf.bind();
            } else {
                if (geometry.indicesBuf) {
                    geometry.indicesBuf.bind();
                }
            }
        } else {
            if (this._edges) {
                state.edgeIndicesBuf.bind();
            } else {
                if (state.indicesBuf) {
                    state.indicesBuf.bind();
                }
            }
        }

        this._draw({ geometry, state, frameCtx, incrementDrawState });

        if (this._instancing) {
            gl.vertexAttribDivisor(this._aModelMatrixCol0.location, 0);
            gl.vertexAttribDivisor(this._aModelMatrixCol1.location, 0);
            gl.vertexAttribDivisor(this._aModelMatrixCol2.location, 0);
            
            gl.vertexAttribDivisor(this._aFlags.location, 0);

            if (this._aModelNormalMatrixCol0) {
                gl.vertexAttribDivisor(this._aModelNormalMatrixCol0.location, 0);
            }
            if (this._aModelNormalMatrixCol1) {
                gl.vertexAttribDivisor(this._aModelNormalMatrixCol1.location, 0);
            }
            if (this._aModelNormalMatrixCol2) {
                gl.vertexAttribDivisor(this._aModelNormalMatrixCol2.location, 0);
            }
            if (this._aColor) {
                gl.vertexAttribDivisor(this._aColor.location, 0);
            }
            if  (this._aPickColor) {
                gl.vertexAttribDivisor(this._aPickColor.location, 0);
            }
            if (this._aOffset) {
                gl.vertexAttribDivisor(this._aOffset.location, 0);
            }
        }
    }

    webglContextRestored() {
        this._program = null;
    }

    destroy() {
        if (this._program) {
            this._program.destroy();
        }
        this._program = null;
        stats.memory.programs--;
    }
}

class VBOSceneModelTriangleBatchingRenderer extends VBOSceneModelRenderer {
    constructor(scene, withSAO, { instancing = false, edges = false } = {}) {
        super(scene, withSAO, { instancing, edges });
    }

    _draw(drawCfg) {
        const { gl } = this._scene.canvas;

        const {
            state,
            frameCtx,
            incrementDrawState
        } = drawCfg;

        if (this._edges) {
            gl.drawElements(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0);
        } else {
            const count = frameCtx.pickElementsCount || state.indicesBuf.numItems;
            const offset = frameCtx.pickElementsOffset ? frameCtx.pickElementsOffset * state.indicesBuf.itemByteSize : 0;

            gl.drawElements(gl.TRIANGLES, count, state.indicesBuf.itemType, offset);

            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        }
    }
}

class VBOSceneModelTriangleBatchingEdgesRenderer extends VBOSceneModelTriangleBatchingRenderer {
    constructor(scene, withSAO) {
        super(scene, withSAO, { instancing: false, edges: true });
    }
}


class VBOSceneModelTriangleInstancingRenderer extends VBOSceneModelRenderer {
    constructor(scene, withSAO, { edges = false } = {}) {
        super(scene, withSAO, { instancing: true, edges });
    }

    _draw(drawCfg) {
        const { gl } = this._scene.canvas;

        const {
            state,
            frameCtx,
            geometry,
            incrementDrawState,
        } = drawCfg;

        if (this._edges) {
            gl.drawElementsInstanced(gl.LINES, geometry.edgeIndicesBuf.numItems, geometry.edgeIndicesBuf.itemType, 0, state.numInstances);
        } else {
            gl.drawElementsInstanced(gl.TRIANGLES, geometry.indicesBuf.numItems, geometry.indicesBuf.itemType, 0, state.numInstances);
            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        }
    }
}

class VBOSceneModelTriangleInstancingEdgesRenderer extends VBOSceneModelTriangleInstancingRenderer {
    constructor(scene, withSAO) {
        super(scene, withSAO, { instancing: true, edges: true });
    }
}

class VBOSceneModelPointBatchingRenderer extends VBOSceneModelRenderer {
    _draw(drawCfg) {
        const { gl } = this._scene.canvas;

        const {
            state,
            frameCtx,
            incrementDrawState,
        } = drawCfg;

        gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);

        if (incrementDrawState) {
            frameCtx.drawArrays++;
        }
    }
}

class VBOSceneModelPointInstancingRenderer extends VBOSceneModelRenderer {
    constructor(scene, withSAO) {
        super(scene, withSAO, { instancing: true });
    }

    _draw(drawCfg) {
        const { gl } = this._scene.canvas;

        const {
            state,
            frameCtx,
            geometry,
            incrementDrawState,
        } = drawCfg;

        gl.drawArraysInstanced(gl.POINTS, 0, geometry.positionsBuf.numItems, state.numInstances);

        if (incrementDrawState) {
            frameCtx.drawArrays++;
        }
    }
}

class VBOSceneModelLineBatchingRenderer extends VBOSceneModelRenderer {
    _draw(drawCfg) {
        const { gl } = this._scene.canvas;

        const {
            state,
            frameCtx,
            incrementDrawState
        } = drawCfg;

        gl.drawElements(gl.LINES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);

        if (incrementDrawState) {
            frameCtx.drawElements++;
        }
    }
}
class VBOSceneModelLineInstancingRenderer extends VBOSceneModelRenderer {
    constructor(scene, withSAO) {
        super(scene, withSAO, { instancing: true });
    }

    _draw(drawCfg) {
        const { gl } = this._scene.canvas;

        const {
            state,
            geometry,
            frameCtx,
            incrementDrawState,
        } = drawCfg;

        gl.drawElementsInstanced(gl.LINES, geometry.indicesBuf.numItems, geometry.indicesBuf.itemType, 0, state.numInstances);

        if (incrementDrawState) {
            frameCtx.drawElements++;
        }
    }
}

export {
    VBOSceneModelTriangleBatchingRenderer,
    VBOSceneModelTriangleBatchingEdgesRenderer,
    VBOSceneModelTriangleInstancingRenderer,
    VBOSceneModelTriangleInstancingEdgesRenderer,
    VBOSceneModelPointBatchingRenderer,
    VBOSceneModelPointInstancingRenderer,
    VBOSceneModelLineBatchingRenderer,
    VBOSceneModelLineInstancingRenderer,
}

