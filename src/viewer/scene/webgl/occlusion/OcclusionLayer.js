import {math} from "../../math/math.js";
import {ArrayBuf} from "../ArrayBuf.js";

/**
 * @private
 */
class OcclusionLayer {

    constructor(origin) {
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

    update(gl, markerInView) {
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

            if (this.positionsBuf && (this.lenPositionsBuf !== this.positions.length)) {
                this.positionsBuf.destroy();
                this.positionsBuf = null;
                this.indicesBuf.destroy();
                this.indicesBuf = null;
            }

            const positionsArr = new Float32Array(this.positions);
            if (this.positionsBuf) {
                this.positionsBuf.setData(positionsArr); // Just updating buffer elements, don't need to reallocate; Indices don't need updating
            } else {
                this.positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, positionsArr, positionsArr.length, 3, gl.STATIC_DRAW);
                this.indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), this.indices.length, 1, gl.STATIC_DRAW);
                this.lenPositionsBuf = this.positions.length;
            }
        }

        if (this.occlusionTestListDirty) {
            let lenPixels = 0;
            this.lenOcclusionTestList = 0;
            for (let i = 0; i < this.numMarkers; i++) {
                const marker = this.markerList[i];
                if ((marker.entity && !marker.entity.visible) || (! markerInView(marker))) {
                    marker._setVisible(false);
                } else if (marker.occludable) {
                    this.occlusionTestList[this.lenOcclusionTestList++] = marker;
                    this.pixels[lenPixels++] = marker.canvasPos[0];
                    this.pixels[lenPixels++] = marker.canvasPos[1];
                } else {
                    marker._setVisible(true);
                }
            }
        }
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