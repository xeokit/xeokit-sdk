import { Plugin, Viewer, VBOSceneModel, IFCObjectDefaults } from "../../viewer";
import { ModelStats } from "../index";

/**
 * Default data access strategy for {@link WebIFCLoaderPlugin}.
 */
 export declare interface IWebIFCDefaultDataSource {
  /**
   * Gets the contents of the given IFC file in an arraybuffer.
   *
   * @param {String|Number} src Path or ID of an IFC file.
   * @param {Function} ok Callback fired on success, argument is the IFC file in an arraybuffer.
   * @param {Function} error Callback fired on error.
   */
  getIFC(src: string | number, ok: (buffer: ArrayBuffer)=> void, error: (e: Error)=> void): void;
  
  get cacheBuster(): boolean;

  set cacheBuster(value: boolean);
}

export declare type WebIFCLoaderPluginConfiguration = {
  id?: string;
  objectDefaults?: any;
  dataSource?: IWebIFCDefaultDataSource;
  includeTypes?: string[];
  excludeTypes?: string[];
  excludeUnclassifiedObjects?: boolean;
  WebIFC: any;
  IfcAPI: any;
};

export declare type LoadWebIFCModel = {
  /** ID to assign to the root {@link Entity.id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default. */
  id?: string;
  /** Path to a IFC file, as an alternative to the ````ifc```` parameter. */
  src?: string;
  /** The IFC file data, as an alternative to the ````src```` parameter. */
  ifc?: ArrayBuffer;
  /** Whether to load IFC metadata (metaobjects and property sets). */
  loadMetadata?: boolean;
  /** Map of initial default states for each loaded {@link Entity} that represents an object. Default value is {@link IFCObjectDefaults}. */
  objectDefaults?: IFCObjectDefaults;
  /** When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject.type} values in this list. */
  includeTypes?: string[];
  /** When loading metadata, never loads objects that have {@link MetaObject}s with {@link MetaObject.type} values in this list. */
  excludeTypes?: string[];
  /** Whether or not xeokit renders the model with edges emphasized. */
  edges?: boolean;
  /** The model's World-space double-precision 3D origin. Use this to position the model within xeokit's World coordinate system, using double-precision coordinates. */
  origin?: number[];
  /** The model single-precision 3D position, relative to the ````origin```` parameter. */
  position?: number[];
  /** The model's scale. */
  scale?: number[];
  /** The model's orientation, given as Euler angles in degrees, for each of the X, Y and Z axis. */
  rotation?: number[];
  /** The model's world transform matrix. Overrides the position, scale and rotation parameters. Relative to ````origin````. */
  matrix?: number[];
  /**  Indicates if Scalable Ambient Obscurance (SAO) will apply to the model. SAO is configured by the Scene's {@link SAO} component. Only works when {@link SAO.enabled} is also ````true```` */
  saoEnabled?: boolean;
  /** Indicates if physically-based rendering (PBR) will apply to the model. Only works when {@link Scene.pbrEnabled} is also ````true````. */
  pbrEnabled?: boolean;
  /** When we set this ````true````, then we force rendering of backfaces for the model. When we leave this ````false````, then we allow the Viewer to decide when to render backfaces. In that case, the Viewer will hide backfaces on watertight meshes, show backfaces on open meshes, and always show backfaces on meshes when we slice them open with {@link SectionPlane}s. */
  backfaces?: boolean;
  /** When loading metadata and this is ````true````, will only load {@link Entity}s that have {@link MetaObject}s (that are not excluded). This is useful when we don't want Entitys in the Scene that are not represented within IFC navigation components, such as {@link TreeViewPlugin}. */
  excludeUnclassifiedObjects?: boolean;
  /** Indicates whether to globalize each {@link Entity.id} and {@link MetaObject.id}, in case you need to prevent ID clashes with other models. */
  globalizeObjectIds?: boolean;
  /** Collects model statistics. */
  stats?: ModelStats;
};

/**
 * {@link Viewer} plugin that uses [web-ifc](https://github.com/tomvandig/web-ifc) to load BIM models directly from IFC files.
 */
export declare class WebIFCLoaderPlugin extends Plugin {
  /**
   * @constructor
   *
   * @param {Viewer} viewer The Viewer.
   * @param {WebIFCLoaderPluginConfiguration} cfg  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?: WebIFCLoaderPluginConfiguration);

  /**
   * Sets a custom data source through which the WebIFCLoaderPlugin can load IFC files.
   *
   * Default value is {@link WebIFCDefaultDataSource}, which loads via HTTP.
   *
   * @type {Object}
   */
  set dataSource(arg: IWebIFCDefaultDataSource);

