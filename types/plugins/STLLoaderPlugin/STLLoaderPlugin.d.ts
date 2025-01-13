import { Plugin, Viewer, VBOSceneModel } from "../../viewer";

export declare interface ISTLDefaultDataSource {
  /**
   * Gets STL data.
   *
   * @param {String|Number} src Identifies the STL file.
   * @param {Function} ok Fired on successful loading of the STL file.
   * @param {Function} error Fired on error while loading the STL file.
   */
  getSTL(src: string | number, ok: Function, error: Function): void;

  get cacheBuster(): boolean;

  set cacheBuster(value: boolean);
}

export declare type STLLoaderPluginCOnfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** A custom data source through which the STLLoaderPlugin can load STL files. Defaults to an instance of {@link STLDefaultDataSource}, which loads over HTTP. */
  dataSource?: ISTLDefaultDataSource;
};

export declare type LoadSTLModel = {
  /** ID to assign to the model's root {@link Entity}, unique among all components in the Viewer's {@link Scene}. */
  id: string;
  /** Path to an STL file. Overrides the ````stl```` parameter. */
  src?: string;
  /** Contents of an STL file, either binary of ASCII. Overridden by the ````src```` parameter. */
  stl?: string;
  /** Whether or not to renders the model with edges emphasized. */
  edges?: boolean;
  /** The model's World-space double-precision 3D origin. Use this to position the model within xeokit's World coordinate system, using double-precision coordinates. */
  origin?: number[];
  /** The model single-precision 3D position, relative to the ````origin```` parameter. */
  position?: number[];
  /** The model's scale. */
  scale?: number[];
  /** The model's orientation, given as Euler angles in degrees, for each of the X, Y and Z axis. */
  rotation?: number[];
  /** The model's world transform matrix. Overrides the position, scale and rotation parameters. */
  matrix?: number[];
  /** When true, allows visible backfaces, wherever specified in the 3DXML. When false, ignores backfaces. */
  backfaces?: boolean;
  /** When true, automatically converts face-oriented normals to vertex normals for a smooth appearance. */
  smoothNormals?: boolean;
  /** When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn. */
  smoothNormalsAngleThreshold?: number;
  /** When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn. */
  edgeThreshold?: number;
  /** When true, creates a separate {@link Mesh} for each group of faces that share the same vertex colors. Only works with binary STL. */
  splitMeshes?: boolean;
};

/**
 * {@link Viewer} plugin that loads models from <a href="https://en.wikipedia.org/wiki/STL_(file_format)">STL</a> files.
 */
export declare class STLLoaderPlugin extends Plugin {
  /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   * @param {STLLoaderPluginCOnfiguration} [cfg]  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?: STLLoaderPluginCOnfiguration);

  /**
   * Sets a custom data source through which the STLLoaderPlugin can load STL files.
   *
   * Default value is {@link STLDefaultDataSource}, which loads via an XMLHttpRequest.
   *
   * @type {ISTLDefaultDataSource}
   */
  set dataSource(arg: ISTLDefaultDataSource);

  /**
   * Gets the custom data source through which the STLLoaderPlugin can load STL files.
   *
   * Default value is {@link STLDefaultDataSource}, which loads via an XMLHttpRequest.
   *
   * @type {ISTLDefaultDataSource}
   */
  get dataSource(): ISTLDefaultDataSource;

  /**
   * Loads an STL model from a file into this STLLoaderPlugin's {@link Viewer}.
   *
   * @param {LoadSTLModel} params Loading parameters.
   * @returns {VBOSceneModel} Entity representing the model, which will have {@link Entity.isModel} set ````true```` and will be registered by {@link Entity.id} in {@link Scene.models}
   */
  load(params: LoadSTLModel): VBOSceneModel;
}
