import { Entity, Node, Plugin, Viewer } from "../../viewer";

export declare type LoadOBJModel = {
  /** ID to assign to the model's root {@link Entity}, unique among all components in the Viewer's {@link Scene}. */
  id: string;
  /** Path to an OBJ file. */
  src: string;
  /** Path to an optional metadata file. */
  metaModelSrc?: string;
  /** The model World-space 3D position. */
  position?: number[];
  /** The model's World-space scale. */
  scale?: number[];
  /** The model's World-space rotation, as Euler angles given in degrees, for each of the X, Y and Z axis. */
  rotation?: number[];
  /** The model's world transform matrix. Overrides the position, scale and rotation parameters. */
  matrix?: number[];
  /** When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn. */
  edgeThreshold?: number;
};

/**
 * {@link Viewer} plugin that loads models from [OBJ](https://en.wikipedia.org/wiki/Wavefront_.obj_file) files.
 */
export declare class OBJLoaderPlugin extends Plugin {
  /**
   * @constructor
   *
   * @param {Viewer} viewer The Viewer.
   * @param {Object} cfg Plugin configuration.
   * @param {String} [cfg.id="OBJLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}.
   */
  constructor(viewer: Viewer, cfg: {
      id?: string;
  });
  
  /**
   * Loads an OBJ model from a file into this OBJLoader's {@link Viewer}.
   *
   * @param {LoadOBJModel} params  Loading parameters.
   * @returns {Node} An {@link Entity} that is a scene graph node that can have child Nodes and {@link Mesh}es.
   */
  load(params: LoadOBJModel): Node;
}
