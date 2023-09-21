import { Plugin, Viewer } from "../../viewer";
import { SectionPlane } from "../../viewer/scene/sectionPlane";

export declare type SectionPlanesPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** ID of a canvas element to display the overview. */
  overviewCanvasId?: string;
  /** Initial visibility of the overview canvas. */
  overviewVisible?: boolean;
};

/**
 * SectionPlanesPlugin is a {@link Viewer} plugin that manages {@link SectionPlane}s.
 */
export declare class SectionPlanesPlugin extends Plugin {
  /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   * @param {SectionPlanesPluginConfiguration} cfg Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?: SectionPlanesPluginConfiguration);
  
  /**
   * Sets if the overview canvas is visible.
   *
   * @param {Boolean} visible Whether or not the overview canvas is visible.
   */
  setOverviewVisible(visible: boolean): void;
  
  /**
   * Gets if the overview canvas is visible.
   *
   * @return {Boolean} True when the overview canvas is visible.
   */
  getOverviewVisible(): boolean;

  /**
   * Returns a map of the {@link SectionPlane}s created by this SectionPlanesPlugin.
   *
   * @returns {{String:SectionPlane}} A map containing the {@link SectionPlane}s, each mapped to its {@link SectionPlane.id}.
   */
  get sectionPlanes(): { [key:string]: SectionPlane };

  /**
   * Creates a {@link SectionPlane}.
   *
   * The {@link SectionPlane} will be registered by {@link SectionPlane.id} in {@link SectionPlanesPlugin.sectionPlanes}.
   *
   * @param {Object} params {@link SectionPlane} configuration.
   * @param {String} [params.id] Unique ID to assign to the {@link SectionPlane}. Must be unique among all components in the {@link Viewer}'s {@link Scene}. Auto-generated when omitted.
   * @param {Number[]} [params.pos=[0,0,0]] World-space position of the {@link SectionPlane}.
   * @param {Number[]} [params.dir=[0,0,-1]] World-space vector indicating the orientation of the {@link SectionPlane}.
   * @param {Boolean} [params.active=true] Whether the {@link SectionPlane} is initially active. Only clips while this is true.
   * @returns {SectionPlane} The new {@link SectionPlane}.
   */
  createSectionPlane(params?: {
      id?: string;
      pos?: number[];
      dir?: number[];
      active?: boolean;
  }): SectionPlane;
  
  /**
   * Inverts the direction of {@link SectionPlane.dir} on every existing SectionPlane.
   *
   * Inverts all SectionPlanes, including those that were not created with SectionPlanesPlugin.
   */
  flipSectionPlanes(): void;

  /**
   * Shows the 3D editing gizmo for a {@link SectionPlane}.
   *
   * @param {String} id ID of the {@link SectionPlane}.
   */
  showControl(id: string): void;

  /**
   * Gets the ID of the {@link SectionPlane} that the 3D editing gizmo is shown for.
   *
   * Returns ````null```` when the editing gizmo is not shown.
   *
   * @returns {String} ID of the the {@link SectionPlane} that the 3D editing gizmo is shown for, if shown, else ````null````.
   */
  getShownControl(): string;

  /**
   * Hides the 3D {@link SectionPlane} editing gizmo if shown.
   */
  hideControl(): void;

  /**
   * Destroys a {@link SectionPlane} created by this SectionPlanesPlugin.
   *
   * @param {String} id ID of the {@link SectionPlane}.
   */
  destroySectionPlane(id: string): void;

  /**
   * Destroys all {@link SectionPlane}s created by this SectionPlanesPlugin.
   */
  clear(): void;
}
