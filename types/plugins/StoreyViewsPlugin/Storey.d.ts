import { StoreyViewsPlugin } from "./StoreyViewsPlugin";

/**
 * Information about an ````IfcBuildingStorey````.
 */
export declare class Storey {
  /**
   * The {@link StoreyViewsPlugin} this Storey belongs to.
   *
   * @type {StoreyViewsPlugin}
   */
  plugin: StoreyViewsPlugin;

  /**
   * ID of the IfcBuildingStorey.
   *
   * This matches IDs of the IfcBuildingStorey's {@link MetaObject} and {@link Entity}.
   *
   * @type {String}
   */
  storeyId: string;

  /**
   * ID of the model.
   *
   * This matches the ID of the {@link MetaModel} that contains the IfcBuildingStorey's {@link MetaObject}.
   *
   * @type {String|Number}
   */
  modelId: string | number;

  /**
   * Axis-aligned World-space boundary of the {@link Entity}s that represent the IfcBuildingStorey.
   *
   * The boundary is a six-element Float32Array containing the min/max extents of the
   * axis-aligned boundary, ie. ````[xmin, ymin, zmin, xmax, ymax, zmax]````
   *
   * @type {Number[]}
   */
  aabb: number[];

  /**
   * Axis-aligned World-space boundary of the {@link Entity}s that represent the IfcBuildingStorey.
   *
   * The boundary is a six-element Float32Array containing the min/max extents of the
   * axis-aligned boundary, ie. ````[xmin, ymin, zmin, xmax, ymax, zmax]````
   *
   * @property storeyAABB
   * @type {Number[]}
   */
  storeyAABB :number[];

  /**
   * Axis-aligned World-space boundary of the {@link Entity}s that represent the model.
   *
   * The boundary is a six-element Float32Array containing the min/max extents of the
   * axis-aligned boundary, ie. ````[xmin, ymin, zmin, xmax, ymax, zmax]````
   *
   * @property modelAABB
   * @type {Number[]}
   */
  modelAABB : number[];

  /** Number of {@link Entity}s within the IfcBuildingStorey.
   *
   * @type {Number}
   */
  numObjects: number;
}
