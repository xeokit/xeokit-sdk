import {Component} from '../Component.js';
import {Mesh} from "../mesh/Mesh.js";
import {Node} from "../nodes/Node.js";
import {PhongMaterial, Texture} from "../materials/index.js";
import {buildPlaneGeometry, ReadableGeometry} from "../geometry/index.js";
import {math} from "../math/math.js";

/**
 *  A plane-shaped 3D object containing a bitmap image.
 *
 * * Creates a 3D quad containing our bitmap, located and oriented using ````pos````, ````normal```` and ````up```` vectors.
 * * Registered by {@link Bitmap#id} in {@link Scene#bitmaps}.
 * * {@link BCFViewpointsPlugin} will save and load Bitmaps in BCF viewpoints.
 *
 * ## Usage
 *
 * In the example below, we'll load the Schependomlaan model, then use
 * an ````Bitmap```` to show a storey plan next to the model.
 *
 * [<img src="http://xeokit.github.io/xeokit-sdk/assets/images/Bitmap_storeyPlan.png">](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#ImagePlane_imageInSectionPlane)
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#ImagePlane_imageInSectionPlane)]
 *
 * ````javascript
 * import {Viewer, Bitmap, XKTLoaderPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 *  });
 *
 * viewer.camera.eye = [-24.65, 21.69, 8.16];
 * viewer.camera.look = [-14.62, 2.16, -1.38];
 * viewer.camera.up = [0.59, 0.57, -0.56];
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * xktLoader.load({
 *      id: "myModel",
 *      src: "./models/xkt/Schependomlaan.xkt",
 *      edges: true
 *  });
 *
 * new Bitmap(viewer.scene, {
 *      src: "./images/schependomlaanPlanView.png",
 *      visible: true,                             // Show the Bitmap
 *      height: 24.0,                              // Height of Bitmap
 *      pos: [-15, 0, -10],                        // World-space position of Bitmap's center
 *      normal: [0, -1, 0],                        // Vector perpendicular to Bitmap
 *      up: [0, 0, 1],                             // Direction of Bitmap "up"
 *      collidable: false,                         // Bitmap does not contribute to Scene boundary
 *      clippable: true,                           // Bitmap can be clipped by SectionPlanes
 *      pickable: true                             // Allow the ground plane to be picked
 * });
 * ````
 */
class Bitmap extends Component {

