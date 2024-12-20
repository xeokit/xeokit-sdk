export const makeVBORenderingAttributes = function(scene, instancing, primitive, subGeometry) {
    const lazyShaderVariable = function(name, type) {
        const variable = {
            toString: () => {
                variable.needed = true;
                return name;
            },
            definition: `in ${type} ${name};`
        };
        return variable;
    };

    const attributes = {
        position:          lazyShaderVariable("positionA",         "vec3"),
        normal:            lazyShaderVariable("normalA",           "vec3"),
        color:             lazyShaderVariable("colorA",            "vec4"),
        pickColor:         lazyShaderVariable("pickColor",         "vec4"),
        uV:                lazyShaderVariable("uvApremul",         "vec2"),
        metallicRoughness: lazyShaderVariable("metallicRoughness", "vec2"),
        flags:             lazyShaderVariable("flagsA",            "float"),
        offset:            lazyShaderVariable("offset",            "vec3")
    };

    const params = {
        colorA:             attributes.color,
        pickColorA:         attributes.pickColor,
        uvA:                lazyShaderVariable("aUv"),
        metallicRoughnessA: attributes.metallicRoughness,
        viewMatrix:         "viewMatrix",
        viewNormal:         lazyShaderVariable("viewNormal"),
        worldNormal:        lazyShaderVariable("worldNormal"),
        worldPosition:      "worldPosition",
        getFlag:            renderPassFlag => `(int(${attributes.flags}) >> ${renderPassFlag * 4} & 0xF)`,
        fragViewMatrix:     lazyShaderVariable("viewMatrix")
    };

    const matricesUniformBlockBufferData = new Float32Array(4 * 4 * 6); // there is 6 mat4

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

        getClippable: () => `((int(${attributes.flags}) >> 16 & 0xF) == 1) ? 1.0 : 0.0`,

        appendVertexDefinitions: (src) => {
            Object.values(attributes).forEach(a => a.needed && src.push(a.definition));

            params.uvA.needed && src.push("uniform mat3 uvDecodeMatrix;");

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
            afterFlagsColorLines.forEach(line => src.push(line));

            if (needNormal()) {
                src.push(`vec4 modelNormal = vec4(octDecode(${attributes.normal}.xy), 0.0);`);
                if (instancing) {
                    src.push("modelNormal = vec4(dot(modelNormal, modelNormalMatrixCol0), dot(modelNormal, modelNormalMatrixCol1), dot(modelNormal, modelNormalMatrixCol2), 0.0);");
                }
                src.push(`vec3 ${params.worldNormal} = (worldNormalMatrix * modelNormal).xyz;`);
                if (params.viewNormal.needed) {
                    src.push(`vec3 ${params.viewNormal} = normalize((viewNormalMatrix * vec4(${params.worldNormal}, 0.0)).xyz);`);
                }
            }

            params.uvA.needed && src.push(`vec2 ${params.uvA} = (uvDecodeMatrix * vec3(${attributes.uV}, 1.0)).xy;`);

            const modelMatrixTransposed = instancing && "mat4(modelMatrixCol0, modelMatrixCol1, modelMatrixCol2, vec4(0.0,0.0,0.0,1.0))";
            src.push(`vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(${attributes.position}, 1.0)${modelMatrixTransposed ? (" * " + modelMatrixTransposed) : ""});`);

            scene.entityOffsetsEnabled && src.push(`worldPosition.xyz = worldPosition.xyz + ${attributes.offset};`);
        },

        appendFragmentDefinitions: (src) => {
            params.fragViewMatrix.needed && matricesUniformBlockLines().forEach(line => src.push(line));
        },

        makeDrawCall: function(getInputSetter) {
            const uMatricesBlock  = getInputSetter("Matrices");
            const uUVDecodeMatrix = params.uvA.needed && getInputSetter("uvDecodeMatrix");

            const attributeSetters = { };
            Object.keys(attributes).forEach(k => { const a = attributes[k]; if (a.needed) { attributeSetters[k] = getInputSetter(a.toString()); } });
            const inputs = {
                attributes: attributeSetters,

                matrices: instancing && {
                    aModelMatrixCol: [
                        getInputSetter("modelMatrixCol0"),
                        getInputSetter("modelMatrixCol1"),
                        getInputSetter("modelMatrixCol2")
                    ],
                    aModelNormalMatrixCol: needNormal() && [
                        getInputSetter("modelNormalMatrixCol0"),
                        getInputSetter("modelNormalMatrixCol1"),
                        getInputSetter("modelNormalMatrixCol2")
                    ]
                }
            };

            inputs.attributesHash = JSON.stringify((function() {
                const attributeHashes = [ ];
                (function rec(o) {
                    Object.values(o).forEach(v => { if (v) { const h = v.attributeHash; if (h) attributeHashes.push(h); else rec(v); } });
                })(inputs);
                return attributeHashes;
            })());

            return function(frameCtx, layerDrawState, sceneModelMat, viewMatrix, projMatrix, rtcOrigin, eye) {
                let offset = 0;
                const mat4Size = 4 * 4;
                matricesUniformBlockBufferData.set(sceneModelMat, 0);
                matricesUniformBlockBufferData.set(viewMatrix, offset += mat4Size);
                matricesUniformBlockBufferData.set(projMatrix, offset += mat4Size);
                matricesUniformBlockBufferData.set(layerDrawState.positionsDecodeMatrix, offset += mat4Size);
                if (needNormal()) {
                    matricesUniformBlockBufferData.set(layerDrawState.getWorldNormalMatrix(), offset += mat4Size);
                    matricesUniformBlockBufferData.set(scene.camera.viewNormalMatrix, offset += mat4Size);
                }
                uMatricesBlock(matricesUniformBlockBufferData);
                uUVDecodeMatrix && uUVDecodeMatrix(layerDrawState.uvDecodeMatrix);

                layerDrawState.drawCall(inputs, subGeometry);
            };
        }
    };
};
