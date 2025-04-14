import { Component } from "../Component";
import { Camera } from "../camera/Camera";
import { PickResult } from "../webgl/PickResult";
import { SAO } from "../postfx/SAO";
import { Entity } from "../Entity";
import { ReadableGeometry } from "../geometry";
import { EdgeMaterial, EmphasisMaterial, PhongMaterial, PointsMaterial, LinesMaterial } from "../materials";
import { Viewport } from "../viewport/Viewport";
import { VBOSceneModel } from "../models/VBOSceneModel/VBOSceneModel";
import { Mesh } from "../mesh";
import { Node } from "../nodes";
import { Input } from "../input/input";
import { SectionPlane } from "../sectionPlane/SectionPlane";

export declare type TickEvent = {
  /** The ID of this Scene. */
  sceneID: string;
  /** The time in seconds since 1970 that this Scene was instantiated. */
  startTime: Number;
  /** The time in seconds since 1970 of this "tick" event. */
  time: Number;
  /** The time of the previous "tick" event from this Scene.. */
  prevTime: Number;
  /** The time in seconds since the previous "tick" event from this Scene. */
  deltaTime: Number;
};

export declare class Scene extends Component {

  /**
   * Fires when a model is loaded
   * @param event The loaded event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "modelLoaded", callback: (modelId: string) => void, scope?: any): string;

  /**
   * Fires when a model is unloaded
   * @param event The loaded event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "modelUnloaded", callback: (modelId: string) => void, scope?: any): string;

  /**
   * Fired when about to render a frame for a Scene.
   * @param event The rendering event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "rendering", callback: (renderEvent: { sceneId: number; pass: number; }) => void, scope?: any): string;

  /**
   * Fired when we have just rendered a frame for a Scene.
   * @param event The rendered event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
  on(event: "rendered", callback: (renderEvent: { sceneId: number; pass: number; }) => void, scope?: any): string;

  /**
   * Fires when the entity visibility is updated.
   * @param event The rendered event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
   on(event: "objectVisibility" | "objectXRayed" | "objectHighlighted" | "objectSelected", callback: (entity: VBOSceneModel | Mesh | Node) => void, scope?: any): string;

   /**
   * Fired on each game loop iteration.
   * @event event The tick event
   * @param callback Called fired on the event
   * @param scope  Scope for the callback
   */
   on(event: "tick", callback: (tickEvent: TickEvent) => void, scope?: any): string;

   /**
   * Fires when a section plane is created.
   * @param {String} event The sectionPlaneCreated event
   * @param {Function} callback Callback fired on the event
   */
   on(event: "sectionPlaneCreated", callback: (measurement: SectionPlane) => void): void;

   /**
    * Fires when a measurement is destroyed.
    * @param {String} event The sectionPlaneDestroyed event
    * @param {Function} callback Callback fired on the event
    */
   on(event: "sectionPlaneDestroyed", callback: (measurement: SectionPlane) => void): void;

  /**
   * The epoch time (in milliseconds since 1970) when this Scene was instantiated.
   */
  get startTime(): Date;

  /**
   * Map of {@link Entity}s that represent models.
   *
   * Each {@link Entity} is mapped here by {@link Entity.id} when {@link Entity.isModel} is ````true````.
   * @type {{String:Entity}}
   */
  get models(): {[key: string]: Entity};

  /**
   * Map of {@link Entity}s that represents objects.
   *
   * Each {@link Entity} is mapped here by {@link Entity.id} when {@link Entity.isObject} is ````true````.
   * @final
   * @type {{String:Entity}}
   */
  get objects(): {[key: string]: Entity};

  /**
   * Map of {@link SectionPlane}s that represent sliced section planes.
   *
   * Each {@link SectionPlane} is mapped here by {@link SectionPlane.id}.
   * @type {{String:SectionPlane}}
   */
  get sectionPlanes(): { [key: string]: SectionPlane };

  /**
   * Map of currently visible {@link Entity}s that represent objects.
   *
   * An Entity represents an object if {@link Entity.isObject} is ````true````, and is visible when {@link Entity.visible} is true.
   * @type {{String:Object}}
   */
  get visibleObjects(): {[key: string]: Entity};

