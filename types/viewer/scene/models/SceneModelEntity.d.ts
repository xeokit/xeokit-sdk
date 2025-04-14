import {Entity} from "../Entity";
import {SceneModelMesh} from "./SceneModelMesh";
import {SceneModel} from "./SceneModel";
import { Material } from "../materials";

/**
 * An abstract 3D scene element that can be individually shown, hidden, selected,
 * highlighted, xrayed, culled, picked, clipped and bounded.
 *
 * @abstract
 */
export declare abstract class SceneModelEntity implements Entity {

    /**
     * Component ID, unique within the {@link Scene}.
     *
     * @type {number|string}
     * @abstract
     */
    get id(): string;

    /**
     * ID of the corresponding object within the originating system, if any.
     *
     * By default, this has the same value as {@link SceneModelEntity.id}. When we load a model using {@link XKTLoaderPlugin.load},
     * with {@link XKTLoaderPlugin.globalizeObjectIds} set ````true````, then that plugin will prefix {@link SceneModelEntity.id}
     * with the model ID, while leaving this property holding the original value of {@link SceneModelEntity.id}. When loading an
     * IFC model, this property will hold the IFC product ID of the corresponding IFC element.
     *
     * @type {string}
     */
    get originalSystemId(): string;

    /**
     * Returns true to indicate that this is an SceneModelEntity.
     *
     * @returns {Boolean}
     */
    get isEntity(): boolean;

    /**
     * Returns ````true```` if this SceneModelEntity represents a model.
     *
     * When this is ````true````, the SceneModelEntity will be registered by {@link SceneModelEntity.id} in {@link Scene.models} and
     * may also have a corresponding {@link MetaModel}.
     *
     * @type {Boolean}
     * @abstract
     */
    get isModel(): boolean;

    /**
     * Returns ````true```` if this SceneModelEntity represents an object.
     *
     * When this is ````true````, the SceneModelEntity will be registered by {@link SceneModelEntity.id} in {@link Scene.objects} and
     * may also have a corresponding {@link MetaObject}.
     *
     * @type {Boolean}
     * @abstract
     */
    get isObject(): boolean;

    /** Returns the parent SceneModelEntity, if any. */
    get parent(): void;

    /**
     * Sets the 3D World-space origin for this SceneModelEntity.
     *
     * @type {Float64Array}
     * @abstract
     */
    set origin(arg: Float64Array);

    /**
     * Gets the 3D World-space origin for this SceneModelEntity.
     *
     * @type {Float64Array}
     * @abstract
     */
    get origin(): Float64Array;

    /**
     * World-space 3D axis-aligned bounding box (AABB) of this SceneModelEntity.
     *
     * Represented by a six-element Float64Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Float64Array}
     * @abstract
     */
    get aabb(): number[];

    /**
     * The approximate number of primitives in this SceneModelEntity
     */
    get numPrimitives(): number;

    /**
     * The approximate number of triangles in this SceneModelEntity.
     *
     * @type {number}
     * @abstract
     */
    get numTriangles(): number;

    /**
     * Sets if this SceneModelEntity is visible.
     *
     * Only rendered when {@link SceneModelEntity.visible} is ````true```` and {@link SceneModelEntity.culled} is ````false````.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.visible} are both ````true```` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.visibleObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set visible(arg: boolean);

    /**
     * Gets if this SceneModelEntity is visible.
     *
     * Only rendered when {@link SceneModelEntity.visible} is ````true```` and {@link SceneModelEntity.culled} is ````false````.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.visible} are both ````true```` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.visibleObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get visible(): boolean;

    /**
     * Sets if this SceneModelEntity is xrayed.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.xrayed} are both ````true``` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.xrayedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set xrayed(arg: boolean);

    /**
     * Gets if this SceneModelEntity is xrayed.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.xrayed} are both ````true``` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.xrayedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get xrayed(): boolean;

    /**
     * Sets if this SceneModelEntity is highlighted.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.highlighted} are both ````true```` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.highlightedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set highlighted(arg: boolean);

    /**
     * Gets if this SceneModelEntity is highlighted.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.highlighted} are both ````true```` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.highlightedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get highlighted(): boolean;

    /**
     * Sets if this SceneModelEntity is selected.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.selected} are both ````true``` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.selectedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    set selected(arg: boolean);

    /**
     * Gets if this SceneModelEntity is selected.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.selected} are both ````true``` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.selectedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    get selected(): boolean;

    /**
     * Sets if this SceneModelEntity's edges are enhanced.
     *
     * @type {Boolean}
     * @abstract
     */
    set edges(arg: boolean);

    /**
     * Gets if this SceneModelEntity's edges are enhanced.
     *
     * @type {Boolean}
     * @abstract
     */
    get edges(): boolean;

    /**
     * Toggle View Frustum Culling
     */
    set culledVFC(arg: boolean);

    /**
     * Gets View Frustum Culling
     */
    get culledVFC(): boolean;

    /**
     * Toggle Level of Detail Culling
     */
    set culledLOD(arg: boolean);

    /**
     * Gets level of detail culling
     */
    get culledLOD(): boolean;

    /**
     * Sets if this SceneModelEntity is culled.
     *
     * Only rendered when {@link SceneModelEntity.visible} is ````true```` and {@link SceneModelEntity.culled} is ````false````.
     *
     * @type {Boolean}
     * @abstract
     */
    set culled(arg: boolean);

    /**
     * Gets if this SceneModelEntity is culled.
     *
     * Only rendered when {@link SceneModelEntity.visible} is ````true```` and {@link SceneModelEntity.culled} is ````false````.
     *
     * @type {Boolean}
     * @abstract
     */
    get culled(): boolean;

