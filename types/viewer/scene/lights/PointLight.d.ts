import { Component } from '../Component';
import {Light} from './Light';

export declare type PointLightConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** Position, in either World or View space, depending on the value of the **space** parameter. */
  pos?: number[]
  /** The color of this DirLight. */
  color?: number[]
  /** The intensity of this AmbientLight, as a factor in range ````[0..1]````. */
  intensity?: number;
  /** Constant attenuation factor. */
  constantAttenuation?: number;
  /** Linear attenuation factor. */
  linearAttenuation?: number;
  /** Quadratic attenuation factor. */
  quadraticAttenuation?: number;
  /** The coordinate system the PointLight is defined in - ````"view"```` or ````"space"````. */
  space?: 'view' | 'space';
  /** Flag which indicates if this PointLight casts a castsShadow. */
  castsShadow?: boolean;
};

export declare class PointLight extends Light {
  /**
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this AmbientLight as well.
   * @param {PointLightConfiguration} [cfg] PointLight configuration
   */
   constructor(owner: Component, cfg: PointLightConfiguration);

  /**
   * Sets the position of this PointLight.
   *
   * This will be either World- or View-space, depending on the value of {@link PointLight#space}.
   *
   * Default value is ````[1.0, 1.0, 1.0]````.
   *
   * @param {Number[]} pos The position.
   */
  set pos(pos: number[]);

  /**
   * Gets the position of this PointLight.
   *
   * This will be either World- or View-space, depending on the value of {@link PointLight#space}.
   *
   * Default value is ````[1.0, 1.0, 1.0]````.
   *
   * @returns {Number[]} The position.
   */
  get pos(): number[];

  /**
   * Sets the RGB color of this PointLight.
   *
   * Default value is ````[0.7, 0.7, 0.8]````.
   *
   * @param {Number[]} color The PointLight's RGB color.
   */
  set color(color: number[]);

  /**
   * Gets the RGB color of this PointLight.
   *
   * Default value is ````[0.7, 0.7, 0.8]````.
   *
   * @returns {Number[]} The PointLight's RGB color.
   */
  get color(): number[];

  /**
   * Sets the intensity of this PointLight.
   *
   * Default intensity is ````1.0```` for maximum intensity.
   *
   * @param {Number} intensity The PointLight's intensity
   */
  set intensity(intensity: number);

  /**
   * Gets the intensity of this PointLight.
   *
   * Default value is ````1.0```` for maximum intensity.
   *
   * @returns {Number} The PointLight's intensity.
   */
  get intensity(): number;

  /**
   * Sets the constant attenuation factor for this PointLight.
   *
   * Default value is ````0````.
   *
   * @param {Number} value The constant attenuation factor.
   */
  set constantAttenuation(value: number);

  /**
   * Gets the constant attenuation factor for this PointLight.
   *
   * Default value is ````0````.
   *
   * @returns {Number} The constant attenuation factor.
   */
  get constantAttenuation(): number;

  /**
   * Sets the linear attenuation factor for this PointLight.
   *
   * Default value is ````0````.
   *
   * @param {Number} value The linear attenuation factor.
   */
  set linearAttenuation(value: number);

  /**
   * Gets the linear attenuation factor for this PointLight.
   *
   * Default value is ````0````.
   *
   * @returns {Number} The linear attenuation factor.
   */
  get linearAttenuation(): number;

  /**
   * Sets the quadratic attenuation factor for this PointLight.
   *
   * Default value is ````0````.
   *
   * @param {Number} value The quadratic attenuation factor.
   */
  set quadraticAttenuation(value: number);

  /**
   * Gets the quadratic attenuation factor for this PointLight.
   *
   * Default value is ````0````.
   *
   * @returns {Number} The quadratic attenuation factor.
   */
  get quadraticAttenuation(): number;

  /**
   * Sets if this PointLight casts a shadow.
   *
   * Default value is ````false````.
   *
   * @param {Boolean} castsShadow Set ````true```` to cast shadows.
   */
  set castsShadow(castsShadow: boolean);

  /**
   * Gets if this PointLight casts a shadow.
   *
   * Default value is ````false````.
   *
   * @returns {Boolean} ````true```` if this PointLight casts shadows.
   */
  get castsShadow(): boolean;

  /**
   * Destroys this PointLight.
   */
  destroy(): void;
}