import {VBORenderer, createLightSetup, createSAOSetup} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOColorRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, withSAO) {
        const gl = scene.canvas.gl;
        const lightSetup = (primitive !== "points") && (primitive !== "lines") && createLightSetup(gl, scene._lightsState, false);
        const sao = withSAO && createSAOSetup(gl, scene);

        super(scene, instancing, primitive, {
            progMode: "colorMode", incrementDrawState: true,

            getHash: () => [lightSetup ? lightSetup.getHash() : "-", sao ? "sao" : "nosao"],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => ((primitive !== "points") && (primitive !== "lines")) ? `${vFragDepth} + length(vec2(dFdx(${vFragDepth}), dFdy(${vFragDepth})))` : vFragDepth),
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE | COLOR_TRANSPARENT
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                lightSetup && lightSetup.appendDefinitions(src);
                src.push("out vec4 vColor;");
            },
            filterIntensityRange: true,
            appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
                const vColor = (primitive === "points") ? `vec4(${color}.rgb / 255.0, 1.0)` : `${color} / 255.0`;
                if (lightSetup) {
                    src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                    lightSetup.getDirectionalLights(view.viewMatrix, view.viewPosition).forEach(light => {
                        src.push(`reflectedColor += max(dot(-${view.viewNormal}, ${light.direction}), 0.0) * ${light.color};`);
                    });
                    src.push(`vColor = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * ${vColor};`);
                } else {
                    src.push(`vColor = ${vColor};`);
                }
            },
            appendFragmentDefinitions: (src) => {
                sao && sao.appendDefinitions(src);
                src.push("in vec4 vColor;");
                src.push("out vec4 outColor;");
            },
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
                if ((primitive === "points") || (primitive === "lines")) {
                    src.push("outColor = vColor;");
                } else {
                    src.push(`vec4 fragColor = ${sliceColorOr("vColor")};`);
                    src.push("outColor = " + (sao ? ("vec4(fragColor.rgb * " + sao.getAmbient(gl_FragCoord) + ", fragColor.a)") : "fragColor") + ";");
                }
            },
            setupInputs: (program) => {
                const setLightsRenderState = lightSetup && lightSetup.setupInputs(program);
                const setSAOState = sao && sao.setupInputs(program);
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    setLightsRenderState && setLightsRenderState(frameCtx);
                    setSAOState && setSAOState(frameCtx);
                };
            }
        });
    }

}