  /**
   * Map of currently xrayed {@link Entity}s that represent objects.
   *
   * An Entity represents an object if {@link Entity.isObject} is ````true````, and is xrayed when {@link Entity.xrayed} is true.
   *
   * Each {@link Entity} is mapped here by {@link Entity.id}.
   *
   * @type {{String:Object}}
   */
  get xrayedObjects(): {[key: string]: Entity};

  /**
   * Map of currently highlighted {@link Entity}s that represent objects.
   *
   * An Entity represents an object if {@link Entity.isObject} is ````true```` is true, and is highlighted when {@link Entity.highlighted} is true.
   *
   * Each {@link Entity} is mapped here by {@link Entity.id}.
   *
   * @type {{String:Object}}
   */
  get highlightedObjects(): {[key: string]: Entity};

  /**
   * Map of currently selected {@link Entity}s that represent objects.
   *
   * An Entity represents an object if {@link Entity.isObject} is true, and is selected while {@link Entity.selected} is true.
   *
   * Each {@link Entity} is mapped here by {@link Entity.id}.
   *
   * @type {{String:Object}}
   */
  get selectedObjects(): {[key: string]: Entity};

  /**
   * Map of currently colorized {@link Entity}s that represent objects.
   *
   * An Entity represents an object if {@link Entity.isObject} is ````true````.
   *
   * Each {@link Entity} is mapped here by {@link Entity.id}.
   *
   * @type {{String:Object}}
   */
  get colorizedObjects(): {[key: string]: Entity};

  /**
   * Map of {@link Entity}s that represent objects whose opacity was updated.
   *
   * An Entity represents an object if {@link Entity.isObject} is ````true````.
   *
   * Each {@link Entity} is mapped here by {@link Entity.id}.
   *
   * @type {{String:Object}}
   */
  get opacityObjects(): {[key: string]: Entity};

  /**
   * Map of {@link Entity}s that represent objects whose {@link Entity.offset}s were updated.
   *
   * An Entity represents an object if {@link Entity.isObject} is ````true````.
   *
   * Each {@link Entity} is mapped here by {@link Entity.id}.
   *
   * @property offsetObjects
   * @final
   * @type {{String:Object}}
   */
  get offsetObjects(): {[key: string]: Entity};

  /**
   * Whether {@link Entity.offset} is enabled.
   *
   * This is set via the {@link Viewer} constructor and is ````false```` by default.
   *
   * @returns {Boolean} True if {@link Entity.offset} is enabled.
   */
  get entityOffsetsEnabled(): boolean;

  /**
   * Whether geometry is readable.
   *
   * This is set via the {@link Viewer} constructor and is ````false```` by default.
   *
   * The ````readableGeometryEnabled```` option for ````Scene#pick```` only works if this is set ````true````.
   *
   * Note that when ````true````, this configuration will increase the amount of browser memory used by the Viewer.
   *
   * @returns {Boolean} True if geometry is readable.
   */
  get readableGeometryEnabled(): boolean;

  /**
   * Whether precision surface picking is enabled.
   *
   * This is set via the {@link Viewer} constructor and is ````false```` by default.
   *
   * The ````pickSurfacePrecision```` option for ````Scene.pick```` only works if this is set ````true````.
   *
   * Note that when ````true````, this configuration will increase the amount of browser memory used by the Viewer.
   *
   * @returns {Boolean} True if precision picking is enabled.
   */
  get pickSurfacePrecisionEnabled(): boolean;

  /**
   * Whether logarithmic depth buffer is enabled.
   *
   * This is set via the {@link Viewer} constructor and is ````false```` by default.
   *
   * @returns {Boolean} True if logarithmic depth buffer is enabled.
   */
  get logarithmicDepthBufferEnabled(): boolean;

