import {math} from "../../../../libs/xeokit/xeokit.module.js";
import {Curve} from "./curve.js"

/**
 * @private
 */
class QuadraticBezierCurve extends Curve {

    init(cfg) {
        super.init(cfg);
        this.v0 = cfg.v0;
        this.v1 = cfg.v1;
        this.v2 = cfg.v2;
        this.t = cfg.t;
    }

    /**
     Starting point on this QuadraticBezierCurve.

     Fires a {{#crossLink "QuadraticBezierCurve/v0:event"}}{{/crossLink}} event on change.

     @property v0
     @default [0.0, 0.0, 0.0]
     @type Float32Array
     */
    set v0(value) {

        /**
         * Fired whenever this QuadraticBezierCurve's
         * {{#crossLink "QuadraticBezierCurve/v0:property"}}{{/crossLink}} property changes.
         * @event v0
         * @param value The property's new value
         */
        this.fire("v0", this._v0 = value || math.vec3([0, 0, 0]));
    }

    get v0() {
        return this._v0;
    }

    /**
     Middle control point on this QuadraticBezierCurve.

     Fires a {{#crossLink "QuadraticBezierCurve/v1:event"}}{{/crossLink}} event on change.

     @property v1
     @default [0.0, 0.0, 0.0]
     @type Float32Array
     */
    set v1(value) {

        /**
         * Fired whenever this QuadraticBezierCurve's
         * {{#crossLink "QuadraticBezierCurve/v1:property"}}{{/crossLink}} property changes.
         * @event v1
         * @param value The property's new value
         */
        this.fire("v1", this._v1 = value || math.vec3([0, 0, 0]));
    }

    get v1() {
        return this._v1;
    }

    /**
     End point on this QuadraticBezierCurve.

     Fires a {{#crossLink "QuadraticBezierCurve/v2:event"}}{{/crossLink}} event on change.

     @property v2
     @default [0.0, 0.0, 0.0]
     @type Float32Array
     */
    set v2(value) {
        /**
         * Fired whenever this QuadraticBezierCurve's
         * {{#crossLink "QuadraticBezierCurve/v2:property"}}{{/crossLink}} property changes.
         * @event v2
         * @param value The property's new value
         */
        this.fire("v2", this._v2 = value || math.vec3([0, 0, 0]));
    }

    get v2() {
        return this._v2;
    }

    /**
     Progress along this QuadraticBezierCurve.

     Automatically clamps to range [0..1].

     Fires a {{#crossLink "QuadraticBezierCurve/t:event"}}{{/crossLink}} event on change.

     @property t
     @default 0
     @type Number
     */
    set t(value) {
        value = value || 0;
        this._t = value < 0.0 ? 0.0 : (value > 1.0 ? 1.0 : value);
        /**
         * Fired whenever this QuadraticBezierCurve's
         * {{#crossLink "QuadraticBezierCurve/t:property"}}{{/crossLink}} property changes.
         * @event t
         * @param value The property's new value
         */
        this.fire("t", this._t);
    }

    get t() {
        return this._t;
    }

    /**
     Point on this QuadraticBezierCurve at position {{#crossLink "QuadraticBezierCurve/t:property"}}{{/crossLink}}.

     @property point
     @type {{Array of Number}}
     */
    get point() {
        return this.getPoint(this._t);
    }

    /**
     * Returns point on this QuadraticBezierCurve at the given position.
     * @method getPoint
     * @param {Number} t Position to get point at.
     * @returns {{Array of Number}}
     */
    getPoint(t) {
        var vector = math.vec3();
        vector[0] = math.b2(t, this._v0[0], this._v1[0], this._v2[0]);
        vector[1] = math.b2(t, this._v0[1], this._v1[1], this._v2[1]);
        vector[2] = math.b2(t, this._v0[2], this._v1[2], this._v2[2]);
        return vector;
    }

    getJSON() {
        return {
            v0: this._v0,
            v1: this._v1,
            v2: this._v2,
            t: this._t
        };
    }
}

export {QuadraticBezierCurve}