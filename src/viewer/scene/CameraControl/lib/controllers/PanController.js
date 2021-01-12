import {math} from "../../../math/math.js";

const screenPos = math.vec4();
const viewPos = math.vec4();

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

const tempVec4a = math.vec4();
const tempVec4b = math.vec4();
const tempVec4c = math.vec4();

/**
 * @private
 */
class PanController {

    constructor(scene) {
        this._scene = scene;
    }

    /**
     * Dollys the Camera towards the given target 2D canvas position.
     *
     * When the target's corresponding World-space position is also provided, then this function will also test if we've
     * dollied past the target, and will return ````true```` if that's the case.
     *
     * @param [optionalTargetWorldPos] Optional world position of the target
     * @param targetCanvasPos Canvas position of the target
     * @param dollyDelta Amount to dolly
     * @return True if optionalTargetWorldPos was given, and we've dollied past that position.
     */
    dollyToCanvasPos(optionalTargetWorldPos, targetCanvasPos, dollyDelta) {

        let dolliedThroughSurface = false;

        const camera = this._scene.camera;

        if (optionalTargetWorldPos) {
            const eyeToWorldPosVec = math.subVec3(optionalTargetWorldPos, camera.eye, tempVec3a);
            const eyeWorldPosDist = math.lenVec3(eyeToWorldPosVec);
            dolliedThroughSurface = (eyeWorldPosDist < dollyDelta);
        }

        if (camera.projection === "perspective") {

            camera.ortho.scale = camera.ortho.scale - dollyDelta;

            const unprojectedWorldPos = this._unproject(targetCanvasPos, tempVec4a);
            const offset = math.subVec3(unprojectedWorldPos, camera.eye, tempVec4c);
            const moveVec = math.mulVec3Scalar(math.normalizeVec3(offset), -dollyDelta, []);

            camera.eye = [camera.eye[0] - moveVec[0], camera.eye[1] - moveVec[1], camera.eye[2] - moveVec[2]];
            camera.look = [camera.look[0] - moveVec[0], camera.look[1] - moveVec[1], camera.look[2] - moveVec[2]];

            if (optionalTargetWorldPos) {

                // Subtle UX tweak - if we have a target World position, then set camera eye->look distance to
                // the same distance as from eye->target. This just gives us a better position for look,
                // if we subsequently orbit eye about look, so that we don't orbit a position that's
                // suddenly a lot closer than the point we pivoted about on the surface of the last object
                // that we click-drag-pivoted on.

                const eyeTargetVec = math.subVec3(optionalTargetWorldPos, camera.eye, tempVec3a);
                const lenEyeTargetVec = math.lenVec3(eyeTargetVec);
                const eyeLookVec = math.mulVec3Scalar(math.normalizeVec3(math.subVec3(camera.look, camera.eye, tempVec3b)), lenEyeTargetVec);
                camera.look = [camera.eye[0] + eyeLookVec[0], camera.eye[1] + eyeLookVec[1], camera.eye[2] + eyeLookVec[2]];
            }

        } else if (camera.projection === "ortho") {

            // - set ortho scale, getting the unprojected targetCanvasPos before and after, get that difference in a vector;
            // - get the vector in which we're dollying;
            // - add both vectors to camera eye and look.

            const worldPos1 = this._unproject(targetCanvasPos, tempVec4a);

            camera.ortho.scale = camera.ortho.scale - dollyDelta;
            camera.ortho._update(); // HACK

            const worldPos2 = this._unproject(targetCanvasPos, tempVec4b);
            const offset = math.subVec3(worldPos2, worldPos1, tempVec4c);
            const eyeLookMoveVec = math.mulVec3Scalar(math.normalizeVec3(math.subVec3(camera.look, camera.eye, tempVec3a)), -dollyDelta, tempVec3b);
            const moveVec = math.addVec3(offset, eyeLookMoveVec, tempVec3c);

            camera.eye = [camera.eye[0] - moveVec[0], camera.eye[1] - moveVec[1], camera.eye[2] - moveVec[2]];
            camera.look = [camera.look[0] - moveVec[0], camera.look[1] - moveVec[1], camera.look[2] - moveVec[2]];
        }

        return dolliedThroughSurface;
    }

    _unproject(canvasPos, worldPos) {

        const camera = this._scene.camera;
        const transposedProjectMat = camera.project.transposedMatrix;
        const Pt3 = transposedProjectMat.subarray(8, 12);
        const Pt4 = transposedProjectMat.subarray(12);
        const D = [0, 0, -1.0, 1];
        const screenZ = math.dotVec4(D, Pt3) / math.dotVec4(D, Pt4);

        camera.project.unproject(canvasPos, screenZ, screenPos, viewPos, worldPos);

        return worldPos;
    }

    destroy() {
    }
}

export {PanController};