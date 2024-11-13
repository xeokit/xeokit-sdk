import { Component } from "../Component";
import { Entity } from "../Entity";
import { Mesh } from "../mesh";

export declare type NodeConfiguration = {
  /** Optional ID, unique among all components in the parent scene, generated automatically when omitted. */
  id?: string;
  /** Specify ````true```` if this Mesh represents a model, in which case the Mesh will be registered by {@link Mesh.id} in {@link Scene.models} and may also have a corresponding {@link MetaModel} with matching {@link MetaModel.id}, registered by that ID in {@link MetaScene.metaModels}. */
  isModel?: boolean;
  /** Specify ````true```` if this Mesh represents an object, in which case the Mesh will be registered by {@link Mesh.id} in {@link Scene.objects} and may also have a corresponding {@link MetaObject} with matching {@link MetaObject.id}, registered by that ID in {@link MetaScene.metaObjects}. */
  isObject?: boolean;
  /** The parent Node. */
  parent?: Node;
  /** World-space origin for this Node. */
  origin?: number[];
  /** Local 3D position.*/
  position?: number[];
  /** Local scale. */
  scale?: number[];
  /** Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis. */
  rotation?: number[];
  /** Local modelling transform matrix. Overrides the position, scale and rotation parameters. */
  matrix?: number[];
  /** World-space 3D translation offset. Translates the Node in World space, after modelling transforms. */
  offset?: number[];
  /** Indicates if the Node is initially visible.*/
  visible?: boolean;
  /** Indicates if the Node is initially culled from view. */
  culled?: boolean;
  /** Indicates if the Node is initially pickable. */
  pickable?: boolean;
  /** Indicates if the Node is initially clippable. */
  clippable?: boolean;
  /** Indicates if the Node is initially included in boundary calculations. */
  collidable?: boolean;
  /** Indicates if the Node initially casts shadows. */
  castsShadow?: boolean;
  /** Indicates if the Node initially receives shadows. */
  receivesShadow?: boolean;
  /** Indicates if the Node is initially xrayed. */
  xrayed?: boolean;
  /** Indicates if the Node is initially highlighted. */
  highlighted?: boolean;
  /** Indicates if the Mesh is initially selected. */
  selected?: boolean;
  /** Indicates if the Node's edges are initially emphasized. */
  edges?: boolean;
  /** Node's initial RGB colorize color, multiplies by the rendered fragment colors. */
  colorize: number[];
  /** Node's initial opacity factor, multiplies by the rendered fragment alpha. */
  opacity: number;
  /** Child Nodes or {@link Mesh}es to add initially. */
  children?: (Node | Mesh)[];
  /** Indicates if children given to this constructor should inherit rendering state from this parent as they are added. */
  inheritStates?: boolean;
};

/**
 * An {@link Entity} that is a scene graph node that can have child Nodes and {@link Mesh}es.
 */
export declare class Node extends Component {
  /**
   * @constructor
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
   * @param {NodeConfiguration} [cfg] Configs
   */
  constructor(owner: Component, cfg?: NodeConfiguration);

  /**
   * ID of the corresponding object within the originating system, if any.
   *
   * @type {String}
   */
  get originalSystemId(): string;

  /**
   * Sets the Node's local modeling transform matrix.
   *
   * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
   *
   * @type {Number[]}
   */
  set matrix(arg: number[]);

  /**
   * Gets the Node's local modeling transform matrix.
   *
   * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
   *
   * @type {Number[]}
   */
  get matrix(): number[];

  /**
   * Sets the Node's local scale.
   *
   * Default value is ````[1,1,1]````.
   *
   * @type {Number[]}
   */
  set scale(arg: number[]);

  /**
   * Gets the Node's local scale.
   *
   * Default value is ````[1,1,1]````.
   *
   * @type {Number[]}
   */
  get scale(): number[];

  /**
   * Sets the Node's local translation.
   *
   * Default value is ````[0,0,0]````.
   *
   * @type {Number[]}
   */
  set position(arg: number[]);

