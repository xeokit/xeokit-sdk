import { LocaleService } from "./localization/LocaleService";
import { Scene } from "./scene/scene/Scene";
import { MetaScene } from "./metadata/MetaScene";
import { Camera } from "./scene/camera/Camera";
import { CameraFlightAnimation } from "./scene/camera/CameraFlightAnimation";
import { CameraControl } from "./scene/CameraControl/CameraControl";
import { Plugin } from "./Plugin";

export declare type ViewerConfiguration = {
  /** Optional ID for this Viewer, defaults to the ID of {@link Viewer.scene}, which xeokit automatically generates. */
  id?: string;
  /** ID of an existing HTML canvas for the {@link Viewer.scene} - either this or canvasElement is mandatory. When both values are given, the element reference is always preferred to the ID. */
  canvasId?: string;
  /** Reference of an existing HTML canvas for the {@link Viewer.scene} - either this or canvasId is mandatory. When both values are given, the element reference is always preferred to the ID. */
  canvasElement?: HTMLCanvasElement;
  /** Optional reference to HTML element on which key events should be handled. Defaults to the HTML Document. */
  keyboardEventsElement?: HTMLElement;
  /** ID of existing HTML element to show the {@link Spinner} - internally creates a default element automatically if this is omitted. */
  spinnerElementId?: string;
  /** The number of times the {@link Viewer.scene} renders per frame. */
  passes?: number;
  /** When doing multiple passes per frame, specifies if to clear the canvas before each pass (true) or just before the first pass (false). */
  clearEachPass?: boolean;
  /** Whether or not to preserve the WebGL drawing buffer. This needs to be ````true```` for {@link Viewer.getSnapshot} to work.*/
  preserveDrawingBuffer?: boolean;
  /** Whether or not the canvas is transparent. */
  transparent?: boolean;
  /** Whether or not you want alpha composition with premultiplied alpha. Highlighting and selection works best when this is ````false````. */
  premultipliedAlpha?: boolean;
  /** When true, expects that all textures and colors are premultiplied gamma. */
  gammaInput?: boolean;
  /** Whether or not to render with pre-multiplied gama. */
  gammaOutput?: boolean;
  /** The gamma factor to use when rendering with pre-multiplied gamma. */
  gammaFactor?: number;
  /** Sets the canvas background color to use when ````transparent```` is false. */
  backgroundColor?: number[];
  /**When ````transparent```` is false, set this ````true```` to derive the canvas background color from {@link AmbientLight.color}, or ````false```` to set the canvas background to ````backgroundColor````. */
  backgroundColorFromAmbientLight?: boolean;
  /** The measurement unit type. */
  units?: "meters" | "centimeters" | "millimeters" | "yards" | "feet" | "inches";
  /** The number of Real-space units in each World-space coordinate system unit. */
  scale?: number;
  /** The Real-space 3D origin, in current measurement units, at which the World-space coordinate origin ````[0,0,0]```` sits. */
  origin?: number[];
  /** Whether to enable Scalable Ambient Obscurance (SAO) effect. See {@link SAO} for more info. */
  saoEnabled?: boolean;
  /** Whether to enable anti-aliasing. */
  antialias?: boolean;
  /** Whether writing into the depth buffer is enabled or disabled when rendering transparent objects. */
  alphaDepthMask?: boolean;
  /** Whether to enable {@link Entity.offset}. For best performance, only set this ````true```` when you need to use {@link Entity.offset}. */
  entityOffsetsEnabled?: boolean;
  /** Whether to enable full-precision accuracy when surface picking with {@link Scene#pick}. Note that when ````true````, this configuration will increase the amount of browser memory used by the Viewer. The ````pickSurfacePrecision```` option for ````Scene#pick```` only works if this is set ````true````. */
  readableGeometryEnabled?: boolean;
  /** Whether to enable logarithmic depth buffer. */
  logarithmicDepthBufferEnabled?: boolean;
  /** Whether to enable base color texture rendering. */
  colorTextureEnabled?: boolean;
  /** Whether to enable physically-based rendering. */
  pbrEnabled?: boolean;
  /** Optional locale-based translation service. */
  localeService?: LocaleService;
  /** Whether to enable data texture-based (DTX) scene representation within the Viewer. */
  dtxEnabled?: boolean;
  /** The Z value of offset for Marker's OcclusionTester. The closest the value is to 0.000 the more precise OcclusionTester will be, but at the same time the less precise it will behave for Markers that are located exactly on the Surface. */
  markerZOffset?: number;
  /** Enhances the efficiency of SectionPlane creation by proactively allocating Viewer resources for a specified quantity of SectionPlanes.*/
  numCachedSectionPlanes?: number;
};

/**
 * The 3D Viewer at the heart of the xeokit SDK.
 */
export declare class Viewer {
  /**
   * @constructor
   * @param {ViewerConfiguration} cfg Viewer configuration.
   */
  constructor(cfg: ViewerConfiguration);

