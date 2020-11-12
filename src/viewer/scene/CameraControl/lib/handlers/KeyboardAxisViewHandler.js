import {math} from "../../../math/math.js";

const center = math.vec3();
const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec3d = math.vec3();

const tempCameraTarget = {
    eye: math.vec3(),
    look: math.vec3(),
    up: math.vec3()
};

/**
 * @private
 */
class KeyboardAxisViewHandler {

    constructor(scene, controllers, configs, states, updates) {

        this._scene = scene;
        const cameraControl = controllers.cameraControl;
        const camera = scene.camera;

        scene.input.on("keydown", this._documentKeyDownHandler = (e) => {

            if (!(configs.active && configs.pointerEnabled) || (!scene.input.keyboardEnabled)) {
                return;
            }

            if (!states.mouseover) {
                return;
            }

            const axisViewRight = cameraControl._isKeyDownForAction(cameraControl.AXIS_VIEW_RIGHT);
            const axisViewBack = cameraControl._isKeyDownForAction(cameraControl.AXIS_VIEW_BACK);
            const axisViewLeft = cameraControl._isKeyDownForAction(cameraControl.AXIS_VIEW_LEFT);
            const axisViewFront = cameraControl._isKeyDownForAction(cameraControl.AXIS_VIEW_FRONT);
            const axisViewTop = cameraControl._isKeyDownForAction(cameraControl.AXIS_VIEW_TOP);
            const axisViewBottom = cameraControl._isKeyDownForAction(cameraControl.AXIS_VIEW_BOTTOM);

            if ((!axisViewRight) && (!axisViewBack) && (!axisViewLeft) && (!axisViewFront) && (!axisViewTop) && (!axisViewBottom)) {
                return;
            }

            const aabb = scene.aabb;
            const diag = math.getAABB3Diag(aabb);

            math.getAABB3Center(aabb, center);

            const perspectiveDist = Math.abs(diag / Math.tan(controllers.cameraFlight.fitFOV * math.DEGTORAD));
            const orthoScale = diag * 1.1;

            tempCameraTarget.orthoScale = orthoScale;

            if (axisViewRight) {

                tempCameraTarget.eye.set(math.addVec3(center, math.mulVec3Scalar(camera.worldRight, perspectiveDist, tempVec3a), tempVec3d));
                tempCameraTarget.look.set(center);
                tempCameraTarget.up.set(camera.worldUp);

            } else if (axisViewBack) {

                tempCameraTarget.eye.set(math.addVec3(center, math.mulVec3Scalar(camera.worldForward, perspectiveDist, tempVec3a), tempVec3d));
                tempCameraTarget.look.set(center);
                tempCameraTarget.up.set(camera.worldUp);

            } else if (axisViewLeft) {

                tempCameraTarget.eye.set(math.addVec3(center, math.mulVec3Scalar(camera.worldRight, -perspectiveDist, tempVec3a), tempVec3d));
                tempCameraTarget.look.set(center);
                tempCameraTarget.up.set(camera.worldUp);

            } else if (axisViewFront) {

                tempCameraTarget.eye.set(math.addVec3(center, math.mulVec3Scalar(camera.worldForward, -perspectiveDist, tempVec3a), tempVec3d));
                tempCameraTarget.look.set(center);
                tempCameraTarget.up.set(camera.worldUp);

            } else if (axisViewTop) {

                tempCameraTarget.eye.set(math.addVec3(center, math.mulVec3Scalar(camera.worldUp, perspectiveDist, tempVec3a), tempVec3d));
                tempCameraTarget.look.set(center);
                tempCameraTarget.up.set(math.normalizeVec3(math.mulVec3Scalar(camera.worldForward, 1, tempVec3b), tempVec3c));

            } else if (axisViewBottom) {

                tempCameraTarget.eye.set(math.addVec3(center, math.mulVec3Scalar(camera.worldUp, -perspectiveDist, tempVec3a), tempVec3d));
                tempCameraTarget.look.set(center);
                tempCameraTarget.up.set(math.normalizeVec3(math.mulVec3Scalar(camera.worldForward, -1, tempVec3b)));
            }

            if ((!configs.firstPerson) && configs.followPointer) {
                controllers.pivotController.setPivotPos(center);
            }

            if (controllers.cameraFlight.duration > 0) {
                controllers.cameraFlight.flyTo(tempCameraTarget, () => {
                    if (controllers.pivotController.getPivoting() && configs.followPointer) {
                        controllers.pivotController.showPivot();
                    }
                });

            } else {
                controllers.cameraFlight.jumpTo(tempCameraTarget);
                if (controllers.pivotController.getPivoting() && configs.followPointer) {
                    controllers.pivotController.showPivot();
                }
            }
        });
    }

    reset() {
    }

    destroy() {
        document.removeEventListener("keydown", this._documentKeyDownHandler);
    }
}

export {KeyboardAxisViewHandler};