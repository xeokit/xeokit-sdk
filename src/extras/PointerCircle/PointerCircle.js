const SHRINK_SPEED = 3;

/**
 * A PointerCircle shows a circle, centered at the position of the
 * mouse or touch pointer.
 */
export class PointerCircle {

    /**
     * Constructs a new PointerCircle.
     * @param viewer The Viewer
     * @param [cfg] PointerCircle configuration.
     * @param [cfg.active=true] Whether PointerCircle is active. The PointerCircle can only be shown when this is `true` (default).
     */
    constructor(viewer, cfg = {}) {

        this.viewer = viewer;
        this.scene = this.viewer.scene;
        this._circleDiv = document.createElement('div');
        this.viewer.scene.canvas.canvas.parentNode.insertBefore(this._circleDiv, this.viewer.scene.canvas.canvas);
        this._circleDiv.style.backgroundColor = "transparent";
        this._circleDiv.style.border = "2px solid green";
        this._circleDiv.style.borderRadius = "50px";
        this._circleDiv.style.width = "50px";
        this._circleDiv.style.height = "50px";
        this._circleDiv.style.margin = "-200px -200px";
        this._circleDiv.style.zIndex = "100000";
        this._circleDiv.style.position = "absolute";
        this._circleDiv.style.pointerEvents = "none";

        this._circlePos = null;

        this._circleMaxRadius = 200;
        this._circleMinRadius = 2;

        this._active = (cfg.active !== false);
        this._visible = false;

        this._running = false;
        this._destroyed = false;
    }

    /**
     * Show the circle at the given canvas coordinates and begin shrinking it.
     */
    start(circlePos) {
        if (this._destroyed) {
            return;
        }
        this._circlePos = circlePos;
        this._running = false;
        this._circleRadius = this._circleMaxRadius;
        this._circleDiv.style.borderRadius = `${this._circleRadius}px`;
        this._circleDiv.style.marginLeft = `${this._circlePos[0] - this._circleRadius}px`;
        this._circleDiv.style.marginTop = `${this._circlePos[1] - this._circleRadius}px`;

        const startValue = this._circleMaxRadius;
        const endValue = 2;
        let startTime;
        const duration = 300;

        const animateCircle = (currentTime) => {
            if (!this._running) {
                return;
            }
            if (!startTime) {
                startTime = currentTime;
            }

            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const interpolatedValue = startValue + (endValue - startValue) * progress;

            this._circleRadius = interpolatedValue;
            this._circleDiv.style.width = `${this._circleRadius}px`;
            this._circleDiv.style.height = `${this._circleRadius}px`;
            this._circleDiv.style.marginLeft = `${this._circlePos[0] - this._circleRadius / 2}px`;
            this._circleDiv.style.marginTop = `${this._circlePos[1] - this._circleRadius / 2}px`;

            if (progress < 1) {
                requestAnimationFrame(animateCircle);
            }
        }
        this._running = true;
        requestAnimationFrame(animateCircle);
        this._circleDiv.style.visibility = "visible";
    }

    /**
     * Stop the shrinking circle and hide it.
     */
    stop() {
        if (this._destroyed) {
            return;
        }
        this._running = false;
        this._circleRadius = this._circleMaxRadius;
        this._circleDiv.style.borderRadius = `${this._circleRadius}px`;
        this._circleDiv.style.visibility = "hidden";
    }

    /**
     * Sets the zoom factor for the lens.
     *
     * This is `2` by default.
     *
     * @param durationMs
     */
    set durationMs(durationMs) {
        this.stop();
        this._durationMs = durationMs;
    }

    /**
     * Gets the zoom factor for the lens.
     *
     * This is `2` by default.
     *
     * @returns Number
     */
    get durationMs() {
        return this._durationMs;
    }

    /**
     * Destroys this PointerCircle.
     */
    destroy() {
        if (!this._destroyed) {
            this.stop();
            this._circleDiv.parentElement.removeChild(this._circleDiv);
            this._destroyed = true;
        }
    }
}