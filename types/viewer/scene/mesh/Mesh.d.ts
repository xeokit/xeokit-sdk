import { Component } from "../Component";
import { Entity } from "../Entity";
import { Geometry } from "../geometry/Geometry";
import { EdgeMaterial, EmphasisMaterial, Material } from "../materials";

export declare type MeshConfiguration = {
  /** Optional ID, unique among all components in the parent scene, generated automatically when omitted. */
  id?: string;
  /** ID of the corresponding object within the originating system, if any. */
  originalSystemId?: string;
  /** Specify ````true```` if this Mesh represents a model, in which case the Mesh will be registered by {@link Mesh.id} in {@link Scene.models} and may also have a corresponding {@link MetaModel} with matching {@link MetaModel.id}, registered by that ID in {@link MetaScene.metaModels}. */
  isModel?: boolean;
  /** Specify ````true```` if this Mesh represents an object, in which case the Mesh will be registered by {@link Mesh.id} in {@link Scene.objects} and may also have a corresponding {@link MetaObject} with matching {@link MetaObject.id}, registered by that ID in {@link MetaScene.metaObjects}.*/
  isObject?: boolean;
  /** The parent Node. */
  parent?: Node;
  /** World-space origin for this Mesh. When this is given, then ````matrix````, ````position```` and ````geometry```` are all assumed to be relative to this center. */
  origin?: number[];
  /** 3D position of this Mesh, relative to ````origin````. */
  position?: number[];
  /** Local scale.*/
  scale?: number[];
  /** Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis. */
  rotation?: number[];
  /** Local modelling transform matrix. Overrides the position, scale and rotation parameters. */
  matrix?: number[];
  /** World-space 3D translation offset. Translates the Mesh in World space, after modelling transforms. */
  offset?: number[];
  /** Indicates if the Mesh is able to occlude {@link Marker}s. */
  occluder?: boolean;
  /** Indicates if the Mesh is initially visible. */
  visible?: boolean;
  /** Indicates if the Mesh is initially culled from view. */
  culled?: boolean;
  /** Indicates if the Mesh is initially pickable. */
  pickable?: boolean;
  /** Indicates if the Mesh is initially clippable. */
  clippable?: boolean;
  /** Indicates if the Mesh is initially included in boundary calculations. */
  collidable?: boolean;
  /** Indicates if the Mesh initially casts shadows. */
  castsShadow?: boolean;
  /** Indicates if the Mesh initially receives shadows. */
  receivesShadow?: boolean;
  /** Indicates if the Mesh is initially xrayed. */
  xrayed?: boolean;
  /** Indicates if the Mesh is initially highlighted.*/
  highlighted?: boolean;
  /** Indicates if the Mesh is initially selected. */
  selected?: boolean;
  /** Indicates if the Mesh's edges are initially emphasized. */
  edges?: boolean;
  /** Indicates if the Mesh should act as background, e.g., it can be used for a skybox. */
  background?: boolean;
  /** Mesh's initial RGB colorize color, multiplies by the rendered fragment colors. */
  colorize?: number[];
  /** Mesh's initial opacity factor, multiplies by the rendered fragment alpha. */
  opacity?: number;
  /** Mesh's billboarding behaviour. */
  billboard?: "none" | "spherical" | "cylindrical";
  /** {@link Geometry} to define the shape of this Mesh. Inherits {@link Scene.geometry} by default. */
  geometry?: Geometry;
  /** {@link Material} to define the normal rendered appearance for this Mesh. Inherits {@link Scene.material} by default. */
  material?: Material;
  /** {@link EmphasisMaterial} to define the xrayed appearance for this Mesh. Inherits {@link Scene.xrayMaterial} by default.*/
  xrayMaterial?: EmphasisMaterial;
  /** {@link EmphasisMaterial} to define the xrayed appearance for this Mesh. Inherits {@link Scene.highlightMaterial} by default. */
  highlightMaterial?: EmphasisMaterial;
  /** {@link EmphasisMaterial} to define the selected appearance for this Mesh. Inherits {@link Scene.selectedMaterial} by default. */
  selectedMaterial?: EmphasisMaterial;
  /** {@link EdgeMaterial} to define the appearance of enhanced edges for this Mesh. Inherits {@link Scene.edgeMaterial} by default. */
  edgeMaterial?: EmphasisMaterial;
};

