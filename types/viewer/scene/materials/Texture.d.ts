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
     * 2D translation vector added to this Texture's *S* and *T* UV coordinates.
     *
     * Default value is ````[0, 0]````.
     *
     * @type {Number[]}
     */
    translate: number[];
    /**
     * 2D scaling vector that will be applied to this Texture's *S* and *T* UV coordinates.
     *
     * Default value is ````[1, 1]````.
     *
     * @type {Number[]}
     */
    scale: number[];
    /**
     * Rotation angles, in degrees, that will be applied to this Texture's *S* and *T* UV coordinates.
     *
     * Default value is ````0````.
     *
     * @type {Number}
     */
    rotate: number;
    /**
     * Path to an image file to source this Texture from.
     *
     * Sets {@link Texture.image} null.
     *
     * @type {String}
     */
    src: string;
    /**
     * HTML DOM Image object to source this Texture from.
     *
     * Sets {@link Texture.src} null.
     *
     * @type {HTMLImageElement}
     */
    image: HTMLImageElement;
    
    /**
     * How this Texture is sampled when a texel covers less than one pixel.
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
    readonly minFilter: string;
    /**
     * How this Texture is sampled when a texel covers more than one pixel.
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
    readonly magFilter: string;
    /**
     * Wrap parameter for this Texture's *S* coordinate.
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
    readonly wrapS: string;
    /**
     * Wrap parameter for this Texture's *T* coordinate.
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
    readonly wrapT: string;
    /**
     * Whether this Texture's source data is flipped along its vertical axis.
     *
     * @type {Boolean}
     */
    readonly flipY: boolean;
    /**
     * Texture's encoding format.
     *
     * @type {String}
     */
    readonly encoding: string;
    /**
     * Destroys this Texture
     */
    destroy(): void;
}
