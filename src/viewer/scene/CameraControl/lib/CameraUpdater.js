import {math} from "../../math/math.js";

const SCALE_DOLLY_EACH_FRAME = 1; // Recalculate dolly speed for eye->target distance on each Nth frame
const EPSILON = 0.001;
const tempVec3 = math.vec3();

/**
 * Handles camera updates on each "tick" that were scheduled by the various controllers.
 *
 * @private
 */
class CameraUpdater {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;
        const camera = scene.camera;
        const pickController = controllers.pickController;
        const pivotController = controllers.pivotController;
        const panController = controllers.panController;

        let countDown = SCALE_DOLLY_EACH_FRAME; // Decrements on each tick
        let dollyDistFactor = 1.0; // Calculated when countDown is zero
        let followPointerWorldPos = null; // Holds the pointer's World position when configs.followPointer is true
        
        this._onTick = scene.on("tick", () => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            let cursorType = "default";

            //----------------------------------------------------------------------------------------------------------
            // Dolly decay
            //------------------------------------------------------------------------------------  ----------------------

            if (Math.abs(updates.dollyDelta) < EPSILON) {
                updates.dollyDelta = 0;
            }

            //----------------------------------------------------------------------------------------------------------
            // Rotation decay
            //----------------------------------------------------------------------------------------------------------

            if (Math.abs(updates.rotateDeltaX) < EPSILON) {
                updates.rotateDeltaX = 0;
            }

            if (Math.abs(updates.rotateDeltaY) < EPSILON) {
                updates.rotateDeltaY = 0;
            }

            if (updates.rotateDeltaX !== 0 || updates.rotateDeltaY !== 0) {
                updates.dollyDelta = 0;
            }

            //----------------------------------------------------------------------------------------------------------
            // Dolly speed eye->look scaling
            //
            // If pointer is over an object, then dolly speed is proportional to the distance to that object.
            //
            // If pointer is not over an object, then dolly speed is proportional to the distance to the last
            // object the pointer was over. This is so that we can dolly to structures that may have gaps through
            // which empty background shows, that the pointer may inadvertently be over. In these cases, we don't
            // want dolly speed wildly varying depending on how accurately the user avoids the gaps with the pointer.
            //----------------------------------------------------------------------------------------------------------

            if (configs.followPointer) {

                if (--countDown <= 0) {

                    countDown = SCALE_DOLLY_EACH_FRAME;

                    if (updates.dollyDelta !== 0) {
                        if (updates.rotateDeltaY === 0 && updates.rotateDeltaX === 0) {

                            if (configs.followPointer && states.followPointerDirty) {

                                pickController.pickCursorPos = states.pointerCanvasPos;
                                pickController.schedulePickSurface = true;
                                pickController.update();

                                if (pickController.pickResult && pickController.pickResult.worldPos) {
                                    followPointerWorldPos = pickController.pickResult.worldPos;
                                    
                                } else {
                                    dollyDistFactor = 1.0;
                                    followPointerWorldPos = null;
                                }

                                states.followPointerDirty = false;
                            }
                        }

                        if (followPointerWorldPos) {
                            const dist = Math.abs(math.lenVec3(math.subVec3(followPointerWorldPos, scene.camera.eye, tempVec3)));
                            dollyDistFactor = dist / configs.dollyProximityThreshold;
                        }

                        if (dollyDistFactor < configs.dollyMinSpeed) {
                            dollyDistFactor = configs.dollyMinSpeed;
                        }
                    }
                }
            }

            const dollyDeltaForDist = (updates.dollyDelta * dollyDistFactor);

            //----------------------------------------------------------------------------------------------------------
            // Rotation
            //----------------------------------------------------------------------------------------------------------

            if (updates.rotateDeltaY !== 0 || updates.rotateDeltaX !== 0) {

                if ((!configs.firstPerson) && configs.followPointer && pivotController.getPivoting()) {
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
            // Panning
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

                vec[0] = updates.panDeltaX;
                vec[1] = updates.panDeltaY;
                vec[2] = updates.panDeltaZ;

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

                    camera.pan(vec);

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

                } else {
                    camera.pan(vec);
                }

                cursorType = "grabbing";
            }

            updates.panDeltaX *= configs.panInertia;
            updates.panDeltaY *= configs.panInertia;
            updates.panDeltaZ *= configs.panInertia;

            //----------------------------------------------------------------------------------------------------------
            // Dollying
            //----------------------------------------------------------------------------------------------------------

            if (dollyDeltaForDist !== 0) {

                if (dollyDeltaForDist < 0) {
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

                    if (configs.followPointer) {
                        const dolliedThroughSurface = panController.dollyToCanvasPos(followPointerWorldPos, states.pointerCanvasPos, -dollyDeltaForDist);
                        if (dolliedThroughSurface) {
                            states.followPointerDirty = true;
                        }
                    } else {
                        camera.pan([0, 0, dollyDeltaForDist]);
                        camera.ortho.scale = camera.ortho.scale - dollyDeltaForDist;
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

                    if (configs.followPointer) {
                        const dolliedThroughSurface = panController.dollyToCanvasPos(followPointerWorldPos, states.pointerCanvasPos, -dollyDeltaForDist);
                        if (dolliedThroughSurface) {
                            states.followPointerDirty = true;
                        }
                    } else {
                        camera.ortho.scale = camera.ortho.scale + dollyDeltaForDist;
                        camera.zoom(dollyDeltaForDist);
                    }

                } else { // Orbiting

                    if (configs.followPointer) {
                        const dolliedThroughSurface = panController.dollyToCanvasPos(followPointerWorldPos, states.pointerCanvasPos, -dollyDeltaForDist);
                        if (dolliedThroughSurface) {
                            states.followPointerDirty = true;
                        }
                    } else {
                        camera.ortho.scale = camera.ortho.scale + dollyDeltaForDist;
                        camera.zoom(dollyDeltaForDist);
                    }
                }

                updates.dollyDelta *= configs.dollyInertia;
            }

            pickController.fireEvents();

            document.body.style.cursor = cursorType;
        });
    }


    destroy() {
        this._scene.off(this._onTick);
    }
}

export {CameraUpdater};