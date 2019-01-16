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
     @private
     */
    get type() {
        return "Clip";
    }

    /**
     * @constructor
     * @param {Component} [owner]  Owner component. When destroyed, the owner will destroy this Clip as well.
     * @param {*} [cfg]  Clip configuration
     * @param  {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
     * @param {Boolean} [cfg.active=true] Indicates whether or not this Clip is active.
     * @param {Number[]} [cfg.pos=[0,0,0]] World-space position of the clipping plane.
     * @param {Number[]} [cfg.dir=[0,0 -1]] Vector perpendicular to the plane surface, indicating the Clip plane orientation.
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
     * Sets if this Clip is active or not.
     *
     * Default value is ````true````.
     *
     * @param {Boolean} value Set ````true```` to activate else ````false```` to deactivate.
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

    /**
     * Gets if this Clip is active or not.
     *
     * Default value is ````true````.
     *
     * @returns {Boolean} Returns ````true```` if active.
     */
    get active() {
        return this._state.active;
    }

    /**
     * Sets the World-space position of this Clip's plane.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @param {Number[]} value New position.
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

    /**
     * Gets the World-space position of this Clip's plane.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * @returns {Number[]} Current position.
     */
    get pos() {
        return this._state.pos;
    }

    /**
     * Sets the direction of this Clip's plane.
     *
     * Default value is ````[0, 0, -1]````.
     *
     * @param {Number[]} value New direction.
     */
    set dir(value) {
        this._state.dir.set(value || [0, 0, -1]);
        this.glRedraw();
        /**
         Fired whenever this Clip's {@link Clip#dir} property changes.

         @event dir
         @param value {Number[]} The property's new value
         */
        this.fire("dir", this._state.dir);
    }

    /**
     * Gets the direction of this Clip's plane.
     *
     * Default value is ````[0, 0, -1]````.
     *
     * @returns {Number[]} value Current direction.
     */
    get dir() {
        return this._state.dir;
    }

    /**
     * @destroy
     */
    destroy() {
        this._state.destroy();
        this.scene._clipDestroyed(this);
        super.destroy();
    }
}

export {Clip};
