import {Component} from '../Component.js';
import {Node} from '../nodes/Node.js';
import {Mesh} from '../mesh/Mesh.js';
import {Texture} from '../materials/Texture.js';

/**
 *  @desc A plane-shaped 3D object containing a bitmap image.
 *
 * Use ````ImagePlane```` to embed bitmap images in your scenes.
 *
 * As shown in the examples below, ````ImagePlane```` is useful for creating ground planes from satellite maps and embedding 2D plan
 * view images in cross-section slicing planes.
 *
 * # Example 1: Create a ground plane from a satellite image
 *
 * In our first example, we'll load the Schependomlaan model, then use
 * an ````ImagePlane```` to create a ground plane, which will contain
 * a satellite image sourced from Google Maps.
 *
 * <img src="http://xeokit.io/img/docs/ImagePlane/schependomlaanGoogleSatMapMed.png">
 *
 * [<img src="http://xeokit.io/img/docs/ImagePlane/ImagePlane.png">](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#ImagePlane_groundPlane)
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#ImagePlane_groundPlane)]
 *
 * ````javascript
 * import {Viewer, ImagePlane, XKTLoaderPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 *  });
 *
 * viewer.camera.eye = [-8.31, 42.21, 54.30];
 * viewer.camera.look = [-0.86, 15.40, 14.90];
 * viewer.camera.up = [0.10, 0.83, -0.54];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * xktLoader.load({             // Load IFC model
 *      id: "myModel",
 *      src: "./models/xkt/Schependomlaan.xkt",
 *      edges: true,
 *
 *      rotation: [0, 22, 0],   // Rotate, position and scale the model to align it correctly with the ImagePlane
 *      position: [-8, 0, 15],
 *      scale: [1.1, 1.1, 1.1]
 *  });
 *
 * new ImagePlane(viewer.scene, {
 *      src: "./images/schependomlaanSatMap.png",       // Google satellite image; accepted file types are PNG and JPEG
 *      visible: true,                                  // Show the ImagePlane
 *      gridVisible: true,                              // Show the grid - grid is only visible when ImagePlane is also visible
 *      size: 190,                                      // Size of ImagePlane's longest edge
 *      position: [0, -1, 0],                           // World-space position of ImagePlane's center
 *      rotation: [0, 0, 0],                            // Euler angles for X, Y and Z
 *      opacity: 1.0,                                   // Fully opaque
 *      collidable: false,                              // ImagePlane does not contribute to Scene boundary
 *      clippable: true,                                // ImagePlane can be clipped by SectionPlanes
 *      pickable: true                                  // Allow the ground plane to be picked
 * });
 * ````
 *<br>
 *
 * # Example 2: Embed an image in a cross-section plane
 *
 * In our second example, we'll load the Schependomlaan model again, then slice it in half with
 * a {@link SectionPlanesPlugin}, then use an ````ImagePlane```` to embed a 2D plan view image in the slicing plane.
 *
 * <img src="http://xeokit.io/img/docs/ImagePlane/schependomlaanPlanViewMed.png">
 *
 * [<img src="http://xeokit.io/img/docs/ImagePlane/ImagePlane_planView.png">](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#ImagePlane_imageInSectionPlane)
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#ImagePlane_imageInSectionPlane)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, SectionPlanesPlugin, ImagePlane} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.camera.eye = [-9.11, 20.01, 5.13];
 * viewer.camera.look = [9.07, 0.77, -9.78];
 * viewer.camera.up = [0.47, 0.76, -0.38];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const sectionPlanes = new SectionPlanesPlugin(viewer, {
 *     overviewVisible: false
 * });
 *
 * model = xktLoader.load({
 *     id: "myModel",
 *     src: "./models/xkt/schependomlaan/schependomlaan.xkt",
 *     metaModelSrc: "./metaModels/schependomlaan/metaModel.json",
 *     edges: true,
 * });
 *
 * const sectionPlane = sectionPlanes.createSectionPlane({
 *     id: "mySectionPlane",
 *     pos: [10.95, 1.95, -10.35],
 *     dir: [0.0, -1.0, 0.0]
 * });
 *
 * const imagePlane = new ImagePlane(viewer.scene, {
 *     src: "./images/schependomlaanPlanView.png",  // Plan view image; accepted file types are PNG and JPEG
 *     visible: true,
 *     gridVisible: true,
 *     size: 23.95,
 *     position: sectionPlane.pos,
 *     dir: sectionPlane.dir,
 *     collidable: false,
 *     opacity: 0.75,
 *     clippable: false,                            // Don't allow ImagePlane to be clipped by the SectionPlane
 *     pickable: false                              // Don't allow ImagePlane to be picked
 *  });
 * ````
 */
