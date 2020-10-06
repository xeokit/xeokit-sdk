/**
 * @private
 */
class BatchingPickNormalsShaderSource {
    constructor(scene) {
        this.vertex = buildVertex(scene);
        this.fragment = buildFragment(scene);
    }
}

function buildVertex(scene) {
    const clipping = scene._sectionPlanesState.sectionPlanes.length > 0;
    const src = [];
    src.push("// Batched geometry normals vertex shader");

    src.push("attribute vec3 position;");
    src.push("attribute vec3 offset;");
    src.push("attribute vec3 normal;");
    src.push("attribute vec4 flags;");
    src.push("attribute vec4 flags2;");
    src.push("uniform bool pickInvisible;");
    src.push("uniform mat4 viewMatrix;");
    src.push("uniform mat4 projMatrix;");
    src.push("uniform mat4 positionsDecodeMatrix;");
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
    src.push("varying vec3 vWorldNormal;");
    src.push("void main(void) {");
    src.push("  bool visible   = (float(flags.x) > 0.0);");
    src.push("  bool pickable  = (float(flags2.z) > 0.0);");
    src.push("  bool culled    = (float(flags2.w) > 0.0);");
    src.push("  if (culled || (!pickInvisible && !visible) ||  !pickable) {");
    src.push("      gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
    src.push("  } else {");
    src.push("      vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0); ");
    src.push("      worldPosition.xyz = worldPosition.xyz + offset;");
    src.push("      vec4 viewPosition  = viewMatrix * worldPosition; ");
    src.push("      vec3 worldNormal =  octDecode(normal.xy); ");
    src.push("      vWorldNormal = worldNormal;");
    if (clipping) {
        src.push("      vWorldPosition = worldPosition;");
        src.push("      vFlags2 = flags2;");
    }
    src.push("      gl_Position = projMatrix * viewPosition;");
    src.push("  }");
    src.push("}");
    return src;
}

function buildFragment(scene) {
    const sectionPlanesState = scene._sectionPlanesState;
    const clipping = sectionPlanesState.sectionPlanes.length > 0;
    const src = [];
    src.push("// Batched geometry normals fragment shader");

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
        for (var i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
            src.push("uniform bool sectionPlaneActive" + i + ";");
            src.push("uniform vec3 sectionPlanePos" + i + ";");
            src.push("uniform vec3 sectionPlaneDir" + i + ";");
        }
    }
    src.push("varying vec3 vWorldNormal;");
    src.push("void main(void) {");
    if (clipping) {
        src.push("  bool clippable = (float(vFlags2.x) > 0.0);");
        src.push("  if (clippable) {");
        src.push("      float dist = 0.0;");
        for (var i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
            src.push("      if (sectionPlaneActive" + i + ") {");
            src.push("          dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
            src.push("      }");
        }
        src.push("      if (dist > 0.0) { discard; }");
        src.push("  }");
    }
    src.push("    gl_FragColor = vec4((vWorldNormal * 0.5) + 0.5, 1.0);");
    src.push("}");
    return src;
}

export {BatchingPickNormalsShaderSource};