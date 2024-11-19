import {VBORenderer, createLightSetup, createSAOSetup} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesFlatColorRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, withSAO) {
        const gl = scene.canvas.gl;
        const lightSetup = createLightSetup(gl, scene._lightsState, false);
        const sao = withSAO && createSAOSetup(gl, scene);

        super(scene, instancing, primitive, {
            progMode: "flatColorMode",

            getHash: () => [lightSetup.getHash(), sao ? "sao" : "nosao"],
            respectPointsMaterial: false,
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
                lightSetup.appendDefinitions(src);
                sao && sao.appendDefinitions(src);
                src.push("in vec4 vViewPosition;");
                src.push("in vec4 vColor;");
                src.push("out vec4 outColor;");
            },
            slicedColorIfClipping: true,
            needGl_FragCoord: sao,
            needViewMatrixInFragment: true,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                src.push("vec3 viewNormal = normalize(cross(dFdx(vViewPosition.xyz), dFdy(vViewPosition.xyz)));");
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                lightSetup.getDirectionalLights(viewMatrix, "vViewPosition").forEach(light => {
                    src.push(`reflectedColor += max(dot(-viewNormal, ${light.direction}), 0.0) * ${light.color};`);
                });

                src.push(`vec4 fragColor = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * ${sliceColorOr("vColor")};`);
                src.push("outColor = " + (sao ? ("vec4(fragColor.rgb * " + sao.getAmbient(gl_FragCoord) + ", fragColor.a)") : "fragColor") + ";");
            },
            setupInputs: (program) => {
                const setLightsRenderState = lightSetup.setupInputs(program);
                const setSAOState = sao && sao.setupInputs(program);
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    setLightsRenderState(frameCtx);
                    setSAOState && setSAOState(frameCtx);
                };
            }
        });
    }

}
