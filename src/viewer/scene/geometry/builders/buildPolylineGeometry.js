import {utils} from '../../utils.js';

/**
 * @desc Creates a 3D polyline {@link Geometry}.
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
 * @function buildPolylineGeometry
 * @param {*} [cfg] Configs
 * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
 * @param {Number[]} [cfg.points]  3D points indicating vertices position.
 * @returns {Object} Configuration for a {@link Geometry} subtype.
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

/**
 * @desc Creates a 3D polyline from curve {@link Geometry}.
 *
 * ## Usage
 *
 * In the example below we'll create a {@link Mesh} with a polyline {@link ReadableGeometry} created from curves.
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#buildPolylineGeometryFromCurve)]
 *
 * ````javascript
 * //------------------------------------------------------------------------------------------------------------------
 * // Import the modules we need for this example
 * //------------------------------------------------------------------------------------------------------------------
 *
 * import {buildPolylineGeometryFromCurve, Viewer, Mesh, PhongMaterial, NavCubePlugin, CubicBezierCurve, SplineCurve, QuadraticBezierCurve, ReadableGeometry} from "../../dist/xeokit-sdk.min.es.js";
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a Viewer and arrange the camera
 * //------------------------------------------------------------------------------------------------------------------
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * new NavCubePlugin(viewer, {
 *     canvasId: "myNavCubeCanvas",
 *     visible: true,
 *     size: 250,
 *     alignment: "bottomRight",
 *     bottomMargin: 100,
 *     rightMargin: 10
 * });
 *
 * viewer.camera.eye = [0, -250, 1];
 * viewer.camera.look = [0, 0, 0];
 * viewer.camera.up = [0, 1, 0];
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with polyline shape from Spline
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildPolylineGeometryFromCurve({
 *         id: "SplineCurve",
 *         curve: new SplineCurve(viewer.scene, {
 *             points: [
 *                 [-65.77614, 0, -88.881992],
 *                 [90.020852, 0, -61.589088],
 *                 [-67.766247, 0, -22.071238],
 *                 [93.148164, 0, -13.826507],
 *                 [-14.033343, 0, 3.231558],
 *                 [32.592034, 0, 9.20188],
 *                 [3.309023, 0, 22.848332],
 *                 [23.210098, 0, 28.818655],
 *             ],
 *         }),
 *         divisions: 100,
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [1, 0, 0]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with polyline shape from CubicBezier
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildPolylineGeometryFromCurve({
 *         id: "CubicBezierCurve",
 *         curve: new CubicBezierCurve(viewer.scene, {
 *             v0: [120, 0, 100],
 *             v1: [120, 0, 0],
 *             v2: [80, 0, 100],
 *             v3: [80, 0, 0],
 *         }),
 *         divisions: 50,
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 1, 0]
 *     })
 * });
 *
 * //------------------------------------------------------------------------------------------------------------------
 * // Create a mesh with polyline shape from QuadraticBezier
 * //------------------------------------------------------------------------------------------------------------------
 *
 * new Mesh(viewer.scene, {
 *     geometry: new ReadableGeometry(viewer.scene, buildPolylineGeometryFromCurve({
 *         id: "QuadraticBezierCurve",
 *         curve: new QuadraticBezierCurve(viewer.scene, {
 *             v0: [-100, 0, 100],
 *             v1: [-50, 0, 150],
 *             v2: [-50, 0, 0],
 *         }),
 *         divisions: 20,
 *     })),
 *     material: new PhongMaterial(viewer.scene, {
 *         emissive: [0, 0, 1]
 *     })
 * });
 * ````
 *
 * @function buildPolylineGeometryFromCurve
 * @param {*} [cfg] Configs
 * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
 * @param {Object} [cfg.curve]  Curve for which polyline will be created.
 * @param {Number} [cfg.divisions]  The number of divisions.
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
function buildPolylineGeometryFromCurve(cfg = {}) {

    let polylinePoints = cfg.curve.getPoints(cfg.divisions).map(a => [...a]).flat();
    return buildPolylineGeometry({
        id: cfg.id,
        points: polylinePoints
    });
}

export {buildPolylineGeometry, buildPolylineGeometryFromCurve};