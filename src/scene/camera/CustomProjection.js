import {math} from '../math/math.js';
import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';

/**
 * @desc Defines a projection for a {@link Camera} as a custom 4x4 matrix..
 *
 * Located at {@link Camera#customProjection}.
 */
class CustomProjection extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type {String}
     @final
     */
    get type() {
        return "CustomProjection";
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
        this.matrix = cfg.matrix;
    }

    /**
     The CustomProjection's projection transform matrix.

     Fires a {@link CustomProjection/matrix:event} event on change.

     @property matrix
     @default [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
     @type {Number[]}
     */
    set matrix(matrix) {

        this._state.matrix.set(matrix || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

        /**
         Fired whenever this CustomProjection's {@link CustomProjection/matrix} property changes.

         @event matrix
         @param value The property's new value
         */
        this.fire("far", this._state.matrix);
    }

    get matrix() {
        return this._state.matrix;
    }

    destroy() {
        super.destroy();
        this._state.destroy();
    }
}

export {CustomProjection};