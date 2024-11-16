import {VBORenderer} from "../VBORenderer.js";

/**
 * @private
 */
export class VBOSilhouetteRenderer extends VBORenderer {

    constructor(scene, instancing, primitive) {
        const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
        const isPoints = primitive === "points";
        const pointsMaterial = isPoints && scene.pointsMaterial;

        super(scene, instancing, primitive, false, {
            progMode: "silhouetteMode", colorUniform: true,

            getHash: (isPoints ? () => [ pointsMaterial.hash ] : () => [ ]),
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            clippingCaps: false,
            // silhouetteFlag = NOT_RENDERED | SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
            // renderPass = SILHOUETTE_HIGHLIGHTED | SILHOUETTE_SELECTED | SILHOUETTE_XRAYED
            renderPassFlag: 1,
            appendVertexDefinitions: (src) => {
                if (isPoints) {
                    // likely something wrong here that instancing differs from batching, as the mode seems to rely on silhouetteColor instead
                    if (instancing) {
                        src.push("uniform vec4 silhouetteColor;");
                        src.push("out vec4 vColor;");
                    }
                    src.push("uniform float pointSize;");
                    if (pointsMaterial.perspectivePoints) {
                        src.push("uniform float nearPlaneHeight;");
                    }
                } else if (primitive !== "lines") {
                    src.push("uniform vec4 silhouetteColor;");
                    src.push("out vec4 vColor;");
                }
            },
            filterIntensityRange: false,
            transformClipPos: clipPos => clipPos,
            shadowParameters: null,
            needVertexColor: (! isPoints) && (primitive !== "lines"),
            needPickColor: false,
            needGl_Position: isPoints && pointsMaterial.perspectivePoints,
            needViewPosition: false,
            needViewMatrixNormal: false,
            needWorldNormal: false,
            needWorldPosition: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view, worldNormal, worldPosition) => {
                if (isPoints) {
                    if (instancing) {
                        src.push(`vColor = silhouetteColor;`);
                    }
                    if (pointsMaterial.perspectivePoints) {
                        src.push(`gl_PointSize = (nearPlaneHeight * pointSize) / ${gl_Position}.w;`);
                        src.push("gl_PointSize = max(gl_PointSize, " + Math.floor(pointsMaterial.minPerspectivePointSize) + ".0);");
                        src.push("gl_PointSize = min(gl_PointSize, " + Math.floor(pointsMaterial.maxPerspectivePointSize) + ".0);");
                    } else {
                        src.push("gl_PointSize = pointSize;");
                    }
                } else if (primitive !== "lines") {
                    src.push(`vColor = vec4(silhouetteColor.rgb, min(silhouetteColor.a, ${color}.a / 255.0));`);
                }
            },
            appendFragmentDefinitions: (src) => {
                if (isPoints) {
                    if (instancing) {
                        src.push("in vec4 vColor;");
                    } else {
                        src.push("uniform vec4 color;");
                    }
                } else if (primitive === "lines") {
                    src.push("uniform vec4 color;");
                } else {
                    if (clipping) {
                        src.push("uniform float sliceThickness;");
                        src.push("uniform vec4 sliceColor;");
                    }
                    src.push("in vec4 vColor;");
                }
                src.push("out vec4 outColor;");
            },
            sectionDiscardThreshold: (isPoints || (primitive === "lines")) ? "0.0" : "sliceThickness",
            needSliced: (! isPoints) && (primitive !== "lines") && clipping,
            needvWorldPosition: false,
            needGl_FragCoord: false,
            needViewMatrixInFragment: false,
            needGl_PointCoord: isPoints && pointsMaterial.roundPoints,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliced, viewMatrix, gl_PointCoord) => {
                if (isPoints) {
                    if (pointsMaterial.roundPoints) {
                        src.push(`  vec2 cxy = 2.0 * ${gl_PointCoord} - 1.0;`);
                        src.push("  float r = dot(cxy, cxy);");
                        src.push("  if (r > 1.0) {");
                        src.push("       discard;");
                        src.push("  }");
                    }
                    src.push("outColor = " + (instancing ? "vColor" : "color") + ";");
                } else if (primitive === "lines") {
                    src.push("outColor = color;");
                } else {
                    const color = clipping ? `${sliced} ? sliceColor : vColor` : "vColor";
                    src.push("outColor = " + color + ";");
                }
            },
            setupInputs: (program) => { },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => { }
        });
    }

}