  /**
   * Sets the number of {@link SectionPlane}s for which this Scene pre-caches resources.
   *
   * This property enhances the efficiency of SectionPlane creation by proactively allocating and caching Viewer resources for a specified quantity
   * of SectionPlanes. Introducing this parameter streamlines the initial creation speed of SectionPlanes, particularly up to the designated quantity. This parameter internally
   * configures renderer logic for the specified number of SectionPlanes, eliminating the need for setting up logic with each SectionPlane creation and thereby enhancing
   * responsiveness. It is important to consider that each SectionPlane impacts rendering performance, so it is recommended to set this value to a quantity that aligns with
   * your expected usage.
   *
   * Default is ````0````.
   */
  set numCachedSectionPlanes(numCachedSectionPlanes: number);

  /**
   * Gets the number of {@link SectionPlane}s for which this Scene pre-caches resources.
   *
   * This property enhances the efficiency of SectionPlane creation by proactively allocating and caching Viewer resources for a specified quantity
   * of SectionPlanes. Introducing this parameter streamlines the initial creation speed of SectionPlanes, particularly up to the designated quantity. This parameter internally
   * configures renderer logic for the specified number of SectionPlanes, eliminating the need for setting up logic with each SectionPlane creation and thereby enhancing
   * responsiveness. It is important to consider that each SectionPlane impacts rendering performance, so it is recommended to set this value to a quantity that aligns with
   * your expected usage.
   *
   * Default is ````0````.
   *
   * @returns {number} The number of {@link SectionPlane}s for which this Scene pre-caches resources.
   */
  get numCachedSectionPlanes(): number;

  /**
   * Sets whether physically-based rendering is enabled.
   *
   */
  set pbrEnabled(value: boolean);

  /**
   * Gets whether quality rendering is enabled.
   *
   * Default is ````false````.
   *
   * @returns {Boolean} True if quality rendering is enabled.
   */
  get pbrEnabled(): boolean

  /**
   * Sets whether data texture scene representation (DTX) is enabled for the {@link Scene}.
   *
   * Even when enabled, DTX will only work if supported.
   *
   * Default value is ````false````.
   *
   * @type {Boolean}
   */
  set dtxEnabled(value: boolean);

  /**
   * Gets whether data texture-based scene representation (DTX) is enabled for the {@link Scene}.
   *
   * Even when enabled, DTX will only apply if supported.
   *
   * Default value is ````false````.
   *
   * @type {Boolean}
   */
  get dtxEnabled(): boolean;

  /**
   * Sets whether basic color texture rendering is enabled.
   *
   * Default is ````true````.
   */
  set colorTextureEnabled(colorTextureEnabled: boolean);

  /**
   * Gets whether basic color texture rendering is enabled.
   *
   * Default is ````true````.
   *
   * @returns {Boolean} True if basic color texture rendering is enabled.
   */
  get colorTextureEnabled(): boolean;

  /**
   * Gets the Z value of offset for Marker's OcclusionTester.
   * The closest the value is to 0.000 the more precise OcclusionTester will be, but at the same time the less
   * precise it will behave for Markers that are located exactly on the Surface.
   *
   * Default is ````-0.001````.
   *
   * @returns {Number} Z offset for Marker
   */
  get markerZOffset(): number

  /**
   * Gets the IDs of the {@link Entity}s in {@link Scene.models}.
   *
   * @type {String[]}
   */
  get modelIds(): string[];

  /**
   * Gets the number of {@link Entity}s in {@link Scene.objects}.
   *
   * @type {Number}
   */
  get numObjects(): number;

  /**
   * Gets the IDs of the {@link Entity}s in {@link Scene.objects}.
   *
   * @type {String[]}
   */
  get objectIds(): string[];

  /**
  * Gets the number of {@link Entity}s in {@link Scene.visibleObjects}.
  *
  * @type {Number}
  */
  get numVisibleObjects(): number;

  /**
  * Gets the IDs of the {@link Entity}s in {@link Scene.visibleObjects}.
  *
  * @type {String[]}
  */
  get visibleObjectIds(): string[];

  /**
  * Gets the number of {@link Entity}s in {@link Scene.xrayedObjects}.
  *
  * @type {Number}
  */
  get numXRayedObjects(): number;

  /**
  * Gets the IDs of the {@link Entity}s in {@link Scene.xrayedObjects}.
  *
  * @type {String[]}
  */
  get xrayedObjectIds(): string[];

