import {DTXTrianglesDrawable} from "../DTXTrianglesDrawable.js";
import {createLightSetup, createSAOSetup} from "../../../vbo/VBORenderer.js";
import {math} from "../../../../math/math.js";

const tempVec4a = math.vec4();

/**
 * @private
 */
export class DTXTrianglesColorRenderer {

    constructor(scene, withSAO) {
        this.getValid  = () => drawable.getValid();
        this.drawLayer = (frameCtx, layer, renderPass) => drawable.drawLayer(frameCtx, layer, renderPass);
        this.destroy   = () => drawable.destroy();

        const gl = scene.canvas.gl;
        const lightSetup = createLightSetup(gl, scene._lightsState, false); // WARNING: Changing `useMaps' to `true' might have unexpected consequences while binding textures, as the DTX texture binding mechanism doesn't rely on `frameCtx.textureUnit` the way VBO does (see setSAORenderState)
        const sao = withSAO && createSAOSetup(gl, scene);

        const drawable = new DTXTrianglesDrawable("DTXTrianglesColorRenderer", scene, true, {
            getHash: () => [lightSetup.getHash(), (sao ? "sao" : "nosao")],
            getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getViewParams: (frameCtx, camera) => ({
                viewMatrix: camera.viewMatrix,
                projMatrix: camera.projMatrix,
                eye: camera.eye,
                far: camera.project.far
            }),
            // flags.x = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
            // renderPass = COLOR_OPAQUE
            renderPassFlag: 0,
            cullOnAlphaZero: true,
            appendVertexDefinitions: (src) => {
                lightSetup.appendDefinitions(src);
                src.push("out vec4 vColor;");
            },
            transformClipPos: clipPos => clipPos,
            needVertexColor: true,
            needPickColor: false,
            needGl_Position: false,
            needViewMatrixPositionNormal: true,
            appendVertexOutputs: (src, color, pickColor, gl_Position, view) => {
                src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
                lightSetup.getDirectionalLights(view.viewMatrix, view.viewPosition).forEach(light => {
                    src.push(`reflectedColor += max(dot(-${view.viewNormal}, ${light.direction}), 0.0) * ${light.color};`);
                });
                src.push(`vColor = vec4(${lightSetup.getAmbientColor()} + reflectedColor, 1) * vec4(${color}) / 255.0;`);
            },
            appendFragmentDefinitions: (src) => {
                src.push("in vec4 vColor;");
                sao && sao.appendDefinitions(src);
                src.push("out vec4 outColor;");
            },
            needvWorldPosition: false,
            needGl_FragCoord: sao,
            appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord) => {
                src.push("outColor = " + (sao ? ("vec4(vColor.rgb * " + sao.getAmbient(gl_FragCoord) + ", vColor.a)") : "vColor") + ";");
            },
            setupInputs: (program) => {
                const setLightsRenderState = lightSetup.setupInputs(program);
                const setSAORenderState    = sao && sao.setupInputs(program);
                return (frameCtx, layer, renderPass, rtcOrigin) => {
                    setLightsRenderState(frameCtx);
                    setSAORenderState && setSAORenderState(frameCtx, 10);
                };
            },
            getGlMode: (frameCtx) => gl.TRIANGLES
        });
    }
}
