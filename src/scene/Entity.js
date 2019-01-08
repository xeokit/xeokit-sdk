/**
 * @desc A {@link Scene} element, possibly representing a model or an object, that can be individually shown, hidden, selected, highlighted, ghosted, culled, picked, clipped and bounded.
 *
 * * An Entity represents a model when it has a {@link Entity#modelId}, in which case it is also registered
 * by {@link Entity#modelId} in {@link Scene#models}, and may also have a corresponding {@link MetaModel}.
 * * An Entity represents an object when it has an {@link Entity#objectId}, in which case it is also registered
 * by {@link Entity#objectId} in {@link Scene#objects}, and may also have a corresponding {@link MetaObject}.
 *
 * @interface
 * @abstract
 */
class Entity {

    /**
     * Returns true to indicate that this is an Entity.
     *
     * @returns {Boolean}
     */
    get isEntity() {
        return true;
    }

    /**
     * Model ID, defined if this Entity represents a model.
     *
     * When this returns a value, the Entity will be registered by {@link Entity#modelId} in {@link Scene#models} and
     * may also have a corresponding {@link MetaObject}.
     *
     * @type {Number|String}
     * @abstract
     */
    get modelId() {
    }

    /**
     * Object ID, defined if this Entity represents an object.
     *
     * When this returns a value, the Entity will be registered by {@link Entity#objectId} in {@link Scene#objects} and
     * may also have a corresponding {@link MetaObject}.
     *
     * @type {Number|String}
     * @abstract
     */
    get objectId() {
    }

    /**
     * World-space 3D axis-aligned bounding box (AABB) of this Entity.
     *
     * Represented by a six-element Float32Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Float32Array}
     * @abstract
     */
    get aabb() {
    }

    /**
     * Sets if this Entity is visible.
     *
     * Only rendered when {@link Entity#visible} returns true and {@link Entity#culled} returns false.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#visible} returns true the Entity will be
     * registered by {@link Entity#objectId} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set visible(visible) {
    }

    /**
     * Gets if this Entity is visible.
     *
     * Only rendered when {@link Entity#visible} returns true and {@link Entity#culled} returns false.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#visible} returns true the Entity will be
     * registered by {@link Entity#objectId} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get visible() {
    }

    /**
     * Sets if this Entity is highlighted.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#highlighted} returns true the Entity will be
     * registered by {@link Entity#objectId} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set highlighted(highlighted) {

    }

    /**
     * Gets if this Entity is highlighted.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#highlighted} returns true the Entity will be
     * registered by {@link Entity#objectId} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get highlighted() {
    }

    /**
     * Sets if this Entity is ghosted.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#ghosted} returns true the Entity will be
     * registered by {@link Entity#objectId} in {@link Scene#ghostedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set ghosted(ghosted) {

    }

    /**
     * Gets if this Entity is ghosted.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#ghosted} returns true the Entity will be
     * registered by {@link Entity#objectId} in {@link Scene#ghostedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get ghosted() {

    }

    /**
     * Sets if this Entity is selected.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#selected} returns true the Entity will be
     * registered by {@link Entity#objectId} in {@link Scene#selectedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set selected(selected) {

    }

    /**
     * Gets if this Entity is selected.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#selected} returns true the Entity will be
     * registered by {@link Entity#objectId} in {@link Scene#selectedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get selected() {

    }

    /**
     * Sets if this Entity's edges are enhanced.
     *
     * @type {Boolean}
     * @abstract
     */
    set edges(edges) {

    }

    /**
     * Gets if this Entity's edges are enhanced.
     *
     * @type {Boolean}
     * @abstract
     */
    get edges() {

    }

    /**
     * Sets if this Entity is culled.
     *
     * Only rendered when {@link Entity#visible} returns true and {@link Entity#culled} returns false.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#visible} returns true the Entity will be
     * registered by {@link Entity#objectId} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set culled(culled) {

    }

    /**
     * Gets if this Entity is culled.
     *
     * Only rendered when {@link Entity#visible} returns true and {@link Entity#culled} returns false.
     *
     * When {@link Node#objectId} has a value, then while {@link Node#visible} returns true the Entity will be
     * registered by {@link Entity#objectId} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get culled() {

    }

    /**
     * Sets if this Entity is clippable.
     *
     * Clipping is done by the {@link Clip}s in {@link Scene#clips}.
     *
     * @type {Boolean}
     * @abstract
     */
    set clippable(clippable) {

    }

    /**
     * Gets if this Entity is clippable.
     *
     * Clipping is done by the {@link Clip}s in {@link Scene#clips}.
     *
     * @type {Boolean}
     * @abstract
     */
    get clippable() {

    }

    /**
     * Sets if this Entity is included in boundary calculations.
     *
     * @type {Boolean}
     * @abstract
     */
    set collidable(collidable) {

    }

    /**
     * Gets if this Entity is included in boundary calculations.
     *
     * @type {Boolean}
     * @abstract
     */
    get collidable() {

    }

    /**
     * Sets if this Entity is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     * @abstract
     */
    set pickable(pickable) {

    }

    /**
     * Gets if this Entity is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     * @abstract
     */
    get pickable() {

    }

    /**
     * Sets the Entity's RGB colorize color, multiplies by the Entity's rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Float32Array}
     * @abstract
     */
    set colorize(rgb) {

    }

    /**
     * Gets the Entity's RGB colorize color, multiplies by the Entity's rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Float32Array}
     * @abstract
     */
    get colorize() {

    }

    /**
     * Sets the Entity's opacity factor, multiplies by the Entity's rendered fragment alphas.
     *
     * This is a factor in range ````[0..1]````.
     *
     * @type {Number}
     * @abstract
     */
    set opacity(opacity) {

    }

    /**
     * Gets the Entity's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     * @abstract
     */
    get opacity() {

    }

    /**
     * Sets if this Entity casts shadows.
     *
     * @type {Boolean}
     * @abstract
     */
    set castsShadow(pickable) {

    }

    /**
     * Gets if this Entity casts shadows.
     *
     * @type {Boolean}
     * @abstract
     */
    get castsShadow() {

    }

    /**
     * Sets if to this Entity can have shadows cast upon it
     *
     * @type {Boolean}
     * @abstract
     */
    set receivesShadow(pickable) {

    }

    /**
     * Gets if this Entity can have shadows cast upon it
     *
     * @type {Boolean}
     * @abstract
     */
    get receivesShadow() {

    }
}

export {Entity};