import {utils} from '../../utils.js';

/**
 * @desc Creates a box-shaped lines {@link Geometry}.
 *
 * ## Usage
 *
 * In the example below we'll create a {@link Mesh} with a box-shaped {@link ReadableGeometry} that has lines primitives.
 *
 * [[Run this example](/examples/index.html#geometry_builders_buildBoxLinesGeometry)]
 *
 * ````javascript
 * import {Viewer, Mesh, buildBoxLinesGeometry, ReadableGeometry, PhongMaterial} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *         canvasId: "myCanvas"
 * });
 *
 * viewer.scene.camera.eye = [0, 0, 5];
 * viewer.scene.camera.look = [0, 0, 0];
 * viewer.scene.camera.up = [0, 1, 0];
 *
 * new Mesh(viewer.scene, {
 *      geometry: new ReadableGeometry(viewer.scene, buildBoxLinesGeometry({
 *         center: [0,0,0],
 *         xSize: 1,  // Half-size on each axis
 *         ySize: 1,
 *         zSize: 1
 *      })),
 *      material: new PhongMaterial(viewer.scene, {
 *         emissive: [0,1,0]
 *      })
 * });
 * ````
 *
 * @function buildBoxLinesGeometry
 * @param {*} [cfg] Configs
 * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
 * @param {Number[]} [cfg.center]  3D point indicating the center position.
 * @param {Number} [cfg.xSize=1.0]  Half-size on the X-axis.
 * @param {Number} [cfg.ySize=1.0]  Half-size on the Y-axis.
 * @param {Number} [cfg.zSize=1.0]  Half-size on the Z-axis.
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
function buildBoxLinesGeometry(cfg = {}) {

    let xSize = cfg.xSize || 1;
    if (xSize < 0) {
        console.error("negative xSize not allowed - will invert");
        xSize *= -1;
    }

    let ySize = cfg.ySize || 1;
    if (ySize < 0) {
        console.error("negative ySize not allowed - will invert");
        ySize *= -1;
    }

    let zSize = cfg.zSize || 1;
    if (zSize < 0) {
        console.error("negative zSize not allowed - will invert");
        zSize *= -1;
    }

    const center = cfg.center;
    const centerX = center ? center[0] : 0;
    const centerY = center ? center[1] : 0;
    const centerZ = center ? center[2] : 0;

    const xmin = -xSize + centerX;
    const ymin = -ySize + centerY;
    const zmin = -zSize + centerZ;
    const xmax = xSize + centerX;
    const ymax = ySize + centerY;
    const zmax = zSize + centerZ;

    return utils.apply(cfg, {
        primitive: "lines",
        positions: [
            xmin, ymin, zmin,
            xmin, ymin, zmax,
            xmin, ymax, zmin,
            xmin, ymax, zmax,
            xmax, ymin, zmin,
            xmax, ymin, zmax,
            xmax, ymax, zmin,
            xmax, ymax, zmax
        ],
        indices: [
            0, 1,
            1, 3,
            3, 2,
            2, 0,
            4, 5,
            5, 7,
            7, 6,
            6, 4,
            0, 4,
            1, 5,
            2, 6,
            3, 7
        ]
    });
}

/**
 * @desc Creates a box-shaped lines {@link Geometry} from AABB.
 *
 * ## Usage
 *
 * In the example below we'll create a {@link Mesh} with a box-shaped {@link ReadableGeometry} that has lines primitives.
 * This box will be created from AABB of a model.
 *
 * [[Run this example](/examples/index.html#geometry_builders_buildBoxLinesGeometryFromAABB)]
 *
 * ````javascript
 *     import {Viewer, Mesh, Node, buildBoxGeometry, buildBoxLinesGeometryFromAABB, ReadableGeometry, PhongMaterial} from "../../dist/xeokit-sdk.min.es.js";
 *
 *     const viewer = new Viewer({
 *         canvasId: "myCanvas"
 *     });
 *
 *     viewer.scene.camera.eye = [-21.80, 4.01, 6.56];
 *     viewer.scene.camera.look = [0, -5.75, 0];
 *     viewer.scene.camera.up = [0.37, 0.91, -0.11];
 *
 *     const boxGeometry = new ReadableGeometry(viewer.scene, buildBoxGeometry({
 *         xSize: 1,
 *         ySize: 1,
 *         zSize: 1
 *     }));
 *
 *     new Node(viewer.scene, {
 *         id: "table",
 *         isModel: true, // <--------------------- Node represents a model
 *         rotation: [0, 50, 0],
 *         position: [0, 0, 0],
 *         scale: [1, 1, 1],
 *
 *         children: [
 *
 *             new Mesh(viewer.scene, { // Red table leg
 *                 id: "redLeg",
 *                 isObject: true, // <---------- Node represents an object
 *                 position: [-4, -6, -4],
 *                 scale: [1, 3, 1],
 *                 rotation: [0, 0, 0],
 *                 geometry: boxGeometry,
 *                 material: new PhongMaterial(viewer.scene, {
 *                     diffuse: [1, 0.3, 0.3]
 *                 })
 *             }),
 *
 *             new Mesh(viewer.scene, { // Green table leg
 *                 id: "greenLeg",
 *                 isObject: true, // <---------- Node represents an object
 *                 position: [4, -6, -4],
 *                 scale: [1, 3, 1],
 *                 rotation: [0, 0, 0],
 *                 geometry: boxGeometry,
 *                 material: new PhongMaterial(viewer.scene, {
 *                     diffuse: [0.3, 1.0, 0.3]
 *                 })
 *             }),
 *
 *             new Mesh(viewer.scene, {// Blue table leg
 *                 id: "blueLeg",
 *                 isObject: true, // <---------- Node represents an object
 *                 position: [4, -6, 4],
 *                 scale: [1, 3, 1],
 *                 rotation: [0, 0, 0],
 *                 geometry: boxGeometry,
 *                 material: new PhongMaterial(viewer.scene, {
 *                     diffuse: [0.3, 0.3, 1.0]
 *                 })
 *             }),
 *
 *             new Mesh(viewer.scene, {  // Yellow table leg
 *                 id: "yellowLeg",
 *                 isObject: true, // <---------- Node represents an object
 *                 position: [-4, -6, 4],
 *                 scale: [1, 3, 1],
 *                 rotation: [0, 0, 0],
 *                 geometry: boxGeometry,
 *                 material: new PhongMaterial(viewer.scene, {
 *                     diffuse: [1.0, 1.0, 0.0]
 *                 })
 *             }),
 *
 *             new Mesh(viewer.scene, { // Purple table top
 *                 id: "tableTop",
 *                 isObject: true, // <---------- Node represents an object
 *                 position: [0, -3, 0],
 *                 scale: [6, 0.5, 6],
 *                 rotation: [0, 0, 0],
 *                 geometry: boxGeometry,
 *                 material: new PhongMaterial(viewer.scene, {
 *                     diffuse: [1.0, 0.3, 1.0]
 *                 })
 *             })
 *         ]
 *     });
 *
 *     let aabb = viewer.scene.aabb;
 *     console.log(aabb);
 *
 *     new Mesh(viewer.scene, {
 *         geometry: new ReadableGeometry(viewer.scene, buildBoxLinesGeometryFromAABB({
 *             id: "aabb",
 *             aabb: aabb,
 *         })),
 *         material: new PhongMaterial(viewer.scene, {
 *             emissive: [0, 1,]
 *         })
 *     });
 * ````
 *
 * @function buildBoxLinesGeometryFromAABB
 * @param {*} [cfg] Configs
 * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
 * @param {Number[]} [cfg.aabb]  AABB for which box will be created.
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
function buildBoxLinesGeometryFromAABB(cfg = {}){
    return buildBoxLinesGeometry({
        id: cfg.id,
        center: [
            (cfg.aabb[0] + cfg.aabb[3]) / 2.0,
            (cfg.aabb[1] + cfg.aabb[4]) / 2.0,
            (cfg.aabb[2] + cfg.aabb[5]) / 2.0,
        ],
        xSize: (Math.abs(cfg.aabb[3] - cfg.aabb[0])) / 2.0,
        ySize: (Math.abs(cfg.aabb[4] - cfg.aabb[1])) / 2.0,
        zSize: (Math.abs(cfg.aabb[5] - cfg.aabb[2])) / 2.0,
    });
}

export {buildBoxLinesGeometry, buildBoxLinesGeometryFromAABB};
