import {DTXTrianglesDrawable} from "../DTXTrianglesDrawable.js";
import {math} from "../../../../math/math.js";

const tempVec3c = math.vec3();

/**
 * @private
 */
export class DTXTrianglesSnapRenderer {

    constructor(scene, isSnapInit) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const inputs = { };
        const gl = scene.canvas.gl;

        const drawable = new DTXTrianglesDrawable(isSnapInit ? "DTXTrianglesSnapInitRenderer" : "DTXTrianglesSnapRenderer", scene, isSnapInit, {
            getHash: () => [ ],
            // Improves occlusion accuracy at distance
            getLogDepth: true && (vFragDepth => (isSnapInit ? `${vFragDepth} + length(vec2(dFdx(${vFragDepth}), dFdy(${vFragDepth})))` : vFragDepth)),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: frameCtx.pickViewMatrix || camera.viewMatrix,
                projMatrix: frameCtx.pickProjMatrix || camera.projMatrix,
                eye: frameCtx.pickOrigin || camera.eye,
                far: frameCtx.pickProjMatrix ? frameCtx.pickZFar : camera.project.far
            }),
            // flags.w = NOT_RENDERED | PICK
            // renderPass = PICK
            renderPassFlag: 3,
            cullOnAlphaZero: isSnapInit,
            appendVertexDefinitions: (src) => {
                src.push("uniform vec2 snapVectorA;");
                src.push("uniform vec2 snapInvVectorAB;");
                if (isSnapInit) {
                    src.push("flat out vec4 vPickColor;");
                }
            },
            transformClipPos: clipPos => `vec4((${clipPos}.xy / ${clipPos}.w - snapVectorA) * snapInvVectorAB * ${clipPos}.w, ${clipPos}.zw)`,
            needVertexColor: false,
            needPickColor: isSnapInit,
            needGl_Position: false,
            needViewMatrixPositionNormal: false,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => {
                if (isSnapInit) {
                    src.push(`vPickColor = ${pickColor};`);
                } else {
                    src.push("gl_PointSize = 1.0;"); // Windows needs this?
                }
            },
            appendFragmentDefinitions: (src) => {
                src.push("uniform int uLayerNumber;");
                src.push("uniform vec3 uCoordinateScaler;");
                if (isSnapInit) {
                    src.push("flat in vec4 vPickColor;");
                    src.push("layout(location = 0) out highp ivec4 outCoords;");
                    src.push("layout(location = 1) out highp ivec4 outNormal;");
                    src.push("layout(location = 2) out lowp uvec4 outPickColor;");
                } else {
                    src.push("out highp ivec4 outCoords;");
                }
            },
            needvWorldPosition: true,
            needGl_FragCoord: false,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => {
                src.push(`outCoords = ivec4(${vWorldPosition}.xyz * uCoordinateScaler.xyz, ${isSnapInit ? "-" : ""}uLayerNumber);`);
                if (isSnapInit) {
                    src.push(`vec3 worldNormal = normalize(cross(dFdx(${vWorldPosition}.xyz), dFdy(${vWorldPosition}.xyz)));`);
                    src.push(`outNormal = ivec4(worldNormal * float(${math.MAX_INT}), 1.0);`);
                    src.push("outPickColor = uvec4(vPickColor);");
                }
            },
            setupInputs: (program) => {
                inputs.uSnapVectorA = program.getLocation("snapVectorA");
                inputs.uSnapInvVectorAB = program.getLocation("snapInvVectorAB");
                inputs.uLayerNumber = program.getLocation("uLayerNumber");
                inputs.uCoordinateScaler = program.getLocation("uCoordinateScaler");
            },
            setRenderState: (frameCtx, layer, renderPass, rtcOrigin) => {
                const aabb = layer.aabb; // Per-layer AABB for best RTC accuracy
                const coordinateScaler = tempVec3c;
                coordinateScaler[0] = math.safeInv(aabb[3] - aabb[0]) * math.MAX_INT;
                coordinateScaler[1] = math.safeInv(aabb[4] - aabb[1]) * math.MAX_INT;
                coordinateScaler[2] = math.safeInv(aabb[5] - aabb[2]) * math.MAX_INT;
                frameCtx.snapPickCoordinateScale[0] = math.safeInv(coordinateScaler[0]);
                frameCtx.snapPickCoordinateScale[1] = math.safeInv(coordinateScaler[1]);
                frameCtx.snapPickCoordinateScale[2] = math.safeInv(coordinateScaler[2]);
                frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                frameCtx.snapPickOrigin[2] = rtcOrigin[2];
                gl.uniform2fv(inputs.uSnapVectorA, frameCtx.snapVectorA);
                gl.uniform2fv(inputs.uSnapInvVectorAB, frameCtx.snapInvVectorAB);
                gl.uniform1i(inputs.uLayerNumber, frameCtx.snapPickLayerNumber);
                gl.uniform3fv(inputs.uCoordinateScaler, coordinateScaler);
            },
            getGlMode: (frameCtx) => isSnapInit ? gl.TRIANGLES : ((frameCtx.snapMode === "edge") ? gl.LINES : gl.POINTS)
        });
    }
}
