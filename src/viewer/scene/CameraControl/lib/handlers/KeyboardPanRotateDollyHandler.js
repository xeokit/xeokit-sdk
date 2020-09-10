/**
 * @private
 */
class KeyboardPanRotateDollyHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;
        const input = scene.input;

        const keyDownMap = [];

        const canvas = scene.canvas.canvas;

        const pickController = controllers.pickController;

        let mouseMovedSinceLastKeyboardDolly = true;

        document.addEventListener("mousemove", this._documentMouseMoveHandler = () => {
            mouseMovedSinceLastKeyboardDolly = true;
        });

        document.addEventListener("keydown", this._documentKeyDownHandler = (e) => {
            if (!(configs.active && configs.pointerEnabled) || (!scene.input.keyboardEnabled)) {
                return;
            }
            if (!states.mouseover) {
                return;
            }
            const keyCode = e.keyCode;
            keyDownMap[keyCode] = true;

            if (keyCode === input.KEY_SHIFT) {
                canvas.style.cursor = "move";
            }
        });

        document.addEventListener("keyup", this._documentKeyUpHandler = (e) => {
            if (!(configs.active && configs.pointerEnabled) || (!scene.input.keyboardEnabled)) {
                return;
            }
            if (!states.mouseover) {
                return;
            }
            const keyCode = e.keyCode;
            keyDownMap[keyCode] = false;

            if (keyCode === input.KEY_SHIFT) {
                canvas.style.cursor = "default";
            }
        });

        this._onTick = scene.on("tick", (e) => {

            if (!(configs.active && configs.pointerEnabled) || (!scene.input.keyboardEnabled)) {
                return;
            }

            if (!states.mouseover) {
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

        document.removeEventListener("mousemove", this._documentMouseMoveHandler);
        document.removeEventListener("keydown", this._documentKeyDownHandler);
        document.removeEventListener("keyup", this._documentKeyUpHandler);
    }
}

export {KeyboardPanRotateDollyHandler};