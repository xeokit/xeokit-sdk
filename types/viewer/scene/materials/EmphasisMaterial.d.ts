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
   * Gets available EmphasisMaterial presets.
   *
   * @type {Object}
   */
  get presets(): any;

  /**
   * Selects a preset EmphasisMaterial configuration.
   *
   * Default value is "default".
   *
   * @type {String}
   */
  set preset(arg: string);

  /**
   * Gets the current preset EmphasisMaterial configuration.
   *
   * Default value is "default".
   *
   * @type {String}
   */
  get preset(): string;

  /**
   * Sets if surfaces are filled with color.
   *
   * Default is ````true````.
   *
   * @type {Boolean}
   */
  set fill(arg: boolean);

  /**
   * Gets if surfaces are filled with color.
   *
   * Default is ````true````.
   *
   * @type {Boolean}
   */
  get fill(): boolean;

  /**
   * Sets the RGB color of filled faces.
   *
   * Default is ````[0.4, 0.4, 0.4]````.
   *
   * @type {Number[]}
   */
  set fillColor(arg: number[]);

  /**
   * Gets the RGB color of filled faces.
   *
   * Default is ````[0.4, 0.4, 0.4]````.
   *
   * @type {Number[]}
   */
  get fillColor(): number[];

  /**
   * Sets the transparency of filled faces.
   *
   * A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque.
   *
   * Default is ````0.2````.
   *
   * @type {Number}
   */
  set fillAlpha(arg: number);

  /**
   * Gets the transparency of filled faces.
   *
   * A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque.
   *
   * Default is ````0.2````.
   *
   * @type {Number}
   */

  get fillAlpha(): number;

  /**
   * Sets if edges are visible.
   *
   * Default is ````true````.
   *
   * @type {Boolean}
   */
  set edges(arg: boolean);

  /**
   * Gets if edges are visible.
   *
   * Default is ````true````.
   *
   * @type {Boolean}
   */
  get edges(): boolean;

  /**
   * Sets the RGB color of edges.
   *
   * Default is ```` [0.2, 0.2, 0.2]````.
   *
   * @type {Number[]}
   */
  set edgeColor(arg: number[]);

  /**
   * Gets the RGB color of edges.
   *
   * Default is ```` [0.2, 0.2, 0.2]````.
   *
   * @type {Number[]}
   */
  get edgeColor(): number[];

  /**
   * Sets the transparency of edges.
   *
   * A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque.
   *
   * Default is ````0.2````.
   *
   * @type {Number}
   */
  set edgeAlpha(arg: number);

  /**
   * Gets the transparency of edges.
   *
   * A value of ````0.0```` indicates fully transparent, ````1.0```` is fully opaque.
   *
   * Default is ````0.2````.
   *
   * @type {Number}
   */
  get edgeAlpha(): number;

  /**
   * Sets edge width.
   *
   * This is not supported by WebGL implementations based on DirectX [2019].
   *
   * Default value is ````1.0```` pixels.
   *
   * @type {Number}
   */
  set edgeWidth(arg: number);

  /**
   * Gets edge width.
   *
   * This is not supported by WebGL implementations based on DirectX [2019].
   *
   * Default value is ````1.0```` pixels.
   *
   * @type {Number}
   */
  get edgeWidth(): number;

  /**
   * Sets whether to render backfaces when {@link EmphasisMaterial.fill} is ````true````.
   *
   * Default is ````false````.
   *
   * @type {Boolean}
   */
  set backfaces(arg: boolean);

  /**
   * Gets whether to render backfaces when {@link EmphasisMaterial.fill} is ````true````.
   *
   * Default is ````true````.
   *
   * @type {Boolean}
   */
  get backfaces(): boolean;

  /**
   * Sets whether to render emphasized objects over the top of other objects, as if they were "glowing through".
   *
   * Default is ````true````.
   *
   * Note: updating this property will not affect the appearance of objects that are already emphasized.
   *
   * @type {Boolean}
   */
  set glowThrough(arg: boolean);

  /**
   * Sets whether to render emphasized objects over the top of other objects, as if they were "glowing through".
   *
   * Default is ````true````.
   *
   * @type {Boolean}
   */
  get glowThrough(): boolean;

  /**
   * Destroys this EmphasisMaterial.
   */
  destroy(): void;
}
