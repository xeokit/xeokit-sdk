import {VBORenderer} from "../VBORenderer.js";

const SNAPPING_LOG_DEPTH_BUF_ENABLED = true; // Improves occlusion accuracy at distance

/**
 * @private
 */
export class VBOPointsSnapRenderer extends VBORenderer {

    constructor(scene, instancing, isSnapInit) {
        super(scene, false, { instancing: instancing, primType: "pointType", progMode: isSnapInit ? "snapInitMode" : "snapMode" });
    }

    _buildVertexShader() {
        const isSnapInit = this._progMode === "snapInitMode";
        const scene = this._scene;
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const src = [];
        src.push('#version 300 es');
        src.push("// " + this._primType + " " + this._instancing + " " + this._progMode + " vertex shader");
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("precision highp usampler2D;");
        src.push("precision highp isampler2D;");
        src.push("precision highp sampler2D;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("precision mediump usampler2D;");
        src.push("precision mediump isampler2D;");
        src.push("precision mediump sampler2D;");
        src.push("#endif");
        src.push("uniform int renderPass;");
        src.push("in vec3 position;");
        if (isSnapInit) {
            src.push("in vec4 pickColor;");
        }
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

        src.push("uniform vec2 snapVectorA;");
        src.push("uniform vec2 snapInvVectorAB;");
        if ((! this._instancing) && isSnapInit) {
            src.push("uniform float pointSize;");
        }
        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("bool isPerspectiveMatrix(mat4 m) {");
            src.push("    return (m[2][3] == - 1.0);");
            src.push("}");
            src.push("out float isPerspective;");
        }
        src.push("vec2 remapClipPos(vec2 clipPos) {");
        src.push("    float x = (clipPos.x - snapVectorA.x) * snapInvVectorAB.x;");
        src.push("    float y = (clipPos.y - snapVectorA.y) * snapInvVectorAB.y;");
        src.push("    return vec2(x, y);")
        src.push("}");
        if (isSnapInit) {
            src.push("flat out vec4 vPickColor;");
        }
        if (clipping || isSnapInit) {
            src.push("out vec4 vWorldPosition;");
        }
        if (clipping) {
            src.push("out float vFlags;");
        }
        src.push("out highp vec3 relativeToOriginPosition;");
        src.push("void main(void) {");
        // pickFlag = NOT_RENDERED | PICK
        // renderPass = PICK
        src.push(`int pickFlag = int(flags) >> 12 & 0xF;`);
        src.push(`if (pickFlag != renderPass) {`);
        src.push("      gl_Position = vec4(" + (isSnapInit ? "0.0" : "2.0") + ", 0.0, 0.0, 0.0);"); // Cull vertex
        src.push("  } else {");
        if (this._instancing) {
            src.push("      vec4 worldPosition = positionsDecodeMatrix * vec4(position, 1.0);");
            src.push("      worldPosition = worldMatrix * vec4(dot(worldPosition, modelMatrixCol0), dot(worldPosition, modelMatrixCol1), dot(worldPosition, modelMatrixCol2), 1.0);");
        } else {
            src.push("      vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0));");
        }
        if (scene.entityOffsetsEnabled) {
            src.push("      worldPosition.xyz = worldPosition.xyz + offset;");
        }
        src.push("      relativeToOriginPosition = worldPosition.xyz;");
        src.push("      vec4 viewPosition  = viewMatrix * worldPosition;");
        if (clipping || isSnapInit) {
            src.push("      vWorldPosition = worldPosition;");
        }
        if (clipping) {
            src.push("      vFlags = flags;");
        }
        if (isSnapInit) {
            src.push("vPickColor = pickColor;");
        }
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        src.push("float tmp = clipPos.w;")
        src.push("clipPos.xyzw /= tmp;")
        src.push("clipPos.xy = remapClipPos(clipPos.xy);");
        src.push("clipPos.xyzw *= tmp;");
        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("gl_Position = clipPos;");
        if ((! this._instancing) && isSnapInit) {
            src.push("gl_PointSize = pointSize;"); // Windows needs this?
        } else {
            src.push("gl_PointSize = 1.0;"); // Windows needs this?
        }
        src.push("  }");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const isSnapInit = this._progMode === "snapInitMode";
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
        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            src.push("in float isPerspective;");
            src.push("uniform float logDepthBufFC;");
            src.push("in float vFragDepth;");
        }
        src.push("uniform int layerNumber;");
        src.push("uniform vec3 coordinateScaler;");
        if (clipping || isSnapInit) {
            src.push("in vec4 vWorldPosition;");
        }
        if (isSnapInit) {
            src.push("flat in vec4 vPickColor;");
        }
        if (clipping) {
            src.push("in float vFlags;");
            for (let i = 0; i < sectionPlanesState.getNumAllocatedSectionPlanes(); i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in highp vec3 relativeToOriginPosition;");
        if (isSnapInit) {
            src.push("layout(location = 0) out highp ivec4 outCoords;");
            src.push("layout(location = 1) out highp ivec4 outNormal;");
            src.push("layout(location = 2) out lowp uvec4 outPickColor;");
        } else {
            src.push("out highp ivec4 outCoords;");
        }
        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = (int(vFlags) >> 16 & 0xF) == 1;");
            src.push("  if (clippable) {");
            src.push("      float dist = 0.0;");
            for (var i = 0; i < sectionPlanesState.getNumAllocatedSectionPlanes(); i++) {
                src.push("      if (sectionPlaneActive" + i + ") {");
                src.push("          dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("      }");
            }
            src.push("      if (dist > 0.0) { discard; }");
            src.push("  }");
        }
        if (SNAPPING_LOG_DEPTH_BUF_ENABLED) {
            if (isSnapInit) {
                src.push("    float dx = dFdx(vFragDepth);");
                src.push("    float dy = dFdy(vFragDepth);");
                src.push("    float diff = sqrt(dx*dx+dy*dy);");
            } else {
                src.push("    float diff = 0.0;");
            }
            src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth + diff ) * logDepthBufFC * 0.5;");
        }
        src.push("outCoords = ivec4(relativeToOriginPosition.xyz*coordinateScaler.xyz, " + (isSnapInit ? "-" : "") + "layerNumber);");

        if (isSnapInit) {
            // src.push("vec3 xTangent = dFdx( vWorldPosition.xyz );");
            // src.push("vec3 yTangent = dFdy( vWorldPosition.xyz );");
            // src.push("vec3 worldNormal = normalize( cross( xTangent, yTangent ) );");
            src.push(`outNormal = ivec4(1.0, 1.0, 1.0, 1.0);`);
            src.push("outPickColor = uvec4(vPickColor);");
        }
        src.push("}");
        return src;
    }
}
