import { Plugin, Viewer } from "../../viewer";

export declare type BCFViewpointsPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** Identifies the originating system for BCF records. */
  originatingSystem?: string;
  /** Identifies the authoring tool for BCF records. */
  authoringTool?: string;
};

/**
 * {@link Viewer} plugin that saves and loads BCF viewpoints as JSON objects.
 */
export declare class BCFViewpointsPlugin extends Plugin {
  /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   * @param {BCFViewpointsPluginConfiguration} cfg  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?:BCFViewpointsPluginConfiguration );

  /**
   * Identifies the originating system to include in BCF viewpoints saved by this plugin.
   * @type {string}
   */
  originatingSystem: string;

  /**
   * Identifies the authoring tool to include in BCF viewpoints saved by this plugin.
   * @type {string}
   */
  authoringTool: string;

  /**
   * Saves viewer state to a BCF viewpoint.
   *
   * Note that xeokit's {@link Camera.look} is the **point-of-interest**, whereas the BCF ````camera_direction```` is a
   * direction vector. Therefore, we save ````camera_direction```` as the vector from {@link Camera.eye} to {@link Camera.look}.
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
  getViewpoint(options?: any): any;

  /**
   * Sets viewer state to the given BCF viewpoint.
   *
   * Note that xeokit's {@link Camera.look} is the **point-of-interest**, whereas the BCF ````camera_direction```` is a
   * direction vector. Therefore, when loading a BCF viewpoint, we set {@link Camera.look} to the absolute position
   * obtained by offsetting the BCF ````camera_view_point````  along ````camera_direction````.
   *
   * When loading a viewpoint, we also have the option to find {@link Camera.look} as the closest point of intersection
   * (on the surface of any visible and pickable {@link Entity}) with a 3D ray fired from ````camera_view_point```` in
   * the direction of ````camera_direction````.
   *
   * @param {*} bcfViewpoint  BCF JSON viewpoint object,
   * shows default visible entities and restores camera to initial default position.
   * @param {*} [options] Options for setting the viewpoint.
   * @param {Boolean} [options.rayCast=true] When ````true```` (default), will attempt to set {@link Camera.look} to the closest
   * point of surface intersection with a ray fired from the BCF ````camera_view_point```` in the direction of ````camera_direction````.
   * @param {Boolean} [options.immediate=true] When ````true```` (default), immediately set camera position.
   * @param {Boolean} [options.duration] Flight duration in seconds.  Overrides {@link CameraFlightAnimation.duration}. Only applies when ````immediate```` is ````false````.
   * @param {Boolean} [options.reset=true] When ````true```` (default), set {@link Entity.xrayed} and {@link Entity.highlighted} ````false```` on all scene objects.
   * @param {Boolean} [options.reverseClippingPlanes=false] When ````true````, clipping planes are reversed (https://github.com/buildingSMART/BCF-XML/issues/193)
   * @param {Boolean} [options.updateCompositeObjects=false] When ````true````, then when visibility and selection updates refer to composite objects (eg. an IfcBuildingStorey),
   * then this method will apply the updates to objects within those composites.
   */
  setViewpoint(bcfViewpoint: any, options?: any): void;
}
