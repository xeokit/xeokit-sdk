import {math} from '../../math/math.js';
import {createProgramVariablesState} from "../WebGLRenderer.js";
import {OcclusionLayer} from "./OcclusionLayer.js";
import {createRTCViewMat} from "../../math/rtcCoords.js";

const MARKER_COLOR = math.vec3([1.0, 0.0, 0.0]);
const POINT_SIZE = 20;

const tempVec3a = math.vec3();

/**
 * Manages occlusion testing. Private member of a Renderer.
 * @private
 */
class OcclusionTester {

    constructor(scene) {

        this._scene = scene;

        this._occlusionLayers = {};
        this._occlusionLayersList = [];
        this._occlusionLayersListDirty = false;

        this._drawable = null;

        this._markersToOcclusionLayersMap = {};

        this._onCameraViewMatrix = scene.camera.on("viewMatrix", () => {
            this._occlusionTestListDirty = true;
        });

        this._onCameraProjMatrix = scene.camera.on("projMatrix", () => {
            this._occlusionTestListDirty = true;
        });

        this._onCanvasBoundary = scene.canvas.on("boundary", () => {
            this._occlusionTestListDirty = true;
        });
    }

    /**
     * Adds a Marker for occlusion testing.
     * @param marker
     */
    addMarker(marker) {
        const originHash = marker.origin.join();
        let occlusionLayer = this._occlusionLayers[originHash];
        if (!occlusionLayer) {
            occlusionLayer = new OcclusionLayer(this._scene, marker.origin);
            this._occlusionLayers[occlusionLayer.originHash] = occlusionLayer;
            this._occlusionLayersListDirty = true;
        }
        occlusionLayer.addMarker(marker);
        this._markersToOcclusionLayersMap[marker.id] = occlusionLayer;
        this._occlusionTestListDirty = true;
    }

    /**
     * Notifies OcclusionTester that a Marker has updated its World-space position.
     * @param marker
     */
    markerWorldPosUpdated(marker) {
        const occlusionLayer = this._markersToOcclusionLayersMap[marker.id];
        if (!occlusionLayer) {
            return;
        }
        const originHash = marker.origin.join();
        if (originHash !== occlusionLayer.originHash) {
            if (occlusionLayer.numMarkers === 1) {
                occlusionLayer.destroy();
                delete this._occlusionLayers[occlusionLayer.originHash];
                this._occlusionLayersListDirty = true;
            } else {
                occlusionLayer.removeMarker(marker);
            }
            let newOcclusionLayer = this._occlusionLayers[originHash];
            if (!newOcclusionLayer) {
                newOcclusionLayer = new OcclusionLayer(this._scene, marker.origin);
                this._occlusionLayers[originHash] = newOcclusionLayer;
                this._occlusionLayersListDirty = true;
            }
            newOcclusionLayer.addMarker(marker);
            this._markersToOcclusionLayersMap[marker.id] = newOcclusionLayer;
        } else {
            occlusionLayer.markerWorldPosUpdated(marker);
        }
    }

    /**
     * Removes a Marker from occlusion testing.
     * @param marker
     */
    removeMarker(marker) {
        const originHash = marker.origin.join();
        let occlusionLayer = this._occlusionLayers[originHash];
        if (!occlusionLayer) {
            return;
        }
        if (occlusionLayer.numMarkers === 1) {
            occlusionLayer.destroy();
            delete this._occlusionLayers[occlusionLayer.originHash];
            this._occlusionLayersListDirty = true;
        } else {
            occlusionLayer.removeMarker(marker);
        }
        delete this._markersToOcclusionLayersMap[marker.id];
    }

    /**
     * Returns true if an occlusion test is needed.
     *
     * @returns {Boolean}
     */
    get needOcclusionTest() {
        return this._occlusionTestListDirty;
    }

