/**
 * @desc A 2D texture map.
 *
 * * Textures are attached to {@link Material}s, which are attached to {@link Mesh}es.
 * * To create a Texture from an image file, set {@link Texture.src} to the image file path.
 * * To create a Texture from an HTMLImageElement, set the Texture's {@link Texture.image} to the HTMLImageElement.
 *
 * ## Usage
 *
 * In this example we have a Mesh with a {@link PhongMaterial} which applies diffuse {@link Texture}, and a {@link buildTorusGeometry} which builds a {@link ReadableGeometry}.
 *
 * Note that xeokit will ignore {@link PhongMaterial.diffuse} and {@link PhongMaterial.specular}, since we override those
 * with {@link PhongMaterial.diffuseMap} and {@link PhongMaterial.specularMap}. The {@link Texture} pixel colors directly
 * provide the diffuse and specular components for each fragment across the {@link ReadableGeometry} surface.
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#materials_Texture)]
 *
 * ```` javascript
 * import {Viewer, Mesh, buildTorusGeometry,
 *      ReadableGeometry, PhongMaterial, Texture} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * viewer.camera.eye = [0, 0, 5];
 * viewer.camera.look = [0, 0, 0];
 * viewer.camera.up = [0, 1, 0];
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
 *          ambient: [0.9, 0.3, 0.9],
 *          shininess: 30,
 *          diffuseMap: new Texture(viewer.scene, {
 *              src: "textures/diffuse/uvGrid2.jpg"
 *          })
 *      })
 * });
 *````
 */
