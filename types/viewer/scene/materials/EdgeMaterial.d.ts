import { Material } from "./Material";
import { Component } from "../Component";

export declare type EdgeMaterialConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** RGB edge color. */
  edgeColor?: number[];
  /** Edge transparency. */
  edgeAlpha?: number;
  /** Edge width in pixels. */
  edgeWidth?: number;
  /** Selects a preset EdgeMaterial configuration */
  preset?:  string;
};

/**
 * Configures the appearance of {@link Entity}s when their edges are emphasised.
 */
export declare class EdgeMaterial extends Material {
  /**
   * @constructor
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
   * @param {EdgeMaterialConfiguration} [cfg] The EdgeMaterial configuration
   */
  constructor(owner: Component, cfg?: EdgeMaterialConfiguration);

  /**
   * Gets available EdgeMaterial presets.
   */
  get presets(): any;

  /**
   * Selects a preset EdgeMaterial configuration.
   * @type {String}
   */
  set preset(arg: string);

  /**
   * The current preset EdgeMaterial configuration.
   */
  get preset(): string;

  /**
   * Sets RGB edge color.
   */
  set edgeColor(arg: number[]);

  /**
   * Gets RGB edge color.
   */
  get edgeColor(): number[];

  /**
   * Sets edge transparency.
   */
  set edgeAlpha(arg: number);

  /**
   * Gets edge transparency.
   */
  get edgeAlpha(): number;

  /**
   * Sets edge width.
   */
  set edgeWidth(arg: number);

  /**
   * Gets edge width.
   */
  get edgeWidth(): number;

  /**
   * Sets if edges are visible.
   */
  set edges(arg: boolean);

  /**
   * Gets if edges are visible.
   */
  get edges(): boolean;
}
