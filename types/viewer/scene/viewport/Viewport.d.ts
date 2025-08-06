import { Component } from "../Component";

export declare class Viewport extends Component {
  /**
   * The canvas-space boundary of this Viewport, indicated as ````[min, max, width, height]````.
   */
  boundary: number[];

  /**
   * Whether {@link Viewport.boundary} automatically synchronizes with {@link Canvas.boundary}.
   */
  autoBoundary: boolean;
}
