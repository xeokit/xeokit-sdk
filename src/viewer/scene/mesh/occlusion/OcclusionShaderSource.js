/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {WEBGL_INFO} from "../../webglInfo.js";

/**
 * @private
 */
class OcclusionShaderSource {
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
    const billboard = mesh._state.billboard;
    const stationary = mesh._state.stationary;
    const src = [];
    src.push('#version 300 es');
    src.push("// Mesh occlusion vertex shader");
    src.push("in vec3 position;");
    src.push("uniform mat4 modelMatrix;");
    src.push("uniform mat4 viewMatrix;");
    src.push("uniform mat4 projMatrix;");
    src.push("uniform vec3 offset;");
    src.push("uniform vec3 scale;");
    if (quantizedGeometry) {
        src.push("uniform mat4 positionsDecodeMatrix;");
    }
    if (clipping) {
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
    if (billboard === "spherical" || billboard === "cylindrical") {
        src.push("void billboard(inout mat4 mat) {");
        src.push("   mat[0][0] = scale[0];");
        src.push("   mat[0][1] = 0.0;");
        src.push("   mat[0][2] = 0.0;");
        if (billboard === "spherical") {
            src.push("   mat[1][0] = 0.0;");
            src.push("   mat[1][1] = scale[1];");
            src.push("   mat[1][2] = 0.0;");
        }
        src.push("   mat[2][0] = 0.0;");
        src.push("   mat[2][1] = 0.0;");
        src.push("   mat[2][2] =1.0;");
        src.push("}");
    }
    src.push("void main(void) {");
    src.push("vec4 localPosition = vec4(position, 1.0); ");
    src.push("vec4 worldPosition;");
    if (quantizedGeometry) {
        src.push("localPosition = positionsDecodeMatrix * localPosition;");
    }
    src.push("mat4 viewMatrix2 = viewMatrix;");
    src.push("mat4 modelMatrix2 = modelMatrix;");
    if (stationary) {
        src.push("viewMatrix2[3][0] = viewMatrix2[3][1] = viewMatrix2[3][2] = 0.0;")
    }
    if (billboard === "spherical" || billboard === "cylindrical") {
        src.push("mat4 modelViewMatrix = viewMatrix2 * modelMatrix2;");
        src.push("billboard(modelMatrix2);");
        src.push("billboard(viewMatrix2);");
        src.push("billboard(modelViewMatrix);");
        src.push("worldPosition = modelMatrix2 * localPosition;");
        src.push("worldPosition.xyz = worldPosition.xyz + offset;");
        src.push("vec4 viewPosition = modelViewMatrix * localPosition;");
    } else {
        src.push("worldPosition = modelMatrix2 * localPosition;");
        src.push("worldPosition.xyz = worldPosition.xyz + offset;");
        src.push("vec4 viewPosition  = viewMatrix2 * worldPosition; ");
    }
    if (clipping) {
        src.push("   vWorldPosition = worldPosition;");
    }
    src.push("vec4 clipPos = projMatrix * viewPosition;");
    if (scene.logarithmicDepthBufferEnabled) {
        src.push("vFragDepth = 1.0 + clipPos.w;");
        src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
    }
    src.push("gl_Position = clipPos;");
    src.push("}");
    return src;
}

function buildFragment(mesh) {

    const scene = mesh.scene;
    const sectionPlanesState = scene._sectionPlanesState;
    const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
    const src = [];
    src.push('#version 300 es');
    src.push("// Mesh occlusion fragment shader");
    src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
    src.push("precision highp float;");
    src.push("precision highp int;");
    src.push("#else");
    src.push("precision mediump float;");
    src.push("precision mediump int;");
    src.push("#endif");

    if (scene.logarithmicDepthBufferEnabled) {
        src.push("in float isPerspective;");
        src.push("uniform float logDepthBufFC;");
        src.push("in float vFragDepth;");
    }

    if (clipping) {
        src.push("uniform bool clippable;");
        src.push("in vec4 vWorldPosition;");
        for (var i = 0; i < sectionPlanesState.getNumAllocatedSectionPlanes(); i++) {
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
        for (var i = 0; i < sectionPlanesState.getNumAllocatedSectionPlanes(); i++) {
            src.push("if (sectionPlaneActive" + i + ") {");
            src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
            src.push("}");
        }
        src.push("  if (dist > 0.0) { discard; }");
        src.push("}");
    }

    src.push("   outColor = vec4(0.0, 0.0, 1.0, 1.0); ");

    if (scene.logarithmicDepthBufferEnabled) {
        src.push("gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
    }

    src.push("}");

    return src;
}

export {OcclusionShaderSource};