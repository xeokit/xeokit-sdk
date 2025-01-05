export const LambertShaderSource = function (mesh) {
    this.vertex = buildVertexDraw(mesh);
    this.fragment = buildFragmentDraw(mesh);
};

function buildVertexDraw(mesh) {
    const scene = mesh.scene;
    const sectionPlanesState = mesh.scene._sectionPlanesState;
    const lightsState = mesh.scene._lightsState;
    const geometryState = mesh._geometry._state;
    const billboard = mesh._state.billboard;
    const stationary = mesh._state.stationary;
    const primitive = geometryState.primitiveName;
    const normals = (geometryState.autoVertexNormals || geometryState.normalsBuf) && (primitive === "triangles" || primitive === "triangle-strip" || primitive === "triangle-fan");
    const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
    const quantizedGeometry = !!geometryState.compressGeometry;

    const src = [];
    src.push("#version 300 es");
    src.push("// Lambertian drawing vertex shader");
    src.push("in vec3 position;");
    src.push("uniform mat4 modelMatrix;");
    src.push("uniform mat4 viewMatrix;");
    src.push("uniform mat4 projMatrix;");
    src.push("uniform vec4 colorize;");
    src.push("uniform vec3 offset;");
    src.push("uniform vec3 scale;");
    if (quantizedGeometry) {
        src.push("uniform mat4 positionsDecodeMatrix;");
    }
    if (scene.logarithmicDepthBufferEnabled) {
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
    src.push("uniform vec4 lightAmbient;");
    src.push("uniform vec4 materialColor;");
    src.push("uniform vec3 materialEmissive;");
    if (normals) {
        src.push("in vec3 normal;");
        src.push("uniform mat4 modelNormalMatrix;");
        src.push("uniform mat4 viewNormalMatrix;");
        for (let i = 0, len = lightsState.lights.length; i < len; i++) {
            const light = lightsState.lights[i];
            if (light.type === "ambient") {
                continue;
            }
            src.push("uniform vec4 lightColor" + i + ";");
            if (light.type === "dir") {
                src.push("uniform vec3 lightDir" + i + ";");
            }
            if (light.type === "point") {
                src.push("uniform vec3 lightPos" + i + ";");
            }
            if (light.type === "spot") {
                src.push("uniform vec3 lightPos" + i + ";");
                src.push("uniform vec3 lightDir" + i + ";");
            }
        }
        if (quantizedGeometry) {
            src.push("vec3 octDecode(vec2 oct) {");
            src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
            src.push("    if (v.z < 0.0) {");
            src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
            src.push("    }");
            src.push("    return normalize(v);");
            src.push("}");
        }
    }
    src.push("out vec4 vColor;");
    if (geometryState.primitiveName === "points") {
        src.push("uniform float pointSize;");
    }
    if (billboard === "spherical" || billboard === "cylindrical") {
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
    src.push("void main(void) {");
    src.push("vec4 localPosition = vec4(position, 1.0); ");
    src.push("vec4 worldPosition;");
    if (quantizedGeometry) {
        src.push("localPosition = positionsDecodeMatrix * localPosition;");
    }
    if (normals) {
        if (quantizedGeometry) {
            src.push("vec4 localNormal = vec4(octDecode(normal.xy), 0.0); ");
        } else {
            src.push("vec4 localNormal = vec4(normal, 0.0); ");
        }
        src.push("mat4 modelNormalMatrix2 = modelNormalMatrix;");
        src.push("mat4 viewNormalMatrix2 = viewNormalMatrix;");
    }
    src.push("mat4 viewMatrix2 = viewMatrix;");
    src.push("mat4 modelMatrix2 = modelMatrix;");
    if (stationary) {
        src.push("viewMatrix2[3][0] = viewMatrix2[3][1] = viewMatrix2[3][2] = 0.0;")
    }
    if (billboard === "spherical" || billboard === "cylindrical") {
        src.push("mat4 modelViewMatrix = viewMatrix2 * modelMatrix2;");
        src.push("billboard(modelMatrix2);");
        src.push("billboard(viewMatrix2);");
        src.push("billboard(modelViewMatrix);");
        if (normals) {
            src.push("mat4 modelViewNormalMatrix =  viewNormalMatrix2 * modelNormalMatrix2;");
            src.push("billboard(modelNormalMatrix2);");
            src.push("billboard(viewNormalMatrix2);");
            src.push("billboard(modelViewNormalMatrix);");
        }
        src.push("worldPosition = modelMatrix2 * localPosition;");
        src.push("worldPosition.xyz = worldPosition.xyz + offset;");
        src.push("vec4 viewPosition = modelViewMatrix * localPosition;");
    } else {
        src.push("worldPosition = modelMatrix2 * localPosition;");
        src.push("worldPosition.xyz = worldPosition.xyz + offset;");
        src.push("vec4 viewPosition  = viewMatrix2 * worldPosition; ");
    }
    if (normals) {
        src.push("vec3 viewNormal = normalize((viewNormalMatrix2 * modelNormalMatrix2 * localNormal).xyz);");
    }
    src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
    src.push("vec3 viewLightDir = vec3(0.0, 0.0, -1.0);");
    src.push("float lambertian = 1.0;");
    if (normals) {
        for (let i = 0, len = lightsState.lights.length; i < len; i++) {
            const light = lightsState.lights[i];
            if (light.type === "ambient") {
                continue;
            }
            if (light.type === "dir") {
                if (light.space === "view") {
                    src.push("viewLightDir = normalize(lightDir" + i + ");");
                } else {
                    src.push("viewLightDir = normalize((viewMatrix2 * vec4(lightDir" + i + ", 0.0)).xyz);");
                }
            } else if (light.type === "point") {
                if (light.space === "view") {
                    src.push("viewLightDir = -normalize(lightPos" + i + " - viewPosition.xyz);");
                } else {
                    src.push("viewLightDir = -normalize((viewMatrix2 * vec4(lightPos" + i + ", 0.0)).xyz);");
                }
            } else if (light.type === "spot") {
                if (light.space === "view") {
                    src.push("viewLightDir = normalize(lightDir" + i + ");");
                } else {
                    src.push("viewLightDir = normalize((viewMatrix2 * vec4(lightDir" + i + ", 0.0)).xyz);");
                }
            } else {
                continue;
            }
            src.push("lambertian = max(dot(-viewNormal, viewLightDir), 0.0);");
            src.push("reflectedColor += lambertian * (lightColor" + i + ".rgb * lightColor" + i + ".a);");
        }
    }
    src.push("vColor = vec4((lightAmbient.rgb * lightAmbient.a * materialColor.rgb) + materialEmissive.rgb + (reflectedColor * materialColor.rgb), materialColor.a) * colorize;"); // TODO: How to have ambient bright enough for canvas BG but not too bright for scene?
    if (clipping) {
        src.push("vWorldPosition = worldPosition;");
    }
    if (geometryState.primitiveName === "points") {
        src.push("gl_PointSize = pointSize;");
    }
    src.push("vec4 clipPos = projMatrix * viewPosition;");
    if (scene.logarithmicDepthBufferEnabled) {
        src.push("vFragDepth = 1.0 + clipPos.w;");
        src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
    }
    src.push("gl_Position = clipPos;");
    src.push("}");
    return src;
}

function buildFragmentDraw(mesh) {
    const scene = mesh.scene;
    const sectionPlanesState = scene._sectionPlanesState;
    const geometryState = mesh._geometry._state;
    const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
    const gammaOutput = scene.gammaOutput; // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.
    const src = [];
    src.push("#version 300 es");
    src.push("// Lambertian drawing fragment shader");
    src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
    src.push("precision highp float;");
    src.push("precision highp int;");
    src.push("#else");
    src.push("precision mediump float;");
    src.push("precision mediump int;");
    src.push("#endif");
    if (scene.logarithmicDepthBufferEnabled) {
        src.push("in float isPerspective;");
        src.push("uniform float logDepthBufFC;");
        src.push("in float vFragDepth;");
    }
    if (clipping) {
        src.push("in vec4 vWorldPosition;");
        src.push("uniform bool clippable;");
        for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
            src.push("uniform bool sectionPlaneActive" + i + ";");
            src.push("uniform vec3 sectionPlanePos" + i + ";");
            src.push("uniform vec3 sectionPlaneDir" + i + ";");
        }
    }
    src.push("in vec4 vColor;");
    if (gammaOutput) {
        src.push("uniform float gammaFactor;");
        src.push("    vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
        src.push("    return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
        src.push("}");
    }
    src.push("out vec4 outColor;");
    src.push("void main(void) {");
    if (clipping) {
        src.push("if (clippable) {");
        src.push("  float dist = 0.0;");
        for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
            src.push("if (sectionPlaneActive" + i + ") {");
            src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
            src.push("}");
        }
        src.push("  if (dist > 0.0) { discard; }");
        src.push("}");
    }
    if (geometryState.primitiveName === "points") {
        src.push("vec2 cxy = 2.0 * gl_PointCoord - 1.0;");
        src.push("float r = dot(cxy, cxy);");
        src.push("if (r > 1.0) {");
        src.push("   discard;");
        src.push("}");

    }
    if (scene.logarithmicDepthBufferEnabled) {
        src.push("gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
    }
    if (gammaOutput) {
        src.push("outColor = linearToGamma(vColor, gammaFactor);");
    } else {
        src.push("outColor = vColor;");
    }
    src.push("}");
    return src;
}
