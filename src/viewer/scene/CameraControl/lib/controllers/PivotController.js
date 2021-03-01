import {math} from "../../../math/math.js";

const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

const tempVec4a = math.vec4();
const tempVec4b = math.vec4();
const tempVec4c = math.vec4();


/** @private */
class PivotController {

    /**
     * @private
     */
    constructor(scene, configs) {

        // Pivot math by: http://www.derschmale.com/

        this._scene = scene;
        this._configs = configs;
        this._pivotWorldPos = math.vec3();
        this._cameraOffset = math.vec3();
        this._azimuth = 0;
        this._polar = 0;
        this._radius = 0;
        this._pivotPosSet = false; // Initially false, true as soon as _pivotWorldPos has been set to some value
        this._pivoting = false; // True while pivoting
        this._shown = false;

        this._pivotViewPos = math.vec4();
        this._pivotProjPos = math.vec4();
        this._pivotCanvasPos = math.vec2();
        this._cameraDirty = true;

        this._onViewMatrix = this._scene.camera.on("viewMatrix", () => {
            this._cameraDirty = true;
        });

        this._onProjMatrix = this._scene.camera.on("projMatrix", () => {
            this._cameraDirty = true;
        });

        this._onTick = this._scene.on("tick", () => {
            this.updatePivotElement();
        });
    }

    updatePivotElement() {

        const camera = this._scene.camera;
        const canvas = this._scene.canvas;

        if (this._pivoting && this._cameraDirty) {

            math.transformPoint3(camera.viewMatrix, this.getPivotPos(), this._pivotViewPos);
            this._pivotViewPos[3] = 1;
            math.transformPoint4(camera.projMatrix, this._pivotViewPos, this._pivotProjPos);

            const canvasAABB = canvas.boundary;
            const canvasWidth = canvasAABB[2];
            const canvasHeight = canvasAABB[3];

            this._pivotCanvasPos[0] = Math.floor((1 + this._pivotProjPos[0] / this._pivotProjPos[3]) * canvasWidth / 2);
            this._pivotCanvasPos[1] = Math.floor((1 - this._pivotProjPos[1] / this._pivotProjPos[3]) * canvasHeight / 2);

            const canvasElem = canvas.canvas;
            const canvasBoundingRect = canvasElem.getBoundingClientRect();

            if (this._pivotElement) {
                this._pivotElement.style.left = (Math.floor(canvasBoundingRect.left + this._pivotCanvasPos[0]) - (this._pivotElement.clientWidth / 2) + window.scrollX) + "px";
                this._pivotElement.style.top = (Math.floor(canvasBoundingRect.top + this._pivotCanvasPos[1]) - (this._pivotElement.clientHeight / 2) + window.scrollY) + "px";
            }
            this._cameraDirty = false;
        }
    }

    /**
     * Sets the HTML DOM element that will represent the pivot position.
     *
     * @param pivotElement
     */
    setPivotElement(pivotElement) {
        this._pivotElement = pivotElement;
    }

    /**
     * Begins pivoting.
     */
    startPivot() {

        if (this._cameraLookingDownwards()) {
            this._pivoting = false;
            return false;
        }

        const camera = this._scene.camera;

        let lookat = math.lookAtMat4v(camera.eye, camera.look, camera.worldUp);
        math.transformPoint3(lookat, this.getPivotPos(), this._cameraOffset);

        const pivotPos = this.getPivotPos();
        this._cameraOffset[2] += math.distVec3(camera.eye, pivotPos);

        lookat = math.inverseMat4(lookat);

        const offset = math.transformVec3(lookat, this._cameraOffset);
        const diff = math.vec3();

        math.subVec3(camera.eye, pivotPos, diff);
        math.addVec3(diff, offset);

        if (camera.zUp) {
            const t = diff[1];
            diff[1] = diff[2];
            diff[2] = t;
        }

        this._radius = math.lenVec3(diff);
        this._polar = Math.acos(diff[1] / this._radius);
        this._azimuth = Math.atan2(diff[0], diff[2]);
        this._pivoting = true;
    }

    _cameraLookingDownwards() { // Returns true if angle between camera viewing direction and World-space "up" axis is too small
        const camera = this._scene.camera;
        const forwardAxis = math.normalizeVec3(math.subVec3(camera.look, camera.eye, tempVec3a));
        const rightAxis = math.cross3Vec3(forwardAxis, camera.worldUp, tempVec3b);
        let rightAxisLen = math.sqLenVec3(rightAxis);
        return (rightAxisLen <= 0.0001);
    }

    /**
     * Returns true if we are currently pivoting.
     *
     * @returns {boolean}
     */
    getPivoting() {
        return this._pivoting;
    }

    /**
     * Sets a 3D World-space position to pivot about.
     *
     * @param {Number[]} worldPos The new World-space pivot position.
     */
    setPivotPos(worldPos) {
        this._pivotWorldPos.set(worldPos);
        this._pivotPosSet = true;
    }

