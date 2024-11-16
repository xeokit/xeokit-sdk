import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesColorTextureRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, withSAO, useAlphaCutoff) {
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const lightsState = scene._lightsState;
        const gammaOutput = scene.gammaOutput; // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.

        super(scene, instancing, primitive, withSAO, {
            progMode: "colorTextureMode", incrementDrawState: true, useAlphaCutoff: useAlphaCutoff,

            getHash: () => [lightsState.getHash(), (withSAO ? "sao" : "nosao"), gammaOutput, useAlphaCutoff ? "alphaCutoffYes" : "alphaCutoffNo"],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE | COLOR_TRANSPARENT
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                src.push("uniform mat3 uvDecodeMatrix;");
                src.push("in vec2 uv;");
                src.push("out vec4 vViewPosition;");
                src.push("out vec2 vUV;");
                src.push("out vec4 vColor;");
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: true,
            needPickColor: false,
            needGl_Position: false,
            needViewPosition: true,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vViewPosition = ${view.viewPosition};`);
                src.push("vUV = (uvDecodeMatrix * vec3(uv, 1.0)).xy;");
                src.push(`vColor = vec4(${color}) / 255.0;`);
            },
            appendFragmentDefinitions: (src) => {
                if (clipping) {
                    src.push("uniform float sliceThickness;");
                    src.push("uniform vec4 sliceColor;");
                }
                src.push("uniform sampler2D uColorMap;");
                if (withSAO) {
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
                src.push("vec4 sRGBToLinear( in vec4 value ) {");
                src.push("  return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.w );");
                src.push("}");

                if (gammaOutput) {
                    src.push("vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
                    src.push("  return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
                    src.push("}");
                }

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
                src.push("in vec2 vUV;");
                src.push("in vec4 vColor;");
                src.push("out vec4 outColor;");
            },
            sectionDiscardThreshold: clipping && "sliceThickness",
            needSliced: clipping,
            needvWorldPosition: false,
            needGl_FragCoord: true,
            needViewMatrixInFragment: true,
            needGl_PointCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix, gl_PointCoord) => {
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                src.push("vec3 viewLightDir = vec3(0.0, 0.0, -1.0);");
                src.push("float lambertian = 1.0;");

                src.push("vec3 xTangent = dFdx(vViewPosition.xyz);");
                src.push("vec3 yTangent = dFdy(vViewPosition.xyz);");
                src.push("vec3 viewNormal = normalize(cross(xTangent, yTangent));");

                for (let i = 0, len = lightsState.lights.length; i < len; i++) {
                    const light = lightsState.lights[i];
                    if (light.type === "ambient") {
                        continue;
                    }
                    if (light.type === "dir") {
                        if (light.space === "view") {
                            src.push(`viewLightDir = normalize(lightDir${i});`);
                        } else {
                            src.push(`viewLightDir = normalize((${viewMatrix} * vec4(lightDir${i}, 0.0)).xyz);`);
                        }
                    } else if (light.type === "point") {
                        if (light.space === "view") {
                            src.push(`viewLightDir = -normalize(lightPos${i} - vViewPosition.xyz);`);
                        } else {
                            src.push(`viewLightDir = -normalize((${viewMatrix} * vec4(lightPos${i}, 0.0)).xyz);`);
                        }
                    } else if (light.type === "spot") {
                        if (light.space === "view") {
                            src.push(`viewLightDir = normalize(lightDir${i});`);
                        } else {
                            src.push(`viewLightDir = normalize((${viewMatrix} * vec4(lightDir${i}, 0.0)).xyz);`);
                        }
                    } else {
                        continue;
                    }

                    src.push("lambertian = max(dot(-viewNormal, viewLightDir), 0.0);");
                    src.push(`reflectedColor += lambertian * (lightColor${i}.rgb * lightColor${i}.a);`);
                }

                const color = clipping ? `${sliced} ? sliceColor : vColor` : "vColor";
                src.push(`vec4 color = vec4(lightAmbient.rgb * lightAmbient.a + reflectedColor, 1) * (${color});`);

                src.push("vec4 sampleColor = sRGBToLinear(texture(uColorMap, vUV));");

                if (useAlphaCutoff) {
                    src.push("if (sampleColor.a < materialAlphaCutoff) { discard; }");
                }

                src.push("vec4 colorTexel = color * sampleColor;");

                src.push("float opacity = color.a;");

                if (withSAO) {
                    // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
                    // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
                    src.push("   float viewportWidth     = uSAOParams[0];");
                    src.push("   float viewportHeight    = uSAOParams[1];");
                    src.push("   float blendCutoff       = uSAOParams[2];");
                    src.push("   float blendFactor       = uSAOParams[3];");
                    src.push(`   vec2 uv                 = vec2(${gl_FragCoord}.x / viewportWidth, ${gl_FragCoord}.y / viewportHeight);`);
                    src.push("   float ambient           = smoothstep(blendCutoff, 1.0, unpackRGBToFloat(texture(uOcclusionTexture, uv))) * blendFactor;");
                    src.push("   outColor                = vec4(colorTexel.rgb * ambient, opacity);");
                } else {
                    src.push("   outColor                = vec4(colorTexel.rgb, opacity);");
                }
                if (gammaOutput) {
                    src.push("outColor = linearToGamma(outColor, gammaFactor);");
                }
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
