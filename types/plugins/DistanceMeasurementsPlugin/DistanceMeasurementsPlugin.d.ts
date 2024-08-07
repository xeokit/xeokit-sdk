import { Entity, Plugin, Viewer } from "../../viewer";
import { DistanceMeasurementsControl } from "./DistanceMeasurementsControl";
import { DistanceMeasurement } from "./DistanceMeasurement";

export declare type DistanceMeasurementsPluginConfiguration = {

  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;

  /** The minimum length, in pixels, of an axis wire beyond which its label is shown. */
  labelMinAxisLength?: number;

  /** Container DOM element for markers and labels. Defaults to ````document.body````. */
  container?: HTMLElement;

  /** The default value of the DistanceMeasurements `visible` property. */
  defaultVisible?: boolean;

  /** The default value of the DistanceMeasurements `originVisible` property. */
  defaultOriginVisible?: boolean;

  /** The default value of the DistanceMeasurements `targetVisible` property. */
  defaultTargetVisible?: boolean;

  /** The default value of the DistanceMeasurements `wireVisible` property. */
  defaultWireVisible?: boolean;

  /** The default value of the DistanceMeasurements `axisVisible` property. */
  defaultAxisVisible?: boolean;

  /** The default color of the length dots, wire and label. */
  defaultColor?: string;

  /** The default value of the DistanceMeasurements `labelsOnWires` property. */
  defaultLabelsOnWires?: boolean;

  /** If set, the wires, dots and labels will have this zIndex (+1 for dots and +2 for labels). */
  zIndex?: number;
};


/**
 * Event fire by {@link DistanceMeasurementsPlugin} when mouse enters over a {@link DistanceMeasurement}.
 */
export declare type DistanceMeasurementMouseOverEvent = {

    /**
     * The plugin.
     */
    plugin: DistanceMeasurementsPlugin;

    /**
     * The measurement.
     */
    angleMeasurement: DistanceMeasurement;

    /**
     * The measurement.
     */
    measurement: DistanceMeasurement;

    /**
     * The original mouse event.
     */
    event: MouseEvent;
}

/**
 * Event fire by {@link DistanceMeasurementsPlugin} when mouse leaves a {@link DistanceMeasurement}.
 */
export declare type DistanceMeasurementMouseLeaveEvent = {

    /**
     * The plugin.
     */
    plugin: DistanceMeasurementsPlugin;

    /**
     * The measurement.
     */
    angleMeasurement: DistanceMeasurement;

    /**
     * The measurement.
     */
    measurement: DistanceMeasurement;

    /**
     * The original mouse event.
     */
    event: MouseEvent;
}

/**
 * Event fire by {@link DistanceMeasurementsPlugin} when context menu is shown on {@link DistanceMeasurement}.
 */
export declare type DistanceMeasurementMouseContextMenuEvent = {
  /**
   * The plugin.
   */
  plugin: DistanceMeasurementsPlugin;

  /**
   * The measurement.
   */
  distanceMeasurement: DistanceMeasurement;

  /**
   * The measurement.
   */
  measurement: DistanceMeasurement;

  /**
   * The original mouse event.
   */
  event: MouseEvent;
}

/**
 * {@link Viewer} plugin for measuring point-to-point distances.
 */
export declare class DistanceMeasurementsPlugin extends Plugin {

    /**
   * @constructor
   * @param {Viewer} viewer The Viewer.
   * @param {DistanceMeasurementsPluginConfiguration} [cfg]  Plugin configuration.
   */
  constructor(viewer: Viewer, cfg?: DistanceMeasurementsPluginConfiguration);
  
  /**
   * Sets the minimum length, in pixels, of an axis wire beyond which its label is shown.
   *
   * The axis wire's label is not shown when its length is less than this value.
   *
   * This is ````25```` pixels by default.
   *
   * Must not be less than ````1````.
   *
   * @type {number}
   */
  set labelMinAxisLength(arg: number);

  /**
   * Gets the minimum length, in pixels, of an axis wire beyond which its label is shown.
   * @returns {number}
   */
  get labelMinAxisLength(): number;
  
  /**
   * Gets the {@link DistanceMeasurementsControl}, which creates {@link DistanceMeasurement}s from user input.
   *
   * @type {DistanceMeasurementsControl}
   */
  get control(): DistanceMeasurementsControl;

  /**
   * Gets the existing {@link DistanceMeasurement}s, each mapped to its {@link DistanceMeasurement.id}.
   *
   * @type {{String:DistanceMeasurement}}
   */
  get measurements(): { [key:string]: DistanceMeasurement };

