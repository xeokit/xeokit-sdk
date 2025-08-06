import {Plugin} from "../../viewer/Plugin.js";
import {SectionPlane} from "../../viewer/scene/sectionPlane/SectionPlane.js";
import {Bitmap} from "../../viewer/scene/Bitmap/index.js";
import {LineSet} from "../../viewer/scene/LineSet/index.js";

import {math} from "../../viewer/scene/math/math.js";

const tempVec3 = math.vec3();
const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

/**
 * {@link Viewer} plugin that saves and loads BCF viewpoints as JSON objects.
 *
 * [<img src="http://xeokit.github.io/xeokit-sdk/assets/images/BCFViewpointsPlugin.png">](/examples/index.html#BCF_SaveViewpoint)
 *
 * * [[Example 1: Saving viewer state to a BCF viewpoint](https://xeokit.github.io/xeokit-sdk/examples/index.html#BCF_SaveViewpoint)]
 * * [[Example 2: Loading viewer state from a BCF viewpoint](https://xeokit.github.io/xeokit-sdk/examples/index.html#BCF_LoadViewpoint)]
 *
 * ## Overview
 *
 * BCF is an open standard that enables workflow communications between BIM software tools. An XML schema, called
 * Building Collaboration Format (BCF), encodes messages that inform one BIM tool of issues found by another.
 *
 * A BCF viewpoint captures a viewpoint of a model that highlights an issue. The viewpoint can then be loaded by another
 * viewer to examine the issue.
 *
 * Using this plugin, a xeokit {@link Viewer} can exchange BCF-encoded viewpoints with other BIM software,
 * allowing us to use the Viewer to report and view issues in BIM models.
 *
 * This plugin's viewpoints conform to the <a href="https://github.com/buildingSMART/BCF-API">BCF Version 2.1</a> specification.
 *
 * ## Supported BCF Elements
 *
 * BCFViewpointsPlugin saves and loads the following state in BCF viewpoints:
 *
 * * {@link Camera} position, orientation and projection
 * * {@link Entity} visibilities and selection states
 * * {@link SectionPlane}s to slice the model
 * * {@link LineSet}s to show 3D lines
 * * {@link Bitmap}s to show images
 *
 * ## Saving a BCF Viewpoint
 *
 * In the example below we'll create a {@link Viewer}, load an ````.XKT```` model into it using an {@link XKTLoaderPlugin},
 * slice the model in half using a {@link SectionPlanesPlugin}, create a grid ground plane using a {@link LineSet} and a 2D
 * plan view using a {@link Bitmap}, then use a {@link BCFViewpointsPlugin#getViewpoint}
 * to save a viewpoint to JSON, which we'll log to the JavaScript developer console.
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#BCF_SaveViewpoint)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, SectionPlanesPlugin,
 *      LineSet, Bitmap, buildGridGeometry, BCFViewpointsPlugin} from "xeokit-sdk.es.js";
 *
 * // Create a Viewer
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 * });
 *
 * // Set camera position and orientation
 * viewer.scene.camera.eye = [-48.93, 54.54, 50.41];
 * viewer.scene.camera.look = [0.55, -0.61, -0.55];
 * viewer.scene.camera.up = [0, -1, 0];
 * viewer.scene.camera.perspective.fov = 60;
 *
 * // Add a XKTLoaderPlugin
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * // Add a SectionPlanesPlugin
 * const sectionPlanes = new SectionPlanesPlugin(viewer);
 *
 * // Add a BCFViewpointsPlugin
 * const bcfViewpoints = new BCFViewpointsPlugin(viewer);
 *
 * // Load an .XKT model
 * const modelNode = xktLoader.load({
 *      id: "myModel",
 *      src: "./models/xkt/Schependomlaan.xkt",
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
 * // Create a bitmap
 * const bitmap = new Bitmap(viewer.scene, {
 *     src: "../assets/images/schependomlaanPlanView.png",
 *      visible: true,
 *      height: 24.0,
 *      pos: [-15, 0, -10],
 *      normal: [0, -1, 0],
 *      up: [0, 0, 1],
 *      collidable: false,
 *      opacity: 1.0,
 *      clippable: false,
 *      pickable: true
 *  });
 *
 * // Create a grid ground plane
 * const geometryArrays = buildGridGeometry({
 *      size: 60,
 *      divisions: 10
 *  });
 *
 * new LineSet(viewer.scene, {
 *      positions: geometryArrays.positions,
 *      indices: geometryArrays.indices,
 *      position: [10,0,10],
 *      clippable: false
 *  });
 *
 * // When model is loaded, select some objects and capture a BCF viewpoint to the console
 * modelNode.on("loaded", () => {
 *
 *      const scene = viewer.scene;
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
 * The saved BCF viewpoint would look something like below. Note that some elements are truncated for brevity.
 *
 * ````json
 * {
 *      "perspective_camera": {
 *          "camera_view_point": { "x": -48.93, "y": 54.54, "z": 50.41 },
 *          "camera_direction": { "x": 0.55, "y": -0.61, "z": -0.55},
 *          "camera_up_vector": { "x": 0.37, "y": -0.41, "z": 0.83 },
 *          "field_of_view": 60.0
 *      },
 *      "lines": [{
 *          "start_point": { "x": 1.0, "y": 1.0, "z": 1.0 },
 *          "end_point": { "x": 0.0, "y": 0.0, "z": 0.0 },
 *          //...(truncated)
 *      }],
 *      "bitmaps": [{
 *          "bitmap_type": "png",
 *          "bitmap_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAB9AAAAdp...", //...(truncated)
 *          "location": { "x": -15, "y": 10, "z": 0 },
 *          "normal": { "x": 0, "y": 0, "z": -1 },
 *          "up": { "x": 0, "y": -1, "z": 0 },
 *          "height": 24
 *      }],
 *      "clipping_planes": [{
 *          "location": { "x": 0.0, "y": 0.0, "z": 0.0 },
 *          "direction": { "x": 0.5, "y": 0.0, "z": 0.5 }
 *      }],
 *      "snapshot": {
 *          "snapshot_type": "png",
 *          "snapshot_data": "data:image/png;base64,......"
 *      },
 *      "components": {
 *          "visibility": {
 *              "default_visibility": false,
 *              "exceptions": [{
 *                      "ifc_guid": "4$cshxZO9AJBebsni$z9Yk",
 *                      "originating_system": "xeokit.io",
 *                      "authoring_tool_id": "xeokit/v3.2"
 *                  },
 *                  //...
 *              ]
 *          },
 *          "selection": [{
 *                  "ifc_guid": "4$cshxZO9AJBebsni$z9Yk",
 *              },
 *              //...
 *          ]
 *      }
 * }
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
 * ## Dealing With Loaded Models that are not in the Viewpoint
 *
 * If, for example, we load model "duplex", hide some objects, then save a BCF viewpoint with
 * ````BCFViewpointsPlugin#getViewpoint````, then load another model, "schependomlaan", then load the viewpoint again
 * with ````BCFViewpointsPlugin#setViewpoint````, then sometimes all of the objects in model "schependomlaan" become
 * visible, along with the visible objects in the viewpoint, which belong to model "duplex".
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
 * [[Run an example](/examples/index.html#BCF_LoadViewpoint_defaultInvisible)]
 *
 * ## Behaviour with XKTLoaderPlugin globalizeObjectIds
 *
 * Whenever we use {@link XKTLoaderPlugin} to load duplicate copies of the same model, after configuring
 * {@link XKTLoaderPlugin#globalizeObjectIds} ````true```` to avoid ````Entity```` ID clashes, this has consequences
 * for BCF viewpoints created by {@link BCFViewpointsPlugin#getViewpoint}.
 *
 * When no duplicate copies of a model are loaded like this, viewpoints created by {@link BCFViewpointsPlugin#getViewpoint} will
 * continue to load as usual in other BIM viewers. Conversely, a viewpoint created for a single model in other BIM viewers
 * will continue to load as usual with ````BCFViewpointsPlugin````.
 *
 * When duplicate copies of a model are loaded, however, viewpoints created by {@link BCFViewpointsPlugin#getViewpoint}
 * will contain certain changes that will affect the viewpoint's portability, however. Such viewpoints will
 * use ````authoring_tool_id```` fields to save the globalized ````Entity#id```` values, which enables the viewpoints to
 * capture the states of the individual ````Entitys```` that represent the duplicate IFC elements. Take a look at the
 * following two examples to learn more.
 *
 * * [Example: Saving a BCF viewpoint containing duplicate models](https://xeokit.github.io/xeokit-sdk/examples/index.html#BCF_SaveViewpoint_MultipleModels)
 * * [Example: Loading a BCF viewpoint containing duplicate models](https://xeokit.github.io/xeokit-sdk/examples/index.html#BCF_LoadViewpoint_MultipleModels)
 *
 * **Caveat:** when loading a BCF viewpoint, we always assume that we have loaded in our target BIM viewer the same models that were
 * loaded in the viewpoint's original authoring application when the viewpoint was created.  In the case of multi-model
 * viewpoints, the target BIM viewer, whether it be xeokit or another BIM viewer, will need to first have those exact
 * models loaded, with their objects having globalized IDs, following the same prefixing scheme we're using in
 * xeokit. Then, the viewpoint's ````authoring_tool_id```` fields will be able to resolve to their objects within the
 * target viewer.
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
     * See ````BCFViewpointsPlugin```` class comments for more info.
     *
     * @param {*} [options] Options for getting the viewpoint.
     * @param {Boolean} [options.spacesVisible=false] Indicates whether ````IfcSpace```` types should be forced visible in the viewpoint.
     * @param {Boolean} [options.openingsVisible=false] Indicates whether ````IfcOpening```` types should be forced visible in the viewpoint.
     * @param {Boolean} [options.spaceBoundariesVisible=false] Indicates whether the boundaries of ````IfcSpace```` types should be visible in the viewpoint.
     * @param {Boolean} [options.spacesTranslucent=false] Indicates whether ````IfcSpace```` types should be forced translucent in the viewpoint.
     * @param {Boolean} [options.spaceBoundariesTranslucent=false] Indicates whether the boundaries of ````IfcSpace```` types should be forced translucent in the viewpoint.
     * @param {Boolean} [options.openingsTranslucent=true] Indicates whether ````IfcOpening```` types should be forced translucent in the viewpoint.
     * @param {Boolean} [options.snapshot=true] Indicates whether the snapshot should be included in the viewpoint.
     * @param {Boolean} [options.defaultInvisible=false] When ````true````, will save the default visibility of all objects
     * as ````false````. This means that when we load the viewpoint again, and there are additional models loaded that
     * were not saved in the viewpoint, those models will be hidden when we load the viewpoint, and that only the
     * objects in the viewpoint will be visible.
     * @param {Boolean} [options.reverseClippingPlanes=false] When ````true````, clipping planes are reversed (https://github.com/buildingSMART/BCF-XML/issues/193)
     * @returns {*} BCF JSON viewpoint object
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

        // Section planes

        const sectionPlanes = scene.sectionPlanes;
        for (let id in sectionPlanes) {
            if (sectionPlanes.hasOwnProperty(id)) {
                let sectionPlane = sectionPlanes[id];
                if (!sectionPlane.active) {
                    continue;
                }
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

        // Lines

        const lineSets = scene.lineSets;
        for (let id in lineSets) {
            if (lineSets.hasOwnProperty(id)) {
                const lineSet = lineSets[id];
                if (!bcfViewpoint.lines) {
                    bcfViewpoint.lines = [];
                }
                const positions = lineSet.positions;
                const indices = lineSet.indices;
                for (let i = 0, len = indices.length / 2; i < len; i++) {
                    const a = indices[i * 2];
                    const b = indices[(i * 2) + 1];
                    bcfViewpoint.lines.push({
                        start_point: {
                            x: positions[a * 3 + 0],
                            y: positions[a * 3 + 1],
                            z: positions[a * 3 + 2]
                        },
                        end_point: {
                            x: positions[b * 3 + 0],
                            y: positions[b * 3 + 1],
                            z: positions[b * 3 + 2]
                        }
                    });
                }

            }
        }

        // Bitmaps

        const bitmaps = scene.bitmaps;
        for (let id in bitmaps) {
            if (bitmaps.hasOwnProperty(id)) {
                let bitmap = bitmaps[id];
                let location = bitmap.pos;
                let normal = bitmap.normal;
                let up = bitmap.up;
                if (camera.yUp) {
                    // BCF is Z up
                    location = YToZ(location);
                    normal = YToZ(normal);
                    up = YToZ(up);
                }
                math.addVec3(location, realWorldOffset);
                if (!bcfViewpoint.bitmaps) {
                    bcfViewpoint.bitmaps = [];
                }
                bcfViewpoint.bitmaps.push({
                    bitmap_type: bitmap.type,
                    bitmap_data: bitmap.imageData,
                    location: xyzArrayToObject(location),
                    normal: xyzArrayToObject(normal),
                    up: xyzArrayToObject(up),
                    height: bitmap.height
                });
            }
        }

        // Entity states

        bcfViewpoint.components = {
            visibility: {
                view_setup_hints: {
                    spaces_visible: !!options.spacesVisible,
                    space_boundaries_visible: !!options.spaceBoundariesVisible,
                    openings_visible: !!options.openingsVisible,
                    spaces_translucent: !!options.spaces_translucent,
                    space_boundaries_translucent: !!options.space_boundaries_translucent,
                    openings_translucent: !!options.openings_translucent
                }
            }
        };

        const opacityObjectIds = new Set(scene.opacityObjectIds);
        const xrayedObjectIds = new Set(scene.xrayedObjectIds);
        const colorizedObjectIds = new Set(scene.colorizedObjectIds);

        const coloringMap = Object.values(scene.objects)
            .filter(entity => opacityObjectIds.has(entity.id) || colorizedObjectIds.has(entity.id) || xrayedObjectIds.has(entity.id))
            .reduce((coloringMap, entity) => {

                let color = colorizeToRGB(entity.colorize);
                let alpha;

                if (entity.xrayed) {
                    if (scene.xrayMaterial.fillAlpha === 0.0 && scene.xrayMaterial.edgeAlpha !== 0.0) {
                        // BCF can't deal with edges. If xRay is implemented only with edges, set an arbitrary opacity
                        alpha = 0.1;
                    } else {
                        alpha = scene.xrayMaterial.fillAlpha;
                    }
                    alpha = Math.round(alpha * 255).toString(16).padStart(2, "0");
                    color = alpha + color;
                } else if (opacityObjectIds.has(entity.id)) {
                    alpha = Math.round(entity.opacity * 255).toString(16).padStart(2, "0");
                    color = alpha + color;
                }

                if (!coloringMap[color]) {
                    coloringMap[color] = [];
                }

                const objectId = entity.id;
                const originalSystemId = entity.originalSystemId;
                const component = {
                    ifc_guid: originalSystemId,
                    originating_system: this.originatingSystem
                };
                if (originalSystemId !== objectId) {
                    component.authoring_tool_id = objectId;
                }

                coloringMap[color].push(component);

                return coloringMap;

            }, {});

        const coloringArray = Object.entries(coloringMap).map(([color, components]) => {
            return {color, components};
        });

        bcfViewpoint.components.coloring = coloringArray;

        const objectIds = scene.objectIds;
        const visibleObjects = scene.visibleObjects;
        const visibleObjectIds = scene.visibleObjectIds;
        const invisibleObjectIds = objectIds.filter(id => !visibleObjects[id]);
        const selectedObjectIds = scene.selectedObjectIds;

        if (options.defaultInvisible || visibleObjectIds.length < invisibleObjectIds.length) {
            bcfViewpoint.components.visibility.exceptions = this._createBCFComponents(visibleObjectIds);
            bcfViewpoint.components.visibility.default_visibility = false;
        } else {
            bcfViewpoint.components.visibility.exceptions = this._createBCFComponents(invisibleObjectIds);
            bcfViewpoint.components.visibility.default_visibility = true;
        }

        bcfViewpoint.components.selection = this._createBCFComponents(selectedObjectIds);

        bcfViewpoint.components.translucency = this._createBCFComponents(scene.xrayedObjectIds);

        if (options.snapshot !== false) {
            bcfViewpoint.snapshot = {
                snapshot_type: "png",
                snapshot_data: this.viewer.getSnapshot({format: "png"})
            };
        }

        return bcfViewpoint;
    }

    _createBCFComponents(objectIds) {
        const scene = this.viewer.scene;
        const components = [];
        for (let i = 0, len = objectIds.length; i < len; i++) {
            const objectId = objectIds[i];
            const entity = scene.objects[objectId];
            if (entity) {
                const component = {
                    ifc_guid: entity.originalSystemId,
                    originating_system: this.originatingSystem
                };
                if (entity.originalSystemId !== objectId) {
                    component.authoring_tool_id = objectId;
                }
                components.push(component);
            }
        }
        return components;
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
        const realWorldOffset = scene.realWorldOffset;
        const reverseClippingPlanes = (options.reverseClippingPlanes === true);

        scene.clearSectionPlanes();

        if (bcfViewpoint.clipping_planes && bcfViewpoint.clipping_planes.length > 0) {
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

        scene.clearLines();

        if (bcfViewpoint.lines && bcfViewpoint.lines.length > 0) {
            const positions = [];
            const indices = [];
            let i = 0;
            bcfViewpoint.lines.forEach((e) => {
                if (!e.start_point) {
                    return;
                }
                if (!e.end_point) {
                    return;
                }
                positions.push(e.start_point.x);
                positions.push(e.start_point.y);
                positions.push(e.start_point.z);
                positions.push(e.end_point.x);
                positions.push(e.end_point.y);
                positions.push(e.end_point.z);
                indices.push(i++);
                indices.push(i++);
            });
            new LineSet(scene, {
                positions,
                indices,
                clippable: false,
                collidable: true
            });
        }

        scene.clearBitmaps();

        if (bcfViewpoint.bitmaps && bcfViewpoint.bitmaps.length > 0) {
            bcfViewpoint.bitmaps.forEach(function (e) {
                const bitmap_type = e.bitmap_type || "jpg"; // "jpg" | "png"
                const bitmap_data = e.bitmap_data; // base64
                let location = xyzObjectToArray(e.location, tempVec3a);
                let normal = xyzObjectToArray(e.normal, tempVec3b);
                let up = xyzObjectToArray(e.up, tempVec3c);
                let height = e.height || 1;
                if (!bitmap_type) {
                    return;
                }
                if (!bitmap_data) {
                    return;
                }
                if (!location) {
                    return;
                }
                if (!normal) {
                    return;
                }
                if (!up) {
                    return;
                }
                if (camera.yUp) {
                    location = ZToY(location);
                    normal = ZToY(normal);
                    up = ZToY(up);
                }
                new Bitmap(scene, {
                    src: bitmap_data,
                    type: bitmap_type,
                    pos: location,
                    normal: normal,
                    up: up,
                    clippable: false,
                    collidable: true,
                    height
                });
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
                        bcfViewpoint.components.visibility.exceptions.forEach((component) => this._withBCFComponent(options, component, entity => entity.visible = true));
                    }
                } else {
                    scene.setObjectsVisible(scene.objectIds, true);
                    if (bcfViewpoint.components.visibility.exceptions) {
                        bcfViewpoint.components.visibility.exceptions.forEach((component) => this._withBCFComponent(options, component, entity => entity.visible = false));
                    }
                }

                const view_setup_hints = bcfViewpoint.components.visibility.view_setup_hints;
                if (view_setup_hints) {
                    if (view_setup_hints.spaces_visible === false) {
                        scene.setObjectsVisible(viewer.metaScene.getObjectIDsByType("IfcSpace"), false);
                    }
                    if (view_setup_hints.spaces_translucent !== undefined) {
                        scene.setObjectsXRayed(viewer.metaScene.getObjectIDsByType("IfcSpace"), true);
                    }
                    if (view_setup_hints.space_boundaries_visible !== undefined) {

                    }
                    if (view_setup_hints.openings_visible === false) {
                        scene.setObjectsVisible(viewer.metaScene.getObjectIDsByType("IfcOpening"), true);
                    }
                    if (view_setup_hints.space_boundaries_translucent !== undefined) {

                    }
                    if (view_setup_hints.openings_translucent !== undefined) {
                        scene.setObjectsXRayed(viewer.metaScene.getObjectIDsByType("IfcOpening"), true);
                    }
                }
            }

            if (bcfViewpoint.components.selection) {
                scene.setObjectsSelected(scene.selectedObjectIds, false);
                bcfViewpoint.components.selection.forEach(component => this._withBCFComponent(options, component, entity => entity.selected = true));

            }

            if (bcfViewpoint.components.translucency) {
                scene.setObjectsXRayed(scene.xrayedObjectIds, false);
                bcfViewpoint.components.translucency.forEach(component => this._withBCFComponent(options, component, entity => entity.xrayed = true));
            }

            if (bcfViewpoint.components.coloring) {
                scene.setObjectsColorized(scene.colorizedObjectIds, null);
                bcfViewpoint.components.coloring.forEach(coloring => {

                    let color = coloring.color;
                    let alpha = 0;
                    let alphaDefined = false;

                    if (color.length === 8) {
                        alpha = parseInt(color.substring(0, 2), 16) / 255;
                        if (alpha <= 1.0 && alpha >= 0.95) {
                            alpha = 1.0;
                        }
                        color = color.substring(2);
                        alphaDefined = true;
                    }

                    const colorize = [
                        parseInt(color.substring(0, 2), 16) / 255,
                        parseInt(color.substring(2, 4), 16) / 255,
                        parseInt(color.substring(4, 6), 16) / 255
                    ];

                    coloring.components.map(component =>
                        this._withBCFComponent(options, component, entity => {
                            entity.colorize = colorize;
                            if (alphaDefined) {
                                entity.opacity = alpha;
                            }
                        }));
                });
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

    _withBCFComponent(options, component, callback) {

        const viewer = this.viewer;
        const scene = viewer.scene;

        if (component.authoring_tool_id && component.originating_system === this.originatingSystem) {

            const id = component.authoring_tool_id;
            const entity = scene.objects[id];

            if (entity) {
                callback(entity);
                return
            }

            if (options.updateCompositeObjects) {
                const metaObject = viewer.metaScene.metaObjects[id];
                if (metaObject) {
                    scene.withObjects(viewer.metaScene.getObjectIDsInSubtree(id), callback);
                    return;
                }
            }
        }

        if (component.ifc_guid) {

            const originalSystemId = component.ifc_guid;
            const entity = scene.objects[originalSystemId];

            if (entity) {
                callback(entity);
                return;
            }

            if (options.updateCompositeObjects) {
                const metaObject = viewer.metaScene.metaObjects[originalSystemId];
                if (metaObject) {
                    scene.withObjects(viewer.metaScene.getObjectIDsInSubtree(originalSystemId), callback);
                    return;
                }
            }

            Object.keys(scene.models).forEach((modelId) => {

                const id = math.globalizeObjectId(modelId, originalSystemId);
                const entity = scene.objects[id];

                if (entity) {
                    callback(entity);
                    return;
                }

                if (options.updateCompositeObjects) {
                    const metaObject = viewer.metaScene.metaObjects[id];
                    if (metaObject) {
                        scene.withObjects(viewer.metaScene.getObjectIDsInSubtree(id), callback);

                    }
                }
            });
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
