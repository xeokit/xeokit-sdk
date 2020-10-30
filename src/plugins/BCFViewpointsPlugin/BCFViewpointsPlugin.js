import {Plugin} from "../../viewer/Plugin.js";
import {SectionPlane} from "../../viewer/scene/sectionPlane/SectionPlane.js";
import {math} from "../../viewer/scene/math/math.js";

const tempVec3 = math.vec3();

/**
 * {@link Viewer} plugin that saves and loads BCF viewpoints as JSON objects.
 *
 * BCF is a format for managing issues on a BIM project. This plugin's viewpoints conform to
 * the <a href="https://github.com/buildingSMART/BCF-API">BCF Version 2.1</a> specification.
 *
 * ## Saving a BCF Viewpoint
 *
 * In the example below we'll create a {@link Viewer}, load a glTF model into it using a {@link GLTFLoaderPlugin},
 * slice the model in half using a {@link SectionPlanesPlugin}, then use a {@link BCFViewpointsPlugin#getViewpoint}
 * to save a viewpoint to JSON, which we'll log to the JavaScript developer console.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#BCF_SaveViewpoint)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {GLTFLoaderPlugin} from "../src/plugins/GLTFLoaderPlugin/GLTFLoaderPlugin.js";
 * import {SectionPlanesPlugin} from "../src/plugins/SectionPlanesPlugin/SectionPlanesPlugin.js";
 * import {BCFViewpointsPlugin} from "../src/plugins/BCFViewpointsPlugin/BCFViewpointsPlugin.js";
 *
 * // Create a Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 * });
 *
 * // Add a GLTFLoaderPlugin
 * const gltfLoader = new GLTFLoaderPlugin(viewer);
 *
 * // Add a SectionPlanesPlugin
 * const sectionPlanes = new SectionPlanesPlugin(viewer);
 *
 * // Add a BCFViewpointsPlugin
 * const bcfViewpoints = new BCFViewpointsPlugin(viewer);
 *
 * // Load a glTF model
 * const modelNode = gltfLoader.load({
 *      id: "myModel",
 *      src: "./models/gltf/schependomlaan/scene.gltf",
 *      metaModelSrc: "./metaModels/schependomlaan/metaModel.json", // Creates a MetaObject instances in scene.metaScene.metaObjects
 *      lambertMaterial: true,
 *      edges: true // Emphasise edges
 * });
 *
 * // Slice it in half
 * sectionPlanes.createSectionPlane({
 *      id: "myClip",
 *      pos: [0, 0, 0],
 *      dir: [0.5, 0.0, 0.5]
 * });
 *
 * // When model is loaded, set camera, select some objects and capture a BCF viewpoint to the console
 * modelNode.on("loaded", () => {
 *
 *      const scene = viewer.scene;
 *      const camera = scene.camera;
 *
 *      camera.eye = [-2.37, 18.97, -26.12];
 *      camera.look = [10.97, 5.82, -11.22];
 *      camera.up = [0.36, 0.83, 0.40];
 *
 *      scene.setObjectsSelected([
 *          "3b2U496P5Ebhz5FROhTwFH",
 *          "2MGtJUm9nD$Re1_MDIv0g2",
 *          "3IbuwYOm5EV9Q6cXmwVWqd",
 *          "3lhisrBxL8xgLCRdxNG$2v",
 *          "1uDn0xT8LBkP15zQc9MVDW"
 *      ], true);
 *
 *      const viewpoint = bcfViewpoints.getViewpoint();
 *      const viewpointStr = JSON.stringify(viewpoint, null, 4);
 *
 *      console.log(viewpointStr);
 * });
 * ````
 *
 * ## Saving View Setup Hints
 *
 * BCFViewpointsPlugin can optionally save hints in the viewpoint, which indicate how to set up the view when
 * loading it again.
 *
 * Here's the {@link BCFViewpointsPlugin#getViewpoint} call again, this time saving some hints:
 *
 * ````javascript
 * const viewpoint = bcfViewpoints.getViewpoint({ // Options
 *     spacesVisible: true, // Force IfcSpace types visible in the viewpoint (default is false)
 *     spaceBoundariesVisible: false, // Show IfcSpace boundaries in the viewpoint (default is false)
 *     openingsVisible: true // Force IfcOpening types visible in the viewpoint (default is false)
 * });
 * ````
 *
 * ## Loading a BCF Viewpoint
 *
 * Assuming that we have our BCF viewpoint in a JSON object, let's now restore it with {@link BCFViewpointsPlugin#setViewpoint}:
 *
 * ````javascript
 * bcfViewpoints.setViewpoint(viewpoint);
 * ````
 *
 * ## Handling BCF Incompatibility with xeokit's Camera
 *
 * xeokit's {@link Camera#look} is the current 3D *point-of-interest* (POI).
 *
 * A BCF viewpoint, however, has a direction vector instead of a POI, and so {@link BCFViewpointsPlugin#getViewpoint} saves
 * xeokit's POI as a normalized vector from {@link Camera#eye} to {@link Camera#look}, which unfortunately loses
 * that positional information. Loading the viewpoint with {@link BCFViewpointsPlugin#setViewpoint} will restore {@link Camera#look} to
 * the viewpoint's camera position, offset by the normalized vector.
 *
 * As shown below, providing a ````rayCast```` option to ````setViewpoint```` will set {@link Camera#look} to the closest
 * surface intersection on the direction vector. Internally, ````setViewpoint```` supports this option by firing a ray
 * along the vector, and if that hits an {@link Entity}, sets {@link Camera#look} to ray's intersection point with the
 * Entity's surface.
 *
 * ````javascript
 * bcfViewpoints.setViewpoint(viewpoint, {
 *      rayCast: true // <<--------------- Attempt to set Camera#look to surface intersection point (default)
 * });
 * ````
 *
 * ## Dealing With Loaded Models That Are Not in the Viewpoint
 *
 * If, for example, we load model "duplex", hide some objects, then save a BCF viewpoint with
 * ````BCFViewpointsPlugin````, then load another model, "schependomlaan", then load the viewpoint again, then
 * sometimes all of the objects in model "schependomlaan" become visible, along with the visible objects in the
 * viewpoint, which belong to model "duplex".
 *
 * The reason is that, when saving a BCF viewpoint, BCF logic works like the following pseudo code:
 *
 * ````
 * If numVisibleObjects < numInvisibleObjects
 *      save IDs of visible objects in BCF
 *      exceptions = "visible objects"
 * else
 *      save IDS of invisible objects in BCF
 *      exceptions = "invisible objects"
 * ````
 *
 * When loading the viewpoint again:
 *
 * ````
 * If exceptions = "visible objects"
 *      hide all objects
 *      show visible objects in BCF
 * else
 *      show all objects
 *      hide invisible objects in BCF
 * ````
 *
 * When the exception is "visible objects", loading the viewpoint shows all the objects in the first, which includes
 * objects in "schependomlaan", which can be confusing, because those were not even loaded when we first
 * saved the viewpoint..
 *
 * To solve this, we can supply a ````defaultInvisible```` option to {@link BCFViewpointsPlugin#getViewpoint}, which
 * will force the plugin to save the IDs of all visible objects while making invisible objects the exception.
 *
 * That way, when we load the viewpoint again, after loading model "schependomlaan", the plugin will hide all objects
 * in the scene first (which will include objects belonging to model "schependomlaan"), then make the objects in the
 * viewpoint visible (which will only be those of object "duplex").
 *
 * ````javascript
 * const viewpoint = bcfViewpoints.getViewpoint({ // Options
 *     //..
 *     defaultInvisible: true
 * });
 * ````
 *
 * [[Run an example](http://xeokit.github.io/xeokit-sdk/examples/#BCF_LoadViewpoint_defaultInvisible)]
 *
 * @class BCFViewpointsPlugin
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
        this.originatingSystem = cfg.originatingSystem || "xeokit.io";

        /**
         * Identifies the authoring tool to include in BCF viewpoints saved by this plugin.
         * @property authoringTool
         * @type {string}
         */
        this.authoringTool = cfg.authoringTool || "xeokit.io";
    }

    /**
     * Saves viewer state to a BCF viewpoint.
     *
     * Note that xeokit's {@link Camera#look} is the **point-of-interest**, whereas the BCF ````camera_direction```` is a
     * direction vector. Therefore, we save ````camera_direction```` as the vector from {@link Camera#eye} to {@link Camera#look}.
     *
     * @param {*} [options] Options for getting the viewpoint.
     * @param {Boolean} [options.spacesVisible=false] Indicates whether ````IfcSpace```` types should be forced visible in the viewpoint.
     * @param {Boolean} [options.openingsVisible=false] Indicates whether ````IfcOpening```` types should be forced visible in the viewpoint.
     * @param {Boolean} [options.spaceBoundariesVisible=false] Indicates whether the boundaries of ````IfcSpace```` types should be visible in the viewpoint.
     * @param {Boolean} [options.snapshot=true] Indicates whether the snapshot should be included in the viewpoint.
     * @param {Boolean} [options.defaultInvisible=false] When ````true````, will save the default visibility of all objects
     * as ````false````. This means that when we load the viewpoint again, and there are additional models loaded that
     * were not saved in the viewpoint, those models will be hidden when we load the viewpoint, and that only the
     * objects in the viewpoint will be visible.
     * @param {Boolean} [options.reverseClippingPlanes=false] When ````true````, clipping planes are reversed (https://github.com/buildingSMART/BCF-XML/issues/193)
     * @returns {*} BCF JSON viewpoint object
     * @example
     *
     * const viewer = new Viewer();
     *
     * const bcfPlugin = new BCFPlugin(viewer, {
     *     //...
     * });
     *
     * const viewpoint = bcfPlugin.getViewpoint({ // Options - see constructor
     *     spacesVisible: false,          // Default
     *     spaceBoundariesVisible: false, // Default
     *     openingsVisible: false         // Default
     * });
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
    getViewpoint(options = {}) {
        const scene = this.viewer.scene;
        const camera = scene.camera;
        const realWorldOffset = scene.realWorldOffset;
        const reverseClippingPlanes = (options.reverseClippingPlanes === true);
        let bcfViewpoint = {};

        // Camera
        let lookDirection = math.normalizeVec3(math.subVec3(camera.look, camera.eye, math.vec3()));
        let eye = camera.eye;
        let up = camera.up;

        if (camera.yUp) {
            // BCF is Z up
            lookDirection = YToZ(lookDirection);
            eye = YToZ(eye);
            up = YToZ(up);
        }

        const camera_view_point = xyzArrayToObject(math.addVec3(eye, realWorldOffset));

        if (camera.projection === "ortho") {
            bcfViewpoint.orthogonal_camera = {
                camera_view_point: camera_view_point,
                camera_direction: xyzArrayToObject(lookDirection),
                camera_up_vector: xyzArrayToObject(up),
                view_to_world_scale: camera.ortho.scale,
            };
        } else {
            bcfViewpoint.perspective_camera = {
                camera_view_point: camera_view_point,
                camera_direction: xyzArrayToObject(lookDirection),
                camera_up_vector: xyzArrayToObject(up),
                field_of_view: camera.perspective.fov,
            };
        }

        // Clipping planes

        const sectionPlanes = scene.sectionPlanes;
        for (let id in sectionPlanes) {
            if (sectionPlanes.hasOwnProperty(id)) {
                let sectionPlane = sectionPlanes[id];

                let location = sectionPlane.pos;

                let direction;
                if (reverseClippingPlanes) {
                    direction = math.negateVec3(sectionPlane.dir, math.vec3());
                } else {
                    direction = sectionPlane.dir;
                }

                if (camera.yUp) {
                    // BCF is Z up
                    location = YToZ(location);
                    direction = YToZ(direction);
                }
                math.addVec3(location, realWorldOffset);

                location = xyzArrayToObject(location);
                direction = xyzArrayToObject(direction);
                if (!bcfViewpoint.clipping_planes) {
                    bcfViewpoint.clipping_planes = [];
                }
                bcfViewpoint.clipping_planes.push({location, direction});
            }
        }

        // Entity states

        bcfViewpoint.components = {
            visibility: {
                view_setup_hints: {
                    spaces_visible: !!options.spacesVisible,
                    space_boundaries_visible: !!options.spaceBoundariesVisible,
                    openings_visible: !!options.openingsVisible
                }
            }
        };

        const opacityObjectIds = new Set(scene.opacityObjectIds);
        const xrayedObjectIds = new Set(scene.xrayedObjectIds);
        const colorizedObjectIds = new Set(scene.colorizedObjectIds);

        const coloring = Object.values(scene.objects)
            .filter(object => opacityObjectIds.has(object.id) || colorizedObjectIds.has(object.id) || xrayedObjectIds.has(object.id))
            .reduce((coloring, object) => {
                let color = colorizeToRGB(object.colorize);
                let alpha;

                if (object.xrayed) {
                    if (scene.xrayMaterial.fillAlpha === 0.0 && scene.xrayMaterial.edgeAlpha !== 0.0) {
                        // BCF can't deal with edges. If xRay is implemented only with edges, set an arbitrary opacity
                        alpha = 0.1;
                    } else {
                        alpha = scene.xrayMaterial.fillAlpha;
                    }
                    alpha = Math.round(alpha * 255).toString(16).padStart(2, "0");
                    color = alpha + color;
                } else if (opacityObjectIds.has(object.id)) {
                    alpha = Math.round(object.opacity * 255).toString(16).padStart(2, "0");
                    color = alpha + color;
                }

                if (!coloring[color]) {
                    coloring[color] = [];
                }
                coloring[color].push({
                    ifc_guid: object.id,
                    originating_system: this.originatingSystem
                });
                return coloring;
            }, {});

        const coloringArray = Object.entries(coloring).map(([color, components]) => { return { color, components } });

        bcfViewpoint.components.coloring = coloringArray;

        const objectIds = scene.objectIds;
        const visibleObjects = scene.visibleObjects;
        const visibleObjectIds = scene.visibleObjectIds;
        const invisibleObjectIds = objectIds.filter(id => !visibleObjects[id]);
        const selectedObjectIds = scene.selectedObjectIds;

        if (options.defaultInvisible || visibleObjectIds.length < invisibleObjectIds.length) {
            bcfViewpoint.components.visibility.exceptions = visibleObjectIds.map(el => this._objectIdToComponent(el));
            bcfViewpoint.components.visibility.default_visibility = false;
        } else {
            bcfViewpoint.components.visibility.exceptions = invisibleObjectIds.map(el => this._objectIdToComponent(el));
            bcfViewpoint.components.visibility.default_visibility = true;
        }

        bcfViewpoint.components.selection = selectedObjectIds.map(el => this._objectIdToComponent(el));

        if (options.snapshot !== false) {
            bcfViewpoint.snapshot = {
                snapshot_type: "png",
                snapshot_data: this.viewer.getSnapshot({format: "png"})
            };
        }

        return bcfViewpoint;
    }

    _objectIdToComponent(objectId) {
        return {
            ifc_guid: objectId,
            originating_system: this.originatingSystem,
            authoring_tool_id: this.authoringTool
        };
    }

    /**
     * Sets viewer state to the given BCF viewpoint.
     *
     * Note that xeokit's {@link Camera#look} is the **point-of-interest**, whereas the BCF ````camera_direction```` is a
     * direction vector. Therefore, when loading a BCF viewpoint, we set {@link Camera#look} to the absolute position
     * obtained by offsetting the BCF ````camera_view_point````  along ````camera_direction````.
     *
     * When loading a viewpoint, we also have the option to find {@link Camera#look} as the closest point of intersection
     * (on the surface of any visible and pickable {@link Entity}) with a 3D ray fired from ````camera_view_point```` in
     * the direction of ````camera_direction````.
     *
     * @param {*} bcfViewpoint  BCF JSON viewpoint object,
     * shows default visible entities and restores camera to initial default position.
     * @param {*} [options] Options for setting the viewpoint.
     * @param {Boolean} [options.rayCast=true] When ````true```` (default), will attempt to set {@link Camera#look} to the closest
     * point of surface intersection with a ray fired from the BCF ````camera_view_point```` in the direction of ````camera_direction````.
     * @param {Boolean} [options.immediate=true] When ````true```` (default), immediately set camera position.
     * @param {Boolean} [options.duration] Flight duration in seconds.  Overrides {@link CameraFlightAnimation#duration}. Only applies when ````immediate```` is ````false````.
     * @param {Boolean} [options.reset=true] When ````true```` (default), set {@link Entity#xrayed} and {@link Entity#highlighted} ````false```` on all scene objects.
     * @param {Boolean} [options.reverseClippingPlanes=false] When ````true````, clipping planes are reversed (https://github.com/buildingSMART/BCF-XML/issues/193)
     * @param {Boolean} [options.updateCompositeObjects=false] When ````true````, then when visibility and selection updates refer to composite objects (eg. an IfcBuildingStorey),
     * then this method will apply the updates to objects within those composites.
     */
    setViewpoint(bcfViewpoint, options = {}) {
        if (!bcfViewpoint) {
            return;
        }

        const viewer = this.viewer;
        const scene = viewer.scene;
        const camera = scene.camera;
        const rayCast = (options.rayCast !== false);
        const immediate = (options.immediate !== false);
        const reset = (options.reset !== false);
        const updateCompositeObjects = (!!options.updateCompositeObjects);
        const realWorldOffset = scene.realWorldOffset;
        const reverseClippingPlanes = (options.reverseClippingPlanes === true);

        scene.clearSectionPlanes();

        if (bcfViewpoint.clipping_planes) {
            bcfViewpoint.clipping_planes.forEach(function (e) {
                let pos = xyzObjectToArray(e.location, tempVec3);
                let dir = xyzObjectToArray(e.direction, tempVec3);

                if (reverseClippingPlanes) {
                    math.negateVec3(dir);
                }
                math.subVec3(pos, realWorldOffset);

                if (camera.yUp) {
                    pos = ZToY(pos);
                    dir = ZToY(dir);
                }
                new SectionPlane(scene, {pos, dir});
            });
        }

        if (reset) {
            scene.setObjectsXRayed(scene.xrayedObjectIds, false);
            scene.setObjectsHighlighted(scene.highlightedObjectIds, false);
            scene.setObjectsSelected(scene.selectedObjectIds, false);
        }

        if (bcfViewpoint.components) {

            if (bcfViewpoint.components.visibility) {

                if (!bcfViewpoint.components.visibility.default_visibility) {
                    scene.setObjectsVisible(scene.objectIds, false);
                    if (bcfViewpoint.components.visibility.exceptions) {
                        bcfViewpoint.components.visibility.exceptions.forEach((x) => {
                            const entity = viewer.scene.objects[x.ifc_guid];
                            if (entity) {
                                entity.visible = true;
                            } else {
                                scene.setObjectsVisible(updateCompositeObjects ? viewer.metaScene.getObjectIDsInSubtree(x.ifc_guid) : x.ifc_guid, true);
                            }
                        });
                    }
                } else {
                    scene.setObjectsVisible(scene.objectIds, true);
                    if (bcfViewpoint.components.visibility.exceptions) {
                        bcfViewpoint.components.visibility.exceptions.forEach((x) => {
                            const entity = viewer.scene.objects[x.ifc_guid];
                            if (entity) {
                                entity.visible = false;
                            } else {
                                scene.setObjectsVisible(updateCompositeObjects ? viewer.metaScene.getObjectIDsInSubtree(x.ifc_guid) : x.ifc_guid, false);
                            }
                        });
                    }
                }

                const view_setup_hints = bcfViewpoint.components.visibility.view_setup_hints;
                if (view_setup_hints) {
                    if (view_setup_hints.spaces_visible === false) {
                        scene.setObjectsVisible(viewer.metaScene.getObjectIDsByType("IfcSpace"), false);
                    }
                    if (view_setup_hints.openings_visible === false) {
                        scene.setObjectsVisible(viewer.metaScene.getObjectIDsByType("IfcOpening"), false);
                    }
                    if (view_setup_hints.space_boundaries_visible !== undefined) {
                        // TODO: Ability to show boundaries
                    }
                }
            }


            if (bcfViewpoint.components.selection) {
                scene.setObjectsSelected(scene.selectedObjectIds, false);
                Object.keys(scene.models).forEach(() => {
                    bcfViewpoint.components.selection.forEach(x => scene.setObjectsSelected(updateCompositeObjects ? viewer.metaScene.getObjectIDsInSubtree(x.ifc_guid) : x.ifc_guid, true));
                });
            }

            if (bcfViewpoint.components.coloring) {
                bcfViewpoint.components.coloring.forEach(coloring => {
                    let uuids = coloring.components.map(component => component.ifc_guid);
                    let color = coloring.color;
                    if (color.length === 8) {
                        // There is an alpha color
                        let alpha = parseInt(color.substring(0, 2), 16) / 256;
                        color = color.substring(2);
                        scene.setObjectsOpacity(uuids, alpha);
                    }
                    let colorArray = [
                        parseInt(color.substring(0, 2), 16) / 256,
                        parseInt(color.substring(2, 4), 16) / 256,
                        parseInt(color.substring(4, 6), 16) / 256
                    ];
                    scene.setObjectsColorized(uuids, colorArray);
                })
            }
        }

        if (bcfViewpoint.perspective_camera || bcfViewpoint.orthogonal_camera) {
            let eye;
            let look;
            let up;
            let projection;

            if (bcfViewpoint.perspective_camera) {
                eye = xyzObjectToArray(bcfViewpoint.perspective_camera.camera_view_point, tempVec3);
                look = xyzObjectToArray(bcfViewpoint.perspective_camera.camera_direction, tempVec3);
                up = xyzObjectToArray(bcfViewpoint.perspective_camera.camera_up_vector, tempVec3);

                camera.perspective.fov = bcfViewpoint.perspective_camera.field_of_view;

                projection = "perspective";
            } else {
                eye = xyzObjectToArray(bcfViewpoint.orthogonal_camera.camera_view_point, tempVec3);
                look = xyzObjectToArray(bcfViewpoint.orthogonal_camera.camera_direction, tempVec3);
                up = xyzObjectToArray(bcfViewpoint.orthogonal_camera.camera_up_vector, tempVec3);

                camera.ortho.scale = bcfViewpoint.orthogonal_camera.view_to_world_scale;

                projection = "ortho";
            }

            math.subVec3(eye, realWorldOffset);

            if (camera.yUp) {
                eye = ZToY(eye);
                look = ZToY(look);
                up = ZToY(up);
            }

            if (rayCast) {
                const hit = scene.pick({
                    pickSurface: true,  // <<------ This causes picking to find the intersection point on the entity
                    origin: eye,
                    direction: look
                });
                look = (hit ? hit.worldPos : math.addVec3(eye, look, tempVec3));
            } else {
                look = math.addVec3(eye, look, tempVec3);
            }

            if (immediate) {
                camera.eye = eye;
                camera.look = look;
                camera.up = up;
                camera.projection = projection;
            } else {
                viewer.cameraFlight.flyTo({eye, look, up, duration: options.duration, projection});
            }
        }
    }

    /**
     * Destroys this BCFViewpointsPlugin.
     */
    destroy() {
        super.destroy();
    }
}

function xyzArrayToObject(arr) {
    return {"x": arr[0], "y": arr[1], "z": arr[2]};
}

function xyzObjectToArray(xyz, arry) {
    arry = new Float64Array(3);
    arry[0] = xyz.x;
    arry[1] = xyz.y;
    arry[2] = xyz.z;
    return arry;
}

function YToZ(vec) {
    return new Float64Array([vec[0], -vec[2], vec[1]]);
}

function ZToY(vec) {
    return new Float64Array([vec[0], vec[2], -vec[1]]);
}

function colorizeToRGB(color) {
    let rgb = "";
    rgb += Math.round(color[0] * 255).toString(16).padStart(2, "0");
    rgb += Math.round(color[1] * 255).toString(16).padStart(2, "0");
    rgb += Math.round(color[2] * 255).toString(16).padStart(2, "0");
    return rgb;
}

export {BCFViewpointsPlugin};
