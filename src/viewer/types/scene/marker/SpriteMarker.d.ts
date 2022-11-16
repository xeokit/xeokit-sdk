import {Marker} from "./Marker.js";
import {Component} from "../Component";
import {Entity} from "../Entity";

export declare type SpriteMarkerConfiguration = {
    /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
    id?: string;
    /** Entity to associate this SpriteMarker with. When the SpriteMarker has an Entity, then {@link SpriteMarker.visible} will always be ````false```` if {@link Entity.visible} is false. */
    entity?: Entity
    /** Indicates whether or not this SpriteMarker is hidden (ie. {@link SpriteMarker.visible} is ````false```` whenever occluded by {@link Entity}s in the {@link Scene}. */
    occludable?: boolean;
    /** World-space 3D SpriteMarker position. */
    worldPos?: number[];
    /** Path to image file to load into this SpriteMarker.  */
    src?: string;
    /** HTML Image object to load into this SpriteMarker. See the {@link SpriteMarker#image} property for more info. */
    image?: HTMLImageElement;
    /** Flips this SpriteMarker's texture image along its vertical axis when true. */
    flipY?: boolean;
    /** Texture encoding format.  See the {@link Texture#encoding} property for more info. */
    encoding?: string;
};


/**
 * A {@link Marker} with a billboarded and textured quad attached to it.
 */
export declare class SpriteMarker extends Marker {

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this SpriteMarker as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID for this SpriteMarker, unique among all components in the parent scene, generated automatically when omitted.
     * @param {Entity} [cfg.entity] Entity to associate this Marker with. When the SpriteMarker has an Entity, then {@link Marker#visible} will always be ````false```` if {@link Entity#visible} is false.
     * @param {Boolean} [cfg.occludable=false] Indicates whether or not this Marker is hidden (ie. {@link Marker#visible} is ````false```` whenever occluded by {@link Entity}s in the {@link Scene}.
     * @param {Number[]} [cfg.worldPos=[0,0,0]] World-space 3D Marker position.
     * @param {String} [cfg.src=null] Path to image file to load into this SpriteMarker. See the {@link SpriteMarker#src} property for more info.
     * @param {HTMLImageElement} [cfg.image=null] HTML Image object to load into this SpriteMarker. See the {@link SpriteMarker#image} property for more info.
     * @param {Boolean} [cfg.flipY=false] Flips this SpriteMarker's texture image along its vertical axis when true.
     * @param  {String} [cfg.encoding="linear"] Texture encoding format.  See the {@link Texture#encoding} property for more info.
     */
    constructor(owner?: Component, cfg?: SpriteMarkerConfiguration);

    /**
     * Gets if this ````SpriteMarker```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if visible.
     */
    get visible(): boolean;

    /**
     * Sets if this ````SpriteMarker```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} visible Set ````true```` to make this ````SpriteMarker```` visible.
     */
    set visible(visible: boolean);

    /**
     * Gets the ````HTMLImageElement```` the ````SpriteMarker````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {HTMLImageElement}
     */
    get image(): HTMLImageElement

    /**
     * Sets an ````HTMLImageElement```` to source the image from.
     *
     * Sets {@link Texture#src} null.
     *
     * @type {HTMLImageElement}
     */
    set image(image: HTMLImageElement) ;

    /**
     * Gets the image file path that the ````SpriteMarker````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {String}
     */
    get src(): string;

    /**
     * Sets an image file path that the ````SpriteMarker````'s image is sourced from.
     *
     * Accepted file types are PNG and JPEG.
     *
     * Sets {@link Texture#image} null.
     *
     * @type {String}
     */
    set src(src: string);

    /**
     * Gets the World-space size of the longest edge of the ````SpriteMarker````.
     *
     * Returns {Number} World-space size of the ````SpriteMarker````.
     */
    get size(): number;

    set size(size: number) ;

    /**
     * Gets if this ````SpriteMarker```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get collidable(): boolean;

    /**
     * Sets if this ````SpriteMarker```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set collidable(value: boolean);

    /**
     * Gets if this ````SpriteMarker````  is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get clippable(): boolean;

    /**
     * Sets if this ````SpriteMarker```` is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set clippable(value: boolean);

    /**
     * Gets if this ````SpriteMarker````  is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get pickable(): boolean;

    /**
     * Sets if this ````SpriteMarker```` is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set pickable(value: boolean);

    /**
     * Gets this ````SpriteMarker````'s opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity(): number;

    /**
     * Sets the opacity factor for this ````SpriteMarker````.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity: number);
}
