import { Component } from "../Component";

/**
 * Configures Scalable Ambient Obscurance (SAO) for a {@link Scene}.
 */
export declare class SAO extends Component {
  /**
   * Sets whether SAO is enabled for the {@link Scene}.
   *
   * Even when enabled, SAO will only work if supported.
   *
   * Default value is ````false````.
   *
   * @type {Boolean}
   */
  set enabled(arg: boolean);

  /**
   * Gets whether SAO is enabled for the {@link Scene}.
   *
   * Even when enabled, SAO will only apply if supported.
   *
   * Default value is ````false````.
   *
   * @type {Boolean}
   */
  get enabled(): boolean;

  /**
   * Sets the maximum area that SAO takes into account when checking for possible occlusion for each fragment.
   *
   * Default value is ````100.0````.
   *
   * @type {Number}
   */
  set kernelRadius(arg: number);

  /**
   * Gets the maximum area that SAO takes into account when checking for possible occlusion for each fragment.
   *
   * Default value is ````100.0````.
   *
   * @type {Number}
   */
  get kernelRadius(): number;

  /**
   * Sets the degree of darkening (ambient obscurance) produced by the SAO effect.
   *
   * Default value is ````0.15````.
   *
   * @type {Number}
   */
  set intensity(arg: number);

  /**
   * Gets the degree of darkening (ambient obscurance) produced by the SAO effect.
   *
   * Default value is ````0.15````.
   *
   * @type {Number}
   */
  get intensity(): number;

  /**
   * Sets the SAO bias.
   *
   * Default value is ````0.5````.
   *
   * @type {Number}
   */
  set bias(arg: number);

  /**
   * Gets the SAO bias.
   *
   * Default value is ````0.5````.
   *
   * @type {Number}
   */
  get bias(): number;

  /**
   * Sets the SAO occlusion scale.
   *
   * Default value is ````1.0````.
   *
   * @type {Number}
   */
  set scale(arg: number);

  /**
   * Gets the SAO occlusion scale.
   *
   * Default value is ````1.0````.
   *
   * @type {Number}
   */
  get scale(): number;

  /**
   * Sets the SAO minimum resolution.
   *
   * Default value is ````0.0````.
   *
   * @type {Number}
   */
  set minResolution(arg: number);

  /**
   * Gets the SAO minimum resolution.
   *
   * Default value is ````0.0````.
   *
   * @type {Number}
   */
  get minResolution(): number;

  /**
   * Sets the number of SAO samples.
   *
   * Default value is ````10````.
   *
   * Update this sparingly, since it causes a shader recompile.
   *
   * @type {Number}
   */
  set numSamples(arg: number);

  /**
   * Gets the number of SAO samples.
   *
   * Default value is ````10````.
   *
   * @type {Number}
   */
  get numSamples(): number;

  /**
   * Sets whether Guassian blur is enabled.
   *
   * Default value is ````true````.
   *
   * @type {Boolean}
   */
  set blur(arg: boolean);

  /**
   * Gets whether Guassian blur is enabled.
   *
   * Default value is ````true````.
   *
   * @type {Boolean}
   */
  get blur(): boolean;

  /**
   * Sets the SAO blend cutoff.
   *
   * Default value is ````0.3````.
   *
   * Normally you don't need to alter this.
   *
   * @type {Number}
   */
  set blendCutoff(arg: number);

  /**
   * Gets the SAO blend cutoff.
   *
   * Default value is ````0.3````.
   *
   * Normally you don't need to alter this.
   *
   * @type {Number}
   */
  get blendCutoff(): number;

  /**
   * Sets the SAO blend factor.
   *
   * Default value is ````1.0````.
   *
   * Normally you don't need to alter this.
   *
   * @type {Number}
   */
  set blendFactor(arg: number);

  /**
   * Gets the SAO blend scale.
   *
   * Default value is ````1.0````.
   *
   * Normally you don't need to alter this.
   *
   * @type {Number}
   */
  get blendFactor(): number;

  /**
   * Gets whether or not SAO is supported by this browser and GPU.
   *
   * Even when enabled, SAO will only work if supported.
   *
   * @type {Boolean}
   */
  get supported(): boolean;
}
