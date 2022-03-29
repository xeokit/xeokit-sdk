/**
 * @desc A 2D plan view image of an ````IfcBuildingStorey````.
 */
export declare class StoreyMap {
  /**
   * ID of the IfcBuildingStorey.
   *
   * This matches IDs of the IfcBuildingStorey's {@link MetaObject} and {@link Entity}.
   *
   * @type {String}
   */
  storeyId: string;

  /**
   * Base64-encoded plan view image.
   *
   * @type {String}
   */
  imageData: string;

  /**
   * The image format - "png" or "jpeg".
   *
   * @type {String}
   */
  format: string;

  /**
   * Width of the image, in pixels.
   *
   * @type {Number}
   */
  width: number;

  /**
   * Height of the image, in pixels.
   *
   * @type {Number}
   */
  height: number;
}
