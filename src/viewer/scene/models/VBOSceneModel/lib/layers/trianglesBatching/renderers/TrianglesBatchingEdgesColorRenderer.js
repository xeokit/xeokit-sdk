import {Program} from "../../../../../../webgl/Program.js";
import { VBOSceneModelTriangleBatchingEdgesRenderer } from "../../VBOSceneModelRenderers.js";

/**
 * @private
 */
class TrianglesBatchingEdgesColorRenderer extends VBOSceneModelTriangleBatchingEdgesRenderer {
    _getHash() {
        return this._scene._sectionPlanesState.getHash();
    }

    _allocate() {

        const scene = this._scene;
        const gl = scene.canvas.gl;

        this._program = new Program(gl, this._buildShader());

        if (this._program.errors) {
            this.errors = this._program.errors;
            return;
        }

        const program = this._program;

        this._uRenderPass = program.getLocation("renderPass");

        gl.uniformBlockBinding(
            program.handle,
            gl.getUniformBlockIndex(program.handle, "Matrices"),
            0 // layer.matricesUniformBlockBufferBindingPoint
        );

        this._uSectionPlanes = [];

        for (let i = 0, len = scene._sectionPlanesState.sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        this._aPosition = program.getAttribute("position");
        this._aColor = program.getAttribute("color");
        this._aOffset = program.getAttribute("offset");
        this._aFlags = program.getAttribute("flags");

        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }
    }

    _bindProgram() {

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const project = scene.camera.project;

        program.bind();

        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }
    }

    _buildShader() {
        return {
            vertex: this._buildVertexShader(),
            fragment: this._buildFragmentShader()
        };
    }

    _buildVertexShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push("#version 300 es");
        src.push("// Batched geometry edges drawing vertex shader");

        src.push("uniform int renderPass;");

        src.push("in vec3 position;");
        src.push("in vec4 color;");
        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }
        src.push("in float flags;");

        src.push("uniform Matrices {");
        src.push("    mat4 worldMatrix;");
        src.push("    mat4 viewMatrix;");
        src.push("    mat4 projMatrix;");
        src.push("    mat4 positionsDecodeMatrix;");
        src.push("};");

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("bool isPerspectiveMatrix(mat4 m) {");
            src.push("    return (m[2][3] == - 1.0);");
            src.push("}");
            src.push("out float isPerspective;");
        }

        if (clipping) {
            src.push("out vec4 vWorldPosition;");
            src.push("out float vFlags;");
        }

        src.push("out vec4 vColor;");
        src.push("void main(void) {");

        // edgeFlag = NOT_RENDERED | EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
        // renderPass = EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT

        src.push(`int edgeFlag = int(flags) >> 8 & 0xF;`);
        src.push(`if (edgeFlag != renderPass) {`);
        src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex

        src.push("} else {");

        src.push("      vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0)); ");
        if (scene.entityOffsetsEnabled) {
            src.push("      worldPosition.xyz = worldPosition.xyz + offset;");
        }
        src.push("      vec4 viewPosition  = viewMatrix * worldPosition; ");

        if (clipping) {
            src.push("  vWorldPosition = worldPosition;");
            src.push("  vFlags = flags;");
        }

        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (scene.logarithmicDepthBufferEnabled) {
           src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("gl_Position = clipPos;");
        //src.push("vColor = vec4(float(color.r-100.0) / 255.0, float(color.g-100.0) / 255.0, float(color.b-100.0) / 255.0, float(color.a) / 255.0);");
        src.push("vColor = vec4(float(color.r*0.5) / 255.0, float(color.g*0.5) / 255.0, float(color.b*0.5) / 255.0, float(color.a) / 255.0);");
        src.push("}");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push("#version 300 es");
        src.push("// Batched geometry edges drawing fragment shader");
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
            src.push("in vec4 vWorldPosition;");
            src.push("in float vFlags;");
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in vec4 vColor;");
        src.push("out vec4 outColor;");
        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = (int(vFlags) >> 16 & 0xF) == 1;");
            src.push("  if (clippable) {");
            src.push("  float dist = 0.0;");
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
            src.push("  if (dist > 0.0) { discard; }");
            src.push("}");
        }
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }
        src.push("outColor = vColor;");
        src.push("}");
        return src;
    }
}

export {TrianglesBatchingEdgesColorRenderer};