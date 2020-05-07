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


            const elapsed = e.deltaTime;

            //-------------------------------------------------------------------------------------------------
            // Keyboard rotation
            //-------------------------------------------------------------------------------------------------

            if (!configs.planView) {

                const leftArrowKey = keyDown[input.KEY_LEFT_ARROW];
                const rightArrowKey = keyDown[input.KEY_RIGHT_ARROW];
                const upArrowKey = keyDown[input.KEY_UP_ARROW];
                const downArrowKey = keyDown[input.KEY_DOWN_ARROW];

                const orbitRate = elapsed * configs.keyboardRotationRate * .05;

                if (leftArrowKey || rightArrowKey || upArrowKey || downArrowKey) {

                    if ((!configs.firstPerson) && configs.pivoting) {
                        controllers.pivotController.startPivot();
                    }
                    if (rightArrowKey) {
                        updates.rotateDeltaY -= orbitRate;

                    } else if (leftArrowKey) {
                        updates.rotateDeltaY += orbitRate;
                    }
                    if (downArrowKey) {
                        updates.rotateDeltaX += orbitRate;

                    } else if (upArrowKey) {
                        updates.rotateDeltaX -= orbitRate;
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
                        updates.rotateDeltaY += orbitRate;

                    } else if (rotateRight) {
                        updates.rotateDeltaY -= orbitRate;
                    }

                    if ((!configs.firstPerson) && configs.pivoting) {
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
                    if ((!configs.firstPerson) && configs.pivoting) {
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

            const panRate = (keyDown[input.KEY_ALT] ? 0.2 : 0.8) * configs.keyboardPanRate * 5.0; // ALT for slower pan rate

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

                if ((!configs.firstPerson) && configs.pivoting) {
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

        document.removeEventListener("keydown", this._documentKeyDownHandler);
        document.removeEventListener("keyup", this._documentKeyUpHandler);
    }
}

export {KeyboardPanRotateDollyHandler};