import {TrianglesInstancingRenderer} from "./TrianglesInstancingRenderer.js";

/**
 * @private
 */
class TrianglesColorRenderer extends TrianglesInstancingRenderer {
    _getHash() {
        const scene = this._scene;
        return [scene._lightsState.getHash(), scene._sectionPlanesState.getHash(), (this._withSAO ? "sao" : "nosao")].join(";");
    }

    drawLayer(frameCtx, layer, renderPass) {
        super.drawLayer(frameCtx, layer, renderPass, { incrementDrawState: true });
    }

    _buildVertexShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const lightsState = scene._lightsState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        let i;
        let len;
        let light;
        const src = [];
        src.push("#version 300 es");
        src.push("// Instancing geometry drawing vertex shader");

        src.push("uniform int renderPass;");

        src.push("in vec3 position;");
        src.push("in vec2 normal;");
        src.push("in vec4 color;");
        src.push("in float flags;");

        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }

        src.push("in vec4 modelMatrixCol0;"); // Modeling matrix
        src.push("in vec4 modelMatrixCol1;");
        src.push("in vec4 modelMatrixCol2;");

        src.push("in vec4 modelNormalMatrixCol0;");
        src.push("in vec4 modelNormalMatrixCol1;");
        src.push("in vec4 modelNormalMatrixCol2;");

        this._addMatricesUniformBlockLines(src, true);

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("bool isPerspectiveMatrix(mat4 m) {");
            src.push("    return (m[2][3] == - 1.0);");
            src.push("}");
            src.push("out float isPerspective;");
        }

        src.push("uniform vec4 lightAmbient;");

        for (i = 0, len = lightsState.lights.length; i < len; i++) {
            light = lightsState.lights[i];
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

        src.push("vec3 octDecode(vec2 oct) {");
        src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
        src.push("    if (v.z < 0.0) {");
        src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
        src.push("    }");
        src.push("    return normalize(v);");
        src.push("}");

        if (clipping) {
            src.push("out vec4 vWorldPosition;");
            src.push("out float vFlags;");
        }
        src.push("out vec4 vColor;");

        src.push("void main(void) {");

        // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
        // renderPass = COLOR_OPAQUE | COLOR_TRANSPARENT

        src.push(`int colorFlag = int(flags) & 0xF;`);
        src.push(`if (colorFlag != renderPass) {`);
        src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex

        src.push("} else {");

        src.push("vec4 worldPosition =  positionsDecodeMatrix * vec4(position, 1.0); ");
        src.push("worldPosition = worldMatrix * vec4(dot(worldPosition, modelMatrixCol0), dot(worldPosition, modelMatrixCol1), dot(worldPosition, modelMatrixCol2), 1.0);");
        if (scene.entityOffsetsEnabled) {
            src.push("worldPosition.xyz = worldPosition.xyz + offset;");
        }

        src.push("vec4 viewPosition  = viewMatrix * worldPosition; ");

        src.push("vec4 modelNormal = vec4(octDecode(normal.xy), 0.0); ");
        src.push("vec4 worldNormal = worldNormalMatrix * vec4(dot(modelNormal, modelNormalMatrixCol0), dot(modelNormal, modelNormalMatrixCol1), dot(modelNormal, modelNormalMatrixCol2), 0.0);");
        src.push("vec3 viewNormal = normalize(vec4(viewNormalMatrix * worldNormal).xyz);");

        src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
        src.push("vec3 viewLightDir = vec3(0.0, 0.0, -1.0);");

        src.push("float lambertian = 1.0;");
        for (i = 0, len = lightsState.lights.length; i < len; i++) {
            light = lightsState.lights[i];
            if (light.type === "ambient") {
                continue;
            }
            if (light.type === "dir") {
                if (light.space === "view") {
                    src.push("viewLightDir = normalize(lightDir" + i + ");");
                } else {
                    src.push("viewLightDir = normalize((viewMatrix * vec4(lightDir" + i + ", 0.0)).xyz);");
                }
            } else if (light.type === "point") {
                if (light.space === "view") {
                    src.push("viewLightDir = -normalize(lightPos" + i + " - viewPosition.xyz);");
                } else {
                    src.push("viewLightDir = -normalize((viewMatrix * vec4(lightPos" + i + ", 0.0)).xyz);");
                }
            } else if (light.type === "spot") {
                if (light.space === "view") {
                    src.push("viewLightDir = normalize(lightDir" + i + ");");
                } else {
                    src.push("viewLightDir = normalize((viewMatrix * vec4(lightDir" + i + ", 0.0)).xyz);");
                }
            } else {
                continue;
            }
            src.push("lambertian = max(dot(-viewNormal, viewLightDir), 0.0);");
            src.push("reflectedColor += lambertian * (lightColor" + i + ".rgb * lightColor" + i + ".a);");
        }

        src.push("vec3 rgb = (vec3(float(color.r) / 255.0, float(color.g) / 255.0, float(color.b) / 255.0));");
        src.push("vColor =  vec4((lightAmbient.rgb * lightAmbient.a * rgb) + (reflectedColor * rgb), float(color.a) / 255.0);");

        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }

        if (clipping) {
            src.push("vWorldPosition = worldPosition;");
            src.push("vFlags = flags;");
        }

        src.push("gl_Position = clipPos;");
        src.push("}");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push("#version 300 es");
        src.push("// Instancing geometry drawing fragment shader");

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
        if (this._withSAO) {
            src.push("uniform sampler2D uOcclusionTexture;");
            src.push("uniform vec4      uSAOParams;");
            src.push("const float       packUpscale = 256. / 255.;");
            src.push("const float       unpackDownScale = 255. / 256.;");
            src.push("const vec3        packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );");
            src.push("const vec4        unPackFactors = unpackDownScale / vec4( packFactors, 1. );");

            src.push("float unpackRGBToFloat( const in vec4 v ) {");
            src.push("    return dot( v, unPackFactors );");
            src.push("}");
        }

        if (clipping) {
            src.push("in vec4 vWorldPosition;");
            src.push("in float vFlags;");
            for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
            src.push("uniform float sliceThickness;");
            src.push("uniform vec4 sliceColor;");
        }
        src.push("in vec4 vColor;");
        src.push("out vec4 outColor;");
        src.push("void main(void) {");
        src.push("  vec4 newColor;");
        src.push("  newColor = vColor;");
        if (clipping) {
            src.push("  bool clippable = (int(vFlags) >> 16 & 0xF) == 1;");
            src.push("  if (clippable) {");
            src.push("  float dist = 0.0;");
            for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
            src.push("  if (dist > sliceThickness) { ");
            src.push("      discard;")
            src.push("  }");
            src.push("  if (dist > 0.0) { ");
            src.push("      newColor = sliceColor;");
            src.push("  }");
            src.push("}");
        }

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("    float dx = dFdx(vFragDepth);")
            src.push("    float dy = dFdy(vFragDepth);")
            src.push("    float diff = sqrt(dx*dx+dy*dy);");
            src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth + diff ) * logDepthBufFC * 0.5;");
        }

        // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
        // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject

        if (this._withSAO) {
            src.push("   float viewportWidth     = uSAOParams[0];");
            src.push("   float viewportHeight    = uSAOParams[1];");
            src.push("   float blendCutoff       = uSAOParams[2];");
            src.push("   float blendFactor       = uSAOParams[3];");
            src.push("   vec2 uv                 = vec2(gl_FragCoord.x / viewportWidth, gl_FragCoord.y / viewportHeight);");
            src.push("   float ambient           = smoothstep(blendCutoff, 1.0, unpackRGBToFloat(texture(uOcclusionTexture, uv))) * blendFactor;");
            src.push("   outColor                = vec4(newColor.rgb * ambient, 1.0);");
        } else {
            src.push("    outColor           = newColor;");
        }
        src.push("}");
        return src;
    }
}

export {TrianglesColorRenderer};