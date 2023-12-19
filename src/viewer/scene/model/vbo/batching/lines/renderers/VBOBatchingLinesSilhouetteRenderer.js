import {VBOSceneModelLineBatchingRenderer} from "./VBOSceneModelLineBatchingRenderer.js";

/**
 * @private
 */
export class VBOBatchingLinesSilhouetteRenderer extends VBOSceneModelLineBatchingRenderer {

    drawLayer(frameCtx, batchingLayer, renderPass) {
        super.drawLayer(frameCtx, batchingLayer, renderPass, { colorUniform: true });
    }

    _buildVertexShader() {

        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.getNumAllocatedSectionPlanes() > 0;

        const src = [];
        src.push('#version 300 es');
        src.push("// Lines batching silhouette vertex shader");

        src.push("uniform int renderPass;");

        src.push("in vec3 position;");
        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }
        src.push("in float flags;");

        this._addMatricesUniformBlockLines(src);

        src.push("uniform vec4 color;");

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
        }

        if (clipping) {
            src.push("out vec4 vWorldPosition;");
            src.push("out float vFlags;");
        }

        src.push("void main(void) {");

        // silhouetteFlag = NOT_RENDERED | SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | | SILHOUETTE_XRAYED
        // renderPass = SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | | SILHOUETTE_XRAYED

        src.push(`int silhouetteFlag = int(flags) >> 4 & 0xF;`);
        src.push(`if (silhouetteFlag != renderPass) {`);
        src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
        src.push("} else {");

        src.push("      vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0)); ");
        if (scene.entityOffsetsEnabled) {
            src.push("      worldPosition.xyz = worldPosition.xyz + offset;");
        }
        src.push("vec4 viewPosition  = viewMatrix * worldPosition; ");
        if (clipping) {
            src.push("vWorldPosition = worldPosition;");
            src.push("vFlags = flags;");
        }
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
        }
        src.push("gl_Position = clipPos;");
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
        src.push("// Lines batching silhouette fragment shader");

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
        src.push("uniform vec4 color;");
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
        src.push("outColor = color;");
        src.push("}");
        return src;
    }
}
