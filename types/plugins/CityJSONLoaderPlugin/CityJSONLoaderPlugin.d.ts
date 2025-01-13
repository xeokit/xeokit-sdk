import { Plugin, Viewer, Entity } from "../../viewer";
import { ModelStats } from "../index";

export declare interface ICityJSONDefaultDataSource {
  /**
   * Gets the contents of the given CityJSON file.
   *
   * @param {String|Number} src Path or ID of an CityJSON file.
   * @param {Function} ok Callback fired on success, argument is the CityJSON JSON.
   * @param {Function} error Callback fired on error.
   */
  getCityJSON(src: string | number, ok: (json: any)=> void, error: (e: Error)=> void): void;

  get cacheBuster(): boolean;

  set cacheBuster(value: boolean);
}

export declare type CityJSONLoaderPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** A custom data source through which the CityJSONLoaderPlugin can load model and metadata files. Defaults to an instance of {@link CityJSONDefaultDataSource}, which loads over HTTP.*/
  dataSource?: ICityJSONDefaultDataSource;
};

export declare type LoadCityJSONModel = {
  /** ID to assign to the root {@link Entity.id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default. */
  id?: string;
  /** Path to a CityJSON file, as an alternative to the ````cityJSON```` parameter. */
  src?: string;
  /** The CityJSON file data, as an alternative to the ````src```` parameter. */
  cityJSON?: ArrayBuffer;
  /** Whether to load metadata on CityJSON objects. */
  loadMetadata?: boolean;
  /** The model's World-space double-precision 3D origin. Use this to position the model within xeokit's World coordinate system, using double-precision coordinates. */
  origin?: number[];
  /** The model single-precision 3D position, relative to the ````origin```` parameter. */
  position?: number[];
  /** The model's scale. */
  scale?: number[];
  /** The model's orientation, given as Euler angles in degrees, for each of the X, Y and Z axis. */
  rotation?: number[];
  /**  The model's world transform matrix. Overrides the position, scale and rotation parameters. Relative to ````origin````. */
  matrix?: number[];
  /** Collects model statistics. */
  stats?: ModelStats;
};

/**
 * {@link Viewer} plugin that loads models from CityJSON files.
 */
export declare class CityJSONLoaderPlugin extends Plugin {
  /**
   * @constructor
   *
   * @param {Viewer} viewer The Viewer.
   * @param {CityJSONLoaderPluginConfiguration} cfg  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?: CityJSONLoaderPluginConfiguration);

  /**
   * Sets a custom data source through which the CityJSONLoaderPlugin can load CityJSON files.
   *
   * Default value is {@link CityJSONDefaultDataSource}, which loads via HTTP.
   *
   * @type {Object}
   */
  set dataSource(arg: ICityJSONDefaultDataSource);

  /**
   * Gets the custom data source through which the CityJSONLoaderPlugin can load CityJSON files.
   *
   * Default value is {@link CityJSONDefaultDataSource}, which loads via HTTP.
   *
   * @type {Object}
   */
  get dataSource(): ICityJSONDefaultDataSource;

  /**
   * Loads an ````CityJSON```` model into this CityJSONLoaderPlugin's {@link Viewer}.
   *
   * @param {LoadCityJSONModel} params Loading parameters.
   */
  load(params: LoadCityJSONModel): Entity;
}
