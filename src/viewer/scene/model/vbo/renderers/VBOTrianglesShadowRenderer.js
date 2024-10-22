import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesShadowRenderer extends VBORenderer {

    constructor(scene, instancing) {
        super(scene, false, { instancing: instancing, primType: "triangleType", progMode: "shadowMode" });
    }

    _buildVertexShader() {
        const scene = this._scene;
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push('#version 300 es');
        src.push("// " + this._primType + " " + this._instancing + " " + this._progMode + " vertex shader");
        src.push("in vec3 position;");
        src.push("in vec4 color;");
        src.push("in float flags;");
        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }

        if (this._instancing) {
            src.push("in vec4 modelMatrixCol0;"); // Modeling matrix
            src.push("in vec4 modelMatrixCol1;");
            src.push("in vec4 modelMatrixCol2;");
        }

        this._addMatricesUniformBlockLines(src);

        src.push("uniform mat4 shadowProjMatrix;");
        src.push("uniform mat4 shadowViewMatrix;");

        if (clipping) {
            src.push("out vec4 vWorldPosition;");
            src.push("out float vFlags;");
        }
        src.push("void main(void) {");
        src.push(`int colorFlag = int(flags) & 0xF;`);
        src.push("bool visible = (colorFlag > 0);");
        src.push("bool transparent = ((float(color.a) / 255.0) < 1.0);");
        src.push("if (!visible || transparent) {");
        src.push("    gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
        src.push("} else {");
        if (this._instancing) {
            src.push("vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0);");
            src.push("worldPosition = worldMatrix * vec4(dot(worldPosition, modelMatrixCol0), dot(worldPosition, modelMatrixCol1), dot(worldPosition, modelMatrixCol2), 1.0);");
        } else {
            src.push("vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0));");
        }
        if (scene.entityOffsetsEnabled) {
            src.push("worldPosition.xyz = worldPosition.xyz + offset;");
        }
        src.push("vec4 viewPosition  = shadowViewMatrix * worldPosition;");
        if (clipping) {
            src.push("vWorldPosition = worldPosition;");
            src.push("vFlags = flags;");
        }
        src.push("gl_Position = shadowProjMatrix * viewPosition;");
        src.push("}");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push('#version 300 es');
        src.push("// " + this._primType + " " + this._instancing + " " + this._progMode + " fragment shader");
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("uniform float logDepthBufFC;");
            src.push("in float vFragDepth;");
        }
        if (clipping) {
            src.push("in vec4 vWorldPosition;");
            src.push("in float vFlags;");
            for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("vec4 encodeFloat( const in float v ) {");
        src.push("  const vec4 bitShift = vec4(256 * 256 * 256, 256 * 256, 256, 1.0);");
        src.push("  const vec4 bitMask = vec4(0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0);");
        src.push("  vec4 comp = fract(v * bitShift);");
        src.push("  comp -= comp.xxyz * bitMask;");
        src.push("  return comp;");
        src.push("}");
        src.push("out vec4 outColor;");
        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = (int(vFlags) >> 16 & 0xF) == 1;");
            src.push("  if (clippable) {");
            src.push("  float dist = 0.0;");
            for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
            src.push("  if (dist > 0.0) { discard; }");
            src.push("}");
        }
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("gl_FragDepth = log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }
        src.push("outColor = encodeFloat(gl_FragCoord.z);");
        src.push("}");
        return src;
    }
}
