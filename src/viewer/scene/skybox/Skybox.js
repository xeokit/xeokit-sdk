import {Component} from "../Component.js";
import {Mesh} from "../mesh/Mesh.js";
import {ReadableGeometry} from "../geometry/ReadableGeometry.js";
import {PhongMaterial} from "../materials/PhongMaterial.js";
import {Texture} from "../materials/Texture.js";
import { ClampToEdgeWrapping, LinearEncoding } from "../constants/constants.js";

/**
 * @desc A Skybox.
 */
class Skybox extends Component {

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this PointLight as well.
     * @param {*} [cfg]  Skybox configuration
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent {Scene}, generated automatically when omitted.
     * @param {String | String[]} [cfg.src=null] Path to skybox texture
     * @param {Number} [cfg.encoding=LinearEncoding] Texture encoding format.  See the {@link Texture#encoding} property for more info.
     * @param {Number} [cfg.size=1000] Size of this Skybox, given as the distance from the center at ````[0,0,0]```` to each face.
     * @param {Boolean} [cfg.active=true] True when this Skybox is visible.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        const useMultipleTexture = typeof cfg.src === "object" && cfg.src !== null;

        if (useMultipleTexture) {
            this._createCombinedTexture(cfg).then(combinedTexture => {
                this._createSkyboxMesh(cfg, combinedTexture);
            }).catch(e => this.error(e));
        } else {
            this._createSkyboxMesh(cfg);
        }
    }

    /**
     * 
     * @private
     * @param {*} cfg 
     * @param {Texture} combinedTexture 
     */
    _createSkyboxMesh(cfg, combinedTexture = null) {
        const texture = combinedTexture || new Texture(this, {
            src: cfg.src,
            flipY: true,
            wrapS: ClampToEdgeWrapping,
            wrapT: ClampToEdgeWrapping,
            encoding: cfg.encoding || LinearEncoding
        });

        this._skyboxMesh = new Mesh(this, {

            geometry: new ReadableGeometry(this, { // Box-shaped geometry
                primitive: "triangles",
                positions: [
                    1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, // v0-v1-v2-v3 front
                    1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, // v0-v3-v4-v5 right
                    1, 1, 1, 1, 1, -1, -1, 1, -1, -1, 1, 1, // v0-v5-v6-v1 top
                    -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, // v1-v6-v7-v2 left
                    -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, // v7-v4-v3-v2 bottom
                    1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1 // v4-v7-v6-v5 back
                ],
                uv: [
                    0.5, 0.6666, 0.25, 0.6666, 0.25, 0.3333, 0.5, 0.3333, 0.5, 0.6666, 0.5, 0.3333, 0.75, 0.3333, 0.75, 0.6666,
                    0.5, 0.6666, 0.5, 1, 0.25, 1, 0.25, 0.6666, 0.25, 0.6666, 0.0, 0.6666, 0.0, 0.3333, 0.25, 0.3333,
                    0.25, 0, 0.50, 0, 0.50, 0.3333, 0.25, 0.3333, 0.75, 0.3333, 1.0, 0.3333, 1.0, 0.6666, 0.75, 0.6666
                ],
                indices: [
                    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11,
                    12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23
                ]
            }),
            background: true,
            scale: [2000, 2000, 2000], // Overridden when we initialize the 'size' property, below
            rotation: [0, -90, 0],
            material: new PhongMaterial(this, {
                ambient: [0, 0, 0],
                diffuse: [0, 0, 0],
                specular: [0, 0, 0],
                emissive: [1, 1, 1],
                emissiveMap: texture,
                backfaces: true // Show interior faces of our skybox geometry
            }),
            // stationary: true,
            visible: false,
            pickable: false,
            clippable: false,
            collidable: false
        });

        this.size = cfg.size; // Sets 'xyz' property on the Mesh's Scale transform
        this.active = cfg.active;
    }

    /**
     * 
     * @private
     * @param {*} cfg 
     * @returns {Texture}
     */
    async _createCombinedTexture(cfg) {
        const [
            posX,
            negX,
            posY,
            negY,
            posZ,
            negZ
        ] = cfg.src;

        if (!posX || !negX || !posY || !negY || !posZ || !negZ) {
            throw new Error("All six skybox textures must be provided");
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const loadImage = src => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
                img.src = src;
            });
        };

        try {
            const [imgPosX, imgNegX, imgPosY, imgNegY, imgPosZ, imgNegZ] = await Promise.all([
                loadImage(posX),
                loadImage(negX),
                loadImage(posY),
                loadImage(negY),
                loadImage(posZ),
                loadImage(negZ)
            ]);

            const imageSize = imgPosX.width;
            if (
                imgNegX.width !== imageSize || imgPosY.width !== imageSize ||
                imgNegY.width !== imageSize || imgPosZ.width !== imageSize ||
                imgNegZ.width !== imageSize
            ) {
                throw new Error("All skybox textures must have the same dimensions");
            }

            // Set canvas size for the Christ cross layout (3×4 grid)
            canvas.width = imageSize * 4;
            canvas.height = imageSize * 3;

            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(imgNegX, imageSize * 0, imageSize * 1, imageSize, imageSize);  // -X (left)
            ctx.drawImage(imgPosX, imageSize * 2, imageSize * 1, imageSize, imageSize);  // +X (right)
            ctx.drawImage(imgPosY, imageSize * 1, imageSize * 0, imageSize, imageSize);  // +Y (top)
            ctx.drawImage(imgNegY, imageSize * 1, imageSize * 2, imageSize, imageSize);  // -Y (bottom)
            ctx.drawImage(imgPosZ, imageSize * 1, imageSize * 1, imageSize, imageSize);  // +Z (front)
            ctx.drawImage(imgNegZ, imageSize * 3, imageSize * 1, imageSize, imageSize);  // -Z (back)

            const combinedTexture = new Texture(this, {
                image: canvas,
                flipY: true,
                wrapS: ClampToEdgeWrapping,
                wrapT: ClampToEdgeWrapping,
                encoding: cfg.encoding || LinearEncoding
            });

            return combinedTexture;
        } catch (error) {
            console.error("Error creating combined skybox texture:", error);
            throw error;
        }
    }

    /**
     * Sets the size of this Skybox, given as the distance from the center at [0,0,0] to each face.
     *
     * Default value is ````1000````.
     *
     * @param {Number} value The size.
     */
    set size(value) {
        this._size = value || 1000;
        this._skyboxMesh.scale = [this._size, this._size, this._size];
    }

    /**
     * Gets the size of this Skybox, given as the distance from the center at [0,0,0] to each face.
     *
     * Default value is ````1000````.
     *
     * @returns {Number} The size.
     */
    get size() {
        return this._size;
    }

    /**
     * Sets whether this Skybox is visible or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} active Whether to make active or not.
     */
    set active(active) {
        this._skyboxMesh.visible = active;
    }

    /**
     * Gets if this Skybox is visible or not.
     *
     * Default active is ````true````.
     *
     * @returns {Boolean} ````true```` if the Skybox is active.
     */
    get active() {
        return this._skyboxMesh.visible;
    }
}

export {Skybox}
