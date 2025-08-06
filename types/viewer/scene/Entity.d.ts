/**
 * An abstract 3D scene element that can be individually shown, hidden, selected,
 * highlighted, xrayed, culled, picked, clipped and bounded.
 *
 * @abstract
 */

export declare abstract class Entity {
  /**
   * Component ID, unique within the {@link Scene}.
   *
   * @type {Number|String}
   * @abstract
   */
  readonly id: string | number;

  /**
   * ID of the corresponding object within the originating system, if any.
   *
   * By default, this has the same value as {@link Entity.id}. When we load a model using {@link XKTLoaderPlugin.load},
   * with {@link XKTLoaderPlugin.globalizeObjectIds} set ````true````, then that plugin will prefix {@link Entity.id}
   * with the model ID, while leaving this property holding the original value of {@link Entity.id}. When loading an
   * IFC model, this property will hold the IFC product ID of the corresponding IFC element.
   *
   * @type {String}
   */
  readonly originalSystemId: string;

  /**
   * Returns true to indicate that this is an Entity.
   *
   * @returns {Boolean}
   */
  readonly isEntity: boolean;

  /**
   * Returns ````true```` if this Entity represents a model.
   *
   * When this is ````true````, the Entity will be registered by {@link Entity.id} in {@link Scene.models} and
   * may also have a corresponding {@link MetaModel}.
   *
   * @type {Boolean}
   * @abstract
   */
  readonly isModel: boolean;

  /**
   * Returns ````true```` if this Entity represents an object.
   *
   * When this is ````true````, the Entity will be registered by {@link Entity.id} in {@link Scene.objects} and
   * may also have a corresponding {@link MetaObject}.
   *
   * @type {Boolean}
   * @abstract
   */
  readonly isObject: boolean;

  /** Returns the parent Entity, if any. */
  readonly parent: void;

  /**
   * The 3D World-space origin for this Entity.
   *
   * @type {Float64Array}
   * @abstract
   */
  origin: Float64Array;

  /**
   * World-space 3D axis-aligned bounding box (AABB) of this Entity.
   *
   * Represented by a six-element Float64Array containing the min/max extents of the
   * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
   *
   * @type {Float64Array}
   * @abstract
   */
  readonly aabb: number[];

  /**
   * The approximate number of triangles in this Entity.
   *
   * @type {Number}
   * @abstract
   */
  readonly numTriangles: number;

  /**
   * Whether this Entity is visible.
   *
   * Only rendered when {@link Entity.visible} is ````true```` and {@link Entity.culled} is ````false````.
   *
   * When {@link Entity.isObject} and {@link Entity.visible} are both ````true```` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.visibleObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  visible: boolean;

  /**
   * Whether this Entity is xrayed.
   *
   * When {@link Entity.isObject} and {@link Entity.xrayed} are both ````true``` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.xrayedObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  xrayed: boolean;

  /**
   * Whether this Entity is highlighted.
   *
   * When {@link Entity.isObject} and {@link Entity.highlighted} are both ````true```` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.highlightedObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  highlighted: boolean;

  /**
   * Whether this Entity is selected.
   *
   * When {@link Entity.isObject} and {@link Entity.selected} are both ````true``` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.selectedObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  selected: boolean;

  /**
   * Whether this Entity's edges are enhanced.
   *
   * @type {Boolean}
   * @abstract
   */
  edges: boolean;

  /**
   * Whether this Entity is culled.
   *
   * Only rendered when {@link Entity.visible} is ````true```` and {@link Entity.culled} is ````false````.
   *
   * @type {Boolean}
   * @abstract
   */
  culled: boolean;

  /**
   * Whether this Entity is clippable.
   *
   * Clipping is done by the {@link SectionPlane}s in {@link Scene.sectionPlanes}.
   *
   * @type {Boolean}
   * @abstract
   */
  clippable: boolean;

  /**
   * Whether this Entity is included in boundary calculations.
   *
   * @type {Boolean}
   * @abstract
   */
  collidable: boolean;

  /**
   * Whether this Entity is pickable.
   *
   * Picking is done via calls to {@link Scene.pick}.
   *
   * @type {Boolean}
   * @abstract
   */
  pickable: boolean;

  /**
   * The Entity's RGB colorize color, multiplies by the Entity's rendered fragment colors.
   *
   * Each element of the color is in range ````[0..1]````.
   *
   * @type {Number[]}
   * @abstract
   */
  colorize: number[];

  /**
   * The Entity's opacity factor, multiplies by the Entity's rendered fragment alphas.
   *
   * This is a factor in range ````[0..1]````.
   *
   * @type {Number}
   * @abstract
   */
  opacity: number;

  /**
   * Whether this Entity casts shadows.
   *
   * @type {Boolean}
   * @abstract
   */
  castsShadow: boolean;

  /**
   * Whether this Entity can have shadows cast upon it
   *
   * @type {Boolean}
   * @abstract
   */
  receivesShadow: boolean;

  /**
   * Whether this Entity can have Scalable Ambient Obscurance (SAO) applied to it.
   *
   * SAO is configured by {@link SAO}.
   *
   * @type {Boolean}
   * @abstract
   */
  readonly saoEnabled: boolean;

  /**
   * The Entity's 3D World-space offset.
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
  offset: number[];

  /**
   * Gets the World, View and Canvas-space positions of each vertex in a callback.
   *
   * @param callback
   */
  getEachVertex(callback: any): void;

  /**
   * Gets the complete geometry of this entity.
   */
  getGeometryData(): {indices: number[],positions:number[]}

  /**
   * Destroys this Entity.
   */
  destroy(): void;
}