  /**
   * The viewer's locale service.
   *
   * This is configured via the Viewer's constructor.
   *
   * By default, this service will be an instance of {@link LocaleService}, which will just return
   * null translations for all given strings and phrases.
   *
   * @property localeService
   * @type {LocaleService}
   * @since 2.0
   */
  localeService: LocaleService;

  /**
   * The Viewer's {@link Scene}.
   * @property scene
   * @type {Scene}
   */
  scene: Scene;

  /**
   * Metadata about the {@link Scene} and the models and objects within it.
   * @property metaScene
   * @type {MetaScene}
   * @readonly
   */
  readonly metaScene: MetaScene;

  /**
   * The Viewer's ID.
   * @property id
   *
   * @type {String|Number}
   */
  id: string | number;

  /**
   * The Viewer's {@link Camera}. This is also found on {@link Scene.camera}.
   * @property camera
   * @type {Camera}
   */
  camera: Camera;

  /**
   * The Viewer's {@link CameraFlightAnimation}, which
   * is used to fly the {@link Scene}'s {@link Camera} to given targets.
   * @property cameraFlight
   * @type {CameraFlightAnimation}
   */
  cameraFlight: CameraFlightAnimation;

  /**
   * The Viewer's {@link CameraControl}, which
   * controls the {@link Scene}'s {@link Camera} with mouse,  touch and keyboard input.
   * @property cameraControl
   * @type {CameraControl}
   */
  cameraControl: CameraControl;

  /**
   * Subscribes to an event fired at this Viewer.
   *
   * @param {String} event The event
   * @param {Function} callback Callback fired on the event
   */
  on(event: string, callback: Function): void;

  /**
   * Fires an event at this Viewer.
   *
   * @param {String} event Event name
   * @param {Object} value Event parameters
   */
  fire(event: string, value: any): void;

  /**
   * Logs a message to the JavaScript developer console, prefixed with the ID of this Viewer.
   *
   * @param {String} msg The message
   */
  log(msg: string): void;

  /**
   * Logs an error message to the JavaScript developer console, prefixed with the ID of this Viewer.
   *
   * @param {String} msg The error message
   */
  error(msg: string): void;

  /**
   * Installs a Plugin.
   *
   * @private
   */
  addPlugin(plugin: Plugin): void;

  /**
   * Enter snapshot mode.
   *
   * Switches rendering to a hidden snapshot canvas.
   *
   * Exit snapshot mode using {@link Viewer.endSnapshot}.
   */
  beginSnapshot(): void;

  /**
   * Gets a snapshot of this Viewer's {@link Scene} as a Base64-encoded image.
   *
   * #### Usage:
   *
   * ````javascript
   * const imageData = viewer.getSnapshot({
   *    width: 500,
   *    height: 500,
   *    format: "png"
   * });
   * ````
   * @param {*} [params] Capture options.
   * @param {Number} [params.width] Desired width of result in pixels - defaults to width of canvas.
   * @param {Number} [params.height] Desired height of result in pixels - defaults to height of canvas.
   * @param {String} [params.format="jpeg"] Desired format; "jpeg", "png" or "bmp".
   * @param {Boolean} [params.includeGizmos=false] When true, will include gizmos like {@link SectionPlane} in the snapshot.
   * @returns {String} String-encoded image data URI.
   */
  getSnapshot(params: { width?: number, height?: number, format?: "jpeg" | "png" | "bmp", includeGizmos?: boolean }): string;

  /**
   * Gets a snapshot of this Viewer's {@link Scene} as a Base64-encoded image which includes
   * the HTML elements created by various plugins.
   *
   * The snapshot image is composed of an image of the viewer canvas, overlaid with an image
   * of the HTML container element belonging to each installed Viewer plugin. Each container
   * element is only rendered once, so it's OK for plugins to share the same container.
   *
   * #### Usage:
   *
   * ````javascript
   * viewer.getSnapshotWithPlugins({
   *    width: 500,
   *    height: 500,
   *    format: "png"
   * }).then((imageData)=>{
   *
   * });
   * ````
   * @param {*} [params] Capture options.
   * @param {Number} [params.width] Desired width of result in pixels - defaults to width of canvas.
   * @param {Number} [params.height] Desired height of result in pixels - defaults to height of canvas.
   * @param {String} [params.format="jpeg"] Desired format; "jpeg", "png" or "bmp".
   * @param {Boolean} [params.includeGizmos=false] When true, will include gizmos like {@link SectionPlane} in the snapshot.
   * @returns {Promise} Promise which returns a string-encoded image data URI.
   */
  getSnapshotWithPlugins(params: { width?: number, height?: number, format?: "jpeg" | "png" | "bmp", includeGizmos?: boolean }): Promise<String>;

  /**
   * Exits snapshot mode.
   *
   * Switches rendering back to the main canvas.
   *
   */
  endSnapshot(): void;

  /** Destroys this Viewer.
   */
  destroy(): void;
}
