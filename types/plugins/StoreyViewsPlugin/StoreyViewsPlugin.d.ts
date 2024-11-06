import { PickResult } from "../../viewer/scene/webgl/PickResult";
import { Plugin, Viewer } from "../../viewer";
import { Storey } from "./Storey";
import { StoreyMap } from "./StoreyMap";

export declare type StoreyViewsPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** Optional configuration, if enabled, the elements of each floor map image will be proportionally resized to encompass the entire image. This leads to varying scales among different floor map images. If disabled, each floor map image will display the model's extents, ensuring a consistent scale across all images */
  fitStoreyMaps? : Boolean;
};

/**
 * A {@link Viewer} plugin that provides methods for visualizing IfcBuildingStoreys.
 */
export declare class StoreyViewsPlugin extends Plugin {
  /**
   * @constructor
   *
   * @param {Viewer} viewer The Viewer.
   * @param {StoreyViewsPluginConfiguration} cfg  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?: StoreyViewsPluginConfiguration);

  /**
   * A {@link Storey} for each ````IfcBuildingStorey```.
   *
   * There will be a {@link Storey} for every existing {@link MetaObject} whose {@link MetaObject.type} equals "IfcBuildingStorey".
   *
   * These are created and destroyed automatically as models are loaded and destroyed.
   *
   * @type {{String:Storey}}
   */
  storeys: {[key: string]: Storey };

  /**
   * A set of {@link Storey}s for each {@link MetaModel}.
   *
   * These are created and destroyed automatically as models are loaded and destroyed.
   *
   * @type {{String: {String:Storey}}}
   */
  modelStoreys: {[key: string]: { [key: string]: Storey} };

  /**
   * Arranges the {@link Camera} for a 3D orthographic view of the {@link Entity}s within the given storey.
   *
   * See also: {@link CameraMemento}, which saves and restores the state of the {@link Scene}'s {@link Camera}
   *
   * @param {String} storeyId ID of the ````IfcBuildingStorey```` object.
   * @param {*} [options] Options for arranging the Camera.
   * @param {String} [options.projection] Projection type to transition the Camera to. Accepted values are "perspective" and "ortho".
   * @param {Function} [options.done] Callback to fire when the Camera has arrived. When provided, causes an animated flight to the saved state. Otherwise jumps to the saved state.
   */
  gotoStoreyCamera(storeyId: string, options?: {
    projection?: string;
    done?: Function
  }): void;

  /**
   * Shows the {@link Entity}s within the given storey.
   *
   * Optionally hides all other Entitys.
   *
   * See also: {@link ObjectsMemento}, which saves and restores a memento of the visual state
   * of the {@link Entity}'s that represent objects within a {@link Scene}.
   *
   * @param {String} storeyId ID of the ````IfcBuildingStorey```` object.
   * @param {*} [options] Options for showing the Entitys within the storey.
   */
  showStoreyObjects(storeyId: string, options?: {
    hideOthers?: boolean;
  }): void;

  /**
   * Executes a callback on each of the objects within the given storey.
   *
   *
   * @param {String} storeyId ID of the ````IfcBuildingStorey```` object.
   * @param {Function} callback The callback.
   */
  withStoreyObjects(storeyId: string, callback: Function): void;

  /**
   * Creates a 2D map of the given storey.
   *
   * @param {String} storeyId ID of the ````IfcBuildingStorey```` object.
   * @param {*} [options] Options for creating the image.
   * @param {Number} [options.width=300] Image width in pixels. Height will be automatically determined from this, if not given.
   * @param {Number} [options.height=300] Image height in pixels, as an alternative to width. Width will be automatically determined from this, if not given.
   * @param {String} [options.format="png"] Image format. Accepted values are "png" and "jpeg".
   * @returns {StoreyMap} The StoreyMap.
   */
  createStoreyMap(storeyId: string, options?: {
    width?: number;
    height?: number;
    format?: "png" | "jpeg";
  }): StoreyMap;

  /**
   * Attempts to pick an {@link Entity} at the given pixel coordinates within a StoreyMap image.
   *
   * @param {StoreyMap} storeyMap The StoreyMap.
   * @param {Number[]} imagePos 2D pixel coordinates within the bounds of {@link StoreyMap.imageData}.
   * @param {*} [options] Picking options.
   * @param {Boolean} [options.pickSurface=false] Whether to return the picked position on the surface of the Entity.
   * @returns {PickResult} The pick result, if an Entity was successfully picked, else null.
   */
  pickStoreyMap(storeyMap: StoreyMap, imagePos: number[], options?: {
    pickSurface?: boolean;
  }): PickResult;

  /**
   * Gets the ID of the storey that contains the given 3D World-space position.
   *.
    * @param {Number[]} worldPos 3D World-space position.
    * @returns {String} ID of the storey containing the position, or null if the position falls outside all the storeys.
    */
  getStoreyContainingWorldPos(worldPos: number[], modelId: null | string): string;

  /**
   * Gets the ID of the storey which's bounding box contains the y point of the world position
   * 
   * @param {Number[]} worldPos 3D World-space position.
   * @returns {String} ID of the storey containing the position, or null if the position falls outside all the storeys.
   */
  getStoreyInVerticalRange(worldPos: number[], modelId: null | string): string;


  /**
   * Returns whether a position is above or below a building
   * 
   * @param {Number[]} worldPos 3D World-space position.
   * @returns {String} ID of the lowest/highest story or null.
   */
  isPositionAboveOrBelowBuilding(worldPos: number[], modelId: null | string): string;

  /**
   * Converts a 3D World-space position to a 2D position within a StoreyMap image.
   *
   * Use {@link StoreyViewsPlugin.pickStoreyMap} to convert 2D image positions to 3D world-space.
   *
   * @param {StoreyMap} storeyMap The StoreyMap.
   * @param {Number[]} worldPos 3D World-space position within the storey.
   * @param {Number[]} imagePos 2D pixel position within the {@link StoreyMap.imageData}.
   * @returns {Boolean} True if ````imagePos```` is within the bounds of the {@link StoreyMap.imageData}, else ````false```` if it falls outside.
   */
  worldPosToStoreyMap(storeyMap: StoreyMap, worldPos: number[], imagePos: number[]): boolean;

  /**
   * Converts a 3D World-space direction vector to a 2D vector within a StoreyMap image.
   *
   * @param {StoreyMap} storeyMap The StoreyMap.
   * @param {Number[]} worldDir 3D World-space direction vector.
   * @param {Number[]} imageDir Normalized 2D direction vector.
   */
  worldDirToStoreyMap(storeyMap: StoreyMap, worldDir: number[], imageDir: number[]): void;

  /**
   * Fires when the storeys are updated (after a model is added or removed).
   * @param {String} event The storeys event
   * @param {Function} callback Callback fired on the event
  */
  on(event: "storeys", callback: (storyes: {[key: string]: Storey })=> void): void;
}
