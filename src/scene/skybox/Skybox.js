import {Component} from "../Component.js";
import {Mesh} from "../mesh/Mesh.js";
import {ReadableGeometry} from "../geometry/ReadableGeometry.js";
import {PhongMaterial} from "../materials/PhongMaterial.js";
import {Texture} from "../materials/Texture.js";

class Skybox extends Component {

    constructor(owner, cfg={}) {

        super(owner, cfg);

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
            scale: [2000, 2000, 2000], // Overridden when we initialize the 'size' property, below
            rotation: [0, -90, 0],
            material: new PhongMaterial(this, {
                ambient: [0, 0, 0],
                diffuse: [0, 0, 0],
                specular: [0, 0, 0],
                emissive: [1, 1, 1],
                emissiveMap: new Texture(this, {
                    src: cfg.src,
                    flipY: true,
                    encoding: cfg.encoding || "sRGB"
                }),
                backfaces: true // Show interior faces of our skybox geometry
            }),
            // stationary: true,
            visible: false,
            pickable: false,
            collidable: false
        });

        this.size = cfg.size; // Sets 'xyz' property on the Mesh's Scale transform
        this.active = cfg.active;
    }


    /**
     Size of this Skybox, given as the distance from the center at [0,0,0] to each face.

     @property size
     @default 1000
     @type {Number}
     */
    set size(value) {
        this._size = value || 1000;
        this._skyboxMesh.scale = [this._size, this._size, this._size];
    }

    get size() {
        return this._size;
    }


    /**
     Indicates if this Skybox is visible or not.

     @property active
     @default false
     @type {Boolean}
     */
    set active(value) {
        this._skyboxMesh.visible = value;
    }

    get active() {
        return this._skyboxMesh.visible;
    }
}

export {Skybox}