import {Component} from "../../viewer/scene/Component.js";
import {MarqueePicker} from "./MarqueePicker.js";

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
    constructor(cfg) {

        super(cfg.marqueePicker, cfg);

        const marqueePicker = cfg.marqueePicker;
        const scene = marqueePicker.viewer.scene;
        const canvas = scene.canvas.canvas;

        let pageStartX;
        let pageStartY;
        let pageEndX;
        let pageEndY;

        let canvasStartX;
        let canvasStartY;
        let canvasEndX;
        let canvasEndY;

        let isMouseDragging = false;
        let isMouseDown = false;
        let mouseWasUpOffCanvas = false;
        let mouseDownTimer;

        canvas.addEventListener("mousedown", (e) => {
            if (!this.getActive()) {
                return;
            }
            if (e.button !== 0) { // Left button only
                return;
            }
            mouseDownTimer = setTimeout(function () {
                const input = marqueePicker.viewer.scene.input;
                if (!input.keyDown[input.KEY_CTRL]) { // Clear selection unless CTRL down
                    marqueePicker.clear();
                }
                pageStartX = e.pageX;
                pageStartY = e.pageY;
                canvasStartX = e.offsetX;
                canvasStartY = e.offsetY;
                marqueePicker.setMarqueeCorner1([pageStartX, pageStartY]);
                isMouseDragging = true;
                marqueePicker.viewer.cameraControl.pointerEnabled = false; // Disable camera rotation
                marqueePicker.setMarqueeVisible(true);
                canvas.style.cursor = "crosshair";
            }, 400);

            isMouseDown = true;
        });

        canvas.addEventListener("mouseup", (e) => {
            if (!this.getActive()) {
                return;
            }
            if (!isMouseDragging && !mouseWasUpOffCanvas) {
                return
            }
            if (e.button !== 0) {
                return;
            }
            clearTimeout(mouseDownTimer);
            pageEndX = e.pageX;
            pageEndY = e.pageY;
            const width = Math.abs(pageEndX - pageStartX);
            const height = Math.abs(pageEndY - pageStartY);
            isMouseDragging = false;
            marqueePicker.viewer.cameraControl.pointerEnabled = true; // Enable camera rotation
            if (mouseWasUpOffCanvas) {
                mouseWasUpOffCanvas = false;
            }
            if (width > 3 || height > 3) { // Marquee pick if rectangle big enough
                marqueePicker.pick();
            }
        }); // Bubbling

        document.addEventListener("mouseup", (e) => {
            if (!this.getActive()) {
                return;
            }
            if (e.button !== 0) { // check if left button was clicked
                return;
            }
            clearTimeout(mouseDownTimer);
            if (!isMouseDragging) {
                return
            }
            marqueePicker.setMarqueeVisible(false);
            isMouseDragging = false;
            isMouseDown = false;
            mouseWasUpOffCanvas = true;
            marqueePicker.viewer.cameraControl.pointerEnabled = true;
        }, true); // Capturing

        canvas.addEventListener("mousemove", (e) => {
            if (!this.getActive()) {
                return;
            }
            if (e.button !== 0) { // check if left button was clicked
                return;
            }

            if (!isMouseDown) {
                return;
            }

            clearTimeout(mouseDownTimer);

            if (!isMouseDragging) {
                return
            }

            pageEndX = e.pageX;
            pageEndY = e.pageY;
            canvasEndX = e.offsetX;
            canvasEndY = e.offsetY;

            marqueePicker.setMarqueeVisible(true);
            marqueePicker.setMarqueeCorner2([pageEndX, pageEndY]);
            marqueePicker.setPickMode((canvasStartX < canvasEndX) ? MarqueePicker.PICK_MODE_INSIDE : MarqueePicker.PICK_MODE_INTERSECTS);

        });
    }

    /**
     * Activates or deactivates this MarqueePickerMouseControl.
     *
     * @param {boolean} active Whether or not to activate.
     */
    setActive(active) {
        if (this._active === active) {
            return;
        }
        this._active = active;
        this.fire("active", this._active);
    }

    /**
     * Gets if this MarqueePickerMouseControl is active.
     *
     * @returns {boolean}
     */
    getActive() {
        return this._active;
    }

    /**
     *
     */
    destroy() {

    }
}
