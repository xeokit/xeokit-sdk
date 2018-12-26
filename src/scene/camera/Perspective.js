/**
 A **Perspective** defines a perspective projection transform for a {@link Camera}.

 ## Overview

 * A {@link Camera} has a Perspective to configure its perspective projection mode.

 ## Examples

 * [Camera with perspective projection](../../examples/#camera_perspective)

 ## Usage

 * See {@link Camera}

 @class Perspective
 @module xeokit
 @submodule camera
 @constructor
 @param [owner] {Component} Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Perspective.
 @param [cfg.parent] {String|Transform} ID or instance of a parent {@link Transform} within the same {@link Scene}}Scene{{/crossLink}}.
 @param [cfg.fov=60.0] {Number} Field-of-view angle, in degrees.
 @param [cfg.fovAxis="min"] {String} The field-of-view axis: "x", "y", or "min" to use whichever is currently the minimum.
 @param [cfg.near=0.1] {Number} Position of the near plane on the View-space Z-axis.
 @param [cfg.far=10000] {Number} Position of the far plane on the View-space Z-axis.
 @author xeolabs / http://xeolabs.com
 @author Artur-Sampaio / https://github.com/Artur-Sampaio
 @extends Component
 */

import {math} from '../math/math.js';
import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';

class Perspective extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "Perspective";
    }

    init(cfg) {

        super.init(cfg);

        this._state = new RenderState({
            matrix: math.mat4()
        });

        this._dirty = false;
        this._fov = 60.0;
        this._near = 0.1;
        this._far = 10000.0;

        // Recompute aspect from change in canvas size
        this._canvasResized = this.scene.canvas.on("boundary", this._needUpdate, this);

        this.fov = cfg.fov;
        this.fovAxis = cfg.fovAxis;
        this.near = cfg.near;
        this.far = cfg.far;
    }

    _update() {
        const WIDTH_INDEX = 2;
        const HEIGHT_INDEX = 3;
        const boundary = this.scene.viewport.boundary;
        const aspect = boundary[WIDTH_INDEX] / boundary[HEIGHT_INDEX];
        let fov = this._fov;
        const fovAxis = this._fovAxis;
        if (fovAxis === "x" || (fovAxis === "min" && aspect < 1) || (fovAxis === "max" && aspect > 1)) {
            fov = fov / aspect;
        }
        fov = Math.min(fov, 120);
        math.perspectiveMat4(fov * (Math.PI / 180.0), aspect, this._near, this._far, this._state.matrix);
        this.glRedraw();
        this.fire("matrix", this._state.matrix);
    }

    /**
     The field-of-view angle (FOV).

     Fires a {@link Perspective/fov:event} event on change.

     @property fov
     @default 60.0
     @type Number
     */
    set fov(value) {
        this._fov = (value !== undefined && value !== null) ? value : 60.0;
        this._needUpdate(0); // Ensure matrix built on next "tick"
        /**
         Fired whenever this Perspective's {@link Perspective/fov} property changes.

         @event fov
         @param value The property's new value
         */
        this.fire("fov", this._fov);
    }

    get fov() {
        return this._fov;
    }

    /**
     The FOV axis.

     Options are "x", "y" or "min", to use the minimum axis.

     Fires a {@link Perspective/fov:event} event on change.

     @property fovAxis
     @default "min"
     @type String
     */
    set fovAxis(value) {
        value = value || "min";
        if (this._fovAxis === value) {
            return;
        }
        if (value !== "x" && value !== "y" && value !== "min") {
            this.error("Unsupported value for 'fovAxis': " + value + " - defaulting to 'min'");
            value = "min";
        }
        this._fovAxis = value;
        this._needUpdate(0); // Ensure matrix built on next "tick"
        /**
         Fired whenever this Perspective's {@link Perspective/fovAxis} property changes.

         @event fovAxis
         @param value The property's new value
         */
        this.fire("fovAxis", this._fovAxis);
    }

    get fovAxis() {
        return this._fovAxis;
    }

    /**
     Position of this Perspective's near plane on the positive View-space Z-axis.

     Fires a {@link Perspective/near:event} event on change.

     @property near
     @default 0.1
     @type Number
     */
    set near(value) {
        this._near = (value !== undefined && value !== null) ? value : 0.1;
        this._needUpdate(0); // Ensure matrix built on next "tick"
        /**
         Fired whenever this Perspective's   {@link Perspective/near} property changes.
         @event near
         @param value The property's new value
         */
        this.fire("near", this._near);
    }

    get near() {
        return this._near;
    }

    /**
     Position of this Perspective's far plane on the positive View-space Z-axis.

     Fires a {@link Perspective/far:event} event on change.

     @property far
     @default 10000.0
     @type Number
     */
    set far(value) {
        this._far = (value !== undefined && value !== null) ? value : 10000;
        this._needUpdate(0); // Ensure matrix built on next "tick"
        /**
         Fired whenever this Perspective's  {@link Perspective/far} property changes.

         @event far
         @param value The property's new value
         */
        this.fire("far", this._far);
    }

    get far() {
        return this._far;
    }

    /**
     The Perspective's projection transform matrix.

     Fires a {@link Perspective/matrix:event} event on change.

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
        super.destroy();
        this.scene.canvas.off(this._canvasResized);
    }
}

export {Perspective};