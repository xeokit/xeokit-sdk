/**
 * @author xeolabs / https://github.com/xeolabs
 */

/**
 * @private
 */
const InstancingPickShaderSource = function (layer) {
    this.vertex = buildVertex(layer);
    this.fragment = buildFragment(layer);
};

function buildVertex(layer) {
    var scene = layer.model.scene;
    const clipsState = scene._clipsState;
    const clipping = clipsState.clips.length > 0;
    const src = [];

    src.push("// Instancing geometry picking vertex shader");

    src.push("attribute vec3 position;");
    src.push("attribute vec4 flags;");
    src.push("attribute vec4 pickColor;");

    src.push("attribute vec4 modelMatrixCol0;"); // Modeling matrix
    src.push("attribute vec4 modelMatrixCol1;");
    src.push("attribute vec4 modelMatrixCol2;");

    src.push("uniform mat4 viewMatrix;");
    src.push("uniform mat4 projMatrix;");
    src.push("uniform mat4 positionsDecodeMatrix;");

    if (clipping) {
        src.push("varying vec4 vWorldPosition;");
    }
    src.push("varying vec4 vPickColor;");
    src.push("void main(void) {");
    src.push("bool visible      = (float(flags.x) > 0.0);");
    src.push(`if (!visible) {`);
    src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
    src.push("} else {");
    src.push("  vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0); ");
    src.push("  worldPosition = vec4(dot(worldPosition, modelMatrixCol0), dot(worldPosition, modelMatrixCol1), dot(worldPosition, modelMatrixCol2), 1.0);");
    src.push("  vec4 viewPosition  = viewMatrix * worldPosition; ");
    src.push("  vPickColor = vec4(float(pickColor.r) / 255.0, float(pickColor.g) / 255.0, float(pickColor.b) / 255.0, float(pickColor.a) / 255.0);");
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
    const clipsState = scene._clipsState;
    const clipping = clipsState.clips.length > 0;
    const src = [];
    src.push("// Batched geometry picking fragment shader");
    src.push("precision mediump float;");
    if (clipping) {
        src.push("uniform bool clippable;");
        src.push("varying vec4 vWorldPosition;");
        for (var i = 0; i < clipsState.clips.length; i++) {
            src.push("uniform bool clipActive" + i + ";");
            src.push("uniform vec3 clipPos" + i + ";");
            src.push("uniform vec3 clipDir" + i + ";");
        }
    }
    src.push("varying vec4 vPickColor;");
    src.push("void main(void) {");
    if (clipping) {
        src.push("if (clippable) {");
        src.push("  float dist = 0.0;");
        for (var i = 0; i < clipsState.clips.length; i++) {
            src.push("if (clipActive" + i + ") {");
            src.push("   dist += clamp(dot(-clipDir" + i + ".xyz, vWorldPosition.xyz - clipPos" + i + ".xyz), 0.0, 1000.0);");
            src.push("}");
        }
        src.push("  if (dist > 0.0) { discard; }");
        src.push("}");
    }
    src.push("   gl_FragColor = vPickColor; ");
    src.push("}");
    return src;
}

export {InstancingPickShaderSource};