export declare class ImagePlane extends Component {
    /**
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this ImagePlane as well.
     * @param {*} [cfg]  ImagePlane configuration
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent Scene, generated automatically when omitted.
     * @param {Boolean} [cfg.visible=true] Indicates whether or not this ImagePlane is visible.
     * @param {Boolean} [cfg.gridVisible=true] Indicates whether or not the grid is visible. Grid is only visible when ImagePlane is also visible.
     * @param {Number[]} [cfg.position=[0,0,0]] World-space position of the ImagePlane.
     * @param {Number[]} [cfg.size=1] World-space size of the longest edge of the ImagePlane.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Local rotation of the ImagePlane, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Modelling transform matrix for the ImagePlane. Overrides the position, size, rotation and dir parameters.
     * @param {Boolean} [cfg.collidable=true] Indicates if the ImagePlane is initially included in boundary calculations.
     * @param {Boolean} [cfg.clippable=true] Indicates if the ImagePlane is initially clippable.
     * @param {Boolean} [cfg.pickable=true] Indicates if the ImagePlane is initially pickable.
     * @param {Number} [cfg.opacity=1.0] ImagePlane's initial opacity factor, multiplies by the rendered fragment alpha.
     * @param {String} [cfg.src] URL of image. Accepted file types are PNG and JPEG.
     * @param {HTMLImageElement} [cfg.image] An HTMLImageElement to source the image from. Overrides src.
     */
    constructor(owner: Component, cfg?: {
        id?: string;
        visible?: boolean;
        gridVisible?: boolean;
        position?: number[];
        size?: number;
        rotation?: number[];
        matrix?: number[];
        collidable?: boolean;
        clippable?: boolean;
        pickable?: boolean;
        opacity?: number;
        src?: string;
        image?: HTMLImageElement;
        dir?: number[];
    });

    /**
     * Sets if this ````ImagePlane```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} visible Set ````true```` to make this ````ImagePlane```` visible.
     */
    set visible(visible: boolean);

    /**
     * Gets if this ````ImagePlane```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if visible.
     */
    get visible(): boolean;

    /**
     * Sets if this ````ImagePlane````'s grid  is visible or not.
     *
     * Default value is ````false````.
     *
     * Grid is only visible when ````ImagePlane```` is also visible.
     *
     * @param {Boolean} visible Set ````true```` to make this ````ImagePlane````'s grid visible.
     */
    set gridVisible(visible: boolean);

    /**
     * Gets if this ````ImagePlane````'s grid is visible or not.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} Returns ````true```` if visible.
     */
    get gridVisible(): boolean;

    /**
     * Sets an ````HTMLImageElement```` to source the image from.
     *
     * Sets {@link Texture#src} null.
     *
     * @type {HTMLImageElement}
     */
    set image(image: HTMLImageElement | null);

    /**
     * Gets the ````HTMLImageElement```` the ````ImagePlane````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {HTMLImageElement}
     */
    get image(): HTMLImageElement | null;

    /**
     * Sets an image file path that the ````ImagePlane````'s image is sourced from.
     *
     * Accepted file types are PNG and JPEG.
     *
     * Sets {@link Texture#image} null.
     *
     * @type {String}
     */
    set src(src: string | null);

    /**
     * Gets the image file path that the ````ImagePlane````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {String}
     */
    get src(): string | null;

    /**
     * Sets the World-space position of this ````ImagePlane````.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @param {Number[]} value New position.
     */
    set position(value: number[]);

    /**
     * Gets the World-space position of this ````ImagePlane````.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @returns {Number[]} Current position.
     */
    get position(): number[];

    /**
     * Sets the direction of this ````ImagePlane```` using Euler angles.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @param {Number[]} value Euler angles for ````X````, ````Y```` and ````Z```` axis rotations.
     */
    set rotation(value: number[]);

    /**
     * Gets the direction of this ````ImagePlane```` as Euler angles.
     *
     * @returns {Number[]} Euler angles for ````X````, ````Y```` and ````Z```` axis rotations.
     */
    get rotation(): number[];

    /**
     * Sets the World-space size of the longest edge of the ````ImagePlane````.
     *
     * Note that ````ImagePlane```` sets its aspect ratio to match its image. If we set a value of ````1000````, and
     * the image has size ````400x300````, then the ````ImagePlane```` will then have size ````1000 x 750````.
     *
     * Default value is ````1.0````.
     *
     * @param {Number} size New World-space size of the ````ImagePlane````.
     */
    set size(size: number);

    /**
     * Gets the World-space size of the longest edge of the ````ImagePlane````.
     *
     * @returns {Number} World-space size of the ````ImagePlane````.
     */
    get size(): number;

    /**
     * Sets the direction of this ````ImagePlane```` as a direction vector.
     *
     * Default value is ````[0, 0, -1]````.
     *
     * @param {Number[]} dir New direction vector.
     */
    set dir(dir: number[]);

    /**
     * Gets the direction of this ````ImagePlane```` as a direction vector.
     *
     * @returns {Number[]} value Current direction.
     */
    get dir(): number[];

    /**
     * Sets if this ````ImagePlane```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set collidable(value: boolean);

    /**
     * Gets if this ````ImagePlane```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get collidable(): boolean;

    /**
     * Sets if this ````ImagePlane```` is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set clippable(value: boolean);

    /**
     * Gets if this ````ImagePlane````  is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get clippable(): boolean;

    /**
     * Sets if this ````ImagePlane```` is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set pickable(value: boolean);

    /**
     * Gets if this ````ImagePlane````  is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get pickable(): boolean;

    /**
     * Sets the opacity factor for this ````ImagePlane````.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity: number);

    /**
     * Gets this ````ImagePlane````'s opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity(): number;

    /**
     * @destroy
     */
    destroy(): void;

    protected _node: Node;
    protected _plane: Mesh;
    protected _grid: Mesh;
    protected _texture: Texture;
    protected _src: string | null;
    protected _image: HTMLImageElement | null;
    protected _pos: Float32Array;
    protected _origin: Float32Array;
    protected _rtcPos: Float32Array;
    protected _dir: Float32Array;
    protected _size: number;
    protected _imageSize: Float32Array;
    protected _gridVisible: boolean;
    protected _updatePlaneSizeFromImage(): void;
}