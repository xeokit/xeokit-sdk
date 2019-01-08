import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';

/**
 *  @desc An arbitrarily-aligned World-space clipping plane.
 *
 * * Slices portions off objects to create cross-section views or reveal interiors.
 * * Registered by {@link Clip#id} in {@link Scene#clips}.
 * * Indicates World-space position in {@link Clip#pos} and orientation in {@link Clip#dir}.
 * * Discards elements from the half-space in the direction of {@link Clip#dir}.
 * * Can be be enabled or disabled via {@link Clip#active}.
 *
 * ## Usage
 *
 * ````javascript
 * // Create a clip plane on negative diagonal
 * new Clip(myViewer.scene, {
 *     pos: [1.0, 1.0, 1.0],
 *     dir: [-1.0, -1.0, -1.0],
 *     active: true
 * }),
 *
 * // Create a clip plane on positive diagonal
 * new Clip(myViewer.scene, {
 *     pos: [-1.0, -1.0, -1.0],
 *     dir: [1.0, 1.0, 1.0],
 *     active: true
 * });
 *
 * // Create a Mesh that clipped by our Clips
 * var mesh = new Mesh(myViewer.scene, {
 *      geometry: new SphereGeometry(),
 *      clippable: true // Enable clipping (default)
 * });
 * ````
 *
 * ## Selectively enabling or disabling clipping
 *
 * {@link Node#clippable} and {@link Mesh#clippable} indicate if the Node or Mesh is affected by Clip components.
 *
 * You can switch it at any time, like this:
 *
 * ```` javascript
 * // Disable clipping for the Mesh
 * mesh.clippable = false;
 *
 * // Enable clipping for the Mesh
 * mesh.clippable = true;
 * ````
 */
class Clip extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type {String}
     @final
     */
    get type() {
        return "Clip";
    }

    /**
     * @constructor
     *
     * @param owner
     * @param cfg
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._state = new RenderState({
            active: true,
            pos: new Float32Array(3),
            dir: new Float32Array(3)
        });

        this.active = cfg.active;
        this.pos = cfg.pos;
        this.dir = cfg.dir;

        this.scene._clipCreated(this);
    }

    /**
     Indicates if this Clip is active or not.

     @property active
     @default true
     @type {Boolean}
     */
    set active(value) {
        this._state.active = value !== false;
        this.glRedraw();
        /**
         Fired whenever this Clip's {@link Clip#active} property changes.

         @event active
         @param value {Boolean} The property's new value
         */
        this.fire("active", this._state.active);
    }

    get active() {
        return this._state.active;
    }

    /**
     The World-space position of this Clip's plane.

     @property pos
     @default [0, 0, 0]
     @type {Float32Array}
     */
    set pos(value) {
        this._state.pos.set(value || [0, 0, 0]);
        this.glRedraw();
        /**
         Fired whenever this Clip's {@link Clip#pos} property changes.

         @event pos
         @param value Float32Array The property's new value
         */
        this.fire("pos", this._state.pos);
    }

    get pos() {
        return this._state.pos;
    }

    /**
     Vector indicating the orientation of this Clip plane.

     The vector originates at {@link Clip#pos}. Elements on the
     same side of the vector are clipped.

     @property dir
     @default [0, 0, -1]
     @type {Float32Array}
     */
    set dir(value) {
        this._state.dir.set(value || [0, 0, -1]);
        this.glRedraw();
        /**
         Fired whenever this Clip's {@link Clip#dir} property changes.

         @event dir
         @param value {Float32Array} The property's new value
         */
        this.fire("dir", this._state.dir);
    }

    get dir() {
        return this._state.dir;
    }

    destroy() {
        this._state.destroy();
        this.scene._clipDestroyed(this);
        super.destroy();
    }
}

export {Clip};
