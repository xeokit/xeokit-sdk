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
 * Converts a World-space 3D position to RTC coordinates.
 *
 * Given a double-precision World-space position, returns a double-precision relative-to-center (RTC) center pos
 * and a single-precision offset fom that center.
 *
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
 * Converts an RTC 3D position to World-space.
 *
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

export {createRTCViewMat, worldToRTCPos, getPlaneRTCPos};