import {Component} from '../Component.js';


export declare class Bitmap extends Component {

    /**
     * Creates a new Bitmap.
     *
     * Registers the Bitmap in {@link Scene#bitmaps}; causes Scene to fire a "bitmapCreated" event.
     *
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this ````Bitmap```` as well.
     * @param {*} [cfg]  ````Bitmap```` configuration
     * @param {string} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     * @param {Boolean} [cfg.visible=true] Indicates whether or not this ````Bitmap```` is visible.
     * @param {number[]} [cfg.pos=[0,0,0]] World-space position of the ````Bitmap````.
     * @param {number[]} [cfg.normal=[0,0,1]] Normal vector indicating the direction the ````Bitmap```` faces.
     * @param {number[]} [cfg.up=[0,1,0]] Direction of "up" for the ````Bitmap````.
     * @param {number[]} [cfg.height=1] World-space height of the ````Bitmap````.
     * @param {number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Modelling transform matrix for the ````Bitmap````. Overrides the ````position````, ````height```, ````rotation```` and ````normal```` parameters.
     * @param {Boolean} [cfg.collidable=true] Indicates if the ````Bitmap```` is initially included in boundary calculations.
     * @param {Boolean} [cfg.clippable=true] Indicates if the ````Bitmap```` is initially clippable.
     * @param {Boolean} [cfg.pickable=true] Indicates if the ````Bitmap```` is initially pickable.
     * @param {number} [cfg.opacity=1.0] ````Bitmap````'s initial opacity factor, multiplies by the rendered fragment alpha.
     * @param {string} [cfg.src] URL of image. Accepted file types are PNG and JPEG.
     * @param {HTMLImageElement} [cfg.image] An ````HTMLImageElement```` to source the image from. Overrides ````src````.
     * @param {string} [cfg.imageData]    Image data as a base64 encoded string.
     * @param {string} [cfg.type="jpg"] Image MIME type. Accepted values are "jpg" and "png". Default is "jpg". Normally only needed with ````image```` or ````imageData````. Automatically inferred from file extension of ````src````, if the file has a recognized extension.
     */
    constructor(owner: Component, cfg?: any);

    /**
     * Sets if this ````Bitmap```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} visible Set ````true```` to make this ````Bitmap```` visible.
     */
    set visible(visible: boolean) ;

    /**
     * Gets if this ````Bitmap```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if visible.
     */
    get visible(): boolean;

    /**
     * Sets an ````HTMLImageElement```` to source the image from.
     *
     * Sets {@link Texture#src} null.
     *
     * You may also need to set {@link Bitmap#type}, if you want to read the image data with {@link Bitmap#imageData}.
     *
     * @type {HTMLImageElement}
     */
    set image(image: HTMLImageElement);

    /**
     * Gets the ````HTMLImageElement```` the ````Bitmap````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {HTMLImageElement}
     */
    get image(): HTMLImageElement;

    /**
     * Sets an image file path that the ````Bitmap````'s image is sourced from.
     *
     * If the file extension is a recognized MIME type, also sets {@link Bitmap#type} to that MIME type.
     *
     * Accepted file types are PNG and JPEG.
     *
     * @type {string}
     */
    set src(src: string);

    /**
     * Gets the image file path that the ````Bitmap````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {string}
     */
    get src(): string;

    /**
     * Sets an image file path that the ````Bitmap````'s image is sourced from.
     *
     * Accepted file types are PNG and JPEG.
     *
     * Sets {@link Texture#image} null.
     *
     * You may also need to set {@link Bitmap#type}, if you want to read the image data with {@link Bitmap#imageData}.
     *
     * @type {string}
     */
    set imageData(imageData: string);

    /**
     * Gets the image file path that the ````Bitmap````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {string}
     */
    get imageData(): string;

    /**
     * Sets the MIME type of this Bitmap.
     *
     * This is used by ````Bitmap```` when getting image data with {@link Bitmap#imageData}.
     *
     * Supported values are "jpg" and "png",
     *
     * Default is "jpg".
     *
     * @type {string}
     */
    set type(type: string);

    /**
     * Gets the MIME type of this Bitmap.
     *
     * @type {string}
     */
    get type(): string;

    /**
     * Gets the World-space position of this ````Bitmap````.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @returns {number[]} Current position.
     */
    get pos(): number[];

    /**
     * Gets the direction of the normal vector that is perpendicular to this ````Bitmap````.
     *
     * @returns {number[]} value Current normal direction.
     */
    get normal(): number[];

    /**
     * Gets the "up" direction of this ````Bitmap````.
     *
     * @returns {number[]} value Current "up" direction.
     */
    get up(): number[];

    /**
     * Sets the World-space height of the ````Bitmap````.
     *
     * Default value is ````1.0````.
     *
     * @param {number} height New World-space height of the ````Bitmap````.
     */
    set height(height: number);

    /**
     * Gets the World-space height of the ````Bitmap````.
     *
     * Returns {number} World-space height of the ````Bitmap````.
     */
    get height(): number;

    /**
     * Sets if this ````Bitmap```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set collidable(value: boolean) ;

    /**
     * Gets if this ````Bitmap```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get collidable(): boolean;

    /**
     * Sets if this ````Bitmap```` is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set clippable(value: boolean);

    /**
     * Gets if this ````Bitmap````  is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get clippable(): boolean;

    /**
     * Sets if this ````Bitmap```` is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set pickable(value: boolean);

    /**
     * Gets if this ````Bitmap````  is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get pickable(): boolean;

    /**
     * Sets the opacity factor for this ````Bitmap````.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {number}
     */
    set opacity(opacity: boolean);

    /**
     * Gets this ````Bitmap````'s opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {number}
     */
    get opacity(): boolean;

    /**
     * Destroys this ````Bitmap````.
     *
     * Removes the ```Bitmap```` from {@link Scene#bitmaps}; causes Scene to fire a "bitmapDestroyed" event.
     */
    destroy(): void;

}

