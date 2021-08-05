import {Plugin} from "../../viewer/Plugin.js";
import {Scene} from "../../viewer/scene/scene/Scene.js";
import {AmbientLight} from "../../viewer/scene/lights/AmbientLight.js";
import {DirLight} from "../../viewer/scene/lights/DirLight.js";
import {Mesh} from "../../viewer/scene/mesh/Mesh.js";
import {ReadableGeometry} from "../../viewer/scene/geometry/ReadableGeometry.js";
import {buildCylinderGeometry} from "../../viewer/scene/geometry/builders/buildCylinderGeometry.js";
import {buildSphereGeometry} from "../../viewer/scene/geometry/builders/buildSphereGeometry.js";
import {buildVectorTextGeometry} from "../../viewer/scene/geometry/builders/buildVectorTextGeometry.js";
import {PhongMaterial} from "../../viewer/scene/materials/PhongMaterial.js";
import {math} from "../../viewer/scene/math/math.js";

/**
 * {@link Viewer} plugin that shows the axii of the World-space coordinate system.
 *
 * ## Usage
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#gizmos_AxisGizmoPlugin)]
 *
 * ````JavaScript````
 * import {Viewer, XKTLoaderPlugin, AxisGizmoPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * viewer.camera.eye = [-2.56, 8.38, 8.27];
 * viewer.camera.look = [13.44, 3.31, -14.83];
 * viewer.camera.up = [0.10, 0.98, -0.14];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * new AxisGizmoPlugin(viewer, {
 *     canvasId: "myAxisGizmoCanvas"
 * });
 *
 * const model = xktLoader.load({
 *     id: "myModel",
 *     src: "../assets/models/xkt/Schependomlaan.xkt",
 *     edges: true
 * });
 * ````
 */
class AxisGizmoPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="AxisGizmo"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} [cfg.canvasId] ID of an existing HTML canvas to display the AxisGizmo - either this or canvasElement is mandatory. When both values are given, the element reference is always preferred to the ID.
     * @param {HTMLCanvasElement} [cfg.canvasElement] Reference of an existing HTML canvas to display the AxisGizmo - either this or canvasId is mandatory. When both values are given, the element reference is always preferred to the ID.
     */
    constructor(viewer, cfg) {

        cfg = cfg || {};

        super("AxisGizmo", viewer, cfg);

        const camera = viewer.scene.camera;

        if (!cfg.canvasId && !cfg.canvasElement) {
            this.error("Config expected: either 'canvasId' or 'canvasElement'");
        }

        try {
            this._axisGizmoScene = new Scene(viewer, {
                canvasId: cfg.canvasId,
                canvasElement: cfg.canvasElement,
                transparent: true
            });
        } catch (error) {
            this.error(error);
            return;
        }

        const axisGizmoScene = this._axisGizmoScene;

        axisGizmoScene.clearLights();

        new AmbientLight(axisGizmoScene, {color: [0.45, 0.45, 0.5], intensity: 0.9});
        new DirLight(axisGizmoScene, {dir: [-0.5, 0.5, -0.6], color: [0.8, 0.8, 0.7], intensity: 1.0, space: "view"});
        new DirLight(axisGizmoScene, {dir: [0.5, -0.5, -0.6], color: [0.8, 0.8, 0.8], intensity: 1.0, space: "view"});

        // Rotate helper in synch with target camera

        const helperCamera = axisGizmoScene.camera;

        camera.on("matrix", function () {

            const eye = camera.eye;
            const look = camera.look;
            const up = camera.up;

            const eyeLook = math.mulVec3Scalar(math.normalizeVec3(math.subVec3(eye, look, [])), 22);

            helperCamera.look = [0, 0, 0];
            helperCamera.eye = eyeLook;
            helperCamera.up = up;
        });

        // ----------------- Components that are shared among more than one mesh ---------------

        const arrowHead = new ReadableGeometry(axisGizmoScene, buildCylinderGeometry({
            radiusTop: 0.01,
            radiusBottom: 0.6,
            height: 1.7,
            radialSegments: 20,
            heightSegments: 1,
            openEnded: false
        }));

        const arrowShaft = new ReadableGeometry(axisGizmoScene, buildCylinderGeometry({
            radiusTop: 0.2,
            radiusBottom: 0.2,
            height: 4.5,
            radialSegments: 20,
            heightSegments: 1,
            openEnded: false
        }));

        const xAxisMaterial = new PhongMaterial(axisGizmoScene, { // Red by convention
            diffuse: [1, 0.3, 0.3],
            ambient: [0.0, 0.0, 0.0],
            specular: [.6, .6, .3],
            shininess: 80,
            lineWidth: 2
        });

        const xAxisLabelMaterial = new PhongMaterial(axisGizmoScene, { // Red by convention
            emissive: [1, 0.3, 0.3],
            ambient: [0.0, 0.0, 0.0],
            specular: [.6, .6, .3],
            shininess: 80,
            lineWidth: 2
        });

        const yAxisMaterial = new PhongMaterial(axisGizmoScene, { // Green by convention
            diffuse: [0.3, 1, 0.3],
            ambient: [0.0, 0.0, 0.0],
            specular: [.6, .6, .3],
            shininess: 80,
            lineWidth: 2
        });

        const yAxisLabelMaterial = new PhongMaterial(axisGizmoScene, { // Green by convention
            emissive: [0.3, 1, 0.3],
            ambient: [0.0, 0.0, 0.0],
            specular: [.6, .6, .3],
            shininess: 80,
            lineWidth: 2
        });

        const zAxisMaterial = new PhongMaterial(axisGizmoScene, { // Blue by convention
            diffuse: [0.3, 0.3, 1],
            ambient: [0.0, 0.0, 0.0],
            specular: [.6, .6, .3],
            shininess: 80,
            lineWidth: 2
        });

        const zAxisLabelMaterial = new PhongMaterial(axisGizmoScene, {
            emissive: [0.3, 0.3, 1],
            ambient: [0.0, 0.0, 0.0],
            specular: [.6, .6, .3],
            shininess: 80,
            lineWidth: 2
        });

        const ballMaterial = new PhongMaterial(axisGizmoScene, {
            diffuse: [0.5, 0.5, 0.5],
            ambient: [0.0, 0.0, 0.0],
            specular: [.6, .6, .3],
            shininess: 80,
            lineWidth: 2
        });

        // ----------------- Meshes ------------------------------

        this._meshes = [

            // Sphere behind gnomon

            new Mesh(axisGizmoScene, {
                geometry: new ReadableGeometry(axisGizmoScene, buildSphereGeometry({
                    radius: 9.0,
                    heightSegments: 60,
                    widthSegments: 60
                })),
                material: new PhongMaterial(axisGizmoScene, {
                    diffuse: [0.0, 0.0, 0.0],
                    emissive: [0.1, 0.1, 0.1],
                    ambient: [0.1, 0.1, 0.2],
                    specular: [0, 0, 0],
                    alpha: 0.4,
                    alphaMode: "blend",
                    frontface: "cw"
                }),
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false
            }),

            // Ball at center of axis

            new Mesh(axisGizmoScene, {  // Arrow
                geometry: new ReadableGeometry(axisGizmoScene, buildSphereGeometry({
                    radius: 1.0
                })),
                material: ballMaterial,
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false
            }),

            // X-axis arrow, shaft and label

            new Mesh(axisGizmoScene, {  // Arrow
                geometry: arrowHead,
                material: xAxisMaterial,
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false,
                position: [-5, 0, 0],
                rotation: [0, 0, 90]
            }),

            new Mesh(axisGizmoScene, {  // Shaft
                geometry: arrowShaft,
                material: xAxisMaterial,
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false,
                position: [-2, 0, 0],
                rotation: [0, 0, 90]
            }),

            new Mesh(axisGizmoScene, {  // Label
                geometry: new ReadableGeometry(axisGizmoScene, buildVectorTextGeometry({text: "X", size: 1.5})),
                material: xAxisLabelMaterial,
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false,
                position: [-7, 0, 0],
                billboard: "spherical"
            }),

            // Y-axis arrow, shaft and label

            new Mesh(axisGizmoScene, {  // Arrow
                geometry: arrowHead,
                material: yAxisMaterial,
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false,
                position: [0, 5, 0]
            }),

            new Mesh(axisGizmoScene, {  // Shaft
                geometry: arrowShaft,
                material: yAxisMaterial,
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false,
                position: [0, 2, 0]
            }),

            new Mesh(axisGizmoScene, {  // Label
                geometry: new ReadableGeometry(axisGizmoScene, buildVectorTextGeometry({text: "Y", size: 1.5})),
                material: yAxisLabelMaterial,
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false,
                position: [0, 7, 0],
                billboard: "spherical"
            }),

            // Z-axis arrow, shaft and label

            new Mesh(axisGizmoScene, {  // Arrow
                geometry: arrowHead,
                material: zAxisMaterial,
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false,
                position: [0, 0, 5],
                rotation: [90, 0, 0]
            }),

            new Mesh(axisGizmoScene, {  // Shaft
                geometry: arrowShaft,
                material: zAxisMaterial,
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false,
                position: [0, 0, 2],
                rotation: [90, 0, 0]
            }),

            new Mesh(axisGizmoScene, {  // Label
                geometry: new ReadableGeometry(axisGizmoScene, buildVectorTextGeometry({text: "Z", size: 1.5})),
                material: zAxisLabelMaterial,
                pickable: false,
                collidable: false,
                visible: cfg.visible !== false,
                position: [0, 0, 7],
                billboard: "spherical"
            })
        ];
    }

    /** Shows or hides this AxisGizmoPlugin.
     *
     * @param visible
     */
    setVisible(visible) {
        for (let i = 0; i < this._meshes.length; i++) {
            this._meshes[i].visible = visible;
        }
    }

    /**
     * Destroys this AxisGizmoPlugin.
     */
    destroy() {
        this._axisGizmoCanvas = null;
        this._axisGizmoScene.destroy();
        this._axisGizmoScene = null;
        super.destroy();
    }
}

export {AxisGizmoPlugin}