  /**
   * Gets the Node's local translation.
   *
   * Default value is ````[0,0,0]````.
   *
   * @type {Number[]}
   */
  get position(): number[];

  /**
   * Sets the Node's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
   *
   * Default value is ````[0,0,0]````.
   *
   * @type {Number[]}
   */
  set rotation(arg: number[]);

  /**
   * Gets the Node's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
   *
   * Default value is ````[0,0,0]````.
   *
   * @type {Number[]}
   */
  get rotation(): number[];

  /**
   * Sets the World-space origin for this Node.
   *
   * @type {Float64Array}
   */
  set origin(arg: Float64Array);

  /**
   *  Gets the World-space origin for this Node.
   *
   * @type {Float64Array}
   */
  get origin(): Float64Array;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es are visible.
   *
   * Only rendered both {@link Node.visible} is ````true```` and {@link Node.culled} is ````false````.
   *
   * When {@link Node.isObject} and {@link Node.visible} are both ````true```` the Node will be
   * registered by {@link Node.id} in {@link Scene.visibleObjects}.
   *
   * @type {Boolean}
   */
  set visible(arg: boolean);

  /**
   * Gets if this Node is visible.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * When {@link Node.isObject} and {@link Node.visible} are both ````true```` the Node will be
   * registered by {@link Node.id} in {@link Scene.visibleObjects}.
   *
   * @type {Boolean}
   */
  get visible(): boolean;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es are culled.
   *
   * @type {Boolean}
   */
  set culled(arg: boolean);

  /**
   * Gets if this Node is culled.
   *
   * @type {Boolean}
   */
  get culled(): boolean;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es are pickable.
   *
   * Picking is done via calls to {@link Scene.pick}.
   *
   * @type {Boolean}
   */
  set pickable(arg: boolean);

  /**
   * Gets if to this Node is pickable.
   *
   * Picking is done via calls to {@link Scene.pick}.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Boolean}
   */
  get pickable(): boolean;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es are clippable.
   *
   * Clipping is done by the {@link SectionPlane}s in {@link Scene.clips}.
   *
   * @type {Boolean}
   */
  set clippable(arg: boolean);

  /**
   * Gets if this Node is clippable.
   *
   * Clipping is done by the {@link SectionPlane}s in {@link Scene.clips}.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Boolean}
   */
  get clippable(): boolean;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es are included in boundary calculations.
   *
   * @type {Boolean}
   */
  set collidable(arg: boolean);

  /**
   * Gets if this Node is included in boundary calculations.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Boolean}
   */
  get collidable(): boolean;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es cast shadows.
   *
   * @type {Boolean}
   */
  set castsShadow(arg: boolean);

  /**
   * Gets if this Node casts shadows.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Boolean}
   */
  get castsShadow(): boolean;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es can have shadows cast upon them.
   *
   * @type {Boolean}
   */
  set receivesShadow(arg: boolean);

  /**
   * Whether or not to this Node can have shadows cast upon it.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Boolean}
   */
  get receivesShadow(): boolean;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es are xrayed.
   *
   * When {@link Node.isObject} and {@link Node.xrayed} are both ````true```` the Node will be
   * registered by {@link Node.id} in {@link Scene.xrayedObjects}.
   *
   * @type {Boolean}
   */
  set xrayed(arg: boolean);

  /**
   * Gets if this Node is xrayed.
   *
   * When {@link Node.isObject} and {@link Node.xrayed} are both ````true```` the Node will be
   * registered by {@link Node.id} in {@link Scene.xrayedObjects}.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Boolean}
   */
  get xrayed(): boolean;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es are highlighted.
   *
   * When {@link Node.isObject} and {@link Node.highlighted} are both ````true```` the Node will be
   * registered by {@link Node.id} in {@link Scene.highlightedObjects}.
   *
   * @type {Boolean}
   */
  set highlighted(arg: boolean);

