import { Entity, Plugin, Viewer } from "../../viewer";
import { ModelStats } from "../index";

export declare interface ILASDefaultDataSource {
  /**
   * Gets the contents of the given LAS file in an arraybuffer.
   *
   * @param {String|Number} src Path or ID of an LAS file.
   * @param {Function} ok Callback fired on success, argument is the LAS file in an arraybuffer.
   * @param {Function} error Callback fired on error.
   */
  getLAS(src: string | number, ok: (LAS: ArrayBuffer) => void, error: (e: Error) => void): void;
}

export declare type LASLoaderPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** A custom data source through which the LASLoaderPlugin can load model and metadata files. Defaults to an instance of {@link LASDefaultDataSource}, which loads over HTTP. */
  dataSource?: ILASDefaultDataSource;
  /** Configures LASLoaderPlugin to load every **n** points.*/
  skip?: number;
  /** Configures if LASLoaderPlugin assumes that LAS positions are stored in 64-bit floats instead of 32-bit. */
  fp64?: number;
  /** Configures whether LASLoaderPlugin assumes that LAS colors are encoded using 8 or 16 bits. Accepted values are 8, 16 an "auto". */
  colorDepth?: 8 | 16 | "auto";
};

export declare type LoadLASModel = {
  /** ID to assign to the root {@link Entity.id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default. */
  id?: string;
  /** Path to a LAS file, as an alternative to the ````las```` parameter. */
  src?: string;
  /** The LAS file data, as an alternative to the ````src```` parameter. */
  las?: ArrayBuffer;
  /** Whether to load metadata for the LAS model. */
  loadMetadata?: boolean;
  /** The model's World-space double-precision 3D origin. Use this to position the model within xeokit's World coordinate system, using double-precision coordinates. */
  origin?: number[]
  /** The model single-precision 3D position, relative to the ````origin```` parameter. */
  position?: number[]
  /** The model's scale. */
  scale?: number[]
  /** The model's orientation, given as Euler angles in degrees, for each of the X, Y and Z axis. */
  rotation?: number[]
  /** The model's world transform matrix. Overrides the position, scale and rotation parameters. Relative to ````origin````. */
  matrix?: number[]
  /** Collects model statistics. */
  stats?: ModelStats
};

/**
 * {@link Viewer} plugin that loads lidar point cloud geometry from LAS files.
 */
export declare class LASLoaderPlugin extends Plugin {
  /**
   * @constructor
   *
   * @param {Viewer} viewer The Viewer.
   * @param {LASLoaderPluginConfiguration} cfg  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?: LASLoaderPluginConfiguration);

  /**
   * Sets a custom data source through which the LASLoaderPlugin can load LAS files.
   *
   * Default value is {@link LASDefaultDataSource}, which loads via HTTP.
   *
   * @type {ILASDefaultDataSource}
   */
  set dataSource(arg: ILASDefaultDataSource);

  /**
   * Gets the custom data source through which the LASLoaderPlugin can load LAS files.
   *
   * Default value is {@link LASDefaultDataSource}, which loads via HTTP.
   *
   * @type {ILASDefaultDataSource}
   */
  get dataSource(): ILASDefaultDataSource;

  /**
   * Configures LASLoaderPlugin to load every **n** points.
   *
   * Default value is ````1````.
   *
   * @param {Number} value The **n**th point that LASLoaderPlugin will read.
   */
  set skip(arg: number);

  /**
   * When LASLoaderPlugin is configured to load every **n** points, returns the value of **n**.
   *
   * Default value is ````1````.
   *
   * @returns {Number} The **n**th point that LASLoaderPlugin will read.
   */
  get skip(): number;

  /**
   * Configures if LASLoaderPlugin assumes that LAS positions are stored in 64-bit floats instead of 32-bit.
   *
   * Default value is ````false````.
   *
   * @param {Boolean} value True if LASLoaderPlugin assumes that positions are stored in 64-bit floats instead of 32-bit.
   */
  set fp64(arg: boolean);

  /**
   * Gets if LASLoaderPlugin assumes that LAS positions are stored in 64-bit floats instead of 32-bit.
   *
   * Default value is ````false````.
   *
   * @returns {Boolean} True if LASLoaderPlugin assumes that positions are stored in 64-bit floats instead of 32-bit.
   */
  get fp64(): boolean;

  /**
   * Configures whether LASLoaderPlugin assumes that LAS colors are encoded using 8 or 16 bits.
   *
   * Default value is ````8````.
   *
   * Note: LAS specification recommends 16 bits.
   *
   * @param {Number|String} value Valid values are 8, 16 and "auto".
   */
  set colorDepth(arg: 8 | 16 | "auto");
  
  /**
   * Gets whether LASLoaderPlugin assumes that LAS colors are encoded using 8 or 16 bits.
   *
   * Default value is ````8````.
   *
   * Note: LAS specification recommends 16 bits.
   *
   * @returns {Number|String} Possible returned values are 8, 16 and "auto".
   */
  get colorDepth(): 8 | 16 | "auto";
  
  /**
   * Loads an ````LAS```` model into this LASLoaderPlugin's {@link Viewer}.
   *
   * @param {LoadLASModel} params Loading parameters.
   * @returns {SceneModel} SceneModel representing the model, which will have {@link Entity.isModel} set ````true```` and will be registered by {@link Entity.id} in {@link Scene.models}.
   */
  load(params?: LoadLASModel): Entity;
}
