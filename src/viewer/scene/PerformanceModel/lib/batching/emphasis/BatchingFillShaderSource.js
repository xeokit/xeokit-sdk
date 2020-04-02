import {RENDER_PASSES} from '../../renderPasses.js';

/**
 * @private
 */
const BatchingFillShaderSource = function (scene) {
    this.vertex = buildVertex(scene);
    this.fragment = buildFragment(scene);
};

function buildVertex(scene) {
    const sectionPlanesState = scene._sectionPlanesState;
    const lightsState = scene._lightsState;
    const clipping = sectionPlanesState.sectionPlanes.length > 0;
    let i;
    let len;
    let light;
    const src = [];

    src.push("// Batched fill vertex shader");

    src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
    src.push("precision highp float;");
    src.push("precision highp int;");
    src.push("#else");
    src.push("precision mediump float;");
    src.push("precision mediump int;");
    src.push("#endif");

    src.push("uniform int renderPass;");

    src.push("attribute vec3 position;");
    src.push("attribute vec4 flags;");
    src.push("attribute vec4 flags2;");
    src.push("uniform mat4 viewMatrix;");
    src.push("uniform mat4 projMatrix;");
    src.push("uniform mat4 positionsDecodeMatrix;");
    src.push("uniform vec4 color;");

    if (clipping) {
        src.push("varying vec4 vWorldPosition;");
        src.push("varying vec4 vFlags2;");
    }
    src.push("void main(void) {");

    src.push("bool visible      = (float(flags.x) > 0.0);");
    src.push("bool xrayed       = (float(flags.y) > 0.0);");
    src.push("bool highlighted  = (float(flags.z) > 0.0);");
    src.push("bool selected     = (float(flags.w) > 0.0);");
    src.push("bool clippable    = (float(flags2.x) > 0.0);");

    src.push("bool transparent  = (color.a < 1.0);"); // Color comes from EmphasisMaterial.fillColor, so is not quantized

    src.push(`if (
    !visible || 
    (renderPass == ${RENDER_PASSES.NORMAL_OPAQUE} && (transparent || xrayed)) || 
    (renderPass == ${RENDER_PASSES.NORMAL_TRANSPARENT} && (!transparent || xrayed || highlighted || selected)) || 
    (renderPass == ${RENDER_PASSES.XRAYED} && (!xrayed || highlighted || selected)) || 
    (renderPass == ${RENDER_PASSES.HIGHLIGHTED} && !highlighted) ||
    (renderPass == ${RENDER_PASSES.SELECTED} && !selected)) {`);

    src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
    src.push("} else {");

    src.push("vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0); ");
    src.push("vec4 viewPosition  = viewMatrix * worldPosition; ");
    if (clipping) {
        src.push("vWorldPosition = worldPosition;");
        src.push("vFlags2 = flags2;");
    }
    src.push("gl_Position = projMatrix * viewPosition;");
    src.push("}");
    src.push("}");
    return src;
}

function buildFragment(scene) {
    const sectionPlanesState = scene._sectionPlanesState;
    let i;
    let len;
    const clipping = sectionPlanesState.sectionPlanes.length > 0;
    const src = [];
    src.push("// Batched fill fragment shader");

    src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
    src.push("precision highp float;");
    src.push("precision highp int;");
    src.push("#else");
    src.push("precision mediump float;");
    src.push("precision mediump int;");
    src.push("#endif");

    if (clipping) {
        src.push("varying vec4 vWorldPosition;");
        src.push("varying vec4 vFlags2;");
        for (i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
            src.push("uniform bool sectionPlaneActive" + i + ";");
            src.push("uniform vec3 sectionPlanePos" + i + ";");
            src.push("uniform vec3 sectionPlaneDir" + i + ";");
        }
    }
    src.push("uniform vec4 color;");
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
    src.push("gl_FragColor = color;");
    src.push("}");
    return src;
}

export {BatchingFillShaderSource};