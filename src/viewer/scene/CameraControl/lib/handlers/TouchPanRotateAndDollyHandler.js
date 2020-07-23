import {math} from "../../../math/math.js";

/**
 * @private
 */
class TouchPanRotateAndDollyHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;

        const pickController = controllers.pickController;
        const pivotController = controllers.pivotController;

        const tapStartPos = new Float32Array(2);
        let tapStartTime = -1;

        const lastTouches = [];
        let numTouches = 0;

        const touch0Vec = new Float32Array(2);
        const touch1Vec = new Float32Array(2);

        const canvas = this._scene.canvas.canvas;

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

                    if (pickController.picked && pickController.pickedSurface && pickController.pickResult) {

                        pivotController.startPivot(pickController.pickResult.worldPos);
                        pivotController.showPivot();

                    } else {
                        pivotController.startPivot(); // Continue to use last pivot point
                        pivotController.showPivot();
                    }
                }

            } else {
                tapStartTime = -1;
            }

            while (lastTouches.length < touches.length) {
                lastTouches.push(new Float32Array(2));
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

                updates.rotateDeltaY -= ((touch0.pageX - lastTouches[0][0]) / canvasWidth) * configs.dragRotationRate / 2; // Full horizontal rotation
                updates.rotateDeltaX += ((touch0.pageY - lastTouches[0][1]) / canvasHeight) * (configs.dragRotationRate / 4); // Half vertical rotation

            } else if (numTouches === 2) {
                const touch0 = touches[0];
                const touch1 = touches[1];

                math.subVec2([touch0.pageX, touch0.pageY], lastTouches[0], touch0Vec);
                math.subVec2([touch1.pageX, touch1.pageY], lastTouches[1], touch1Vec);

                const panning = math.dotVec2(touch0Vec, touch1Vec) > 0;

                if (panning) {
                    math.subVec2([touch0.pageX, touch0.pageY], lastTouches[0], touch0Vec);

                    const xPanDelta = touch0Vec[0];
                    const yPanDelta = touch0Vec[1];

                    const camera = scene.camera;

                    // We use only canvasHeight here so that aspect ratio does not distort speed

                    if (camera.projection === "perspective") {

                        //----------------------------
                        // TODO: Pick on first touch
                        //----------------------------

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
                }

                else {
                    const d1 = math.distVec2([touch0.pageX, touch0.pageY], [touch1.pageX, touch1.pageY]);
                    const d2 = math.distVec2(lastTouches[0], lastTouches[1]);
                    updates.dollyDelta = (d2 - d1) * configs.touchDollyRate;
                }
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
    }
}

export {TouchPanRotateAndDollyHandler};
