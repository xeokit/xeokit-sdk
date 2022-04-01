import { Plugin, Viewer } from "../../viewer";

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
   * @param {String} id Unique ID to assign to the skybox.
   * @param {Object} params Skybox configuration.
   * @param {Boolean} [params.active=true] Whether the skybox plane is initially active. Only skyboxes while this is true.
   * @returns {Skybox} The new skybox.
   */
  createSkybox(id: string, params: {
      active?: boolean;
  }): any; //Skybox;
  
  /**
   * Destroys a skybox.
   * @param id
  */
  destroySkybox(id: string): void;

  /**
   Destroys all skyboxes.
    */
  clear(): void;
}
