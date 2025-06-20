import {TrianglesInstancingRenderer} from "./TrianglesInstancingRenderer.js";

/**
 * @private
 */

export class TrianglesColorTextureRenderer extends TrianglesInstancingRenderer {
    _getHash() {
        const scene = this._scene;
        return [scene.gammaOutput, scene._lightsState.getHash(), scene._sectionPlanesState.getHash(), (this._withSAO ? "sao" : "nosao")].join(";");
    }

    drawLayer(frameCtx, layer, renderPass) {
        super.drawLayer(frameCtx, layer, renderPass, { incrementDrawState: true });
    }

    _buildVertexShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push("#version 300 es");
        src.push("// Instancing geometry drawing vertex shader");

        src.push("uniform int renderPass;");

        src.push("in vec3 position;");
        src.push("in vec4 color;");
        src.push("in vec2 uv;");
        src.push("in float flags;");

        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }

        src.push("in vec4 modelMatrixCol0;"); // Modeling matrix
        src.push("in vec4 modelMatrixCol1;");
        src.push("in vec4 modelMatrixCol2;");

        this._addMatricesUniformBlockLines(src);

        src.push("uniform mat3 uvDecodeMatrix;");

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
            src.push("out float vFlags;");
        }
        src.push("out vec4 vViewPosition;");
        src.push("out vec4 vColor;");
        src.push("out vec2 vUV;");

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
        src.push("vViewPosition = viewPosition;");
        src.push("vColor = vec4(float(color.r) / 255.0, float(color.g) / 255.0, float(color.b) / 255.0, float(color.a) / 255.0);");
        src.push("vUV = (uvDecodeMatrix * vec3(uv, 1.0)).xy;");

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
        const gammaOutput = scene.gammaOutput; // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.
        const lightsState = scene._lightsState;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const useAlphaCutoff = this._useAlphaCutoff;
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
        src.push("uniform sampler2D uColorMap;");
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
        src.push("uniform float gammaFactor;");
        src.push("vec4 linearToLinear( in vec4 value ) {");
        src.push("  return value;");
        src.push("}");
        src.push("vec4 sRGBToLinear( in vec4 value ) {");
        src.push("  return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.w );");
        src.push("}");
        src.push("vec4 gammaToLinear( in vec4 value) {");
        src.push("  return vec4( pow( value.xyz, vec3( gammaFactor ) ), value.w );");
        src.push("}");
        if (gammaOutput) {
            src.push("vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
            src.push("  return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
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
        this._addMatricesUniformBlockLines(src);

        src.push("uniform vec4 lightAmbient;");
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

        if (useAlphaCutoff) {
            src.push("uniform float materialAlphaCutoff;");
        }

        src.push("in vec4 vViewPosition;");
        src.push("in vec4 vColor;");
        src.push("in vec2 vUV;");
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

        src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
        src.push("vec3 viewLightDir = vec3(0.0, 0.0, -1.0);");

        src.push("float lambertian = 1.0;");

        src.push("vec3 xTangent = dFdx( vViewPosition.xyz );");
        src.push("vec3 yTangent = dFdy( vViewPosition.xyz );");
        src.push("vec3 viewNormal = normalize( cross( xTangent, yTangent ) );");

        for (let i = 0, len = lightsState.lights.length; i < len; i++) {
            const light = lightsState.lights[i];
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
                    src.push("viewLightDir = -normalize(lightPos" + i + " - vViewPosition.xyz);");
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

        src.push("vec4 color =  vec4((lightAmbient.rgb * lightAmbient.a * newColor.rgb) + (reflectedColor * newColor.rgb), newColor.a);");

        src.push("vec4 sampleColor = texture(uColorMap, vUV);");

        if (useAlphaCutoff) {
            src.push("if (sampleColor.a < materialAlphaCutoff) {");
            src.push("   discard;");
            src.push("}");
        }

        if (gammaOutput) {
            src.push("sampleColor = sRGBToLinear(sampleColor);");
        }

        src.push("vec4 colorTexel = color * sampleColor;");

        src.push("float opacity = color.a;");

        if (this._withSAO) {
            // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
            // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
            src.push("   float viewportWidth     = uSAOParams[0];");
            src.push("   float viewportHeight    = uSAOParams[1];");
            src.push("   float blendCutoff       = uSAOParams[2];");
            src.push("   float blendFactor       = uSAOParams[3];");
            src.push("   vec2 uv                 = vec2(gl_FragCoord.x / viewportWidth, gl_FragCoord.y / viewportHeight);");
            src.push("   float ambient           = smoothstep(blendCutoff, 1.0, unpackRGBToFloat(texture(uOcclusionTexture, uv))) * blendFactor;");

            src.push("   outColor                = vec4(colorTexel.rgb * ambient, opacity);");
        } else {
            src.push("   outColor                = vec4(colorTexel.rgb, opacity);");
        }

        if (gammaOutput) {
            src.push("outColor = linearToGamma(outColor, gammaFactor);");
        }

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }

        src.push("}");
        return src;
    }
}