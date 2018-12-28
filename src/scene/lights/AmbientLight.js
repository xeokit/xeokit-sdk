import {math} from '../math/math.js';
import {Light} from './Light.js';

/**
 * @desc An ambient light source of fixed color and intensity that illuminates all {@link Mesh}es equally.
 *
 * * {@link AmbientLight#color} multiplies by {@link PhongMaterial#ambient} at each position of each {@link Geometry} surface.
 * * {@link AmbientLight#color} multiplies by {@link LambertMaterial#color} uniformly across each triangle of each {@link Geometry} (ie. flat shaded).
 * * {@link AmbientLight}s, {@link DirLight}s and {@link PointLight}s are registered by their {@link Component#id} on {@link Scene#lights}.
 *
 * ## Usage
 *
 * In the example below we'll destroy the {@link Scene}'s default light sources then create an AmbientLight and a couple of {@link @DirLight}s:
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
 * // Adjust the color of our AmbientLight
 *
 * var ambientLight = myViewer.scene.lights["myAmbientLight"];
 * ambientLight.color = [1.0, 0.8, 0.8];
 * ````
 */
class AmbientLight extends Light {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "AmbientLight";
    }

    /**
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
     @param {*} [cfg] AmbientLight configuration
     @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     @param {String:Object} [cfg.meta] Optional map of user-defined metadata to attach to this AmbientLight.
     @param [cfg.color=[0.7, 0.7, 0.8]] {Array(Number)} The color of this AmbientLight.
     @param [cfg.intensity=[1.0]] {Number} The intensity of this AmbientLight, as a factor in range ````[0..1]````.
     * @param owner
     * @param cfg
     */
    constructor(owner, cfg={}) {
        super(owner, cfg);
        this._state = {
            type: "ambient",
            color: math.vec3([0.7, 0.7, 0.7]),
            intensity: 1.0
        };
        this.color = cfg.color;
        this.intensity = cfg.intensity;
        this.scene._lightCreated(this);
    }

    /**
     The color of this AmbientLight.

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
     The intensity of this AmbientLight.

     @property intensity
     @default 1.0
     @type Number
     */
    set intensity(value) {
        this._state.intensity = value !== undefined ? value : 1.0;
        this.glRedraw();
    }

    get intensity() {
        return this._state.intensity;
    }

    destroy() {
        super.destroy();
    }
}

export {AmbientLight};