export declare class Texture extends Component {
    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this Texture as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID for this Texture, unique among all components in the parent scene, generated automatically when omitted.
     * @param {String} [cfg.src=null] Path to image file to load into this Texture. See the {@link Texture.src} property for more info.
     * @param {HTMLImageElement} [cfg.image=null] HTML Image object to load into this Texture. See the {@link Texture.image} property for more info.
     * @param {String} [cfg.minFilter="linearMipmapLinear"] How the texture is sampled when a texel covers less than one pixel. See the {@link Texture.minFilter} property for more info.
     * @param {String} [cfg.magFilter="linear"] How the texture is sampled when a texel covers more than one pixel. See the {@link Texture.magFilter} property for more info.
     * @param {String} [cfg.wrapS="repeat"] Wrap parameter for texture coordinate *S*. See the {@link Texture.wrapS} property for more info.
     * @param {String} [cfg.wrapT="repeat"] Wrap parameter for texture coordinate *S*. See the {@link Texture.wrapT} property for more info.
     * @param {Boolean} [cfg.flipY=false] Flips this Texture's source data along its vertical axis when true.
     * @param {Number[]} [cfg.translate=[0,0]] 2D translation vector that will be added to texture's *S* and *T* coordinates.
     * @param {Number[]} [cfg.scale=[1,1]] 2D scaling vector that will be applied to texture's *S* and *T* coordinates.
     * @param {Number} [cfg.rotate=0] Rotation, in degrees, that will be applied to texture's *S* and *T* coordinates.
     * @param  {String} [cfg.encoding="linear"] Encoding format.  See the {@link Texture.encoding} property for more info.
     */
    constructor(owner: Component, cfg?: any);
    _state: any;
    _src: string;
    _image: any;
    _translate: any;
    _scale: any;
    _rotate: any;
    _matrixDirty: boolean;
    /**
     * Sets the 2D translation vector added to this Texture's *S* and *T* UV coordinates.
     *
     * Default value is ````[0, 0]````.
     *
     * @type {Number[]}
     */
    set translate(arg: number[]);
    /**
     * Gets the 2D translation vector added to this Texture's *S* and *T* UV coordinates.
     *
     * Default value is ````[0, 0]````.
     *
     * @type {Number[]}
     */
    get translate(): number[];
    /**
     * Sets the 2D scaling vector that will be applied to this Texture's *S* and *T* UV coordinates.
     *
     * Default value is ````[1, 1]````.
     *
     * @type {Number[]}
     */
    set scale(arg: number[]);
    /**
     * Gets the 2D scaling vector that will be applied to this Texture's *S* and *T* UV coordinates.
     *
     * Default value is ````[1, 1]````.
     *
     * @type {Number[]}
     */
    get scale(): number[];
    /**
     * Sets the rotation angles, in degrees, that will be applied to this Texture's *S* and *T* UV coordinates.
     *
     * Default value is ````0````.
     *
     * @type {Number}
     */
    set rotate(arg: number);
    /**
     * Gets the rotation angles, in degrees, that will be applied to this Texture's *S* and *T* UV coordinates.
     *
     * Default value is ````0````.
     *
     * @type {Number}
     */
    get rotate(): number;
    /**
     * Sets path to an image file to source this Texture from.
     *
     * Sets {@link Texture.image} null.
     *
     * @type {String}
     */
    set src(arg: string);
    /**
     * Gets path to the image file this Texture from, if any.
     *
     * Returns null if not set.
     *
     * @type {String}
     */
    get src(): string;
    /**
     * Sets an HTML DOM Image object to source this Texture from.
     *
     * Sets {@link Texture.src} null.
     *
     * @type {HTMLImageElement}
     */
    set image(arg: HTMLImageElement);
    /**
     * Gets HTML DOM Image object this Texture is sourced from, if any.
     *
     * Returns null if not set.
     *
     * @type {HTMLImageElement}
     */
    get image(): HTMLImageElement;
    _checkMinFilter(value: any): any;
    _checkMagFilter(value: any): any;
    _checkFilter(value: any): any;
    _checkWrapS(value: any): any;
    _checkWrapT(value: any): any;
    _checkFlipY(value: any): boolean;
    _checkEncoding(value: any): any;
    _webglContextRestored(): void;
    /**
     * Gets how this Texture is sampled when a texel covers less than one pixel.
     *
     * Options are:
     *
     * * "nearest" - Uses the value of the texture element that is nearest
     * (in Manhattan distance) to the center of the pixel being textured.
     *
     * * "linear" - Uses the weighted average of the four texture elements that are
     * closest to the center of the pixel being textured.
     *
     * * "nearestMipmapNearest" - Chooses the mipmap that most closely matches the
     * size of the pixel being textured and uses the "nearest" criterion (the texture
     * element nearest to the center of the pixel) to produce a texture value.
     *
     * * "linearMipmapNearest" - Chooses the mipmap that most closely matches the size of
     * the pixel being textured and uses the "linear" criterion (a weighted average of the
     * four texture elements that are closest to the center of the pixel) to produce a
     * texture value.
     *
     * * "nearestMipmapLinear" - Chooses the two mipmaps that most closely
     * match the size of the pixel being textured and uses the "nearest" criterion
     * (the texture element nearest to the center of the pixel) to produce a texture
     * value from each mipmap. The final texture value is a weighted average of those two
     * values.
     *
     * * "linearMipmapLinear" - (default) - Chooses the two mipmaps that most closely match the size
     * of the pixel being textured and uses the "linear" criterion (a weighted average
     * of the four texture elements that are closest to the center of the pixel) to
     * produce a texture value from each mipmap. The final texture value is a weighted
     * average of those two values.
     *
     * Default value is "linearMipmapLinear".
     *
     *  @type {String}
     */
    get minFilter(): string;
    /**
     * Gets how this Texture is sampled when a texel covers more than one pixel.
     *
     * * "nearest" - Uses the value of the texture element that is nearest
     * (in Manhattan distance) to the center of the pixel being textured.
     * * "linear" - (default) - Uses the weighted average of the four texture elements that are
     * closest to the center of the pixel being textured.
     *
     * Default value is "linearMipmapLinear".
     *
     * @type {String}
     */
    get magFilter(): string;
    /**
     * Gets the wrap parameter for this Texture's *S* coordinate.
     *
     * Values can be:
     *
     * * "clampToEdge" -  causes *S* coordinates to be clamped to the size of the texture.
     * * "mirroredRepeat" - causes the *S* coordinate to be set to the fractional part of the texture coordinate
     * if the integer part of *S* is even; if the integer part of *S* is odd, then the *S* texture coordinate is
     * set to *1 - frac ⁡ S* , where *frac ⁡ S* represents the fractional part of *S*.
     * * "repeat" - (default) - causes the integer part of the *S* coordinate to be ignored; xeokit uses only the
     * fractional part, thereby creating a repeating pattern.
     *
     * Default value is "repeat".
     *
     * @type {String}
     */
    get wrapS(): string;
    /**
     * Gets the wrap parameter for this Texture's *T* coordinate.
     *
     * Values can be:
     *
     * * "clampToEdge" -  causes *S* coordinates to be clamped to the size of the texture.
     *  * "mirroredRepeat" - causes the *S* coordinate to be set to the fractional part of the texture coordinate
     * if the integer part of *S* is even; if the integer part of *S* is odd, then the *S* texture coordinate is
     * set to *1 - frac ⁡ S* , where *frac ⁡ S* represents the fractional part of *S*.
     * * "repeat" - (default) - causes the integer part of the *S* coordinate to be ignored; xeokit uses only the
     * fractional part, thereby creating a repeating pattern.
     *
     * Default value is "repeat".
     *
     * @type {String}
     */
    get wrapT(): string;
    /**
     * Gets if this Texture's source data is flipped along its vertical axis.
     *
     * @type {Boolean}
     */
    get flipY(): boolean;
    /**
     * Gets the Texture's encoding format.
     *
     * @type {String}
     */
    get encoding(): string;
}
import { Component } from "../Component.js";
