import {Component} from '../Component.js';
import {Node} from "../nodes/Node.js";
import {Mesh} from "../mesh/Mesh.js";
import {PhongMaterial} from "../materials/PhongMaterial.js";
import {buildPlaneGeometry} from "../geometry/builders/buildPlaneGeometry.js";
import {Texture} from "../materials/Texture.js";
import {buildGridGeometry} from "../geometry/builders/buildGridGeometry.js";
import {ReadableGeometry} from "../geometry/ReadableGeometry.js";
import {math} from "../math/math.js";
import {worldToRTCPos} from "../math/rtcCoords.js";

const tempVec3 = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const zeroVec = math.vec3([0, -1, 0]);
const tempQuat = math.vec4([0, 0, 0, 1]);

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
 * [<img src="http://xeokit.io/img/docs/ImagePlane/ImagePlane.png">](http://xeokit.github.io/xeokit-sdk/examples/#ImagePlane_groundPlane)
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#ImagePlane_groundPlane)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {ImagePlane} from "../src/viewer/scene/ImagePlane/ImagePlane.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
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
 *      src: "./models/xkt/schependomlaan/schependomlaan.xkt",
 *      metaModelSrc: "./metaModels/schependomlaan/metaModel.json",
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
 * [<img src="http://xeokit.io/img/docs/ImagePlane/ImagePlane_planView.png">](http://xeokit.github.io/xeokit-sdk/examples/#ImagePlane_imageInSectionPlane)
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#ImagePlane_imageInSectionPlane)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
 * import {SectionPlanesPlugin} from "../src/plugins/SectionPlanesPlugin/SectionPlanesPlugin.js";
 * import {ImagePlane} from "../src/viewer/scene/ImagePlane/ImagePlane.js";
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
class ImagePlane extends Component {

    /**
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this ````ImagePlane```` as well.
     * @param {*} [cfg]  ````ImagePlane```` configuration
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     * @param {Boolean} [cfg.visible=true] Indicates whether or not this ````ImagePlane```` is visible.
     * @param {Boolean} [cfg.gridVisible=true] Indicates whether or not the grid is visible.  Grid is only visible when ````ImagePlane```` is also visible.
     * @param {Number[]} [cfg.position=[0,0,0]] World-space position of the ````ImagePlane````.
     * @param {Number[]} [cfg.size=1] World-space size of the longest edge of the ````ImagePlane````. Note that
     * ````ImagePlane```` sets its aspect ratio to match its image. If we set a value of ````1000````, and the image
     * has size ````400x300````, then the ````ImagePlane```` will then have size ````1000 x 750````.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Local rotation of the ````ImagePlane````, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Modelling transform matrix for the ````ImagePlane````. Overrides the ````position````, ````size```, ````rotation```` and ````dir```` parameters.
     * @param {Boolean} [cfg.collidable=true] Indicates if the ````ImagePlane```` is initially included in boundary calculations.
     * @param {Boolean} [cfg.clippable=true] Indicates if the ````ImagePlane```` is initially clippable.
     * @param {Boolean} [cfg.pickable=true] Indicates if the ````ImagePlane```` is initially pickable.
     * @param {Number} [cfg.opacity=1.0] ````ImagePlane````'s initial opacity factor, multiplies by the rendered fragment alpha.
     * @param {String} [cfg.src] URL of image. Accepted file types are PNG and JPEG.
     * @param {HTMLImageElement} [cfg.image] An ````HTMLImageElement```` to source the image from. Overrides ````src````.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._src = null;
        this._image = null;
        this._pos = math.vec3();
        this._rtcCenter = math.vec3();
        this._rtcPos = math.vec3();
        this._dir = math.vec3();
        this._size = 1.0;
        this._imageSize = math.vec2();

        this._texture = new Texture(this);

        this._plane = new Mesh(this, {

            geometry: new ReadableGeometry(this, buildPlaneGeometry({
                center: [0, 0, 0],
                xSize: 1,
                zSize: 1,
                xSegments: 10,
                zSegments: 10
            })),

            material: new PhongMaterial(this, {
                diffuse: [0, 0, 0],
                ambient: [0, 0, 0],
                specular: [0, 0, 0],
                diffuseMap: this._texture,
                emissiveMap: this._texture,
                backfaces: true
            }),
            clippable: cfg.clippable
        });

        this._grid = new Mesh(this, {
            geometry: new ReadableGeometry(this, buildGridGeometry({
                size: 1,
                divisions: 10
            })),
            material: new PhongMaterial(this, {
                diffuse: [0.0, 0.0, 0.0],
                ambient: [0.0, 0.0, 0.0],
                emissive: [0.2, 0.8, 0.2]
            }),
            position: [0, 0.001, 0.0],
            clippable: cfg.clippable
        });

        this._node = new Node(this, {
            rotation: [0, 0, 0],
            position: [0, 0, 0],
            scale: [1, 1, 1],
            clippable: false,
            children: [
                this._plane,
                this._grid
            ]
        });

        this._gridVisible = false;

        this.visible = true;
        this.gridVisible = cfg.gridVisible;
        this.position = cfg.position;
        this.rotation = cfg.rotation;
        this.dir = cfg.dir;
        this.size = cfg.size;
        this.collidable = cfg.collidable;
        this.clippable = cfg.clippable;
        this.pickable = cfg.pickable;
        this.opacity = cfg.opacity;

        if (cfg.image) {
            this.image = cfg.image;
        } else {
            this.src = cfg.src;
        }
    }

    /**
     * Sets if this ````ImagePlane```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} visible Set ````true```` to make this ````ImagePlane```` visible.
     */
    set visible(visible) {
        this._plane.visible = visible;
        this._grid.visible = (this._gridVisible && visible);
    }

    /**
     * Gets if this ````ImagePlane```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if visible.
     */
    get visible() {
        return this._plane.visible;
    }

    /**
     * Sets if this ````ImagePlane````'s grid  is visible or not.
     *
     * Default value is ````false````.
     *
     * Grid is only visible when ````ImagePlane```` is also visible.
     *
     * @param {Boolean} visible Set ````true```` to make this ````ImagePlane````'s grid visible.
     */
    set gridVisible(visible) {
        visible = (visible !== false);
        this._gridVisible = visible;
        this._grid.visible = (this._gridVisible && this.visible);
    }

    /**
     * Gets if this ````ImagePlane````'s grid is visible or not.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} Returns ````true```` if visible.
     */
    get gridVisible() {
        return this._gridVisible;
    }

    /**
     * Sets an ````HTMLImageElement```` to source the image from.
     *
     * Sets {@link Texture#src} null.
     *
     * @type {HTMLImageElement}
     */
    set image(image) {
        this._image = image;
        if (this._image) {
            this._imageSize[0] = image.width;
            this._imageSize[1] = image.height;
            this._updatePlaneSizeFromImage();
            this._src = null;
            this._texture.image = this._image;
        }
    }

    /**
     * Gets the ````HTMLImageElement```` the ````ImagePlane````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {HTMLImageElement}
     */
    get image() {
        return this._image;
    }

    /**
     * Sets an image file path that the ````ImagePlane````'s image is sourced from.
     *
     * Accepted file types are PNG and JPEG.
     *
     * Sets {@link Texture#image} null.
     *
     * @type {String}
     */
    set src(src) {
        this._src = src;
        if (this._src) {
            this._image = null;
            const image = new Image();
            image.onload = () => {
                this._texture.image = image;
                this._imageSize[0] = image.width;
                this._imageSize[1] = image.height;
                this._updatePlaneSizeFromImage();
            };
            image.src = this._src;
        }
    }

    /**
     * Gets the image file path that the ````ImagePlane````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {String}
     */
    get src() {
        return this._src;
    }

    /**
     * Sets the World-space position of this ````ImagePlane````.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @param {Number[]} value New position.
     */
    set position(value) {
        this._pos.set(value || [0, 0, 0]);
        worldToRTCPos(this._pos, this._rtcCenter, this._rtcPos);
        this._node.rtcCenter = this._rtcCenter;
        this._node.position = this._rtcPos;
    }

    /**
     * Gets the World-space position of this ````ImagePlane````.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @returns {Number[]} Current position.
     */
    get position() {
        return this._pos;
    }

    /**
     * Sets the direction of this ````ImagePlane```` using Euler angles.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @param {Number[]} value Euler angles for ````X````, ````Y```` and ````Z```` axis rotations.
     */
    set rotation(value) {
        this._node.rotation = value;
    }

    /**
     * Gets the direction of this ````ImagePlane```` as Euler angles.
     *
     * @returns {Number[]} Euler angles for ````X````, ````Y```` and ````Z```` axis rotations.
     */
    get rotation() {
        return this._node.rotation;
    }

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
    set size(size) {
        this._size = (size === undefined || size === null) ? 1.0 : size;
        if (this._image) {
            this._updatePlaneSizeFromImage()
        }
    }

    /**
     * Gets the World-space size of the longest edge of the ````ImagePlane````.
     *
     * Returns {Number} World-space size of the ````ImagePlane````.
     */
    get size() {
        return this._size;
    }

    /**
     * Sets the direction of this ````ImagePlane```` as a direction vector.
     *
     * Default value is ````[0, 0, -1]````.
     *
     * @param {Number[]} dir New direction vector.
     */
    set dir(dir) {

        this._dir.set(dir || [0, 0, -1]);

        if (dir) {

            const origin = this.scene.center;
            const negDir = [-this._dir[0], -this._dir[1], -this._dir[2]];

            math.subVec3(origin, this.position, tempVec3);

            const dist = -math.dotVec3(negDir, tempVec3);

            math.normalizeVec3(negDir);
            math.mulVec3Scalar(negDir, dist, tempVec3b);
            math.vec3PairToQuaternion(zeroVec, dir, tempQuat);

            this._node.quaternion = tempQuat;
        }
    }

    /**
     * Gets the direction of this ````ImagePlane```` as a direction vector.
     *
     * @returns {Number[]} value Current direction.
     */
    get dir() {
        return this._dir;
    }

    /**
     * Sets if this ````ImagePlane```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set collidable(value) {
        this._node.collidable = (value !== false);
    }

    /**
     * Gets if this ````ImagePlane```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._node.collidable;
    }

    /**
     * Sets if this ````ImagePlane```` is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set clippable(value) {
        this._node.clippable = (value !== false);
    }

    /**
     * Gets if this ````ImagePlane````  is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._node.clippable;
    }

    /**
     * Sets if this ````ImagePlane```` is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set pickable(value) {
        this._node.pickable = (value !== false);
    }

    /**
     * Gets if this ````ImagePlane````  is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get pickable() {
        return this._node.pickable;
    }

    /**
     * Sets the opacity factor for this ````ImagePlane````.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity) {
        this._node.opacity = opacity;
    }

    /**
     * Gets this ````ImagePlane````'s opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        return this._node.opacity;
    }

    /**
     * @destroy
     */
    destroy() {
        this._state.destroy();
        super.destroy();
    }

    _updatePlaneSizeFromImage() {
        const size = this._size;
        const width = this._imageSize[0];
        const height = this._imageSize[1];
        const aspect = height / width;
        if (width > height) {
            this._node.scale = [size, 1.0, size * aspect];
        } else {
            this._node.scale = [size * aspect, 1.0, size];
        }
    }
}

export {ImagePlane};
