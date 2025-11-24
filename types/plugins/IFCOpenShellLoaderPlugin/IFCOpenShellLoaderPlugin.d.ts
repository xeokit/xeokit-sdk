import { Plugin, Viewer, SceneModel } from "../../viewer";
import { ModelStats } from "../index";

/**
 * Default data source for loading IFC files in IFCOpenShellLoaderPlugin.
 * Loads files via HTTP by default.
 */
export declare interface IFCOpenShellDefaultDataSource {
  /**
   * Loads the contents of the given IFC file as an ArrayBuffer.
   * @param src Path or ID of the IFC file.
   * @param ok Callback on success, receives the IFC file as an ArrayBuffer.
   * @param error Callback on error, receives an Error.
   */
  getIFC(src: string | number, ok: (buffer: ArrayBuffer) => void, error: (e: Error) => void): void;

  /** Whether to append a cache-busting query parameter to requests. */
  get cacheBuster(): boolean;
  set cacheBuster(value: boolean);
}

/**
 * Configuration options for IFCOpenShellLoaderPlugin.
 */
export declare type IFCOpenShellLoaderPluginConfigs = {
  /** Optional plugin ID. */
  id?: string;
  /** Custom data source for loading IFC files. */
  dataSource?: IFCOpenShellDefaultDataSource;
  /** Pyodide proxy for the ifcopenshell module. */
  ifcopenshell: any;
  /** Pyodide proxy for the ifcopenshell.geom module. */
  ifcopenshell_geom: any;
};

/**
 * Parameters for loading an IFC model with IFCOpenShellLoaderPlugin.
 */
export declare type LoadIFCOpenShellModel = {
  /** Unique ID for the loaded SceneModel. */
  id?: string;
  /** Path to the IFC file. */
  src?: string;
  /** Whether to load IFC metadata (metaobject). */
  loadMetadata?: boolean;
  /** Whether to load IFC metadata property sets. Only works when `loadMetadata` is `true`. */
  loadMetadataPropertySets?: boolean;
  /** Exclude objects with types in this list. */
  excludeTypes?: string[];
  /** Render the model with edges emphasized. */
  edges?: boolean;
  /** World-space double-precision origin for the model. */
  origin?: number[];
  /** Single-precision position offset, relative to origin. */
  position?: number[];
  /** Model scale. */
  scale?: number[];
  /** Model orientation as Euler angles (degrees) for X, Y, Z. */
  rotation?: number[];
  /** Enable Scalable Ambient Obscurance (SAO) for the model. */
  saoEnabled?: boolean;
  /** Force rendering of backfaces for the model. */
  backfaces?: boolean;
  /** Globalize Entity and MetaObject IDs to avoid clashes. */
  globalizeObjectIds?: boolean;
  /** Collect model statistics. */
  stats?: ModelStats;
    /** Indicates if compact data texture scene representation is enabled for this model. */
  dtxEnabled?: boolean;
};

/**
 * Viewer plugin that uses IfcOpenShell to load BIM models directly from IFC files.
 */
export declare class IFCOpenShellLoaderPlugin extends Plugin {
  /**
   * Creates a new IFCOpenShellLoaderPlugin.
   * @param viewer The Viewer instance.
   * @param cfg Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?: IFCOpenShellLoaderPluginConfigs);

  /**
   * Sets a custom data source for loading IFC files.
   * Default is IFCOpenShellDefaultDataSource, which loads via HTTP.
   */
  set dataSource(arg: IFCOpenShellDefaultDataSource);

  /**
   * Gets the current data source for loading IFC files.
   * Default is IFCOpenShellDefaultDataSource, which loads via HTTP.
   */
  get dataSource(): IFCOpenShellDefaultDataSource;

  /**
   * Gets whether object and metaobject IDs are globalized to avoid clashes.
   * Default is false.
   */
  get globalizeObjectIds(): boolean;

  /**
   * Loads an IFC model into the Viewer's scene.
   * @param params Loading parameters.
   * @returns SceneModel representing the loaded model.
   */
  load(params?: LoadIFCOpenShellModel): SceneModel;
}