/**
 * @desc An {@link Entity} that is a drawable element, with a {@link Geometry} and a {@link Material}, that can be
 * connected into a scene graph using {@link Node}s.
 */
export declare class Mesh extends Component implements Omit<Entity, 'parent'> {
  /**
   * @constructor
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
   * @param {MeshConfiguration} [cfg] Configs
   */
  constructor(owner: Component, cfg?: MeshConfiguration);
  
  /**
   * ID of the corresponding object within the originating system, if any.
   *
   * @type {String}
   * @abstract
   */
  originalSystemId: string;

  /**
   * Sets the Mesh's local modeling transform matrix.
   *
   * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
   *
   * @type {Number[]}
   */
  set matrix(arg: number[]);
  
  /**
   * Gets the Mesh's local modeling transform matrix.
   *
   * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
   *
   * @type {Number[]}
   */
  get matrix(): number[];

  /**
   * Sets the Mesh's local scale.
   *
   * Default value is ````[1,1,1]````.
   *
   * @type {Number[]}
   */
  set scale(arg: number[]);

  /**
   * Gets the Mesh's local scale.
   *
   * Default value is ````[1,1,1]````.
   *
   * @type {Number[]}
   */
  get scale(): number[];

  /**
   * Sets the Mesh's local translation.
   *
   * Default value is ````[0,0,0]````.
   *
   * @type {Number[]}
   */
  set position(arg: number[]);

  /**
   * Gets the Mesh's local translation.
   *
   * Default value is ````[0,0,0]````.
   *
   * @type {Number[]}
   */
  get position(): number[];

  /**
   * Sets the Mesh's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
   *
   * Default value is ````[0,0,0]````.
   *
   * @type {Number[]}
   */
  set rotation(arg: number[]);

  /**
   * Gets the Mesh's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
   *
   * Default value is ````[0,0,0]````.
   *
   * @type {Number[]}
   */
  get rotation(): number[];

  /**
   * Sets if this Mesh is visible.
   *
   * Only rendered when {@link Mesh.visible} is ````true```` and {@link Mesh.culled} is ````false````.
   *
   * When {@link Mesh.isObject} and {@link Mesh.visible} are both ````true```` the Mesh will be
   * registered by {@link Mesh.id} in {@link Scene.visibleObjects}.
   *
   * @type {Boolean}
   */
  set visible(arg: boolean);

  /**
   * Gets if this Mesh is visible.
   *
   * Only rendered when {@link Mesh.visible} is ````true```` and {@link Mesh.culled} is ````false````.
   *
   * When {@link Mesh.isObject} and {@link Mesh.visible} are both ````true```` the Mesh will be
   * registered by {@link Mesh.id} in {@link Scene.visibleObjects}.
   *
   * @type {Boolean}
   */
  get visible(): boolean;
  
  /**
   * Sets if this Mesh is culled.
   *
   * Only rendered when {@link Mesh.visible} is ````true```` and {@link Mesh.culled} is ````false````.
   *
   * @type {Boolean}
   */
  set culled(arg: boolean);

  /**
   * Gets if this Mesh is culled.
   *
   * Only rendered when {@link Mesh.visible} is ````true```` and {@link Mesh.culled} is ````false````.
   *
   * @type {Boolean}
   */
  get culled(): boolean;

  /**
   * Sets if this Mesh is pickable.
   *
   * Picking is done via calls to {@link Scene.pick}.
   *
   * @type {Boolean}
   */
  set pickable(arg: boolean);

