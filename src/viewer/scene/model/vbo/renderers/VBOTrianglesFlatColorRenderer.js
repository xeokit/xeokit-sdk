import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesFlatColorRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, withSAO) {
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const lightsState = scene._lightsState;

        super(scene, instancing, primitive, withSAO, {
            progMode: "flatColorMode",

            getHash: () => [lightsState.getHash(), (withSAO ? "sao" : "nosao")],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            // colorFlag = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE | COLOR_TRANSPARENT
            renderPassFlag: 0,
            appendVertexDefinitions: (src) => {
                src.push("out vec4 vViewPosition;");
                src.push("out vec4 vColor;");
            },
            transformClipPos: clipPos => clipPos,
            needVertexColor: true,
            needPickColor: false,
            needGl_Position: false,
            needViewPosition: true,
            needViewMatrixNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => {
                src.push(`vViewPosition = ${view.viewPosition};`);
                src.push(`vColor = ${color} / 255.0;`);
            },
            appendFragmentDefinitions: (src) => {
                if (clipping) {
                    src.push("uniform float sliceThickness;");
                    src.push("uniform vec4 sliceColor;");
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
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix) => {
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
                src.push(`vec4 fragColor = vec4(lightAmbient.rgb * lightAmbient.a + reflectedColor, 1) * (${color});`);

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
            }
        });
    }

}
