/**
 * Manages global configurations for all {@link Viewer}s.
 */
export declare abstract class Configs {
  /**
   * Sets whether double precision mode is enabled for Viewers.
   *
   * When double precision mode is enabled (default), Viewers will accurately render models that contain
   * double-precision coordinates, without jittering.
   *
   */
  set doublePrecisionEnabled(doublePrecision: boolean);

  /**
   * Gets whether double precision mode is enabled for all Viewers.
   *
   * @returns {Boolean}
   */
  get doublePrecisionEnabled(): boolean;

  /**
   * Sets the maximum data texture height.
   *
   * Should be a multiple of 1024. Default is 4096, which is the maximum allowed value.
   */
  set maxDataTextureHeight(value: number);

  /**
   * Gets maximum data texture height.
   */
  get maxDataTextureHeight(): number;

  /**
   * Sets the maximum batched geometry VBO size.
   *
   * Default value is 5000000, which is the maximum size.
   *
   * Minimum size is 100000.
   */
  set maxGeometryBatchSize(value: number);

  /**
   * Gets the maximum batched geometry VBO size.
   */
  get maxGeometryBatchSize(): number;
}
