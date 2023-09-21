/**
 * A property within a {@link PropertySet}.
 */
export declare class Property {
  /**
   * The name of this property.
   */
  name: string;

  /**
   * The type of this property.
   */
  type: number | string;

  /**
   * The value of this property.
   */
  value: any;

  /**
   * The type of this property's value.
   */
  valueType: number | string;

  /**
   * Informative text to explain the property.
   */
  description: string;
}
