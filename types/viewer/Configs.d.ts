/**
 * Manages global configurations for all {@link Viewer}s.
 */
export declare abstract class Configs {
  /**
   * Whether double precision mode is enabled for Viewers.
   *
   * When double precision mode is enabled (default), Viewers will accurately render models that contain
   * double-precision coordinates, without jittering.
   */
  static doublePrecisionEnabled: boolean;

  /**
   * The maximum data texture height.
   *
   * Should be a multiple of 1024. Default is 4096, which is the maximum allowed value.
   */
  static maxDataTextureHeight: number;

  /**
   * The maximum batched geometry VBO size.
   *
   * Default value is 5000000, which is the maximum size.
   *
   * Minimum size is 100000.
   */
  static maxGeometryBatchSize: number;
}
