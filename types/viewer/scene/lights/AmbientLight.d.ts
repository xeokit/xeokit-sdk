import { Component } from '../Component';
import { Light } from './Light';

export declare type AmbientLightConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** The color of this AmbientLight. */
  color?: number[]
  /** The intensity of this AmbientLight, as a factor in range ````[0..1]````. */
  intensity?: number;
};

export declare class AmbientLight extends Light {
  /**
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this AmbientLight as well.
   * @param {AmbientLightConfiguration} [cfg] AmbientLight configuration
   */
  constructor(owner: Component, cfg: AmbientLightConfiguration);

  /**
   * The RGB color of this AmbientLight.
   *
   * Default value is ````[0.7, 0.7, 0.8]````.
   */
  color: number[];

  /**
   * The intensity of this AmbientLight.
   *
   * Default value is ````1.0```` for maximum intensity.
   */
  intensity: number;

  /**
   * Destroys this AmbientLight.
   */
  destroy(): void;
}
