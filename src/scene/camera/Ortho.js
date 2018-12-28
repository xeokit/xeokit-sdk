
import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {math} from '../math/math.js';

/**
 * @desc Defines its {@link Camera}'s orthographic projection as a box-shaped view volume.
 *
 * * Located at {@link Camera#frustum}.
 * * Works like Blender's orthographic projection, where the positions of the left, right, top and bottom planes are implicitly
 * indicated with a single {@link Ortho#scale} property, which causes the frustum to be symmetrical on X and Y axis, large enough to
 * contain the number of units given by {@link Ortho#scale}.
 * * {@link Ortho#near} and {@link Ortho#far} indicated the distances to the WebGL clipping planes.
 */
class Ortho extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "Ortho";
    }

    /**
     * @constructor
     * @private
     */
    constructor(owner, cfg={}) {

        super(owner, cfg);

        this._state = new RenderState({
            matrix: math.mat4()
        });

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

        math.orthoMat4c(left, right, bottom, top, this._near, this._far, this._state.matrix);

        this.glRedraw();

        this.fire("matrix", this._state.matrix);
    }


    /**
     Scale factor for this Ortho's extents on X and Y axis.

     Clamps to minimum value of ````0.01```.

     Fires a {@link Ortho#scale:event} event on change.

     @property scale
     @default 1.0
     @type Number
     */

    set scale(value) {
        if (value === undefined || value === null) {
            value = 1.0;
        }
        if (value <= 0) {
            value = 0.01;
        }
        this._scale = value;
        this._needUpdate();
        /**
         Fired whenever this Ortho's {@link Ortho#scale} property changes.

         @event scale
         @param value The property's new value
         */
        this.fire("scale", this._scale);
    }

    get scale() {
        return this._scale;
    }

    /**
     Position of this Ortho's near plane on the positive View-space Z-axis.

     Fires a {@link Ortho#near:event} event on change.

     @property near
     @default 0.1
     @type Number
     */
    set near(value) {
        this._near = (value !== undefined && value !== null) ? value : 0.1;
        this._needUpdate();
        /**
         Fired whenever this Ortho's  {@link Ortho#near} property changes.

         @event near
         @param value The property's new value
         */
        this.fire("near", this._near);
    }

    get near() {
        return this._near;
    }

    /**
     Position of this Ortho's far plane on the positive View-space Z-axis.

     Fires a {@link Ortho#far:event} event on change.

     @property far
     @default 10000.0
     @type Number
     */
    set far(value) {
        this._far = (value !== undefined && value !== null) ? value : 10000.0;
        this._needUpdate();
        /**
         Fired whenever this Ortho's {@link Ortho#far} property changes.

         @event far
         @param value The property's new value
         */
        this.fire("far", this._far);
    }

    get far() {
        return this._far;
    }

    /**
     The Ortho's projection transform matrix.

     Fires a {@link Ortho#matrix:event} event on change.

     @property matrix
     @default [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
     @type {Float32Array}
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
        this.scene.canvas.off(this._onCanvasBoundary);
    }
}

export {Ortho};