    /**
     * Creates a new Bitmap.
     *
     * Registers the Bitmap in {@link Scene#bitmaps}; causes Scene to fire a "bitmapCreated" event.
     *
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this ````Bitmap```` as well.
     * @param {*} [cfg]  ````Bitmap```` configuration
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     * @param {Boolean} [cfg.visible=true] Indicates whether or not this ````Bitmap```` is visible.
     * @param {Number[]} [cfg.pos=[0,0,0]] World-space position of the ````Bitmap````.
     * @param {Number[]} [cfg.normal=[0,0,1]] Normal vector indicating the direction the ````Bitmap```` faces.
     * @param {Number[]} [cfg.up=[0,1,0]] Direction of "up" for the ````Bitmap````.
     * @param {Number[]} [cfg.height=1] World-space height of the ````Bitmap````.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Modelling transform matrix for the ````Bitmap````. Overrides the ````position````, ````height```, ````rotation```` and ````normal```` parameters.
     * @param {Boolean} [cfg.collidable=true] Indicates if the ````Bitmap```` is initially included in boundary calculations.
     * @param {Boolean} [cfg.clippable=true] Indicates if the ````Bitmap```` is initially clippable.
     * @param {Boolean} [cfg.pickable=true] Indicates if the ````Bitmap```` is initially pickable.
     * @param {Number} [cfg.opacity=1.0] ````Bitmap````'s initial opacity factor, multiplies by the rendered fragment alpha.
     * @param {String} [cfg.src] URL of image. Accepted file types are PNG and JPEG.
     * @param {HTMLImageElement} [cfg.image] An ````HTMLImageElement```` to source the image from. Overrides ````src````.
     * @param {String} [cfg.imageData]    Image data as a base64 encoded string.
     * @param {String} [cfg.type="jpg"] Image MIME type. Accepted values are "jpg" and "png". Default is "jpg". Normally only needed with ````image```` or ````imageData````. Automatically inferred from file extension of ````src````, if the file has a recognized extension.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._type = cfg.type || (cfg.src ? cfg.src.split('.').pop() : null) || "jpg";
        this._pos = math.vec3(cfg.pos || [0, 0, 0]);
        this._up = math.vec3(cfg.up || [0, 1, 0]);
        this._normal = math.vec3(cfg.normal || [0, 0, 1]);
        this._height = cfg.height || 1.0;

        this._origin = math.vec3();
        this._rtcPos = math.vec3();
        this._imageSize = math.vec2();

        this._texture = new Texture(this, {
            flipY: true
        });

        this._image = new Image();

        if (this._type !== "jpg" && this._type !== "png") {
            this.error(`Unsupported type - defaulting to "jpg"`);
            this._type = "jpg";
        }

        this._node = new Node(this, {
            matrix: math.inverseMat4(
                math.lookAtMat4v(this._pos, math.subVec3(this._pos, this._normal, math.mat4()),
                    this._up,
                    math.mat4())),
            children: [

                this._bitmapMesh = new Mesh(this, {
                    scale: [1, 1, 1],
                    rotation: [-90, 0, 0],
                    collidable: cfg.collidable,
                    pickable: cfg.pickable,
                    opacity: cfg.opacity,
                    clippable: cfg.clippable,

                    geometry: new ReadableGeometry(this, buildPlaneGeometry({
                        center: [0, 0, 0],
                        xSize: 1,
                        zSize: 1,
                        xSegments: 2,
                        zSegments: 2
                    })),

                    material: new PhongMaterial(this, {
                        diffuse: [0, 0, 0],
                        ambient: [0, 0, 0],
                        specular: [0, 0, 0],
                        diffuseMap: this._texture,
                        emissiveMap: this._texture,
                        backfaces: true
                    })
                })
            ]
        });

        if (cfg.image) {
            this.image = cfg.image;
        } else if (cfg.src) {
            this.src = cfg.src;
        } else if (cfg.imageData) {
            this.imageData = cfg.imageData;
        }

        this.scene._bitmapCreated(this);
    }

    /**
     * Sets if this ````Bitmap```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} visible Set ````true```` to make this ````Bitmap```` visible.
     */
    set visible(visible) {
        this._bitmapMesh.visible = visible;
    }

    /**
     * Gets if this ````Bitmap```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if visible.
     */
    get visible() {
        return this._bitmapMesh.visible;
    }

    /**
     * Sets an ````HTMLImageElement```` to source the image from.
     *
     * Sets {@link Texture#src} null.
     *
     * You may also need to set {@link Bitmap#type}, if you want to read the image data with {@link Bitmap#imageData}.
     *
     * @type {HTMLImageElement}
     */
    set image(image) {
        this._image = image;
        if (this._image) {
            this._texture.image = this._image;
            this._imageSize[0] = this._image.width;
            this._imageSize[1] = this._image.height;
            this._updateBitmapMeshScale();
        }
    }

    /**
     * Gets the ````HTMLImageElement```` the ````Bitmap````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {HTMLImageElement}
     */
    get image() {
        return this._image;
    }

    /**
     * Sets an image file path that the ````Bitmap````'s image is sourced from.
     *
     * If the file extension is a recognized MIME type, also sets {@link Bitmap#type} to that MIME type.
     *
     * Accepted file types are PNG and JPEG.
     *
     * @type {String}
     */
    set src(src) {
        if (src) {
            this._image.onload = () => {
                this._texture.image = this._image;
                this._imageSize[0] = this._image.width;
                this._imageSize[1] = this._image.height;
                this._updateBitmapMeshScale();
            };
            this._image.src = src;
            const ext = src.split('.').pop();
            switch (ext) {
                case "jpeg":
                case "jpg":
                    this._type = "jpg";
                    break;
                case "png":
                    this._type = "png";
            }
        }
    }

    /**
     * Gets the image file path that the ````Bitmap````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {String}
     */
    get src() {
        return this._image.src;
    }