    /**
     * Sets the pivot position to the 3D projection of the given 2D canvas coordinates on a sphere centered
     * at the viewpoint. The radius of the sphere is configured via {@link CameraControl#smartPivot}.
     *
     * @param canvasPos
     */
    setCanvasPivotPos(canvasPos) {
        const camera = this._scene.camera;
        const pivotShereRadius = Math.abs(math.distVec3(this._scene.center, camera.eye));
        const transposedProjectMat = camera.project.transposedMatrix;
        const Pt3 = transposedProjectMat.subarray(8, 12);
        const Pt4 = transposedProjectMat.subarray(12);
        const D = [0, 0, -1.0, 1];
        const screenZ = math.dotVec4(D, Pt3) / math.dotVec4(D, Pt4);
        const worldPos = tempVec4a;
        camera.project.unproject(canvasPos, screenZ, tempVec4b, tempVec4c, worldPos);
        const eyeWorldPosVec = math.normalizeVec3(math.subVec3(worldPos, camera.eye, tempVec3a));
        const posOnSphere = math.addVec3(camera.eye, math.mulVec3Scalar(eyeWorldPosVec, pivotShereRadius, tempVec3b), tempVec3c);
        this.setPivotPos(posOnSphere);
    }

    /**
     * Gets the current position we're pivoting about.
     * @returns {Number[]} The current World-space pivot position.
     */
    getPivotPos() {
        return (this._pivotPosSet) ? this._pivotWorldPos : this._scene.camera.look; // Avoid pivoting about [0,0,0] by default
    }

    /**
     * Continues to pivot.
     *
     * @param {Number} yawInc Yaw rotation increment.
     * @param {Number} pitchInc Pitch rotation increment.
     */
    continuePivot(yawInc, pitchInc) {
        if (!this._pivoting) {
            return;
        }
        if (yawInc === 0 && pitchInc === 0) {
            return;
        }
        const camera = this._scene.camera;
        var dx = -yawInc;
        const dy = -pitchInc;
        if (camera.worldUp[2] === 1) {
            dx = -dx;
        }
        this._azimuth += -dx * .01;
        this._polar += dy * .01;
        this._polar = math.clamp(this._polar, .001, Math.PI - .001);
        const pos = [
            this._radius * Math.sin(this._polar) * Math.sin(this._azimuth),
            this._radius * Math.cos(this._polar),
            this._radius * Math.sin(this._polar) * Math.cos(this._azimuth)
        ];
        if (camera.worldUp[2] === 1) {
            const t = pos[1];
            pos[1] = pos[2];
            pos[2] = t;
        }
        // Preserve the eye->look distance, since in xeokit "look" is the point-of-interest, not the direction vector.
        const eyeLookLen = math.lenVec3(math.subVec3(camera.look, camera.eye, math.vec3()));
        const pivotPos = this.getPivotPos();
        math.addVec3(pos, pivotPos);
        let lookat = math.lookAtMat4v(pos, pivotPos, camera.worldUp);
        lookat = math.inverseMat4(lookat);
        const offset = math.transformVec3(lookat, this._cameraOffset);
        lookat[12] -= offset[0];
        lookat[13] -= offset[1];
        lookat[14] -= offset[2];
        const zAxis = [lookat[8], lookat[9], lookat[10]];
        camera.eye = [lookat[12], lookat[13], lookat[14]];
        math.subVec3(camera.eye, math.mulVec3Scalar(zAxis, eyeLookLen), camera.look);
        camera.up = [lookat[4], lookat[5], lookat[6]];
        this.showPivot();
    }

    /**
     * Shows the pivot position.
     *
     * Only works if we set an  HTML DOM element to represent the pivot position.
     */
    showPivot() {
        if (this._shown) {
            return;
        }
        if (this._hideTimeout !== null) {
            window.clearTimeout(this._hideTimeout);
            this._hideTimeout = null;
        }
        if (this._pivotElement) {
            this.updatePivotElement();
            this._pivotElement.style.visibility = "visible";
            this._shown = true;
            this._hideTimeout = window.setTimeout(() => {
                this.hidePivot();
            }, 1000);
        }
    }

    /**
     * Hides the pivot position.
     *
     * Only works if we set an  HTML DOM element to represent the pivot position.
     */
    hidePivot() {
        if (!this._shown) {
            return;
        }
        if (this._hideTimeout !== null) {
            window.clearTimeout(this._hideTimeout);
            this._hideTimeout = null;
        }
        if (this._pivotElement) {
            this._pivotElement.style.visibility = "hidden";
        }
        this._shown = false;
    }

    /**
     * Finishes pivoting.
     */
    endPivot() {
        this._pivoting = false;
    }

    destroy() {
        this._scene.camera.off(this._onViewMatrix);
        this._scene.camera.off(this._onProjMatrix);
        this._scene.off(this._onTick);
    }
}


export {PivotController};
