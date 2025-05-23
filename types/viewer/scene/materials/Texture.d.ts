import { Component } from '../Component';

export declare type TextureConfiguration = {
    /** Optional ID for this Texture, unique among all components in the parent scene, generated automatically when omitted. */
    id?: string;
    /** Path to image file to load into this Texture. See the {@link Texture#src} property for more info. */
    src?: string;
    /** HTML Image object to load into this Texture. See the {@link Texture#image} property for more info. */
    image?: HTMLImageElement;
    /** How the texture is sampled when a texel covers less than one pixel. */
    minFilter?: "LinearFilter" | "LinearMipMapNearestFilter" | "NearestMipMapNearestFilter" | "NearestMipMapLinearFilter" | "LinearMipMapLinearFilter";
    /** How the texture is sampled when a texel covers more than one pixel. Supported values are {@link LinearFilter} and {@link NearestFilter}. */
    magFilter?: "LinearFilter" | "NearestFilter";
    /** Wrap parameter for texture coordinate *S*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}. */
    wrapS?: "ClampToEdgeWrapping" | "MirroredRepeatWrapping" | "RepeatWrapping";
    /** Wrap parameter for texture coordinate *T*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}. */
    wrapT?: "ClampToEdgeWrapping" | "MirroredRepeatWrapping" | "RepeatWrapping";
    /** Flips this Texture's source data along its vertical axis when ````true````. */
    flipY?: boolean;
    /** 2D translation vector that will be added to texture's *S* and *T* coordinates. */
    translate?: number[];
    /** 2D scaling vector that will be applied to texture's *S* and *T* coordinates. */
    scale?: number[];
    /** Rotation, in degrees, that will be applied to texture's *S* and *T* coordinates. */
    rotate?: number;
    /** Encoding format. Supported values are {@link LinearEncoding} and {@link sRGBEncoding}. */
    encoding?: "LinearEncoding" | "sRGBEncoding";
}
export declare class Texture extends Component {
    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this Texture as well.
     * @param {TextureConfiguration} [cfg] Configs
     */
    constructor(owner: Component, cfg?: TextureConfiguration);
    
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
    /**
     * Destroys this Texture
     */
    destroy(): void;
}
