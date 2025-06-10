import {IFCObjectDefaults, Plugin, VBOSceneModel, Viewer} from "../../viewer";

export declare interface IDotBIMDefaultDataSource {
  /**
   * Gets the contents of the given ````.xkt```` file in an arraybuffer.
   *
   * @param {String|Number} dotBIMSrc Path or ID of an ````.bim```` file.
   * @param {Function} ok Callback fired on success, argument is the ````.xkt```` file in an arraybuffer.
   * @param {Function} error Callback fired on error.
   */
  getDotBIM(dotBIMSrc: string | number, ok: (buffer: ArrayBuffer) => void, error: (e: Error) => void): void;

  get cacheBuster(): boolean;

  set cacheBuster(value: boolean);
}

export declare type DotBIMLoaderPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** Map of initial default states for each loaded {@link Entity} that represents an object.  Default value is {@link IFCObjectDefaults}.*/
  objectDefaults?: IFCObjectDefaults;
  /** A custom data source through which the XKTLoaderPlugin can load model and metadata files. Defaults to an instance of {@link DotBIMDefaultDataSource}, which loads uover HTTP. */
  dataSource?: IDotBIMDefaultDataSource;
};


/**
   * @param {Number[]} [params.rotation=[0,0,0]] The model's orientation, as Euler angles given in degrees, for each of the X, Y and Z axis.
   * @param {Boolean} [params.backfaces=true] When true, always show backfaces, even on objects for which the .BIM material is single-sided. When false, only show backfaces on geometries whenever the .BIM material is double-sided.
   * @param {Boolean} [params.dtxEnabled=true] When ````true```` (default) use data textures (DTX), where appropriate, to
   * represent the returned model. Set false to always use vertex buffer objects (VBOs). Note that DTX is only applicable
   * to non-textured triangle meshes, and that VBOs are always used for meshes that have textures, line segments, or point
   * primitives. Only works while {@link DTX#enabled} is also ````true````.
   */
export declare type LoadDotBIMModel = {
  /** ID to assign to the root {@link Entity#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default. */
  id?: string;
  /** Path to a .BIM file, as an alternative to the ````bim```` parameter. */
  src?: string;
  /** .BIM JSON, as an alternative to the ````src```` parameter. */
  bim?: any;
  /** Map of initial default states for each loaded {@link Entity} that represents an object. Default value is {@link IFCObjectDefaults}. */
  objectDefaults?: object;
  /** When loading metadata, only loads objects that have {@link MetaObject}s with {@link MetaObject.type} values in this list. */
  includeTypes?: string[]
  /** When loading metadata, never loads objects that have {@link MetaObject}s with {@link MetaObject.type} values in this list. */
  excludeTypes?: string[];
  /** The double-precision World-space origin of the model's coordinates. */
  origin?: number[];
  /** The single-precision position, relative to ````origin````. */
  position?: number[];
  /** The model's scale. */
  scale?: number[];
   /** The model's orientation, given as Euler angles in degrees, for each of the X, Y and Z axis. */
   rotation?: number[];
   /** When true, always show backfaces, even on objects for which the .BIM material is single-sided. When false, only show backfaces on geometries whenever the .BIM material is double-sided. */
   backfaces?: boolean;
   /** When ````true```` (default) use data textures (DTX), where appropriate, to
    * represent the returned model. Set false to always use vertex buffer objects (VBOs). Note that DTX is only applicable
    * to non-textured triangle meshes, and that VBOs are always used for meshes that have textures, line segments, or point
    * primitives. Only works while {@link DTX#enabled} is also ````true````. */
   dtxEnabled?: boolean;
};

export declare class DotBIMLoaderPlugin extends Plugin {
  /**
   * @constructor
   *
   * @param {Viewer} viewer The Viewer.
   * @param {DotBIMLoaderPluginConfiguration} cfg  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?: DotBIMLoaderPluginConfiguration);

  /**
   * Sets a custom data source through which the DotBIMLoaderPlugin can .BIM files.
   *
   * Default value is {@link DotBIMDefaultDataSource}, which loads via an XMLHttpRequest.
   *
   * @type {IDotBIMDefaultDataSource}
   */
  set dataSource(arg: IDotBIMDefaultDataSource);

  /**
   * Gets the custom data source through which the DotBIMLoaderPlugin can load .BIM files.
   *
   * Default value is {@link DotBIMDefaultDataSource}, which loads via an XMLHttpRequest.
   *
   * @type {IDotBIMDefaultDataSource}
   */
  get dataSource(): IDotBIMDefaultDataSource;

  /**
     * Sets map of initial default states for each loaded {@link Entity} that represents an object.
     *
     * @type {IFCObjectDefaults}
     */
  set objectDefaults(arg: IFCObjectDefaults);

  /**
   * Gets map of initial default states for each loaded {@link Entity} that represents an object.
   *
   * @type {IFCObjectDefaults}
   */
  get objectDefaults(): IFCObjectDefaults;

  /**
   * Loads a .BIM model from a file into this DotBIMLoaderPlugin's {@link Viewer}.
   *
   * @param {LoadDotBIMModel} params Loading parameters.
   * @returns {VBOSceneModel} Entity representing the model, which will have {@link Entity.isModel} set ````true```` and will be registered by {@link Entity.id} in {@link Scene.models}.
   */
  load(params: LoadDotBIMModel): VBOSceneModel;
}
