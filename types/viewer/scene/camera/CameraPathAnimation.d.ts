import { Component } from "../Component";
import { CameraPath } from "./CameraPath";

export declare type CameraPathAnimationConfiguration = {
  playingRate: number;
  /** A {@link CameraPath} that defines the path of a {@link Camera} */
  cameraPath: CameraPath;
};

/**
 * Animates the {@link Scene}'s's {@link Camera} along a {@link CameraPath}.
 */
export declare class CameraPathAnimation extends Component {
    /**
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this CameraPathAnimation as well.
     * @param {CameraPathAnimationConfiguration} [cfg] Configuration
     */
    constructor(owner?: Component, cfg?: CameraPathAnimationConfiguration);

    /**
     * Sets the {@link CameraPath} animated by this CameraPathAnimation.
     *
     @param {CameraPath} value The new CameraPath.
     */
    set cameraPath(arg: CameraPath);

    /**
     * Gets the {@link CameraPath} animated by this CameraPathAnimation.
     *
     @returns {CameraPath} The CameraPath.
     */
    get cameraPath(): CameraPath;

    /**
     * Sets the rate at which the CameraPathAnimation animates the {@link Camera} along the {@link CameraPath}.
     *
     *  @param {Number} value The amount of progress per second.
     */
    set rate(arg: number);

    /**
     * Gets the rate at which the CameraPathAnimation animates the {@link Camera} along the {@link CameraPath}.
     *
     * @returns {*|number} The current playing rate.
     */
    get rate(): number;

    /**
     * Begins animating the {@link Camera} along CameraPathAnimation's {@link CameraPath} from the beginning.
     */
    play(): void;

    /**
     * Begins animating the {@link Camera} along CameraPathAnimation's {@link CameraPath} from the given time.
     *
     * @param {Number} t Time instant.
     */
    playToT(t: number): void;

    /**
     * Animates the {@link Camera} along CameraPathAnimation's {@link CameraPath} to the given frame.
     *
     * @param {Number} frameIdx Index of the frame to play to.
     */
    playToFrame(frameIdx: number): void;

    /**
     * Flies the {@link Camera} directly to the given frame on the CameraPathAnimation's {@link CameraPath}.
     *
     * @param {Number} frameIdx Index of the frame to play to.
     * @param {Function} [ok] Callback to fire when playing is complete.
     */
    flyToFrame(frameIdx: number, ok?: ()=> void): void;

    /**
     * Scrubs the {@link Camera} to the given time on the CameraPathAnimation's {@link CameraPath}.
     *
     * @param {Number} t Time instant.
     */
    scrubToT(t: number): void;

    /**
     * Scrubs the {@link Camera} to the given frame on the CameraPathAnimation's {@link CameraPath}.
     *
     * @param {Number} frameIdx Index of the frame to scrub to.
     */
    scrubToFrame(frameIdx: number): void;

    /**
     * Stops playing this CameraPathAnimation.
     */
    stop(): void;

    destroy(): void;
}

