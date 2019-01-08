import {Plugin} from "./../../../viewer/Plugin.js";
import {Clip} from "../../../scene/clipping/Clip.js";
import {math} from "../../../scene/math/math.js";

const tempVec3 = math.vec3();

/**
 * {@link Viewer} plugin that saves and loads BCF viewpoints as JSON objects.
 *
 * BCF is a format for managing issues on a BIM project. This plugin's viewpoints conform to
 * the <a href="https://github.com/buildingSMART/BCF-API">BCF Version 2.1</a> specification.
 *
 * In the example below, we'll use a {@link GLTFLoaderPlugin} to load a model from a glTF file, then once that model
 * has loaded, we'll arrange the camera
 *
 * @example
 * import {Viewer} from "../../../src/viewer/Viewer.js";
 * import {GLTFModelsPlugin} from "../../../src/viewer/plugins/GLTFModelsPlugin/GLTFModelsPlugin.js";
 * import {BCFViewpointsPlugin} from "../../../src/viewer/plugins/BCFViewpointsPlugin/BCFViewpointsPlugin.js";
 *
 * // Create a xeokit Viewer
 * const viewer = new Viewer({
 *    canvasId: "myCanvas"
 * });
 *
 * // Add a GLTFModelsPlugin
 * const gltfLoader = new GLTFModelsPlugin(viewer);
 *
 * // Add a BCFViewpointsPlugin
 * const bcfViewpoints = new BCFViewpointsPlugin(viewer);
 *
 * // Load a glTF model
 * const model = gltfLoader.load({
 *    id: "myModel",
 *    src: "./../../models/gltf/schependomlaan/schependomlaan.gltf",
 *    edges: true
 * });
 *
 * // When the model has loaded, arrange the camera and save a BCF viewpoint
 * model.on("loaded", () => {
 *
 *     viewer.scene.camera.orbitPitch(20);
 *     viewer.cameraFlight.flyTo(model);
 *
 *     const viewpoint = bcfViewpoints.getViewpoint();
 *
 *     console.log(JSON.stringify(viewpoint, null, "\t"));
 * });
 *
 *  @class BCFViewpointsPlugin
 */
class BCFViewpointsPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="BCFViewpoints"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} [cfg.originatingSystem] Identifies the originating system for BCF records.
     * @param {String} [cfg.authoringTool] Identifies the authoring tool for BCF records.
     */
    constructor(viewer, cfg = {}) {

        super("BCFViewpoints", viewer, cfg);

        /**
         * Identifies the originating system to include in BCF viewpoints saved by this plugin.
         * @property originatingSystem
         * @type {string}
         */
        this.originatingSystem = cfg.originatingSystem || "xeokit";

        /**
         * Identifies the authoring tool to include in BCF viewpoints saved by this plugin.
         * @property authoringTool
         * @type {string}
         */
        this.authoringTool = cfg.authoringTool || "xeokit";
    }

    /**
     * Saves viewer state to a BCF viewpoint.
     *
     * @returns {*} BCF JSON viewpoint object
     * @example
     *
     * const viewer = new Viewer();
     *
     * const bcfPlugin = new BCFPlugin(viewer, {
     *     //...
     * });
     *
     * const viewpoint = bcfPlugin.getViewpoint();
     *
     * // viewpoint will resemble the following:
     *
     * {
     *     perspective_camera: {
     *         camera_view_point: {
     *             x: 0.0,
     *             y: 0.0,
     *             z: 0.0
     *         },
     *         camera_direction: {
     *             x: 1.0,
     *             y: 1.0,
     *             z: 2.0
     *         },
     *         camera_up_vector: {
     *             x: 0.0,
     *             y: 0.0,
     *             z: 1.0
     *         },
     *         field_of_view: 90.0
     *     },
     *     lines: [],
     *     clipping_planes: [{
     *         location: {
     *             x: 0.5,
     *             y: 0.5,
     *             z: 0.5
     *         },
     *         direction: {
     *             x: 1.0,
     *             y: 0.0,
     *             z: 0.0
     *         }
     *     }],
     *     bitmaps: [],
     *     snapshot: {
     *         snapshot_type: png,
     *         snapshot_data: "data:image/png;base64,......"
     *     },
     *     components: {
     *         visibility: {
     *             default_visibility: false,
     *             exceptions: [{
     *                 ifc_guid: 4$cshxZO9AJBebsni$z9Yk,
     *                 originating_system: xeokit.io,
     *                 authoring_tool_id: xeokit/v1.0
     *             }]
     *        },
     *         selection: [{
     *            ifc_guid: "4$cshxZO9AJBebsni$z9Yk",
     *         }]
     *     }
     * }
     */
    getViewpoint() {

        const scene = this.viewer.scene;
        const camera = scene.camera;

        let bcfViewpoint = {};

        // Camera

        bcfViewpoint.perspective_camera = {
            camera_view_point: xyzArrayToObject(camera.eye),
            camera_direction: xyzArrayToObject(camera.look),
            camera_up_vector: xyzArrayToObject(camera.up),
            field_of_view: camera.perspective.fov,
        };

        bcfViewpoint.orthogonal_camera = {
            camera_view_point: xyzArrayToObject(camera.eye),
            camera_direction: xyzArrayToObject(camera.look),
            camera_up_vector: xyzArrayToObject(camera.up),
            view_to_world_scale: camera.ortho.scale,
        };

        bcfViewpoint.lines = [];
        bcfViewpoint.bitmaps = [];

        // Clipping planes

        bcfViewpoint.clipping_planes = [];
        const clips = scene.clips;
        for (let id in clips) {
            if (clips.hasOwnProperty(id)) {
                let clip = clips[id];
                bcfViewpoint.clipping_planes.push({
                    location: xyzArrayToObject(clip.pos),
                    direction: xyzArrayToObject(clip.dir)
                });
            }
        }

        // Entity states

        bcfViewpoint.components = {
            visibility: {
                view_setup_hints: {
                    spaces_visible: false,
                    space_boundaries_visible: false,
                    openings_visible: false
                }
            }
        };

        const objectIds = scene.objectIds;
        const visibleObjects = scene.visibleObjects;
        const visibleObjectIds = scene.visibleObjectIds;
        const invisibleObjectIds = objectIds.filter(id => !visibleObjects[id]);
        const selectedObjectIds = scene.selectedObjectIds;

        if (visibleObjectIds.length < invisibleObjectIds.length) {
            bcfViewpoint.components.visibility.exceptions = visibleObjectIds.map(el => this._objectIdToComponent(el));
            bcfViewpoint.components.visibility.default_visibility = false;
        } else {
            bcfViewpoint.components.visibility.exceptions = invisibleObjectIds.map(el => this._objectIdToComponent(el));
            bcfViewpoint.components.visibility.default_visibility = true;
        }

        bcfViewpoint.components.selection = selectedObjectIds.map(el => this._objectIdToComponent(el));

        bcfViewpoint.snapshot = {
            snapshot_type: "png",
            snapshot_data: scene.canvas.canvas.toDataURL()
        };

        return bcfViewpoint;
    }

    _objectIdToComponent(objectId) {
        return {
            ifc_guid: objectId,
            originating_system: this.originatingSystem || "xeokit.io",
            authoring_tool_id: this.authoringTool || "xeokit.io"
        };
    }

    /**
     * Sets viewer state to the given BCF viewpoint.
     *
     * @param bcfViewpoint {*} BCF JSON viewpoint object or "reset" / "RESET" to reset the viewer, which clears clipping planes,
     * shows default visible entities and restores camera to initial default position.
     */
    setViewpoint(bcfViewpoint) {

        var self = this;

        if (!bcfViewpoint) {
            return;
        }

        const viewer = this.viewer;

        if (bcfViewpoint.length && bcfViewpoint.toUpperCase() === 'RESET') {
            viewer.resetView();
            return;
        }

        const scene = this.viewer.scene;
        const camera = scene.camera;


        if (bcfViewpoint.perspective_camera) {
            camera.eye = xyzObjectToArray(bcfViewpoint.perspective_camera.camera_view_point, tempVec3);
            camera.look = xyzObjectToArray(bcfViewpoint.perspective_camera.camera_direction, tempVec3);
            camera.up = xyzObjectToArray(bcfViewpoint.perspective_camera.camera_up_vector, tempVec3);
            camera.perspective.fov = bcfViewpoint.perspective_camera.field_of_view;
        }

        if (bcfViewpoint.orthogonal_camera) {
            camera.eye = xyzObjectToArray(bcfViewpoint.orthogonal_camera.camera_view_point, tempVec3);
            camera.look = xyzObjectToArray(bcfViewpoint.orthogonal_camera.camera_direction, tempVec3);
            camera.up = xyzObjectToArray(bcfViewpoint.orthogonal_camera.camera_up_vector, tempVec3);
            camera.ortho.scale = bcfViewpoint.orthogonal_camera.field_of_view;
        }

        if (bcfViewpoint.clipping_planes) {
            bcfViewpoint.clipping_planes.forEach(function (e) {
                new Clip(viewer.scene, {
                    pos: xyzObjectToArray(e.location, tempVec3),
                    dir: xyzObjectToArray(e.direction, tempVec3)
                });
            });
        }

        if (bcfViewpoint.components) {
            if (!bcfViewpoint.components.visibility.default_visibility) {
                scene.setVisible(scene.objectIds, false);
                bcfViewpoint.components.visibility.exceptions.forEach(x => scene.setVisible(x.ifc_guid, true));
            } else {
                scene.setVisible(scene.objectIds, true);
                scene.setVisible("space", false);
                bcfViewpoint.components.visibility.exceptions.forEach(x => scene.setVisible(x.ifc_guid, false));
            }
        }

        if (bcfViewpoint.components.selection) {
            scene.setSelected(scene.selectedObjects, false);
            Object.keys(scene.models).forEach(id => {
                bcfViewpoint.components.selection.forEach(x => scene.setSelected(x.ifc_guid, true));
            });
        }
    }

    /**
     * Destroys this plugin.
     */
    destroy() {
        super.destroy();
    }
}

function xyzArrayToObject(arr) {
    return {"x": arr[0], "y": arr[1], "z": arr[2]};
}

function xyzObjectToArray(xyz, arry) {
    arry = new Float32Array(3);
    arry[0] = xyz.x;
    arry[1] = xyz.y;
    arry[2] = xyz.z;
    return arry;
}

export {BCFViewpointsPlugin}