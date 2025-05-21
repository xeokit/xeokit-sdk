/**
 * @desc An abstract 3D scene element that can be individually shown, hidden, selected,
 * highlighted, xrayed, culled, picked, clipped and bounded.
 *
 * Entity provides an abstract interface through which different concrete types
 * of scene element can be accessed and manipulated uniformly.
 *
 * ## Entities Representing Models
 *
 * * An Entity represents a model when {@link Entity#isModel} is ````true````.
 * * Each model-Entity is registered by {@link Entity#id} in {@link Scene#models}.
 * * Each model-Entity can also have a {@link MetaModel} with a matching {@link MetaModel#id}, by which it is registered in {@link MetaScene#metaModels}.
 *
 * ## Entities Representing Objects
 *
 * * An Entity represents an object when {@link Entity#isObject} is ````true````.
 * * Each object-Entity is registered by {@link Entity#id} in {@link Scene#objects}.
 * * Each object-Entity can also have a {@link MetaObject} with a matching {@link MetaObject#id}, by which it is registered {@link MetaScene#metaObjects}.
 *
 * ## Updating Batches of Objects
 *
 * {@link Scene} provides the following methods for updating batches of object-Entities using their {@link Entity#id}s:
 *
 * * {@link Scene#setObjectsVisible}
 * * {@link Scene#setObjectsCulled}
 * * {@link Scene#setObjectsSelected}
 * * {@link Scene#setObjectsHighlighted}
 * * {@link Scene#setObjectsXRayed}
 * * {@link Scene#setObjectsEdges}
 * * {@link Scene#setObjectsColorized}
 * * {@link Scene#setObjectsOpacity}
 *
 * @interface
 * @abstract
 */
class Entity {

    /**
     * Component ID, unique within the {@link Scene}.
     *
     * @type {Number|String}
     * @abstract
     */
    get id() {
    }

    /**
     * ID of the corresponding object within the originating system, if any.
     *
     * By default, this has the same value as {@link Entity#id}. When we load a model using {@link XKTLoaderPlugin#load},
     * with {@link XKTLoaderPlugin#globalizeObjectIds} set ````true````, then that plugin will prefix {@link Entity#id}
     * with the model ID, while leaving this property holding the original value of {@link Entity#id}. When loading an
     * IFC model, this property will hold the IFC product ID of the corresponding IFC element.
     *
     * @type {String}
     * @abstract
     */
    get originalSystemId() {
    }

    /**
     * Returns true to indicate that this is an Entity.
     *
     * @returns {Boolean}
     */
    get isEntity() {
        return true;
    }

    /**
     * Returns ````true```` if this Entity represents a model.
     *
     * When this is ````true````, the Entity will be registered by {@link Entity#id} in {@link Scene#models} and
     * may also have a corresponding {@link MetaModel}.
     *
     * @type {Boolean}
     * @abstract
     */
    get isModel() {
    }

    /**
     * Returns ````true```` if this Entity represents an object.
     *
     * When this is ````true````, the Entity will be registered by {@link Entity#id} in {@link Scene#objects} and
     * may also have a corresponding {@link MetaObject}.
     *
     * @type {Boolean}
     * @abstract
     */
    get isObject() {
    }

    /** Returns the parent Entity, if any. */
    get parent() {

    }

    /**
     * Sets the 3D World-space origin for this Entity.
     *
     * @type {Float64Array}
     * @abstract
     */
    set origin(origin) {

    }

    /**
     * Gets the 3D World-space origin for this Entity.
     *
     * @type {Float64Array}
     * @abstract
     */
    get origin() {
    }

    /**
     * World-space 3D axis-aligned bounding box (AABB) of this Entity.
     *
     * Represented by a six-element Float64Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Float64Array}
     * @abstract
     */
    get aabb() {
    }

    /**
     * The approximate number of triangles in this Entity.
     *
     * @type {Number}
     * @abstract
     */
    get numTriangles() {
    }

