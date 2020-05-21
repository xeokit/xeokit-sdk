import {math} from "../../../math/math.js";

const screenPos = math.vec4();
const viewPos = math.vec4();
const worldPos = math.vec4();
const tempVec3a = math.vec3();

/**
 * @private
 */
class PanController {

    constructor(scene) {

        this._scene = scene;
        this._inverseProjectMat = math.mat4();
        this._transposedProjectMat = math.mat4();
        this._inverseViewMat = math.mat4();
        this._projMatDirty = true;
        this._viewMatDirty = true;
        this._sceneDiagSizeDirty = true;
        this._sceneDiagSize = 1;

        this._onCameraProjMatrix = this._scene.camera.on("projMatrix", () => {
            this._projMatDirty = true;
        });

        this._onCameraViewMatrix = this._scene.camera.on("viewMatrix", () => {
            this._viewMatDirty = true;
        });

        this._onSceneBoundary = this._scene.scene.on("boundary", () => {
            this._sceneDiagSizeDirty = true;
        });
    }

    _getInverseProjectMat() {
        if (this._projMatDirty) {
            math.inverseMat4(this._scene.camera.projMatrix, this._inverseProjectMat);
        }
        return this._inverseProjectMat;
    }

    _getTransposedProjectMat() {
        if (this._projMatDirty) {
            math.transposeMat4(this._scene.camera.projMatrix, this._transposedProjectMat);
        }
        return this._transposedProjectMat;
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

    _unproject(canvasPos, screenZ, viewPos, worldPos) {
        const canvas = this._scene.canvas.canvas;
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
        math.mulMat4v4(inverseViewMat,viewPos, worldPos);
    }

    /**
     * Pans the Camera towards the given 2D canvas coordinates.
     * @param canvasPos
     * @param dollyDist
     */
    dollyToCanvasPos(canvasPos, dollyDist) {

        // Get last two columns of projection matrix
        const transposedProjectMat = this._getTransposedProjectMat();
        const Pt3 = transposedProjectMat.subarray(8, 12);
        const Pt4 = transposedProjectMat.subarray(12);
        const D = [0, 0, -this._getSceneDiagSize(), 1];
        const screenZ = math.dotVec4(D, Pt3) / math.dotVec4(D, Pt4);

        this._unproject(canvasPos, screenZ, viewPos, worldPos);

        this.dollyToWorldPos(worldPos, dollyDist);
    }

    /**
     * Pans the camera towards the given 3D World-space coordinates.
     * @param worldPos
     * @param dollyDist
     */
    dollyToWorldPos(worldPos, dollyDist) {
        
        const camera = this._scene.camera;
        const eyeToWorldPosVec = math.subVec3(worldPos, camera.eye, tempVec3a);
        
        const dist = math.lenVec3(eyeToWorldPosVec);
        
        if (dist < dollyDist) {
            return;
        }
        
        math.normalizeVec3(eyeToWorldPosVec);
        
        const px = eyeToWorldPosVec[0] * dollyDist;
        const py = eyeToWorldPosVec[1] * dollyDist;
        const pz = eyeToWorldPosVec[2] * dollyDist;
        
        const eye = camera.eye;
        const look = camera.look;
        
        camera.eye = [eye[0] + px, eye[1] + py, eye[2] + pz];
        camera.look = [look[0] + px, look[1] + py, look[2] + pz];
    }

    destroy() {
        this._scene.camera.off(this._onCameraProjMatrix);
        this._scene.camera.off(this._onCameraViewMatrix);
        this._scene.scene.off(this._onSceneBoundary);
    }
}

export {PanController};