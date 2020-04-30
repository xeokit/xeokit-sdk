/**
 * @private
 */
class KeyboardPanRotateDollyHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;
        const input = scene.input;

        const keyDown = [];

        document.addEventListener("keydown", this._documentKeyDownHandler = (e) => {
            if (!(configs.active && configs.pointerEnabled) || (!scene.input.keyboardEnabled)) {
                return;
            }
            if (!states.mouseover) {
                return;
            }
            const keyCode = e.keyCode;
            keyDown[keyCode] = true;
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
        });

        this._onTick = scene.on("tick", (e) => {

            if (!(configs.active && configs.pointerEnabled) || (!scene.input.keyboardEnabled)) {
                return;
            }

            if (!states.mouseover) {
                return;
            }

            if (configs.planView) {
                return;
            }

            const elapsed = e.deltaTime;

            //-------------------------------------------------------------------------------------------------
            // Keyboard rotation
            //-------------------------------------------------------------------------------------------------

            const leftArrowKey = keyDown[input.KEY_LEFT_ARROW];
            const rightArrowKey = keyDown[input.KEY_RIGHT_ARROW];
            const upArrowKey = keyDown[input.KEY_UP_ARROW];
            const downArrowKey = keyDown[input.KEY_DOWN_ARROW];

            if (leftArrowKey || rightArrowKey || upArrowKey || downArrowKey) {
                if (configs.pivoting) {
                    controllers.pivotController.startPivot();
                }
                if (rightArrowKey) {
                    updates.rotateDeltaY += -elapsed * configs.keyboardOrbitRate;

                } else if (leftArrowKey) {
                    updates.rotateDeltaY += elapsed * configs.keyboardOrbitRate;
                }
                if (downArrowKey) {
                    updates.rotateDeltaX += elapsed * configs.keyboardOrbitRate;

                } else if (upArrowKey) {
                    updates.rotateDeltaX += -elapsed * configs.keyboardOrbitRate;
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
                    updates.rotateDeltaY += elapsed * configs.keyboardOrbitRate;

                } else if (rotateRight) {
                    updates.rotateDeltaY += -elapsed * configs.keyboardOrbitRate;
                }
            }

            //-------------------------------------------------------------------------------------------------
            // Keyboard panning
            //-------------------------------------------------------------------------------------------------

            if (!keyDown[input.KEY_CTRL] && !keyDown[input.KEY_ALT]) {

                const addKey = keyDown[input.KEY_ADD];
                const subtractKey = keyDown[input.KEY_SUBTRACT];

                if (addKey || subtractKey) {
                    if (configs.pivoting) {
                        controllers.pivotController.startPivot();
                    }
                    if (subtractKey) {
                        updates.dollyDelta = +1;
                    } else if (addKey) {
                        updates.dollyDelta = -1;
                    }
                }
            }

            let panForwardKey;
            let panBackKey;
            let panLeftKey;
            let panRightKey;
            let panUpKey;
            let panDownKey;
            let panRate = keyDown[input.KEY_ALT] ? 0.3 : 1.0; // ALT for slower pan rate

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

                if (configs.pivoting) {
                    controllers.pivotController.startPivot();
                }

                if (panDownKey) {
                    updates.panDeltaY = panRate;

                } else if (panUpKey) {
                    updates.panDeltaY = -panRate;
                }

                if (panRightKey) {
                    updates.panDeltaX = -panRate;

                } else if (panLeftKey) {
                    updates.panDeltaX = panRate;
                }

                if (panBackKey) {
                    updates.panDeltaZ = panRate;

                } else if (panForwardKey) {
                    updates.panDeltaZ = -panRate;
                }
            }
        });
    }

    reset() {
    }

    destroy() {
        this._scene.off(this._onTick);
    }
}

export {KeyboardPanRotateDollyHandler};