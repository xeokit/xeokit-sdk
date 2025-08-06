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
   * Available EdgeMaterial presets.
   */
  readonly presets: any;

  /**
   * Preset EdgeMaterial configuration.
   * @type {String}
   */
  preset: string;

  /**
   * RGB edge color.
   */
  edgeColor: number[];

  /**
   * Edge transparency.
   */
  edgeAlpha: number;

  /**
   * Edge width.
   */
  edgeWidth: number;

  /**
   * Whether edges are visible.
   */
  edges: boolean;
}
