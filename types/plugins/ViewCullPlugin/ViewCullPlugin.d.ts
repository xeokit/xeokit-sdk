import { Plugin, Viewer } from "../../viewer";

export declare type ViewCullPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** Maximum depth of the kd-tree. */
  maxTreeDepth?: number;
};

/**
 * {@link Viewer} plugin that performs view frustum culling to accelerate rendering performance.
 */
export declare class ViewCullPlugin extends Plugin {
  /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   * @param {ViewCullPluginConfiguration} cfg  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?: ViewCullPluginConfiguration);

  /**
   * Sets whether view culling is enabled.
   *
   * @param {Boolean} enabled Whether to enable view culling.
   */
  set enabled(arg: boolean);

  /**
   * Gets whether view culling is enabled.
   *
   * @retutns {Boolean} Whether view culling is enabled.
   */
  get enabled(): boolean;
}
