import { MetaModel } from "./MetaModel";
import { PropertySet } from "./PropertySet";

/**
 * Metadata corresponding to an {@link Entity} that represents an object.
 */
export declare class MetaObject {
  /**
   * Model metadata.
   */
  metaModel: MetaModel;

  /**
   * Globally-unique ID.
   */
  id: string;

  /**
   * ID of the corresponding object within the originating system, if any.
   */
  originalSystemId: string;

  /**
   * Human-readable name.
   */
  name: string;

  /**
   * Type - often an IFC product type.
   */
  type: string;

  /**
   * Optional {@link PropertySet}s used by this MetaObject.
   */
  propertySets: PropertySet[];

  /**
   * The parent MetaObject within the structure hierarchy.
   */
  parent?: MetaObject;

  /**
   * Child ObjectMeta instances within the structure hierarchy.
   */
  children: MetaObject[];

  /**
   * External application-specific metadata
   */
  external?: any;

  /**
   * Gets the {@link MetaObject.id}s of the {@link MetaObject}s within the subtree.
   *
   * @returns {String[]} Array of {@link MetaObject.id}s.
   */
  getObjectIDsInSubtree(): string[];

  /**
   * Iterates over the {@link MetaObject}s within the subtree.
   *
   * @param {Function} callback Callback fired at each {@link MetaObject}.
   */
  withMetaObjectsInSubtree(callback: (metaobect: MetaObject)=> void): void;

  /**
   * Gets the {@link MetaObject.id}s of the {@link MetaObject}s within the subtree that have the given {@link MetaObject.type}s.
   *
   * @param {String[]} types {@link MetaObject.type} values.
   * @returns {String[]} Array of {@link MetaObject.id}s.
   */
  getObjectIDsInSubtreeByType(types: string[]): string[];
}