    /**
     * Sets an image file path that the ````Bitmap````'s image is sourced from.
     *
     * Accepted file types are PNG and JPEG.
     *
     * Sets {@link Texture#image} null.
     *
     * You may also need to set {@link Bitmap#type}, if you want to read the image data with {@link Bitmap#imageData}.
     *
     * @type {String}
     */
    set imageData(imageData) {
        this._image.onload = () => {
            this._texture.image = image;
            this._imageSize[0] = image.width;
            this._imageSize[1] = image.height;
            this._updateBitmapMeshScale();
        };
        this._image.src = imageData;
    }

    /**
     * Gets the image file path that the ````Bitmap````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {String}
     */
    get imageData() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = this._image.width;
        canvas.height = this._image.height;
        context.drawImage(this._image, 0, 0);
        return canvas.toDataURL(this._type === "jpg" ? 'image/jpeg' : 'image/png');
    }

    /**
     * Sets the MIME type of this Bitmap.
     *
     * This is used by ````Bitmap```` when getting image data with {@link Bitmap#imageData}.
     *
     * Supported values are "jpg" and "png",
     *
     * Default is "jpg".
     *
     * @type {String}
     */
    set type(type) {
        type = type || "jpg";
        if (type !== "png" || type !== "jpg") {
            this.error("Unsupported value for `type` - supported types are `jpg` and `png` - defaulting to `jpg`");
            type = "jpg";
        }
        this._type = type;
    }

    /**
     * Gets the MIME type of this Bitmap.
     *
     * @type {String}
     */
    get type() {
        return this._type;
    }

    /**
     * Gets the World-space position of this ````Bitmap````.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @returns {Number[]} Current position.
     */
    get pos() {
        return this._pos;
    }

    /**
     * Gets the direction of the normal vector that is perpendicular to this ````Bitmap````.
     *
     * @returns {Number[]} value Current normal direction.
     */
    get normal() {
        return this._normal;
    }

    /**
     * Gets the "up" direction of this ````Bitmap````.
     *
     * @returns {Number[]} value Current "up" direction.
     */
    get up() {
        return this._up;
    }

    /**
     * Sets the World-space height of the ````Bitmap````.
     *
     * Default value is ````1.0````.
     *
     * @param {Number} height New World-space height of the ````Bitmap````.
     */
    set height(height) {
        this._height = (height === undefined || height === null) ? 1.0 : height;
        if (this._image) {
            this._updateBitmapMeshScale();
        }
    }

    /**
     * Gets the World-space height of the ````Bitmap````.
     *
     * Returns {Number} World-space height of the ````Bitmap````.
     */
    get height() {
        return this._height;
    }

    /**
     * Sets if this ````Bitmap```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set collidable(value) {
        this._bitmapMesh.collidable = (value !== false);
    }

    /**
     * Gets if this ````Bitmap```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._bitmapMesh.collidable;
    }

    /**
     * Sets if this ````Bitmap```` is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set clippable(value) {
        this._bitmapMesh.clippable = (value !== false);
    }

    /**
     * Gets if this ````Bitmap````  is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._bitmapMesh.clippable;
    }

    /**
     * Sets if this ````Bitmap```` is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set pickable(value) {
        this._bitmapMesh.pickable = (value !== false);
    }

    /**
     * Gets if this ````Bitmap````  is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get pickable() {
        return this._bitmapMesh.pickable;
    }

    /**
     * Sets the opacity factor for this ````Bitmap````.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity) {
        this._bitmapMesh.opacity = opacity;
    }

    /**
     * Gets this ````Bitmap````'s opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        return this._bitmapMesh.opacity;
    }

    /**
     * Destroys this ````Bitmap````.
     *
     * Removes the ```Bitmap```` from {@link Scene#bitmaps}; causes Scene to fire a "bitmapDestroyed" event.
     */
    destroy() {
        super.destroy();
        this.scene._bitmapDestroyed(this);
    }

    _updateBitmapMeshScale() {
        const aspect = this._imageSize[1] / this._imageSize[0];
        this._bitmapMesh.scale = [this._height / aspect, 1.0, this._height];
    }
}

export {Bitmap};
