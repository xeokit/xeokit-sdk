import {math} from "../../../math/math.js";

/**
 * @private
 */
class TouchPickHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;

        const pickController = controllers.pickController;
        const pivotController = controllers.pivotController;
        const cameraControl = controllers.cameraControl;

        const canvas = scene.canvas.canvas;
        
        let touchStartTime;
        const activeTouches = [];
        const tapStartPos = new Float32Array(2);
        let tapStartTime = -1;
        let lastTapTime = -1;

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
        
        canvas.addEventListener("touchstart", this._canvasTouchStartHandler = (event) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            const touches = event.touches;
            const changedTouches = event.changedTouches;

            touchStartTime = Date.now();

            if (touches.length === 1 && changedTouches.length === 1) {
                tapStartTime = touchStartTime;
                tapStartPos[0] = touches[0].pageX;
                tapStartPos[1] = touches[0].pageY;
            } else {
                tapStartTime = -1;
            }

            while (activeTouches.length < touches.length) {
                activeTouches.push(new Float32Array(2))
            }

            for (let i = 0, len = touches.length; i < len; ++i) {
                activeTouches[i][0] = touches[i].pageX;
                activeTouches[i][1] = touches[i].pageY;
            }

            activeTouches.length = touches.length;

            event.stopPropagation();

        }, {passive: true});

        canvas.addEventListener("touchend", this._canvasTouchEndHandler = (event) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            const currentTime = Date.now();
            const touches = event.touches;
            const changedTouches = event.changedTouches;

            if (touches.length === 0 && changedTouches.length === 1) {

                if (tapStartTime > -1 && currentTime - tapStartTime < configs.tapInterval) {

                    if (lastTapTime > -1 && tapStartTime - lastTapTime < configs.doubleTapInterval) {

                        // Double-tap

                        pickController.pickCursorPos[0] = Math.round(changedTouches[0].clientX);
                        pickController.pickCursorPos[1] = Math.round(changedTouches[0].clientY);
                        pickController.schedulePickEntity = true;
                        pickController.schedulePickSurface = !!cameraControl.hasSubs("pickedSurface");

                        pickController.update();

                        if (pickController.pickResult) {

                            if (pickController.pickResult) {
                                pivotController.startPivot(pickController.pickResult.worldPos);
                            } else {
                                pivotController.startPivot(); // Continue to use last pivot point
                            }

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

                        lastTapTime = -1;

                    } else if (math.distVec2(activeTouches[0], tapStartPos) < configs.tapDistanceThreshold) {

                        // Single-tap

                        pickController.pickCursorPos[0] = Math.round(changedTouches[0].clientX);
                        pickController.pickCursorPos[1] = Math.round(changedTouches[0].clientY);
                        pickController.schedulePickEntity = true;
                        pickController.schedulePickSurface = !!cameraControl.hasSubs("pickedSurface");

                        pickController.update();

                        if (pickController.pickResult) {

                            if (pickController.pickResult) {
                                pivotController.startPivot(pickController.pickResult.worldPos);
                            } else {
                                pivotController.startPivot(); // Continue to use last pivot point
                            }
                            
                            cameraControl.fire("picked", pickController.pickResult, true);
                            if (pickController.pickedSurface) {
                                cameraControl.fire("pickedSurface", pickController.pickResult, true);
                            }
                        } else {
                            cameraControl.fire("pickedNothing", {}, true);
                        }

                        lastTapTime = currentTime;
                    }

                    tapStartTime = -1
                }
            }

            activeTouches.length = touches.length;

            for (let i = 0, len = touches.length; i < len; ++i) {
                activeTouches[i][0] = touches[i].pageX;
                activeTouches[i][1] = touches[i].pageY;
            }

            event.stopPropagation();

        }, {passive: true});
    }

    reset() {
    }

    destroy() {
        const canvas = this._scene.canvas.canvas;
        canvas.removeEventListener("touchstart", this._canvasTouchStartHandler);
        canvas.removeEventListener("touchend", this._canvasTouchEndHandler);
    }
}

export {TouchPickHandler};