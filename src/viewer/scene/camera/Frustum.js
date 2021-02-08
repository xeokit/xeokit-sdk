import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {math} from '../math/math.js';

/**
 * @desc Defines its {@link Camera}'s perspective projection as a frustum-shaped view volume.
 *
 * * Located at {@link Camera#frustum}.
 * * Allows to explicitly set the positions of the left, right, top, bottom, near and far planes, which is useful for asymmetrical view volumes, such as for stereo viewing.
 * * {@link Frustum#near} and {@link Frustum#far} specify the distances to the WebGL clipping planes.
 */
class Frustum extends Component {

    /**
     @private
     */
    get type() {
        return "Frustum";
    }

    /**
     * @constructor
     * @private
     */
    constructor(camera, cfg = {}) {

        super(camera, cfg);

        /**
         * The Camera this Frustum belongs to.
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
            far: 10000.0
        });

        this._left = -1.0;
        this._right = 1.0;
        this._bottom = -1.0;
        this._top = 1.0;

        this._inverseMatrixDirty = true;
        this._transposedMatrixDirty = true;

        // Set component properties

        this.left = cfg.left;
        this.right = cfg.right;
        this.bottom = cfg.bottom;
        this.top = cfg.top;
        this.near = cfg.near;
        this.far = cfg.far;
    }

    _update() {

        math.frustumMat4(this._left, this._right, this._bottom, this._top, this._state.near, this._state.far, this._state.matrix);

        this._inverseMatrixDirty = true;
        this._transposedMatrixDirty = true;

        this.glRedraw();

        this.fire("matrix", this._state.matrix);
    }

    /**
     * Sets the position of the Frustum's left plane on the View-space X-axis.
     *
     * Fires a {@link Frustum#left:emits} emits on change.
     *
     * @param {Number} value New left frustum plane position.
     */
    set left(value) {
        this._left = (value !== undefined && value !== null) ? value : -1.0;
        this._needUpdate(0);
        this.fire("left", this._left);
    }

    /**
     * Gets the position of the Frustum's left plane on the View-space X-axis.
     *
     * @return {Number} Left frustum plane position.
     */
    get left() {
        return this._left;
    }

    /**
     * Sets the position of the Frustum's right plane on the View-space X-axis.
     *
     * Fires a {@link Frustum#right:emits} emits on change.
     *
     * @param {Number} value New right frustum plane position.
     */
    set right(value) {
        this._right = (value !== undefined && value !== null) ? value : 1.0;
        this._needUpdate(0);
        this.fire("right", this._right);
    }

    /**
     * Gets the position of the Frustum's right plane on the View-space X-axis.
     *
     * Fires a {@link Frustum#right:emits} emits on change.
     *
     * @return {Number} Right frustum plane position.
     */
    get right() {
        return this._right;
    }

    /**
     * Sets the position of the Frustum's top plane on the View-space Y-axis.
     *
     * Fires a {@link Frustum#top:emits} emits on change.
     *
     * @param {Number} value New top frustum plane position.
     */
    set top(value) {
        this._top = (value !== undefined && value !== null) ? value : 1.0;
        this._needUpdate(0);
        this.fire("top", this._top);
    }

    /**
     * Gets the position of the Frustum's top plane on the View-space Y-axis.
     *
     * Fires a {@link Frustum#top:emits} emits on change.
     *
     * @return {Number} Top frustum plane position.
     */
    get top() {
        return this._top;
    }

    /**
     * Sets the position of the Frustum's bottom plane on the View-space Y-axis.
     *
     * Fires a {@link Frustum#bottom:emits} emits on change.
     *
     * @emits {"bottom"} event with the value of this property whenever it changes.
     *
     * @param {Number} value New bottom frustum plane position.
     */
    set bottom(value) {
        this._bottom = (value !== undefined && value !== null) ? value : -1.0;
        this._needUpdate(0);
        this.fire("bottom", this._bottom);
    }

    /**
     * Gets the position of the Frustum's bottom plane on the View-space Y-axis.
     *
     * Fires a {@link Frustum#bottom:emits} emits on change.
     *
     * @return {Number} Bottom frustum plane position.
     */
    get bottom() {
        return this._bottom;
    }

    /**
     * Sets the position of the Frustum's near plane on the positive View-space Z-axis.
     *
     * Fires a {@link Frustum#near:emits} emits on change.
     *
     * Default value is ````0.1````.
     *
     * @param {Number} value New Frustum near plane position.
     */
    set near(value) {
        this._state.near = (value !== undefined && value !== null) ? value : 0.1;
        this._needUpdate(0);
        this.fire("near", this._state.near);
    }

    /**
     * Gets the position of the Frustum's near plane on the positive View-space Z-axis.
     *
     * Fires a {@link Frustum#near:emits} emits on change.
     *
     * Default value is ````0.1````.
     *
     * @return {Number} Near frustum plane position.
     */
    get near() {
        return this._state.near;
    }

    /**
     * Sets the position of the Frustum's far plane on the positive View-space Z-axis.
     *
     * Fires a {@link Frustum#far:emits} emits on change.
     *
     * Default value is ````10000.0````.
     *
     * @param {Number} value New far frustum plane position.
     */
    set far(value) {
        this._state.far = (value !== undefined && value !== null) ? value : 10000.0;
        this._needUpdate(0);
        this.fire("far", this._state.far);
    }

    /**
     * Gets the position of the Frustum's far plane on the positive View-space Z-axis.
     *
     * Default value is ````10000.0````.
     *
     * @return {Number} Far frustum plane position.
     */
    get far() {
        return this._state.far;
    }

    /**
     * Gets the Frustum's projection transform matrix.
     *
     * Fires a {@link Frustum#matrix:emits} emits on change.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @returns {Number[]} The Frustum's projection matrix matrix.
     */
    get matrix() {
        if (this._updateScheduled) {
            this._doUpdate();
        }
        return this._state.matrix;
    }

    /**
     * Gets the inverse of {@link Frustum#matrix}.
     *
     * @returns {Number[]} The inverse orthographic projection matrix.
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
     * Gets the transpose of {@link Frustum#matrix}.
     *
     * @returns {Number[]} The transpose of {@link Frustum#matrix}.
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
     * Un-projects the given Canvas-space coordinates, using this Frustum projection.
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
        super.destroy();
    }
}

export {Frustum};