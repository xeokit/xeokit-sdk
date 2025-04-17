import { Plugin } from "../../viewer/Plugin";
import { Viewer } from "../../viewer/Viewer";

type OnStopped = () => void;
type OnMoved = () => OnStopped;

export declare type FastNavPluginConfiguration = {
  /** Optional ID for this plugin, so that we can find it within {@link Viewer.plugins}. */
  id?: string;
  /** Whether to temporarily hide color textures whenever we interact with the Viewer. */
  hideColorTexture?: boolean;
  /** Whether to temporarily hide physically-based rendering (PBR) whenever we interact with the Viewer. */
  hidePBR?: boolean;
  /** Whether to temporarily hide scalable ambient occlusion (SAO) whenever we interact with the Viewer. */
  hideSAO?: boolean;
  /** Whether to temporarily hide edges whenever we interact with the Viewer.*/
  hideEdges?: boolean;
  /** Whether to temporarily hide transparent objects whenever we interact with the Viewer. */
  hideTransparentObjects?: boolean;
  /** Whether to temporarily down-scale the canvas resolution whenever we interact with the Viewer. */
  scaleCanvasResolution?: boolean;
  /** The factor by which we downscale the canvas resolution whenever we interact with the Viewer. */
  scaleCanvasResolutionFactor?: number;
  /** Whether to temporarily have a delay before restoring normal rendering after we stop interacting with the Viewer. */
  delayBeforeRestore?: boolean;
  /** Delay in seconds before restoring normal rendering after we stop interacting with the Viewer. */
  delayBeforeRestoreSeconds?: number;
  /** Optional callback function fired during moving mode, should return the callback function that will be fired when the interaction stops. */
  onMoved?: OnMoved;
};

/**
 * {@link Viewer} plugin that makes interaction smoother with large models, by temporarily switching
 * the Viewer to faster, lower-quality rendering modes whenever we interact.
 *
 */
export declare class FastNavPlugin extends Plugin {
    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {FastNavPluginConfiguration} cfg FastNavPlugin configuration.
     */
    constructor(viewer: Viewer, cfg?: FastNavPluginConfiguration);

    /**
     * Sets whether to temporarily hide physically-based rendering (PBR) whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @param {Boolean} value ````true```` to hide PBR.
     */
    set hidePBR(value: boolean);

    /**
     * Gets whether to temporarily hide physically-based rendering (PBR) whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @return {Boolean} ````true```` if hiding PBR.
     */
    get hidePBR(): boolean;

    /**
     * Sets whether to temporarily hide scalable ambient shadows (SAO) whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @param {Boolean} value ````true```` to hide SAO.
     */
    set hideSAO(value: boolean);

    /**
     * Gets whether to temporarily hide scalable ambient shadows (SAO) whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @return {Boolean} ````true```` if hiding SAO.
     */
    get hideSAO(): boolean;

    /**
     * Sets whether to temporarily hide edges whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @param {Boolean} value ````true```` to hide edges.
     */
    set hideEdges(value: boolean);

    /**
     * Gets whether to temporarily hide edges whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @return {Boolean}  ````true```` if hiding edges.
     */
    get hideEdges(): boolean;

    /**
     * Sets whether to temporarily hide transparent objects whenever we interact with the Viewer.
     *
     * Does not hide X-rayed, selected, highlighted objects.
     *
     * Default is ````false````.
     *
     * @param {Boolean} value ````true```` to hide transparent objects.
     */
    set hideTransparentObjects(value: boolean);

    /**
     * Gets whether to temporarily hide transparent objects whenever we interact with the Viewer.
     *
     * Does not hide X-rayed, selected, highlighted objects.
     *
     * Default is ````false````.
     *
     * @return {Boolean} ````true```` if hiding transparent objects.
     */
    get hideTransparentObjects(): boolean;

    /**
     * Sets whether to temporarily scale the canvas resolution whenever we interact with the Viewer.
     *
     * Default is ````false````.
     *
     * The scaling factor is configured via {@link FastNavPlugin.scaleCanvasResolutionFactor}.
     *
     * @param {Boolean} scaleCanvasResolution ````true```` to scale the canvas resolution.
     */
    set scaleCanvasResolution(value: boolean);

    /**
     * Gets whether to temporarily scale the canvas resolution whenever we interact with the Viewer.
     *
     * Default is ````false````.
     *
     * The scaling factor is configured via {@link FastNavPlugin.scaleCanvasResolutionFactor}.
     *
     * @return {Boolean} ````true```` if scaling the canvas resolution.
     */
    get scaleCanvasResolution(): boolean;

    /**
     * Sets the factor by which we temporarily scale the canvas resolution when we interact with the viewer.
     *
     * Accepted range is ````[0.0 .. 1.0]````.
     *
     * Default is ````0.6````.
     *
     * Enable canvas resolution scaling by setting {@link FastNavPlugin.scaleCanvasResolution} ````true````.
     *
     * @param {Number} scaleCanvasResolutionFactor Factor by which we scale the canvas resolution.
     */
    set scaleCanvasResolutionFactor(value: number);

    /**
     * Gets the factor by which we temporarily scale the canvas resolution when we interact with the viewer.
     *
     * Default is ````0.6````.
     *
     * Enable canvas resolution scaling by setting {@link FastNavPlugin.scaleCanvasResolution} ````true````.
     *
     * @return {Number} Factor by which we scale the canvas resolution.
     */
    get scaleCanvasResolutionFactor(): number;

    /**
     * Sets whether to have a delay before restoring normal rendering after we stop interacting with the Viewer.
     *
     * The delay duration is configured via {@link FastNavPlugin.delayBeforeRestoreSeconds}.
     *
     * Default is ````true````.
     *
     * @param {Boolean} delayBeforeRestore Whether to have a delay.
     */
    set delayBeforeRestore(value: boolean);

    /**
     * Gets whether to have a delay before restoring normal rendering after we stop interacting with the Viewer.
     *
     * The delay duration is configured via {@link FastNavPlugin.delayBeforeRestoreSeconds}.
     *
     * Default is ````true````.
     *
     * @return {Boolean} Whether to have a delay.
     */
    get delayBeforeRestore(): boolean;

    /**
     * Sets the delay before restoring normal rendering after we stop interacting with the Viewer.
     *
     * The delay is enabled when {@link FastNavPlugin.delayBeforeRestore} is ````true````.
     *
     * Default is ````0.5```` seconds.
     *
     * @param {Number} delayBeforeRestoreSeconds Delay in seconds.
     */
    set delayBeforeRestoreSeconds(value: number);

    /**
     * Gets the delay before restoring normal rendering after we stop interacting with the Viewer.
     *
     * The delay is enabled when {@link FastNavPlugin.delayBeforeRestore} is ````true````.
     *
     * Default is ````0.5```` seconds.
     *
     * @return {Number} Delay in seconds.
     */
    get delayBeforeRestoreSeconds(): number;
}
