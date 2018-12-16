import {Curve} from "./Curve.js"
import {math} from "../math/math.js";

class CubicBezierCurve extends Curve {

    init(cfg) {
        super.init(cfg);
        this.v0 = cfg.v0;
        this.v1 = cfg.v1;
        this.v2 = cfg.v2;
        this.v3 = cfg.v3;
        this.t = cfg.t;
    }

    /**
     Starting point on this CubicBezierCurve.

     Fires a {@link CubicBezierCurve/v0:event} event on change.

     @property v0
     @default [0.0, 0.0, 0.0]
     @type Float32Array
     */
    set v0(value) {

        /**
         * Fired whenever this CubicBezierCurve's
         * {@link CubicBezierCurve/v0} property changes.
         * @event v0
         * @param value The property's new value
         */
        this.fire("v0", this._v0 = value || math.vec3([0, 0, 0]));
    }

    get v0() {
        return this._v0;
    }

    /**
     First control point on this CubicBezierCurve.

     Fires a {@link CubicBezierCurve/v1:event} event on change.

     @property v1
     @default [0.0, 0.0, 0.0]
     @type Float32Array
     */
    set v1(value) {

        /**
         * Fired whenever this CubicBezierCurve's
         * {@link CubicBezierCurve/v1} property changes.
         * @event v1
         * @param value The property's new value
         */
        this.fire("v1", this._v1 = value || math.vec3([0, 0, 0]));
    }

    get v1() {
        return this._v1;
    }

    /**
     Second control point on this CubicBezierCurve.

     Fires a {@link CubicBezierCurve/v2:event} event on change.

     @property v2
     @default [0.0, 0.0, 0.0]
     @type Float32Array
     */
    set v2(value) {

        /**
         * Fired whenever this CubicBezierCurve's
         * {@link CubicBezierCurve/v2} property changes.
         * @event v2
         * @param value The property's new value
         */
        this.fire("v2", this._v2 = value || math.vec3([0, 0, 0]));
    }

    get v2() {
        return this._v2;
    }

    /**
     End point on this CubicBezierCurve.

     Fires a {@link CubicBezierCurve/v3:event} event on change.

     @property v3
     @default [0.0, 0.0, 0.0]
     @type Float32Array
     */
    set v3(value) {

        /**
         * Fired whenever this CubicBezierCurve's
         * {@link CubicBezierCurve/v3} property changes.
         * @event v3
         * @param value The property's new value
         */
        this.fire("v3", this._v3 = value || math.vec3([0, 0, 0]));
    }

    get v3() {
        return this._v3;
    }

    /**
     Current position of progress along this CubicBezierCurve.

     Automatically clamps to range [0..1].

     Fires a {@link CubicBezierCurve/t:event} event on change.

     @property t
     @default 0
     @type Number
     */

    set t(value) {

        value = value || 0;

        this._t = value < 0.0 ? 0.0 : (value > 1.0 ? 1.0 : value);

        /**
         * Fired whenever this CubicBezierCurve's
         * {@link CubicBezierCurve/t} property changes.
         * @event t
         * @param value The property's new value
         */
        this.fire("t", this._t);
    }

    get t() {
        return this._t;
    }

    /**
     Point on this CubicBezierCurve at position {@link CubicBezierCurve/t}.

     @property point
     @type {{Array of Number}}
     */
    get point() {
        return this.getPoint(this._t);
    }

    /**
     * Returns point on this CubicBezierCurve at the given position.
     * @method getPoint
     * @param {Number} t Position to get point at.
     * @returns {{Array of Number}}
     */
    getPoint(t) {

        var vector = math.vec3();

        vector[0] = math.b3(t, this._v0[0], this._v1[0], this._v2[0], this._v3[0]);
        vector[1] = math.b3(t, this._v0[1], this._v1[1], this._v2[1], this._v3[1]);
        vector[2] = math.b3(t, this._v0[2], this._v1[2], this._v2[2], this._v3[2]);

        return vector;
    }

    getJSON() {
        return {
            v0: this._v0,
            v1: this._v1,
            v2: this._v2,
            v3: this._v3,
            t: this._t
        };
    }
}

export {CubicBezierCurve}