import {Component} from "../../viewer";
import {MarqueePicker} from "./MarqueePicker";

/**
 * Controls a {@link MarqueePicker} with mouse input.
 *
 * See {@link MarqueePicker} for usage example.
 *
 * When the MarqueePickerMouseControl is active:
 *
 * * Long-click, drag and release on the canvas to define a marque box that picks {@link Entity}s.
 * * Drag left-to-right to pick Entities that intersect the box.
 * * Drag right-to-left to pick Entities that are fully inside the box.
 * * On release, the MarqueePicker will fire a "picked" event with IDs of the picked Entities , if any.
 */


export class MarqueePickerMouseControl extends Component {

    /**
     * Creates a new MarqueePickerMouseControl.
     *
     * @param {*} cfg Configuration
     * @param {MarqueePicker} cfg.marqueePicker The MarqueePicker to control.
     */
    constructor(cfg: {
        marqueePicker: MarqueePicker;
    });

    /**
     * Activates or deactivates this MarqueePickerMouseControl.
     *
     * @param {boolean} active Whether or not to activate.
     */
    setActive(active: boolean): void;

    /**
     * Gets if this MarqueePickerMouseControl is active.
     *
     * @returns {boolean}
     */
    getActive(): boolean;

    /**
     *
     */
    destroy(): void;
}
