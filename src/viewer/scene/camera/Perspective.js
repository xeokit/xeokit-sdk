import {math} from '../math/math.js';
import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';

/**
 * @desc Defines its {@link Camera}'s perspective projection using a field-of-view angle.
 *
 * * Located at {@link Camera#perspective}.
 * * Implicitly sets the left, right, top, bottom frustum planes using {@link Perspective#fov}.
 * * {@link Perspective#near} and {@link Perspective#far} specify the distances to the WebGL clipping planes.
 */
class Perspective extends Component {

    /**
     @private
     */
    get type() {
        return "Perspective";
    }

    /**
     * @constructor
     * @private
     */
    constructor(camera, cfg = {}) {

        super(camera, cfg);

        /**
         * The Camera this Perspective belongs to.
         *
         * @property camera
         * @type {Camera}
         * @final
         */
        this.camera = camera;

        this._state = new RenderState({
            matrix: math.mat4(),
            inverseMatrix: math.mat4(),
            transposedMatrix: math.mat4(),
            near: 0.1,
            far: 2000.0
        });

        this._inverseMatrixDirty = true;
        this._transposedMatrixDirty = true;

        this._fov = 60.0;

        // Recompute aspect from change in canvas size
        this._canvasResized = this.scene.canvas.on("boundary", this._needUpdate, this);

        this.fov = cfg.fov;
        this.fovAxis = cfg.fovAxis;
        this.near = cfg.near;
        this.far = cfg.far;
    }

    _update() {

        const WIDTH_INDEX = 2;
        const HEIGHT_INDEX = 3;
        const boundary = this.scene.viewport.boundary;
        const aspect = boundary[WIDTH_INDEX] / boundary[HEIGHT_INDEX];
        const fovAxis = this._fovAxis;

        let fov = this._fov;
        if (fovAxis === "x" || (fovAxis === "min" && aspect < 1) || (fovAxis === "max" && aspect > 1)) {
            fov = fov / aspect;
        }
        fov = Math.min(fov, 120);

        math.perspectiveMat4(fov * (Math.PI / 180.0), aspect, this._state.near, this._state.far, this._state.matrix);

        this._inverseMatrixDirty = true;
        this._transposedMatrixDirty = true;

        this.glRedraw();

        this.fire("matrix", this._state.matrix);
    }

    /**
     * Sets the Perspective's field-of-view angle (FOV).
     *
     * Fires an "fov" event on change.

     * Default value is ````60.0````.
     *
     * @param {Number} value New field-of-view.
     */
    set fov(value) {
        value = (value !== undefined && value !== null) ? value : 60.0;
        if (value === this._fov) {
            return;
        }
        this._fov = value;
        this._needUpdate(0); // Ensure matrix built on next "tick"
        this.fire("fov", this._fov);
    }

    /**
     * Gets the Perspective's field-of-view angle (FOV).
     *
     * Default value is ````60.0````.
     *
     * @returns {Number} Current field-of-view.
     */
    get fov() {
        return this._fov;
    }

    /**
     * Sets the Perspective's FOV axis.
     *
     * Options are ````"x"````, ````"y"```` or ````"min"````, to use the minimum axis.
     *
     * Fires an "fovAxis" event on change.

     * Default value ````"min"````.
     *
     * @param {String} value New FOV axis value.
     */
    set fovAxis(value) {
        value = value || "min";
        if (this._fovAxis === value) {
            return;
        }
        if (value !== "x" && value !== "y" && value !== "min") {
            this.error("Unsupported value for 'fovAxis': " + value + " - defaulting to 'min'");
            value = "min";
        }
        this._fovAxis = value;
        this._needUpdate(0); // Ensure matrix built on next "tick"
        this.fire("fovAxis", this._fovAxis);
    }

    /**
     * Gets the Perspective's FOV axis.
     *
     * Options are ````"x"````, ````"y"```` or ````"min"````, to use the minimum axis.
     *
     * Fires an "fovAxis" event on change.

     * Default value is ````"min"````.
     *
     * @returns {String} The current FOV axis value.
     */
    get fovAxis() {
        return this._fovAxis;
    }

