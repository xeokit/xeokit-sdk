import { Plugin } from "../../viewer/Plugin";
import { Viewer } from "../../viewer/Viewer";

export declare type NavCubePluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** ID of an existing HTML canvas to display the NavCube - either this or canvasElement is mandatory. When both values are given, the element reference is always preferred to the ID. */
  canvasId?: string;
  /** Reference of an existing HTML canvas to display the NavCube - either this or canvasId is mandatory. When both values are given, the element reference is always preferred to the ID. */
  canvasElement?: HTMLCanvasElement;
  /** Initial visibility. */
  visible?: boolean;
  /** Whether the shadow of the cube is visible. */
  shadowVisible?: boolean;
  /** Whether the {@link Camera} flies or jumps to each selected axis or diagonal. */
  cameraFly?: boolean;
  /** How much of the field-of-view, in degrees, that the 3D scene should fill the {@link Canvas} when the {@link Camera} moves to an axis or diagonal. */
  cameraFitFOV?: number;
  /** When flying the {@link Camera} to each new axis or diagonal, how long, in seconds, that the Camera takes to get there. */
  cameraFlyDuration?: number;
  /** Custom uniform color for the faces of the NavCube. */
  color?: string;
  /** Custom color for the front face of the NavCube. Overrides ````color````. */
  frontColor?: string;
  /** Custom color for the back face of the NavCube. Overrides ````color````. */
  backColor?: string;
  /** Custom color for the left face of the NavCube. Overrides ````color````. */
  leftColor?: string;
  /** Custom color for the right face of the NavCube. Overrides ````color````. */
  rightColor?: string;
  /** Custom color for the top face of the NavCube. Overrides ````color````. */
  topColor?: string;
  /** Custom color for the bottom face of the NavCube. Overrides ````color````. */
  bottomColor?: string;
  /** Custom color for highlighting regions on the NavCube as we hover the pointer over them. */
  hoverColor?: string;
  /** Custom text color for labels of the NavCube. */
  textColor?: string;
  /** Sets whether the axis, corner and edge-aligned views will fit the view to the entire {@link Scene} or just to visible object-{@link Entity}s. Entitys are visible objects when {@link Entity.isObject} and {@link Entity.visible} are both ````true````. */
  fitVisible?: boolean;
  /** Sets whether the NavCube switches between perspective and orthographic projections in synchrony with the {@link Camera}. When ````false````, the NavCube will always be rendered with perspective projection. */
  synchProjection?: boolean;
};

/**
 * {@link Viewer} plugin that lets us look at the entire {@link Scene} from along a chosen axis or diagonal.
 *
 */
export declare class NavCubePlugin extends Plugin {
    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {NavCubePluginConfiguration} cfg NavCubePlugin configuration.
     */
    constructor(viewer: Viewer, cfg?: NavCubePluginConfiguration);

    /**
     * Sets if the NavCube is visible.
     *
     * @param {Boolean} value Whether or not the NavCube is visible.
     */
    setVisible(value?: boolean): void;

    /**
     * Gets if the NavCube is visible.
     *
     * @return {Boolean} True when the NavCube is visible.
     */
    getVisible(): boolean;

    /**
     * Sets whether the axis, corner and edge-aligned views will fit the
     * view to the entire {@link Scene} or just to visible object-{@link Entity}s.
     *
     * Entitys are visible objects when {@link Entity.isObject} and {@link Entity.visible} are both ````true````.
     *
     * @param {Boolean} value Set ````true```` to fit only visible object-Entitys.
     */
    setFitVisible(value: boolean): void;

    /**
     * Gets whether the axis, corner and edge-aligned views will fit the
     * view to the entire {@link Scene} or just to visible object-{@link Entity}s.
     *
     * Entitys are visible objects when {@link Entity.isObject} and {@link Entity.visible} are both ````true````.
     *
     * @return {Boolean} True when fitting only visible object-Entitys.
     */
    getFitVisible(): boolean;

    /**
     * Sets whether the {@link Camera} flies or jumps to each selected axis or diagonal.
     *
     * Default is ````true````, to fly.
     *
     * @param {Boolean} value Set ````true```` to fly, else ````false```` to jump.
     */
    setCameraFly(value: boolean): void;

    /**
     * Gets whether the {@link Camera} flies or jumps to each selected axis or diagonal.
     *
     * Default is ````true````, to fly.
     *
     * @returns {Boolean} Returns ````true```` to fly, else ````false```` to jump.
     */
    getCameraFly(): boolean;

    /**
     * Sets how much of the field-of-view, in degrees, that the {@link Scene} should
     * fill the canvas when flying or jumping the {@link Camera} to each selected axis or diagonal.
     *
     * Default value is ````45````.
     *
     * @param {Number} value New FOV value.
     */
    setCameraFitFOV(value: number): void;

    /**
     * Gets how much of the field-of-view, in degrees, that the {@link Scene} should
     * fill the canvas when flying or jumping the {@link Camera} to each selected axis or diagonal.
     *
     * Default value is ````45````.
     *
     * @returns {Number} Current FOV value.
     */
    getCameraFitFOV(): number;

    /**
     * When flying the {@link Camera} to each new axis or diagonal, sets how long, in seconds, that the Camera takes to get there.
     *
     * Default is ````0.5````.
     *
     * @param {Number} value Camera flight duration in seconds.
     */
    setCameraFlyDuration(value: number): void;

    /**
     * When flying the {@link Camera} to each new axis or diagonal, gets how long, in seconds, that the Camera takes to get there.
     *
     * Default is ````0.5````.
     *
     * @returns {Number} Camera flight duration in seconds.
     */
    getCameraFlyDuration(): number;

    /**
     * Sets whether the NavCube switches between perspective and orthographic projections in synchrony with
     * the {@link Camera}. When ````false````, the NavCube will always be rendered with perspective projection.
     *
     * @param {Boolean} value Set ````true```` to keep NavCube projection synchronized with {@link Camera.projection}.
     */
    setSynchProjection(value: boolean): void;

    /**
     * Gets whether the NavCube switches between perspective and orthographic projections in synchrony with
     * the {@link Camera}. When ````false````, the NavCube will always be rendered with perspective projection.
     *
     * @return {Boolean} True when NavCube projection is synchronized with {@link Camera.projection}.
     */
    getSynchProjection(): boolean;
}