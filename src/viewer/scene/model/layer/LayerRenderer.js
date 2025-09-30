import {createRTCViewMat, math} from "../../math/index.js";

const tempVec2 = math.vec2();
const tempVec3 = math.vec3();
const tempMat4 = math.mat4();
const vec3zero = math.vec3([0,0,0]);

export const lazyShaderVariable = function(name) {
    const variable = {
        toString: () => {
            variable.needed = true;
            return name;
        }
    };
    return variable;
};

export class LayerRenderer {

    constructor(scene, primitive, cfg, subGeometry, renderingAttributes, programVariablesState) {

        const isVBO = renderingAttributes.isVBO;
        const pointsMaterial = scene.pointsMaterial;

        const incrementDrawState        = cfg.incrementDrawState;
        const renderPassFlag            = cfg.renderPassFlag;
        const usePickParams             = cfg.usePickParams;
        const cullOnAlphaZero           = (!isVBO) && (!cfg.dontCullOnAlphaZero);
        const filterIntensityRange      = cfg.filterIntensityRange && (primitive === "points") && pointsMaterial.filterIntensity;
        const isShadowProgram           = cfg.isShadowProgram;
        const vertexCullX               = cfg.vertexCullX;
        const incPointSizeBy10          = cfg.incPointSizeBy10;

        const setupPoints = (primitive === "points") && (! subGeometry);

        const sectionPlanesState = scene._sectionPlanesState;

        const getHash = () => [ sectionPlanesState.getHash() ].concat(setupPoints ? [ pointsMaterial.hash ] : [ ]).concat(cfg.getHash ? cfg.getHash() : [ ]).join(";");
        const hash = getHash();
        this.getValid = () => hash === getHash();

        const programVariables = programVariablesState.programVariables;
        const gl = scene.canvas.gl;

        const intensityRange  = programVariables.createUniform("vec2", "intensityRange", (set) => {
            tempVec2[0] = pointsMaterial.minIntensity;
            tempVec2[1] = pointsMaterial.maxIntensity;
            set(tempVec2);
        });
        const nearPlaneHeight = programVariables.createUniform("float", "nearPlaneHeight", (set) => {
            set((scene.camera.projection === "ortho") ?
                1.0
                : (gl.drawingBufferHeight / (2 * Math.tan(0.5 * scene.camera.perspective.fov * Math.PI / 180.0))));
        });
        const pointSize       = programVariables.createUniform("float", "pointSize",      (set) => set(pointsMaterial.pointSize));
        const renderPass      = programVariables.createUniform("int",   "renderPass",     (set, state) => set(state.renderPass));

        const geoParams = renderingAttributes.geometryParameters;
        const worldPositionAttribute = geoParams.attributes.position.world;

        const getVertexData = () => {
            const colorA = geoParams.attributes.color;
            const flagTest = (isShadowProgram
                              ? `(${renderingAttributes.getFlag(renderPassFlag)} <= 0) || (${colorA}.a < 1.0)`
                              : `${renderingAttributes.getFlag(renderPassFlag)} != ${renderPass}`);

            const afterFlagsColorLines = [
                `if (${flagTest}) {`,
                `   gl_Position = vec4(${vertexCullX || 0.0}, 0.0, 0.0, 0.0);`, // Cull vertex
                "   return;",
                "}"
            ].concat(
                cullOnAlphaZero
                    ? [
                        `if (${colorA}.a == 0.0) {`,
                        "   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);", // Cull vertex
                        "   return;",
                        "}"
                    ]
                    : [ ]
            ).concat(
                filterIntensityRange
                    ? [
                        `if ((${colorA}.a < ${intensityRange}[0]) || (${colorA}.a > ${intensityRange}[1])) {`,
                        "   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);", // Cull vertex
                        "   return;",
                        "}"
                    ]
                    : [ ]);

            const vertexData = [ ];
            renderingAttributes.ensureColorAndFlagAvailable && renderingAttributes.ensureColorAndFlagAvailable(vertexData);
            afterFlagsColorLines.forEach(line => vertexData.push(line));
            renderingAttributes.appendVertexData(vertexData);
            vertexData.push(`vec4 viewPosition = ${geoParams.viewMatrix} * ${worldPositionAttribute};`);
            return vertexData;
        };

        const getPointSize = (function() {
            const addends = [ ];
            if (setupPoints) {
                if (pointsMaterial.perspectivePoints) {
                    const minVal = `${Math.floor(pointsMaterial.minPerspectivePointSize)}.0`;
                    const maxVal = `${Math.floor(pointsMaterial.maxPerspectivePointSize)}.0`;
                    addends.push(`clamp((${nearPlaneHeight} * ${pointSize}) / gl_Position.w, ${minVal}, ${maxVal})`);
                } else {
                    addends.push(pointSize);
                }
            } else if (subGeometry && subGeometry.vertices) {
                addends.push("1.0");
            }
            incPointSizeBy10 && (primitive === "points") && addends.push("10.0");
            return (addends.length > 0) && (() => addends.join(" + "));
        })();

        const vClippable = programVariables.createVarying("float", "vClippable", () => renderingAttributes.getClippable(), "flat");

        const [ program, errors ] = programVariablesState.buildProgram(
            gl,
            primitive + " " + renderingAttributes.signature + " " + cfg.programName,
            {
                appendFragmentOutputs:          cfg.appendFragmentOutputs,
                clippableTest:                  () => `${vClippable} > 0.0`,
                clippingCaps:                   cfg.clippingCaps,
                discardPoints:                  setupPoints && pointsMaterial.roundPoints,
                fragmentOutputsSetup:           [ ],
                getLogDepth:                    cfg.getLogDepth,
                getPointSize:                   getPointSize,
                getVertexData:                  getVertexData,
                projMatrix:                     geoParams.projMatrix,
                scene:                          scene,
                testPerspectiveForGl_FragDepth: ((primitive !== "points") && (primitive !== "lines")) || subGeometry,
                transformClipPos:               cfg.transformClipPos,
                worldPositionAttribute:         worldPositionAttribute
            });

        if (errors) {
            console.error(errors);
            this.destroy = () => { };
            this.drawLayer = (frameCtx, layer, renderPass) => { };
            return;
        }

        this.destroy = () => program.destroy();
        this.drawLayer = (frameCtx, layer, renderPass) => {
            if (frameCtx.lastProgramId !== program.id) {
                frameCtx.lastProgramId = program.id;
                program.bind();
            }

            const origin = layer.origin;
            const model = layer.model;
            const camera = scene.camera;
            const rtcOrigin = tempVec3;
            math.transformPoint3(model.matrix, origin, rtcOrigin);

            const viewMatrix = (isShadowProgram && frameCtx.shadowViewMatrix) || (usePickParams && frameCtx.pickViewMatrix) || camera.viewMatrix;
            const projMatrix = (isShadowProgram && frameCtx.shadowProjMatrix) || (usePickParams && frameCtx.pickProjMatrix) || camera.projMatrix;

            if (frameCtx.snapPickOrigin) {
                frameCtx.snapPickOrigin[0] = rtcOrigin[0];
                frameCtx.snapPickOrigin[1] = rtcOrigin[1];
                frameCtx.snapPickOrigin[2] = rtcOrigin[2];
            }

            const layerDrawState = layer.layerDrawState;

            const state = {
                legacyFrameCtx: frameCtx,
                layerDrawState: layerDrawState,
                mesh: {
                    layerIndex:  layer.layerIndex,
                    origin:      rtcOrigin,
                    renderFlags: { sectionPlanesActivePerLayer: model.renderFlags.sectionPlanesActivePerLayer },
                    worldMatrix: model.rotationMatrix
                },
                renderPass:     renderPass,
                view: {
                    eye:              (usePickParams && frameCtx.pickOrigin) || camera.eye,
                    far:              (usePickParams && frameCtx.pickProjMatrix) ? frameCtx.pickZFar : camera.project.far,
                    pickClipPos:      frameCtx.pickClipPos,
                    projMatrix:       projMatrix,
                    viewMatrix:       math.compareVec3(rtcOrigin, vec3zero) ? viewMatrix : createRTCViewMat(viewMatrix, rtcOrigin, tempMat4),
                    viewNormalMatrix: camera.viewNormalMatrix
                }
            };

            renderingAttributes.drawCall(layerDrawState, program.inputSetters, state);

            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        };
    }
}
