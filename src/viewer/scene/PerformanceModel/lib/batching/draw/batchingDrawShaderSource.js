import {RENDER_PASSES} from '../../renderPasses.js';

/**
 * @private
 * @constructor
 */
const BatchingDrawShaderSource = function (scene, withSAO) {
    this.vertex = buildVertex(scene);
    this.fragment = buildFragment(scene, withSAO);
};

function buildVertex(scene) {
    const sectionPlanesState = scene._sectionPlanesState;
    const lightsState = scene._lightsState;
    const clipping = sectionPlanesState.sectionPlanes.length > 0;
    let i;
    let len;
    let light;
    const src = [];

    src.push("// Batched geometry drawing vertex shader");

    src.push("uniform int renderPass;");

    src.push("attribute vec3 position;");
    src.push("attribute vec3 normal;");
    src.push("attribute vec4 color;");
    src.push("attribute vec4 flags;");
    src.push("attribute vec4 flags2;");
    src.push("attribute vec3 offset;");

    src.push("uniform mat4 viewMatrix;");
    src.push("uniform mat4 projMatrix;");
    src.push("uniform mat4 viewNormalMatrix;");
    src.push("uniform mat4 positionsDecodeMatrix;");

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
        src.push("varying vec4 vWorldPosition;");
        src.push("varying vec4 vFlags2;");
    }
    src.push("varying vec4 vColor;");

    src.push("void main(void) {");

    src.push("bool visible      = (float(flags.x) > 0.0);");
    src.push("bool xrayed       = (float(flags.y) > 0.0);");
    src.push("bool highlighted  = (float(flags.z) > 0.0);");
    src.push("bool selected     = (float(flags.w) > 0.0);");
    src.push("bool culled       = (float(flags2.w) > 0.0);");

    src.push("bool transparent  = ((float(color.a) / 255.0) < 1.0);");

    src.push(`if (
    culled || !visible || 
    (renderPass == ${RENDER_PASSES.NORMAL_OPAQUE} && (transparent || xrayed)) || 
    (renderPass == ${RENDER_PASSES.NORMAL_TRANSPARENT} && (!transparent || xrayed || highlighted || selected)) || 
    (renderPass == ${RENDER_PASSES.XRAYED} && (!xrayed || highlighted || selected)) || 
    (renderPass == ${RENDER_PASSES.HIGHLIGHTED} && !highlighted) ||
    (renderPass == ${RENDER_PASSES.SELECTED} && !selected)) {`);

    src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex

    src.push("} else {");

    src.push("vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0); ");
    src.push("worldPosition.xyz = worldPosition.xyz + offset;");
    src.push("vec4 viewPosition  = viewMatrix * worldPosition; ");

    src.push("vec4 worldNormal =  vec4(octDecode(normal.xy), 0.0); ");

    src.push("vec3 viewNormal = normalize((viewNormalMatrix * worldNormal).xyz);");

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
                src.push("viewLightDir = normalize(lightPos" + i + " - viewPosition.xyz);");
            } else {
                src.push("viewLightDir = normalize((viewMatrix * vec4(lightPos" + i + ", 0.0)).xyz);");
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

    if (clipping) {
        src.push("vWorldPosition = worldPosition;");
        src.push("vFlags2 = flags2;");
    }
    src.push("gl_Position = projMatrix * viewPosition;");
    src.push("}");
    src.push("}");
    return src;
}

function buildFragment(scene, withSAO) {
    const sectionPlanesState = scene._sectionPlanesState;
    let i;
    let len;
    const clipping = sectionPlanesState.sectionPlanes.length > 0;
    const src = [];
    src.push("// Batched geometry drawing fragment shader");

    src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
    src.push("precision highp float;");
    src.push("precision highp int;");
    src.push("#else");
    src.push("precision mediump float;");
    src.push("precision mediump int;");
    src.push("#endif");

    if (withSAO) {
        src.push("uniform sampler2D uOcclusionTexture;");
        src.push("uniform vec4      uSAOParams;");

        src.push("const float       packUpscale = 256. / 255.;");
        src.push("const float       unpackDownScale = 255. / 256.;");
        src.push("const vec3        packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );");
        src.push("const vec4        unPackFactors = unpackDownScale / vec4( packFactors, 1. );");

        src.push("float unpackRGBAToDepth( const in vec4 v ) {");
        src.push("    return dot( v, unPackFactors );");
        src.push("}");
    }
    if (clipping) {
        src.push("varying vec4 vWorldPosition;");
        src.push("varying vec4 vFlags2;");
        for (i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
            src.push("uniform bool sectionPlaneActive" + i + ";");
            src.push("uniform vec3 sectionPlanePos" + i + ";");
            src.push("uniform vec3 sectionPlaneDir" + i + ";");
        }
    }
    src.push("varying vec4 vColor;");
    src.push("void main(void) {");
    if (clipping) {
        src.push("  bool clippable = (float(vFlags2.x) > 0.0);");
        src.push("  if (clippable) {");
        src.push("  float dist = 0.0;");
        for (i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
            src.push("if (sectionPlaneActive" + i + ") {");
            src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
            src.push("}");
        }
        src.push("  if (dist > 0.0) { discard; }");
        src.push("}");
    }
    if (withSAO) {
        // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
        // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
        src.push("   float viewportWidth     = uSAOParams[0];");
        src.push("   float viewportHeight    = uSAOParams[1];");
        src.push("   float blendCutoff       = uSAOParams[2];");
        src.push("   float blendFactor       = uSAOParams[3];");
        src.push("   vec2 uv                 = vec2(gl_FragCoord.x / viewportWidth, gl_FragCoord.y / viewportHeight);");
        src.push("   float ambient           = smoothstep(blendCutoff, 1.0, unpackRGBAToDepth(texture2D(uOcclusionTexture, uv))) * blendFactor;");
        src.push("   gl_FragColor            = vec4(vColor.rgb * ambient, vColor.a);");
    } else {
        src.push("   gl_FragColor            = vColor;");
    }
    src.push("}");
    return src;
}

export {BatchingDrawShaderSource};