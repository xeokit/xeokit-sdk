import { Plugin, Viewer } from "../../viewer";

export declare type AxisGizmoPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** ID of an existing HTML canvas to display the AxisGizmo - either this or canvasElement is mandatory. When both values are given, the element reference is always preferred to the ID. */
  canvasId?: string;
  /** Reference of an existing HTML canvas to display the AxisGizmo - either this or canvasId is mandatory. When both values are given, the element reference is always preferred to the ID. */
  canvasElement?: HTMLCanvasElement;
}

/**
 * {@link Viewer} plugin that shows the axii of the World-space coordinate system.
 */
export declare class AxisGizmoPlugin extends Plugin {
  /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   * @param {AxisGizmoPluginConfiguration} cfg  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg:AxisGizmoPluginConfiguration );

  /** Shows or hides this AxisGizmoPlugin.
   *
   * @param visible
   */
  setVisible(visible: boolean): void;
}
