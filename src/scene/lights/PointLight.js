import {Light} from './Light.js';
import {RenderState} from '../webgl/RenderState.js';
import {RenderBuffer} from '../webgl/RenderBuffer.js';
import {math} from '../math/math.js';

/**
 * A positional light source that originates from a single point and spreads outward in all directions, with optional attenuation over distance.
 *
 * * Has a position in {@link PointLight#pos}, but no direction.
 * * Defined in either *World* or *View* coordinate space. When in World-space, {@link PointLight#pos} is relative to
 * the World coordinate system, and will appear to move as the {@link Camera} moves. When in View-space,
 * {@link PointLight#pos} is relative to the View coordinate system, and will behave as if fixed to the viewer's head.
 * * Has {@link PointLight#constantAttenuation}, {@link PointLight#linearAttenuation} and {@link PointLight#quadraticAttenuation}
 * factors, which indicate how intensity attenuates over distance.
 * * {@link AmbientLight}s, {@link DirLight}s and {@link PointLight}s are registered by their {@link Component#id} on {@link Scene#lights}.
 *
 * ## Usage
 *
 * In the example below we'll destroy the {@link Scene}'s default light sources then create an {@link AmbientLight}
 * and a couple of PointLights positioned within the View-space coordinate system:
 *
 * ````javascript
 * myViewer.scene.clearLights();
 *
 * new AmbientLight({
 *      id: "myAmbientLight",
 *      color: [0.8, 0.8, 0.8],
 *      intensity: 0.5
 * });
 *
 * new PointLight({
 *      id: "myPointLight1",
 *      pos: [-100, 0, 100],
 *      color: [0.3, 0.3, 0.5],
 *      intensity: .7
 *      constantAttenuation: 0,
 *      linearAttenuation: 0,
 *      quadraticAttenuation: 0,
 *      space: "view"
 * });
 *
 * new PointLight({
 *      id: "myPointLight2",
 *      pos: [0, 100, 100],
 *      color: [0.5, 0.7, 0.5],
 *      intensity: 1
 *      constantAttenuation: 0,
 *      linearAttenuation: 0,
 *      quadraticAttenuation: 0,
 *      space: "view"
 * });
 *
 * // Adjust the position of one of our PointLights
 *
 * var pointLight1 = myViewer.scene.lights["myPointLight1"];
 * dirLight.pos = [-150.0, 0.0, 100.0];
 * ````
 */
