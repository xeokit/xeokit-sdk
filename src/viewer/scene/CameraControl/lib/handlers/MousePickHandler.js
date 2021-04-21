import {math} from "../../../math/math.js";

/**
 * @private
 */
class MousePickHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;

        const pickController = controllers.pickController;
        const pivotController = controllers.pivotController;
        const cameraControl = controllers.cameraControl;

        this._clicks = 0;
        this._timeout = null;
        this._lastPickedEntityId = null;

        let leftDown = false;
        let rightDown = false;

        const canvas = this._scene.canvas.canvas;

        const flyCameraTo = (pickResult) => {
            let pos;
            if (pickResult && pickResult.worldPos) {
                pos = pickResult.worldPos
            }
            const aabb = pickResult && pickResult.entity ? pickResult.entity.aabb : scene.aabb;
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

        canvas.addEventListener("mousemove", this._canvasMouseMoveHandler = (e) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            if (leftDown || rightDown) {
                return;
            }

            const hoverSubs = cameraControl.hasSubs("hover");
            const hoverOutSubs = cameraControl.hasSubs("hoverOut");
            const hoverOffSubs = cameraControl.hasSubs("hoverOff");
            const hoverSurfaceSubs = cameraControl.hasSubs("hoverSurface");

            if (hoverSubs || hoverOutSubs || hoverOffSubs || hoverSurfaceSubs) {

                pickController.pickCursorPos = states.pointerCanvasPos;
                pickController.schedulePickEntity = true;
                pickController.schedulePickSurface = hoverSurfaceSubs;

                pickController.update();

                if (pickController.pickResult) {

                    const pickedEntityId = pickController.pickResult.entity.id;

                    if (this._lastPickedEntityId !== pickedEntityId) {

                        if (this._lastPickedEntityId !== undefined) {

                            cameraControl.fire("hoverOut", { // Hovered off an entity
                                entity: scene.objects[this._lastPickedEntityId]
                            }, true);
                        }

                        cameraControl.fire("hoverEnter", pickController.pickResult, true); // Hovering over a new entity

                        this._lastPickedEntityId = pickedEntityId;
                    }

                    cameraControl.fire("hover", pickController.pickResult, true);

                    if (pickController.pickResult.worldPos) { // Hovering the surface of an entity
                        cameraControl.fire("hoverSurface", pickController.pickResult, true);
                    }

                } else {

                    if (this._lastPickedEntityId !== undefined) {

                        cameraControl.fire("hoverOut", { // Hovered off an entity
                            entity: scene.objects[this._lastPickedEntityId]
                        }, true);

                        this._lastPickedEntityId = undefined;
                    }

                    cameraControl.fire("hoverOff", { // Not hovering on any entity
                        canvasPos: pickController.pickCursorPos
                    }, true);
                }
            }
        });

        canvas.addEventListener('mousedown', this._canvasMouseDownHandler = (e) => {

            if (e.which === 1) {
                leftDown = true;
            }

            if (e.which === 3) {
                rightDown = true;
            }

            const leftButtonDown = (e.which === 1);

            if (!leftButtonDown) {
                return;
            }

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            // Left mouse button down to start pivoting

            states.mouseDownClientX = e.clientX;
            states.mouseDownClientY = e.clientY;
            states.mouseDownCursorX = states.pointerCanvasPos[0];
            states.mouseDownCursorY = states.pointerCanvasPos[1];

            if ((!configs.firstPerson) && configs.followPointer) {

                pickController.pickCursorPos = states.pointerCanvasPos;
                pickController.schedulePickSurface = true;

                pickController.update();

                if (e.which === 1) {// Left button
                    const pickResult = pickController.pickResult;
                    if (pickResult && pickResult.worldPos) {
                        pivotController.setPivotPos(pickResult.worldPos);
                        pivotController.startPivot();
                    } else {
                        if (configs.smartPivot) {
                            pivotController.setCanvasPivotPos(states.pointerCanvasPos);
                        } else {
                            pivotController.setPivotPos(scene.camera.look);
                        }
                        pivotController.startPivot();
                    }
                }
            }
        });

        document.addEventListener('mouseup', this._documentMouseUpHandler = (e) => {

            if (e.which === 1) {
                leftDown = false;
            }

            if (e.which === 3) {
                rightDown = false;
            }
        });

        canvas.addEventListener('mouseup', this._canvasMouseUpHandler = (e) => {

            if (!(configs.active && configs.pointerEnabled)) {
                return;
            }

            const leftButtonUp = (e.which === 1);

            if (!leftButtonUp) {
                return;
            }

            // Left mouse button up to possibly pick or double-pick

            pivotController.hidePivot();

            if (Math.abs(e.clientX - states.mouseDownClientX) > 3 || Math.abs(e.clientY - states.mouseDownClientY) > 3) {
                return;
            }

            const pickedSubs = cameraControl.hasSubs("picked");
            const pickedNothingSubs = cameraControl.hasSubs("pickedNothing");
            const pickedSurfaceSubs = cameraControl.hasSubs("pickedSurface");
            const doublePickedSubs = cameraControl.hasSubs("doublePicked");
            const doublePickedSurfaceSubs = cameraControl.hasSubs("doublePickedSurface");
            const doublePickedNothingSubs = cameraControl.hasSubs("doublePickedNothing");

            if ((!configs.doublePickFlyTo) &&
                (!doublePickedSubs) &&
                (!doublePickedSurfaceSubs) &&
                (!doublePickedNothingSubs)) {

                //  Avoid the single/double click differentiation timeout

                if (pickedSubs || pickedNothingSubs || pickedSurfaceSubs) {

                    pickController.pickCursorPos = states.pointerCanvasPos;
                    pickController.schedulePickEntity = true;
                    pickController.schedulePickSurface = pickedSurfaceSubs;
                    pickController.update();

                    if (pickController.pickResult) {

                        cameraControl.fire("picked", pickController.pickResult, true);

                        if (pickController.pickedSurface) {
                            cameraControl.fire("pickedSurface", pickController.pickResult, true);
                        }
                    } else {
                        cameraControl.fire("pickedNothing", {
                            canvasPos: states.pointerCanvasPos
                        }, true);
                    }
                }

                this._clicks = 0;

                return;
            }

            this._clicks++;

            if (this._clicks === 1) { // First click

                this._timeout = setTimeout(() => {

                    pickController.pickCursorPos = states.pointerCanvasPos;
                    pickController.schedulePickEntity = configs.doublePickFlyTo;
                    pickController.schedulePickSurface = pickedSurfaceSubs;
                    pickController.update();

                    if (pickController.pickResult) {

                        cameraControl.fire("picked", pickController.pickResult, true);

                        if (pickController.pickedSurface) {

                            cameraControl.fire("pickedSurface", pickController.pickResult, true);

                            if ((!configs.firstPerson) && configs.followPointer) {
                                controllers.pivotController.setPivotPos(pickController.pickResult.worldPos);
                                if (controllers.pivotController.startPivot()) {
                                    controllers.pivotController.showPivot();
                                }
                            }
                        }
                    } else {
                        cameraControl.fire("pickedNothing", {
                            canvasPos: states.pointerCanvasPos
                        }, true);
                    }

                    this._clicks = 0;

                }, 250);  // FIXME: Too short for track pads

            } else { // Second click

                if (this._timeout !== null) {
                    window.clearTimeout(this._timeout);
                    this._timeout = null;
                }

                pickController.pickCursorPos = states.pointerCanvasPos;
                pickController.schedulePickEntity = configs.doublePickFlyTo || doublePickedSubs || doublePickedSurfaceSubs;
                pickController.schedulePickSurface = pickController.schedulePickEntity && doublePickedSurfaceSubs;
                pickController.update();

                if (pickController.pickResult) {

                    cameraControl.fire("doublePicked", pickController.pickResult, true);

                    if (pickController.pickedSurface) {
                        cameraControl.fire("doublePickedSurface", pickController.pickResult, true);
                    }

                    if (configs.doublePickFlyTo) {

                        flyCameraTo(pickController.pickResult);

                        if ((!configs.firstPerson) && configs.followPointer) {

                            const pickedEntityAABB = pickController.pickResult.entity.aabb;
                            const pickedEntityCenterPos = math.getAABB3Center(pickedEntityAABB);

                            controllers.pivotController.setPivotPos(pickedEntityCenterPos);

                            if (controllers.pivotController.startPivot()) {
                                controllers.pivotController.showPivot();
                            }
                        }
                    }

                } else {

                    cameraControl.fire("doublePickedNothing", {
                        canvasPos: states.pointerCanvasPos
                    }, true);

                    if (configs.doublePickFlyTo) {

                        flyCameraTo();

                        if ((!configs.firstPerson) && configs.followPointer) {

                            const sceneAABB = scene.aabb;
                            const sceneCenterPos = math.getAABB3Center(sceneAABB);

                            controllers.pivotController.setPivotPos(sceneCenterPos);

                            if (controllers.pivotController.startPivot()) {
                                controllers.pivotController.showPivot();
                            }
                        }
                    }
                }

                this._clicks = 0;
            }
        }, false);
    }

    reset() {
        this._clicks = 0;
        this._lastPickedEntityId = null;
        if (this._timeout) {
            window.clearTimeout(this._timeout);
            this._timeout = null;
        }
    }

    destroy() {
        const canvas = this._scene.canvas.canvas;
        canvas.removeEventListener("mousemove", this._canvasMouseMoveHandler);
        canvas.removeEventListener("mousedown", this._canvasMouseDownHandler);
        document.removeEventListener("mouseup", this._documentMouseUpHandler);
        canvas.removeEventListener("mouseup", this._canvasMouseUpHandler);
        if (this._timeout) {
            window.clearTimeout(this._timeout);
            this._timeout = null;
        }
    }
}



export {MousePickHandler};