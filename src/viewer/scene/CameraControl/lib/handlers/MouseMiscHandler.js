/**
 * @private
 */
class MouseMiscHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;

        const canvas = this._scene.canvas.canvas;

        canvas.addEventListener("mouseenter", this._mouseEnterHandler = () => {
            states.mouseover = true;
        });

        canvas.addEventListener("mouseleave", this._mouseLeaveHandler = () => {
            states.mouseover = false;
            canvas.style.cursor = null;
        });

        document.addEventListener("mousemove", this._mouseMoveHandler = (e) => {
            getCanvasPosFromEvent(e, canvas, states.pointerCanvasPos);
            states.mouseover = true; // Added to fix XCD-386: The zoom speed slows down when zooming into an empty space for the first time on a relatively large model, and it cannot be reset without reloading
        });

        canvas.addEventListener("mousedown", this._mouseDownHandler = (e) => {
            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }
            getCanvasPosFromEvent(e, canvas, states.pointerCanvasPos);
            states.mouseover = true;
        });

        canvas.addEventListener("mouseup", this._mouseUpHandler = (e) => {
            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }
        });
    }

    reset() {
    }

    destroy() {

        const canvas = this._scene.canvas.canvas;

        document.removeEventListener("mousemove", this._mouseMoveHandler);
        canvas.removeEventListener("mouseenter", this._mouseEnterHandler);
        canvas.removeEventListener("mouseleave", this._mouseLeaveHandler);
        canvas.removeEventListener("mousedown", this._mouseDownHandler);
        canvas.removeEventListener("mouseup", this._mouseUpHandler);
    }
}

function getCanvasPosFromEvent(event, canvas, canvasPos) {
    if (!event) {
        event = window.event;
        canvasPos[0] = event.x;
        canvasPos[1] = event.y;
    } else {
        const { left, top } = canvas.getBoundingClientRect();
        canvasPos[0] = event.clientX - left;
        canvasPos[1] = event.clientY - top;
    }
    return canvasPos;
}

export {MouseMiscHandler};
