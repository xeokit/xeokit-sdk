/**
 * @private
 */

class PickTriangleShaderSource {
    constructor(mesh) {
        this.vertex = buildVertex(mesh);
        this.fragment = buildFragment(mesh);
    }
}

function buildVertex(mesh) {
    const scene = mesh.scene;
    const sectionPlanesState = scene._sectionPlanesState;
    const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
    const quantizedGeometry = !!mesh._geometry._state.compressGeometry;
    const src = [];
    src.push('#version 300 es');
    src.push("// Surface picking vertex shader");
    src.push("in vec3 position;");
    src.push("in vec4 color;");
    src.push("uniform mat4 modelMatrix;");
    src.push("uniform mat4 viewMatrix;");
    src.push("uniform mat4 projMatrix;");
    src.push("uniform vec3 offset;");
    if (clipping) {
        src.push("uniform bool clippable;");
        src.push("out vec4 vWorldPosition;");
    }
    if (scene.logarithmicDepthBufferEnabled) {
        src.push("uniform float logDepthBufFC;");
        src.push("out float vFragDepth;");
        src.push("bool isPerspectiveMatrix(mat4 m) {");
        src.push("    return (m[2][3] == - 1.0);");
        src.push("}");
        src.push("out float isPerspective;");
    }

    src.push("uniform vec2 pickClipPos;");

    src.push("vec4 remapClipPos(vec4 clipPos) {");
    src.push("    clipPos.xy /= clipPos.w;")
    src.push("    clipPos.xy -= pickClipPos;");
    src.push("    clipPos.xy *= clipPos.w;")
    src.push("    return clipPos;")
    src.push("}");

    src.push("out vec4 vColor;");
    if (quantizedGeometry) {
        src.push("uniform mat4 positionsDecodeMatrix;");
    }
    src.push("void main(void) {");
    src.push("vec4 localPosition = vec4(position, 1.0); ");
    if (quantizedGeometry) {
        src.push("localPosition = positionsDecodeMatrix * localPosition;");
    }
    src.push("   vec4 worldPosition = modelMatrix * localPosition; ");
    src.push("   worldPosition.xyz = worldPosition.xyz + offset;");
    src.push("   vec4 viewPosition = viewMatrix * worldPosition;");
    if (clipping) {
        src.push("   vWorldPosition = worldPosition;");
    }
    src.push("   vColor = color;");
    src.push("vec4 clipPos = projMatrix * viewPosition;");
    if (scene.logarithmicDepthBufferEnabled) {
        src.push("vFragDepth = 1.0 + clipPos.w;");
        src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
    }
    src.push("gl_Position = remapClipPos(clipPos);");
    src.push("}");
    return src;
}

function buildFragment(mesh) {
    const scene = mesh.scene;
    const sectionPlanesState = scene._sectionPlanesState;
    const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
    const src = [];
    src.push('#version 300 es');
    src.push("// Surface picking fragment shader");
    src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
    src.push("precision highp float;");
    src.push("precision highp int;");
    src.push("#else");
    src.push("precision mediump float;");
    src.push("precision mediump int;");
    src.push("#endif");
    src.push("in vec4 vColor;");
    if (scene.logarithmicDepthBufferEnabled) {
        src.push("in float isPerspective;");
        src.push("uniform float logDepthBufFC;");
        src.push("in float vFragDepth;");
    }
    if (clipping) {
        src.push("uniform bool clippable;");
        src.push("in vec4 vWorldPosition;");
        for (let i = 0; i < sectionPlanesState.getNumAllocatedSectionPlanes(); i++) {
            src.push("uniform bool sectionPlaneActive" + i + ";");
            src.push("uniform vec3 sectionPlanePos" + i + ";");
            src.push("uniform vec3 sectionPlaneDir" + i + ";");
        }
    }
    src.push("out vec4 outColor;");
    src.push("void main(void) {");
    if (clipping) {
        src.push("if (clippable) {");
        src.push("  float dist = 0.0;");
        for (let i = 0; i < sectionPlanesState.getNumAllocatedSectionPlanes(); i++) {
            src.push("if (sectionPlaneActive" + i + ") {");
            src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
            src.push("}");
        }
        src.push("  if (dist > 0.0) { discard; }");
        src.push("}");
    }
    if (scene.logarithmicDepthBufferEnabled) {
        src.push("gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
    }
    src.push("   outColor = vColor;");
    src.push("}");
    return src;
}

export {PickTriangleShaderSource};