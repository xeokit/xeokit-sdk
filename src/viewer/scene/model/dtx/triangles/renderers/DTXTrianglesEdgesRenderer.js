import {DTXTrianglesDrawable} from "../DTXTrianglesDrawable.js";
import {math} from "../../../../math/math.js";
import {RENDER_PASSES} from "../../../RENDER_PASSES.js";

const defaultColor = new Float32Array([0, 0, 0, 1]);

/**
 * @private
 */
export class DTXTrianglesEdgesRenderer {

    constructor(scene) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const inputs = { };
        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesDrawable("DTXTrianglesEdgesRenderer", scene, false, {
            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: camera.viewMatrix,
                projMatrix: camera.projMatrix,
                eye: camera.eye,
                far: camera.project.far
            }),
            // flags.z = NOT_RENDERED | EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
            // renderPass = EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
            renderPassFlag: "z",
            cullOnAlphaZero: true,
            appendVertexDefinitions: (src) => { },
            transformClipPos: clipPos => clipPos,
            needVertexColor: false,
            needPickColor: false,
            needGl_Position: false,
            needViewMatrixPositionNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => { },
            appendFragmentDefinitions: (src) => {
                src.push("uniform vec4 color;");
                src.push("out vec4 outColor;");
            },
            needvWorldPosition: false,
            needGl_FragCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => src.push("   outColor = color;"),
            setupInputs: (program) => { this._uColor = program.getLocation("color"); },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => {
                if (renderPass === RENDER_PASSES.EDGES_XRAYED) {
                    const material = scene.xrayMaterial._state;
                    const edgeColor = material.edgeColor;
                    const edgeAlpha = material.edgeAlpha;
                    gl.uniform4f(this._uColor, edgeColor[0], edgeColor[1], edgeColor[2], edgeAlpha);
                } else if (renderPass === RENDER_PASSES.EDGES_HIGHLIGHTED) {
                    const material = scene.highlightMaterial._state;
                    const edgeColor = material.edgeColor;
                    const edgeAlpha = material.edgeAlpha;
                    gl.uniform4f(this._uColor, edgeColor[0], edgeColor[1], edgeColor[2], edgeAlpha);
                } else if (renderPass === RENDER_PASSES.EDGES_SELECTED) {
                    const material = scene.selectedMaterial._state;
                    const edgeColor = material.edgeColor;
                    const edgeAlpha = material.edgeAlpha;
                    gl.uniform4f(this._uColor, edgeColor[0], edgeColor[1], edgeColor[2], edgeAlpha);
                } else {
                    gl.uniform4fv(this._uColor, defaultColor);
                }
            },
            getGlMode: (frameCtx) => gl.LINES
        });
    }
}
