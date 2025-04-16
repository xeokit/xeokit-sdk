import { Plugin, Viewer, Skybox } from "../../viewer";

/**
 * {@link Viewer} plugin that manages skyboxes
 */
export declare class SkyboxesPlugin extends Plugin {
  /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   */
  constructor(viewer: Viewer);
  
  /**
   * Creates a skybox.
   * @param {Object} params Skybox configuration.
   * @param {String} [params.id] Optional ID, unique among all components in the parent {Scene}, generated automatically when omitted.
   * @param {String | String[]} [params.src=null] Path to skybox texture
   * @param {Number} [params.encoding=LinearEncoding] Texture encoding format.  See the {@link Texture#encoding} property for more info.
   * @param {Number} [params.size=1000] Size of this Skybox, given as the distance from the center at ````[0,0,0]```` to each face.
   * @param {Boolean} [params.active=true] Whether the skybox plane is initially active. Only skyboxes while this is true.
   * @returns {Skybox} The new skybox.
   */
  createSkybox(params: {
      id?: string,
      src: string | string[],
      encoding?: number,
      size?: number,
      active?: boolean;
  }): Skybox; //Skybox;
  
  /**
   * Destroys a skybox.
   * @param id
  */
  destroySkybox(id: string): void;

  /**
   Destroys all skyboxes.
    */
  clear(): void;

  /**
   * Destroys this plugin.
   *
   * Clears skyboxes from the Viewer first.
   */
  destroy(): void;
}
