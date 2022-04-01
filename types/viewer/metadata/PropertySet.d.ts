import { Property } from "./Property";

/**
 * A set of properties associated with one or more {@link MetaObject}s.
 */
export declare class PropertySet {
  /**
   * Globally-unique ID for this PropertySet.
   */
  id: string;

  /**
   * ID of the corresponding object within the originating system, if any.
   */
  originalSystemId: string;

  /**
   * Human-readable name of this PropertySet.
   */
  name: string;

  /**
   * Type of this PropertySet.
   */
  type: string;

  /**
   * Properties within this PropertySet.
   */
  properties: Property[];
}
