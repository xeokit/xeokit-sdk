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
  get id(): string | number;

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
  get originalSystemId(): string;

  /**
   * Returns true to indicate that this is an Entity.
   *
   * @returns {Boolean}
   */
  get isEntity(): boolean;

  /**
   * Returns ````true```` if this Entity represents a model.
   *
   * When this is ````true````, the Entity will be registered by {@link Entity.id} in {@link Scene.models} and
   * may also have a corresponding {@link MetaModel}.
   *
   * @type {Boolean}
   * @abstract
   */
  get isModel(): boolean;

  /**
   * Returns ````true```` if this Entity represents an object.
   *
   * When this is ````true````, the Entity will be registered by {@link Entity.id} in {@link Scene.objects} and
   * may also have a corresponding {@link MetaObject}.
   *
   * @type {Boolean}
   * @abstract
   */
  get isObject(): boolean;

  /** Returns the parent Entity, if any. */
  get parent(): void;

  /**
   * Sets the 3D World-space origin for this Entity.
   *
   * @type {Float64Array}
   * @abstract
   */
  set origin(arg: Float64Array);

  /**
   * Gets the 3D World-space origin for this Entity.
   *
   * @type {Float64Array}
   * @abstract
   */
  get origin(): Float64Array;

  /**
   * World-space 3D axis-aligned bounding box (AABB) of this Entity.
   *
   * Represented by a six-element Float64Array containing the min/max extents of the
   * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
   *
   * @type {Float64Array}
   * @abstract
   */
  get aabb(): number[];

  /**
   * The approximate number of triangles in this Entity.
   *
   * @type {Number}
   * @abstract
   */
  get numTriangles(): number;

  /**
   * Sets if this Entity is visible.
   *
   * Only rendered when {@link Entity.visible} is ````true```` and {@link Entity.culled} is ````false````.
   *
   * When {@link Entity.isObject} and {@link Entity.visible} are both ````true```` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.visibleObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  set visible(arg: boolean);

  /**
   * Gets if this Entity is visible.
   *
   * Only rendered when {@link Entity.visible} is ````true```` and {@link Entity.culled} is ````false````.
   *
   * When {@link Entity.isObject} and {@link Entity.visible} are both ````true```` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.visibleObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  get visible(): boolean;

  /**
   * Sets if this Entity is xrayed.
   *
   * When {@link Entity.isObject} and {@link Entity.xrayed} are both ````true``` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.xrayedObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  set xrayed(arg: boolean);

  /**
   * Gets if this Entity is xrayed.
   *
   * When {@link Entity.isObject} and {@link Entity.xrayed} are both ````true``` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.xrayedObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  get xrayed(): boolean;

  /**
   * Sets if this Entity is highlighted.
   *
   * When {@link Entity.isObject} and {@link Entity.highlighted} are both ````true```` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.highlightedObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  set highlighted(arg: boolean);

  /**
   * Gets if this Entity is highlighted.
   *
   * When {@link Entity.isObject} and {@link Entity.highlighted} are both ````true```` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.highlightedObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  get highlighted(): boolean;

  /**
   * Sets if this Entity is selected.
   *
   * When {@link Entity.isObject} and {@link Entity.selected} are both ````true``` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.selectedObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  set selected(arg: boolean);

  /**
   * Gets if this Entity is selected.
   *
   * When {@link Entity.isObject} and {@link Entity.selected} are both ````true``` the Entity will be
   * registered by {@link Entity.id} in {@link Scene.selectedObjects}.
   *
   * @type {Boolean}
   * @abstract
   */
  get selected(): boolean;

  /**
   * Sets if this Entity's edges are enhanced.
   *
   * @type {Boolean}
   * @abstract
   */
  set edges(arg: boolean);

  /**
   * Gets if this Entity's edges are enhanced.
   *
   * @type {Boolean}
   * @abstract
   */
  get edges(): boolean;

  /**
   * Sets if this Entity is culled.
   *
   * Only rendered when {@link Entity.visible} is ````true```` and {@link Entity.culled} is ````false````.
   *
   * @type {Boolean}
   * @abstract
   */
  set culled(arg: boolean);

  /**
   * Gets if this Entity is culled.
   *
   * Only rendered when {@link Entity.visible} is ````true```` and {@link Entity.culled} is ````false````.
   *
   * @type {Boolean}
   * @abstract
   */
  get culled(): boolean;

  /**
   * Sets if this Entity is clippable.
   *
   * Clipping is done by the {@link SectionPlane}s in {@link Scene.sectionPlanes}.
   *
   * @type {Boolean}
   * @abstract
   */
  set clippable(arg: boolean);

  /**
   * Gets if this Entity is clippable.
   *
   * Clipping is done by the {@link SectionPlane}s in {@link Scene.sectionPlanes}.
   *
   * @type {Boolean}
   * @abstract
   */
  get clippable(): boolean;

  /**
   * Sets if this Entity is included in boundary calculations.
   *
   * @type {Boolean}
   * @abstract
   */
  set collidable(arg: boolean);

  /**
   * Gets if this Entity is included in boundary calculations.
   *
   * @type {Boolean}
   * @abstract
   */
  get collidable(): boolean;

  /**
   * Sets if this Entity is pickable.
   *
   * Picking is done via calls to {@link Scene.pick}.
   *
   * @type {Boolean}
   * @abstract
   */
  set pickable(arg: boolean);

  /**
   * Gets if this Entity is pickable.
   *
   * Picking is done via calls to {@link Scene.pick}.
   *
   * @type {Boolean}
   * @abstract
   */
  get pickable(): boolean;

  /**
   * Sets the Entity's RGB colorize color, multiplies by the Entity's rendered fragment colors.
   *
   * Each element of the color is in range ````[0..1]````.
   *
   * @type {Number[]}
   * @abstract
   */
  set colorize(arg: number[]);

  /**
   * Gets the Entity's RGB colorize color, multiplies by the Entity's rendered fragment colors.
   *
   * Each element of the color is in range ````[0..1]````.
   *
   * @type {Number[]}
   * @abstract
   */
  get colorize(): number[];

  /**
   * Sets the Entity's opacity factor, multiplies by the Entity's rendered fragment alphas.
   *
   * This is a factor in range ````[0..1]````.
   *
   * @type {Number}
   * @abstract
   */
  set opacity(arg: number);

  /**
   * Gets the Entity's opacity factor.
   *
   * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
   *
   * @type {Number}
   * @abstract
   */
  get opacity(): number;

  /**
   * Sets if this Entity casts shadows.
   *
   * @type {Boolean}
   * @abstract
   */
  set castsShadow(arg: boolean);

  /**
   * Gets if this Entity casts shadows.
   *
   * @type {Boolean}
   * @abstract
   */
  get castsShadow(): boolean;

  /**
   * Sets if to this Entity can have shadows cast upon it
   *
   * @type {Boolean}
   * @abstract
   */
  set receivesShadow(arg: boolean);

  /**
   * Gets if this Entity can have shadows cast upon it
   *
   * @type {Boolean}
   * @abstract
   */
  get receivesShadow(): boolean;

  /**
   * Gets if this Entity can have Scalable Ambient Obscurance (SAO) applied to it.
   *
   * SAO is configured by {@link SAO}.
   *
   * @type {Boolean}
   * @abstract
   */
  get saoEnabled(): boolean;

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
  set offset(arg: number[]);

  /**
   * Gets the Entity's 3D World-space offset.
   *
   * Default value is ````[0,0,0]````.
   *
   * @abstract
   * @type {Number[]}
   */
  get offset(): number[];

  /**
   * Rotate SceneModelEntity according to a pivot.
   *
   * Default value is ````{ quaternion: [0, 0, 0, 0], pivot: [0, 0, 0] }````.
   *
   *
   * @param {{ quaternion: number[] , rotationPivot: number[] }}
   */
  rotate(arg: {
    quaternion: number[];
    pivot: number[];
  }): void;

  /**
   * Translate SceneModelEntity.
   *
   * Default value is ````{ position: [0, 0, 0], pivot: [0, 0, 0] }````.
   *
   *
   * @param {{ position: number[] }}
   */
  translate(arg: { position: number[], pivot?: number[] }): void;

  /**
   * Gets the World, View and Canvas-space positions of each vertex in a callback.
   *
   * @param callback
   */
  getEachVertex(callback: any): void;

  /**
   * Destroys this Entity.
   */
  destroy(): void;
}
