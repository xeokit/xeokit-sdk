import { Viewer } from "../Viewer";
import { Scene } from "../scene/scene/Scene";
import { MetaModel } from "./MetaModel";
import { PropertySet } from "./PropertySet";
import { MetaObject } from "./MetaObject";

/**
 * Metadata corresponding to a {@link Scene}.
 */
export declare class MetaScene {
  /**
     * The {@link Viewer}.
     * @property viewer
     * @type {Viewer}
     */
  viewer: Viewer;

  /**
     * The {@link Scene}.
     * @property scene
     * @type {Scene}
     */
  scene: Scene;

  /**
     * The {@link MetaModel}s belonging to this MetaScene, each mapped to its {@link MetaModel.modelId}.
     *
     * @type {{String:MetaModel}}
     */
  metaModels: {[key: string]: MetaModel};

  /**
     * The {@link PropertySet}s belonging to this MetaScene, each mapped to its {@link PropertySet.id}.
     *
     * @type {{String:PropertySet}}
     */
  propertySets: {[key: string]: PropertySet};

  /**
     * The {@link MetaObject}s belonging to this MetaScene, each mapped to its {@link MetaObject.id}.
     *
     * @type {{String:MetaObject}}
     */
  metaObjects: {[key: string]: MetaObject};

  /**
     * The {@link MetaObject}s belonging to this MetaScene, each mapped to its {@link MetaObject.type}.
     *
     * @type {{String:MetaObject}}
     */
  metaObjectsByType: {[key: string]: {[key: string]: MetaObject} };

  /**
     * Subscribes to an event fired at this Viewer.
     *
     * @param {String} event The event
     * @param {Function} callback Callback fired on the event
     */
  on(event: string, callback: ()=> void): void;

  /**
     * Fires an event at this Viewer.
     *
     * @param {String} event Event name
     * @param {Object} value Event parameters
     */
  fire(event: string, value: any): void;

  /**
     * Unsubscribes from an event fired at this Viewer.
     * @param event
     */
  off(event: any): void;

  /**
     * Creates a {@link MetaModel} in this MetaScene.
     *
     * The MetaModel will contain a hierarchy of {@link MetaObject}s, created from the
     * meta objects in ````metaModelData````.
     *
     * The meta object hierarchy in ````metaModelData```` is expected to be non-cyclic, with a single root. If the meta
     * objects are cyclic, then this method will log an error and attempt to recover by creating a dummy root MetaObject
     * of type "Model" and connecting all other MetaObjects as its direct children. If the meta objects contain multiple
     * roots, then this method similarly attempts to recover by creating a dummy root MetaObject of type "Model" and
     * connecting all the root MetaObjects as its children.
     *
     * @param {String} modelId ID for the new {@link MetaModel}, which will have {@link MetaModel.id} set to this value.
     * @param {Object} metaModelData Data for the {@link MetaModel}.
     * @param {Object} [options] Options for creating the {@link MetaModel}.
     * @param {String[]} [options.includeTypes] When provided, only create {@link MetaObject}s with types in this list.
     * @param {String[]} [options.excludeTypes] When provided, never create {@link MetaObject}s with types in this list.
     * @param {Boolean} [options.globalizeObjectIds=false] Whether to globalize each {@link MetaObject.id}. Set this ````true```` when you need to load multiple instances of the same meta model, to avoid ID clashes between the meta objects in the different instances.
     * @returns {MetaModel} The new MetaModel.
     */
  createMetaModel(modelId: string, metaModelData: any, options?: {
    includeTypes?: string[];
    excludeTypes?: string[];
    globalizeObjectIds?: boolean;
  }): MetaModel;

  /**
     * Removes a {@link MetaModel} from this MetaScene.
     *
     * Fires a "metaModelDestroyed" event with the value of the {@link MetaModel.id}.
     *
     * @param {String} id ID of the target {@link MetaModel}.
     */
  destroyMetaModel(id: string): void;

  /**
     * Gets the {@link MetaObject.id}s of the {@link MetaObject}s that have the given {@link MetaObject.type}.
     *
     * @param {String} type The type.
     * @returns {String[]} Array of {@link MetaObject.id}s.
     */
  getObjectIDsByType(type: string): string[];

  /**
     * Gets the {@link MetaObject.id}s of the {@link MetaObject}s within the given subtree.
     *
     * @param {String} id  ID of the root {@link MetaObject} of the given subtree.
     * @param {String[]} [includeTypes] Optional list of types to include.
     * @param {String[]} [excludeTypes] Optional list of types to exclude.
     * @returns {String[]} Array of {@link MetaObject.id}s.
     */
  getObjectIDsInSubtree(id: string, includeTypes?: string[], excludeTypes?: string[]): string[];

  /**
     * Iterates over the {@link MetaObject}s within the subtree.
     *
     * @param {String} id ID of root {@link MetaObject}.
     * @param {Function} callback Callback fired at each {@link MetaObject}.
     */
  withMetaObjectsInSubtree(id: string, callback: ()=> void): void;
}
