import { Marker } from "../../viewer/scene/marker";
import { AnnotationsPlugin } from "./AnnotationsPlugin";

/**
 * A {@link Marker} with an HTML label attached to it, managed by an {@link AnnotationsPlugin}.
 */
export declare class Annotation extends Marker {
  /**
   * The {@link AnnotationsPlugin} this Annotation was created by.
   * @type {AnnotationsPlugin}
   */
  plugin: AnnotationsPlugin;

  /**
   * Optional World-space position for {@link Camera.eye}, used when this Annotation is associated with a {@link Camera} position.
   *
   * Undefined by default.
   *
   * @type {Number[]} Eye position.
   */
  eye: number[];
  
  /**
   * Optional World-space position for {@link Camera.look}, used when this Annotation is associated with a {@link Camera} position.
   *
   * Undefined by default.
   *
   * @type {Number[]} The "look" vector.
   */
  look: number[];

  /**
   * Optional World-space position for {@link Camera.up}, used when this Annotation is associated with a {@link Camera} position.
   *
   * Undefined by default.
   *
   * @type {Number[]} The "up" vector.
   */
  up: number[];

  /**
   * Optional projection type for {@link Camera.projection}, used when this Annotation is associated with a {@link Camera} position.
   *
   * Undefined by default.
   *
   * @type {String} The projection type - "perspective" or "ortho"..
   */
  projection: string;

  /**
   * Sets whether or not to show this Annotation's marker.
   *
   * The marker shows the Annotation's position.
   *
   * The marker is only visible when both this property and {@link Annotation.visible} are ````true````.
   *
   * See {@link AnnotationsPlugin} for more info.
   *
   * @param {Boolean} shown Whether to show the marker.
   */
  setMarkerShown(shown: boolean): void;

  /**
   * Gets whether or not to show this Annotation's marker.
   *
   * The marker shows the Annotation's position.
   *
   * The marker is only visible when both this property and {@link Annotation.visible} are ````true````.
   *
   * See {@link AnnotationsPlugin} for more info.
   *
   * @returns {Boolean} Whether to show the marker.
   */
  getMarkerShown(): boolean;

  /**
   * Sets whether or not to show this Annotation's label.
   *
   * The label is only visible when both this property and {@link Annotation.visible} are ````true````.
   *
   * See {@link AnnotationsPlugin} for more info.
   *
   * @param {Boolean} shown Whether to show the label.
   */
  setLabelShown(shown: boolean): void;

  /**
   * Gets whether or not to show this Annotation's label.
   *
   * The label is only visible when both this property and {@link Annotation.visible} are ````true````.
   *
   * See {@link AnnotationsPlugin} for more info.
   *
   * @returns {Boolean} Whether to show the label.
   */
  getLabelShown(): boolean;

  /**
   * Sets the value of a field within the HTML templates for either the Annotation's marker or label.
   *
   * See {@link AnnotationsPlugin} for more info.
   *
   * @param {String} key Identifies the field.
   * @param {String} value The field's value.
   */
  setField(key: string, value: string): void;

  /**
   * Gets the value of a field within the HTML templates for either the Annotation's marker or label.
   *
   * See {@link AnnotationsPlugin} for more info.
   *
   * @param {String} key Identifies the field.
   * @returns {String} The field's value.
   */
  getField(key: string): string;

  /**
   * Sets values for multiple placeholders within the Annotation's HTML templates for marker and label.
   *
   * See {@link AnnotationsPlugin} for more info.
   *
   * @param {{String:(String|Number)}} values Map of field values.
   */
  setValues(values: { [key:string] : string | number }): void;

  /**
   * Gets the values that were set for the placeholders within this Annotation's HTML marker and label templates.
   *
   * See {@link AnnotationsPlugin} for more info.
   *
   * @RETURNS {{String:(String|Number)}} Map of field values.
   */
  getValues(): { [key:string] : string | number };
}