  /**
  * Gets the number of {@link Entity}s in {@link Scene.highlightedObjects}.
  *
  * @type {Number}
  */
  get numHighlightedObjects(): number;

  /**
  * Gets the IDs of the {@link Entity}s in {@link Scene.highlightedObjects}.
  *
  * @type {String[]}
  */
  get highlightedObjectIds(): string[];

  /**
  * Gets the number of {@link Entity}s in {@link Scene.selectedObjects}.
  *
  * @type {Number}
  */
  get numSelectedObjects(): number;

  /**
  * Gets the IDs of the {@link Entity}s in {@link Scene.selectedObjects}.
  *
  * @type {String[]}
  */
  get selectedObjectIds(): string[];

  /**
  * Gets the number of {@link Entity}s in {@link Scene.colorizedObjects}.
  *
  * @type {Number}
  */
  get numColorizedObjects(): number;

  /**
  * Gets the IDs of the {@link Entity}s in {@link Scene.colorizedObjects}.
  *
  * @type {String[]}
  */
  get colorizedObjectIds(): string[];

  /**
  * Gets the IDs of the {@link Entity}s in {@link Scene.opacityObjects}.
  *
  * @type {String[]}
  */
  get opacityObjectIds(): string[];

  /**
  * Gets the IDs of the {@link Entity}s in {@link Scene.offsetObjects}.
  *
  * @type {String[]}
  */
  get offsetObjectIds(): string[];

  /**
  * Sets the number of "ticks" that happen between each render or this Scene.
  *
  * Default value is ````1````.
  *
  * @type {Number}
  */
  set ticksPerRender(value: number);

  /**
  * Gets the number of "ticks" that happen between each render or this Scene.
  *
  * Default value is ````1````.
  *
  * @type {Number}
  */
  get ticksPerRender(): number;

  /**
  * Sets the number of "ticks" that happen between occlusion testing for {@link Marker}s.
  *
  * Default value is ````20````.
  *
  * @type {Number}
  */
  set ticksPerOcclusionTest(value: number);

  /**
  * Gets the number of "ticks" that happen between each render of this Scene.
  *
  * Default value is ````1````.
  *
  * @type {Number}
  */
  get ticksPerOcclusionTest(): number;

  /**
  * Sets the number of times this Scene renders per frame.
  *
  * Default value is ````1````.
  *
  * @type {Number}
  */
  set passes(value: number)

  /**
  * Gets the number of times this Scene renders per frame.
  *
  * Default value is ````1````.
  *
  * @type {Number}
  */
  get passes(): number;

  /**
  * When {@link Scene.passes} is greater than ````1````, indicates whether or not to clear the canvas before each pass (````true````) or just before the first pass (````false````).
  *
  * Default value is ````false````.
  *
  * @type {Boolean}
  */
  set clearEachPass(value: boolean);

  /**
  * When {@link Scene.passes} is greater than ````1````, indicates whether or not to clear the canvas before each pass (````true````) or just before the first pass (````false````).
  *
  * Default value is ````false````.
  *
  * @type {Boolean}
  */
  get clearEachPass(): boolean;

  /**
  * Sets whether or not {@link Scene} should expect all {@link Texture}s and colors to have pre-multiplied gamma.
  *
  * Default value is ````false````.
  *
  * @type {Boolean}
  */
  set gammaInput(value: boolean);

  /**
  * Gets whether or not {@link Scene} should expect all {@link Texture}s and colors to have pre-multiplied gamma.
  *
  * Default value is ````false````.
  *
  * @type {Boolean}
  */
  get gammaInput(): boolean;

  /**
  * Sets whether or not to render pixels with pre-multiplied gama.
  *
  * Default value is ````false````.
  *
  * @type {Boolean}
  */
  set gammaOutput(value: boolean);

  /**
  * Gets whether or not to render pixels with pre-multiplied gama.
  *
  * Default value is ````true````.
  *
  * @type {Boolean}
  */
  get gammaOutput(): boolean;

