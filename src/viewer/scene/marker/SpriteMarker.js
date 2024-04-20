import {Mesh} from "../mesh/Mesh.js";
import {ReadableGeometry} from "../geometry/ReadableGeometry.js";
import {PhongMaterial, Texture} from "../materials/index.js";
import {math} from "../math/math.js";
import {Marker} from "./Marker.js";

/**
 * A {@link Marker} with a billboarded and textured quad attached to it.
 *
 * * Extends {@link Marker}
 * * Keeps the quad oriented towards the viewpoint
 * * Auto-fits the quad to the texture
 * * Has a world-space position
 * * Can be configured to hide the quad whenever the position is occluded by some other object
 *
 * ## Usage
 *
 * [[Run this example](/examples/index.html#markers_SpriteMarker)]
 *
 * ```` javascript
 * import {Viewer, SpriteMarker } from "./https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk/dist/xeokit-sdk.es.min.js";
 *
 * const viewer = new Viewer({
 *        canvasId: "myCanvas",
 *      transparent: true
 *  });
 *
 * viewer.scene.camera.eye = [0, 0, 25];
 * viewer.scene.camera.look = [0, 0, 0];
 * viewer.scene.camera.up = [0, 1, 0];
 *
 * new SpriteMarker(viewer.scene, {
 *      worldPos: [-10, 0, 0],
 *      src: "../assets/textures/diffuse/uvGrid2_512x1024.jpg",
 *      size: 5,
 *      occludable: false
 *  });
 *
 * new SpriteMarker(viewer.scene, {
 *      worldPos: [+10, 0, 0],
 *      src: "../assets/textures/diffuse/uvGrid2_1024x512.jpg",
 *      size: 4,
 *      occludable: false
 *  });
 *````
 */
class SpriteMarker extends Marker {

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
    constructor(owner, cfg = {}) {

        super(owner, {
            entity: cfg.entity,
            occludable: cfg.occludable,
            worldPos: cfg.worldPos
        });

        this._occluded = false;
        this._visible = true;
        this._src = null;
        this._image = null;
        this._pos = math.vec3();
        this._origin = math.vec3();
        this._rtcPos = math.vec3();
        this._dir = math.vec3();
        this._size = 1.0;
        this._imageSize = math.vec2();

        this._texture = new Texture(this, {
            src: cfg.src
        });

        this._geometry = new ReadableGeometry(this, {
            primitive: "triangles",
            positions: [3, 3, 0, -3, 3, 0, -3, -3, 0, 3, -3, 0],
            normals: [-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0],
            uv: [1, -1, 0, -1, 0, 0, 1, 0],
            indices: [0, 1, 2, 0, 2, 3] // Ensure these will be front-faces
        });

        this._mesh = new Mesh(this, {
            geometry: this._geometry,
            material: new PhongMaterial(this, {
                ambient: [0.9, 0.3, 0.9],
                shininess: 30,
                diffuseMap: this._texture,
                backfaces: true
            }),
            scale: [1, 1, 1], // Note: by design, scale does not work with billboard
            position: cfg.worldPos,
            rotation: [90, 0, 0],
            billboard: "spherical",
            occluder: false // Don't occlude SpriteMarkers or Annotations
        });

        this.visible = true;
        this.collidable = cfg.collidable;
        this.clippable = cfg.clippable;
        this.pickable = cfg.pickable;
        this.opacity = cfg.opacity;
        this.size = cfg.size;

        if (cfg.image) {
            this.image = cfg.image;
        } else {
            this.src = cfg.src;
        }
    }

    _setVisible(visible) { // Called by VisibilityTester and this._entity.on("destroyed"..)
        this._occluded = (!visible);
        this._mesh.visible = this._visible && (!this._occluded);
        super._setVisible(visible);
    }

    /**
     * Sets if this ````SpriteMarker```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} visible Set ````true```` to make this ````SpriteMarker```` visible.
     */
    set visible(visible) {
        this._visible = (visible === null || visible === undefined) ? true : visible;
        this._mesh.visible = this._visible && (!this._occluded);
    }

    /**
     * Gets if this ````SpriteMarker```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if visible.
     */
    get visible() {
        return this._visible;
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
            this._imageSize[0] = this._image.width;
            this._imageSize[1] = this._image.height;
            this._updatePlaneSizeFromImage();
            this._src = null;
            this._texture.image = this._image;
        }
    }

    /**
     * Gets the ````HTMLImageElement```` the ````SpriteMarker````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {HTMLImageElement}
     */
    get image() {
        return this._image;
    }

    /**
     * Sets an image file path that the ````SpriteMarker````'s image is sourced from.
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
     * Gets the image file path that the ````SpriteMarker````'s image is sourced from, if set.
     *
     * Returns null if not set.
     *
     * @type {String}
     */
    get src() {
        return this._src;
    }

    /**
     * Sets the World-space size of the longest edge of the ````SpriteMarker````.
     *
     * Note that ````SpriteMarker```` sets its aspect ratio to match its image. If we set a value of ````1000````, and
     * the image has size ````400x300````, then the ````SpriteMarker```` will then have size ````1000 x 750````.
     *
     * Default value is ````1.0````.
     *
     * @param {Number} size New World-space size of the ````SpriteMarker````.
     */
    set size(size) {
        this._size = (size === undefined || size === null) ? 1.0 : size;
        if (this._image) {
            this._updatePlaneSizeFromImage()
        }
    }

    /**
     * Gets the World-space size of the longest edge of the ````SpriteMarker````.
     *
     * Returns {Number} World-space size of the ````SpriteMarker````.
     */
    get size() {
        return this._size;
    }

    /**
     * Sets if this ````SpriteMarker```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set collidable(value) {
        this._mesh.collidable = (value !== false);
    }

    /**
     * Gets if this ````SpriteMarker```` is included in boundary calculations.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._mesh.collidable;
    }

    /**
     * Sets if this ````SpriteMarker```` is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set clippable(value) {
        this._mesh.clippable = (value !== false);
    }

    /**
     * Gets if this ````SpriteMarker````  is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._mesh.clippable;
    }

    /**
     * Sets if this ````SpriteMarker```` is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    set pickable(value) {
        this._mesh.pickable = (value !== false);
    }

    /**
     * Gets if this ````SpriteMarker````  is pickable.
     *
     * Default is ````true````.
     *
     * @type {Boolean}
     */
    get pickable() {
        return this._mesh.pickable;
    }

    /**
     * Sets the opacity factor for this ````SpriteMarker````.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity) {
        this._mesh.opacity = opacity;
    }

    /**
     * Gets this ````SpriteMarker````'s opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        return this._mesh.opacity;
    }

    _updatePlaneSizeFromImage() {
        const halfSize = this._size * 0.5;
        const width = this._imageSize[0];
        const height = this._imageSize[1];
        const aspect = height / width;
        if (width > height) {
            this._geometry.positions = [
                halfSize, halfSize * aspect, 0,
                -halfSize, halfSize * aspect, 0,
                -halfSize, -halfSize * aspect, 0,
                halfSize, -halfSize * aspect, 0
            ];
        } else {
            this._geometry.positions = [
                halfSize / aspect, halfSize, 0,
                -halfSize / aspect, halfSize, 0,
                -halfSize / aspect, -halfSize, 0,
                halfSize / aspect, -halfSize, 0
            ];
        }
    }
}

export {SpriteMarker};