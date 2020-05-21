/**
 * @private
 */
class KeyboardPanRotateDollyHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;
        const input = scene.input;

        const keyDown = [];

        const canvas = scene.canvas.canvas;

        document.addEventListener("keydown", this._documentKeyDownHandler = (e) => {
            if (!(configs.active && configs.pointerEnabled) || (!scene.input.keyboardEnabled)) {
                return;
            }
            if (!states.mouseover) {
                return;
            }
            const keyCode = e.keyCode;
            keyDown[keyCode] = true;

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
            keyDown[keyCode] = false;

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


            const elapsedSecs = (e.deltaTime / 1000.0);

            //-------------------------------------------------------------------------------------------------
            // Keyboard rotation
            //-------------------------------------------------------------------------------------------------

            if (!configs.planView) {

                const leftArrowKey = keyDown[input.KEY_LEFT_ARROW];
                const rightArrowKey = keyDown[input.KEY_RIGHT_ARROW];
                const upArrowKey = keyDown[input.KEY_UP_ARROW];
                const downArrowKey = keyDown[input.KEY_DOWN_ARROW];

                const orbitDelta = elapsedSecs * configs.keyboardRotationRate;

                if (leftArrowKey || rightArrowKey || upArrowKey || downArrowKey) {

                    if ((!configs.firstPerson) && configs.followPointer) {
                        controllers.pivotController.startPivot();
                    }
                    if (rightArrowKey) {
                        updates.rotateDeltaY -= orbitDelta;

                    } else if (leftArrowKey) {
                        updates.rotateDeltaY += orbitDelta;
                    }
                    if (downArrowKey) {
                        updates.rotateDeltaX += orbitDelta;

                    } else if (upArrowKey) {
                        updates.rotateDeltaX -= orbitDelta;
                    }
                }

                let rotateLeft;
                let rotateRight;

                if (configs.keyboardLayout === 'azerty') {
                    rotateLeft = keyDown[input.KEY_A];
                    rotateRight = keyDown[input.KEY_E];

                } else {
                    rotateLeft = keyDown[input.KEY_Q];
                    rotateRight = keyDown[input.KEY_E];
                }

                if (rotateRight || rotateLeft) {
                    if (rotateLeft) {
                        updates.rotateDeltaY += orbitDelta;

                    } else if (rotateRight) {
                        updates.rotateDeltaY -= orbitDelta;
                    }

                    if ((!configs.firstPerson) && configs.followPointer) {
                        controllers.pivotController.startPivot();
                    }
                }
            }

            //-------------------------------------------------------------------------------------------------
            // Keyboard panning
            //-------------------------------------------------------------------------------------------------

            if (!keyDown[input.KEY_CTRL] && !keyDown[input.KEY_ALT]) {

                const addKey = keyDown[input.KEY_ADD];
                const subtractKey = keyDown[input.KEY_SUBTRACT];

                if (addKey || subtractKey) {

                    const dollyDelta = elapsedSecs * configs.keyboardDollyRate;

                    if ((!configs.firstPerson) && configs.followPointer) {
                        controllers.pivotController.startPivot();
                    }
                    if (subtractKey) {
                        updates.dollyDelta += dollyDelta;
                    } else if (addKey) {
                        updates.dollyDelta -= dollyDelta;
                    }
                }
            }

            let panForwardKey;
            let panBackKey;
            let panLeftKey;
            let panRightKey;
            let panUpKey;
            let panDownKey;

            const panDelta = (keyDown[input.KEY_ALT] ? 0.3 : 1.0) * elapsedSecs * configs.keyboardPanRate; // ALT for slower pan rate

            if (configs.keyboardLayout === 'azerty') {

                panForwardKey = keyDown[input.KEY_Z];
                panBackKey = keyDown[input.KEY_S];
                panLeftKey = keyDown[input.KEY_Q];
                panRightKey = keyDown[input.KEY_D];
                panUpKey = keyDown[input.KEY_W];
                panDownKey = keyDown[input.KEY_X];

            } else {

                panForwardKey = keyDown[input.KEY_W];
                panBackKey = keyDown[input.KEY_S];
                panLeftKey = keyDown[input.KEY_A];
                panRightKey = keyDown[input.KEY_D];
                panUpKey = keyDown[input.KEY_Z];
                panDownKey = keyDown[input.KEY_X];
            }

            if (panForwardKey || panBackKey || panLeftKey || panRightKey || panUpKey || panDownKey) {

                if ((!configs.firstPerson) && configs.followPointer) {
                    controllers.pivotController.startPivot();
                }

                if (panDownKey) {
                    updates.panDeltaY += panDelta;

                } else if (panUpKey) {
                    updates.panDeltaY += -panDelta;
                }

                if (panRightKey) {
                    updates.panDeltaX += -panDelta;

                } else if (panLeftKey) {
                    updates.panDeltaX += panDelta;
                }

                if (panBackKey) {
                    updates.panDeltaZ += panDelta;

                } else if (panForwardKey) {
                    updates.panDeltaZ += -panDelta;
                }
            }
        });
    }

    reset() {
    }

    destroy() {

        this._scene.off(this._onTick);

        document.removeEventListener("keydown", this._documentKeyDownHandler);
        document.removeEventListener("keyup", this._documentKeyUpHandler);
    }
}

export {KeyboardPanRotateDollyHandler};