import { Scene } from "../scene/Scene";
import { MetaModel } from '../../metadata/MetaModel';
/**
 * Saves and restores a snapshot of the visual state of the {@link Entity}'s of a model within a {@link Scene}.
 */
export declare class ModelMemento {
  /**
   * Saves a snapshot of the visual state of the {@link Entity}'s that represent objects within a model.
   *
   * @param {Scene} scene The scene.
   * @param {MetaModel} metaModel Represents the model. Corresponds with an {@link Entity} that represents the model in the scene.
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
  saveObjects(scene: Scene, metaModel: MetaModel, mask?: {
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
   * Restores a {@link Scene}'s {@link Entity}'s to their state previously captured with {@link ModelMemento#saveObjects}.
   *
   * Assumes that the model has not been destroyed or modified since saving.
   *
   * @param {Scene} scene The scene that was given to {@link ModelMemento#saveObjects}.
   * @param {MetaModel} metaModel The metamodel that was given to {@link ModelMemento#saveObjects}.
   */
  restoreObjects(scene: Scene, metaModel: MetaModel): void;
}
