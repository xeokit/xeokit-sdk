import {math} from "../../math/math.js";

const EPSILON = 0.001;

/**
 * Handles camera updates on each "tick" that were scheduled by the various controllers.
 *
 * @private
 */
class CameraUpdater {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;
        const input = scene.input;
        const camera = scene.camera;
        const pivotController = controllers.pivotController;

        this._onTick = scene.on("tick", (e) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            //   pivotController.updatePivotElement();

            let cursorType = "default";

            const deltaTimeMilliSecs = e.deltaTime;
            const deltaTimeSecs = deltaTimeMilliSecs / 1000;
            const dollySpeed = deltaTimeSecs * configs.dollyRate;

            //----------------------------------------------------------------------------------------------------------
            // Handle scheduled orbit
            //----------------------------------------------------------------------------------------------------------

            if (Math.abs(updates.rotateDeltaX) < EPSILON) {
                updates.rotateDeltaX = 0;
            }

            if (Math.abs(updates.rotateDeltaY) < EPSILON) {
                updates.rotateDeltaY = 0;
            }

            if (updates.rotateDeltaY !== 0 || updates.rotateDeltaX !== 0) {

                if (pivotController.getPivoting() && configs.pivoting) {
                    pivotController.continuePivot(updates.rotateDeltaY, updates.rotateDeltaX);
                    pivotController.showPivot();

                } else {

                    if (updates.rotateDeltaX !== 0) {
                        if (configs.firstPerson) {
                            camera.pitch(-updates.rotateDeltaX);
                        } else {
                            camera.orbitPitch(updates.rotateDeltaX);
                        }
                    }

                    if (updates.rotateDeltaY !== 0) {
                        if (configs.firstPerson) {
                            camera.yaw(updates.rotateDeltaY);
                        } else {
                            camera.orbitYaw(updates.rotateDeltaY);
                        }
                    }
                }

                updates.rotateDeltaX *= configs.rotationInertia;
                updates.rotateDeltaY *= configs.rotationInertia;

                cursorType = "grabbing";

            }

            //----------------------------------------------------------------------------------------------------------
            // Handle scheduled panning
            //----------------------------------------------------------------------------------------------------------

            if (Math.abs(updates.panDeltaX) < EPSILON) {
                updates.panDeltaX = 0;
            }

            if (Math.abs(updates.panDeltaY) < EPSILON) {
                updates.panDeltaY = 0;
            }

            if (Math.abs(updates.panDeltaZ) < EPSILON) {
                updates.panDeltaZ = 0;
            }

            if (updates.panDeltaX !== 0 || updates.panDeltaY !== 0 || updates.panDeltaZ !== 0) {

                const vec = math.vec3();
                const vec2 = math.vec3();

                vec[0] = updates.panDeltaX;
                vec[1] = updates.panDeltaY;
                vec[2] = updates.panDeltaZ;

                // math.normalizeVec3(vec);
                math.mulVec3Scalar(vec, dollySpeed, vec2);

                let verticalEye;
                let verticalLook;
                if (configs.constrainVertical) {
                    if (camera.xUp) {
                        verticalEye = camera.eye[0];
                        verticalLook = camera.look[0];
                    } else if (camera.yUp) {
                        verticalEye = camera.eye[1];
                        verticalLook = camera.look[1];
                    } else if (camera.zUp) {
                        verticalEye = camera.eye[2];
                        verticalLook = camera.look[2];
                    }

                    //      camera.pan([updates.panDeltaX * f, updates.panDeltaY * f, updates.panDeltaZ * f]);
                    camera.pan(vec2);
                    let eye = camera.eye;
                    let look = camera.look;
                    if (camera.xUp) {
                        eye[0] = verticalEye;
                        look[0] = verticalLook;
                    } else if (camera.yUp) {
                        eye[1] = verticalEye;
                        look[1] = verticalLook;
                    } else if (camera.zUp) {
                        eye[2] = verticalEye;
                        look[2] = verticalLook;
                    }
                    camera.eye = eye;
                    camera.look = look;
                } else {
                    if (controllers.pivotController.getPivoting() && configs.pivoting) {
                        controllers.pivotController.showPivot();
                    }
                    camera.pan(vec2);
                    // camera.pan([updates.panDeltaX * f, updates.panDeltaY * f, updates.panDeltaZ * f]);
                }

                cursorType = "grabbing";
            }

            updates.panDeltaX *= configs.dollyInertia;
            updates.panDeltaY *= configs.dollyInertia;
            updates.panDeltaZ *= configs.dollyInertia;

            //----------------------------------------------------------------------------------------------------------
            // Handle scheduled dollying
            //----------------------------------------------------------------------------------------------------------

            if (Math.abs(updates.dollyDelta) < EPSILON) {
                updates.dollyDelta = 0;
            }

            if (updates.dollyDelta !== 0) {

                if (updates.dollyDelta < 0) {
                    cursorType = "zoom-in";
                } else {
                    cursorType = "zoom-out";
                }

                if (configs.firstPerson) {

                    let verticalEye;
                    let verticalLook;

                    if (configs.constrainVertical) {
                        if (camera.xUp) {
                            verticalEye = camera.eye[0];
                            verticalLook = camera.look[0];
                        } else if (camera.yUp) {
                            verticalEye = camera.eye[1];
                            verticalLook = camera.look[1];
                        } else if (camera.zUp) {
                            verticalEye = camera.eye[2];
                            verticalLook = camera.look[2];
                        }
                    }

                    if (updates.inputFromMouse && configs.dollyToPointer) { // Using mouse input
                        controllers.panController.panToCanvasPos(states.mouseCanvasPos, -updates.dollyDelta * dollySpeed);
                    } else {
                        camera.pan([0, 0, updates.dollyDelta * dollySpeed]);
                    }

                    if (configs.constrainVertical) {
                        const eye = camera.eye;
                        const look = camera.look;
                        if (camera.xUp) {
                            eye[0] = verticalEye;
                            look[0] = verticalLook;
                        } else if (camera.yUp) {
                            eye[1] = verticalEye;
                            look[1] = verticalLook;
                        } else if (camera.zUp) {
                            eye[2] = verticalEye;
                            look[2] = verticalLook;
                        }
                        camera.eye = eye;
                        camera.look = look;
                    }

                } else if (configs.planView) {

                    if (updates.inputFromMouse && configs.dollyToPointer) {
                        controllers.panController.panToCanvasPos(states.mouseCanvasPos, -updates.dollyDelta * dollySpeed);
                    } else {
                        camera.pan([0, 0, updates.dollyDelta * dollySpeed]);
                    }

                } else { // Orbiting

                    if (configs.pivoting) {
                        controllers.panController.panToWorldPos(controllers.pivotController.getPivotPos(), -updates.dollyDelta * dollySpeed); // FIXME: What about when pivotPos undefined?

                    } else {
                        camera.zoom(updates.dollyDelta * dollySpeed);
                    }
                }

                camera.ortho.scale = camera.ortho.scale + updates.dollyDelta;

                updates.dollyDelta *= configs.dollyInertia;

                if (pivotController.getPivoting() && configs.pivoting) {
                    pivotController.showPivot();
                }
            }

            document.body.style.cursor = cursorType;
        });
    }

    destroy() {
        this._scene.off(this._onTick);
    }
}

export {CameraUpdater};