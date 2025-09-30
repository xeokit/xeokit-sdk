import {createRTCViewMat, getPlaneRTCPos} from "../../math/rtcCoords.js";
import {math} from "../../math/math.js";
import {Program} from "../../webgl/Program.js";
import {stats} from "../../stats.js"
import {WEBGL_INFO} from "../../webglInfo.js";
import {RENDER_PASSES} from "./../RENDER_PASSES.js";

const defaultColor = new Float32Array([1, 1, 1, 1]);
const edgesDefaultColor = new Float32Array([0, 0, 0, 1]);

const tempVec4 = math.vec4();
const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempMat4a = math.mat4();

const SNAPPING_LOG_DEPTH_BUF_ENABLED = true; // Improves occlusion accuracy at distance

/**
 * @private
 */
export class VBORenderer {
    constructor(scene, withSAO = false, {instancing = false, primType, progMode, edges = false, useAlphaCutoff = false, hashPointsMaterial = false, hashLigthsSAO = false, hashGammaOutput = false, colorUniform = false, incrementDrawState = false} = {}) {
        this._scene = scene;
        this._withSAO = withSAO;
        this._instancing = instancing;
        this._primType = primType;
        this._progMode = progMode;
        this._edges = edges;
        this._useAlphaCutoff = useAlphaCutoff;
        this._hashPointsMaterial = hashPointsMaterial;
        this._hashLigthsSAO = hashLigthsSAO;
        this._hashGammaOutput = hashGammaOutput;
        this._colorUniform = colorUniform;
        this._incrementDrawState = incrementDrawState;
        this._hash = this._getHash();

        /**
         * Matrices Uniform Block Buffer
         *
         * In shaders, matrices in the Matrices Uniform Block MUST be set in this order:
         *  - worldMatrix
         *  - viewMatrix
         *  - projMatrix
         *  - positionsDecodeMatrix
         *  - worldNormalMatrix
         *  - viewNormalMatrix
         */
        this._matricesUniformBlockBufferBindingPoint = 0;

        this._matricesUniformBlockBuffer = this._scene.canvas.gl.createBuffer();
        this._matricesUniformBlockBufferData = new Float32Array(4 * 4 * 6); // there is 6 mat4

        /**
         * A Vertex Array Object by Layer
         */
        this._vaoCache = new WeakMap();

        this._allocate();
    }

    /**
     * Should be overrided by subclasses if it does not only "depend" on section planes state.
     * @returns { string }
     */
    _getHash() {
        const scene = this._scene;
        const hash = [ ];
        if (this._hashGammaOutput) {
            hash.push(scene.gammaOutput);
        }
        if (this._hashLigthsSAO) {
            hash.push(scene._lightsState.getHash());
        }
        hash.push(scene._sectionPlanesState.getHash() + (this._hashPointsMaterial ? scene.pointsMaterial.hash : ""));
        if (this._hashLigthsSAO) {
            hash.push(this._withSAO ? "sao" : "nosao");
        }
        if (this._useAlphaCutoff) {
            hash.push("alphaCutoff");
        }
        return hash.join(";");
    }

    _buildShader() {
        return {
            vertex: this._buildVertexShader(),
            fragment: this._buildFragmentShader()
        };
    }

    _buildVertexShader() {
        return [""];
    }

    _buildFragmentShader() {
        return [""];
    }

    _addMatricesUniformBlockLines(src, normals = false) {
        src.push("uniform Matrices {");
        src.push("    mat4 worldMatrix;");
        src.push("    mat4 viewMatrix;");
        src.push("    mat4 projMatrix;");
        src.push("    mat4 positionsDecodeMatrix;");
        if (normals) {
            src.push("    mat4 worldNormalMatrix;");
            src.push("    mat4 viewNormalMatrix;");
        }
        src.push("};");
        return src;
    }

    _addRemapClipPosLines(src, viewportSize = 1) {
        src.push("uniform vec2 drawingBufferSize;");
        src.push("uniform vec2 pickClipPos;");

        src.push("vec4 remapClipPos(vec4 clipPos) {");
        src.push("    clipPos.xy /= clipPos.w;");
        if (viewportSize === 1) {
            src.push("    clipPos.xy = (clipPos.xy - pickClipPos) * drawingBufferSize;");
        } else {
            src.push(`    clipPos.xy = (clipPos.xy - pickClipPos) * (drawingBufferSize / float(${viewportSize}));`);
        }
        src.push("    clipPos.xy *= clipPos.w;")
        src.push("    return clipPos;")
        src.push("}");
        return src;
    }

    getValid() {
        return this._hash === this._getHash();
    }

