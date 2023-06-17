const DEFAULT_SNAP_PICK_RADIUS = 45;

/**
 * @private
 */
class MouseSnapHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;

        const cameraControl = controllers.cameraControl;
        let leftDown = false;
        let rightDown = false;

        const canvas = this._scene.canvas.canvas;

        canvas.addEventListener("mousemove", this._canvasMouseMoveHandler = (e) => {
            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }
            if (leftDown || rightDown) {
                return;
            }
            const snapToVertexSubs = cameraControl.hasSubs("snapToVertex");
            if (snapToVertexSubs) {
                const snapToVertexPickResult = this._scene.snapPick({
                    canvasPos: states.pointerCanvasPos,
                    snapRadius: DEFAULT_SNAP_PICK_RADIUS,
                    snapType: "vertex",
                });
                if (snapToVertexPickResult && snapToVertexPickResult.snappedCanvasPos && snapToVertexPickResult.snappedWorldPos) {
                    cameraControl.fire("snapToVertex", snapToVertexPickResult, true);
                }
            }
        });

        document.addEventListener('mouseup', this._documentMouseUpHandler = (e) => {
            if (e.which === 1) {
                leftDown = false;
            }
            if (e.which === 3) {
                rightDown = false;
            }
        });

        canvas.addEventListener('mouseup', this._canvasMouseUpHandler = (e) => {
            if (e.which === 1) {
                leftDown = false;
            }
            if (e.which === 3) {
                rightDown = false;
            }
        });

        document.addEventListener('mousedown', this._documentMouseDownHandler = (e) => {
            if (e.which === 1) {
                leftDown = true;
            }
            if (e.which === 3) {
                rightDown = true;
            }
        });

        canvas.addEventListener('mousedown', this._canvasMouseDownHandler = (e) => {
            if (e.which === 1) {
                leftDown = true;
            }
            if (e.which === 3) {
                rightDown = true;
            }
        });
    }

    reset() {
    }

    destroy() {
        const canvas = this._scene.canvas.canvas;
        canvas.removeEventListener("mousemove", this._canvasMouseMoveHandler);
        canvas.removeEventListener("mousedown", this._canvasMouseDownHandler);
        document.removeEventListener("mouseup", this._documentMouseUpHandler);
        canvas.removeEventListener("mouseup", this._canvasMouseUpHandler);
    }
}


export {MouseSnapHandler};