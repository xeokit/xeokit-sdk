/**
 * @desc Configures Fresnel effects for {@link PhongMaterial}s.
 *
 * Fresnels are attached to {@link PhongMaterial}s, which are attached to {@link Mesh}es.
 *
 * ## Usage
 *
 * In the example below we'll create a {@link Mesh} with a {@link PhongMaterial} that applies a Fresnel to its alpha channel to give a glasss-like effect.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#materials_Fresnel)]
 *
 * ````javascript
 * import {Viewer, Mesh, buildTorusGeometry,
 *      ReadableGeometry, PhongMaterial, Texture, Fresnel} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *       canvasId: "myCanvas",
 *       transparent: true
 * });
 *
 * viewer.scene.camera.eye = [0, 0, 5];
 * viewer.scene.camera.look = [0, 0, 0];
 * viewer.scene.camera.up = [0, 1, 0];
 *
 * new Mesh(viewer.scene, {
 *      geometry: new ReadableGeometry(viewer.scene, buildTorusGeometry({
 *          center: [0, 0, 0],
 *          radius: 1.5,
 *          tube: 0.5,
 *          radialSegments: 32,
 *          tubeSegments: 24,
 *          arc: Math.PI * 2.0
 *      }),
 *      material: new PhongMaterial(viewer.scene, {
 *          alpha: 0.9,
 *          alphaMode: "blend",
 *          ambient: [0.0, 0.0, 0.0],
 *          shininess: 30,
 *          diffuseMap: new Texture(viewer.scene, {
 *              src: "textures/diffuse/uvGrid2.jpg"
 *          }),
 *          alphaFresnel: new Fresnel(viewer.scene, {
v               edgeBias: 0.2,
 *              centerBias: 0.8,
 *              edgeColor: [1.0, 1.0, 1.0],
 *              centerColor: [0.0, 0.0, 0.0],
 *              power: 2
 *          })
 *      })
 * });
 * ````
 */
export declare class Fresnel extends Component {
    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this Fresnel as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     * @param {Number[]} [cfg.edgeColor=[ 0.0, 0.0, 0.0 ]]  Color used on edges.
     * @param {Number[]} [cfg.centerColor=[ 1.0, 1.0, 1.0 ]]  Color used on center.
     * @param {Number} [cfg.edgeBias=0]  Bias at the edge.
     * @param {Number} [cfg.centerBias=1]  Bias at the center.
     * @param {Number} [cfg.power=0]  The power.
     */
    constructor(owner: Component, cfg?: any);
    _state: any;
    /**
     * Sets the Fresnel's edge color.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @type {Number[]}
     */
    set edgeColor(arg: number[]);
    /**
     * Gets the Fresnel's edge color.
     *
     * Default value is ````[0.0, 0.0, 0.0]````.
     *
     * @type {Number[]}
     */
    get edgeColor(): number[];
    /**
     * Sets the Fresnel's center color.
     *
     * Default value is ````[1.0, 1.0, 1.0]````.
     *
     * @type {Number[]}
     */
    set centerColor(arg: number[]);
    /**
     * Gets the Fresnel's center color.
     *
     * Default value is ````[1.0, 1.0, 1.0]````.
     *
     * @type {Number[]}
     */
    get centerColor(): number[];
    /**
     * Sets the Fresnel's edge bias.
     *
     * Default value is ````0````.
     *
     * @type {Number}
     */
    set edgeBias(arg: number);
    /**
     * Gets the Fresnel's edge bias.
     *
     * Default value is ````0````.
     *
     * @type {Number}
     */
    get edgeBias(): number;
    /**
     * Sets the Fresnel's center bias.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    set centerBias(arg: number);
    /**
     * Gets the Fresnel's center bias.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    get centerBias(): number;
    /**
     * Sets the Fresnel's power.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    set power(arg: number);
    /**
     * Gets the Fresnel's power.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    get power(): number;
}
import { Component } from "../Component";
