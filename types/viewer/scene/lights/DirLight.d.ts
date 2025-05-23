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
   * Sets the direction in which the DirLight is shining.
   *
   * Default value is ````[1.0, 1.0, 1.0]````.
   *
   * @param {Number[]} value The direction vector.
   */
  set dir(value: number);

  /**
   * Gets the direction in which the DirLight is shining.
   *
   * Default value is ````[1.0, 1.0, 1.0]````.
   *
   * @returns {Number[]} The direction vector.
   */
  get dir(): number;

  /**
   * Sets the RGB color of this DirLight.
   *
   * Default value is ````[0.7, 0.7, 0.8]````.
   *
   * @param {Number[]} color The DirLight's RGB color.
   */
  set color(color: number[]);

  /**
   * Gets the RGB color of this DirLight.
   *
   * Default value is ````[0.7, 0.7, 0.8]````.
   *
   * @returns {Number[]} The DirLight's RGB color.
   */
  get color(): number[];

  /**
   * Sets the intensity of this DirLight.
   *
   * Default intensity is ````1.0```` for maximum intensity.
   *
   * @param {Number} intensity The DirLight's intensity
   */
  set intensity(intensity: number);

  /**
   * Gets the intensity of this DirLight.
   *
   * Default value is ````1.0```` for maximum intensity.
   *
   * @returns {Number} The DirLight's intensity.
   */
  get intensity(): number;

  /**
   * Sets if this DirLight casts a shadow.
   *
   * Default value is ````false````.
   *
   * @param {Boolean} castsShadow Set ````true```` to cast shadows.
   */
  set castsShadow(castsShadow: boolean);

  /**
   * Gets if this DirLight casts a shadow.
   *
   * Default value is ````false````.
   *
   * @returns {Boolean} ````true```` if this DirLight casts shadows.
   */
  get castsShadow(): boolean;
  
  /**
   * Destroys this DirLight.
   */
  destroy(): void;
}
