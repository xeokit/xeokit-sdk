import {math} from '../math/math.js';
import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';

/**
 * @desc Defines a custom projection for a {@link Camera} as a custom 4x4 matrix..
 *
 * Located at {@link Camera#customProjection}.
 */
class CustomProjection extends Component {

    /**
     * @private
     */
    get type() {
        return "CustomProjection";
    }

    /**
     * @constructor
     * @private
     */
    constructor(camera, cfg = {}) {

        super(camera, cfg);

        /**
         * The Camera this CustomProjection belongs to.
         *
         * @property camera
         * @type {Camera}
         * @final
         */
        this.camera = camera;

        this._state = new RenderState({
            matrix: math.mat4(),
            inverseMatrix: math.mat4(),
            transposedMatrix: math.mat4()
        });

        this._inverseMatrixDirty = true;
        this._transposedMatrixDirty = false;

        this.matrix = cfg.matrix;
    }

    /**
     * Sets the CustomProjection's projection transform matrix.
     *
     * Fires a "matrix" event on change.

     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @param {Number[]} matrix New value for the CustomProjection's matrix.
     */
    set matrix(matrix) {
        this._state.matrix.set(matrix || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        this._inverseMatrixDirty = true;
        this._transposedMatrixDirty = true;
        this.glRedraw();
        this.fire("far", this._state.matrix);
    }

    /**
     * Gets the CustomProjection's projection transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @return {Number[]} New value for the CustomProjection's matrix.
     */
    get matrix() {
        return this._state.matrix;
    }

    /**
     * Gets the inverse of {@link CustomProjection#matrix}.
     *
     * @returns {Number[]} The inverse of {@link CustomProjection#matrix}.
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
     * Gets the transpose of {@link CustomProjection#matrix}.
     *
     * @returns {Number[]} The transpose of {@link CustomProjection#matrix}.
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
     * Un-projects the given Canvas-space coordinates, using this CustomProjection.
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
    }
}

export {CustomProjection};