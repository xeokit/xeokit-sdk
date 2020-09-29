import {math} from './math.js';

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

export {createRTCViewMat};