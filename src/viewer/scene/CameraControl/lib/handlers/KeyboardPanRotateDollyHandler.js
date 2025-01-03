/**
 * @private
 */
class KeyboardPanRotateDollyHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;
        const input = scene.input;

        const keyDownMap = [];

        const canvas = scene.canvas.canvas;

        let mouseMovedSinceLastKeyboardDolly = true;

        this._onSceneMouseMove = input.on("mousemove", () => {
            mouseMovedSinceLastKeyboardDolly = true;
        });

        this._onSceneKeyDown = input.on("keydown", (keyCode) => {
            if (!(configs.active && configs.pointerEnabled) || (!scene.input.keyboardEnabled)) {
                return;
            }
            if (configs.keyboardEnabledOnlyIfMouseover && !states.mouseover) {
                return;
            }
            keyDownMap[keyCode] = true;
        });

        this._onSceneKeyUp = input.on("keyup", (keyCode) => {
            if (!(configs.active && configs.pointerEnabled) || (!scene.input.keyboardEnabled)) {
                return;
            }
            keyDownMap[keyCode] = false;

            if (controllers.pivotController.getPivoting()) {
                controllers.pivotController.endPivot()
            }
        });

        document.addEventListener("visibilitychange", this._onVisibilityChange = () => {
            keyDownMap.splice(0);
        })

        window.addEventListener("blur", this._onBlur = () => {
            keyDownMap.splice(0);
        })

        this._onTick = scene.on("tick", (e) => {

            if (!(configs.active && configs.pointerEnabled) || (!scene.input.keyboardEnabled)) {
                return;
            }

            if (configs.keyboardEnabledOnlyIfMouseover &&  !states.mouseover) {
                return;
            }

            const cameraControl = controllers.cameraControl;
            const elapsedSecs = (e.deltaTime / 1000.0);

            //-------------------------------------------------------------------------------------------------
            // Keyboard rotation
            //-------------------------------------------------------------------------------------------------

            if (!configs.planView) {

                const rotateYPos = cameraControl._isKeyDownForAction(cameraControl.ROTATE_Y_POS, keyDownMap);
                const rotateYNeg = cameraControl._isKeyDownForAction(cameraControl.ROTATE_Y_NEG, keyDownMap);
                const rotateXPos = cameraControl._isKeyDownForAction(cameraControl.ROTATE_X_POS, keyDownMap);
                const rotateXNeg = cameraControl._isKeyDownForAction(cameraControl.ROTATE_X_NEG, keyDownMap);

                const orbitDelta = elapsedSecs * configs.keyboardRotationRate;

                if (rotateYPos || rotateYNeg || rotateXPos || rotateXNeg) {

                    if ((!configs.firstPerson) && configs.followPointer) {
                        controllers.pivotController.startPivot();
                    }

                    if (rotateYPos) {
                        updates.rotateDeltaY += orbitDelta;

                    } else if (rotateYNeg) {
                        updates.rotateDeltaY -= orbitDelta;
                    }

                    if (rotateXPos) {
                        updates.rotateDeltaX += orbitDelta;

                    } else if (rotateXNeg) {
                        updates.rotateDeltaX -= orbitDelta;
                    }

                    if ((!configs.firstPerson) && configs.followPointer) {
                        controllers.pivotController.startPivot();
                    }
                }
            }

            //-------------------------------------------------------------------------------------------------
            // Keyboard panning
            //-------------------------------------------------------------------------------------------------

            if (!keyDownMap[input.KEY_CTRL] && !keyDownMap[input.KEY_ALT]) {

                const dollyBackwards = cameraControl._isKeyDownForAction(cameraControl.DOLLY_BACKWARDS, keyDownMap);
                const dollyForwards = cameraControl._isKeyDownForAction(cameraControl.DOLLY_FORWARDS, keyDownMap);

                if (dollyBackwards || dollyForwards) {

                    const dollyDelta = elapsedSecs * configs.keyboardDollyRate;

                    if ((!configs.firstPerson) && configs.followPointer) {
                        controllers.pivotController.startPivot();
                    }
                    if (dollyForwards) {
                        updates.dollyDelta -= dollyDelta;
                    } else if (dollyBackwards) {
                        updates.dollyDelta += dollyDelta;
                    }

                    if (mouseMovedSinceLastKeyboardDolly) {
                        states.followPointerDirty = true;
                        mouseMovedSinceLastKeyboardDolly = false;
                    }
                }
            }

            const panForwards = cameraControl._isKeyDownForAction(cameraControl.PAN_FORWARDS, keyDownMap);
            const panBackwards = cameraControl._isKeyDownForAction(cameraControl.PAN_BACKWARDS, keyDownMap);
            const panLeft = cameraControl._isKeyDownForAction(cameraControl.PAN_LEFT, keyDownMap);
            const panRight = cameraControl._isKeyDownForAction(cameraControl.PAN_RIGHT, keyDownMap);
            const panUp = cameraControl._isKeyDownForAction(cameraControl.PAN_UP, keyDownMap);
            const panDown = cameraControl._isKeyDownForAction(cameraControl.PAN_DOWN, keyDownMap);

            const panDelta = (keyDownMap[input.KEY_ALT] ? 0.3 : 1.0) * elapsedSecs * configs.keyboardPanRate; // ALT for slower pan rate

            if (panForwards || panBackwards || panLeft || panRight || panUp || panDown) {

                if ((!configs.firstPerson) && configs.followPointer) {
                    controllers.pivotController.startPivot();
                }

                if (panDown) {
                    updates.panDeltaY += panDelta;

                } else if (panUp) {
                    updates.panDeltaY += -panDelta;
                }

                if (panRight) {
                    updates.panDeltaX += -panDelta;

                } else if (panLeft) {
                    updates.panDeltaX += panDelta;
                }

                if (panBackwards) {
                    updates.panDeltaZ += panDelta;

                } else if (panForwards) {
                    updates.panDeltaZ += -panDelta;
                }
            }
        });
    }

    reset() {
    }

    destroy() {

        this._scene.off(this._onTick);

        this._scene.input.off(this._onSceneMouseMove);
        this._scene.input.off(this._onSceneKeyDown);
        document.removeEventListener("visibilitychange", this._onVisibilityChange);
        window.removeEventListener("blur", this._onBlur);
        this._scene.input.off(this._onSceneKeyUp);
    }
}

export {KeyboardPanRotateDollyHandler};
