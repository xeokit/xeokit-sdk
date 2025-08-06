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
    readonly id: string;

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
    readonly originalSystemId: string;

    /**
     * Returns true to indicate that this is an SceneModelEntity.
     *
     * @returns {Boolean}
     */
    readonly isEntity: boolean;

    /**
     * Returns ````true```` if this SceneModelEntity represents a model.
     *
     * When this is ````true````, the SceneModelEntity will be registered by {@link SceneModelEntity.id} in {@link Scene.models} and
     * may also have a corresponding {@link MetaModel}.
     *
     * @type {Boolean}
     * @abstract
     */
    readonly isModel: boolean;

    /**
     * Returns ````true```` if this SceneModelEntity represents an object.
     *
     * When this is ````true````, the SceneModelEntity will be registered by {@link SceneModelEntity.id} in {@link Scene.objects} and
     * may also have a corresponding {@link MetaObject}.
     *
     * @type {Boolean}
     * @abstract
     */
    readonly isObject: boolean;

    /** Returns the parent SceneModelEntity, if any. */
    readonly parent: void;

    /**
     * The 3D World-space origin for this SceneModelEntity.
     *
     * @type {Float64Array}
     * @abstract
     */
    origin: Float64Array;

    /**
     * World-space 3D axis-aligned bounding box (AABB) of this SceneModelEntity.
     *
     * Represented by a six-element Float64Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Float64Array}
     * @abstract
     */
    readonly aabb: number[];

    /**
     * The approximate number of primitives in this SceneModelEntity
     */
    readonly numPrimitives: number;

    /**
     * The approximate number of triangles in this SceneModelEntity.
     *
     * @type {number}
     * @abstract
     */
    readonly numTriangles: number;

    /**
     * Whether this SceneModelEntity is visible.
     *
     * Only rendered when {@link SceneModelEntity.visible} is ````true```` and {@link SceneModelEntity.culled} is ````false````.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.visible} are both ````true```` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.visibleObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    visible: boolean;

    /**
     * Whether this SceneModelEntity is xrayed.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.xrayed} are both ````true``` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.xrayedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    xrayed: boolean;

    /**
     * Whether this SceneModelEntity is highlighted.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.highlighted} are both ````true```` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.highlightedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    highlighted: boolean;

    /**
     * Whether this SceneModelEntity is selected.
     *
     * When {@link SceneModelEntity.isObject} and {@link SceneModelEntity.selected} are both ````true``` the SceneModelEntity will be
     * registered by {@link SceneModelEntity.id} in {@link Scene.selectedObjects}.
     *
     * @type {Boolean}
     * @abstract
     */
    selected: boolean;

    /**
     * Whether this SceneModelEntity's edges are enhanced.
     *
     * @type {Boolean}
     * @abstract
     */
    edges: boolean;

    /**
     * Whether View Frustum Culling is enabled
     */
    culledVFC: boolean;

    /**
     * Whether Level of Detail Culling is enabled
     */
    culledLOD: boolean;

    /**
     * Whether this SceneModelEntity is culled.
     *
     * Only rendered when {@link SceneModelEntity.visible} is ````true```` and {@link SceneModelEntity.culled} is ````false````.
     *
     * @type {Boolean}
     * @abstract
     */
    culled: boolean;

    /**
     * Whether this SceneModelEntity is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene.sectionPlanes}.
     *
     * @type {Boolean}
     * @abstract
     */
    clippable: boolean;

    /**
     * Whether this SceneModelEntity is included in boundary calculations.
     *
     * @type {Boolean}
     * @abstract
     */
    collidable: boolean;

    /**
     * Whether this SceneModelEntity is pickable.
     *
     * Picking is done via calls to {@link Scene.pick}.
     *
     * @type {Boolean}
     * @abstract
     */
    pickable: boolean;

    /**
     * The SceneModelEntity's RGB colorize color, multiplies by the SceneModelEntity's rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {number[]}
     * @abstract
     */
    colorize: number[];

    /**
     * The SceneModelEntity's opacity factor, multiplies by the SceneModelEntity's rendered fragment alphas.
     *
     * This is a factor in range ````[0..1]````.
     *
     * @type {number}
     * @abstract
     */
    opacity: number;

    /**
     * Whether this SceneModelEntity casts shadows.
     *
     * @type {Boolean}
     * @abstract
     */
    castsShadow: boolean;

    /**
     * Whether this SceneModelEntity can have shadows cast upon it
     *
     * @type {Boolean}
     * @abstract
     */
    receivesShadow: boolean;

    /**
     * Whether this SceneModelEntity can have Scalable Ambient Obscurance (SAO) applied to it.
     *
     * SAO is configured by {@link SAO}.
     *
     * @type {Boolean}
     * @abstract
     */
    readonly saoEnabled: boolean;

    /**
     * The material for this SceneModelEntity that will be used on the caps 
     * when the objects of this entity are sliced
     * 
     * If there is no capMaterial attached to a SceneModelEntity then its objects
     * will not be capped when sliced
     */
    capMaterial: Material;

    /**
     * The SceneModelEntity's 3D World-space offset.
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
    offset: number[];

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
     * Gets the complete geometry of this entity.
     */
    getGeometryData(): {indices: number[],positions:number[]}

    /**
     * Returns the volume of this SceneModelEntity.
     *
     * Only works when {@link Scene.readableGeometryEnabled | Scene.readableGeometryEnabled} is `true` and the
     * SceneModelEntity contains solid triangle meshes; returns `0` otherwise.
     *
     * @returns {number}
     */
    readonly volume: number;

    /**
     * The surface area of this SceneModelEntity.
     *
     * Only works when {@link Scene.readableGeometryEnabled | Scene.readableGeometryEnabled} is `true` and the
     * SceneModelEntity contains triangle meshes; returns `0` otherwise.
     *
     * @returns {number}
     */
    readonly surfaceArea: number;

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
