
import { Entity, Viewer } from "../../viewer";

/**
 * Controls a {@link SectionPlane} with mouse and touch input.
 * @private
 */
declare class MovementControl {
  /**
   * ID of this Control.
   * SectionPlaneControls are mapped by this ID in {@link SectionPlanesPlugin#sectionPlaneControls}.
   */
  id: string | number | null;

  /**
   * Creates a new MovementControl instance.
   * @param viewer - The entity to control.
   */
  constructor(viewer: Viewer);

  /**
   * Destroys the control and cleans up resources.
   * @private
   */
  _destroy(): void;

  /**
   * Called by SectionPlanesPlugin to assign this Control to a SectionPlane.
   * SectionPlanesPlugin keeps SectionPlaneControls in a reuse pool.
   * Call with a null or undefined value to disconnect the Control from whatever SectionPlane it was assigned to.
   * @private
   * @param sectionPlane - The SectionPlane to control.
   */
  _setElement(element: Entity | null): void;

  /**
   * Gets the {@link SectionPlane} controlled by this Control.
   * @returns {SectionPlane} The SectionPlane.
   */
  get element(): Entity | null;

  /**
   * Sets if this Control is visible.
   * @param visible - Whether the control is visible.
   */
  setVisible(visible?: boolean): void;

  /**
   * Gets if this Control is visible.
   * @returns {boolean} Whether the control is visible.
   */
  getVisible(): boolean;

  /**
   * Sets if this Control is culled. This is called by SectionPlanesPlugin to
   * temporarily hide the Control while a snapshot is being taken by Viewer#getSnapshot().
   * @param culled - Whether the control is culled.
   */
  setCulled(culled: boolean): void;
}

export { MovementControl };