  /**
  * Sets the gamma factor to use when {@link Scene.gammaOutput} is set true.
  *
  * Default value is ````2.2````.
  *
  * @type {Number}
  */
  set gammaFactor(value: number);

  /**
  * Gets the gamma factor to use when {@link Scene.gammaOutput} is set true.
  *
  * Default value is ````2.2````.
  *
  * @type {Number}
  */
  get gammaFactor(): number;

  /**
  * Gets the default {@link Geometry} for this Scene, which is a {@link ReadableGeometry} with a unit-sized box shape.
  *
  * Has {@link ReadableGeometry.id} set to "default.geometry".
  *
  * {@link Mesh}s in this Scene have {@link Mesh.geometry} set to this {@link ReadableGeometry} by default.
  *
  * @type {ReadableGeometry}
  */
  get geometry(): ReadableGeometry;

  /**
  * Gets the default {@link Material} for this Scene, which is a {@link PhongMaterial}.
  *
  * Has {@link PhongMaterial.id} set to "default.material".
  *
  * {@link Mesh}s in this Scene have {@link Mesh.material} set to this {@link PhongMaterial} by default.
  *
  * @type {PhongMaterial}
  */
  get material(): PhongMaterial;

  /**
  * Gets the default xraying {@link EmphasisMaterial} for this Scene.
  *
  * Has {@link EmphasisMaterial.id} set to "default.xrayMaterial".
  *
  * {@link Mesh}s in this Scene have {@link Mesh.xrayMaterial} set to this {@link EmphasisMaterial} by default.
  *
  * {@link Mesh}s are xrayed while {@link Mesh.xrayed} is ````true````.
  *
  * @type {EmphasisMaterial}
  */
  get xrayMaterial(): EmphasisMaterial;

  /**
  * Gets the default highlight {@link EmphasisMaterial} for this Scene.
  *
  * Has {@link EmphasisMaterial.id} set to "default.highlightMaterial".
  *
  * {@link Mesh}s in this Scene have {@link Mesh.highlightMaterial} set to this {@link EmphasisMaterial} by default.
  *
  * {@link Mesh}s are highlighted while {@link Mesh.highlighted} is ````true````.
  *
  * @type {EmphasisMaterial}
  */
  get highlightMaterial(): EmphasisMaterial;

  /**
  * Gets the default selection {@link EmphasisMaterial} for this Scene.
  *
  * Has {@link EmphasisMaterial.id} set to "default.selectedMaterial".
  *
  * {@link Mesh}s in this Scene have {@link Mesh.highlightMaterial} set to this {@link EmphasisMaterial} by default.
  *
  * {@link Mesh}s are highlighted while {@link Mesh.highlighted} is ````true````.
  *
  * @type {EmphasisMaterial}
  */
  get selectedMaterial(): EmphasisMaterial;

  /**
  * Gets the default {@link EdgeMaterial} for this Scene.
  *
  * Has {@link EdgeMaterial.id} set to "default.edgeMaterial".
  *
  * {@link Mesh}s in this Scene have {@link Mesh.edgeMaterial} set to this {@link EdgeMaterial} by default.
  *
  * {@link Mesh}s have their edges emphasized while {@link Mesh.edges} is ````true````.
  *
  * @type {EdgeMaterial}
  */
  get edgeMaterial(): EdgeMaterial;

  /**
  * Gets the {@link PointsMaterial} for this Scene.
  *
  * @type {PointsMaterial}
  */
  get pointsMaterial(): PointsMaterial

  /**
  * Gets the {@link LinesMaterial} for this Scene.
  *
  * @type {LinesMaterial}
  */
  get linesMaterial(): LinesMaterial

  /**
  * Gets the {@link Viewport} for this Scene.
  *
  * @type Viewport
  */
  get viewport(): Viewport

  /**
  * Gets the {@link Camera} for this Scene.
  *
  * @type {Camera}
  */
  get camera(): Camera;

  /**
  * Gets the World-space 3D center of this Scene.
  *
  *@type {Number[]}
  */
  get center(): number[];

