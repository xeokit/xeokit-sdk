import {DTXTrianglesDrawable} from "../DTXTrianglesDrawable.js";
import {math} from "../../../../math/math.js";

const tempVec4a = math.vec4();

/**
 * @private
 */
export class DTXTrianglesColorRenderer {

    constructor(scene, withSAO) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const inputs = { };
        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesDrawable("DTXTrianglesColorRenderer", scene, true, {
            getHash: () => [scene._lightsState.getHash(), (withSAO ? "sao" : "nosao")],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: camera.viewMatrix,
                projMatrix: camera.projMatrix,
                eye: camera.eye,
                far: camera.project.far
            }),
            // flags.x = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE
            renderPassFlag: 0,
            cullOnAlphaZero: true,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec4 lightAmbient;");
                const lightsState = scene._lightsState;
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
                src.push("out vec4 vColor;");
            },
            transformClipPos: clipPos => clipPos,
            needVertexColor: true,
            needPickColor: false,
            needGl_Position: false,
            needViewMatrixPositionNormal: true,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => {
                const lightsState = scene._lightsState;
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                src.push("vec3 viewLightDir = vec3(0.0, 0.0, -1.0);");
                src.push("float lambertian = 1.0;");
                for (let i = 0, len = lightsState.lights.length; i < len; i++) {
                    const light = lightsState.lights[i];
                    if (light.type === "ambient") {
                        continue;
                    }
                    if (light.type === "dir") {
                        if (light.space === "view") {
                            src.push(`viewLightDir = normalize(lightDir${i});`);
                        } else {
                            src.push(`viewLightDir = normalize((${view.viewMatrix} * vec4(lightDir${i}, 0.0)).xyz);`);
                        }
                    } else if (light.type === "point") {
                        if (light.space === "view") {
                            src.push(`viewLightDir = -normalize(lightPos${i} - ${view.viewPosition}.xyz);`);
                        } else {
                            src.push(`viewLightDir = -normalize((${view.viewMatrix} * vec4(lightPos${i}, 0.0)).xyz);`);
                        }
                    } else if (light.type === "spot") {
                        if (light.space === "view") {
                            src.push(`viewLightDir = normalize(lightDir${i});`);
                        } else {
                            src.push(`viewLightDir = normalize((${view.viewMatrix} * vec4(lightDir${i}, 0.0)).xyz);`);
                        }
                    } else {
                        continue;
                    }
                    src.push(`lambertian = max(dot(-${view.viewNormal}, viewLightDir), 0.0);`);
                    src.push(`reflectedColor += lambertian * (lightColor${i}.rgb * lightColor${i}.a);`);
                }
                src.push(`vColor = vec4(lightAmbient.rgb * lightAmbient.a + reflectedColor, 1) * vec4(${color}) / 255.0;`);
            },
            appendFragmentDefinitions: (src) => {
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
            needvWorldPosition: false,
            needGl_FragCoord: withSAO,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => {
                if (withSAO) {
                    // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
                    // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
                    src.push("   float viewportWidth     = uSAOParams[0];");
                    src.push("   float viewportHeight    = uSAOParams[1];");
                    src.push("   float blendCutoff       = uSAOParams[2];");
                    src.push("   float blendFactor       = uSAOParams[3];");
                    src.push(`   vec2 uv                 = vec2(${gl_FragCoord}.x / viewportWidth, ${gl_FragCoord}.y / viewportHeight);`);
                    src.push("   float ambient           = smoothstep(blendCutoff, 1.0, unpackRGBToFloat(texture(uOcclusionTexture, uv))) * blendFactor;");
                    src.push("   outColor            = vec4(vColor.rgb * ambient, vColor.a);");
                } else {
                    src.push("   outColor            = vColor;");
                }
            },
            setupInputs: (program) => {
                inputs.uLightAmbient = program.getLocation("lightAmbient");
                inputs.uLightColor = [];
                inputs.uLightDir = [];
                inputs.uLightPos = [];
                inputs.uLightAttenuation = [];
                const lights = scene._lightsState.lights;
                for (let i = 0, len = lights.length; i < len; i++) {
                    const light = lights[i];
                    switch (light.type) {
                    case "dir":
                        inputs.uLightColor[i] = program.getLocation("lightColor" + i);
                        inputs.uLightPos[i] = null;
                        inputs.uLightDir[i] = program.getLocation("lightDir" + i);
                        break;
                    case "point":
                        inputs.uLightColor[i] = program.getLocation("lightColor" + i);
                        inputs.uLightPos[i] = program.getLocation("lightPos" + i);
                        inputs.uLightDir[i] = null;
                        inputs.uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                        break;
                    case "spot":
                        inputs.uLightColor[i] = program.getLocation("lightColor" + i);
                        inputs.uLightPos[i] = program.getLocation("lightPos" + i);
                        inputs.uLightDir[i] = program.getLocation("lightDir" + i);
                        inputs.uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                        break;
                    }
                }
                if (withSAO) {
                    inputs.uOcclusionTexture = program.getSampler("uOcclusionTexture");
                    inputs.uSAOParams = program.getLocation("uSAOParams");
                }
            },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => {
                const lightsState = scene._lightsState;
                if (inputs.uLightAmbient) {
                    gl.uniform4fv(inputs.uLightAmbient, lightsState.getAmbientColorAndIntensity());
                }
                const lights = lightsState.lights;
                for (let i = 0, len = lights.length; i < len; i++) {
                    const light = lights[i];
                    if (inputs.uLightColor[i]) {
                        gl.uniform4f(inputs.uLightColor[i], light.color[0], light.color[1], light.color[2], light.intensity);
                    }
                    if (inputs.uLightPos[i]) {
                        gl.uniform3fv(inputs.uLightPos[i], light.pos);
                        if (inputs.uLightAttenuation[i]) {
                            gl.uniform1f(inputs.uLightAttenuation[i], light.attenuation);
                        }
                    }
                    if (inputs.uLightDir[i]) {
                        gl.uniform3fv(inputs.uLightDir[i], light.dir);
                    }
                }
                if (withSAO) {
                    const sao = scene.sao;
                    const saoEnabled = sao.possible;
                    if (saoEnabled) {
                        const viewportWidth = gl.drawingBufferWidth;
                        const viewportHeight = gl.drawingBufferHeight;
                        tempVec4a[0] = viewportWidth;
                        tempVec4a[1] = viewportHeight;
                        tempVec4a[2] = sao.blendCutoff;
                        tempVec4a[3] = sao.blendFactor;
                        gl.uniform4fv(inputs.uSAOParams, tempVec4a);
                        inputs.uOcclusionTexture.bindTexture(frameCtx.occlusionTexture, 10);
                    }
                }
            },
            getGlMode: (frameCtx) => gl.TRIANGLES
        });
    }
}
