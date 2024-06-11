import {utils} from '../../utils.js';

/**
 * @desc Creates a 3D line {@link Geometry}.
 *
 * ## Usage
 *
 * In the example below we'll create a {@link Mesh} with a line {@link ReadableGeometry}.
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#buildLineGeometry)]
 *
 * ````javascript
 * //------------------------------------------------------------------------------------------------------------------
 * // Import the modules we need for this example
 * //------------------------------------------------------------------------------------------------------------------
 *
 * import {buildLineGeometry, Viewer, Mesh, ReadableGeometry, PhongMaterial} from "../../dist/xeokit-sdk.min.es.js";
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
 * // Create a mesh with simple 2d line shape
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildLineGeometry({
 *         startPoint: [-5,-2,0],
 *         endPoint: [-5,2,0],
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 1,]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with simple 2d line shape with black color
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildLineGeometry({
 *         startPoint: [-4,-2,0],
 *         endPoint: [-4,2,0],
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 0, 0]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with simple 2d line shape with black color and simple pattern
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildLineGeometry({
 *         startPoint: [-3,-2,0],
 *         endPoint: [-3,2,0],
 *         pattern: [0.10],
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 0, 0]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with simple 2d line shape with blue color and simple pattern extended to end
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildLineGeometry({
 *         startPoint: [-2,-2,0],
 *         endPoint: [-2,2,0],
 *         pattern: [0.10],
 *         extendToEnd: true,
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 0, 1]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with simple 2d line shape with black color and more complex pattern
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildLineGeometry({
 *         startPoint: [-1,-2,0],
 *         endPoint: [-1,2,0],
 *         pattern: [0.15, 0.05],
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 0, 0]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with simple 2d line shape with blue color and more complex pattern extended to end
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildLineGeometry({
 *         startPoint: [0,-2,0],
 *         endPoint: [0,2,0],
 *         pattern: [0.15, 0.05],
 *         extendToEnd: true,
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 0, 1]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with simple 2d line shape with black color and complex pattern
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildLineGeometry({
 *         startPoint: [1,-2,0],
 *         endPoint: [1,2,0],
 *         pattern: [0.15, 0.05, 0.50],
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 0, 0]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with simple 2d line shape with blue color and complex pattern extended to end
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildLineGeometry({
 *         startPoint: [2,-2,0],
 *         endPoint: [2,2,0],
 *         pattern: [0.15, 0.05, 0.50],
 *         extendToEnd: true,
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 0, 1]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with simple 3d line shape with white color and simple pattern
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildLineGeometry({
 *         startPoint: [3,-2,-1],
 *         endPoint: [5,2,1],
 *         pattern: [0.10],
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [1, 1, 1]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with simple 3d line shape with black color and simple dot pattern
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildLineGeometry({
 *         startPoint: [5,-2,-1],
 *         endPoint: [7,2,1],
 *         pattern: [0.03],
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 0, 0]
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
 * @param {Bool} [cfg.extendToEnd] If true: it will try to make sure the line doesn't end up with a gap, as it will
 * extend the last segment.
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
                normalizedDirectionVectorOfLine[2] * currentPatternLength,
            ];
            let currentEndPoint = [
                currentStartPoint[0] + vectorFromCurrentStartPointToCurrentEndPoint[0],
                currentStartPoint[1] + vectorFromCurrentStartPointToCurrentEndPoint[1],
                currentStartPoint[2] + vectorFromCurrentStartPointToCurrentEndPoint[2],
            ];

            points.push(currentEndPoint[0], currentEndPoint[1], currentEndPoint[2]);

            if (!gap) {
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

        if (cfg.extendToEnd) {
            points.push(x1, y1, z1);
            indices.push(indices.length - 2);
            indices.push(indices.length - 1);
        }
    }

    return utils.apply(cfg, {
        primitive: "lines",
        positions: points,
        indices: indices,
    });
}

export {buildLineGeometry};