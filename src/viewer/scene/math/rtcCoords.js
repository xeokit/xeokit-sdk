import {math} from './math.js';

const tempVec3a = math.vec3();

/**
 * Given a view matrix and a relative-to-center (RTC) coordinate origin, returns a view matrix
 * to transform RTC coordinates to View-space.
 *
 * The returned view matrix is
 *
 * @private
 */
const createRTCViewMat = (function () {

    const tempMat = new Float32Array(16);
    const rtcCenterWorld = new Float64Array(4);
    const rtcCenterView = new Float64Array(4);

    return function (viewMat, rtcCenter, rtcViewMat = tempMat) {
        rtcCenterWorld[0] = rtcCenter[0];
        rtcCenterWorld[1] = rtcCenter[1];
        rtcCenterWorld[2] = rtcCenter[2];
        rtcCenterWorld[3] = 1;
        math.transformVec4(viewMat, rtcCenterWorld, rtcCenterView);
        math.setMat4Translation(viewMat, rtcCenterView, rtcViewMat);
        return rtcViewMat;
    }
}());

/**
 * Converts a World-space 3D position to RTC.
 *
 * Given a double-precision World-space position, returns a double-precision relative-to-center (RTC) center pos
 * and a single-precision offset fom that center.
 *
 * @private
 * @param {Float64Array} worldPos The World-space position.
 * @param {Float64Array} rtcCenter Double-precision relative-to-center (RTC) center pos.
 * @param {Float32Array} rtcPos Single-precision offset fom that center.
 */
function worldToRTCPos(worldPos, rtcCenter, rtcPos) {

    const xHigh = Float32Array.from([worldPos[0]])[0];
    const xLow = worldPos[0] - xHigh;

    const yHigh = Float32Array.from([worldPos[1]])[0];
    const yLow = worldPos[1] - yHigh;

    const zHigh = Float32Array.from([worldPos[2]])[0];
    const zLow = worldPos[2] - zHigh;

    rtcCenter[0] = xHigh;
    rtcCenter[1] = yHigh;
    rtcCenter[2] = zHigh;

    rtcPos[0] = xLow;
    rtcPos[1] = yLow;
    rtcPos[2] = zLow;
}


/**
 * Converts a flat array of double-precision positions to RTC positions.
 *
 * Returns the RTC positions, along with a computed RTC center for those positions.
 *
 * When computing the RTC position, this function uses a modulus operation to ensure that, whenever possible,
 * identical RTC positions are reused for different positions arrays.
 *
 * @private
 * @param {Float64Array} worldPositions Flat array of World-space 3D positions.
 * @param {Float64Array} rtcPositions Outputs the computed flat array of 3D RTC positions.
 * @param {Float64Array} rtcCenter Outputs the computed double-precision relative-to-center (RTC) center pos.
 * @param {Number} [cellSize=10000000] The size of each coordinate cell within the RTC coordinate system.
 * @returns {Boolean} ````True```` if the positions actually needed conversion to RTC, else ````false````. When
 * ````false````, we can safely ignore the data returned in ````rtcPositions```` and ````rtcCenter````,
 * since ````rtcCenter```` will equal ````[0,0,0]````, and ````rtcPositions```` will contain identical values to ````positions````.
 */
function worldToRTCPositions(worldPositions, rtcPositions, rtcCenter, cellSize = 10000000) {

    const center = math.getPositionsCenter(worldPositions, tempVec3a);

    const rtcCenterX = Math.round(center[0] / cellSize) * cellSize;
    const rtcCenterY = Math.round(center[1] / cellSize) * cellSize;
    const rtcCenterZ = Math.round(center[2] / cellSize) * cellSize;

    for (let i = 0, len = worldPositions.length; i < len; i += 3) {
        rtcPositions[i + 0] = worldPositions[i + 0] - rtcCenterX;
        rtcPositions[i + 1] = worldPositions[i + 1] - rtcCenterY;
        rtcPositions[i + 2] = worldPositions[i + 2] - rtcCenterZ;
    }

    rtcCenter[0] = rtcCenterX;
    rtcCenter[1] = rtcCenterY;
    rtcCenter[2] = rtcCenterZ;

    const rtcNeeded = (rtcCenter[0] !== 0 || rtcCenter[1] !== 0 || rtcCenter[2] !== 0);

    return rtcNeeded;
}

/**
 * Converts an RTC 3D position to World-space.
 *
 * @private
 * @param {Float64Array} rtcCenter Double-precision relative-to-center (RTC) center pos.
 * @param {Float32Array} rtcPos Single-precision offset fom that center.
 * @param {Float64Array} worldPos The World-space position.
 */
function rtcToWorldPos(rtcCenter, rtcPos, worldPos) {
    worldPos[0] = rtcCenter[0] + rtcPos[0];
    worldPos[1] = rtcCenter[1] + rtcPos[1];
    worldPos[2] = rtcCenter[2] + rtcPos[2];
    return worldPos;
}

/**
 * Given a 3D plane defined by distance from origin and direction, and an RTC center position,
 * return a plane position that is relative to the RTC center.
 *
 * @private
 * @param dist
 * @param dir
 * @param rtcCenter
 * @param rtcPlanePos
 * @returns {*}
 */
function getPlaneRTCPos(dist, dir, rtcCenter, rtcPlanePos) {
    const rtcCenterToPlaneDist = math.dotVec3(dir, rtcCenter) + dist;
    const dirNormalized = math.normalizeVec3(dir, tempVec3a);
    math.mulVec3Scalar(dirNormalized, -rtcCenterToPlaneDist, rtcPlanePos);
    return rtcPlanePos;
}

export {createRTCViewMat, worldToRTCPos, worldToRTCPositions, rtcToWorldPos, getPlaneRTCPos};