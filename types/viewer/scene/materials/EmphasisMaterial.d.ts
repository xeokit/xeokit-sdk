import { Material } from "./Material";
import { Component } from "../Component";

export declare type EmphasisMaterialConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** Indicates if xray surfaces are filled with color. */
  fill?: boolean;
  /** EmphasisMaterial fill color. */
  fillColor?: number[];
  /** Transparency of filled xray faces. A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque.*/
  fillAlpha?: number;
  /** Indicates if xray edges are visible. */
  edges?: boolean;
  /** RGB color of xray edges. */
  edgeColor?: number[];
  /** Transparency of xray edges. A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque. */
  edgeAlpha?: number;
  /** Width of xray edges, in pixels. */
  edgeWidth?: number;
  /** Selects a preset EmphasisMaterial configuration - see {@link EmphasisMaterial.presets}. */
  preset?: string;
  /** Whether to render geometry backfaces when emphasising. */
  backfaces?: boolean;
  /** Whether to make the emphasized object appear to float on top of other objects, as if it were "glowing through" them. */
  glowThrough?: boolean;
};

/**
 * Configures the appearance of {@link Entity}s when they are xrayed, highlighted or selected.
 */
export declare class EmphasisMaterial extends Material {
  /**
   * @constructor
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
   * @param {EmphasisMaterialConfiguration} [cfg] The EmphasisMaterial configuration
   */
  constructor(owner: Component, cfg?: EmphasisMaterialConfiguration);

  /**
   * Available EmphasisMaterial presets.
   *
   * @type {Object}
   */
  readonly presets: any;

  /**
   * Preset EmphasisMaterial configuration.
   *
   * Default value is "default".
   *
   * @type {String}
   */
  preset: string;

  /**
   * Whether surfaces are filled with color.
   *
   * Default is ````true````.
   *
   * @type {Boolean}
   */
  fill: boolean;

  /**
   * RGB color of filled faces.
   *
   * Default is ````[0.4, 0.4, 0.4]````.
   *
   * @type {Number[]}
   */
  fillColor: number[];

  /**
   * Transparency of filled faces.
   *
   * A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque.
   *
   * Default is ````0.2````.
   *
   * @type {Number}
   */
  fillAlpha: number;

  /**
   * Whether edges are visible.
   *
   * Default is ````true````.
   *
   * @type {Boolean}
   */
  edges: boolean;

  /**
   * RGB color of edges.
   *
   * Default is ```` [0.2, 0.2, 0.2]````.
   *
   * @type {Number[]}
   */
  edgeColor: number[];

  /**
   * Transparency of edges.
   *
   * A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque.
   *
   * Default is ````0.2````.
   *
   * @type {Number}
   */
  edgeAlpha: number;

  /**
   * Edge width.
   *
   * This is not supported by WebGL implementations based on DirectX [2019].
   *
   * Default value is ````1.0```` pixels.
   *
   * @type {Number}
   */
  edgeWidth: number;

  /**
   * Whether to render backfaces when {@link EmphasisMaterial.fill} is ````true````.
   *
   * Default is ````false````.
   *
   * @type {Boolean}
   */
  backfaces: boolean;

  /**
   * Whether to render emphasized objects over the top of other objects, as if they were "glowing through".
   *
   * Default is ````true````.
   *
   * Note: updating this property will not affect the appearance of objects that are already emphasized.
   *
   * @type {Boolean}
   */
  glowThrough: boolean;

  /**
   * Destroys this EmphasisMaterial.
   */
  destroy(): void;
}
