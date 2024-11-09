import {DTXTrianglesDrawable} from "../DTXTrianglesDrawable.js";
import {math} from "../../../../math/math.js";

/**
 * @private
 */
export class DTXTrianglesEdgesColorRenderer {

    constructor(scene) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const inputs = { };
        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesDrawable("DTXTrianglesEdgesColorRenderer", scene, false, {
            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: camera.viewMatrix,
                projMatrix: camera.projMatrix,
                eye: camera.eye,
                far: camera.project.far
            }),
            // flags.z = NOT_RENDERED | EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
            // renderPass = EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT
            renderPassFlag: 2,
            cullOnAlphaZero: true,
            appendVertexDefinitions: (src) => src.push("out vec4 vColor;"),
            transformClipPos: clipPos => clipPos,
            needVertexColor: true,
            needPickColor: false,
            needGl_Position: false,
            needViewMatrixPositionNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => src.push(`vColor = vec4(vec3(${color}.rgb) * 0.5, float(${color}.a)) / 255.0;`),
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vColor;");
                src.push("out vec4 outColor;");
            },
            needvWorldPosition: false,
            needGl_FragCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => src.push("outColor = vColor;"),
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { },
            getGlMode: (frameCtx) => gl.LINES
        });
    }
}
