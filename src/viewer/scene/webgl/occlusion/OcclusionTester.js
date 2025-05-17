import {math} from '../../math/math.js';
import {Program} from "./../Program.js";
import {OcclusionLayer} from "./OcclusionLayer.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../math/rtcCoords.js";

const TEST_MODE = false;
const MARKER_COLOR = math.vec3([1.0, 0.0, 0.0]);
const POINT_SIZE = 20;

const tempVec3a = math.vec3();

/**
 * Manages occlusion testing. Private member of a Renderer.
 * @private
 */
class OcclusionTester {

    constructor(scene, renderBufferManager) {

        this._scene = scene;

        this._renderBufferManager = renderBufferManager;

        this._occlusionLayers = {};
        this._occlusionLayersList = [];
        this._occlusionLayersListDirty = false;

        this._shaderSource = null;
        this._program = null;

        this._shaderSourceHash = null;

        this._shaderSourceDirty = true;         // Need to build shader source code ?

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
            const scene = this._scene;
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const clipping = sectionPlanes.length > 0;
            const vertexSrc = [];
            vertexSrc.push("#version 300 es");
            vertexSrc.push("// OcclusionTester vertex shader");
            vertexSrc.push("in vec3 position;");
            vertexSrc.push("uniform mat4 modelMatrix;");
            vertexSrc.push("uniform mat4 viewMatrix;");
            vertexSrc.push("uniform mat4 projMatrix;");
            if (scene.logarithmicDepthBufferEnabled) {
                vertexSrc.push("uniform float logDepthBufFC;");
                vertexSrc.push("out float vFragDepth;");
            }
            if (clipping) {
                vertexSrc.push("out vec4 vWorldPosition;");
            }
            vertexSrc.push("void main(void) {");
            vertexSrc.push("vec4 worldPosition = vec4(position, 1.0); ");
            vertexSrc.push("   vec4 viewPosition = viewMatrix * worldPosition;");
            if (clipping) {
                vertexSrc.push("   vWorldPosition = worldPosition;");
            }
            vertexSrc.push("   vec4 clipPos = projMatrix * viewPosition;");
            vertexSrc.push("   gl_PointSize = " + POINT_SIZE + ".0;");
            if (scene.logarithmicDepthBufferEnabled) {
                vertexSrc.push("vFragDepth = 1.0 + clipPos.w;");
            } else {
                if (scene.markerZOffset < 0.000) {
                    vertexSrc.push("clipPos.z += " + scene.markerZOffset + ";");
                }
            }
            vertexSrc.push("   gl_Position = clipPos;");
            vertexSrc.push("}");

            const fragmentSrc = [];
            fragmentSrc.push("#version 300 es");
            fragmentSrc.push("// OcclusionTester fragment shader");
            fragmentSrc.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
            fragmentSrc.push("precision highp float;");
            fragmentSrc.push("precision highp int;");
            fragmentSrc.push("#else");
            fragmentSrc.push("precision mediump float;");
            fragmentSrc.push("precision mediump int;");
            fragmentSrc.push("#endif");
            if (scene.logarithmicDepthBufferEnabled) {
                fragmentSrc.push("uniform float logDepthBufFC;");
                fragmentSrc.push("in float vFragDepth;");
            }
            if (clipping) {
                fragmentSrc.push("in vec4 vWorldPosition;");
                for (let i = 0; i < sectionPlanes.length; i++) {
                    fragmentSrc.push("uniform bool sectionPlaneActive" + i + ";");
                    fragmentSrc.push("uniform vec3 sectionPlanePos" + i + ";");
                    fragmentSrc.push("uniform vec3 sectionPlaneDir" + i + ";");
                }
            }
            fragmentSrc.push("out vec4 outColor;");
            fragmentSrc.push("void main(void) {");
            if (clipping) {
                fragmentSrc.push("  float dist = 0.0;");
                for (var i = 0; i < sectionPlanes.length; i++) {
                    fragmentSrc.push("if (sectionPlaneActive" + i + ") {");
                    fragmentSrc.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                    fragmentSrc.push("}");
                }
                fragmentSrc.push("  if (dist > 0.0) { discard; }");
            }
            if (scene.logarithmicDepthBufferEnabled) {
                fragmentSrc.push("gl_FragDepth = log2( vFragDepth ) * logDepthBufFC * 0.5;");
            }
            fragmentSrc.push("   outColor = vec4(1.0, 0.0, 0.0, 1.0); ");
            fragmentSrc.push("}");

            this._shaderSource = {
                vertex:   vertexSrc,
                fragment: fragmentSrc
            };
            this._shaderSourceDirty = false;

            if (this._program) {
                this._program.destroy();
            }

            this._program = new Program(scene.canvas.gl, this._shaderSource);
            if (this._program.errors) {
                this.errors = this._program.errors;
            } else {
                const program = this._program;
                this._uViewMatrix = program.getLocation("viewMatrix");
                this._uProjMatrix = program.getLocation("projMatrix");
                this._uSectionPlanes = [];
                for (let i = 0, len = sectionPlanes.length; i < len; i++) {
                    this._uSectionPlanes.push({
                        active: program.getLocation("sectionPlaneActive" + i),
                        pos: program.getLocation("sectionPlanePos" + i),
                        dir: program.getLocation("sectionPlaneDir" + i)
                    });
                }
                this._aPosition = program.getAttribute("position");
                if (scene.logarithmicDepthBufferEnabled) {
                    this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
                }
                this._occlusionTestListDirty = true;
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

        if (!TEST_MODE) {
            this._readPixelBuf = this._renderBufferManager.getRenderBuffer("occlusionReadPix");
            const gl = this._scene.canvas.gl;
            this._readPixelBuf.setSize([gl.drawingBufferWidth, gl.drawingBufferHeight]);
            this._readPixelBuf.bind();
            this._readPixelBuf.clear();
        }
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
        const project = scene.camera.project;

        program.bind();

        gl.uniformMatrix4fv(this._uProjMatrix, false, camera._project._state.matrix);

        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }

        for (let i = 0, len = this._occlusionLayersList.length; i < len; i++) {

            const occlusionLayer = this._occlusionLayersList[i];

            occlusionLayer.update();

            if (occlusionLayer.culledBySectionPlanes) {
                continue;
            }

            const origin = occlusionLayer.origin;

            gl.uniformMatrix4fv(this._uViewMatrix, false, createRTCViewMat(camera.viewMatrix, origin));

            const numSectionPlanes = sectionPlanesState.sectionPlanes.length;
            if (numSectionPlanes > 0) {
                const sectionPlanes = sectionPlanesState.sectionPlanes;
                for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                    const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                    if (sectionPlaneUniforms) {
                        const active = occlusionLayer.sectionPlanesActive[sectionPlaneIndex];
                        gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                        if (active) {
                            const sectionPlane = sectionPlanes[sectionPlaneIndex];
                            gl.uniform3fv(sectionPlaneUniforms.pos, getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3a));
                            gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                        }
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

            const resolutionScale = this._scene.canvas.resolutionScale;

            const markerR = MARKER_COLOR[0] * 255;
            const markerG = MARKER_COLOR[1] * 255;
            const markerB = MARKER_COLOR[2] * 255;

            for (let i = 0, len = this._occlusionLayersList.length; i < len; i++) {

                const occlusionLayer = this._occlusionLayersList[i];

                for (let i = 0; i < occlusionLayer.lenOcclusionTestList; i++) {

                    const marker = occlusionLayer.occlusionTestList[i];
                    const j = i * 2;
                    const color = this._readPixelBuf.read(Math.round(occlusionLayer.pixels[j] * resolutionScale), Math.round(occlusionLayer.pixels[j + 1] * resolutionScale));
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