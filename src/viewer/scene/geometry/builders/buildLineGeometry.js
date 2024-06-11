import {utils} from '../../utils.js';

/**
 * @desc Creates a 3D line {@link Geometry}.
 *
 * ## Usage
 *
 * In the example below we'll create a {@link Mesh} with a polyline {@link ReadableGeometry} that has lines primitives.
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#buildPolylineGeometry)]
 *
 * ````javascript
 * //------------------------------------------------------------------------------------------------------------------
 * // Import the modules we need for this example
 * //------------------------------------------------------------------------------------------------------------------
 *
 * import {buildPolylineGeometry, Viewer, Mesh, ReadableGeometry, PhongMaterial} from "../../dist/xeokit-sdk.min.es.js";
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a Viewer and arrange the camera
 * //------------------------------------------------------------------------------------------------------------------
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * viewer.camera.eye = [0, 0, 8];
 * viewer.camera.look = [0, 0, 0];
 * viewer.camera.up = [0, 1, 0];
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with polyline shape
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildPolylineGeometry({
 *         points: [
 *             0, 2.83654, 0,
 *             -0.665144, 1.152063, 0,
 *             -2.456516, 1.41827, 0,
 *             -1.330288, 0, 0,
 *             -2.456516, -1.41827, 0,
 *             -0.665144, -1.152063, 0,
 *             0, -2.83654, 0,
 *             0.665144, -1.152063, 0,
 *             2.456516, -1.41827, 0,
 *             1.330288, 0, 0,
 *             2.456516, 1.41827, 0,
 *             0.665144, 1.152063, 0,
 *             0, 2.83654, 0,
 *         ]
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 1,]
 *     })
 * });
 * ````
 *
 * @function buildLineGeometry
 * @param {*} [cfg] Configs
 * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
 * @param {Number[]} [cfg.startPoint]  3D start point (x0, y0, z0).
 * @param {Number[]} [cfg.endPoint]  3D end point (x1, y1, z1).
 * @param {Number[]} [cfg.pattern] Lengths of segments that describe a pattern.
 * There should be at least 2 to start a pattern.
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
function buildLineGeometry(cfg = {}) {

    if (cfg.startPoint.length !== 3) {
        throw "Start point should contain 3 elements in array: x, y and z";
    }
    if (cfg.endPoint.length !== 3) {
        throw "End point should contain 3 elements in array: x, y and z";
    }
    let indices = [];
    let points = [];
    let x0 = cfg.startPoint[0]; let y0 = cfg.startPoint[1]; let z0 = cfg.startPoint[2];
    let x1 = cfg.endPoint[0]; let y1 = cfg.endPoint[1]; let z1 = cfg.endPoint[2];
    let lineLength = Math.sqrt((x1- x0)**2 + (y1 - y0)**2 + (z1 - z0)**2);
    let normalizedDirectionVectorOfLine = [(x1-x0)/lineLength, (y1-y0)/lineLength, (z1-z0)/lineLength];

    if (!cfg.pattern) {
        indices.push(0);
        indices.push(1);
        points.push(x0, y0, z0, x1, y1, z1);
    }
    else {
        let patternsNumber = cfg.pattern.length;
        let gap = false;
        let segmentFilled = 0.0;
        let idOfCurrentPatternLength = 0;
        let pointIndicesCounter = 0;
        let currentStartPoint = [x0, y0, z0];
        let currentPatternLength = cfg.pattern[idOfCurrentPatternLength];
        points.push(currentStartPoint[0], currentStartPoint[1], currentStartPoint[2]);

        while (currentPatternLength <= (lineLength - segmentFilled)) {
            let vectorFromCurrentStartPointToCurrentEndPoint = [
                normalizedDirectionVectorOfLine[0] * currentPatternLength,
                normalizedDirectionVectorOfLine[1] * currentPatternLength,
                normalizedDirectionVectorOfLine[2] * currentPatternLength
            ];
            let currentEndPoint = [
                currentStartPoint[0] + vectorFromCurrentStartPointToCurrentEndPoint[0],
                currentStartPoint[1] + vectorFromCurrentStartPointToCurrentEndPoint[1],
                currentStartPoint[2] + vectorFromCurrentStartPointToCurrentEndPoint[2],
            ];

            if (!gap) {
                points.push(currentEndPoint[0], currentEndPoint[1], currentEndPoint[2]);
                indices.push(pointIndicesCounter);
                indices.push(pointIndicesCounter + 1);
            }
            gap = !gap;

            pointIndicesCounter += 1;
            currentStartPoint = currentEndPoint;
            idOfCurrentPatternLength += 1;
            if (idOfCurrentPatternLength >= patternsNumber) {
                idOfCurrentPatternLength = 0;
            }
            segmentFilled += currentPatternLength;
            currentPatternLength = cfg.pattern[idOfCurrentPatternLength];
        }
    }

    return utils.apply(cfg, {
        primitive: "lines",
        positions: points,
        indices: indices,
    });
}

export {buildLineGeometry};