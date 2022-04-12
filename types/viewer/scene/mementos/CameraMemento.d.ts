import { Scene } from "../scene/Scene";

/**
 * Saves and restores the state of a {@link Scene}'s {@link Camera}.
 */
export declare class CameraMemento {
  /**
   * Creates a CameraState.
   *
   * @param {Scene} [scene] When given, immediately saves the state of the given {@link Scene}'s {@link Camera}.
   */
  constructor(scene?: Scene);

  /**
   * Saves the state of the given {@link Scene}'s {@link Camera}.
   *
   * @param {Scene} scene The scene that contains the {@link Camera}.
   */
  saveCamera(scene: Scene): void;
  
  /**
   * Restores a {@link Scene}'s {@link Camera} to the state previously captured with {@link CameraMemento#saveCamera}.
   *
   * @param {Scene} scene The scene.
   * @param {Function} [done] When this callback is given, will fly the {@link Camera} to the saved state then fire the callback. Otherwise will just jump the Camera to the saved state.
   */
  restoreCamera(scene: Scene, done?: ()=> void): void;
}
