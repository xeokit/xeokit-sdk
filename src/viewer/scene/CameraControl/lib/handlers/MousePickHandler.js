import {math} from "../../../math/math.js";

/**
 * @private
 */
class MousePickHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;

        const pickController = controllers.pickController;
        const pivotController = controllers.pivotController;
        const cameraControl = controllers.cameraControl;

        let clicks = 0;
        let timeout;
        const canvas = this._scene.canvas.canvas;

        const flyCameraTo = (pickResult) => {
            let pos;
            if (pickResult && pickResult.worldPos) {
                pos = pickResult.worldPos
            }
            const aabb = pickResult ? pickResult.entity.aabb : scene.aabb;
            if (pos) { // Fly to look at point, don't change eye->look dist
                const camera = scene.camera;
                const diff = math.subVec3(camera.eye, camera.look, []);
                controllers.cameraFlight.flyTo({
                    // look: pos,
                    // eye: xeokit.math.addVec3(pos, diff, []),
                    // up: camera.up,
                    aabb: aabb
                });
                // TODO: Option to back off to fit AABB in view
            } else {// Fly to fit target boundary in view
                controllers.cameraFlight.flyTo({
                    aabb: aabb
                });
            }
        };

        canvas.addEventListener("mousemove", this._canvasMouseMoveHandler = (e) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            if (cameraControl.hasSubs("hover") ||
                cameraControl.hasSubs("hoverOut") ||
                cameraControl.hasSubs("hoverOff") ||
                cameraControl.hasSubs("hoverSurface")) {

                pickController.pickCursorPos = states.mouseCanvasPos;
                pickController.schedulePickEntity = true;
            }
        });

        canvas.addEventListener('mousedown', this._canvasMouseDownHandler = (e) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            states.mouseDownClientX = e.clientX;
            states.mouseDownClientY = e.clientY;
            states.mouseDownCursorX = states.mouseCanvasPos[0];
            states.mouseDownCursorY = states.mouseCanvasPos[1];

            if (configs.pivoting) {

                pickController.pickCursorPos = states.mouseCanvasPos;
                pickController.schedulePickSurface = true;

                pickController.update();

                if (e.which === 1) {// Left button
                    if (pickController.pickResult) {
                        pivotController.startPivot(pickController.pickResult.worldPos);
                    } else {
                        pivotController.startPivot(); // Continue to use last pivot point
                    }
                }
            }
        });

        canvas.addEventListener('mouseup', this._canvasMouseUpHandler = (e) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            pivotController.hidePivot();

            if (Math.abs(e.clientX - states.mouseDownClientX) > 3 || Math.abs(e.clientY - states.mouseDownClientY) > 3) {
                return;
            }

            if ((!configs.doublePickFlyTo) &&
                (!cameraControl.hasSubs("doublePicked")) &&
                (!cameraControl.hasSubs("doublePickedSurface")) &&
                (!cameraControl.hasSubs("doublePickedNothing"))) {  //  Avoid the single/double click differentiation timeout

                pickController.pickCursorPos = states.mouseCanvasPos;
                pickController.schedulePickSurface = (!!cameraControl.hasSubs("pickedSurface"));
                pickController.update();

                if (pickController.pickResult) {
                    cameraControl.fire("picked", pickController.pickResult, true);
                    if (pickController.pickedSurface) {
                        cameraControl.fire("pickedSurface", pickController.pickResult, true);
                    }
                } else {
                    cameraControl.fire("pickedNothing", {}, true);
                }
                return;
            }

            clicks++;

            if (clicks === 1) { // First click

                timeout = setTimeout(function () {

                    pickController.pickCursorPos = states.mouseCanvasPos;
                    pickController.schedulePickEntity = configs.doublePickFlyTo;
                    pickController.schedulePickSurface = (!!cameraControl.hasSubs("pickedSurface"));
                    pickController.update();

                    if (pickController.pickResult) {
                        cameraControl.fire("picked", pickController.pickResult, true);
                        if (pickController.pickedSurface) {
                            cameraControl.fire("pickedSurface", pickController.pickResult, true);
                        }
                    } else {
                        cameraControl.fire("pickedNothing", {}, true);
                    }
                    clicks = 0;
                }, 250);  // FIXME: Too short for track pads

            } else { // Second click

                clearTimeout(timeout);

                pickController.pickCursorPos = states.mouseCanvasPos;
                pickController.schedulePickEntity = configs.doublePickFlyTo;
                pickController.schedulePickSurface = pickController.schedulePickEntity && !!cameraControl.hasSubs("doublePickedSurface");
                pickController.update();

                if (pickController.pickResult) {
                    cameraControl.fire("doublePicked", pickController.pickResult, true);
                    if (pickController.pickedSurface) {
                        cameraControl.fire("doublePickedSurface", pickController.pickResult, true);
                    }
                    if (configs.doublePickFlyTo) {
                        flyCameraTo(pickController.pickResult);
                    }
                } else {
                    cameraControl.fire("doublePickedNothing", true);
                    if (configs.doublePickFlyTo) {
                        flyCameraTo();
                    }
                }
                clicks = 0;
            }
        }, false);
    }

    reset() {
    }

    destroy() {
        const canvas = this._scene.canvas.canvas;
        canvas.addEventListener("mousemove", this._canvasMouseMoveHandler);
        canvas.addEventListener("mousedown", this._canvasMouseDownHandler);
        canvas.addEventListener("mouseup", this._canvasMouseUpHandler);
    }
}

export {MousePickHandler};