import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {math} from '../math/math.js';

/**
 * @desc Defines its {@link Camera}'s orthographic projection as a box-shaped view volume.
 *
 * * Located at {@link Camera#ortho}.
 * * Works like Blender's orthographic projection, where the positions of the left, right, top and bottom planes are implicitly
 * indicated with a single {@link Ortho#scale} property, which causes the frustum to be symmetrical on X and Y axis, large enough to
 * contain the number of units given by {@link Ortho#scale}.
 * * {@link Ortho#near} and {@link Ortho#far} indicated the distances to the WebGL clipping planes.
 */
class Ortho extends Component {

    /**
     @private
     */
    get type() {
        return "Ortho";
    }

    /**
     * @constructor
     * @private
     */
    constructor(camera, cfg = {}) {

        super(camera, cfg);

        /**
         * The Camera this Ortho belongs to.
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

        this.scale = cfg.scale;
        this.near = cfg.near;
        this.far = cfg.far;

        this._onCanvasBoundary = this.scene.canvas.on("boundary", this._needUpdate, this);
    }

    _update() {

        const WIDTH_INDEX = 2;
        const HEIGHT_INDEX = 3;

        const scene = this.scene;
        const scale = this._scale;
        const halfSize = 0.5 * scale;

        const boundary = scene.viewport.boundary;
        const boundaryWidth = boundary[WIDTH_INDEX];
        const boundaryHeight = boundary[HEIGHT_INDEX];
        const aspect = boundaryWidth / boundaryHeight;

        let left;
        let right;
        let top;
        let bottom;

        if (boundaryWidth > boundaryHeight) {
            left = -halfSize;
            right = halfSize;
            top = halfSize / aspect;
            bottom = -halfSize / aspect;

        } else {
            left = -halfSize * aspect;
            right = halfSize * aspect;
            top = halfSize;
            bottom = -halfSize;
        }

        math.orthoMat4c(left, right, bottom, top, this._state.near, this._state.far, this._state.matrix);

        this._inverseMatrixDirty = true;
        this._transposedMatrixDirty = true;

        this.glRedraw();

        this.fire("matrix", this._state.matrix);
    }


    /**
     * Sets scale factor for this Ortho's extents on X and Y axis.
     *
     * Clamps to minimum value of ````0.01```.
     *
     * Fires a "scale" event on change.
     *
     * Default value is ````1.0````
     * @param {Number} value New scale value.
     */
    set scale(value) {
        if (value === undefined || value === null) {
            value = 1.0;
        }
        if (value <= 0) {
            value = 0.01;
        }
        this._scale = value;
        this._needUpdate(0);
        this.fire("scale", this._scale);
    }

    /**
     * Gets scale factor for this Ortho's extents on X and Y axis.
     *
     * Clamps to minimum value of ````0.01```.
     *
     * Default value is ````1.0````
     *
     * @returns {Number} New Ortho scale value.
     */
    get scale() {
        return this._scale;
    }

    /**
     * Sets the position of the Ortho's near plane on the positive View-space Z-axis.
     *
     * Fires a "near" emits on change.
     *
     * Default value is ````0.1````.
     *
     * @param {Number} value New Ortho near plane position.
     */
    set near(value) {
        const near = (value !== undefined && value !== null) ? value : 0.1;
        if (this._state.near === near) {
            return;
        }
        this._state.near = near;
        this._needUpdate(0);
        this.fire("near", this._state.near);
    }

    /**
     * Gets the position of the Ortho's near plane on the positive View-space Z-axis.
     *
     * Default value is ````0.1````.
     *
     * @returns {Number} New Ortho near plane position.
     */
    get near() {
        return this._state.near;
    }

    /**
     * Sets the position of the Ortho's far plane on the positive View-space Z-axis.
     *
     * Fires a "far" event on change.
     *
     * Default value is ````2000.0````.
     *
     * @param {Number} value New far ortho plane position.
     */
    set far(value) {
        const far = (value !== undefined && value !== null) ? value : 2000.0;
        if (this._state.far === far) {
            return;
        }
        this._state.far = far;
        this._needUpdate(0);
        this.fire("far", this._state.far);
    }

    /**
     * Gets the position of the Ortho's far plane on the positive View-space Z-axis.
     *
     * Default value is ````10000.0````.
     *
     * @returns {Number} New far ortho plane position.
     */
    get far() {
        return this._state.far;
    }

    /**
     * Gets the Ortho's projection transform matrix.
     *
     * Fires a "matrix" event on change.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @returns {Number[]} The Ortho's projection matrix.
     */
    get matrix() {
        if (this._updateScheduled) {
            this._doUpdate();
        }
        return this._state.matrix;
    }

    /**
     * Gets the inverse of {@link Ortho#matrix}.
     *
     * @returns {Number[]} The inverse of {@link Ortho#matrix}.
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
     * Gets the transpose of {@link Ortho#matrix}.
     *
     * @returns {Number[]} The transpose of {@link Ortho#matrix}.
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
     * Un-projects the given Canvas-space coordinates, using this Ortho projection.
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
        this.scene.canvas.off(this._onCanvasBoundary);
    }
}

export {Ortho};