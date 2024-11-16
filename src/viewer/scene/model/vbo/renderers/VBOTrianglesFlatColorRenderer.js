import {VBORenderer, createLightSetup} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesFlatColorRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, withSAO) {
        const inputs = { };
        const gl = scene.canvas.gl;
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const lightsState = scene._lightsState;
        const lightSetup = createLightSetup(gl, lightsState);

        super(scene, instancing, primitive, withSAO, {
            progMode: "flatColorMode",

            getHash: () => [lightsState.getHash(), (withSAO ? "sao" : "nosao")],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE | COLOR_TRANSPARENT
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                src.push("out vec4 vViewPosition;");
                src.push("out vec4 vColor;");
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: true,
            needPickColor: false,
            needUV: false,
            needMetallicRoughness: false,
            needGl_Position: false,
            needViewPosition: true,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push(`vViewPosition = ${view.viewPosition};`);
                src.push(`vColor = ${color} / 255.0;`);
            },
            appendFragmentDefinitions: (src) => {
                if (clipping) {
                    src.push("uniform float sliceThickness;");
                    src.push("uniform vec4 sliceColor;");
                }

                lightSetup.appendDefinitions(src);

                src.push("in vec4 vViewPosition;");
                src.push("in vec4 vColor;");
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
                src.push(`vec4 fragColor = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * (${color});`);

                if (withSAO) {
                    // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
                    // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
                    src.push("   float viewportWidth     = uSAOParams[0];");
                    src.push("   float viewportHeight    = uSAOParams[1];");
                    src.push("   float blendCutoff       = uSAOParams[2];");
                    src.push("   float blendFactor       = uSAOParams[3];");
                    src.push(`   vec2 uv                 = vec2(${gl_FragCoord}.x / viewportWidth, ${gl_FragCoord}.y / viewportHeight);`);
                    src.push("   float ambient           = smoothstep(blendCutoff, 1.0, unpackRGBToFloat(texture(uOcclusionTexture, uv))) * blendFactor;");
                    src.push("   outColor                = vec4(fragColor.rgb * ambient, fragColor.a);");
                } else {
                    src.push("   outColor                = fragColor;");
                }
            },
            setupInputs: (program) => {
                inputs.setLightsRenderState = lightSetup.setupInputs(program);
            },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => {
                inputs.setLightsRenderState();
            }
        });
    }

}
