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

        this._inverseProjectMat = math.mat4();
        this._transposedProjectMat = math.mat4();

        this._inverseOrthoProjectMat = math.mat4();
        this._transposedOrthoProjectMat = math.mat4();

        this._inverseViewMat = math.mat4();
        this._projMatDirty = true;
        this._viewMatDirty = true;
        this._sceneDiagSizeDirty = true;
        this._sceneDiagSize = 1;

        this._onCameraOrthoProjMatrix = this._scene.camera.ortho.on("matrix", () => {
            this._projMatDirty = true;
        });

        this._onCameraPerspectiveProjMatrix = this._scene.camera.perspective.on("matrix", () => {
            this._projMatDirty = true;
        });

        this._onCameraViewMatrix = this._scene.camera.on("viewMatrix", () => {
            this._viewMatDirty = true;
        });

        this._onSceneBoundary = this._scene.scene.on("boundary", () => {
            this._sceneDiagSizeDirty = true;
        });
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

            const unprojectedWorldPos = this._unprojectPerspective(targetCanvasPos, tempVec4a);
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

            const worldPos1 = this._unprojectOrtho(targetCanvasPos, tempVec4a);

            camera.ortho.scale = camera.ortho.scale - dollyDelta;
            camera.ortho._update(); // HACK

            const worldPos2 = this._unprojectOrtho(targetCanvasPos, tempVec4b);
            const offset = math.subVec3(worldPos2, worldPos1, tempVec4c);
            const eyeLookMoveVec = math.mulVec3Scalar(math.normalizeVec3(math.subVec3(camera.look, camera.eye, tempVec3a)), -dollyDelta, tempVec3b);
            const moveVec = math.addVec3(offset, eyeLookMoveVec, tempVec3c);

            camera.eye = [camera.eye[0] - moveVec[0], camera.eye[1] - moveVec[1], camera.eye[2] - moveVec[2]];
            camera.look = [camera.look[0] - moveVec[0], camera.look[1] - moveVec[1], camera.look[2] - moveVec[2]];
        }

        return dolliedThroughSurface;
    }

    _getInverseProjectMat() {
        this._updateProjMatrices();
        return this._inverseProjectMat;
    }

    _getTransposedProjectMat() {
        this._updateProjMatrices();
        return this._transposedProjectMat;
    }

    _getInverseOrthoProjectMat() {
        this._updateProjMatrices();
        return this._inverseOrthoProjectMat;
    }

    _getTransposedOrthoProjectMat() {
        this._updateProjMatrices();
        return this._transposedOrthoProjectMat;
    }

    _updateProjMatrices() {
        if (this._projMatDirty) {
            math.inverseMat4(this._scene.camera.perspective.matrix, this._inverseProjectMat);
            math.inverseMat4(this._scene.camera.ortho.matrix, this._inverseOrthoProjectMat);
            math.transposeMat4(this._scene.camera.perspective.matrix, this._transposedProjectMat);
            math.transposeMat4(this._scene.camera.ortho.matrix, this._transposedOrthoProjectMat);
            this._projMatDirty = false;
        }
    }

    _getInverseViewMat() {
        if (this._viewMatDirty) {
            math.inverseMat4(this._scene.camera.viewMatrix, this._inverseViewMat);
        }
        return this._inverseViewMat;
    }

    _getSceneDiagSize() {
        if (this._sceneDiagSizeDirty) {
            this._sceneDiagSize = math.getAABB3Diag(this._scene.aabb);
        }
        return this._sceneDiagSize;
    }

    _unprojectPerspective(canvasPos, worldPos) {

        const canvas = this._scene.canvas.canvas;
        const transposedProjectMat = this._getTransposedProjectMat();
        const Pt3 = transposedProjectMat.subarray(8, 12);
        const Pt4 = transposedProjectMat.subarray(12);
        const D = [0, 0, -this._getSceneDiagSize(), 1];
        const screenZ = math.dotVec4(D, Pt3) / math.dotVec4(D, Pt4);
        const inverseProjMat = this._getInverseProjectMat();
        const inverseViewMat = this._getInverseViewMat();
        const halfCanvasWidth = canvas.offsetWidth / 2.0;
        const halfCanvasHeight = canvas.offsetHeight / 2.0;

        screenPos[0] = (canvasPos[0] - halfCanvasWidth) / halfCanvasWidth;
        screenPos[1] = (canvasPos[1] - halfCanvasHeight) / halfCanvasHeight;
        screenPos[2] = screenZ;
        screenPos[3] = 1.0;

        math.mulMat4v4(inverseProjMat, screenPos, viewPos);
        math.mulVec3Scalar(viewPos, 1.0 / viewPos[3]); // Normalize homogeneous coord

        viewPos[3] = 1.0;
        viewPos[1] *= -1; // TODO: Why is this reversed?

        math.mulMat4v4(inverseViewMat, viewPos, worldPos);

        return worldPos;
    }

    _unprojectOrtho(canvasPos, worldPos) {

        const canvas = this._scene.canvas.canvas;
        const transposedProjectMat = this._getTransposedOrthoProjectMat();
        const Pt3 = transposedProjectMat.subarray(8, 12);
        const Pt4 = transposedProjectMat.subarray(12);
        const D = [0, 0, -this._getSceneDiagSize(), 1];
        const screenZ = math.dotVec4(D, Pt3) / math.dotVec4(D, Pt4);
        const inverseProjMat = this._getInverseOrthoProjectMat();
        const inverseViewMat = this._getInverseViewMat();
        const halfCanvasWidth = canvas.offsetWidth / 2.0;
        const halfCanvasHeight = canvas.offsetHeight / 2.0;

        screenPos[0] = (canvasPos[0] - halfCanvasWidth) / halfCanvasWidth;
        screenPos[1] = (canvasPos[1] - halfCanvasHeight) / halfCanvasHeight;
        screenPos[2] = screenZ;
        screenPos[3] = 1.0;

        math.mulMat4v4(inverseProjMat, screenPos, viewPos);
        math.mulVec3Scalar(viewPos, 1.0 / viewPos[3]); // Normalize homogeneous coord

        viewPos[3] = 1.0;
        viewPos[1] *= -1; // TODO: Why is this reversed?

        math.mulMat4v4(inverseViewMat, viewPos, worldPos);

        return worldPos;
    }

    destroy() {
        this._scene.camera.perspective.off(this._onCameraPerspectiveProjMatrix);
        this._scene.camera.ortho.off(this._onCameraOrthoProjMatrix);
        this._scene.camera.off(this._onCameraViewMatrix);
        this._scene.scene.off(this._onSceneBoundary);
    }
}

export {PanController};