  /**
   * Gets if this Mesh is pickable.
   *
   * Picking is done via calls to {@link Scene.pick}.
   *
   * @type {Boolean}
   */
  get pickable(): boolean;

  /**
   * Sets if this Mesh is clippable.
   *
   * Clipping is done by the {@link SectionPlane}s in {@link Scene.sectionPlanes}.
   *
   * @type {Boolean}
   */
  set clippable(arg: boolean);

  /**
   * Gets if this Mesh is clippable.
   *
   * Clipping is done by the {@link SectionPlane}s in {@link Scene.sectionPlanes}.
   *
   * @type {Boolean}
   */
  get clippable(): boolean;

  /**
   * Sets if this Mesh included in boundary calculations.
   *
   * @type {Boolean}
   */
  set collidable(arg: boolean);

  /**
   * Gets if this Mesh included in boundary calculations.
   *
   * @type {Boolean}
   */
  get collidable(): boolean;

  /**
   * Sets if this Mesh casts shadows.
   *
   * @type {Boolean}
   */
  set castsShadow(arg: boolean);

  /**
   * Gets if this Mesh casts shadows.
   *
   * @type {Boolean}
   */
  get castsShadow(): boolean;

  /**
   * Sets if this Mesh can have shadows cast upon it.
   *
   * @type {Boolean}
   */
  set receivesShadow(arg: boolean);

  /**
   * Gets if this Mesh can have shadows cast upon it.
   *
   * @type {Boolean}
   */
  get receivesShadow(): boolean;

  /**
   * Sets if this Mesh is xrayed.
   *
   * XRayed appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh.xrayMaterial}.
   *
   * When {@link Mesh.isObject} and {@link Mesh.xrayed} are both ````true``` the Mesh will be
   * registered by {@link Mesh.id} in {@link Scene.xrayedObjects}.
   *
   * @type {Boolean}
   */
  set xrayed(arg: boolean);

  /**
   * Gets if this Mesh is xrayed.
   *
   * XRayed appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh.xrayMaterial}.
   *
   * When {@link Mesh.isObject} and {@link Mesh.xrayed} are both ````true``` the Mesh will be
   * registered by {@link Mesh.id} in {@link Scene.xrayedObjects}.
   *
   * @type {Boolean}
   */
  get xrayed(): boolean;

  /**
   * Sets if this Mesh is highlighted.
   *
   * Highlighted appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh.highlightMaterial}.
   *
   * When {@link Mesh.isObject} and {@link Mesh.highlighted} are both ````true```` the Mesh will be
   * registered by {@link Mesh.id} in {@link Scene.highlightedObjects}.
   *
   * @type {Boolean}
   */
  set highlighted(arg: boolean);

  /**
   * Gets if this Mesh is highlighted.
   *
   * Highlighted appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh.highlightMaterial}.
   *
   * When {@link Mesh.isObject} and {@link Mesh.highlighted} are both ````true```` the Mesh will be
   * registered by {@link Mesh.id} in {@link Scene.highlightedObjects}.
   *
   * @type {Boolean}
   */
  get highlighted(): boolean;

  /**
   * Sets if this Mesh is selected.
   *
   * Selected appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh.selectedMaterial}.
   *
   * When {@link Mesh.isObject} and {@link Mesh.selected} are both ````true``` the Mesh will be
   * registered by {@link Mesh.id} in {@link Scene.selectedObjects}.
   *
   * @type {Boolean}
   */
  set selected(arg: boolean);

  /**
   * Gets if this Mesh is selected.
   *
   * Selected appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh.selectedMaterial}.
   *
   * When {@link Mesh.isObject} and {@link Mesh.selected} are both ````true``` the Mesh will be
   * registered by {@link Mesh.id} in {@link Scene.selectedObjects}.
   *
   * @type {Boolean}
   */
  get selected(): boolean;

