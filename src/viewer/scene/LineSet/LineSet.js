import {Component} from '../Component.js';
import {Mesh} from "../mesh";
import {PhongMaterial, Texture} from "../materials";
import {math} from "../math/";
import {worldToRTCPos} from "../math/rtcCoords.js";
import {VBOGeometry} from "../geometry";

/**
 *  A set of 3D line segments.
 */
class LineSet extends Component {

    /**
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this ````LineSet```` as well.
     * @param {*} [cfg]  ````LineSet```` configuration
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     * @param {Number[]} cfg.positions World-space vertex positions.
     * @param {Number[]} [cfg.indices] Indices
     * @param {Boolean} [cfg.visible=true] Indicates whether or not this ````LineSet```` is visible.
     * @param {Number} [cfg.opacity=1.0] ````LineSet````'s initial opacity factor, multiplies by the rendered fragment alpha.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._positions = cfg.positions || [];

        this._origin = math.vec3(cfg.origin || [0, 0, 0]);

        if (cfg.indices) {
            this._indices = cfg.indices;
        } else {
            this._indices = [];
            for (let i = 0, len = (this._positions.length / 3) - 1; i < len; i += 2) {
                this._indices.push(i);
                this._indices.push(i + 1);
            }
        }

        this._mesh = new Mesh(this, {
            visible: cfg.visible,
            clippable: cfg.clippable,
            collidable: cfg.collidable,
            geometry: new VBOGeometry(this, {
                primitive: "lines",
                positions: this._positions,
                indices: this._indices,
                origin: cfg.origin
            }),
            material: new PhongMaterial(this, {
                diffuse: [1, 0, 0]
            })
        });

        this.scene._lineSetCreated(this);
    }

    /**
     * Sets if this ````LineSet```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} visible Set ````true```` to make this ````LineSet```` visible.
     */
    set visible(visible) {
        this._mesh.visible = visible;
    }

    /**
     * Gets if this ````LineSet```` is visible or not.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if visible.
     */
    get visible() {
        return this._mesh.visible;
    }

    /**
     * Gets the vertex positions of the lines in this ````LineSet````.
     *
     * @returns {Number[]}
     */
    get positions() {
        return this._positions;
    }

    /**
     * Gets the vertex indices of the lines in this ````LineSet````.
     *
     * @returns {Number[]}
     */
    get indices() {
        return this._indices;
    }

    /**
     * @destroy
     */
    destroy() {
        super.destroy();
        this.scene._lineSetDestroyed(this);
    }
}

export {LineSet};
