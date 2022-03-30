import { Material } from "./Material";
import { Component } from "../Component";

export declare type LinesMaterialConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** Line width in pixels. */
  lineWidth?: number;
  /** Selects a preset LinesMaterial configuration - see {@link LinesMaterial.presets}. */
  preset?: string;
};

/**
 * Configures the shape of "lines" geometry primitives.
 */
export declare class LinesMaterial extends Material {
  /**
   * @constructor
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
   * @param {LinesMaterialConfiguration} [cfg] The LinesMaterial configuration
   */
  constructor(owner: Component, cfg?: LinesMaterialConfiguration);
  /**
   * Gets available LinesMaterial presets.
   *
   * @type {Object}
   */
  get presets(): any;

  /**
   * Selects a preset LinesMaterial configuration.
   *
   * Default value is ````"default"````.
   *
   * @type {String}
   */
  set preset(arg: string);

  /**
   * The current preset LinesMaterial configuration.
   *
   * Default value is ````"default"````.
   *
   * @type {String}
   */
  get preset(): string;

  /**
   * Sets line width.
   *
   * Default value is ````1```` pixels.
   *
   * @type {Number}
   */
  set lineWidth(arg: number);

  /**
   * Gets the line width.
   *
   * Default value is ````1```` pixels.
   *
   * @type {Number}
   */
  get lineWidth(): number;

  /**
   * @private
   * @return {string}
   */
  private get hash();
}
