import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {math} from '../math/math.js';

/**
 * Configures Fresnel effects for {@link PhongMaterial}s.
 *
 * Fresnels are attached to {@link PhongMaterial}s, which are attached to {@link Mesh}es.
 *
 * ## Usage
 *
 * In the example below we'll create a {@link Mesh} with a {@link PhongMaterial} that uses two Fresnels to configure
 * Fresnel effects for diffuse and specular illumination.
 *
 *  ````javascript
 * var mesh = new Mesh(myViewer.scene, {
 *
 *      material: new PhongMaterial(myViewer.scene, {
 *          ambient: [0.3, 0.3, 0.3],
 *          shininess: 30,
 *
 *          diffuseFresnel: new Fresnel(myViewer.scene, {
 *              edgeColor: [1.0, 1.0, 1.0],
 *              centerColor: [0.0, 0.0, 0.0],
 *              power: 4,
 *              bias: 0.6
 *          }),
 *
 *          specularFresnel: new Fresnel(myViewer.scene, {
 *              edgeColor: [1.0, 1.0, 1.0],
 *              centerColor: [0.0, 0.0, 0.0],
 *              power: 4,
 *              bias: 0.2
 *          })
 *      }),
 *
 *      new TorusGeometry(myViewer.scene)
 * });
 * ````
 */
class Fresnel extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "Fresnel";
    }

    /**
     @class Fresnel
     @module xeokit
     @submodule materials
     @constructor
     @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well. Creates this component within the default {@link Scene} when omitted.
     @param {*} [cfg] Configs
     @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     @param {String:Object} [cfg.meta] Optional map of user-defined metadata to attach to this Fresnel.
     @param [cfg.edgeColor=[ 0.0, 0.0, 0.0 ]] {Array of Number} Color used on edges.
     @param [cfg.centerColor=[ 1.0, 1.0, 1.0 ]] {Array of Number} Color used on center.
     @param [cfg.edgeBias=0] {Number} Bias at the edge.
     @param [cfg.centerBias=1] {Number} Bias at the center.
     @param [cfg.power=0] {Number} The power.
     @extends Component
     * @param owner
     * @param cfg
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._state = new RenderState({
            edgeColor: math.vec3([0, 0, 0]),
            centerColor: math.vec3([1, 1, 1]),
            edgeBias: 0,
            centerBias: 1,
            power: 1
        });

        this.edgeColor = cfg.edgeColor;
        this.centerColor = cfg.centerColor;
        this.edgeBias = cfg.edgeBias;
        this.centerBias = cfg.centerBias;
        this.power = cfg.power;
    }

    /**
     This Fresnel's edge color.

     @property edgeColor
     @default [0.0, 0.0, 0.0]
     @type Float32Array
     */
    set edgeColor(value) {
        this._state.edgeColor.set(value || [0.0, 0.0, 0.0]);
        this.glRedraw();
    }

    get edgeColor() {
        return this._state.edgeColor;
    }

    /**
     This Fresnel's center color.

     @property centerColor
     @default [1.0, 1.0, 1.0]
     @type Float32Array
     */
    set centerColor(value) {
        this._state.centerColor.set(value || [1.0, 1.0, 1.0]);
        this.glRedraw();
    }

    get centerColor() {
        return this._state.centerColor;
    }

    /**
     * Indicates this Fresnel's edge bias.
     *
     * @property edgeBias
     * @default 0
     * @type Number
     */
    set edgeBias(value) {
        this._state.edgeBias = value || 0;
        this.glRedraw();
    }

    get edgeBias() {
        return this._state.edgeBias;
    }

    /**
     * Indicates this Fresnel's center bias.
     *
     * @property centerBias
     * @default 1
     * @type Number
     */
    set centerBias(value) {
        this._state.centerBias = (value !== undefined && value !== null) ? value : 1;
        this.glRedraw();
    }

    get centerBias() {
        return this._state.centerBias;
    }

    /**
     * Indicates this Fresnel's power.
     *
     * @property power
     * @default 1
     * @type Number
     */
    set power(value) {
        this._state.power = (value !== undefined && value !== null) ? value : 1;
        this.glRedraw();
    }

    get power() {
        return this._state.power;
    }

    destroy() {
        super.destroy();
        this._state.destroy();
    }
}

export {Fresnel};