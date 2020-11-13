import {math} from "../../../math/math.js";

const screenPos = math.vec4();
const viewPos = math.vec4();
const worldPos = math.vec4();

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
     * Dollys the camera towards the given coordinates.
     *
     * @param worldPos World position we're dollying towards
     * @param canvasPos Current mouse canvas position
     * @param dollyDelta Dollying distance
     */
    dolly(worldPos, canvasPos, dollyDelta) {

        const camera = this._scene.camera;

        let dolliedThroughSurface = false;

        if (camera.projection === "perspective") {

            camera.ortho.scale = camera.ortho.scale - dollyDelta;

            dolliedThroughSurface = this._dollyToWorldPos(worldPos, dollyDelta);

        } else if (camera.projection === "ortho") {

            // - set ortho scale, getting the unprojected canvasPos before and after, get that difference in a vector;
            // - get the vector in which we're dollying;
            // - add both vectors to camera eye and look.

            const worldPos1 = this._unprojectOrtho(canvasPos, viewPos, tempVec4a);

            camera.ortho.scale = camera.ortho.scale - dollyDelta;
            camera.ortho._update(); // HACK

            const worldPos2 = this._unprojectOrtho(canvasPos, viewPos, tempVec4b);
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

    _unprojectPerspective(canvasPos, viewPos, worldPos) {

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
    }

    _unprojectOrtho(canvasPos, viewPos, worldPos) {

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

    _dollyToWorldPos(worldPos, dollyDelta) {

        const camera = this._scene.camera;
        const eyeToWorldPosVec = math.subVec3(worldPos, camera.eye, tempVec3a);
        const eyeWorldPosDist = math.lenVec3(eyeToWorldPosVec);

        let dolliedThroughSurface = false;

        if (eyeWorldPosDist < dollyDelta) {
            dolliedThroughSurface = true;
        }

        math.normalizeVec3(eyeToWorldPosVec);

        const px = eyeToWorldPosVec[0] * dollyDelta;
        const py = eyeToWorldPosVec[1] * dollyDelta;
        const pz = eyeToWorldPosVec[2] * dollyDelta;

        const eye = camera.eye;
        const look = camera.look;

        camera.eye = [eye[0] + px, eye[1] + py, eye[2] + pz];
        camera.look = [look[0] + px, look[1] + py, look[2] + pz];

        return dolliedThroughSurface;
    }

    destroy() {
        this._scene.camera.perspective.off(this._onCameraPerspectiveProjMatrix);
        this._scene.camera.ortho.off(this._onCameraOrthoProjMatrix);
        this._scene.camera.off(this._onCameraViewMatrix);
        this._scene.scene.off(this._onSceneBoundary);
    }
}

export {PanController};