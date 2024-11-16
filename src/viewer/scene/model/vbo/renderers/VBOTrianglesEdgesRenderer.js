import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesEdgesRenderer extends VBORenderer {

    constructor(scene, instancing, primitive, colorUniform) {
        super(scene, instancing, primitive, false, {
            progMode: "edgesMode", edges: true, colorUniform: colorUniform,

            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // edgeFlag = NOT_RENDERED | EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
            // renderPass = EDGES_COLOR_OPAQUE | EDGES_COLOR_TRANSPARENT | EDGES_HIGHLIGHTED | EDGES_XRAYED | EDGES_SELECTED
            renderPassFlag: 2,
            appendVertexDefinitions: (src) => {
                if (colorUniform) {
                    src.push("uniform vec4 color;");
                }
                src.push("out vec4 vColor;");
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: ! colorUniform,
            needPickColor: false,
            needGl_Position: false,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal, worldPosition) => {
                src.push("vColor = " + (colorUniform ? "color" : `vec4(${color}.rgb * 0.5, ${color}.a) / 255.0`) + ";");
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vColor;");
                src.push("out vec4 outColor;");
            },
            sectionDiscardThreshold: "0.0",
            needSliced: false,
            needvWorldPosition: false,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            needGl_PointCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix, gl_PointCoord) => {
                src.push("outColor = vColor;");
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