  /**
  * Gets the World-space axis-aligned 3D boundary (AABB) of this Scene.
  *
  * The AABB is represented by a six-element Float64Array containing the min/max extents of the axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
  *
  * When the Scene has no content, will be ````[-100,-100,-100,100,100,100]````.
  *
  * @type {Number[]}
  */
  get aabb(): number[];

  get sao(): SAO;

  get input(): Input;

  /**
   * Performs an occlusion test on all {@link Marker}s in this {@link Scene}.
   *
   * Sets each {@link Marker.visible} ````true```` if the Marker is currently not occluded by any opaque {@link Entity}s
   * in the Scene, or ````false```` if an Entity is occluding it.
   */
  doOcclusionTest(): void;

  /**
   * Renders a single frame of this Scene.
   *
   * The Scene will periodically render itself after any updates, but you can call this method to force a render
   * if required.
   *
   * @param {Boolean} [forceRender=false] Forces a render when true, otherwise only renders if something has changed in this Scene
   * since the last render.
   */
  render(forceRender?: boolean): void;

  /**
   * Attempts to pick an {@link Entity} in this Scene.
   * @param {*} params Picking parameters.
   * @param {Boolean} [params.pickSurface=false] Whether to find the picked position on the surface of the Entity.
   * @param {Boolean} [params.pickSurfacePrecision=false] When picking an Entity surface position, indicates whether or not we want full-precision {@link PickResult.worldPos}. Only works when {@link Scene.pickSurfacePrecisionEnabled} is ````true````. If pick succeeds, the returned {@link PickResult} will have {@link PickResult.precision} set ````true````, to indicate that it contains full-precision surface pick results.
   * @param {Boolean} [params.pickSurfaceNormal=false] Whether to find the picked normal on the surface of the Entity. Only works if ````pickSurface```` is given.
   * @param {Number[]} [params.canvasPos] Canvas-space coordinates. When ray-picking, this will override the **origin** and ** direction** parameters and will cause the ray to be fired through the canvas at this position, directly along the negative View-space Z-axis.
   * @param {Number[]} [params.origin] World-space ray origin when ray-picking. Ignored when canvasPos given.
   * @param {Number[]} [params.direction] World-space ray direction when ray-picking. Also indicates the length of the ray. Ignored when canvasPos given.
   * @param {Number[]} [params.matrix] 4x4 transformation matrix to define the World-space ray origin and direction, as an alternative to ````origin```` and ````direction````.
   * @param {String[]} [params.includeEntities] IDs of {@link Entity}s to restrict picking to. When given, ignores {@link Entity}s whose IDs are not in this list.
   * @param {String[]} [params.excludeEntities] IDs of {@link Entity}s to ignore. When given, will pick *through* these {@link Entity}s, as if they were not there.
   * @param {PickResult} [pickResult] Holds the results of the pick attempt. Will use the Scene's singleton PickResult if you don't supply your own.
   * @returns {PickResult} Holds results of the pick attempt, returned when an {@link Entity} is picked, else null. See method comments for description.
   */
  pick(params: {
    pickSurface?: boolean;
    pickSurfacePrecision?: boolean;
    pickSurfaceNormal?: boolean;
    canvasPos?: number[];
    origin?: number[];
    direction?: number[];
    matrix?: number[];
    includeEntities?: string[];
    excludeEntities?: string[];
  }, pickResult?: PickResult): PickResult | null;

  /**
   * Destroys all non-default {@link Component}s in this Scene.
   */
  clear(): void;

  /**
   * Destroys all {@link Light}s in this Scene..
   */
  clearLights(): void;

  /**
   * Destroys all {@link SectionPlane}s in this Scene.
   */
  clearSectionPlanes(): void;

  /**
   * Destroys all {@link Bitmaps}s in this Scene.
   */
  clearBitmaps(): void;

  /**
   * Destroys all {@link Line}s in this Scene.
   */
  clearLines(): void;

  /**
   * Gets the collective axis-aligned boundary (AABB) of a batch of {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * Each {@link Entity} on which {@link Entity.isObject} is registered by {@link Entity.id} in {@link Scene.visibleObjects}.
   *
   * Each {@link Entity} is only included in the AABB when {@link Entity.collidable} is ````true````.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @returns {[Number, Number, Number, Number, Number, Number]} An axis-aligned World-space bounding box, given as elements ````[xmin, ymin, zmin, xmax, ymax, zmax]````.
   */
  getAABB(ids: string[]): number[];

