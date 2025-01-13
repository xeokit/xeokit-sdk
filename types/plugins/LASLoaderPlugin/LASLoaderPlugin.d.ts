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

  get cacheBuster(): boolean;

  set cacheBuster(value: boolean);
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
  set skip(value: number);

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
  set fp64(value: boolean);

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
  set colorDepth(value: 8 | 16 | "auto");

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
   * Gets if LASLoaderPlugin immediately centers LAS positions.
   *
   * If this is ````true```` then centering is the first thing that happens to LAS positions as they are loaded.
   *
   * Default value is ````false````.
   *
   * @returns {Boolean} True if LASLoaderPlugin immediately centers LAS positions.
   */
  get center():number[];

  /**
   * Configures if LASLoaderPlugin immediately centers LAS positions.
   *
   * If this is ````true```` then centering is the first thing that happens to LAS positions as they are loaded.
   *
   * Default value is ````false````.
   *
   * @param {Boolean} value True if LASLoaderPlugin immediately centers LAS positions.
   */
  set center(value:number[]);

  /**
   * Gets the current transformation to apply to LAS positions as they are loaded.
   *
   * If this is ````true```` then LAS positions will be transformed right after they are centered.
   *
   * Default value is null.
   *
   * @returns {Number[]|null} A 16-element array containing a 4x4 transformation matrix.
   */
  get transform(): number[];

  /**
   * Sets the current transformation to apply to LAS positions as they are loaded.
   *
   * Default value is null.
   *
   * @param {Number[]|null} transform A 16-element array containing a 4x4 transformation matrix.
   */
  set transform(transform: number[]);

  /**
   * Gets the current rotations to apply to LAS positions as they are loaded.
   *
   * Rotations are an array of three Euler angles in degrees, for each of the X, Y and Z axis, applied in that order.
   *
   * Default value is null.
   *
   * @returns {Number[]|null} If defined, an array of three Euler angles in degrees, for each of the X, Y and Z axis. Null if undefined.
   */
  get rotate():number[];

  /**
   * Sets the current rotations to apply to LAS positions as they are loaded.
   *
   * Rotations are an array of three Euler angles in degrees, for each of the X, Y and Z axis, applied in that order.
   *
   * Default value is null.
   *
   * @param {Number[]|null} rotate Array of three Euler angles in degrees, for each of the X, Y and Z axis.
   */
  set rotate(rotate:number[]) ;

  /**
   * Gets if LAS positions are rotated 90 degrees about X as they are loaded.
   *
   * Default value is ````false````.
   *
   * @returns {*}
   */
  get rotateX() :boolean;

  /**
   * Sets if LAS positions are rotated 90 degrees about X as they are loaded.
   *
   * Default value is ````false````.
   *
   * @param rotateX
   */
  set rotateX(rotateX:boolean);

  /**
   * Loads an ````LAS```` model into this LASLoaderPlugin's {@link Viewer}.
   *
   * @param {LoadLASModel} params Loading parameters.
   * @returns {SceneModel} SceneModel representing the model, which will have {@link Entity.isModel} set ````true```` and will be registered by {@link Entity.id} in {@link Scene.models}.
   */
  load(params?: LoadLASModel): SceneModel;
}
