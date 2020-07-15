import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {Node} from "../nodes/Node.js";
import {Mesh} from "../mesh/Mesh.js";
import {PhongMaterial} from "../materials/PhongMaterial.js";
import {buildPlaneGeometry} from "../geometry/builders/buildPlaneGeometry.js";
import {Texture} from "../materials/Texture.js";
import {buildGridGeometry} from "../geometry/builders/buildGridGeometry.js";
import {ReadableGeometry} from "../geometry/ReadableGeometry.js";
import {math} from "../math/math.js";

const tempVec3 = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const zeroVec = math.vec3([0, 0, 1]);
const tempQuat = math.vec4([0, 0, 0, 1]);

/**
 *  @desc A plane-shaped 3D object containg an image.
 *
 * ## Usage
 *
 * In the example below, we'll use an ````ImagePlane```` to create a ground plane containing a satellite image from Google Maps.
 *
 * [<img src="http://xeokit.io/img/docs/ImagePlane/ImagePlane.png">](http://xeokit.github.io/xeokit-sdk/examples/#ImagePlane_groundPlane)
 *
 * [[Run this example](http://xeokit.github.io/xeokit-sdk/examples/#ImagePlane_groundPlane)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {ImagePlane} from "../src/viewer/scene/ImagePlane/ImagePlane.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
 * import {DirLight} from "../src/viewer/scene/lights/DirLight.js";
 * import {AmbientLight} from "../src/viewer/scene/lights/AmbientLight.js";
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
 *      src: "./images/schependomlaanGoogleSatMap.png", // Google satellite image
 *      visible: true,                                  // Show the ImagePlane
 *      gridVisible: true,                              // Show the grid - grid is only visible when ImagePlane is also visible
 *      size: 190,                                      // Size of ImagePlane's longest edge
 *      position: [0, -1, 0],                           // World-space position of ImagePlane's center
 *      rotation: [0, 0, 0],                            // Euler angles for X, Y and Z
 *      opacity: 1.0,                                   // Fully opaque
 *      collidable: false,                              // ImagePlane does not contribute to Scene boundary
 *      clippable: true                                 // ImagePlane can be clipped by SectionPlanes
 * });
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
     * @param {Number} [cfg.opacity=1.0] ````ImagePlane````'s initial opacity factor, multiplies by the rendered fragment alpha.
     * @param {String} [cfg.src] URL of image.
     * @param {HTMLImageElement} [cfg.image] An ````HTMLImageElement```` to source the image from. Overrides ````src````.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._src = null;
        this._image = null;
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
        this._node.position = value;
    }

    /**
     * Gets the World-space position of this ````ImagePlane````.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @returns {Number[]} Current position.
     */
    get position() {
        return this._node.position;
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

        // if (dir) {
        //
        //     const origin = this.scene.center;
        //     const negDir = [-this._dir[0], -this._dir[1], -this._dir[2]];
        //
        //     math.subVec3(origin, this.position, tempVec3);
        //
        //     const dist = -math.dotVec3(negDir, tempVec3);
        //
        //     math.normalizeVec3(negDir);
        //     math.mulVec3Scalar(negDir, dist, tempVec3b);
        //     math.vec3PairToQuaternion(zeroVec, dir, tempQuat);
        //
        //     // tempVec3c[0] = tempVec3b[0] * 0.1;
        //     // tempVec3c[1] = tempVec3b[1] * 0.1;
        //     // tempVec3c[2] = tempVec3b[2] * 0.1;
        //
        //     this._node.quaternion = tempQuat;
        //     // this._mesh.position = tempVec3c;
        // }
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
        this._node.collidable = value;
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
        this._node.clippable = value;
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
