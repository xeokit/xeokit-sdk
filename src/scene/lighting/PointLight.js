/**
 A **PointLight** defines a positional light source that originates from a single point and spreads outward in all directions,
 to illuminate {@link Mesh"}}Meshes{{/crossLink}}.

 <a href="../../examples/#lights_point_world_normalMap"><img src="http://i.giphy.com/3o6ZsZoFGIOJ2nlmN2.gif"></img></a>

 ## Overview

 * PointLights have a position, but no direction.
 * PointLights may be defined in either **World** or **View** coordinate space. When in World-space, their positions
 are relative to the World coordinate system, and will appear to move as the {@link Camera} moves.
 When in View-space, their positions are relative to the View coordinate system, and will behave as if fixed to the viewer's
 head as the {@link Camera} moves.
 * PointLights have {@link PointLight/constantAttenuation}, {@link PointLight/linearAttenuation} and
 {@link PointLight/quadraticAttenuation} factors, which indicate how their intensity attenuates over distance.
 * {@link AmbientLight}, {@link DirLight},
 {@link SpotLight} and {@link PointLight} instances are registered by ID
 on {@link Scene/lights:property"}}Scene#lights{{/crossLink}} for convenient access.

 ## Examples

 * [View-space positional three-point lighting](../../examples/#lights_point_view_threePoint)
 * [World-space positional three-point lighting](../../examples/#lights_point_world_threePoint)
 * [World-space point light and normal map](../../examples/#lights_point_world_normalMap)

 ## Usage

 In the example below we'll customize the default Scene's light sources, defining an AmbientLight and a couple of
 PointLights, then create a Phong-shaded box mesh.

 ````javascript
 new xeokit.AmbientLight({
        color: [0.8, 0.8, 0.8],
        intensity: 0.5
    });

 new xeokit.PointLight({
        pos: [-100, 0, 100],
        color: [0.3, 0.3, 0.5],
        intensity: .7
        constantAttenuation: 0,
        linearAttenuation: 0,
        quadraticAttenuation: 0,
        space: "view"
    });

 new xeokit.PointLight({
        pos: [0, 100, 100],
        color: [0.5, 0.7, 0.5],
        intensity: 1
        constantAttenuation: 0,
        linearAttenuation: 0,
        quadraticAttenuation: 0,
        space: "view"
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


 @class PointLight
 @module xeokit
 @submodule lighting
 @constructor
 @extends Component
 @param [owner] {Component} Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
 @param [cfg] {*} The PointLight configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {@link Scene}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this PointLight.
 @param [cfg.pos=[ 1.0, 1.0, 1.0 ]] {Float32Array} Position, in either World or View space, depending on the value of the **space** parameter.
 @param [cfg.color=[0.7, 0.7, 0.8 ]] {Float32Array} Color of this PointLight.
 @param [cfg.intensity=1.0] {Number} Intensity of this PointLight, as a factor in range ````[0..1]````.
 @param [cfg.constantAttenuation=0] {Number} Constant attenuation factor.
 @param [cfg.linearAttenuation=0] {Number} Linear attenuation factor.
 @param [cfg.quadraticAttenuation=0] {Number} Quadratic attenuation factor.
 @param [cfg.space="view"] {String} The coordinate system this PointLight is defined in - "view" or "world".
 @param [cfg.castShadow=false] {Boolean} Flag which indicates if this PointLight casts a castShadow.
 */
import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {RenderBuffer} from '../webgl/RenderBuffer.js';
import {math} from '../math/math.js';

class PointLight extends Component {

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

    init(cfg) {

        super.init(cfg);

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

     This will be either World- or View-space, depending on the value of {@link PointLight/space}.

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
