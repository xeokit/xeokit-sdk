import {utils} from '../../utils.js';

/**
 * @desc Creates a 3D polyline {@link Geometry}.
 *
 * ## Usage
 *
 * In the example below we'll create a {@link Mesh} with a polyline {@link ReadableGeometry} that has lines primitives.
 *
 * [[Run this example](/examples/#geometry_builders_buildPolylineGeometry)]
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
 */
function buildPolylineGeometry(cfg = {}) {

    if (cfg.points.length % 3 !== 0) {
        throw "Size of points array for given polyline should be divisible by 3";
    }
    let numberOfPoints = cfg.points.length / 3;
    if (numberOfPoints < 2) {
        throw "There should be at least 2 points to create a polyline";
    }
    let indices = [];
    for (let i = 0; i < numberOfPoints - 1; i++) {
        indices.push(i);
        indices.push(i + 1);
    }

    return utils.apply(cfg, {
        primitive: "lines",
        positions: cfg.points,
        indices: indices,
    });
}

export {buildPolylineGeometry};