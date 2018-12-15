import {Curve} from "./Curve.js"
import {math} from "../math/math.js";

/**
 * @private
 */
class SplineCurve extends Curve {

    init(cfg) {
        super.init(cfg);
        this.points = cfg.points;
        this.t = cfg.t;
    }

    /**
     Control points on this SplineCurve.

     Fires a {{#crossLink "SplineCurve/points:event"}}{{/crossLink}} event on change.

     @property points
     @default []
     @type Float32Array
     */
    set points(value) {
        this._points = value || [];
        /**
         * Fired whenever this SplineCurve's
         * {{#crossLink "SplineCurve/points:property"}}{{/crossLink}} property changes.
         * @event points
         * @param value The property's new value
         */
        this.fire("points", this._points);
    }

    get points() {
        return this._points;
    }

    /**
     Progress along this SplineCurve.

     Automatically clamps to range [0..1].

     Fires a {{#crossLink "SplineCurve/t:event"}}{{/crossLink}} event on change.

     @property t
     @default 0
     @type Number
     */
    set t(value) {
        value = value || 0;
        this._t = value < 0.0 ? 0.0 : (value > 1.0 ? 1.0 : value);
        /**
         * Fired whenever this SplineCurve's
         * {{#crossLink "SplineCurve/t:property"}}{{/crossLink}} property changes.
         * @event t
         * @param value The property's new value
         */
        this.fire("t", this._t);
    }

    get t() {
        return this._t;
    }

    /**
     Point on this SplineCurve at position {{#crossLink "SplineCurve/t:property"}}{{/crossLink}}.

     @property point
     @type {{Array of Number}}
     */
    get point() {
        return this.getPoint(this._t);
    }

    /**
     * Returns point on this SplineCurve at the given position.
     * @method getPoint
     * @param {Number} t Position to get point at.
     * @returns {{Array of Number}}
     */
    getPoint(t) {

        var points = this.points;

        if (points.length < 3) {
            this.error("Can't sample point from SplineCurve - not enough points on curve - returning [0,0,0].");
            return;
        }

        var point = ( points.length - 1 ) * t;

        var intPoint = Math.floor(point);
        var weight = point - intPoint;

        var point0 = points[intPoint === 0 ? intPoint : intPoint - 1];
        var point1 = points[intPoint];
        var point2 = points[intPoint > points.length - 2 ? points.length - 1 : intPoint + 1];
        var point3 = points[intPoint > points.length - 3 ? points.length - 1 : intPoint + 2];

        var vector = math.vec3();

        vector[0] = math.catmullRomInterpolate(point0[0], point1[0], point2[0], point3[0], weight);
        vector[1] = math.catmullRomInterpolate(point0[1], point1[1], point2[1], point3[1], weight);
        vector[2] = math.catmullRomInterpolate(point0[2], point1[2], point2[2], point3[2], weight);

        return vector;
    }

    getJSON() {
        return {
            points: points,
            t: this._t
        };
    }
}

export {SplineCurve}