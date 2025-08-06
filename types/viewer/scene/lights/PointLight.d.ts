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
   * The position of this PointLight.
   *
   * This will be either World- or View-space, depending on the value of {@link PointLight#space}.
   *
   * Default value is ````[1.0, 1.0, 1.0]````.
   */
  pos: number[];

  /**
   * The RGB color of this PointLight.
   *
   * Default value is ````[0.7, 0.7, 0.8]````.
   */
  color: number[];

  /**
   * The intensity of this PointLight.
   *
   * Default value is ````1.0```` for maximum intensity.
   */
  intensity: number;

  /**
   * The constant attenuation factor for this PointLight.
   *
   * Default value is ````0````.
   */
  constantAttenuation: number;

  /**
   * The linear attenuation factor for this PointLight.
   *
   * Default value is ````0````.
   */
  linearAttenuation: number;

  /**
   * The quadratic attenuation factor for this PointLight.
   *
   * Default value is ````0````.
   */
  quadraticAttenuation: number;

  /**
   * Whether this PointLight casts a shadow.
   *
   * Default value is ````false````.
   */
  castsShadow: boolean;

  /**
   * Destroys this PointLight.
   */
  destroy(): void;
}