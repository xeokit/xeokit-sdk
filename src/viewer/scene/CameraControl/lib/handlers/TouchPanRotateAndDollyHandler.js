import {math} from "../../../math/math.js";

const getCanvasPosFromEvent = function(event, canvas, canvasPos) {
    if (!event) {
        event = window.event;
        canvasPos[0] = event.x;
        canvasPos[1] = event.y;
    } else {
        const canvasRect = canvas.getBoundingClientRect();
        canvasPos[0] = event.clientX - canvasRect.left;
        canvasPos[1] = event.clientY - canvasRect.top;
    }
    return canvasPos;
};

/**
 * @private
 */
class TouchPanRotateAndDollyHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;

        const pickController = controllers.pickController;
        const pivotController = controllers.pivotController;

        const tapStartCanvasPos = math.vec2();
        const tapCanvasPos0 = math.vec2();
        const tapCanvasPos1 = math.vec2();
        const touch0Vec = math.vec2();

        const lastCanvasTouchPosList = [];
        const canvas = this._scene.canvas.canvas;

        let numTouches = 0;
        let tapStartTime = -1;
        let waitForTick = false;

        this._onTick = scene.on("tick", () => {
            waitForTick = false;
        });

        let firstDragDeltaX = 0;
        let firstDragDeltaY = 1;
        let absorbTinyFirstDrag = false;

        canvas.addEventListener("touchstart", this._canvasTouchStartHandler = (event) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            event.preventDefault();

            const touches = event.touches;
            const changedTouches = event.changedTouches;

            states.touchStartTime = Date.now();

            if (touches.length === 1 && changedTouches.length === 1) {

                tapStartTime = states.touchStartTime;

                getCanvasPosFromEvent(touches[0], canvas, tapStartCanvasPos);

                if (configs.followPointer) {

                    pickController.pickCursorPos = tapStartCanvasPos;
                    pickController.schedulePickSurface = true;
                    pickController.update();

                    if (!configs.planView) {

                        if (pickController.picked && pickController.pickedSurface && pickController.pickResult && pickController.pickResult.worldPos) {

                            pivotController.setPivotPos(pickController.pickResult.worldPos);

                            if (!configs.firstPerson && pivotController.startPivot()) {
                                pivotController.showPivot();
                            }

                        } else {

                            if (configs.smartPivot) {
                                pivotController.setCanvasPivotPos(states.pointerCanvasPos);
                            } else {
                                pivotController.setPivotPos(scene.camera.look);
                            }

                            if (!configs.firstPerson && pivotController.startPivot()) {
                                pivotController.showPivot();
                            }
                        }
                    }
                }

            } else {
                tapStartTime = -1;
            }

            while (lastCanvasTouchPosList.length < touches.length) {
                lastCanvasTouchPosList.push(math.vec2());
            }

            for (let i = 0, len = touches.length; i < len; ++i) {
                getCanvasPosFromEvent(touches[i], canvas, lastCanvasTouchPosList[i]);
            }

            numTouches = touches.length;
        });

        canvas.addEventListener("touchend", this._canvasTouchEndHandler = () => {
            if (pivotController.getPivoting()) {
                pivotController.endPivot();
                pivotController.hidePivot();
            }
            firstDragDeltaX = 0;
            firstDragDeltaY = 0;
            absorbTinyFirstDrag = true;
        })

        canvas.addEventListener("touchmove", this._canvasTouchMoveHandler = (event) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            event.stopPropagation();
            event.preventDefault();

            if (waitForTick) {
                // Limit changes detection to one per frame
                return;
            }

            waitForTick = true;

            // Scaling drag-rotate to canvas boundary

            const canvasBoundary = scene.canvas.boundary;
            const canvasWidth = canvasBoundary[2];
            const canvasHeight = canvasBoundary[3];

            const touches = event.touches;

            if (event.touches.length !== numTouches) {
                // Two fingers were pressed, then one of them is removed
                // We don't want to rotate in this case (weird behavior)
                return;
            }

            if (numTouches === 1) {

                getCanvasPosFromEvent(touches[0], canvas, tapCanvasPos0);

                //-----------------------------------------------------------------------------------------------
                // Drag rotation
                //-----------------------------------------------------------------------------------------------

                math.subVec2(tapCanvasPos0, lastCanvasTouchPosList[0], touch0Vec);

                const xPanDelta = touch0Vec[0];
                const yPanDelta = touch0Vec[1];

                if (states.longTouchTimeout !== null && (Math.abs(xPanDelta) > configs.longTapRadius || Math.abs(yPanDelta) > configs.longTapRadius)) {
                    clearTimeout(states.longTouchTimeout);
                    states.longTouchTimeout = null;
                }

                if (configs.planView) { // No rotating in plan-view mode

                    const camera = scene.camera;

                    // We use only canvasHeight here so that aspect ratio does not distort speed

                    if (camera.projection === "perspective") {

                        const touchPicked = false;
                        const pickedWorldPos = [0, 0, 0];

                        const depth = Math.abs(touchPicked ? math.lenVec3(math.subVec3(pickedWorldPos, scene.camera.eye, [])) : scene.camera.eyeLookDist);
                        const targetDistance = depth * Math.tan((camera.perspective.fov / 2) * Math.PI / 180.0);

                        updates.panDeltaX += (xPanDelta * targetDistance / canvasHeight) * configs.touchPanRate;
                        updates.panDeltaY += (yPanDelta * targetDistance / canvasHeight) * configs.touchPanRate;

                    } else {

                        updates.panDeltaX += 0.5 * camera.ortho.scale * (xPanDelta / canvasHeight) * configs.touchPanRate;
                        updates.panDeltaY += 0.5 * camera.ortho.scale * (yPanDelta / canvasHeight) * configs.touchPanRate;
                    }

                } else {
                  //  if (!absorbTinyFirstDrag) {
                        updates.rotateDeltaY -= (xPanDelta / canvasWidth) * (configs.dragRotationRate * 1.0); // Full horizontal rotation
                        updates.rotateDeltaX += (yPanDelta / canvasHeight) * (configs.dragRotationRate * 1.5); // Half vertical rotation
                    // } else {
                    //     firstDragDeltaY -= (xPanDelta / canvasWidth) * (configs.dragRotationRate * 1.0); // Full horizontal rotation
                    //     firstDragDeltaX += (yPanDelta / canvasHeight) * (configs.dragRotationRate * 1.5); // Half vertical rotation
                    //     if (Math.abs(firstDragDeltaX) > 5 || Math.abs(firstDragDeltaY) > 5) {
                    //         updates.rotateDeltaX += firstDragDeltaX;
                    //         updates.rotateDeltaY += firstDragDeltaY;
                    //         firstDragDeltaX = 0;
                    //         firstDragDeltaY = 0;
                    //         absorbTinyFirstDrag = false;
                    //     }
                    // }
                }

            } else if (numTouches === 2) {

                const touch0 = touches[0];
                const touch1 = touches[1];

                getCanvasPosFromEvent(touch0, canvas, tapCanvasPos0);
                getCanvasPosFromEvent(touch1, canvas, tapCanvasPos1);

                const lastMiddleTouch = math.geometricMeanVec2(lastCanvasTouchPosList[0], lastCanvasTouchPosList[1]);
                const currentMiddleTouch = math.geometricMeanVec2(tapCanvasPos0, tapCanvasPos1);

                const touchDelta = math.vec2();

                math.subVec2(lastMiddleTouch, currentMiddleTouch, touchDelta);

                const xPanDelta = touchDelta[0];
                const yPanDelta = touchDelta[1];

                const camera = scene.camera;

                // Dollying

                const d1 = math.distVec2([touch0.pageX, touch0.pageY], [touch1.pageX, touch1.pageY]);
                const d2 = math.distVec2(lastCanvasTouchPosList[0], lastCanvasTouchPosList[1]);

                const dollyDelta = (d2 - d1) * configs.touchDollyRate;

                updates.dollyDelta = dollyDelta;
                states.followPointerDirty = true; // Added to fix XCD-386: The zoom speed slows down when zooming into an empty space for the first time on a relatively large model, and it cannot be reset without reloading

                if (Math.abs(dollyDelta) < 1.0) {

                    // We use only canvasHeight here so that aspect ratio does not distort speed

                    if (camera.projection === "perspective") {
                        const pickedWorldPos = pickController.pickResult ? pickController.pickResult.worldPos : scene.center;

                        const depth = Math.abs(math.lenVec3(math.subVec3(pickedWorldPos, scene.camera.eye, [])));
                        const targetDistance = depth * Math.tan((camera.perspective.fov / 2) * Math.PI / 180.0);

                        updates.panDeltaX -= (xPanDelta * targetDistance / canvasHeight) * configs.touchPanRate;
                        updates.panDeltaY -= (yPanDelta * targetDistance / canvasHeight) * configs.touchPanRate;

                    } else {

                        updates.panDeltaX -= 0.5 * camera.ortho.scale * (xPanDelta / canvasHeight) * configs.touchPanRate;
                        updates.panDeltaY -= 0.5 * camera.ortho.scale * (yPanDelta / canvasHeight) * configs.touchPanRate;
                    }
                }


                states.pointerCanvasPos = currentMiddleTouch;
            }

            for (let i = 0; i < numTouches; ++i) {
                getCanvasPosFromEvent(touches[i], canvas, lastCanvasTouchPosList[i]);
            }
        });
    }

    reset() {
    }

    destroy() {
        const canvas = this._scene.canvas.canvas;
        canvas.removeEventListener("touchstart", this._canvasTouchStartHandler);
        canvas.removeEventListener("touchend", this._canvasTouchEndHandler);
        canvas.removeEventListener("touchmove", this._canvasTouchMoveHandler);
        this._scene.off(this._onTick);
    }
}

export {TouchPanRotateAndDollyHandler};
