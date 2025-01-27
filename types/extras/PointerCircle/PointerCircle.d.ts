import {Viewer} from "../../viewer";

/**
 * A PointerCircle shows a circle, centered at the position of the
 * mouse or touch pointer.
 */
export class PointerCircle {
    /**
     * Constructs a new PointerCircle.
     * @param {Viewer} viewer The Viewer
     * @param {Object} [cfg] PointerCircle configuration.
     * @param {boolean} [cfg.active=true] Whether PointerCircle is active. The PointerCircle can only be shown when this is `true` (default).
     */
    constructor(viewer: Viewer, cfg?: {
        active?: boolean;
    });

    /**
     * Show the circle at the given canvas coordinates and begin shrinking it.
     */
    start(circlePos: number[]): void;

    /**
     * Stop the shrinking circle and hide it.
     */
    stop(): void;

    /**
     * Sets the zoom factor for the lens.
     *
     * This is `2` by default.
     *
     * @param {number} durationMs
     */
    set durationMs(durationMs: number);

    /**
     * Gets the zoom factor for the lens.
     *
     * This is `2` by default.
     *
     * @returns {number} Number
     */
    get durationMs(): number;

    /**
     * Destroys this PointerCircle.
     */
    destroy(): void;
}