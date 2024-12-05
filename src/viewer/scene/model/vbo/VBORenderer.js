export const makeVBORenderingAttributes = function(scene, instancing, primitive, subGeometry) {
    const gl = scene.canvas.gl;
    const lazyShaderVariable = function(name) {
        const variable = {
            toString: () => {
                variable.needed = true;
                return name;
            }
        };
        return variable;
    };

    const params = {
        colorA:             lazyShaderVariable("colorA"),
        pickColorA:         lazyShaderVariable("pickColor"),
        uvA:                lazyShaderVariable("aUv"),
        metallicRoughnessA: lazyShaderVariable("metallicRoughness"),
        viewMatrix:         "viewMatrix",
        viewNormal:         lazyShaderVariable("viewNormal"),
        worldNormal:        lazyShaderVariable("worldNormal"),
        worldPosition:      "worldPosition",
        getFlag:            renderPassFlag => `(int(flags) >> ${renderPassFlag * 4} & 0xF)`,
        fragViewMatrix:     lazyShaderVariable("viewMatrix")
    };

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
    const matricesUniformBlockBufferData = new Float32Array(4 * 4 * 6); // there is 6 mat4

    /**
     * A Vertex Array Object by Layer
     */
    const drawCallCache = new WeakMap();

    const needNormal = () => (params.viewNormal.needed || params.worldNormal.needed);

    const matricesUniformBlockLines = () => [
        "uniform Matrices {",
        "    mat4 worldMatrix;",
        "    mat4 viewMatrix;",
        "    mat4 projMatrix;",
        "    mat4 positionsDecodeMatrix;"
    ].concat(needNormal() ? [
        "    mat4 worldNormalMatrix;",
        "    mat4 viewNormalMatrix;",
    ] : [ ]).concat([ "};" ]);

    return {
        isVBO: true,
        signature: instancing ? "instancing" : "batching",

        parameters: params,

        getClippable: () => "((int(flags) >> 16 & 0xF) == 1) ? 1.0 : 0.0",

        appendVertexDefinitions: (src) => {
            src.push("in vec3 position;");
            if (needNormal()) {
                src.push("in vec3 normal;");
            }
            if (params.colorA.needed) {
                src.push(`in vec4 colorA255;`);
            }
            if (params.pickColorA.needed) {
                src.push("in vec4 pickColor;");
            }
            if (params.uvA.needed) {
                src.push("in vec2 uv;");
                src.push("uniform mat3 uvDecodeMatrix;");
            }
            if (params.metallicRoughnessA.needed) {
                src.push("in vec2 metallicRoughness;");
            }
            src.push("in float flags;");
            if (scene.entityOffsetsEnabled) {
                src.push("in vec3 offset;");
            }

            if (instancing) {
                src.push("in vec4 modelMatrixCol0;"); // Modeling matrix
                src.push("in vec4 modelMatrixCol1;");
                src.push("in vec4 modelMatrixCol2;");
                if (needNormal()) {
                    src.push("in vec4 modelNormalMatrixCol0;");
                    src.push("in vec4 modelNormalMatrixCol1;");
                    src.push("in vec4 modelNormalMatrixCol2;");
                }
            }

            matricesUniformBlockLines().forEach(line => src.push(line));

            if (needNormal()) {
                src.push("vec3 octDecode(vec2 oct) {");
                src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
                src.push("    if (v.z < 0.0) {");
                src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
                src.push("    }");
                src.push("    return normalize(v);");
                src.push("}");
            }
        },

        appendVertexData: (src, afterFlagsColorLines) => {

            if (params.colorA.needed) {
                src.push(`vec4 ${params.colorA} = colorA255 / 255.0;`);
            }

            afterFlagsColorLines.forEach(line => src.push(line));

            if (needNormal()) {
                src.push("vec4 modelNormal = vec4(octDecode(normal.xy), 0.0);");
                if (instancing) {
                    src.push("modelNormal = vec4(dot(modelNormal, modelNormalMatrixCol0), dot(modelNormal, modelNormalMatrixCol1), dot(modelNormal, modelNormalMatrixCol2), 0.0);");
                }
                src.push(`vec3 ${params.worldNormal} = (worldNormalMatrix * modelNormal).xyz;`);
                if (params.viewNormal.needed) {
                    src.push(`vec3 viewNormal = normalize((viewNormalMatrix * vec4(${params.worldNormal}, 0.0)).xyz);`);
                }
            }

            if (params.uvA.needed) {
                src.push(`vec2 ${params.uvA} = (uvDecodeMatrix * vec3(uv, 1.0)).xy;`);
            }

            if (instancing) {
                src.push("vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0);");
                src.push("worldPosition = worldMatrix * vec4(dot(worldPosition, modelMatrixCol0), dot(worldPosition, modelMatrixCol1), dot(worldPosition, modelMatrixCol2), 1.0);");
            } else {
                src.push("vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0));");
            }
            if (scene.entityOffsetsEnabled) {
                src.push("worldPosition.xyz = worldPosition.xyz + offset;");
            }
        },

        appendFragmentDefinitions: (src) => {
            if (params.fragViewMatrix.needed) {
                matricesUniformBlockLines().forEach(line => src.push(line));
            }
        },

        makeDrawCall: function(getInputSetter) {
            const uMatricesBlock  = getInputSetter("Matrices");
            const uUVDecodeMatrix = params.uvA.needed && getInputSetter("uvDecodeMatrix");

            const aPosition          = getInputSetter("position");
            const aOffset            = scene.entityOffsetsEnabled && getInputSetter("offset");
            const aNormal            = needNormal() && getInputSetter("normal");
            const aUV                = params.uvA.needed && getInputSetter("uv");
            const aColor             = params.colorA.needed && getInputSetter("colorA255");
            const aMetallicRoughness = params.metallicRoughnessA.needed && getInputSetter("metallicRoughness");
            const aFlags             = getInputSetter("flags");
            const aPickColor         = params.pickColorA.needed && getInputSetter("pickColor");

            const aModelMatrixCol0 = instancing && getInputSetter("modelMatrixCol0");
            const aModelMatrixCol1 = instancing && getInputSetter("modelMatrixCol1");
            const aModelMatrixCol2 = instancing && getInputSetter("modelMatrixCol2");
            const aModelNormalMatrixCol0 = instancing && needNormal() && getInputSetter("modelNormalMatrixCol0");
            const aModelNormalMatrixCol1 = instancing && needNormal() && getInputSetter("modelNormalMatrixCol1");
            const aModelNormalMatrixCol2 = instancing && needNormal() && getInputSetter("modelNormalMatrixCol2");

            return function(frameCtx, layer, sceneModelMat, viewMatrix, projMatrix, rtcOrigin, eye) {
                const state = layer._state;
                let offset = 0;
                const mat4Size = 4 * 4;
                matricesUniformBlockBufferData.set(sceneModelMat, 0);
                matricesUniformBlockBufferData.set(viewMatrix, offset += mat4Size);
                matricesUniformBlockBufferData.set(projMatrix, offset += mat4Size);
                matricesUniformBlockBufferData.set(state.positionsDecodeMatrix, offset += mat4Size);
                if (needNormal()) {
                    matricesUniformBlockBufferData.set(layer.model.worldNormalMatrix, offset += mat4Size);
                    matricesUniformBlockBufferData.set(scene.camera.viewNormalMatrix, offset += mat4Size);
                }
                uMatricesBlock(matricesUniformBlockBufferData);

                uUVDecodeMatrix && uUVDecodeMatrix(state.uvDecodeMatrix);

                if (! drawCallCache.has(layer)) {
                    const vao = gl.createVertexArray();
                    gl.bindVertexArray(vao);

                    const bindAttribute = (a, b, setDivisor) => b && a(b, setDivisor && 1);

                    if (instancing) {
                        bindAttribute(aModelMatrixCol0, state.modelMatrixCol0Buf, true);
                        bindAttribute(aModelMatrixCol1, state.modelMatrixCol1Buf, true);
                        bindAttribute(aModelMatrixCol2, state.modelMatrixCol2Buf, true);
                        aModelNormalMatrixCol0 && bindAttribute(aModelNormalMatrixCol0, state.modelNormalMatrixCol0Buf, true);
                        aModelNormalMatrixCol1 && bindAttribute(aModelNormalMatrixCol1, state.modelNormalMatrixCol1Buf, true);
                        aModelNormalMatrixCol2 && bindAttribute(aModelNormalMatrixCol2, state.modelNormalMatrixCol2Buf, true);
                    }

                    bindAttribute(aPosition, state.positionsBuf);
                    aUV                && bindAttribute(aUV,                state.uvBuf);
                    aNormal            && bindAttribute(aNormal,            state.normalsBuf);
                    aMetallicRoughness && bindAttribute(aMetallicRoughness, state.metallicRoughnessBuf, instancing);
                    aColor             && bindAttribute(aColor,             state.colorsBuf,            instancing && state.colorsBuf && (!state.colorsForPointsNotInstancing));
                    aFlags             && bindAttribute(aFlags,             state.flagsBuf,             instancing);
                    aOffset            && bindAttribute(aOffset,            state.offsetsBuf,           instancing);
                    aPickColor         && bindAttribute(aPickColor,         state.pickColorsBuf,        instancing);

                    const drawer = (function() {
                        // TODO: Use drawElements count and offset to draw only one entity

                        const drawPoints = () => {
                            if (instancing) {
                                gl.drawArraysInstanced(gl.POINTS, 0, state.positionsBuf.numItems, state.numInstances);
                            } else {
                                gl.drawArrays(gl.POINTS, 0, state.positionsBuf.numItems);
                            }
                        };

                        const elementsDrawer = (mode, indicesBuf) => {
                            indicesBuf.bind();
                            return function() {
                                const count  = indicesBuf.numItems;
                                const type   = indicesBuf.itemType;
                                const offset = 0;
                                if (instancing) {
                                    gl.drawElementsInstanced(mode, count, type, offset, state.numInstances);
                                } else {
                                    gl.drawElements(mode, count, type, offset);
                                }
                            };
                        };

                        if (primitive === "points") {
                            return drawPoints;
                        } else if (primitive === "lines") {
                            if (subGeometry && subGeometry.vertices) {
                                return drawPoints;
                            } else {
                                return elementsDrawer(gl.LINES, state.indicesBuf);
                            }
                        } else {    // triangles
                            if (subGeometry && subGeometry.vertices) {
                                return drawPoints;
                            } else if (subGeometry && state.edgeIndicesBuf) {
                                return elementsDrawer(gl.LINES, state.edgeIndicesBuf);
                            } else {
                                return elementsDrawer(gl.TRIANGLES, state.indicesBuf);
                            }
                        }
                    })();

                    gl.bindVertexArray(null);

                    drawCallCache.set(layer, function(frameCtx) {
                        gl.bindVertexArray(vao);
                        drawer();
                        gl.bindVertexArray(null);
                    });
                }

                drawCallCache.get(layer)(frameCtx);
            };
        }
    };
};