  /**
   * Gets if this Node is highlighted.
   *
   * When {@link Node.isObject} and {@link Node.highlighted} are both ````true```` the Node will be
   * registered by {@link Node.id} in {@link Scene.highlightedObjects}.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Boolean}
   */
  get highlighted(): boolean;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es are selected.
   *
   * When {@link Node.isObject} and {@link Node.selected} are both ````true```` the Node will be
   * registered by {@link Node.id} in {@link Scene.selectedObjects}.
   *
   * @type {Boolean}
   */
  set selected(arg: boolean);

  /**
   * Gets if this Node is selected.
   *
   * When {@link Node.isObject} and {@link Node.selected} are both ````true```` the Node will be
   * registered by {@link Node.id} in {@link Scene.selectedObjects}.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Boolean}
   */
  get selected(): boolean;

  /**
   * Sets if this Node and all child Nodes and {@link Mesh}es are edge-enhanced.
   *
   * @type {Boolean}
   */
  set edges(arg: boolean);

  /**
   * Gets if this Node's edges are enhanced.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Boolean}
   */
  get edges(): boolean;

  /**
   * Sets the RGB colorize color for this Node and all child Nodes and {@link Mesh}es}.
   *
   * Multiplies by rendered fragment colors.
   *
   * Each element of the color is in range ````[0..1]````.
   *
   * @type {Number[]}
   */
  set colorize(arg: number[]);

  /**
   * Gets the RGB colorize color for this Node.
   *
   * Each element of the color is in range ````[0..1]````.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Number[]}
   */
  get colorize(): number[];

  /**
   * Sets the opacity factor for this Node and all child Nodes and {@link Mesh}es.
   *
   * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
   *
   * @type {Number}
   */
  set opacity(arg: number);

  /**
   * Gets this Node's opacity factor.
   *
   * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Number}
   */
  get opacity(): number;

  /**
   * Sets the 3D World-space offset for this Node and all child Nodes and {@link Mesh}es}.
   *
   * The offset dynamically translates those components in World-space.
   *
   * Default value is ````[0, 0, 0]````.
   *
   * Note that child Nodes and {@link Mesh}es may subsequently be given different values for this property.
   *
   * @type {Number[]}
   */
  set offset(arg: number[]);

  /**
   * Gets the Node's 3D World-space offset.
   *
   * Default value is ````[0, 0, 0]````.
   *
   * Child Nodes and {@link Mesh}es may have different values for this property.
   *
   * @type {Number[]}
   */
  get offset(): number[];

  /**
   * Returns true to indicate that this Component is an Entity.
   * @type {Boolean}
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
   * Returns ````true```` if this Node represents an object.
   *
   * When ````true```` the Node will be registered by {@link Node.id} in
   * {@link Scene.objects} and may also have a {@link MetaObject} with matching {@link MetaObject.id}.
   *
   * @type {Boolean}
   * @abstract
   */
  get isObject(): boolean;

  /**
   * Gets the Node's World-space 3D axis-aligned bounding box.
   *
   * Represented by a six-element Float64Array containing the min/max extents of the
   * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
   *
   * @type {Number[]}
   */
  get aabb(): number[];
  
  /**
   * Sets the World-space origin for this Node.
   *
   * Deprecated and replaced by {@link Node.origin}.
   *
   * @deprecated
   * @type {Float64Array}
   */
  set rtcCenter(arg: Float64Array);

  /**
   * Gets the World-space origin for this Node.
   *
   * Deprecated and replaced by {@link Node.origin}.
   *
   * @deprecated
   * @type {Float64Array}
   */
  get rtcCenter(): Float64Array;

  /**
   * The number of triangles in this Node.
   *
   * @type {Number}
   */
  get numTriangles(): number;

  /**
   * Gets if this Node can have Scalable Ambient Obscurance (SAO) applied to it.
   *
   * SAO is configured by {@link SAO}.
   *
   * @type {Boolean}
   * @abstract
   */
  get saoEnabled(): boolean;

  /**
   * Returns true to indicate that this Component is a Node.
   * @type {Boolean}
   */
  get isNode(): boolean;