    setSectionPlanesStateUniforms(layer) {
        const scene = this._scene;
        const {gl} = scene.canvas;
        const {model, layerIndex} = layer;

        const numAllocatedSectionPlanes = scene._sectionPlanesState.getNumAllocatedSectionPlanes();
        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numAllocatedSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            if (scene.crossSections) {
                gl.uniform4fv(this._uSliceColor, scene.crossSections.sliceColor);
                gl.uniform1f(this._uSliceThickness, scene.crossSections.sliceThickness);
            }
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    if (sectionPlaneIndex < numSectionPlanes) {
                        const active = renderFlags.sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                        gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                        if (active) {
                            const sectionPlane = sectionPlanes[sectionPlaneIndex];
                            const origin = layer._state.origin;
                            if (origin) {
                                const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3b, model.matrix);
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
        this._uGammaFactor = program.getLocation("gammaFactor");

        gl.uniformBlockBinding(
            program.handle,
            gl.getUniformBlockIndex(program.handle, "Matrices"),
            this._matricesUniformBlockBufferBindingPoint
        );

        this._uShadowViewMatrix = program.getLocation("shadowViewMatrix");
        this._uShadowProjMatrix = program.getLocation("shadowProjMatrix");

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

        for (let i = 0, len = scene._sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
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
        this._uPickClipPos = program.getLocation("pickClipPos");
        this._uDrawingBufferSize = program.getLocation("drawingBufferSize");

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

        if (this._useAlphaCutoff) {
            this._alphaCutoffLocation = program.getLocation("materialAlphaCutoff");
        }

        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }

        if (scene.pointsMaterial._state.filterIntensity) {
            this._uIntensityRange = program.getLocation("intensityRange");
        }

        this._uPointSize = program.getLocation("pointSize");
        this._uNearPlaneHeight = program.getLocation("nearPlaneHeight");

        if (scene.crossSections) {
            this._uSliceColor = program.getLocation("sliceColor");
            this._uSliceThickness = program.getLocation("sliceThickness");
        }

        if ((this._progMode === "snapInitMode") || (this._progMode === "snapMode")) {
            if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
                this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
            }

            this.uVectorA = program.getLocation("snapVectorA");
            this.uInverseVectorAB = program.getLocation("snapInvVectorAB");
            this._uLayerNumber = program.getLocation("layerNumber");
            this._uCoordinateScaler = program.getLocation("coordinateScaler");
        }
    }

    _bindProgram(frameCtx) {
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const lightsState = scene._lightsState;
        const lights = lightsState.lights;

        program.bind();

        frameCtx.textureUnit = 0;

        if (this._uLightAmbient) {
            gl.uniform4fv(this._uLightAmbient, lightsState.getAmbientColorAndIntensity());
        }

        if (this._uGammaFactor) {
            gl.uniform1f(this._uGammaFactor, scene.gammaFactor);
        }

        for (let i = 0, len = lights.length; i < len; i++) {

            const light = lights[i];

            if (this._uLightColor[i]) {
                gl.uniform4f(this._uLightColor[i], light.color[0], light.color[1], light.color[2], light.intensity);
            }
            if (this._uLightPos[i]) {
                gl.uniform3fv(this._uLightPos[i], light.pos);
                if (this._uLightAttenuation[i]) {
                    gl.uniform1f(this._uLightAttenuation[i], light.attenuation);
                }
            }
            if (this._uLightDir[i]) {
                gl.uniform3fv(this._uLightDir[i], light.dir);
            }
        }
    }

    _makeVAO(state) {
        const gl = this._scene.canvas.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

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

        this._aPosition.bindArrayBuffer(state.positionsBuf);

        if (this._aUV) {
            this._aUV.bindArrayBuffer(state.uvBuf);
        }

        if (this._aNormal) {
            this._aNormal.bindArrayBuffer(state.normalsBuf);
        }

        if (this._aMetallicRoughness) {
            this._aMetallicRoughness.bindArrayBuffer(state.metallicRoughnessBuf);
            if (this._instancing) {
                gl.vertexAttribDivisor(this._aMetallicRoughness.location, 1);
            }
        }

        if (this._aColor) {
            this._aColor.bindArrayBuffer(state.colorsBuf);
            if (this._instancing && state.colorsBuf && (!state.colorsForPointsNotInstancing)) {
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

        if (this._edges && state.edgeIndicesBuf) {
            state.edgeIndicesBuf.bind();
        } else {
            if (state.indicesBuf) {
                state.indicesBuf.bind();
            }
        }

        return vao;
    }

    drawLayer(frameCtx, layer, renderPass, {colorUniform = false, incrementDrawState = false} = {}) {

        const isSnap = (this._progMode === "snapInitMode") || (this._progMode === "snapMode");

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const {_state: state, model} = layer;
        const {origin, positionsDecodeMatrix} = state;
        const {camera} = model.scene;
        const {project} = camera;
        const viewMatrix = frameCtx.pickViewMatrix || camera.viewMatrix;
        const {position, rotationMatrix} = model;

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

        if (this._vaoCache.has(layer)) {
            gl.bindVertexArray(this._vaoCache.get(layer));
        } else {
            this._vaoCache.set(layer, this._makeVAO(state))
        }

        let rtcViewMatrix;
        const rtcOrigin = tempVec3a;
        rtcOrigin.set([0, 0, 0]);

        const gotOrigin = (origin[0] !== 0 || origin[1] !== 0 || origin[2] !== 0);
        const gotPosition = (position[0] !== 0 || position[1] !== 0 || position[2] !== 0);
        if (gotOrigin || gotPosition) {
            if (gotOrigin) {
                math.transformPoint3(rotationMatrix, origin, rtcOrigin);
            }
            math.addVec3(rtcOrigin, position, rtcOrigin);
            rtcViewMatrix = createRTCViewMat(viewMatrix, rtcOrigin, tempMat4a);
        } else {
            rtcViewMatrix = viewMatrix;
        }

        let offset = 0;
        const mat4Size = 4 * 4;
        this._matricesUniformBlockBufferData.set(rotationMatrix, 0);
        this._matricesUniformBlockBufferData.set(rtcViewMatrix, offset += mat4Size);
        this._matricesUniformBlockBufferData.set(frameCtx.pickProjMatrix || project.matrix, offset += mat4Size);
        this._matricesUniformBlockBufferData.set(positionsDecodeMatrix, offset += mat4Size);
        if (! isSnap) {
            this._matricesUniformBlockBufferData.set(model.worldNormalMatrix, offset += mat4Size);
            this._matricesUniformBlockBufferData.set(camera.viewNormalMatrix, offset += mat4Size);
        }

        gl.bindBuffer(gl.UNIFORM_BUFFER, this._matricesUniformBlockBuffer);
        gl.bufferData(gl.UNIFORM_BUFFER, this._matricesUniformBlockBufferData, gl.DYNAMIC_DRAW);

        gl.bindBufferBase(
            gl.UNIFORM_BUFFER,
            this._matricesUniformBlockBufferBindingPoint,
            this._matricesUniformBlockBuffer);

        this.setSectionPlanesStateUniforms(layer);

        if (this._uShadowViewMatrix) {
            gl.uniformMatrix4fv(this._uShadowViewMatrix, false, frameCtx.shadowViewMatrix); // Not tested
        }
        if (this._uShadowProjMatrix) {
            gl.uniformMatrix4fv(this._uShadowProjMatrix, false, frameCtx.shadowProjMatrix); // Not tested
        }

        if (scene.logarithmicDepthBufferEnabled || (isSnap && SNAPPING_LOG_DEPTH_BUF_ENABLED)) {
            if (this._uLogDepthBufFC) {
                const logDepthBufFC = 2.0 / (Math.log(frameCtx.pickZFar + 1.0) / Math.LN2); // TODO: Far from pick project matrix?
                gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
            }
        }

        if (isSnap) {
            const aabb = layer.aabb; // Per-layer AABB for best RTC accuracy
            const coordinateScaler = tempVec3c;
            coordinateScaler[0] = math.safeInv(aabb[3] - aabb[0]) * math.MAX_INT;
            coordinateScaler[1] = math.safeInv(aabb[4] - aabb[1]) * math.MAX_INT;
            coordinateScaler[2] = math.safeInv(aabb[5] - aabb[2]) * math.MAX_INT;

            frameCtx.snapPickCoordinateScale[0] = math.safeInv(coordinateScaler[0]);
            frameCtx.snapPickCoordinateScale[1] = math.safeInv(coordinateScaler[1]);
            frameCtx.snapPickCoordinateScale[2] = math.safeInv(coordinateScaler[2]);
            frameCtx.snapPickOrigin[0] = rtcOrigin[0];
            frameCtx.snapPickOrigin[1] = rtcOrigin[1];
            frameCtx.snapPickOrigin[2] = rtcOrigin[2];

            gl.uniform3fv(this._uCoordinateScaler, coordinateScaler);
            gl.uniform2fv(this.uVectorA, frameCtx.snapVectorA);
            gl.uniform2fv(this.uInverseVectorAB, frameCtx.snapInvVectorAB);
            gl.uniform1i(this._uLayerNumber, frameCtx.snapPickLayerNumber);
            gl.uniform1i(this._uRenderPass, renderPass);
            if (this._uPointSize) {
                gl.uniform1f(this._uPointSize, 1.0);
            }

            //=============================================================
            // TODO: Use drawElements count and offset to draw only one entity
            //=============================================================

            if ((this._progMode === "snapInitMode") && (this._primType !== "pointType")) {
                state.indicesBuf.bind();
                const mode = (this._primType === "lineType") ? gl.LINES : gl.TRIANGLES;
                if (this._instancing) {
                    gl.drawElementsInstanced(mode, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);
                } else {
                    gl.drawElements(mode, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
                }
                state.indicesBuf.unbind();
            } else if ((frameCtx.snapMode === "edge") && (this._primType !== "pointType")) {
                const indicesBuf = ((this._isSnap !== "lines") && state.edgeIndicesBuf) || state.indicesBuf;
                indicesBuf.bind();
                if (this._instancing) {
                    gl.drawElementsInstanced(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0, state.numInstances);
                } else {
                    gl.drawElements(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0);
                }
                indicesBuf.unbind(); // needed?
            } else {
                if (this._instancing) {
                    gl.drawArraysInstanced(gl.POINTS, 0, state.positionsBuf.numItems, state.numInstances);
                } else {
                    gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
                }
            }

        } else {                // ! isSnap

            gl.uniform1i(this._uRenderPass, renderPass);

            if (this._uPickZNear) {
                gl.uniform1f(this._uPickZNear, frameCtx.pickZNear);
            }

            if (this._uPickZFar) {
                gl.uniform1f(this._uPickZFar, frameCtx.pickZFar);
            }

            if (this._uPickClipPos) {
                gl.uniform2fv(this._uPickClipPos, frameCtx.pickClipPos);
            }

            if (this._uDrawingBufferSize) {
                gl.uniform2f(this._uDrawingBufferSize, gl.drawingBufferWidth, gl.drawingBufferHeight);
            }

            if (this._uUVDecodeMatrix) {
                gl.uniformMatrix3fv(this._uUVDecodeMatrix, false, state.uvDecodeMatrix);
            }

            const pointsMaterial = scene.pointsMaterial;
            if (this._uIntensityRange && pointsMaterial.filterIntensity) {
                gl.uniform2f(this._uIntensityRange, pointsMaterial.minIntensity, pointsMaterial.maxIntensity);
            }

            if (this._uPointSize) {
                gl.uniform1f(this._uPointSize, pointsMaterial.pointSize);
            }

            if (this._uNearPlaneHeight) {
                const nearPlaneHeight = (scene.camera.projection === "ortho") ?
                      1.0
                      : (gl.drawingBufferHeight / (2 * Math.tan(0.5 * scene.camera.perspective.fov * Math.PI / 180.0)));
                gl.uniform1f(this._uNearPlaneHeight, nearPlaneHeight);
            }

            const maxTextureUnits = WEBGL_INFO.MAX_TEXTURE_IMAGE_UNITS;
            const textureSet = state.textureSet;
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

            const lightsState = scene._lightsState;
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

            if (this._useAlphaCutoff) {
                gl.uniform1f(this._alphaCutoffLocation, textureSet.alphaCutoff);
            }

            if (colorUniform || this._colorUniform) {
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

            if (this._primType === "lineType") {
                if (this._instancing) {
                    gl.drawElementsInstanced(gl.LINES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);
                } else {
                    gl.drawElements(gl.LINES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
                }
                if (incrementDrawState || this._incrementDrawState) {
                    frameCtx.drawElements++;
                }
            } else if (this._primType === "pointType") {
                if (this._instancing) {
                    gl.drawArraysInstanced(gl.POINTS, 0, state.positionsBuf.numItems, state.numInstances);
                } else {
                    gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
                }
                if (incrementDrawState || this._incrementDrawState) {
                    frameCtx.drawElements++;
                }
            } else {
                if (this._instancing) {
                    if (this._edges) {
                        gl.drawElementsInstanced(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0, state.numInstances);
                    } else {
                        gl.drawElementsInstanced(gl.TRIANGLES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);

                        if (incrementDrawState || this._incrementDrawState) {
                            frameCtx.drawElements++;
                        }
                    }
                } else {
                    if (this._edges) {
                        gl.drawElements(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0);
                    } else {
                        gl.drawElements(gl.TRIANGLES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);

                        if (incrementDrawState || this._incrementDrawState) {
                            frameCtx.drawElements++;
                        }
                    }
                }
            }
        }

        gl.bindVertexArray(null);
    }

    webglContextRestored() {
        this._program = null;
    }

    destroy() {
        if (this._program) {
            this._program.destroy();
        }
        this._program = null;
    }
}