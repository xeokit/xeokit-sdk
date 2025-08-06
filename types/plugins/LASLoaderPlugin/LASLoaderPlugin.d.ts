import { Entity, Plugin, SceneModel, Viewer } from "../../viewer";
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

  cacheBuster: boolean;
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
    /** Whether to center the LAS points. Applied before "rotateX", "rotate" and "transform".  */
    center?: boolean;
    /** Whether to rotate the LAS point positions 90 degrees. Applied after "center". */
    rotateX?: boolean;
    /** Rotations to apply to the LAS points, given as Euler angles in degrees, for each of the X, Y and Z axis. Rotation is applied after "center" and "rotateX".*/
    rotate?: number[];
    /** 4x4 transform matrix to immediately apply to the LAS points. This is applied after "center", "rotateX" and "rotate". Typically used instead of "rotateX" and "rotate". */
    transform?: number[];
};

export declare type LoadLASModel = {
  /** ID to assign to the root {@link Entity.id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default. */
  id?: string;
  /** Path to a LAS file, as an alternative to the ````las```` parameter. */
  src?: string;
  /** The LAS file data, as an alternative to the ````src```` parameter. */
  las?: ArrayBuffer;
  /** Create entity with this id */
  entityId?: string;
  /** Creates a MetaModel from json */
  metaModelJSON?: any;
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
   * Custom data source through which the LASLoaderPlugin can load LAS files.
   *
   * Default value is {@link LASDefaultDataSource}, which loads via HTTP.
   *
   * @type {ILASDefaultDataSource}
   */
  dataSource: ILASDefaultDataSource;

  /**
   * Configures LASLoaderPlugin to load every **n** points.
   *
   * Default value is ````1````.
   *
   * @type {Number}
   */
  skip: number;

  /**
   * Configures if LASLoaderPlugin assumes that LAS positions are stored in 64-bit floats instead of 32-bit.
   *
   * Default value is ````false````.
   *
   * @type {Boolean}
   */
  fp64: boolean;

  /**
   * Configures whether LASLoaderPlugin assumes that LAS colors are encoded using 8 or 16 bits.
   *
   * Default value is ````8````.
   *
   * Note: LAS specification recommends 16 bits.
   *
   * @type {Number|String}
   */
  colorDepth: 8 | 16 | "auto";

  /**
   * Configures if LASLoaderPlugin immediately centers LAS positions.
   *
   * If this is ````true```` then centering is the first thing that happens to LAS positions as they are loaded.
   *
   * Default value is ````false````.
   *
   * @type {Number[]}
   */
  center: number[];

  /**
   * Current transformation to apply to LAS positions as they are loaded.
   *
   * If this is ````true```` then LAS positions will be transformed right after they are centered.
   *
   * Default value is null.
   *
   * @type {Number[]|null}
   */
  transform: number[];

  /**
   * Current rotations to apply to LAS positions as they are loaded.
   *
   * Rotations are an array of three Euler angles in degrees, for each of the X, Y and Z axis, applied in that order.
   *
   * Default value is null.
   *
   * @type {Number[]|null}
   */
  rotate: number[];

  /**
   * Configures if LAS positions are rotated 90 degrees about X as they are loaded.
   *
   * Default value is ````false````.
   *
   * @type {Boolean}
   */
  rotateX: boolean;

  /**
   * Loads an ````LAS```` model into this LASLoaderPlugin's {@link Viewer}.
   *
   * @param {LoadLASModel} params Loading parameters.
   * @returns {SceneModel} SceneModel representing the model, which will have {@link Entity.isModel} set ````true```` and will be registered by {@link Entity.id} in {@link Scene.models}.
   */
  load(params?: LoadLASModel): SceneModel;
}