  /**
   * Adds a child Node or {@link Mesh}.
   *
   * The child must be a Node or {@link Mesh} in the same {@link Scene}.
   *
   * If the child already has a parent, will be removed from that parent first.
   *
   * Does nothing if already a child.
   *
   * @param {Node|Mesh|String} child Instance or ID of the child to add.
   * @param [inheritStates=false] Indicates if the child should inherit rendering states from this parent as it is added. Rendering state includes {@link Node.visible}, {@link Node.culled}, {@link Node.pickable}, {@link Node.clippable}, {@link Node.castsShadow}, {@link Node.receivesShadow}, {@link Node.selected}, {@link Node.highlighted}, {@link Node.colorize} and {@link Node.opacity}.
   * @returns {Node|Mesh} The child.
   */
  addChild(child: Node | Mesh | string, inheritStates?: any): Node | Mesh;
  
  /**
   * Removes the given child Node or {@link Mesh}.
   *
   * @param {Node|Mesh} child Child to remove.
   */
  removeChild(child: Node | Mesh): void;

  /**
   * Removes all child Nodes and {@link Mesh}es.
   */
  removeChildren(): void;

  /**
   * Number of child Nodes or {@link Mesh}es.
   *
   * @type {Number}
   */
  get numChildren(): number;

  /**
   * Array of child Nodes or {@link Mesh}es.
   *
   * @type {Array}
   */
  get children(): (Node | Mesh)[];

  /**
   * The parent Node.
   *
   * The parent Node may also be set by passing the Node to the parent's {@link Node.addChild} method.
   *
   * @type {Node}
   */
  set parent(arg: Node);

  /**
   * The parent Node.
   *
   * @type {Node}
   */
  get parent(): Node;

  /**
   * Sets the Node's local rotation quaternion.
   *
   * Default value is ````[0,0,0,1]````.
   *
   * @type {Number[]}
   */
  set quaternion(arg: number[]);

  /**
   * Gets the Node's local rotation quaternion.
   *
   * Default value is ````[0,0,0,1]````.
   *
   * @type {Number[]}
   */
  get quaternion(): number[];

  /**
   * Gets the Node's World matrix.
   *
   * @property worldMatrix
   * @type {Number[]}
   */
  get worldMatrix(): number[];

  /**
   * Rotates the Node about the given local axis by the given increment.
   *
   * @param {Number[]} axis Local axis about which to rotate.
   * @param {Number} angle Angle increment in degrees.
   */
  rotate(axis: number[], angle: number): Node;

  /**
   * Rotates the Node about the given World-space axis by the given increment.
   *
   * @param {Number[]} axis Local axis about which to rotate.
   * @param {Number} angle Angle increment in degrees.
   */
  rotateOnWorldAxis(axis: number[], angle: number): Node;

  /**
   * Rotates the Node about the local X-axis by the given increment.
   *
   * @param {Number} angle Angle increment in degrees.
   */
  rotateX(angle: number): Node;

  /**
   * Rotates the Node about the local Y-axis by the given increment.
   *
   * @param {Number} angle Angle increment in degrees.
   */
  rotateY(angle: number): Node;

  /**
   * Rotates the Node about the local Z-axis by the given increment.
   *
   * @param {Number} angle Angle increment in degrees.
   */
  rotateZ(angle: number): Node;

  /**
   * Translates the Node along local space vector by the given increment.
   *
   * @param {Number[]} axis Normalized local space 3D vector along which to translate.
   * @param {Number} distance Distance to translate along  the vector.
   */
  translate(axis: number[], distance: number): Node;

  /**
   * Translates the Node along the local X-axis by the given increment.
   *
   * @param {Number} distance Distance to translate along  the X-axis.
   */
  translateX(distance: number): Node;

  /**
   * Translates the Node along the local Y-axis by the given increment.
   *
   * @param {Number} distance Distance to translate along  the Y-axis.
   */
  translateY(distance: number): Node;

  /**
   * Translates the Node along the local Z-axis by the given increment.
   *
   * @param {Number} distance Distance to translate along  the Z-axis.
   */
  translateZ(distance: number): Node;
}
