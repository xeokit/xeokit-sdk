import {math} from '../../math/math.js';
import {Program} from "./../Program.js";
import {RenderBuffer} from "./../RenderBuffer.js";
import {OcclusionLayer} from "./OcclusionLayer.js";
import {createRTCViewMat, getPlaneRTCPos, worldToRTCPos} from "../../math/rtcCoords.js";

const TEST_MODE = false;
const MARKER_COLOR = math.vec3([1.0, 0.0, 0.0]);
const POINT_SIZE = 20;

const tempVec3a = math.vec3();

/**
 * Manages occlusion testing. Private member of a Renderer.
 */
class OcclusionTester {

    constructor(scene) {

        this._scene = scene;

        this._occlusionLayers = {};
        this._occlusionLayersList = [];
        this._occlusionLayersListDirty = false;

        this._shaderSource = null;
        this._program = null;

        this._shaderSourceHash = null;

        this._shaderSourceDirty = true;         // Need to build shader source code ?
        this._programDirty = false;             // Need to build shader program ?

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
        const rtcCenterHash = marker.rtcCenter.join();
        let occlusionLayer = this._occlusionLayers[rtcCenterHash];
        if (!occlusionLayer) {
            occlusionLayer = new OcclusionLayer(this._scene, marker.rtcCenter);
            this._occlusionLayers[occlusionLayer.rtcCenterHash] = occlusionLayer;
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
            marker.error("Marker has not been added to OcclusionTester");
            return;
        }
        const rtcCenterHash = marker.rtcCenter.join();
        if (rtcCenterHash !== occlusionLayer.rtcCenterHash) {
            if (occlusionLayer.numMarkers === 1) {
                occlusionLayer.destroy();
                delete this._occlusionLayers[occlusionLayer.rtcCenterHash];
                this._occlusionLayersListDirty = true;
            } else {
                occlusionLayer.removeMarker(marker);
            }
            let newOcclusionLayer = this._occlusionLayers[rtcCenterHash];
            if (!newOcclusionLayer) {
                newOcclusionLayer = new OcclusionLayer(this._scene, marker.rtcCenter);
                this._occlusionLayers[rtcCenterHash] = occlusionLayer;
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
        const rtcCenterHash = marker.rtcCenter.join();
        let occlusionLayer = this._occlusionLayers[rtcCenterHash];
        if (!occlusionLayer) {
            return;
        }
        if (occlusionLayer.numMarkers === 1) {
            occlusionLayer.destroy();
            delete this._occlusionLayers[occlusionLayer.rtcCenterHash];
            this._occlusionLayersListDirty = true;
        } else {
            occlusionLayer.removeMarker(marker);
        }
        delete this._markersToOcclusionLayersMap[marker.id];
    }

    /**
     * Returns true if an occlusion test is needed.
     *
     * @returns {boolean}
     */
    get needOcclusionTest() {
        return this._occlusionTestListDirty;
    }

    /**
     * Binds the render buffer. After calling this, the caller then renders object silhouettes to the render buffer,
     * then calls drawMarkers() and doOcclusionTest().
     */
    bindRenderBuf() {

        const shaderSourceHash = [this._scene.canvas.canvas.id, this._scene._sectionPlanesState.getHash()].join(";");

        if (shaderSourceHash !== this._shaderSourceHash) {
            this._shaderSourceHash = shaderSourceHash;
            this._shaderSourceDirty = true;
        }

        if (this._shaderSourceDirty) {
            this._buildShaderSource();
            this._shaderSourceDirty = false;
            this._programDirty = true;
        }

        if (this._programDirty) {
            this._buildProgram();
            this._programDirty = false;
            this._occlusionTestListDirty = true;
        }

        if (this._occlusionLayersListDirty) {
            this._buildOcclusionLayersList();
            this._occlusionLayersListDirty = false;
        }

        if (this._occlusionTestListDirty) {
            for (let i = 0, len = this._occlusionLayersList.length; i < len; i++) {
                const occlusionLayer = this._occlusionLayersList[i];
                occlusionLayer.occlusionTestListDirty = true;
            }
            this._occlusionTestListDirty = false;
        }

        if (!TEST_MODE) {
            this._readPixelBuf = this._readPixelBuf || (this._readPixelBuf = new RenderBuffer(this._scene.canvas.canvas, this._scene.canvas.gl));
            this._readPixelBuf.bind();
            this._readPixelBuf.clear();
        }
    }

    _buildOcclusionLayersList() {
        let numOcclusionLayers = 0;
        for (let rtcCenterHash in this._occlusionLayers) {
            if (this._occlusionLayers.hasOwnProperty(rtcCenterHash)) {
                this._occlusionLayersList[numOcclusionLayers++] = this._occlusionLayers[rtcCenterHash];
            }
        }
        this._occlusionLayersList.length = numOcclusionLayers;
    }

    _buildShaderSource() {
        this._shaderSource = {
            vertex: this._buildVertexShaderSource(),
            fragment: this._buildFragmentShaderSource()
        };
    }

    _buildVertexShaderSource() {
        const scene = this._scene;
        const clipping = scene._sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push("// OcclusionTester vertex shader");
        src.push("attribute vec3 position;");
        src.push("uniform mat4 modelMatrix;");
        src.push("uniform mat4 viewMatrix;");
        src.push("uniform mat4 projMatrix;");
        if (clipping) {
            src.push("varying vec4 vWorldPosition;");
        }
        src.push("void main(void) {");
        src.push("vec4 worldPosition = vec4(position, 1.0); ");
        src.push("   vec4 viewPosition = viewMatrix * worldPosition;");
        if (clipping) {
            src.push("   vWorldPosition = worldPosition;");
        }
        src.push("   gl_Position = projMatrix * viewPosition;");
        src.push("   gl_PointSize = " + POINT_SIZE + ".0;");
        src.push("}");
        return src;
    }

    _buildFragmentShaderSource() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push("// OcclusionTester fragment shader");
        src.push("precision lowp float;");
        if (clipping) {
            src.push("varying vec4 vWorldPosition;");
            for (var i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("void main(void) {");
        if (clipping) {
            src.push("  float dist = 0.0;");
            for (var i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
            src.push("  if (dist > 0.0) { discard; }");
        }
        src.push("   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); ");
        src.push("}");
        return src;
    }

    _buildProgram() {
        if (this._program) {
            this._program.destroy();
        }
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const sectionPlanesState = scene._sectionPlanesState;
        this._program = new Program(gl, this._shaderSource);
        if (this._program.errors) {
            this.errors = this._program.errors;
            return;
        }
        const program = this._program;
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");
        this._uSectionPlanes = [];
        const sectionPlanes = sectionPlanesState.sectionPlanes;
        for (let i = 0, len = sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }
        this._aPosition = program.getAttribute("position");
    }

    /**
     * Draws {@link Marker}s to the render buffer.
     */
    drawMarkers() {

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const sectionPlanesState = scene._sectionPlanesState;
        const camera = scene.camera;

        program.bind();

        gl.uniformMatrix4fv(this._uProjMatrix, false, camera._project._state.matrix);

        for (let i = 0, len = this._occlusionLayersList.length; i < len; i++) {

            const occlusionLayer = this._occlusionLayersList[i];

            occlusionLayer.update();

            if (occlusionLayer.culledBySectionPlanes) {
                continue;
            }

            const rtcCenter = occlusionLayer.rtcCenter;

            gl.uniformMatrix4fv(this._uViewMatrix, false, createRTCViewMat(camera.viewMatrix, rtcCenter));

            const numSectionPlanes = sectionPlanesState.sectionPlanes.length;
            if (numSectionPlanes > 0) {
                const sectionPlanes = sectionPlanesState.sectionPlanes;
                for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                    const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                    const active = occlusionLayer.sectionPlanesActive[sectionPlaneIndex];
                    gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                    if (active) {
                        const sectionPlane = sectionPlanes[sectionPlaneIndex];
                        gl.uniform3fv(sectionPlaneUniforms.pos, getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, rtcCenter, tempVec3a));
                        gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                    }
                }
            }

            this._aPosition.bindArrayBuffer(occlusionLayer.positionsBuf);

            const indicesBuf = occlusionLayer.indicesBuf;
            indicesBuf.bind();
            gl.drawElements(gl.POINTS, indicesBuf.numItems, indicesBuf.itemType, 0);
        }
    }

    /**
     * Sets visibilities of {@link Marker}s according to whether or not they are obscured by anything in the render buffer.
     */
    doOcclusionTest() {

        if (!TEST_MODE) {

            const markerR = MARKER_COLOR[0] * 255;
            const markerG = MARKER_COLOR[1] * 255;
            const markerB = MARKER_COLOR[2] * 255;

            for (let i = 0, len = this._occlusionLayersList.length; i < len; i++) {

                const occlusionLayer = this._occlusionLayersList[i];

                for (let i = 0; i < occlusionLayer.lenOcclusionTestList; i++) {

                    const marker = occlusionLayer.occlusionTestList[i];
                    const j = i * 2;
                    const color = this._readPixelBuf.read(occlusionLayer.pixels[j], occlusionLayer.pixels[j + 1]);
                    const visible = (color[0] === markerR) && (color[1] === markerG) && (color[2] === markerB);

                    marker._setVisible(visible);
                }
            }
        }
    }

    /**
     * Unbinds render buffer.
     */
    unbindRenderBuf() {
        if (!TEST_MODE) {
            this._readPixelBuf.unbind();
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

        if (this._program) {
            this._program.destroy();
        }

        this._scene.camera.off(this._onCameraViewMatrix);
        this._scene.camera.off(this._onCameraProjMatrix);
        this._scene.canvas.off(this._onCanvasBoundary);
        this.destroyed = true;
    }
}

export {OcclusionTester};