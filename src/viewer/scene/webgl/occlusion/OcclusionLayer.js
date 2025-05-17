import {math} from "../../math/math.js";
import {ArrayBuf} from "../ArrayBuf.js";

/**
 * @private
 */
class OcclusionLayer {

    constructor(scene, origin) {

        this.scene = scene;
        this.aabb = math.AABB3();
        this.origin = math.vec3(origin);
        this.originHash = this.origin.join();
        this.numMarkers = 0;
        this.markers = {};
        this.markerList = [];                  // Ordered array of Markers
        this.markerIndices = {};               // ID map of Marker indices in _markerList
        this.positions = [];                   // Packed array of World-space marker positions
        this.indices = [];                     // Indices corresponding to array above
        this.positionsBuf = null;
        this.lenPositionsBuf = 0;
        this.indicesBuf = null;
        this.sectionPlanesActive = [];
        this.occlusionTestList = [];           // List of
        this.lenOcclusionTestList = 0;
        this.pixels = [];
        this.markerListDirty = false;
        this.positionsDirty = true;
        this.occlusionTestListDirty = false;
    }

    addMarker(marker) {
        this.markers[marker.id] = marker;
        this.markerListDirty = true;
        this.numMarkers++;
    }

    markerWorldPosUpdated(marker) {
        if (!this.markers[marker.id]) { // Not added
            return;
        }
        const i = this.markerIndices[marker.id];
        this.positions[i * 3 + 0] = marker.worldPos[0];
        this.positions[i * 3 + 1] = marker.worldPos[1];
        this.positions[i * 3 + 2] = marker.worldPos[2];
        this.positionsDirty = true; // TODO: avoid reallocating VBO each time
    }

    removeMarker(marker) {
        delete this.markers[marker.id];
        this.markerListDirty = true;
        this.numMarkers--;
    }

    updateReturnCulledBySectionPlanes() {
        if (this.markerListDirty) {
            this.numMarkers = 0;
            for (var id in this.markers) {
                if (this.markers.hasOwnProperty(id)) {
                    this.markerList[this.numMarkers] = this.markers[id];
                    this.markerIndices[id] = this.numMarkers;
                    this.numMarkers++;
                }
            }
            this.markerList.length = this.numMarkers;
            this.markerListDirty = false;
            this.positionsDirty = true;
            this.occlusionTestListDirty = true;
        }

        if (this.positionsDirty) { //////////////  TODO: Don't rebuild this when positions change, very wasteful
            let j = 0;
            for (let i = 0; i < this.numMarkers; i++) {
                if (this.markerList[i]) {
                    const marker = this.markerList[i];
                    const worldPos = marker.rtcPos;
                    this.positions[j++] = worldPos[0];
                    this.positions[j++] = worldPos[1];
                    this.positions[j++] = worldPos[2];
                    this.indices[i] = i;
                }
            }
            this.positions.length = this.numMarkers * 3;
            this.indices.length = this.numMarkers;
            this.positionsDirty = false;

            const aabb = this.aabb;
            math.collapseAABB3(aabb);
            math.expandAABB3Points3(aabb, this.positions);
            const origin = this.origin;
            aabb[0] += origin[0];
            aabb[1] += origin[1];
            aabb[2] += origin[2];
            aabb[3] += origin[0];
            aabb[4] += origin[1];
            aabb[5] += origin[2];

            if (this.positionsBuf) {
                if (this.lenPositionsBuf === this.positions.length) { // Just updating buffer elements, don't need to reallocate
                    this.positionsBuf.setData(new Float32Array(this.positions)); // Indices don't need updating
                } else {
                    this.positionsBuf.destroy();
                    this.positionsBuf = null;
                    this.indicesBuf.destroy();
                    this.indicesBuf = null;
                }
            }

            if (!this.positionsBuf) {
                const gl = this.scene.canvas.gl;
                const lenPositions = this.numMarkers * 3;
                const lenIndices = this.numMarkers;
                this.positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, new Float32Array(this.positions), lenPositions, 3, gl.STATIC_DRAW);
                this.indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), lenIndices, 1, gl.STATIC_DRAW);
                this.lenPositionsBuf = this.positions.length;
                this.positionsBufBinder = {
                    bindAtLocation: location => { // see ArrayBuf.js and Attribute.js
                        const b = this.positionsBuf;
                        b.bind();
                        gl.vertexAttribPointer(location, b.itemSize, b.itemType, b.normalized, 0, 0);
                    }
                };
            }
        }

        if (this.occlusionTestListDirty) {
            const canvas = this.scene.canvas;
            const near = this.scene.camera.perspective.near; // Assume near enough to ortho near
            const boundary = canvas.boundary;
            const canvasWidth = boundary[2];
            const canvasHeight = boundary[3];
            let lenPixels = 0;
            this.lenOcclusionTestList = 0;
            for (let i = 0; i < this.numMarkers; i++) {
                const marker = this.markerList[i];
                const viewPos = marker.viewPos;
                if (viewPos[2] > -near) { // Clipped by near plane
                    marker._setVisible(false);
                } else {
                    const canvasPos = marker.canvasPos;
                    const canvasX = canvasPos[0];
                    const canvasY = canvasPos[1];
                    if ((canvasX < -10) || (canvasY < -10) || (canvasX > canvasWidth + 10) || (canvasY > canvasHeight + 10)
                        || (marker.entity && !marker.entity.visible)) {
                        marker._setVisible(false);
                    } else if (marker.occludable) {
                        this.occlusionTestList[this.lenOcclusionTestList++] = marker;
                        this.pixels[lenPixels++] = canvasX;
                        this.pixels[lenPixels++] = canvasY;
                    } else {
                        marker._setVisible(true);
                    }
                }
            }
        }

        const sectionPlanes = this.scene._sectionPlanesState.sectionPlanes;
        const numSectionPlanes = sectionPlanes.length;
        if (numSectionPlanes > 0) {
            for (let i = 0; i < numSectionPlanes; i++) {
                const sectionPlane = sectionPlanes[i];
                if (!sectionPlane.active) {
                    this.sectionPlanesActive[i] = false;
                } else {
                    const intersect = math.planeAABB3Intersect(sectionPlane.dir, sectionPlane.dist, this.aabb);
                    const outside = (intersect === -1);
                    if (outside) {
                        return true;
                    }
                    const intersecting = (intersect === 0);
                    this.sectionPlanesActive[i] = intersecting;
                }
            }
        }

        return false;
    }

    destroy() {
        this.markers = {};
        this.markerList.length = 0;
        if (this.positionsBuf) {
            this.positionsBuf.destroy();
        }
        if (this.indicesBuf) {
            this.indicesBuf.destroy();
        }
    }
}


export {OcclusionLayer};