  /**
   * Sets if this Mesh is edge-enhanced.
   *
   * Edge appearance is configured by the {@link EdgeMaterial} referenced by {@link Mesh.edgeMaterial}.
   *
   * @type {Boolean}
   */
  set edges(arg: boolean);

  /**
   * Gets if this Mesh is edge-enhanced.
   *
   * Edge appearance is configured by the {@link EdgeMaterial} referenced by {@link Mesh.edgeMaterial}.
   *
   * @type {Boolean}
   */
  get edges(): boolean;

  /**
   * Sets the Mesh's rendering order relative to other Meshes.
   *
   * Default value is ````0````.
   *
   * This can be set on multiple transparent Meshes, to make them render in a specific order for correct alpha blending.
   *
   * @type {Number}
   */
  set layer(arg: number);

  /**
   * Gets the Mesh's rendering order relative to other Meshes.
   *
   * Default value is ````0````.
   *
   * This can be set on multiple transparent Meshes, to make them render in a specific order for correct alpha blending.
   *
   * @type {Number}
   */
  get layer(): number;

  /**
   * Sets the RGB colorize color for this Mesh.
   *
   * Multiplies by rendered fragment colors.
   *
   * Each element of the color is in range ````[0..1]````.
   *
   * @type {Number[]}
   */
  set colorize(arg: number[]);

  /**
   * Gets the RGB colorize color for this Mesh.
   *
   * Multiplies by rendered fragment colors.
   *
   * Each element of the color is in range ````[0..1]````.
   *
   * @type {Number[]}
   */
  get colorize(): number[];

  /**
   * Sets the opacity factor for this Mesh.
   *
   * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
   *
   * @type {Number}
   */
  set opacity(arg: number);

  /**
   * Gets the opacity factor for this Mesh.
   *
   * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
   *
   * @type {Number}
   */
  get opacity(): number;

  /**
   * Sets the Mesh's 3D World-space offset.
   *
   * The offset dynamically translates the Mesh in World-space.
   *
   * Default value is ````[0, 0, 0]````.
   *
   * Provide a null or undefined value to reset to the default value.
   *
   * @type {Number[]}
   */
  set offset(arg: number[]);

  /**
   * Gets the Mesh's 3D World-space offset.
   *
   * Default value is ````[0,0,0]````.
   *
   * @type {Number[]}
   */
  get offset(): number[];

  /**
   * Returns true to indicate that this Component is a Mesh.
   * @final
   * @type {Boolean}
   */
  get isMesh(): boolean;

  /**
   * The parent Node.
   *
   * The parent Node may also be set by passing the Mesh to the parent's {@link Node.addChild} method.
   *
   * @type {Node}
   */
  get parent(): Node;

  /**
   * Defines the shape of this Mesh.
   *
   * Set to {@link Scene.geometry} by default.
   *
   * @type {Geometry}
   */
  get geometry(): Geometry;

  /**
   * Defines the appearance of this Mesh when rendering normally, ie. when not xrayed, highlighted or selected.
   *
   * Set to {@link Scene.material} by default.
   *
   * @type {Material}
   */
  get material(): Material;

  /**
   * Sets the Mesh's local rotation quaternion.
   *
   * Default value is ````[0,0,0,1]````.
   *
   * @type {Number[]}
   */
  set quaternion(arg: number[]);

  /**
   * Gets the Mesh's local rotation quaternion.
   *
   * Default value is ````[0,0,0,1]````.
   *
   * @type {Number[]}
   */
  get quaternion(): number[];
  
  /**
   * Gets the Mesh's World matrix.
   *
   * @property worldMatrix
   * @type {Number[]}
   */
  get worldMatrix(): number[];

  /**
   * Gets the Mesh's World normal matrix.
   *
   * @type {Number[]}
   */
  get worldNormalMatrix(): number[];

  /**
   * Returns true to indicate that Mesh implements {@link Entity}.
   *
   * @returns {Boolean}
   */
  get isEntity(): boolean;

