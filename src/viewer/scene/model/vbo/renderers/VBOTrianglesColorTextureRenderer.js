import {VBORenderer, createLightSetup} from "../VBORenderer.js";
import {WEBGL_INFO} from "../../../webglInfo.js";

/**
 * @private
 */
export class VBOTrianglesColorTextureRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, withSAO, useAlphaCutoff) {
        const inputs = { };
        const gl = scene.canvas.gl;
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const lightSetup = createLightSetup(gl, scene._lightsState, false);
        const maxTextureUnits = WEBGL_INFO.MAX_TEXTURE_IMAGE_UNITS;
        const gammaOutput = scene.gammaOutput; // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.

        super(scene, instancing, primitive, withSAO, {
            progMode: "colorTextureMode", incrementDrawState: true, useAlphaCutoff: useAlphaCutoff,

            getHash: () => [lightSetup.getHash(), (withSAO ? "sao" : "nosao"), gammaOutput, useAlphaCutoff ? "alphaCutoffYes" : "alphaCutoffNo"],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE | COLOR_TRANSPARENT
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                src.push("uniform mat3 uvDecodeMatrix;");
                src.push("out vec4 vViewPosition;");
                src.push("out vec2 vUV;");
                src.push("out vec4 vColor;");
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: true,
            needPickColor: false,
            needUV: true,
            needMetallicRoughness: false,
            needGl_Position: false,
            needViewPosition: true,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vViewPosition = ${view.viewPosition};`);
                src.push(`vUV = (uvDecodeMatrix * vec3(${uv}, 1.0)).xy;`);
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

                src.push("vec4 sRGBToLinear( in vec4 value ) {");
                src.push("  return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.w );");
                src.push("}");
                if (gammaOutput) {
                    src.push("uniform float gammaFactor;");
                    src.push("vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
                    src.push("  return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
                    src.push("}");
                }

                lightSetup.appendDefinitions(src);

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
                src.push("vec3 viewNormal = normalize(cross(dFdx(vViewPosition.xyz), dFdy(vViewPosition.xyz)));");
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                lightSetup.getDirectionalLights(viewMatrix, "vViewPosition").forEach(light => {
                    src.push(`reflectedColor += max(dot(-viewNormal, ${light.direction}), 0.0) * ${light.color};`);
                });

                const color = clipping ? `${sliced} ? sliceColor : vColor` : "vColor";
                src.push(`vec4 color = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * (${color});`);

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
            setupInputs: (program) => {
                inputs.uUVDecodeMatrix = program.getLocation("uvDecodeMatrix");
                inputs.uColorMap = program.getSampler("uColorMap");
                if (gammaOutput) {
                    inputs.uGammaFactor = program.getLocation("gammaFactor");
                }
                inputs.setLightsRenderState = lightSetup.setupInputs(program);
            },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => {
                const state = layer._state;
                gl.uniformMatrix3fv(inputs.uUVDecodeMatrix, false, state.uvDecodeMatrix);
                const colorTexture = state.textureSet.colorTexture;
                if (colorTexture) {
                    inputs.uColorMap.bindTexture(colorTexture.texture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                }
                if (gammaOutput) {
                    gl.uniform1f(inputs.uGammaFactor, scene.gammaFactor);
                }
                inputs.setLightsRenderState(frameCtx);
            }
        });
    }

}
