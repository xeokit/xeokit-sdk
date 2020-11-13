import {math} from "../../../math/math.js";

/**
 * @private
 */
class TouchPanRotateAndDollyHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;

        const pickController = controllers.pickController;
        const pivotController = controllers.pivotController;

        const tapStartPos = math.vec2();
        let tapStartTime = -1;

        const lastTouches = [];
        let numTouches = 0;

        const touch0Vec = math.vec2();
        const touch1Vec = math.vec2();

        const canvas = this._scene.canvas.canvas;

        let waitForTick = false;

        this._onTick = scene.on("tick", () => {
            waitForTick = false;
        });


        canvas.addEventListener("touchstart", this._canvasTouchStartHandler = (event) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            const touches = event.touches;
            const changedTouches = event.changedTouches;

            states.touchStartTime = Date.now();

            if (touches.length === 1 && changedTouches.length === 1) {
                tapStartTime = states.touchStartTime;
                tapStartPos[0] = touches[0].pageX;
                tapStartPos[1] = touches[0].pageY;

                if (configs.followPointer) {

                    pickController.pickCursorPos = tapStartPos;
                    pickController.schedulePickSurface = true;
                    pickController.update();

                    if (!configs.planView ) {

                        if (pickController.picked && pickController.pickedSurface && pickController.pickResult && pickController.pickResult.worldPos) {

                            pivotController.setPivotPos(pickController.pickResult.worldPos);

                            if (!configs.firstPerson && pivotController.startPivot()) {
                                pivotController.showPivot();
                            }

                        } else {
                            if (!configs.firstPerson && pivotController.startPivot()) { // Continue to use last pivot point
                                pivotController.showPivot();
                            }
                        }
                    }
                }

            } else {
                tapStartTime = -1;
            }

            if (touches.length === 2) {
                const touch0 = touches[0];
                const touch1 = touches[1];
                const currentMiddleTouch = math.geometricMeanVec2([touch0.pageX, touch0.pageY], [touch1.pageX, touch1.pageY]);

                pickController.pickCursorPos = currentMiddleTouch;
                pickController.schedulePickSurface = true;
                pickController.update();
            }

            while (lastTouches.length < touches.length) {
                lastTouches.push(math.vec2());
            }

            for (let i = 0, len = touches.length; i < len; ++i) {
                lastTouches[i][0] = touches[i].pageX;
                lastTouches[i][1] = touches[i].pageY;
            }

            numTouches = touches.length;

            event.stopPropagation();

        }, {passive: true});

        canvas.addEventListener("touchmove", this._canvasTouchMoveHandler = (event) => {
            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }
            if (waitForTick) {
                // Limit changes detection to one per frame
                return;
            }
            waitForTick = true;
            // Scaling drag-rotate to canvas boundary

            const canvasBoundary = scene.canvas.boundary;
            const canvasWidth = canvasBoundary[2] - canvasBoundary[0];
            const canvasHeight = canvasBoundary[3] - canvasBoundary[1];

            const touches = event.touches;

            if (event.touches.length !== numTouches) {
                // Two fingers were pressed, then one of them is removed
                // We don't want to rotate in this case (weird behavior)
                return;
            }

            if (numTouches === 1) {
                const touch0 = touches[0];

                //-----------------------------------------------------------------------------------------------
                // Drag rotation
                //-----------------------------------------------------------------------------------------------

                if (configs.planView) { // No rotating in plan-view mode

                    math.subVec2([touch0.pageX, touch0.pageY], lastTouches[0], touch0Vec);

                    const xPanDelta = touch0Vec[0];
                    const yPanDelta = touch0Vec[1];

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
                    updates.rotateDeltaY -= ((touch0.pageX - lastTouches[0][0]) / canvasWidth) * configs.dragRotationRate / 2; // Full horizontal rotation
                    updates.rotateDeltaX += ((touch0.pageY - lastTouches[0][1]) / canvasHeight) * (configs.dragRotationRate / 4); // Half vertical rotation
                }

            } else if (numTouches === 2) {

                const touch0 = touches[0];
                const touch1 = touches[1];

                const lastMiddleTouch = math.geometricMeanVec2(lastTouches[0], lastTouches[1]);
                const currentMiddleTouch = math.geometricMeanVec2([touch0.pageX, touch0.pageY], [touch1.pageX, touch1.pageY]);

                const touchDelta = math.vec2();

                math.subVec2(lastMiddleTouch, currentMiddleTouch, touchDelta);


                // PANNING
                const xPanDelta = touchDelta[0];
                const yPanDelta = touchDelta[1];

                const camera = scene.camera;

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

                // Dollying

                const d1 = math.distVec2([touch0.pageX, touch0.pageY], [touch1.pageX, touch1.pageY]);
                const d2 = math.distVec2(lastTouches[0], lastTouches[1]);

                updates.dollyDelta = (d2 - d1) * configs.touchDollyRate;

                states.pointerCanvasPos = currentMiddleTouch;
            }

            for (let i = 0; i < numTouches; ++i) {
                lastTouches[i][0] = touches[i].pageX;
                lastTouches[i][1] = touches[i].pageY;
            }
            event.stopPropagation();

        }, {passive: true});
    }

    reset() {
    }

    destroy() {
        const canvas = this._scene.canvas.canvas;
        canvas.removeEventListener("touchstart", this._canvasTouchStartHandler);
        canvas.removeEventListener("touchmove", this._canvasTouchMoveHandler);
        this._scene.off(this._onTick);
    }
}

export {TouchPanRotateAndDollyHandler};
