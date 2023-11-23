
import {Component} from "../../viewer/scene/Component.js";
import {MarqueePicker} from "./MarqueePicker";

/**
 * Controls a {@link MarqueePicker} with mouse input.
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

        let canvasDragStartX;
        let canvasDragStartY;
        let canvasDragEndX;
        let canvasDragEndY;

        let canvasMarqueeStartX;
        let canvasMarqueeStartY;
        let canvasMarqueeEndX;
        let canvasMarqueeEndY;

        let isMouseDragging = false;
        let mouseWasUpOffCanvas = false;

        canvas.addEventListener("mousedown", (e) => {
            if (!this.getActive()) {
                return;
            }
            if (e.button !== 0) { // Left button only
                return;
            }
            const input = marqueePicker.viewer.scene.input;
            if (!input.keyDown[input.KEY_CTRL]) { // Clear selection unless CTRL down
                this.fire("clear", true);
            }
            canvasDragStartX = e.pageX;
            canvasDragStartY = e.pageY;
            canvasMarqueeStartX = e.offsetX;
            canvasMarqueeStartY = e.offsetY;
            marqueePicker.setMarqueeCorner1([canvasMarqueeStartX, canvasMarqueeStartY]);
            isMouseDragging = true;
            marqueePicker.viewer.cameraControl.pointerEnabled = false; // Disable camera rotation
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
            canvasDragEndX = e.pageX;
            canvasDragEndY = e.pageY;
            const width = Math.abs(canvasDragEndX - canvasDragStartX);
            const height = Math.abs(canvasDragEndY - canvasDragStartY);
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
            if (!isMouseDragging) {
                return
            }
            marqueePicker.setMarqueeVisible(false);
            isMouseDragging = false;
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
            if (!isMouseDragging) {
                return
            }
            canvasMarqueeEndX = e.offsetX;
            canvasMarqueeEndY = e.offsetY;
            marqueePicker.setMarqueeVisible(true);
            marqueePicker.setMarqueeCorner2([canvasMarqueeEndX, canvasMarqueeEndY]);
            marqueePicker.setPickMode((canvasMarqueeStartX < canvasMarqueeEndX) ? MarqueePicker.PICK_MODE_INSIDE : MarqueePicker.PICK_MODE_INTERSECTS);
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