  /**
   * Batch-updates {@link Entity.visible} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * Each {@link Entity} on which both {@link Entity.isObject} and {@link Entity.visible} are ````true```` is
   * registered by {@link Entity.id} in {@link Scene.visibleObjects}.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Boolean} visible Whether or not to set visible.
   * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
   */
  setObjectsVisible(ids: string[], visible: boolean): boolean;

  /**
   * Batch-updates {@link Entity.collidable} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Boolean} collidable Whether or not to set collidable.
   * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
   */
  setObjectsCollidable(ids: string[], collidable: boolean): boolean;

  /**
   * Batch-updates {@link Entity.culled} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Boolean} culled Whether or not to cull.
   * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
   */
  setObjectsCulled(ids: string[], culled: boolean): boolean;

  /**
   * Batch-updates {@link Entity.selected} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * Each {@link Entity} on which both {@link Entity.isObject} and {@link Entity.selected} are ````true```` is
   * registered by {@link Entity.id} in {@link Scene.selectedObjects}.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Boolean} selected Whether or not to select.
   * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
   */
  setObjectsSelected(ids: string[], selected: boolean): boolean;

  /**
   * Batch-updates {@link Entity.highlighted} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * Each {@link Entity} on which both {@link Entity.isObject} and {@link Entity.highlighted} are ````true```` is
   * registered by {@link Entity.id} in {@link Scene.highlightedObjects}.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Boolean} highlighted Whether or not to highlight.
   * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
   */
  setObjectsHighlighted(ids: string[], highlighted: boolean): boolean;

  /**
   * Batch-updates {@link Entity.xrayed} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Boolean} xrayed Whether or not to xray.
   * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
   */
  setObjectsXRayed(ids: string[], xrayed: boolean): boolean;

  /**
   * Batch-updates {@link Entity.edges} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Boolean} edges Whether or not to show edges.
   * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
   */
  setObjectsEdges(ids: string[], edges: boolean): boolean;

  /**
   * Batch-updates {@link Entity.colorize} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Number[]} [colorize=(1,1,1)] RGB colorize factors, multiplied by the rendered pixel colors.
   * @returns {Boolean} True if any {@link Entity}s changed opacity, else false if all updates were redundant and not applied.
   */
  setObjectsColorized(ids: string[], colorize: number[]): boolean;

  /**
   * Batch-updates {@link Entity.opacity} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Number} [opacity=1.0] Opacity factor, multiplied by the rendered pixel alphas.
   * @returns {Boolean} True if any {@link Entity}s changed opacity, else false if all updates were redundant and not applied.
   */
  setObjectsOpacity(ids: string[], opacity: number): boolean

  /**
   * Batch-updates {@link Entity.pickable} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Boolean} pickable Whether or not to set pickable.
   * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
   */
  setObjectsPickable(ids: string[], pickable: boolean): boolean;

  /**
   * Batch-updates {@link Entity.offset} on {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Number[]} [offset] 3D offset vector.
   */
  setObjectsOffset(ids: string[], offset: number[]): void;

  /**
   * Iterates with a callback over {@link Entity}s that represent objects.
   *
   * An {@link Entity} represents an object when {@link Entity.isObject} is ````true````.
   *
   * @param {String[]} ids Array of {@link Entity.id} values.
   * @param {Function} callback Callback to execute on eacn {@link Entity}.
   * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
   */
  withObjects(ids: string[], callback: Function): boolean;

  /**
   * This method will "tickify" the provided `cb` function.
   *
   * This means, the function will be wrapped so:
   *
   * - it runs time-aligned to scene ticks
   * - it runs maximum once per scene-tick
   *
   * @param {Function} cb The function to tickify
   * @returns {Function}
   */
  tickify<T extends (...args: any[]) => any>(cb: T): (...args: Parameters<T>) => void;

  /**
   * Destroys this Scene.
   */
  destroy(): void;
}
