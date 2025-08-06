import { Component } from '../Component';
import { Light } from './Light';

export declare type DirLightConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** A unit vector indicating the direction that the light is shining,  given in either World or View space, depending on the value of the ````space```` parameter. */
  dir?: number[]
  /** The color of this DirLight. */
  color?: number[]
  /** The intensity of this AmbientLight, as a factor in range ````[0..1]````. */
  intensity?: number;
  /** The coordinate system the DirLight is defined in - ````"view"```` or ````"space"````. */
  space?: 'view' | 'space';
  /** Flag which indicates if this DirLight casts a castsShadow. */
  castsShadow?: boolean;
};

export declare class DirLight extends Light {
  /**
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this AmbientLight as well.
   * @param {DirLightConfiguration} [cfg] DirLight configuration
   */
  constructor(owner: Component, cfg: DirLightConfiguration);

  /**
   * The direction in which the DirLight is shining.
   *
   * Default value is ````[1.0, 1.0, 1.0]````.
   */
  dir: number[];

  /**
   * The RGB color of this DirLight.
   *
   * Default value is ````[0.7, 0.7, 0.8]````.
   */
  color: number[];

  /**
   * The intensity of this DirLight.
   *
   * Default value is ````1.0```` for maximum intensity.
   */
  intensity: number;

  /**
   * Whether this DirLight casts a shadow.
   *
   * Default value is ````false````.
   */
  castsShadow: boolean;
  
  /**
   * Destroys this DirLight.
   */
  destroy(): void;
}