class PointLight extends Light {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "PointLight";
    }

    /**
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
     @param {*} [cfg] The PointLight configuration
     @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     @param {String:Object} [cfg.meta] Optional map of user-defined metadata to attach to this PointLight.
     @param [cfg.pos=[ 1.0, 1.0, 1.0 ]] {Float32Array} Position, in either World or View space, depending on the value of the **space** parameter.
     @param [cfg.color=[0.7, 0.7, 0.8 ]] {Float32Array} Color of this PointLight.
     @param [cfg.intensity=1.0] {Number} Intensity of this PointLight, as a factor in range ````[0..1]````.
     @param [cfg.constantAttenuation=0] {Number} Constant attenuation factor.
     @param [cfg.linearAttenuation=0] {Number} Linear attenuation factor.
     @param [cfg.quadraticAttenuation=0] {Number} Quadratic attenuation factor.
     @param [cfg.space="view"] {String} The coordinate system this PointLight is defined in - "view" or "world".
     @param [cfg.castShadow=false] {Boolean} Flag which indicates if this PointLight casts a castShadow.
     * @param owner
     * @param cfg
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        const self = this;

        this._shadowRenderBuf = null;
        this._shadowViewMatrix = null;
        this._shadowProjMatrix = null;
        this._shadowViewMatrixDirty = true;
        this._shadowProjMatrixDirty = true;

        this._state = new RenderState({
            type: "point",
            pos: math.vec3([1.0, 1.0, 1.0]),
            color: math.vec3([0.7, 0.7, 0.8]),
            intensity: 1.0, attenuation: [0.0, 0.0, 0.0],
            space: cfg.space || "view",
            castShadow: false,
            shadowDirty: true,

            getShadowViewMatrix: (function () {
                const look = math.vec3([0, 0, 0]);
                const up = math.vec3([0, 1, 0]);
                return function () {
                    if (self._shadowViewMatrixDirty) {
                        if (!self._shadowViewMatrix) {
                            self._shadowViewMatrix = math.identityMat4();
                        }
                        math.lookAtMat4v(self._state.pos, look, up, self._shadowViewMatrix);
                        self._shadowViewMatrixDirty = false;
                    }
                    return self._shadowViewMatrix;
                };
            })(),

            getShadowProjMatrix: function () {
                if (self._shadowProjMatrixDirty) { // TODO: Set when canvas resizes
                    if (!self._shadowProjMatrix) {
                        self._shadowProjMatrix = math.identityMat4();
                    }
                    const canvas = self.scene.canvas.canvas;
                    math.perspectiveMat4(70 * (Math.PI / 180.0), canvas.clientWidth / canvas.clientHeight, 0.1, 500.0, self._shadowProjMatrix);
                    self._shadowProjMatrixDirty = false;
                }
                return self._shadowProjMatrix;
            },

            getShadowRenderBuf: function () {
                if (!self._shadowRenderBuf) {
                    self._shadowRenderBuf = new RenderBuffer(self.scene.canvas.canvas, self.scene.canvas.gl, {size: [1024, 1024]});
                }
                return self._shadowRenderBuf;
            }
        });

        this.pos = cfg.pos;
        this.color = cfg.color;
        this.intensity = cfg.intensity;
        this.constantAttenuation = cfg.constantAttenuation;
        this.linearAttenuation = cfg.linearAttenuation;
        this.quadraticAttenuation = cfg.quadraticAttenuation;
        this.castShadow = cfg.castShadow;

        this.scene._lightCreated(this);
    }


    /**
     The position of this PointLight.

     This will be either World- or View-space, depending on the value of {@link PointLight#space}.

     @property pos
     @default [1.0, 1.0, 1.0]
     @type Array(Number)
     */
    set pos(value) {
        this._state.pos.set(value || [1.0, 1.0, 1.0]);
        this._shadowViewMatrixDirty = true;
        this.glRedraw();
    }

    get pos() {
        return this._state.pos;
    }

    /**
     The color of this PointLight.

     @property color
     @default [0.7, 0.7, 0.8]
     @type Float32Array
     */
    set color(value) {
        this._state.color.set(value || [0.7, 0.7, 0.8]);
        this.glRedraw();
    }

    get color() {
        return this._state.color;
    }

    /**
     The intensity of this PointLight.

     @property intensity
     @default 1.0
     @type Number
     */
    set intensity(value) {
        value = value !== undefined ? value : 1.0;
        this._state.intensity = value;
        this.glRedraw();
    }

    get intensity() {
        return this._state.intensity;
    }

    /**
     The constant attenuation factor for this PointLight.

     @property constantAttenuation
     @default 0
     @type Number
     */
    set constantAttenuation(value) {
        this._state.attenuation[0] = value || 0.0;
        this.glRedraw();
    }

    get constantAttenuation() {
        return this._state.attenuation[0];
    }

    /**
     The linear attenuation factor for this PointLight.

     @property linearAttenuation
     @default 0
     @type Number
     */
    set linearAttenuation(value) {
        this._state.attenuation[1] = value || 0.0;
        this.glRedraw();
    }

    get linearAttenuation() {
        return this._state.attenuation[1];
    }

    /**
     The quadratic attenuation factor for this Pointlight.

     @property quadraticAttenuation
     @default 0
     @type Number
     */
    set quadraticAttenuation(value) {
        this._state.attenuation[2] = value || 0.0;
        this.glRedraw();
    }

    get quadraticAttenuation() {
        return this._state.attenuation[2];
    }

    /**
     Flag which indicates if this PointLight casts a shadow.

     @property castShadow
     @default false
     @type Boolean
     */
    set castShadow(value) {
        value = !!value;
        if (this._state.castShadow === value) {
            return;
        }
        this._state.castShadow = value;
        this._shadowViewMatrixDirty = true;
        this.glRedraw();
    }

    get castShadow() {
        return this._state.castShadow;
    }

    destroy() {
        super.destroy();
        this._state.destroy();
        if (this._shadowRenderBuf) {
            this._shadowRenderBuf.destroy();
        }
        this.scene._lightDestroyed(this);
    }
}

export {PointLight};
