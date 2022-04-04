import { PickResult } from "../../viewer/scene/webgl/PickResult";
import { Entity, Plugin, Viewer } from "../../viewer";
import { Annotation } from "./Annotation";

export declare type AnnotationsPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** HTML text template for Annotation markers. Defaults to ````<div></div>````. Ignored on {@link Annotation}s configured with a ````markerElementId````. */
  markerHTML?: string;
  /** HTML text template for Annotation labels. Defaults to ````<div></div>````.  Ignored on {@link Annotation}s configured with a ````labelElementId````. */
  labelHTML?: string;
  /** Container DOM element for markers and labels. Defaults to ````document.body````. */
  container?: HTMLElement;
  /** Map of default values to insert into the HTML templates for the marker and label. */
  values?: { [key: string]: string | number };
  /** The amount by which each {@link Annotation} is offset from the surface of its {@link Entity} when we create the Annotation by supplying a {@link PickResult} to {@link AnnotationsPlugin.createAnnotation}.*/
  surfaceOffset?: number;
};

/**
 * {@link Viewer} plugin that creates {@link Annotation}s.
 */
export declare class AnnotationsPlugin extends Plugin {
  /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   * @param {AnnotationsPluginConfiguration} cfg  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg: AnnotationsPluginConfiguration);

  /**
   * The {@link Annotation}s created by {@link AnnotationsPlugin.createAnnotation}, each mapped to its {@link Annotation.id}.
   * @type {{String:Annotation}}
   */
  annotations: { [key:string]: Annotation };

  /**
   * Sets the amount by which each {@link Annotation} is offset from the surface of its {@link Entity}, when we
   * create the Annotation by supplying a {@link PickResult} to {@link AnnotationsPlugin.createAnnotation}.
   *
   * See the class comments for more info.
   *
   * This is ````0.3```` by default.
   *
   * @param {Number} surfaceOffset The surface offset.
   */
  set surfaceOffset(arg: number);
  
  /**
   * Gets the amount by which an {@link Annotation} is offset from the surface of its {@link Entity} when
   * created by {@link AnnotationsPlugin.createAnnotation}, when we
   * create the Annotation by supplying a {@link PickResult} to {@link AnnotationsPlugin.createAnnotation}.
   *
   * This is ````0.3```` by default.
   *
   * @returns {Number} The surface offset.
   */
  get surfaceOffset(): number;

  /**
   * Creates an {@link Annotation}.
   *
   * The Annotation is then registered by {@link Annotation.id} in {@link AnnotationsPlugin.annotations}.
   *
   * @param {Object} params Annotation configuration.
   * @param {String} params.id Unique ID to assign to {@link Annotation.id}. The Annotation will be registered by this in {@link AnnotationsPlugin.annotations} and {@link Scene.components}. Must be unique among all components in the {@link Viewer}.
   * @param {String} [params.markerElementId] ID of pre-existing DOM element to render the marker. This overrides ````markerHTML```` and does not support ````values```` (data is baked into the label DOM element).
   * @param {String} [params.labelElementId] ID of pre-existing DOM element to render the label. This overrides ````labelHTML```` and does not support ````values```` (data is baked into the label DOM element).
   * @param {String} [params.markerHTML] HTML text template for the Annotation marker. Defaults to the marker HTML given to the AnnotationsPlugin constructor. Ignored if you provide ````markerElementId````.
   * @param {String} [params.labelHTML] HTML text template for the Annotation label. Defaults to the label HTML given to the AnnotationsPlugin constructor. Ignored if you provide ````labelElementId````.
   * @param {Number[]} [params.worldPos=[0,0,0]] World-space position of the Annotation marker, assigned to {@link Annotation.worldPos}.
   * @param {Entity} [params.entity] Optional {@link Entity} to associate the Annotation with. Causes {@link Annotation.visible} to be ````false```` whenever {@link Entity.visible} is also ````false````.
   * @param {PickResult} [params.pickResult] Sets the Annotation's World-space position and direction vector from the given {@link PickResult}'s {@link PickResult.worldPos} and {@link PickResult.worldNormal}, and the Annotation's Entity from {@link PickResult.entity}. Causes ````worldPos```` and ````entity```` parameters to be ignored, if they are also given.
   * @param {Boolean} [params.occludable=false] Indicates whether or not the {@link Annotation} marker and label are hidden whenever the marker occluded by {@link Entity}s in the {@link Scene}. The
   * {@link Scene} periodically occlusion-tests all Annotations on every 20th "tick" (which represents a rendered frame). We can adjust that frequency via property {@link Scene.ticksPerOcclusionTest}.
   * @param  {{String:(String|Number)}} [params.values={}] Map of values to insert into the HTML templates for the marker and label. These will be inserted in addition to any values given to the AnnotationsPlugin constructor.
   * @param {Boolean} [params.markerShown=true] Whether to initially show the {@link Annotation} marker.
   * @param {Boolean} [params.labelShown=false] Whether to initially show the {@link Annotation} label.
   * @param {Number[]} [params.eye] Optional World-space position for {@link Camera.eye}, used when this Annotation is associated with a {@link Camera} position.
   * @param {Number[]} [params.look] Optional World-space position for {@link Camera.look}, used when this Annotation is associated with a {@link Camera} position.
   * @param {Number[]} [params.up] Optional World-space position for {@link Camera.up}, used when this Annotation is associated with a {@link Camera} position.
   * @param {String} [params.projection] Optional projection type for {@link Camera.projection}, used when this Annotation is associated with a {@link Camera} position.
   * @returns {Annotation} The new {@link Annotation}.
   */
  createAnnotation(params: {
      id: string;
      markerElementId?: string;
      labelElementId?: string;
      markerHTML?: string;
      labelHTML?: string;
      worldPos?: number[];
      entity?: Entity;
      pickResult?: PickResult;
      occludable?: boolean;
      values?: { [key: string]: string | number };
      markerShown?: boolean;
      labelShown?: boolean;
      eye?: number[];
      look?: number[];
      up?: number[];
      projection?: string;
  }): Annotation;
  
  /**
   * Destroys an {@link Annotation}.
   *
   * @param {String} id ID of Annotation to destroy.
   */
  destroyAnnotation(id: string): void;

  /**
   * Destroys all {@link Annotation}s.
   */
  clear(): void;

  /**
   * Fires when a annotation is created.
   * @param {String} event The annotationCreated event
   * @param {Function} callback Callback fired on the event
   */
  on(event: "annotationCreated", callback: (annotationId: string)=> void): void;

  /**
   * Fires when a annotation is destroyed.
   * @param {String} event The annotationDestroyed event
   * @param {Function} callback Callback fired on the event
   */
  on(event: "annotationDestroyed", callback: (annotationId: string)=> void): void;

  /**
   * Fires when a mouse enters a annotation.
   * @param {String} event The markerMouseEnter event
   * @param {Function} callback Callback fired on the event
   */
   on(event: "markerMouseEnter", callback: (annotation: Annotation)=> void): void;

  /**
   * Fires when a mouse leave an annotation.
   * @param {String} event The markerMouseLeave event
   * @param {Function} callback Callback fired on the event
   */
  on(event: "markerMouseLeave", callback: (annotation: Annotation)=> void): void;

  /**
   * Fires when a mouse leave an annotation.
   * @param {String} event The markerClicked event
   * @param {Function} callback Callback fired on the event
   */
  on(event: "markerClicked", callback: (annotation: Annotation)=> void): void;
}