  /**
   * Returns ````true```` if this Mesh represents a model.
   *
   * When this returns ````true````, the Mesh will be registered by {@link Mesh.id} in {@link Scene.models} and
   * may also have a corresponding {@link MetaModel}.
   *
   * @type {Boolean}
   */
  get isModel(): boolean;

  /**
   * Returns ````true```` if this Mesh represents an object.
   *
   * When this returns ````true````, the Mesh will be registered by {@link Mesh.id} in {@link Scene.objects} and
   * may also have a corresponding {@link MetaObject}.
   *
   * @type {Boolean}
   */
  get isObject(): boolean;

  /**
   * Gets the Mesh's World-space 3D axis-aligned bounding box.
   *
   * Represented by a six-element Float64Array containing the min/max extents of the
   * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
   *
   * @type {Number[]}
   */
  get aabb(): number[];

  /**
   * Sets the 3D origin of the Mesh's {@link Geometry}'s vertex positions.
   *
   * When this is given, then {@link Mesh.matrix}, {@link Mesh.position} and {@link Mesh.geometry} are all assumed to be relative to this center position.
   *
   * @type {Float64Array}
   */
  set origin(arg: Float64Array);

  /**
   * Gets the 3D origin of the Mesh's {@link Geometry}'s vertex positions.
   *
   * When this is given, then {@link Mesh.matrix}, {@link Mesh.position} and {@link Mesh.geometry} are all assumed to be relative to this center position.
   *
   * @type {Float64Array}
   */
  get origin(): Float64Array;

  /**
   * Sets the World-space origin for this Mesh.
   *
   * Deprecated and replaced by {@link Mesh.origin}.
   *
   * @deprecated
   * @type {Float64Array}
   */
  set rtcCenter(arg: Float64Array);

  /**
   * Gets the World-space origin for this Mesh.
   *
   * Deprecated and replaced by {@link Mesh.origin}.
   *
   * @deprecated
   * @type {Float64Array}
   */
  get rtcCenter(): Float64Array;

  /**
   * The approximate number of triangles in this Mesh.
   *
   * @type {Number}
   */
  get numTriangles(): number;

  /**
   * Gets if this Mesh can have Scalable Ambient Obscurance (SAO) applied to it.
   *
   * SAO is configured by {@link SAO}.
   *
   * @type {Boolean}
   * @abstract
   */
  get saoEnabled(): boolean;

  /**
   * Gets if this Mesh is transparent.
   * @returns {Boolean}
   */
  get transparent(): boolean;

  /**
   * Gets if the Node's position is stationary.
   *
   * When true, will disable the effect of {@link Camera} translations for this Mesh, while still allowing it to rotate. This is useful for skyboxes.
   *
   * @type {Boolean}
   */
  get stationary(): boolean;

  /**
   * Gets the Node's billboarding behaviour.
   *
   * Options are:
   * * ````"none"```` -  (default) - No billboarding.
   * * ````"spherical"```` - Mesh is billboarded to face the viewpoint, rotating both vertically and horizontally.
   * * ````"cylindrical"```` - Mesh is billboarded to face the viewpoint, rotating only about its vertically axis. Use this mode for things like trees on a landscape.
   * @type {String}
   */
  get billboard(): string;

  /**
   * Returns true to indicate that Mesh implements {@link Drawable}.
   * @final
   * @type {Boolean}
   */
  get isDrawable(): boolean;

  /**
   * Property with final value ````true```` to indicate that xeokit should render this Mesh in sorted order, relative to other Meshes.
   *
   * The sort order is determined by {@link Mesh.stateSortCompare}.
   *
   * Sorting is essential for rendering performance, so that xeokit is able to avoid applying runs of the same state changes to the GPU, ie. can collapse them.
   *
   * @type {Boolean}
   */
  get isStateSortable(): boolean;

