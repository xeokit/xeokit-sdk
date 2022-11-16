import { Component } from "../Component";

export declare type Frame = {
  t: number;
  eye: number[];
  look: number[];
  up: number[];
};

export declare type CameraPathConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /** Initial sequence of frames. */
  frames: Frame[];
};

/**
 * Defines a sequence of frames along which a {@link CameraPathAnimation} can animate a {@link Camera}.
 *
 */
export declare class CameraPath extends Component {
    /**
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this CameraPath as well.
     * @param {CameraPathConfiguration} [cfg] Configuration
     */
    constructor(owner?: Component, cfg?: CameraPathConfiguration);
}
