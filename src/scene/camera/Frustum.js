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
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type {String}
     @final
     */
    get type() {
        return "Frustum";
    }

    /**
     * @constructor
     * @private
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._state = new RenderState({
            matrix: math.mat4()
        });

        this._left = -1.0;
        this._right = 1.0;
        this._bottom = -1.0;
        this._top = 1.0;
        this._near = 0.1;
        this._far = 5000.0;

        // Set component properties

        this.left = cfg.left;
        this.right = cfg.right;
        this.bottom = cfg.bottom;
        this.top = cfg.top;
        this.near = cfg.near;
        this.far = cfg.far;
    }

    _update() {
        math.frustumMat4(this._left, this._right, this._bottom, this._top, this._near, this._far, this._state.matrix);
        this.glRedraw();
        this.fire("matrix", this._state.matrix);
    }

    /**
     Position of this Frustum's left plane on the View-space X-axis.

     Fires a {@link Frustum/left:event} event on change.

     @property left
     @default -1.0
     @type {Number}
     */

    set left(value) {
        this._left = (value !== undefined && value !== null) ? value : -1.0;
        this._needUpdate();
        /**
         Fired whenever this Frustum's {@link Frustum/left} property changes.

         @event left
         @param value The property's new value
         */
        this.fire("left", this._left);
    }

    get left() {
        return this._left;
    }

    /**
     Position of this Frustum's right plane on the View-space X-axis.

     Fires a {@link Frustum/right:event} event on change.

     @property right
     @default 1.0
     @type {Number}
     */
    set right(value) {
        this._right = (value !== undefined && value !== null) ? value : 1.0;
        this._needUpdate();
        /**
         Fired whenever this Frustum's {@link Frustum/right} property changes.

         @event right
         @param value The property's new value
         */
        this.fire("right", this._right);
    }

    get right() {
        return this._right;
    }

    /**
     Position of this Frustum's top plane on the View-space Y-axis.

     Fires a {@link Frustum/top:event} event on change.

     @property top
     @default 1.0
     @type {Number}
     */
    set top(value) {
        this._top = (value !== undefined && value !== null) ? value : 1.0;
        this._needUpdate();
        /**
         Fired whenever this Frustum's   {@link Frustum/top} property changes.

         @event top
         @param value The property's new value
         */
        this.fire("top", this._top);
    }

    get top() {
        return this._top;
    }

    /**
     Position of this Frustum's bottom plane on the View-space Y-axis.

     Fires a {@link Frustum/bottom:event} event on change.

     @property bottom
     @default -1.0
     @type {Number}
     */
    set bottom(value) {
        this._bottom = (value !== undefined && value !== null) ? value : -1.0;
        this._needUpdate();
        /**
         Fired whenever this Frustum's   {@link Frustum/bottom} property changes.

         @event bottom
         @param value The property's new value
         */
        this.fire("bottom", this._bottom);
    }

    get bottom() {
        return this._bottom;
    }

    /**
     Position of this Frustum's near plane on the positive View-space Z-axis.

     Fires a {@link Frustum/near:event} event on change.

     @property near
     @default 0.1
     @type {Number}
     */
    set near(value) {
        this._near = (value !== undefined && value !== null) ? value : 0.1;
        this._needUpdate();
        /**
         Fired whenever this Frustum's {@link Frustum#near} property changes.

         @event near
         @param value The property's new value
         */
        this.fire("near", this._near);
    }

    get near() {
        return this._near;
    }

    /**
     Position of this Frustum's far plane on the positive View-space Z-axis.

     Fires a {@link Frustum/far:event} event on change.

     @property far
     @default 10000.0
     @type {Number}
     */
    set far(value) {
        this._far = (value !== undefined && value !== null) ? value : 10000.0;
        this._needUpdate();
        /**
         Fired whenever this Frustum's  {@link Frustum#far} property changes.

         @event far
         @param value The property's new value
         */
        this.fire("far", this._far);
    }

    get far() {
        return this._far;
    }

    /**
     The Frustum's projection transform matrix.

     Fires a {@link Frustum/matrix:event} event on change.

     @property matrix
     @default [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
     @type {Number[]}
     */
    get matrix() {
        if (this._updateScheduled) {
            this._doUpdate();
        }
        return this._state.matrix;
    }

    destroy() {
        super.destroy();
        this._state.destroy();
        super.destroy();
    }
}

export {Frustum};