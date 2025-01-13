import { Entity, IFCObjectDefaults, Plugin, SceneModel, Viewer } from "../../viewer";

export declare interface IGLTFDefaultDataSource {
  /**
   * Gets metamodel JSON.
   *
   * @param {String|Number} metaModelSrc Identifies the metamodel JSON asset.
   * @param {Function(*)} ok Fired on successful loading of the metamodel JSON asset.
   * @param {Function(*)} error Fired on error while loading the metamodel JSON asset.
   */
  getMetaModel(metaModelSrc: string | number, ok: Function, error: Function): void;

  /**
   * Gets glTF JSON.
   *
   * @param {String|Number} glTFSrc Identifies the glTF JSON asset.
   * @param {Function} ok Fired on successful loading of the glTF JSON asset.
   * @param {Function} error Fired on error while loading the glTF JSON asset.
   */
  getGLTF(glTFSrc: string | number, ok: Function, error: Function): void;

  /**
   * Gets glTF binary attachment.
   *
   * Note that this method requires the source of the glTF JSON asset. This is because the binary attachment
   * source could be relative to the glTF source, IE. it may not be a global ID.
   *
   * @param {String|Number} glTFSrc Identifies the glTF JSON asset.
   * @param {String|Number} binarySrc Identifies the glTF binary asset.
   * @param {Function} ok Fired on successful loading of the glTF binary asset.
   * @param {Function} error Fired on error while loading the glTF binary asset.
   */
  getArrayBuffer(glTFSrc: string | number, binarySrc: string | number, ok: Function, error: Function): void;

  get cacheBuster(): boolean;

  set cacheBuster(value: boolean);
}

export declare type GLTFLoaderPluginConfiguration =  {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** Map of initial default states for each loaded {@link Entity} that represents an object.  Default value is {@link IFCObjectDefaults}. */
  objectDefaults?: IFCObjectDefaults;
  /** A custom data source through which the GLTFLoaderPlugin can load metadata, glTF and binary attachments. Defaults to an instance of {@link GLTFDefaultDataSource}, which loads over HTTP. */
  dataSource?: IGLTFDefaultDataSource;
};

export declare type LoadGLTFModel = {
  /** ID to assign to the root {@link Entity.id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default. */
  id?: string;
  /** Path to a glTF file, as an alternative to the ````gltf```` parameter. */
  src?: string;
  /** glTF JSON, as an alternative to the ````src```` parameter. */
  gltf?: any;
  /** Path to an optional metadata file, as an alternative to the ````metaModelData```` parameter.*/
  metaModelSrc?: string;
  /** JSON model metadata, as an alternative to the ````metaModelSrc```` parameter. */
  metaModelData?: any;
  /** Map of initial default states for each loaded {@link Entity} that represents an object. Default value is {@link IFCObjectDefaults}. */
  objectDefaults?: object;
  /** When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject.type} values in this list. */
  includeTypes?: string[]
  /** When loading metadata, never loads objects that have {@link MetaObject}s with {@link MetaObject.type} values in this list. */
  excludeTypes?: string[]
  /** Whether or not xeokit renders the model with edges emphasized. */
  edges?: boolean;
  /** The double-precision World-space origin of the model's coordinates. */
  origin?: number[]
  /** The single-precision position, relative to ````origin````. */
  position?: number[]
  /** The model's scale. */
  scale?: number[]
  /** The model's orientation, as Euler angles given in degrees, for each of the X, Y and Z axis. */
  rotation?: number[]
  /** The model's world transform matrix. Overrides the position, scale and rotation parameters. Relative to ````origin````. */
  matrix?: number[]
  /** When true, allows visible backfaces, wherever specified in the glTF. When false, ignores backfaces. */
  backfaces?: number[]
  /** When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn. */
  edgeThreshold?: number[]
  /** Set ````false```` to load all the materials and textures provided by the glTF file, otherwise leave ````true```` to load the default high-performance representation optimized for low memory usage and efficient rendering. */
  performance?: boolean;
  /** When true, generate a single MetaObject that represents the entire glTF model, and a MetaObject for each entity within it. */
  autoMetaModel?: boolean;
};

/**
 * {@link Viewer} plugin that loads models from [glTF](https://www.khronos.org/gltf/).
 */
export declare class GLTFLoaderPlugin extends Plugin {
  /**
   * @constructor
   *
   * @param {Viewer} viewer The Viewer.
   * @param {IGLTFDefaultDataSource} cfg  Plugin configuration.
   * @param {String} [cfg.id="GLTFLoader"]
   * @param {Object} [cfg.objectDefaults]
   * @param {Object} [cfg.dataSource]
   */
  constructor(viewer: Viewer, cfg?:GLTFLoaderPluginConfiguration);

  /**
   * Sets a custom data source through which the GLTFLoaderPlugin can load metadata, glTF and binary attachments.
   *
   * Default value is {@link GLTFDefaultDataSource}, which loads via an XMLHttpRequest.
   *
   * @type {Object}
   */
  set dataSource(arg: IGLTFDefaultDataSource);

  /**
   * Gets the custom data source through which the GLTFLoaderPlugin can load metadata, glTF and binary attachments.
   *
   * Default value is {@link GLTFDefaultDataSource}, which loads via an XMLHttpRequest.
   *
   * @type {Object}
   */
  get dataSource(): IGLTFDefaultDataSource;

  /**
   * Sets map of initial default states for each loaded {@link Entity} that represents an object.
   *
   * Default value is {@link IFCObjectDefaults}.
   *
   * @type {IFCObjectDefaults}
   */
  set objectDefaults(arg: IFCObjectDefaults);

  /**
   * Gets map of initial default states for each loaded {@link Entity} that represents an object.
   *
   * Default value is {@link IFCObjectDefaults}.
   *
   * @type {IFCObjectDefaults}
   */
  get objectDefaults(): IFCObjectDefaults;

  /**
   * Loads a glTF model from a file into this GLTFLoaderPlugin's {@link Viewer}.
   *
   * @param {LoadGLTFModel} params Loading parameters.
   * @returns {SceneModel} SceneModel representing the model, which will have {@link Entity.isModel} set ````true```` and will be registered by {@link Entity.id} in {@link Scene.models}.
   */
  load(params: LoadGLTFModel): SceneModel;
}