    /**
     * Draws {@link Marker}s to the render buffer.
     */
    drawMarkers() {

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const shaderSourceHash = [this._scene.canvas.canvas.id, this._scene._sectionPlanesState.getHash()].join(";");

        if ((! this._drawable) || (shaderSourceHash !== this._drawable.shaderSourceHash)) {
            if (this._drawable) {
                this._drawable.destroy();
            }

            const programVariablesState = createProgramVariablesState();

            const programVariables = programVariablesState.programVariables;
            const viewMatrix = programVariables.createUniform("mat4",  "viewMatrix");
            const projMatrix = programVariables.createUniform("mat4",  "projMatrix");
            const position   = programVariables.createAttribute("vec3", "position");
            const outColor   = programVariables.createOutput("vec4", "outColor");
            const clipPos    = "clipPos";

            const [program, errors] = programVariablesState.buildProgram(
                gl,
                "OcclusionTester",
                {
                    scene: scene,
                    getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
                    clippableTest: () => "true",
                    getVertexData: () => {
                        const src = [ ];
                        src.push(`vec4 worldPosition = vec4(${position}, 1.0);`);
                        src.push(`vec4 ${clipPos} = ${projMatrix} * ${viewMatrix} * worldPosition;`);
                        if ((! scene.logarithmicDepthBufferEnabled) && (scene.markerZOffset < 0.000)) {
                            src.push(`${clipPos}.z += ${scene.markerZOffset};`);
                        }
                        return src;
                    },
                    worldPositionAttribute: "worldPosition",
                    getPointSize: () => "20.0",
                    clipPos: clipPos,
                    appendFragmentOutputs: (src) => src.push(`${outColor} = vec4(1.0, 0.0, 0.0, 1.0);`)
                });

            if (errors) {
                console.error(errors.join("\n"));
                throw errors.join("\n");
            } else {
                this._occlusionTestListDirty = true;
                this._drawable = {
                    shaderSourceHash: shaderSourceHash,
                    destroy: () => program.destroy(),
                    drawCall: () => {
                        const camera = scene.camera;
                        const project = scene.camera.project;

                        program.bind();

                        projMatrix.setInputValue(camera._project._state.matrix);

                        this._occlusionLayersList.forEach(occlusionLayer => {
                            if (! occlusionLayer.updateReturnCulledBySectionPlanes()) {
                                const origin = occlusionLayer.origin;

                                viewMatrix.setInputValue(createRTCViewMat(camera.viewMatrix, origin));

                                program.inputSetters.setUniforms(
                                    null,
                                    {
                                        view: { far: project.far },
                                        mesh: {
                                            origin: origin,
                                            renderFlags: { sectionPlanesActivePerLayer: occlusionLayer.sectionPlanesActive }
                                        }
                                    });

                                position.setInputValue(occlusionLayer.positionsBufBinder);

                                const indicesBuf = occlusionLayer.indicesBuf;
                                indicesBuf.bind();
                                gl.drawElements(gl.POINTS, indicesBuf.numItems, indicesBuf.itemType, 0);
                            }
                        });
                    }
                };
            }
        }

        if (this._occlusionLayersListDirty) {
            let numOcclusionLayers = 0;
            for (let originHash in this._occlusionLayers) {
                if (this._occlusionLayers.hasOwnProperty(originHash)) {
                    this._occlusionLayersList[numOcclusionLayers++] = this._occlusionLayers[originHash];
                }
            }
            this._occlusionLayersList.length = numOcclusionLayers;
            this._occlusionLayersListDirty = false;
        }

        if (this._occlusionTestListDirty) {
            for (let i = 0, len = this._occlusionLayersList.length; i < len; i++) {
                const occlusionLayer = this._occlusionLayersList[i];
                occlusionLayer.occlusionTestListDirty = true;
            }
            this._occlusionTestListDirty = false;
        }

        this._drawable.drawCall();
    }

    /**
     * Sets visibilities of {@link Marker}s according to whether or not they are obscured by anything in the render buffer.
     */
    doOcclusionTest(readPixelBuf) {
        const resolutionScale = this._scene.canvas.resolutionScale;

        const markerR = MARKER_COLOR[0] * 255;
        const markerG = MARKER_COLOR[1] * 255;
        const markerB = MARKER_COLOR[2] * 255;

        for (let i = 0, len = this._occlusionLayersList.length; i < len; i++) {

            const occlusionLayer = this._occlusionLayersList[i];

            for (let i = 0; i < occlusionLayer.lenOcclusionTestList; i++) {

                const marker = occlusionLayer.occlusionTestList[i];
                const j = i * 2;
                const color = readPixelBuf.read(Math.round(occlusionLayer.pixels[j] * resolutionScale), Math.round(occlusionLayer.pixels[j + 1] * resolutionScale));
                const visible = (color[0] === markerR) && (color[1] === markerG) && (color[2] === markerB);

                marker._setVisible(visible);
            }
        }
    }

    /**
     * Destroys this OcclusionTester.
     */
    destroy() {
        if (this.destroyed) {
            return;
        }
        for (let i = 0, len = this._occlusionLayersList.length; i < len; i++) {
            const occlusionLayer = this._occlusionLayersList[i];
            occlusionLayer.destroy();
        }

        if (this._drawable) {
            this._drawable.destroy();
        }

        this._scene.camera.off(this._onCameraViewMatrix);
        this._scene.camera.off(this._onCameraProjMatrix);
        this._scene.canvas.off(this._onCanvasBoundary);
        this.destroyed = true;
    }
}

export {OcclusionTester};