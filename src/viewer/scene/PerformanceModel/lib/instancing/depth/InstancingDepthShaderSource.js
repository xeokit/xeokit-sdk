/**
 * @private
 */
const InstancingDepthShaderSource = function (scene) {
    this.vertex = buildVertex(scene);
    this.fragment = buildFragment(scene);
};

function buildVertex(scene) {
    const sectionPlanesState = scene._sectionPlanesState;
    const clipping = sectionPlanesState.sectionPlanes.length > 0;
    const src = [];
    src.push("// Instancing geometry depth drawing vertex shader");
    src.push("attribute vec3 position;");
    src.push("attribute vec4 color;");
    src.push("attribute vec4 flags;");
    if (clipping) {
        src.push("attribute vec4 flags2;");
    }
    src.push("attribute vec4 modelMatrixCol0;");
    src.push("attribute vec4 modelMatrixCol1;");
    src.push("attribute vec4 modelMatrixCol2;");
    src.push("uniform mat4 viewMatrix;");
    src.push("uniform mat4 projMatrix;");
    src.push("uniform mat4 positionsDecodeMatrix;");
    if (clipping) {
        src.push("varying vec4 vWorldPosition;");
        src.push("varying vec4 vFlags2;");
    }
    src.push("varying vec4 vViewPosition;");
    src.push("void main(void) {");
    src.push("bool visible      = (float(flags.x) > 0.0);");
    src.push("bool xrayed       = (float(flags.y) > 0.0);");
    src.push("bool transparent  = ((float(color.a) / 255.0) < 1.0);");
    src.push(`if (!visible || transparent || xrayed) {`);
    src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
    src.push("} else {");
    src.push("  vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0); ");
    src.push("  worldPosition = vec4(dot(worldPosition, modelMatrixCol0), dot(worldPosition, modelMatrixCol1), dot(worldPosition, modelMatrixCol2), 1.0);");
    src.push("  vec4 viewPosition  = viewMatrix * worldPosition; ");

    if (clipping) {
        src.push("vWorldPosition = worldPosition;");
        src.push("vFlags2 = flags2;");
    }
    src.push("  vViewPosition = viewPosition;");
    src.push("  gl_Position = projMatrix * viewPosition;");
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
    src.push("// Instancing geometry depth drawing fragment shader");

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
    src.push("varying vec4 vViewPosition;");

    src.push("const float   packUpScale = 256. / 255.;");
    src.push("const float   unpackDownscale = 255. / 256.;");
    src.push("const vec3    packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );");
    src.push("const vec4    unpackFactors = unpackDownscale / vec4( packFactors, 1. );");
    src.push("const float   shiftRight8 = 1.0 / 256.;");

    src.push("vec4 packDepthToRGBA( const in float v ) {");
    src.push("    vec4 r = vec4( fract( v * packFactors ), v );");
    src.push("    r.yzw -= r.xyz * shiftRight8;");
    src.push("    return r * packUpScale;");
    src.push("}");

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
        src.push("if (dist > 0.0) { discard; }");
        src.push("}");
    }
    src.push("    gl_FragColor = packDepthToRGBA( gl_FragCoord.z); ");
    src.push("}");
    return src;
}

export {InstancingDepthShaderSource};