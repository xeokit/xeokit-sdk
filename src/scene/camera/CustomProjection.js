/**
 A **CustomProjection** defines a projection for a {@link Camera} as a custom 4x4 matrix..

 ## Overview

 * A {@link Camera} has a CustomProjection to configure its custom projection mode.
 * A CustomProjection lets us explicitly set the elements of its 4x4 transformation matrix.

 ## Examples

 * [Camera with a CustomProjection](../../examples/#camera_customProjection)

 ## Usage

 * See {@link Camera}

 @class CustomProjection
 @module xeokit
 @submodule camera
 @constructor
 @param [owner] {Component} Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this CustomProjection.
 @param [cfg.matrix=] {Float32Array} 4x4 transform matrix.
 @extends Component
 */
import {math} from '../math/math.js';
import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';

class CustomProjection extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "CustomProjection";
    }

    init(cfg) {
        super.init(cfg);
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
     @type {Float32Array}
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