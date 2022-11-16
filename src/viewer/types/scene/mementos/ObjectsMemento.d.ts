import { Scene } from "../scene/Scene";

/**
 * Saves and restores a snapshot of the visual state of the {@link Entity}'s that represent objects within a {@link Scene}.
 */
export declare class ObjectsMemento {
  /**
   * Saves a snapshot of the visual state of the {@link Entity}'s that represent objects within a {@link Scene}.
   *
   * @param {Scene} scene The scene.
   * @param {Object} [mask] Masks what state gets saved. Saves all state when not supplied.
   * @param {boolean} [mask.visible] Saves {@link Entity#visible} values when ````true````.
   * @param {boolean} [mask.edges] Saves {@link Entity#edges} values when ````true````.
   * @param {boolean} [mask.xrayed] Saves {@link Entity#xrayed} values when ````true````.
   * @param {boolean} [mask.highlighted] Saves {@link Entity#highlighted} values when ````true````.
   * @param {boolean} [mask.selected] Saves {@link Entity#selected} values when ````true````.
   * @param {boolean} [mask.clippable] Saves {@link Entity#clippable} values when ````true````.
   * @param {boolean} [mask.pickable] Saves {@link Entity#pickable} values when ````true````.
   * @param {boolean} [mask.colorize] Saves {@link Entity#colorize} values when ````true````.
   * @param {boolean} [mask.opacity] Saves {@link Entity#opacity} values when ````true````.
   */
  saveObjects(scene: Scene, mask?: {
      visible?: boolean;
      edges?: boolean;
      xrayed?: boolean;
      highlighted?: boolean;
      selected?: boolean;
      clippable?: boolean;
      pickable?: boolean;
      colorize?: boolean;
      opacity?: boolean;
  }): void;

  /**
   * Restores a {@link Scene}'s {@link Entity}'s to their state previously captured with {@link ObjectsMemento#saveObjects}.
   * @param {Scene} scene The scene.
   */
  restoreObjects(scene: Scene): void;
}
