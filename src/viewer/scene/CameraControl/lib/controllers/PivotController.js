import {math} from "../../../math/math.js";

/** @private */
class PivotController {

    /**
     * Constructs a Pivoter.
     * @param scene
     */
    constructor(scene) {

        // Pivot math by: http://www.derschmale.com/

        this._scene = scene;
        this._pivotWorldPos = math.vec3();
        this._cameraOffset = math.vec3();
        this._azimuth = 0;
        this._polar = 0;
        this._radius = 0;
        this._pivoting = false; // True while pivoting
        this._shown = false;

        this._pivotViewPos = math.vec4();
        this._pivotProjPos = math.vec4();
        this._pivotCanvasPos = math.vec2();
        this._cameraDirty = true;

        this._scene.camera.on("viewMatrix", () => {
            this._cameraDirty = true;
        });

        this._scene.camera.on("projMatrix", () => {
            this._cameraDirty = true;
        });

        this._scene.on("tick", () => {
            this.updatePivotElement();
        });
    }

    updatePivotElement() {

        const camera = this._scene.camera;
        const canvas = this._scene.canvas;

        if (this._pivoting && this._cameraDirty) {

            math.transformPoint3(camera.viewMatrix, this._pivotWorldPos, this._pivotViewPos);
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
                this._pivotElement.style.left = (Math.floor(canvasBoundingRect.left + this._pivotCanvasPos[0]) - 12) + "px";
                this._pivotElement.style.top = (Math.floor(canvasBoundingRect.top + this._pivotCanvasPos[1]) - 12) + "px";
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
     *
     * @param {Number[]} worldPos The World-space pivot position.
     */
    startPivot(worldPos) {

        if (worldPos) { // Use last pivotPoint by default
            this._pivotWorldPos.set(worldPos);
        }

        const camera = this._scene.camera;

        let lookat = math.lookAtMat4v(camera.eye, camera.look, camera.worldUp);
        math.transformPoint3(lookat, this._pivotWorldPos, this._cameraOffset);

        this._cameraOffset[2] += math.distVec3(camera.eye, this._pivotWorldPos);

        lookat = math.inverseMat4(lookat);

        const offset = math.transformVec3(lookat, this._cameraOffset);
        const diff = math.vec3();

        math.subVec3(camera.eye, this._pivotWorldPos, diff);
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

    /**
     * Returns true if we are currently pivoting.
     *
     * @returns {boolean}
     */
    getPivoting() {
        return this._pivoting;
    }

    /**
     * Sets the position we're pivoting about.
     *
     * @param {Number[]} worldPos The new World-space pivot position.
     */
    setPivotPos(worldPos) {
        this._pivotWorldPos.set(worldPos);
    }

    /**
     * Gets the current position we're pivoting about.
     * @returns {Number[]} The current World-space pivot position.
     */
    getPivotPos() {
        return this._pivotWorldPos;
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
        math.addVec3(pos, this._pivotWorldPos);
        let lookat = math.lookAtMat4v(pos, this._pivotWorldPos, camera.worldUp);
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
                console.log("timeout");
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
}


export {PivotController};