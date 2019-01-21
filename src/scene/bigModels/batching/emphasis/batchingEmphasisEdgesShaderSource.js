import {RENDER_PASSES} from '../../renderPasses.js';

/**
 * @private
 * @constructor
 */
const BatchingEmphasisEdgesShaderSource = function (layer) {
    this.vertex = buildVertex(layer);
    this.fragment = buildFragment(layer);
};

function buildVertex(layer) {
    const sectionPlanesState = layer.model.scene._sectionPlanesState;
    const clipping = sectionPlanesState.sectionPlanes.length > 0;
    const src = [];

    src.push("// Batched geometry edges drawing vertex shader");
    src.push("precision mediump float;");
    src.push("precision mediump int;");
    src.push("uniform int renderPass;");
    src.push("attribute vec3 position;");
    src.push("attribute vec4 flags;");
    src.push("uniform mat4 viewMatrix;");
    src.push("uniform mat4 projMatrix;");
    src.push("uniform mat4 positionsDecodeMatrix;");
    if (clipping) {
        src.push("varying vec4 vWorldPosition;");
    }
    src.push("uniform vec4 color;");

    src.push("void main(void) {");

    /*
     pass 0 - opaque, non-ghosted objects only
     pass 1 - transparent, non-ghosted objects only
     pass 2 - ghosted objects only
     pass 3 - highlighted objects only
     */
    src.push("bool visible      = (float(flags.x) > 0.0);");
    src.push("bool ghosted      = (float(flags.y) > 0.0);");
    src.push("bool highlighted  = (float(flags.z) > 0.0);");

    src.push("bool transparent  = ((float(color.a) / 255.0) < 1.0);");

    src.push(`if (!visible || (renderPass == ${RENDER_PASSES.OPAQUE} && (transparent || ghosted)) || (renderPass == ${RENDER_PASSES.TRANSPARENT} && (!transparent || ghosted)) || (renderPass == ${RENDER_PASSES.GHOSTED} && !ghosted) || (renderPass == ${RENDER_PASSES.HIGHLIGHTED} && !highlighted)) {`);
    src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
    src.push("} else {");

    src.push("  vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0); ");
    src.push("  vec4 viewPosition  = viewMatrix * worldPosition; ");
    if (clipping) {
        src.push("  vWorldPosition = worldPosition;");
    }
    src.push("  gl_Position = projMatrix * viewPosition;");
    src.push("}");
    src.push("}");
    return src;
}

function buildFragment(layer) {
    const scene = layer.model.scene;
    const sectionPlanesState = scene._sectionPlanesState;
    let i;
    let len;
    const clipping = sectionPlanesState.sectionPlanes.length > 0;
    const src = [];
    src.push("// Batched geometry edges drawing fragment shader");
    src.push("precision mediump float;");
    src.push("precision mediump int;");
    if (clipping) {
        src.push("varying vec4 vWorldPosition;");
        src.push("uniform bool clippable;");
        for (i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
            src.push("uniform bool sectionPlaneActive" + i + ";");
            src.push("uniform vec3 sectionPlanePos" + i + ";");
            src.push("uniform vec3 sectionPlaneDir" + i + ";");
        }
    }
    src.push("uniform vec4 color;");
    src.push("void main(void) {");
    if (clipping) {
        src.push("if (clippable) {");
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

export {BatchingEmphasisEdgesShaderSource};