  /**
   * Creates a {@link DistanceMeasurement}.
   *
   * The DistanceMeasurement is then registered by {@link DistanceMeasurement.id} in {@link DistanceMeasurementsPlugin.measurements}.
   *
   * @param {Object} params {@link DistanceMeasurement} configuration.
   * @param {String} params.id Unique ID to assign to {@link DistanceMeasurement.id}. The DistanceMeasurement will be registered by this in {@link DistanceMeasurementsPlugin.measurements} and {@link Scene.components}. Must be unique among all components in the {@link Viewer}.
   * @param {Number[]} params.origin.worldPos Origin World-space 3D position.
   * @param {Entity} params.origin.entity Origin Entity.
   * @param {Number[]} params.target.worldPos Target World-space 3D position.
   * @param {Entity} params.target.entity Target Entity.
   * @param {Boolean} [params.visible=true] Whether to initially show the {@link DistanceMeasurement}.
   * @param {Boolean} [params.originVisible=true] Whether to initially show the {@link DistanceMeasurement} origin.
   * @param {Boolean} [params.targetVisible=true] Whether to initially show the {@link DistanceMeasurement} target.
   * @param {Boolean} [params.wireVisible=true] Whether to initially show the direct point-to-point wire between {@link DistanceMeasurement.origin} and {@link DistanceMeasurement.target}.
   * @param {Boolean} [params.axisVisible=true] Whether to initially show the axis-aligned wires between {@link DistanceMeasurement.origin} and {@link DistanceMeasurement.target}.
   * @param {string} [params.color] The color of the length dot, wire and label.
   * @param {Boolean} [params.labelsOnWires=true] Determines if labels will be set on wires or one below the other.
   * @returns {DistanceMeasurement} The new {@link DistanceMeasurement}.
   */
  createMeasurement(params?: {
      id: string;
      origin: {
        entity: Entity;
        worldPos: number[];
      };
      target: {
        entity: Entity;
        worldPos: number[];
      };
      visible?: boolean;
      originVisible?: boolean;
      targetVisible?: boolean;
      wireVisible?: boolean;
      axisVisible?: boolean;
      color?: string;
      labelsOnWires?: boolean;
  }): DistanceMeasurement;
  
  /**
   * Gets whether the distance measurement axis are visible.
   * @returns {Boolean}
   */
  getAxisVisible(): boolean;

  /**
   * Sets whether the distance measurement axis are visible.
   * @param {Boolean} axisVisible
   */
  setAxisVisible(axisVisible: boolean): void;

  /**
   * Destroys a {@link DistanceMeasurement}.
   *
   * @param {String} id ID of DistanceMeasurement to destroy.
   */
  destroyMeasurement(id: string): void;

  /**
   * Destroys all {@link DistanceMeasurement}s.
   */
  clear(): void;

    /**
     * Fires when mouse is over a measurement.
     * @param {String} event The mouseOver event
     * @param {Function} callback Callback fired on the event
     */
    on(event: "mouseOver", callback: (event: DistanceMeasurementMouseOverEvent)=> void): string;

    /**
     * Fires when mouse leaves a measurement.
     * @param {String} event The mouseLeave event
     * @param {Function} callback Callback fired on the event
     */
    on(event: "mouseLeave", callback: (event: DistanceMeasurementMouseLeaveEvent)=> void): string;

    /**
     * Fires when a context menu is to be opened on a measurement.
     * @param {String} event The contextMenu event
     * @param {Function} callback Callback fired on the event
     */
    on(event: "contextMenu", callback: (event: DistanceMeasurementMouseContextMenuEvent)=> void): string;

  /**
   * Fires when a measurement is created.
   * @param {String} event The measurementCreated event
   * @param {Function} callback Callback fired on the event
   */
  on(event: "measurementCreated", callback: (measurement: DistanceMeasurement)=> void): string;

    /**
     * Fires when a measurement is completed.
     * @param {String} event The measurementEnd event
     * @param {Function} callback Callback fired on the event
     */
    on(event: "measurementStart", callback: (measurement: DistanceMeasurement)=> void): string;

  /**
   * Fires when a measurement is completed.
   * @param {String} event The measurementEnd event
   * @param {Function} callback Callback fired on the event
   */
  on(event: "measurementEnd", callback: (measurement: DistanceMeasurement)=> void): string;

  /**
   * Fires when a measurement is cancelled.
   * @param {String} event The measurementCancel event
   * @param {Function} callback Callback fired on the event
   */
  on(event: "measurementCancel", callback: (measurement: DistanceMeasurement)=> void): string;

  /**
   * Fires when a measurement is destroyed.
   * @param {String} event The measurementDestroyed event
   * @param {Function} callback Callback fired on the event
   */
   on(event: "measurementDestroyed", callback: (measurement: DistanceMeasurement)=> void): string;
}
