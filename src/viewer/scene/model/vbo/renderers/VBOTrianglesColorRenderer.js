import {VBORenderer, createLightSetup} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesColorRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, withSAO) {
        const inputs = { };
        const gl = scene.canvas.gl;
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const lightSetup = createLightSetup(gl, scene._lightsState, false);

        super(scene, instancing, primitive, withSAO, {
            progMode: "colorMode", incrementDrawState: true,

            getHash: () => [lightSetup.getHash(), (withSAO ? "sao" : "nosao")],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => `${vFragDepth} + length(vec2(dFdx(${vFragDepth}), dFdy(${vFragDepth})))`),
            clippingCaps: false,
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE | COLOR_TRANSPARENT
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                lightSetup.appendDefinitions(src);
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
            needViewMatrixNormal: true,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                lightSetup.getDirectionalLights(view.viewMatrix, view.viewPosition).forEach(light => {
                    src.push(`reflectedColor += max(dot(-${view.viewNormal}, ${light.direction}), 0.0) * ${light.color};`);
                });
                src.push(`vColor = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * vec4(${color}) / 255.0;`);
            },
            appendFragmentDefinitions: (src) => {
                if (clipping) {
                    src.push("uniform float sliceThickness;");
                    src.push("uniform vec4 sliceColor;");
                }
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
            needViewMatrixInFragment: false,
            needGl_PointCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix, gl_PointCoord) => {
                const color = clipping ? `${sliced} ? sliceColor : vColor` : "vColor";
                if (withSAO) {
                    // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
                    // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
                    src.push("   float viewportWidth     = uSAOParams[0];");
                    src.push("   float viewportHeight    = uSAOParams[1];");
                    src.push("   float blendCutoff       = uSAOParams[2];");
                    src.push("   float blendFactor       = uSAOParams[3];");
                    src.push(`   vec2 uv                 = vec2(${gl_FragCoord}.x / viewportWidth, ${gl_FragCoord}.y / viewportHeight);`);
                    src.push("   float ambient           = smoothstep(blendCutoff, 1.0, unpackRGBToFloat(texture(uOcclusionTexture, uv))) * blendFactor;");
                    src.push("   outColor                = vec4((" + color + ").rgb * ambient, (" + color + ").a);");
                } else {
                    src.push("   outColor                = " + color + ";");
                }
            },
            setupInputs: (program) => {
                inputs.setLightsRenderState = lightSetup.setupInputs(program);
            },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => {
                inputs.setLightsRenderState(frameCtx);
            }
        });
    }

}
