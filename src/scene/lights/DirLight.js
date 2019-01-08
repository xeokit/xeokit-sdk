import {Light} from './Light.js';
import {RenderState} from '../webgl/RenderState.js';
import {RenderBuffer} from '../webgl/RenderBuffer.js';
import {math} from '../math/math.js';

/**
 * @desc A directional light source that illuminates all {@link Mesh}es equally from a given direction.
 *
 * * Has an emission direction vector in {@link DirLight#dir}, but no position.
 * * Defined in either *World* or *View* coordinate space. When in World-space, {@link DirLight#dir} is relative to the
 * World coordinate system, and will appear to move as the {@link Camera} moves. When in View-space, {@link DirLight#dir} is
 * relative to the View coordinate system, and will behave as if fixed to the viewer's head.
 * * {@link AmbientLight}s, {@link DirLight}s and {@link PointLight}s are registered by their {@link Component#id} on {@link Scene#lights}.
 *
 * ## Usage
 *
 * In the example below we'll destroy the {@link Scene}'s default light sources then create an {@link AmbientLight} and a couple of DirLights:
 *
 * ````javascript
 * myViewer.scene.clearLights();
 *
 * new AmbientLight(myViewer.scene, {
 *     id: "myAmbientLight",
 *     color: [0.8, 0.8, 0.8],
 *     intensity: 0.5
 * });
 *
 * new DirLight(myViewer.scene, {
 *     id: "myDirLight1",
 *     dir: [-0.8, -0.4, -0.4],
 *     color: [0.4, 0.4, 0.5],
 *     intensity: 0.5,
 *     space: "view"
 * });
 *
 * new DirLight(myViewer.scene, {
 *     id: "myDirLight2",
 *     dir: [0.2, -0.8, 0.8],
 *     color: [0.8, 0.8, 0.8],
 *     intensity: 0.5,
 *     space: "view"
 * });
 *
 * // Adjust the color of one of our DirLights
 *
 * var dirLight1 = myViewer.scene.lights["myDirLight1"];
 * dirLight.color = [1.0, 0.8, 0.8];
 * ````
 */
class DirLight extends Light {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type {String}
     @final
     */
    get type() {
        return "DirLight";
    }

    /**
     @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     @param {*} [cfg] The DirLight configuration
     @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     @param {String:Object} [cfg.meta] Optional map of user-defined metadata to attach to this DirLight.
     @param [cfg.dir=[1.0, 1.0, 1.0]] {Float32Array} A unit vector indicating the direction that the light is shining,
     given in either World or View space, depending on the value of the **space** parameter.
     @param [cfg.color=[0.7, 0.7, 0.8 ]] {Float32Array} The color of this DirLight.
     @param [cfg.intensity=1.0 ] {Number} The intensity of this DirLight, as a factor in range ````[0..1]````.
     @param [cfg.space="view"] {String} The coordinate system the DirLight is defined in - "view" or "space".
     @param [cfg.castsShadow=false] {Boolean} Flag which indicates if this DirLight casts a castsShadow.
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
            type: "dir",
            dir: math.vec3([1.0, 1.0, 1.0]),
            color: math.vec3([0.7, 0.7, 0.8]),
            intensity: 1.0,
            space: cfg.space || "view",
            castsShadow: false,
            shadowDirty: true,

            getShadowViewMatrix: (function () {
                const look = math.vec3();
                const up = math.vec3([0, 1, 0]);
                return function () {
                    if (self._shadowViewMatrixDirty) {
                        if (!self._shadowViewMatrix) {
                            self._shadowViewMatrix = math.identityMat4();
                        }
                        const dir = self._state.dir;
                        math.lookAtMat4v([-dir[0], -dir[1], -dir[2]], [0, 0, 0], up, self._shadowViewMatrix);
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
                    math.orthoMat4c(-10, 10, -10, 10, 0, 500.0, self._shadowProjMatrix);
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

        this.dir = cfg.dir;
        this.color = cfg.color;
        this.intensity = cfg.intensity;
        this.castsShadow = cfg.castsShadow;
        this.scene._lightCreated(this);
    }

    /**
     The direction in which the light is shining.

     @property dir
     @default [1.0, 1.0, 1.0]
     @type {Float32Array}
     */
    set dir(value) {
        this._state.dir.set(value || [1.0, 1.0, 1.0]);
        this._shadowViewMatrixDirty = true;
        this.glRedraw();
    }

    get dir() {
        return this._state.dir;
    }

    /**
     The color of this DirLight.

     @property color
     @default [0.7, 0.7, 0.8]
     @type {Float32Array}
     */
    set color(value) {
        this._state.color.set(value || [0.7, 0.7, 0.8]);
        this.glRedraw();
    }

    get color() {
        return this._state.color;
    }

    /**
     The intensity of this DirLight.

     Fires a {@link DirLight/intensity:event} event on change.

     @property intensity
     @default 1.0
     @type {Number}
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
     Flag which indicates if this DirLight casts a shadow.

     @property castsShadow
     @default false
     @type {Boolean}
     */
    set castsShadow(value) {
        value = !!value;
        if (this._state.castsShadow === value) {
            return;
        }
        this._state.castsShadow = value;
        this._shadowViewMatrixDirty = true;
        this.glRedraw();
    }

    get castsShadow() {
        return this._state.castsShadow;
    }

    destroy() {
        super.destroy();
        this._state.destroy();
        if (this._shadowRenderBuf) {
            this._shadowRenderBuf.destroy();
        }
        this.scene._lightDestroyed(this);
        this.glRedraw();
    }
}

export {DirLight};
