import {Plugin} from "./../../../viewer/Plugin.js";
import {Clip, math} from "../../../xeogl/xeogl.module.js"

const tempVec3 = math.vec3();

/**
 Viewer plugin that saves and loads BCF viewpoints as JSON objects.

 BCF is a format for managing issues on a BIM project. This plugin's viewpoints conform to
 the <a href="https://github.com/buildingSMART/BCF-API">BCF Version 2.1</a> specification.

 @class BCFViewpointsPlugin
 @constructor
 @param viewer {Viewer} The xeoviewer viewer.
 @param [cfg] {*} Plugin configuration
 @param [cfg.originatingSystem] {string} Identifies the originating system for BCF records.
 @param [cfg.authoringTool] {string} Identifies the authoring tool for BCF records.
 */
class BCFViewpointsPlugin extends Plugin {

    constructor(viewer, cfg = {}) {

        super("BCFViewpoints", viewer, cfg);

        /**
         * Identifies the originating system to include in BCF viewpoints saved by this plugin.
         * @property originatingSystem
         * @type {string}
         */
        this.originatingSystem = cfg.originatingSystem || "xeogl";

        /**
         * Identifies the authoring tool to include in BCF viewpoints saved by this plugin.
         * @property authoringTool
         * @type {string}
         */
        this.authoringTool = cfg.authoringTool || "xeogl";
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
     *                 originating_system: BIMData.io,
     *                 authoring_tool_id: BIMViewer/v1.0
     *             }]
     *        },
     *         selection: [{
     *            ifc_guid: "4$cshxZO9AJBebsni$z9Yk",
     *         }]
     *     }
     * }
     */
    getViewpoint() {

        // https://github.com/buildingSMART/BCF-API

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
        for (const id in clips) {
            let clip = clips[id];
            bcfViewpoint.clipping_planes.push({
                location: xyzArrayToObject(clip.pos),
                direction: xyzArrayToObject(clip.dir)
            });
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

        const entityIds = scene.entityIds;
        const visibleEntities = scene.visibleEntities;
        const visibleEntityIds = scene.visibleEntityIds;
        const invisibleEntityIds = entityIds.filter(id => !visibleEntities[id]);
        const selectedEntityIds = scene.selectedEntityIds;

        if (visibleEntityIds.length < invisibleEntityIds.length) {
            bcfViewpoint.components.visibility.exceptions = visibleEntityIds.map(el => this._objectIdToComponent(el));
            bcfViewpoint.components.visibility.default_visibility = false;
        } else {
            bcfViewpoint.components.visibility.exceptions = invisibleEntityIds.map(el => this._objectIdToComponent(el));
            bcfViewpoint.components.visibility.default_visibility = true;
        }

        bcfViewpoint.components.selection = selectedEntityIds.map(el => this._objectIdToComponent(el));

        bcfViewpoint.snapshot = {
            snapshot_type: "png",
            snapshot_data: scene.canvas.canvas.toDataURL()
        };

        return bcfViewpoint;
    }

    _objectIdToComponent(o) {
        return {
            ifc_guid: o.split('#')[1],
            originating_system: this.originatingSystem || "xeoviewer.org",
            authoring_tool_id: this.authoringTool || "xeoviewer.org"
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

        // TODO

        // if (bcfViewpoint.components) {
        //     if (!bcfViewpoint.components.visibility.default_visibility) {
        //         this.hide();
        //         this.getModels().forEach(model => {
        //             bcfViewpoint.components.visibility.exceptions.forEach(x => self.show(model + '#' + x.ifc_guid));
        //         });
        //     } else {
        //         this.show();
        //         this.hide('space');
        //         this.getModels().forEach(model => {
        //             bcfViewpoint.components.visibility.exceptions.forEach(x => self.hide(model + '#' + x.ifc_guid));
        //         });
        //     }
        // }
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