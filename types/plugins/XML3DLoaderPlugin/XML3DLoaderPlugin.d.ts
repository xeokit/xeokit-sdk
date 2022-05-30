import { Plugin, Viewer, VBOSceneModel } from "../../viewer";

export declare type XML3DLoaderPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** Path to the directory that contains the bundled [zip.js](https://gildas-lormeau.github.io/zip.js/) archive */
  workerScriptsPath: string;
  /** What type of materials to create while loading */
  materialType?: "MetallicMaterial" | "SpecularMaterial" | "PhongMaterial";
  /** When true, will create a {@link MetaModel} for the model in {@link MetaScene.metaModels}. */
  createMetaModel?: boolean;
}

export declare type LoadXML3DModel = {
  /** ID to assign to the model's root {@link Entity}, unique among all components in the Viewer's {@link Scene}. */
  id: string;
  /** Path to a 3DXML file. */
  src: string;
  /** Whether or not xeokit renders the {@link Entity} with edges emphasized. */
  edges?: boolean;
  /** The model's World-space 3D position. */
  position?: number[];
  /** The model's World-space scale. */
  scale?: number[];
  /** The model's World-space rotation, as Euler angles given in degrees, for each of the X, Y and Z axis. */
  rotation?: number[];
  /** The model's world transform matrix. Overrides the position, scale and rotation parameters. */
  matrix?: number[];
  /** When true, allows visible backfaces, wherever specified in the 3DXML. When false, ignores backfaces. */
  backfaces?: boolean;
  /** When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn. */
  edgeThreshold?: number;
  /** What type of materials to create while loading: "MetallicMaterial" to create {@link MetallicMaterial}s, "SpecularMaterial" to create {@link SpecularMaterial}s or "PhongMaterial" to create {@link PhongMaterial}s. As it loads XML3D's Phong materials, the XMLLoaderPlugin will do its best approximate conversion of those to the specified workflow. */
  materialType?: "MetallicMaterial" | "SpecularMaterial" | "PhongMaterial";
  /** When true, will create a {@link MetaModel} for the model in {@link MetaScene.metaModels}. */
  createMetaModel?: boolean;
};

/**
 * {@link Viewer} plugin that loads models from [3DXML](https://en.wikipedia.org/wiki/3DXML) files.
 */
export declare class XML3DLoaderPlugin extends Plugin {
  /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   * @param {XML3DLoaderPluginConfiguration} cfg  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?:XML3DLoaderPluginConfiguration );

  /**
   * Supported 3DXML schema versions
   * @type {string[]}
   */
  supportedSchemas: string[];

  /**
   * Loads a 3DXML model from a file into this XML3DLoaderPlugin's {@link Viewer}.
   *
   * Creates a tree of {@link Entity}s within the Viewer's {@link Scene} that represents the model.
   *
   * @param {LoadXML3DModel} params  Loading parameters.
   * @returns {Entity} Entity representing the model, which will have {@link Entity.isModel} set ````true```` and will be registered by {@link Entity.id} in {@link Scene.models}
   */
  load(params: LoadXML3DModel): VBOSceneModel;
}
