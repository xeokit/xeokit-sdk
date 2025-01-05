export function MeshRenderer(programSetup, mesh) {

    const scene = mesh.scene;
    const numAllocatedSectionPlanes = scene._sectionPlanesState.getNumAllocatedSectionPlanes();
    const clipping = numAllocatedSectionPlanes > 0;
    const getLogDepth = (! programSetup.dontGetLogDepth) && scene.logarithmicDepthBufferEnabled;
    const geometryState = mesh._geometry._state;
    const isPoints = geometryState.primitiveName === "points";
    const setupPointSize = programSetup.setupPointSize && isPoints;

    const lazyShaderAttribute = function(name, type) {
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
        position:  lazyShaderAttribute("position",  "vec3"),
        color:     lazyShaderAttribute("color",     "vec4"),
        pickColor: lazyShaderAttribute("pickColor", "vec4"),
        uv:        lazyShaderAttribute("uv",        "vec2"),
        normal:    lazyShaderAttribute("normal",    "vec3")
    };

    const lazyShaderVariable = function(name) {
        const variable = {
            toString: () => {
                variable.needed = true;
                return name;
            }
        };
        return variable;
    };

    const localNormal = lazyShaderVariable("localNormal");

    const programFragmentOutputs = [ ];
    programSetup.appendFragmentOutputs(programFragmentOutputs, "vWorldPosition", "gl_FragCoord");

    const programVertexOutputs = [ ];
    programSetup.appendVertexOutputs && programSetup.appendVertexOutputs(programVertexOutputs, attributes.color, attributes.pickColor, attributes.uv, localNormal);

    const buildVertexShader = () => {
        const quantizedGeometry = geometryState.compressGeometry;
        const billboard = mesh._state.billboard;
        const isBillboard = (! programSetup.dontBillboardAnything) && ((billboard === "spherical") || (billboard === "cylindrical"));
        const stationary = mesh._state.stationary;

        const mainVertexOutputs = (function() {
            const src = [ ];
            src.push(`vec4 localPosition = vec4(${attributes.position}, 1.0);`);
            if (quantizedGeometry) {
                src.push("localPosition = positionsDecodeMatrix * localPosition;");
            }
            if (programSetup.dontBillboardAnything) {
                src.push("vec4 worldPosition = modelMatrix * localPosition;");
                src.push("worldPosition.xyz = worldPosition.xyz + offset;");
                src.push("vec4 viewPosition = viewMatrix * worldPosition;");
            } else {
                src.push("mat4 viewMatrix2 = viewMatrix;");
                src.push("mat4 modelMatrix2 = modelMatrix;");
                if (stationary) {
                    src.push("viewMatrix2[3][0] = viewMatrix2[3][1] = viewMatrix2[3][2] = 0.0;");
                } else if (programSetup.meshStateBackground) {
                    src.push("viewMatrix2[3] = vec4(0.0, 0.0, 0.0 ,1.0);");
                }
                if (isBillboard) {
                    src.push("mat4 modelViewMatrix = viewMatrix2 * modelMatrix2;");
                    src.push("billboard(modelMatrix2);");
                    src.push("billboard(viewMatrix2);");
                }
                src.push("vec4 worldPosition = modelMatrix2 * localPosition;");
                src.push("worldPosition.xyz = worldPosition.xyz + offset;");
                if (isBillboard) {
                    src.push("billboard(modelViewMatrix);");
                    src.push("vec4 viewPosition = modelViewMatrix * localPosition;");
                } else {
                    src.push("vec4 viewPosition = viewMatrix2 * worldPosition;");
                }
            }
            if (localNormal.needed) {
                src.push(`vec3 ${localNormal} = ${quantizedGeometry ? `octDecode(${attributes.normal}.xy)` : attributes.normal};`);
            }
            return src;
        })();

        const src = [];
        src.push("#version 300 es");
        src.push("// " + programSetup.programName + " vertex shader");
        Object.values(attributes).forEach(a => a.needed && src.push(a.definition));
        src.push("uniform mat4 modelMatrix;");
        src.push("uniform mat4 viewMatrix;");
        src.push("uniform mat4 projMatrix;");
        src.push("uniform vec3 offset;");
        src.push("uniform vec3 scale;");
        if (quantizedGeometry) {
            src.push("uniform mat4 positionsDecodeMatrix;");
            if (localNormal.needed) {
                src.push("vec3 octDecode(vec2 oct) {");
                src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
                src.push("    if (v.z < 0.0) {");
                src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
                src.push("    }");
                src.push("    return normalize(v);");
                src.push("}");
            }
        }
        if (getLogDepth) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("bool isPerspectiveMatrix(mat4 m) {");
            src.push("    return (m[2][3] == - 1.0);");
            src.push("}");
            src.push("out float isPerspective;");
        }
        if (clipping) {
            src.push("out vec4 vWorldPosition;");
        }
        if (isBillboard) {
            src.push("void billboard(inout mat4 mat) {");
            src.push("   mat[0][0] = scale[0];");
            src.push("   mat[0][1] = 0.0;");
            src.push("   mat[0][2] = 0.0;");
            if (billboard === "spherical") {
                src.push("   mat[1][0] = 0.0;");
                src.push("   mat[1][1] = scale[1];");
                src.push("   mat[1][2] = 0.0;");
            }
            src.push("   mat[2][0] = 0.0;");
            src.push("   mat[2][1] = 0.0;");
            src.push("   mat[2][2] =1.0;");
            src.push("}");
        }
        if (setupPointSize) {
            src.push("uniform float pointSize;");
        }
        programSetup.appendVertexDefinitions && programSetup.appendVertexDefinitions(src);
        src.push("void main(void) {");
        mainVertexOutputs.forEach(line => src.push(line));
        programVertexOutputs.forEach(line => src.push(line));
        if (setupPointSize) {
            src.push("gl_PointSize = pointSize;");
        }
        if (clipping) {
            src.push("vWorldPosition = worldPosition;");
        }
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (getLogDepth) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("gl_Position = " + (programSetup.transformClipPos ? programSetup.transformClipPos("clipPos") : "clipPos") + ";");
        src.push("}");
        return src;
    };

    const buildFragmentShader = () => {
        const src = [];
        src.push("#version 300 es");
        src.push("// " + programSetup.programName + " fragment shader");
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");
        if (getLogDepth) {
            src.push("in float isPerspective;");
            src.push("uniform float logDepthBufFC;");
            src.push("in float vFragDepth;");
        }
        if (clipping) {
            src.push("in vec4 vWorldPosition;");
            src.push("uniform bool clippable;");
            for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        programSetup.appendFragmentDefinitions(src);
        src.push("void main(void) {");
        if (clipping) {
            src.push("if (clippable) {");
            src.push("  float dist = 0.0;");
            for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
            src.push("  if (dist > 0.0) { discard; }");
            src.push("}");
        }
        if (isPoints && programSetup.discardPoints) {
            src.push("vec2 cxy = 2.0 * gl_PointCoord - 1.0;");
            src.push("float r = dot(cxy, cxy);");
            src.push("if (r > 1.0) {");
            src.push("   discard;");
            src.push("}");
        }
        programFragmentOutputs.forEach(line => src.push(line));
        if (getLogDepth) {
            src.push("gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }
        src.push("}");
        return src;
    };

    return {
        vertex:   buildVertexShader(),
        fragment: buildFragmentShader(),
        setupGeneralMaterialInputs: setupPointSize && function(getInputSetter) {
            const pointSize = getInputSetter("pointSize");
            return (mtl) => pointSize(mtl.pointSize);
        }
    };
};
