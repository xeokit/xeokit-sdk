import {math} from '../../math/math.js';
import {createProgramVariablesState} from "../WebGLRenderer.js";
import {OcclusionLayer} from "./OcclusionLayer.js";
import {createRTCViewMat} from "../../math/rtcCoords.js";

const MARKER_COLOR = math.vec3([ 255, 0, 0 ]);
const POINT_SIZE = 20;

const tempVec3a = math.vec3();

/**
 * Manages occlusion testing. Private member of a Renderer.
 * @private
 */
export class OcclusionTester {

    constructor(scene) {

        this._scene = scene;

        this._occlusionLayers = {};
        this._occlusionLayersList = [];
        this._occlusionLayersListDirty = false;

        this._drawable = null;

        this._markersToOcclusionLayersMap = {};

        const camera = scene.camera;
        const markOcclusionTestListDirty = () => { this._occlusionTestListDirty = true; };
        this._onCameraViewMatrix = camera.on("viewMatrix",   markOcclusionTestListDirty);
        this._onCameraProjMatrix = camera.on("projMatrix",   markOcclusionTestListDirty);
        this._onCanvasBoundary = scene.canvas.on("boundary", markOcclusionTestListDirty);
    }

    _addMarker(marker, originHash) {
        if (! this._occlusionLayers[originHash]) {
            this._occlusionLayers[originHash] = new OcclusionLayer(marker.origin);
            this._occlusionLayersListDirty = true;
        }
        const occlusionLayer = this._occlusionLayers[originHash];
        occlusionLayer.addMarker(marker);
        this._markersToOcclusionLayersMap[marker.id] = occlusionLayer;
    }

    _removeMarker(occlusionLayer, marker) {
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
     * Adds a Marker for occlusion testing.
     * @param marker
     */
    addMarker(marker) {
        const originHash = marker.origin.join();
        this._addMarker(marker, originHash);
        this._occlusionTestListDirty = true;
    }

    /**
     * Notifies OcclusionTester that a Marker has updated its World-space position.
     * @param marker
     */
    markerWorldPosUpdated(marker) {
        const occlusionLayer = this._markersToOcclusionLayersMap[marker.id];
        if (occlusionLayer) {
            const originHash = marker.origin.join();
            if (originHash !== occlusionLayer.originHash) {
                this._removeMarker(occlusionLayer, marker);
                this._addMarker(marker, originHash);
            } else {
                occlusionLayer.markerWorldPosUpdated(marker);
            }
        }
    }

    /**
     * Removes a Marker from occlusion testing.
     * @param marker
     */
    removeMarker(marker) {
        const originHash = marker.origin.join();
        const occlusionLayer = this._occlusionLayers[originHash];
        if (occlusionLayer) {
            this._removeMarker(occlusionLayer, marker);
        }
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
        const canvas = scene.canvas;
        const gl = canvas.gl;
        const sectionPlanesState = scene._sectionPlanesState;
        const shaderSourceHash = [canvas.canvas.id, sectionPlanesState.getHash()].join(";");

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
                    sectionPlanesState: sectionPlanesState,
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
                        const project = camera.project;

                        program.bind();

                        projMatrix.setInputValue(project.matrix);

                        const boundary = canvas.boundary;
                        const canvasWidth = boundary[2];
                        const canvasHeight = boundary[3];
                        const near = camera.perspective.near; // Assume near enough to ortho near
                        const markerInView = marker => {
                            const viewPos = marker.viewPos;
                            const canvasPos = marker.canvasPos;
                            const canvasX = canvasPos[0];
                            const canvasY = canvasPos[1];
                            return (viewPos[2] <= -near) && (canvasX >= -10) && (canvasY >= -10) && (canvasX <= canvasWidth + 10) && (canvasY <= canvasHeight + 10);
                        };

                        this._occlusionLayersList.forEach(occlusionLayer => {
                            occlusionLayer.update(gl, markerInView);

                            const culled = sectionPlanesState.sectionPlanes.some((sectionPlane, i) => {
                                const intersect = sectionPlane.active ? math.planeAABB3Intersect(sectionPlane.dir, sectionPlane.dist, occlusionLayer.aabb) : 1;
                                const outside = (intersect === -1);
                                occlusionLayer.sectionPlanesActive[i] = (intersect === 0); // if outside, then sectionPlanesActive won't be even tested
                                return outside;
                            });

                            if (! culled) {
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

                                position.setInputValue(occlusionLayer.positionsBuf);

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
    doOcclusionTest(readColorPixel) {
        this._occlusionLayersList.forEach(occlusionLayer => {
            for (let i = 0; i < occlusionLayer.lenOcclusionTestList; i++) {
                const j = i * 2;
                const color = readColorPixel(occlusionLayer.pixels[j], occlusionLayer.pixels[j + 1]);
                occlusionLayer.occlusionTestList[i]._setVisible(math.compareVec3(MARKER_COLOR, color));
            }
        });
    }

    /**
     * Destroys this OcclusionTester.
     */
    destroy() {
        if (! this.destroyed) {
            this._occlusionLayersList.forEach(layer => layer.destroy());
            this._drawable && this._drawable.destroy();
            this._scene.camera.off(this._onCameraViewMatrix);
            this._scene.camera.off(this._onCameraProjMatrix);
            this._scene.canvas.off(this._onCanvasBoundary);
            this.destroyed = true;
        }
    }
}
