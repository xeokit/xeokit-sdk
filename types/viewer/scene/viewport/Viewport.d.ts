import { Component } from "../Component";

export declare class Viewport extends Component {
  /**
   * Sets the canvas-space boundary of this Viewport, indicated as ````[min, max, width, height]````.
   */
  set boundary(arg: number[]);

  /**
   * Gets the canvas-space boundary of this Viewport, indicated as ````[min, max, width, height]````.
   */
  get boundary(): number[];

  /**
   * Sets if {@link Viewport.boundary} automatically synchronizes with {@link Canvas.boundary}.
   */
  set autoBoundary(arg: boolean);

  /**
   * Gets if {@link Viewport.boundary} automatically synchronizes with {@link Canvas.boundary}.
   */
  get autoBoundary(): boolean;
}
