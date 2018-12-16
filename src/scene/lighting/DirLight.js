/**
 A **DirLight** is a directional light source that illuminates all {@link Mesh"}}Meshes{{/crossLink}} equally
 from a given direction.

 ## Overview

 * DirLights have a direction, but no position.
 * The direction is the **direction that the light is emitted in**.
 * DirLights may be defined in either **World** or **View** coordinate space. When in World-space, their direction
 is relative to the World coordinate system, and will appear to move as the {@link Camera} moves.
 When in View-space, their direction is relative to the View coordinate system, and will behave as if fixed to the viewer's
 head as the {@link Camera} moves.
 * A DirLight can also have a {@link castShadow} component, to configure it to cast a castShadow.
 * {@link AmbientLight}, {@link DirLight},
 {@link SpotLight} and {@link PointLight} instances are registered by ID
 on {@link Scene/lights:property"}}Scene#lights{{/crossLink}} for convenient access.

 ## Examples

 * [View-space directional three-point lighting](../../examples/#lights_directional_view_threePoint)
 * [World-space directional three-point lighting](../../examples/#lights_directional_world_threePoint)

 ## Usage

 In the example below we'll customize the default Scene's light sources, defining an AmbientLight and a couple of
 DirLights, then create a Phong-shaded box mesh.

 ````javascript
 new xeokit.AmbientLight({
        color: [0.8, 0.8, 0.8],
        intensity: 0.5
     });

 new xeokit.DirLight({
        dir: [1, 1, 1],     // Direction the light is shining in
        color: [0.5, 0.7, 0.5],
        intensity: 1.0,
        space: "view",      // Other option is "world", for World-space
        castShadow: false       // Default
     });

 new xeokit.DirLight({
        dir: [0.2, -0.8, 0.8],
        color: [0.8, 0.8, 0.8],
        intensity: 0.5,
        space: "view",
        castShadow: false
     });

 // Create box mesh
 new xeokit.Mesh({
    material: new xeokit.PhongMaterial({
        ambient: [0.5, 0.5, 0.5],
        diffuse: [1,0.3,0.3]
    }),
    geometry: new xeokit.BoxGeometry()
 });
 ````

 @class DirLight
 @module xeokit
 @submodule lighting
 @constructor
 @param [owner] {Component} Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
 @param [cfg] {*} The DirLight configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {@link Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this DirLight.
 @param [cfg.dir=[1.0, 1.0, 1.0]] {Float32Array} A unit vector indicating the direction that the light is shining,
 given in either World or View space, depending on the value of the **space** parameter.
 @param [cfg.color=[0.7, 0.7, 0.8 ]] {Float32Array} The color of this DirLight.
 @param [cfg.intensity=1.0 ] {Number} The intensity of this DirLight, as a factor in range ````[0..1]````.
 @param [cfg.space="view"] {String} The coordinate system the DirLight is defined in - "view" or "space".
 @param [cfg.castShadow=false] {Boolean} Flag which indicates if this DirLight casts a castShadow.
 @extends Component
 */
import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {RenderBuffer} from '../webgl/RenderBuffer.js';
import {math} from '../math/math.js';


class DirLight extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "DirLight";
    }

    init(cfg) {

        super.init(cfg);

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
            castShadow: false,
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
                    self._shadowRenderBuf = new RenderBuffer(self.scene.canvas.canvas, self.scene.canvas.gl, { size: [1024, 1024]});
                }
                return self._shadowRenderBuf;
            }
        });

        this.dir = cfg.dir;
        this.color = cfg.color;
        this.intensity = cfg.intensity;
        this.castShadow = cfg.castShadow;
        this.scene._lightCreated(this);
    }

    /**
     The direction in which the light is shining.

     @property dir
     @default [1.0, 1.0, 1.0]
     @type Float32Array
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
     The intensity of this DirLight.

     Fires a {@link DirLight/intensity:event} event on change.

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
     Flag which indicates if this DirLight casts a shadow.

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
        this.glRedraw();
    }
}

export {DirLight};