    /**
     * Sets if this Entity is visible.
     *
     * Only rendered when {@link Entity#visible} is ````true```` and {@link Entity#culled} is ````false````.
     *
     * When {@link Entity#isObject} and {@link Entity#visible} are both ````true```` the Entity will be
     * registered by {@link Entity#id} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set visible(visible) {
    }

    /**
     * Gets if this Entity is visible.
     *
     * Only rendered when {@link Entity#visible} is ````true```` and {@link Entity#culled} is ````false````.
     *
     * When {@link Entity#isObject} and {@link Entity#visible} are both ````true```` the Entity will be
     * registered by {@link Entity#id} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get visible() {
    }

    /**
     * Sets if this Entity is xrayed.
     *
     * When {@link Entity#isObject} and {@link Entity#xrayed} are both ````true``` the Entity will be
     * registered by {@link Entity#id} in {@link Scene#xrayedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set xrayed(xrayed) {

    }

    /**
     * Gets if this Entity is xrayed.
     *
     * When {@link Entity#isObject} and {@link Entity#xrayed} are both ````true``` the Entity will be
     * registered by {@link Entity#id} in {@link Scene#xrayedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get xrayed() {

    }

    /**
     * Sets if this Entity is highlighted.
     *
     * When {@link Entity#isObject} and {@link Entity#highlighted} are both ````true```` the Entity will be
     * registered by {@link Entity#id} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set highlighted(highlighted) {

    }

    /**
     * Gets if this Entity is highlighted.
     *
     * When {@link Entity#isObject} and {@link Entity#highlighted} are both ````true```` the Entity will be
     * registered by {@link Entity#id} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get highlighted() {
    }

    /**
     * Sets if this Entity is selected.
     *
     * When {@link Entity#isObject} and {@link Entity#selected} are both ````true``` the Entity will be
     * registered by {@link Entity#id} in {@link Scene#selectedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set selected(selected) {

    }

    /**
     * Gets if this Entity is selected.
     *
     * When {@link Entity#isObject} and {@link Entity#selected} are both ````true``` the Entity will be
     * registered by {@link Entity#id} in {@link Scene#selectedObjects}.
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
     * Only rendered when {@link Entity#visible} is ````true```` and {@link Entity#culled} is ````false````.
     *
     * @type {Boolean}
     * @abstract
     */
    set culled(culled) {

    }

    /**
     * Gets if this Entity is culled.
     *
     * Only rendered when {@link Entity#visible} is ````true```` and {@link Entity#culled} is ````false````.
     *
     * @type {Boolean}
     * @abstract
     */
    get culled() {

    }

    /**
     * Sets if this Entity is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     * @abstract
     */
    set clippable(clippable) {

    }

    /**
     * Gets if this Entity is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
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
     * @type {Number[]}
     * @abstract
     */
    set colorize(rgb) {

    }

    /**
     * Gets the Entity's RGB colorize color, multiplies by the Entity's rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
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

    /**
     * Gets if this Entity can have Scalable Ambient Obscurance (SAO) applied to it.
     *
     * SAO is configured by {@link SAO}.
     *
     * @type {Boolean}
     * @abstract
     */
    get saoEnabled() {

    }

    /**
     * Sets the Entity's 3D World-space offset.
     *
     * Since offsetting Entities comes with memory and rendering overhead on some systems, this feature
     * only works when {@link Viewer} is configured with ````entityOffsetsEnabled: true````.
     *
     * The offset dynamically translates the Entity in World-space, which  is useful for creating
     * effects like exploding parts assemblies etc.
     *
     * Default value is ````[0,0,0]````.
     *
     * Provide a null or undefined value to reset to the default value.
     *
     * @abstract
     * @type {Number[]}
     */
    set offset(offset) {
    }

    /**
     * Gets the Entity's 3D World-space offset.
     *
     * Default value is ````[0,0,0]````.
     *
     * @abstract
     * @type {Number[]}
     */
    get offset() {
    }

    /**
     * Gets the World, View and Canvas-space positions of each vertex in a callback.
     *
     * @param callback
     */
    getEachVertex(callback) {
    }

    /**
     * Gets the complete geometry of this entity.
     */
    getGeometryData() {
    }

    /**
     * Destroys this Entity.
     */
    destroy() {

    }
}

export {Entity};