    /**
     * Sets if this SceneModelEntity is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene.sectionPlanes}.
     *
     * @type {Boolean}
     * @abstract
     */
    set clippable(arg: boolean);

    /**
     * Gets if this SceneModelEntity is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene.sectionPlanes}.
     *
     * @type {Boolean}
     * @abstract
     */
    get clippable(): boolean;

    /**
     * Sets if this SceneModelEntity is included in boundary calculations.
     *
     * @type {Boolean}
     * @abstract
     */
    set collidable(arg: boolean);

    /**
     * Gets if this SceneModelEntity is included in boundary calculations.
     *
     * @type {Boolean}
     * @abstract
     */
    get collidable(): boolean;

    /**
     * Sets if this SceneModelEntity is pickable.
     *
     * Picking is done via calls to {@link Scene.pick}.
     *
     * @type {Boolean}
     * @abstract
     */
    set pickable(arg: boolean);

    /**
     * Gets if this SceneModelEntity is pickable.
     *
     * Picking is done via calls to {@link Scene.pick}.
     *
     * @type {Boolean}
     * @abstract
     */
    get pickable(): boolean;

    /**
     * Sets the SceneModelEntity's RGB colorize color, multiplies by the SceneModelEntity's rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {number[]}
     * @abstract
     */
    set colorize(arg: number[]);

    /**
     * Gets the SceneModelEntity's RGB colorize color, multiplies by the SceneModelEntity's rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {number[]}
     * @abstract
     */
    get colorize(): number[];

    /**
     * Sets the SceneModelEntity's opacity factor, multiplies by the SceneModelEntity's rendered fragment alphas.
     *
     * This is a factor in range ````[0..1]````.
     *
     * @type {number}
     * @abstract
     */
    set opacity(arg: number);

    /**
     * Gets the SceneModelEntity's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {number}
     * @abstract
     */
    get opacity(): number;

    /**
     * Sets if this SceneModelEntity casts shadows.
     *
     * @type {Boolean}
     * @abstract
     */
    set castsShadow(arg: boolean);

    /**
     * Gets if this SceneModelEntity casts shadows.
     *
     * @type {Boolean}
     * @abstract
     */
    get castsShadow(): boolean;

    /**
     * Sets if to this SceneModelEntity can have shadows cast upon it
     *
     * @type {Boolean}
     * @abstract
     */
    set receivesShadow(arg: boolean);

    /**
     * Gets if this SceneModelEntity can have shadows cast upon it
     *
     * @type {Boolean}
     * @abstract
     */
    get receivesShadow(): boolean;

    /**
     * Gets if this SceneModelEntity can have Scalable Ambient Obscurance (SAO) applied to it.
     *
     * SAO is configured by {@link SAO}.
     *
     * @type {Boolean}
     * @abstract
     */
    get saoEnabled(): boolean;

    /**
     * Sets the material for this SceneModelEntity that will be used on the caps 
     * when the objects of this entity are sliced
     * 
     * If there is no capMaterial attached to a SceneModelEntity then its objects
     * will not be capped when sliced
     */
    set capMaterial(value: Material);

    /**
     * Gets the cap material attached to this SceneModelEntity
     */
    get capMaterial(): Material;

    /**
     * Sets the SceneModelEntity's 3D World-space offset.
     *
     * Since offsetting Entities comes with memory and rendering overhead on some systems, this feature
     * only works when {@link Viewer} is configured with ````entityOffsetsEnabled: true````.
     *
     * The offset dynamically translates the SceneModelEntity in World-space, which  is useful for creating
     * effects like exploding parts assemblies etc.
     *
     * Default value is ````[0,0,0]````.
     *
     * Provide a null or undefined value to reset to the default value.
     *
     * @abstract
     * @type {number[]}
     */
    set offset(arg: number[]);

    /**
     * Gets the SceneModelEntity's 3D World-space offset.
     *
     * Default value is ````[0,0,0]````.
     *
     * @abstract
     * @type {number[]}
     */
    get offset(): number[];

    /**
     * Gets the World, View and Canvas-space positions of each vertex in a callback.
     *
     * @param callback
     */
    getEachVertex(callback: any): void;

    /**
     * Gets the indices of this entity in a callback
     */
    getEachIndex(callback: any): void;

    /**
     * Returns the volume of this SceneModelEntity.
     *
     * Only works when {@link Scene.readableGeometryEnabled | Scene.readableGeometryEnabled} is `true` and the
     * SceneModelEntity contains solid triangle meshes; returns `0` otherwise.
     *
     * @returns {number}
     */
    get volume(): number;

    /**
     * Returns the surface area of this SceneModelEntity.
     *
     * Only works when {@link Scene.readableGeometryEnabled | Scene.readableGeometryEnabled} is `true` and the
     * SceneModelEntity contains triangle meshes; returns `0` otherwise.
     *
     * @returns {number}
     */
    get surfaceArea(): number;

    /**
     * The {@link SceneModel} to which this SceneModelEntity belongs.
     */
    model :SceneModel;

    /**
     * The {@link SceneModelMesh}es belonging to this SceneModelEntity.
     *
     * * These are created with {@link SceneModel#createMesh} and registered in {@ilnk SceneModel#meshes}
     * * Each SceneModelMesh belongs to one SceneModelEntity
     */
    meshes : SceneModelMesh[];


    /**
     * Identifies if it's a SceneModelEntity
     */
    isSceneModelEntity: boolean;

    /**
     * Destroys this SceneModelEntity.
     */
    destroy(): void;
}