  /**
   * Gets the custom data source through which the WebIFCLoaderPlugin can load IFC files.
   *
   * Default value is {@link WebIFCDefaultDataSource}, which loads via HTTP.
   *
   * @type {Object}
   */
  get dataSource(): IWebIFCDefaultDataSource;

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
   * Sets the whitelist of the IFC types loaded by this WebIFCLoaderPlugin.
   *
   * When loading IFC models, causes this WebIFCLoaderPlugin to only load objects whose types are in this
   * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject.type}.
   *
   * Default value is ````undefined````.
   *
   * @type {String[]}
   */
  set includeTypes(arg: string[]);

  /**
   * Gets the whitelist of the IFC types loaded by this WebIFCLoaderPlugin.
   *
   * When loading IFC models, causes this WebIFCLoaderPlugin to only load objects whose types are in this
   * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject.type}.
   *
   * Default value is ````undefined````.
   *
   * @type {String[]}
   */
  get includeTypes(): string[];

  /**
   * Sets the blacklist of IFC types that are never loaded by this WebIFCLoaderPlugin.
   *
   * When IFC models, causes this WebIFCLoaderPlugin to **not** load objects whose types are in this
   * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject.type}.
   *
   * Default value is ````undefined````.
   *
   * @type {String[]}
   */
  set excludeTypes(arg: string[]);

  /**
   * Gets the blacklist of IFC types that are never loaded by this WebIFCLoaderPlugin.
   *
   * When loading IFC models, causes this WebIFCLoaderPlugin to **not** load objects whose types are in this
   * list. An object's type is indicated by its {@link MetaObject}'s {@link MetaObject.type}.
   *
   * Default value is ````undefined````.
   *
   * @type {String[]}
   */
  get excludeTypes(): string[];

  /**
   * Sets whether we load objects that don't have IFC types.
   *
   * When loading IFC models and this is ````true````, WebIFCLoaderPlugin will not load objects
   * that don't have IFC types.
   *
   * Default value is ````false````.
   *
   * @type {Boolean}
   */
  set excludeUnclassifiedObjects(arg: boolean);

  /**
   * Gets whether we load objects that don't have IFC types.
   *
   * When loading IFC models and this is ````true````, WebIFCLoaderPlugin will not load objects
   * that don't have IFC types.
   *
   * Default value is ````false````.
   *
   * @type {Boolean}
   */
  get excludeUnclassifiedObjects(): boolean;

  /**
   * Gets the ````IFC```` format versions supported by this WebIFCLoaderPlugin.
   * @returns {string[]}
   */
  get supportedVersions(): string[];

  /**
   * Sets whether WebIFCLoaderPlugin globalizes each {@link Entity.id} and {@link MetaObject.id} as it loads a model.
   *
   * Set  this ````true```` when you need to load multiple instances of the same model, to avoid ID clashes
   * between the objects in the different instances.
   *
   * When we load a model with this set ````true````, then each {@link Entity.id} and {@link MetaObject.id} will be
   * prefixed by the ID of the model, ie. ````<modelId>.<objectId>````.
   *
   * {@link Entity.originalSystemId} and {@link MetaObject.originalSystemId} will always hold the original, un-prefixed, ID values.
   *
   * Default value is ````false````.
   *
   * See the main {@link WebIFCLoaderPlugin} class documentation for usage info.
   *
   * @type {Boolean}
   */
  set globalizeObjectIds(arg: boolean);

  /**
   * Gets whether WebIFCLoaderPlugin globalizes each {@link Entity.id} and {@link MetaObject.id} as it loads a model.
   *
   * Default value is ````false````.
   *
   * @type {Boolean}
   */
  get globalizeObjectIds(): boolean;

  /**
   * Loads an ````IFC```` model into this WebIFCLoaderPlugin's {@link Viewer}.
   *
   * @param {LoadWebIFCModel} params Loading parameters.
   * @returns {VBOSceneModel} Entity representing the model, which will have {@link Entity.isModel} set ````true```` and will be registered by {@link Entity.id} in {@link Scene.models}.
   */
  load(params?: LoadWebIFCModel): VBOSceneModel;
}