    /**
     * Sets the position of the Perspective's near plane on the positive View-space Z-axis.
     *
     * Fires a "near" event on change.
     *
     * Default value is ````0.1````.
     *
     * @param {Number} value New Perspective near plane position.
     */
    set near(value) {
        const near = (value !== undefined && value !== null) ? value : 0.1;
        if (this._state.near === near) {
            return;
        }
        this._state.near = near;
        this._needUpdate(0); // Ensure matrix built on next "tick"
        this.fire("near", this._state.near);
    }

    /**
     * Gets the position of the Perspective's near plane on the positive View-space Z-axis.
     *
     * Fires an "emits" emits on change.
     *
     * Default value is ````0.1````.
     *
     * @returns The Perspective's near plane position.
     */
    get near() {
        return this._state.near;
    }

    /**
     * Sets the position of this Perspective's far plane on the positive View-space Z-axis.
     *
     * Fires a "far" event on change.
     *
     * @param {Number} value New Perspective far plane position.
     */
    set far(value) {
        const far = (value !== undefined && value !== null) ? value : 2000.0;
        if (this._state.far === far) {
            return;
        }
        this._state.far = far;
        this._needUpdate(0); // Ensure matrix built on next "tick"
        this.fire("far", this._state.far);
    }

    /**
     * Gets the position of this Perspective's far plane on the positive View-space Z-axis.
     *
     * @return {Number} The Perspective's far plane position.
     */
    get far() {
        return this._state.far;
    }

    /**
     * Gets the Perspective's projection transform matrix.
     *
     * Fires a "matrix" event on change.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @returns {Number[]} The Perspective's projection matrix.
     */
    get matrix() {
        if (this._updateScheduled) {
            this._doUpdate();
        }
        return this._state.matrix;
    }

    /**
     * Gets the inverse of {@link Perspective#matrix}.
     *
     * @returns {Number[]} The inverse of {@link Perspective#matrix}.
     */
    get inverseMatrix() {
        if (this._updateScheduled) {
            this._doUpdate();
        }
        if (this._inverseMatrixDirty) {
            math.inverseMat4(this._state.matrix, this._state.inverseMatrix);
            this._inverseMatrixDirty = false;
        }
        return this._state.inverseMatrix;
    }

    /**
     * Gets the transpose of {@link Perspective#matrix}.
     *
     * @returns {Number[]} The transpose of {@link Perspective#matrix}.
     */
    get transposedMatrix() {
        if (this._updateScheduled) {
            this._doUpdate();
        }
        if (this._transposedMatrixDirty) {
            math.transposeMat4(this._state.matrix, this._state.transposedMatrix);
            this._transposedMatrixDirty = false;
        }
        return this._state.transposedMatrix;
    }

    /**
     * Un-projects the given Canvas-space coordinates and Screen-space depth, using this Perspective projection.
     *
     * @param {Number[]} canvasPos Inputs 2D Canvas-space coordinates.
     * @param {Number} screenZ Inputs Screen-space Z coordinate.
     * @param {Number[]} screenPos Outputs 3D Screen/Clip-space coordinates.
     * @param {Number[]} viewPos Outputs un-projected 3D View-space coordinates.
     * @param {Number[]} worldPos Outputs un-projected 3D World-space coordinates.
     */
    unproject(canvasPos, screenZ, screenPos, viewPos, worldPos) {

        const canvas = this.scene.canvas.canvas;

        const halfCanvasWidth = canvas.offsetWidth / 2.0;
        const halfCanvasHeight = canvas.offsetHeight / 2.0;

        screenPos[0] = (canvasPos[0] - halfCanvasWidth) / halfCanvasWidth;
        screenPos[1] = (canvasPos[1] - halfCanvasHeight) / halfCanvasHeight;
        screenPos[2] = screenZ;
        screenPos[3] = 1.0;

        math.mulMat4v4(this.inverseMatrix, screenPos, viewPos);
        math.mulVec3Scalar(viewPos, 1.0 / viewPos[3]);

        viewPos[3] = 1.0;
        viewPos[1] *= -1;

        math.mulMat4v4(this.camera.inverseViewMatrix, viewPos, worldPos);

        return worldPos;
    }

    /** @private
     *
     */
    destroy() {
        super.destroy();
        this._state.destroy();
        this.scene.canvas.off(this._canvasResized);
    }
}

export {Perspective};