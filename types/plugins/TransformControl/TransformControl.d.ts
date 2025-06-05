import { Viewer } from "../../viewer";

export declare type TransformControlHandlers = {
    /** Optional callback for translation change. */
    onPosition?: (position: number[]) => void;

    /** Optional callback for rotation change. */
    onQuaternion?: (quaternion: number[]) => void;

    /** Optional callback for screen scale change. */
    onScreenScale?: (scale: number[]) => void;
};

/**
 * TransformControl is a {@link Viewer} tool for interactive transformation manipulation.
 */
export declare class TransformControl {
    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     */
    constructor(viewer: Viewer);

    /**
     * Destroys this TransformControl.
     */
    destroy(): void;

    /**
     * Sets handlers for user interactions.
     * If not provided then TransformControl is not visible.
     *
     * @param {TransformControlHandlers} transformation handlers.
     */
    setHandlers(handlers?: TransformControlHandlers): void;

    /**
     * Sets the TransformControl's position.
     *
     * @param {number[]} position to set
     */
    setPosition(position: number[]): boolean;

    /**
     * Sets the TransformControl's quaternion.
     *
     * @param {number[]} quaternion to set
     */
    setQuaternion(quaternion: number[]): boolean;
}
