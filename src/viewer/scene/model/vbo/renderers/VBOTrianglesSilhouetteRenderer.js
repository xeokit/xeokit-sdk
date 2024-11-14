import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOTrianglesSilhouetteRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;

        super(scene, instancing, primitive, false, {
            progMode: "silhouetteMode", colorUniform: true,

            getHash: () => [ ],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // silhouetteFlag = NOT_RENDERED | SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
            // renderPass = SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
            renderPassFlag: 1,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec4 silhouetteColor;");
                src.push("out vec4 vColor;");
            },
            transformClipPos: clipPos => clipPos,
            needVertexColor: true,
            needPickColor: false,
            needGl_Position: false,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal) => {
                src.push(`vColor = vec4(silhouetteColor.rgb, min(silhouetteColor.a, ${color}.a / 255.0));`);
            },
            appendFragmentDefinitions: (src) => {
                if (clipping) {
                    src.push("uniform float sliceThickness;");
                    src.push("uniform vec4 sliceColor;");
                }
                src.push("in vec4 vColor;");
                src.push("out vec4 outColor;");
            },
            sectionDiscardThreshold: "sliceThickness",
            needSliced: clipping,
            needvWorldPosition: false,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix) => {
                const color = clipping ? `${sliced} ? sliceColor : vColor` : "vColor";
                src.push("outColor = " + color + ";");
            }
        });
    }

}