  /**
   * Defines the appearance of this Mesh when xrayed.
   *
   * Mesh is xrayed when {@link Mesh.xrayed} is ````true````.
   *
   * Set to {@link Scene.xrayMaterial} by default.
   *
   * @type {EmphasisMaterial}
   */
  get xrayMaterial(): EmphasisMaterial;
  
  /**
   * Defines the appearance of this Mesh when highlighted.
   *
   * Mesh is xrayed when {@link Mesh.highlighted} is ````true````.
   *
   * Set to {@link Scene.highlightMaterial} by default.
   *
   * @type {EmphasisMaterial}
   */
  get highlightMaterial(): EmphasisMaterial;

  /**
   * Defines the appearance of this Mesh when selected.
   *
   * Mesh is xrayed when {@link Mesh.selected} is ````true````.
   *
   * Set to {@link Scene.selectedMaterial} by default.
   *
   * @type {EmphasisMaterial}
   */
  get selectedMaterial(): EmphasisMaterial;

  /**
   * Defines the appearance of this Mesh when edges are enhanced.
   *
   * Mesh is xrayed when {@link Mesh.edges} is ````true````.
   *
   * Set to {@link Scene.edgeMaterial} by default.
   *
   * @type {EdgeMaterial}
   */
  get edgeMaterial(): EdgeMaterial;
  
  /**
   * Rotates the Mesh about the given local axis by the given increment.
   *
   * @param {Number[]} axis Local axis about which to rotate.
   * @param {Number} angle Angle increment in degrees.
   */
  rotate(axis: number[], angle: number): Mesh;

  /**
   * Rotates the Mesh about the given World-space axis by the given increment.
   *
   * @param {Number[]} axis Local axis about which to rotate.
   * @param {Number} angle Angle increment in degrees.
   */
  rotateOnWorldAxis(axis: number[], angle: number): Mesh;

  /**
   * Rotates the Mesh about the local X-axis by the given increment.
   *
   * @param {Number} angle Angle increment in degrees.
   */
  rotateX(angle: number): Mesh;

  /**
   * Rotates the Mesh about the local Y-axis by the given increment.
   *
   * @param {Number} angle Angle increment in degrees.
   */
  rotateY(angle: number): Mesh;

  /**
   * Rotates the Mesh about the local Z-axis by the given increment.
   *
   * @param {Number} angle Angle increment in degrees.
   */
  rotateZ(angle: number): Mesh;

  /**
   * Translates the Mesh along local space vector by the given increment.
   *
   * @param {Number[]} axis Normalized local space 3D vector along which to translate.
   * @param {Number} distance Distance to translate along  the vector.
   */
  translate(axis: number[], distance: number): Mesh;

  /**
   * Translates the Mesh along the local X-axis by the given increment.
   *
   * @param {Number} distance Distance to translate along  the X-axis.
   */
  translateX(distance: number): Mesh;

  /**
   * Translates the Mesh along the local Y-axis by the given increment.
   *
   * @param {Number} distance Distance to translate along  the Y-axis.
   */
  translateY(distance: number): Mesh;

  /**
   * Translates the Mesh along the local Z-axis by the given increment.
   *
   * @param {Number} distance Distance to translate along  the Z-axis.
   */
  translateZ(distance: number): Mesh;

  /**
   * Comparison function used by the renderer to determine the order in which xeokit should render the Mesh, relative to to other Meshes.
   *
   * xeokit requires this method because Mesh implements {@link Drawable}.
   *
   * Sorting is essential for rendering performance, so that xeokit is able to avoid needlessly applying runs of the same rendering state changes to the GPU, ie. can collapse them.
   *
   * @param {Mesh} mesh1
   * @param {Mesh} mesh2
   * @returns {number}
   */
  stateSortCompare(mesh1: Mesh, mesh2: Mesh): number;

  /**
   * Gets the World, View and Canvas-space positions of each vertex in a callback.
   *
   * @param callback
   */
  getEachVertex(callback: any): void;
}
