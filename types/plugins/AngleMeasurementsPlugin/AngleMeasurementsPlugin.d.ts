import { Entity, Plugin, Viewer } from "../../viewer";
import { AngleMeasurement } from "./AngleMeasurement";
import { AngleMeasurementsControl } from "./AngleMeasurementsControl";

export declare type AngleMeasurementsPluginConfiguration = {

  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;

  /** Container DOM element for markers and labels. Defaults to ````document.body````. */
  container?: HTMLElement;

  /** The default color of the dots, wire and label. */
  defaultColor?: string;

  /** If set, the wires, dots and labels will have this zIndex (+1 for dots and +2 for labels). */
  zIndex?: number;
};

/**
 * Event fire by {@link AngleMeasurementsPlugin} when mouse enters over an {@link AngleMeasurement}.
 */
export declare type AngleMeasurementMouseOverEvent = {

    /**
     * The plugin.
     */
    plugin: AngleMeasurementsPlugin;

    /**
     * The measurement.
     */
    angleMeasurement: AngleMeasurement;

    /**
     * The measurement.
     */
    measurement: AngleMeasurement;

    /**
     * The original mouse event.
     */
    event: MouseEvent;
}

/**
 * Event fire by {@link AngleMeasurementsPlugin} when mouse leaves an {@link AngleMeasurement}.
 */
export declare type AngleMeasurementMouseLeaveEvent = {

    /**
     * The plugin.
     */
    plugin: AngleMeasurementsPlugin;

    /**
     * The measurement.
     */
    angleMeasurement: AngleMeasurement;

    /**
     * The measurement.
     */
    measurement: AngleMeasurement;

    /**
     * The original mouse event.
     */
    event: MouseEvent;
}

/**
 * {@link Viewer} plugin for measuring angles.
 */
export declare class AngleMeasurementsPlugin extends Plugin {
  /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   * @param {AngleMeasurementsPluginConfiguration} [cfg]  Plugin configuration.
  */
  constructor(viewer: Viewer, cfg?: AngleMeasurementsPluginConfiguration);

  /**
   * Gets the {@link AngleMeasurementsControl}, which creates {@link AngleMeasurement}s from user input.
   *
   * @type {AngleMeasurementsControl}
   */
  get control(): AngleMeasurementsControl;

  /**
   * Gets the existing {@link AngleMeasurement}s, each mapped to its {@link AngleMeasurement.id}.
   *
   * @type {{String:AngleMeasurement}}
   */
  get measurements(): { [key:string]: AngleMeasurement};

  /**
   * Creates an {@link AngleMeasurement}.
   *
   * The AngleMeasurement is then registered by {@link AngleMeasurement.id} in {@link AngleMeasurementsPlugin.measurements}.
   *
   * @param {Object} params {@link AngleMeasurement} configuration.
   * @param {String} params.id Unique ID to assign to {@link AngleMeasurement.id}. The AngleMeasurement will be registered by this in {@link AngleMeasurementsPlugin.measurements} and {@link Scene.components}. Must be unique among all components in the {@link Viewer}.
   * @param {Number[]} params.origin.worldPos Origin World-space 3D position.
   * @param {Entity} params.origin.entity Origin Entity.
   * @param {Number[]} params.corner.worldPos Corner World-space 3D position.
   * @param {Entity} params.corner.entity Corner Entity.
   * @param {Number[]} params.target.worldPos Target World-space 3D position.
   * @param {Entity} params.target.entity Target Entity.
   * @param {Boolean} [params.visible=true] Whether to initially show the {@link AngleMeasurement}.
   * @returns {AngleMeasurement} The new {@link AngleMeasurement}.
   */
  createMeasurement(params?: {
      id: string;
      origin: {
        entity: Entity;
        worldPos: number[];
      },
      corner: {
        entity: Entity;
        worldPos: number[];
      },
      target: {
        entity: Entity;
        worldPos: number[];
      },
      visible?: boolean;
  }): AngleMeasurement;

  /**
   * Destroys a {@link AngleMeasurement}.
   *
   * @param {String} id ID of AngleMeasurement to destroy.
   */
  destroyMeasurement(id: string): void;
  
  /**
   * Destroys all {@link AngleMeasurement}s.
   */
  clear(): void;

    /**
     * Fires when mouse is over a measurement.
     * @param {String} event The mouseOver event
     * @param {Function} callback Callback fired on the event
     */
    on(event: "mouseOver", callback: (event: AngleMeasurementMouseOverEvent)=> void): string;

    /**
     * Fires when mouse leaves a measurement.
     * @param {String} event The mouseLeave event
     * @param {Function} callback Callback fired on the event
     */
    on(event: "mouseLeave", callback: (event: AngleMeasurementMouseLeaveEvent)=> void): string;

    /**
     * Fires when a context menu is to be opened on a measurement.
     * @param {String} event The contextMenu event
     * @param {Function} callback Callback fired on the event
     */
    on(event: "contextMenu", callback: (measurement: AngleMeasurement)=> void): string;
    
    /**
     * Fires when a measurement is completed.
     * @param {String} event The measurementEnd event
     * @param {Function} callback Callback fired on the event
     */
    on(event: "measurementStart", callback: (measurement: AngleMeasurement)=> void): string;
    
    /**
   * Fires when a measurement is created.
   * @param {String} event The measurementCreated event
   * @param {Function} callback Callback fired on the event
   */
  on(event: "measurementCreated", callback: (measurement: AngleMeasurement)=> void): void;

  /**
   * Fires when a measurement is destroyed.
   * @param {String} event The measurementDestroyed event
   * @param {Function} callback Callback fired on the event
   */
  on(event: "measurementDestroyed", callback: (measurement: AngleMeasurement)=> void): void;
}