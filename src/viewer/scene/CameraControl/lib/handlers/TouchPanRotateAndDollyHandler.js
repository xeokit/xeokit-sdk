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

        const MODE_CHANGE_TIMEOUT = 50;
        const MODE_NONE = 0;
        const MODE_ROTATE = 1;
        const MODE_PAN = 1 << 1;
        const MODE_ZOOM = 1 << 2;

        let currentMode = MODE_NONE;
        let transitionTime = Date.now();

        const checkMode = (mode) => {
            const currentTime = Date.now();
            if (currentMode === MODE_NONE) {
                currentMode = mode;
                return true;
            }
            if (currentMode === mode) {
                return currentTime - transitionTime > MODE_CHANGE_TIMEOUT;
            }
            currentMode = mode;
            transitionTime = currentTime;
            return false;
        };

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

                if (configs.pivoting) {



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

            currentMode = MODE_NONE;
            numTouches = touches.length;

            event.stopPropagation();

        }, {passive: true});

        canvas.addEventListener("touchmove", this._canvasTouchMoveHandler = (event) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }
            const touches = event.touches;

            if (numTouches === 1) {

                const touch0 = touches[0];

                if (checkMode(MODE_ROTATE)) {
                    const deltaX = touch0.pageX - lastTouches[0][0];
                    const deltaY = touch0.pageY - lastTouches[0][1];
                    const rotateDeltaX = deltaX * configs.touchRotateRate;
                    const rotateDeltaY = deltaY * configs.touchRotateRate;
                    updates.rotateDeltaX += rotateDeltaY;
                    updates.rotateDeltaY += -rotateDeltaX;
                }

            } else if (numTouches === 2) {

                const touch0 = touches[0];
                const touch1 = touches[1];

                math.subVec2([touch0.pageX, touch0.pageY], lastTouches[0], touch0Vec);
                math.subVec2([touch1.pageX, touch1.pageY], lastTouches[1], touch1Vec);

                const panning = math.dotVec2(touch0Vec, touch1Vec) > 0;

                if (panning && checkMode(MODE_PAN)) {
                    math.subVec2([touch0.pageX, touch0.pageY], lastTouches[0], touch0Vec);
                    updates.panDeltaX += touch0Vec[0] * configs.touchPanRate;
                    updates.panDeltaY += touch0Vec[1] * configs.touchPanRate;
                }

                if (!panning && checkMode(MODE_ZOOM)) {
                    const d1 = math.distVec2([touch0.pageX, touch0.pageY], [touch1.pageX, touch1.pageY]);
                    const d2 = math.distVec2(lastTouches[0], lastTouches[1]);
                    updates.dollyDelta = (d2 - d1) * configs.touchZoomRate;
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