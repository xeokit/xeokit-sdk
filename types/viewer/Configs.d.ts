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
}
