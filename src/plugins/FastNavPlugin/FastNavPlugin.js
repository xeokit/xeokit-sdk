import {Plugin} from "../../viewer/Plugin.js";

/**
 * {@link Viewer} plugin that makes interaction smoother with large models, by temporarily switching
 * the Viewer to faster, lower-quality rendering modes whenever we interact.
 *
 * [<img src="https://xeokit.io/img/docs/FastNavPlugin/FastNavPlugin.gif">](https://xeokit.github.io/xeokit-sdk/examples/index.html#performance_FastNavPlugin)
 *
 * FastNavPlugin works by hiding specified Viewer rendering features, and optionally scaling the Viewer's canvas
 * resolution, whenever we interact with the Viewer. Then, once we've finished interacting, FastNavPlugin restores those
 * rendering features and the original canvas scale, after a configured delay.
 *
 * Depending on how we configure FastNavPlugin, we essentially switch to a smooth-rendering low-quality view while
 * interacting, then return to the normal higher-quality view after we stop, following an optional delay.
 *
 * Down-scaling the canvas resolution gives particularly good results. For example, scaling by ````0.5```` means that
 * we're rendering a quarter of the pixels while interacting, which can make the Viewer noticeably smoother with big models.
 *
 * The screen capture above shows FastNavPlugin in action. In this example, whenever we move the Camera or resize the Canvas,
 * FastNavPlugin switches off enhanced edges and ambient shadows (SAO), and down-scales the canvas, making it slightly
 * blurry. When ````0.5```` seconds passes with no interaction, the plugin shows edges and SAO again, and restores the
 * original canvas scale.
 *
 * # Usage
 *
 * In the example below, we'll create a {@link Viewer}, add a {@link FastNavPlugin}, then use an {@link XKTLoaderPlugin} to load a model.
 *
 * Whenever we interact with the Viewer, our FastNavPlugin will:
 *
 * * hide edges,
 * * hide ambient shadows (SAO),
 * * hide physically-based materials (switching to non-PBR),
 * * hide transparent objects, and
 * * scale the canvas resolution by 0.5, causing the GPU to render 75% less pixels.
 * <br>
 *
 * We'll also configure a 0.5 second delay before we transition back to high-quality each time we stop ineracting, so that we're
 * not continually flipping between low and high quality as we interact. Since we're only rendering ambient shadows when not interacting, we'll also treat ourselves
 * to expensive, high-quality SAO settings, that we wouldn't normally configure for an interactive SAO effect.
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#performance_FastNavPlugin)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, FastNavPlugin} from "xeokit-sdk.es.js";
 *
 * // Create a Viewer with PBR and SAO enabled
 *
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true,
 *      pbr: true,                          // Enable physically-based rendering for Viewer
 *      sao: true                           // Enable ambient shadows for Viewer
 *  });
 *
 * viewer.scene.camera.eye = [-66.26, 105.84, -281.92];
 * viewer.scene.camera.look = [42.45, 49.62, -43.59];
 * viewer.scene.camera.up = [0.05, 0.95, 0.15];
 *
 * // Higher-quality SAO settings
 *
 * viewer.scene.sao.enabled = true;
 * viewer.scene.sao.numSamples = 60;
 * viewer.scene.sao.kernelRadius = 170;
 *
 * // Install a FastNavPlugin
 *
 * new FastNavPlugin(viewer, {
 *      hideEdges: true,                // Don't show edges while we interact (default is true)
 *      hideSAO: true,                  // Don't show ambient shadows while we interact (default is true)
 *      hideColorTexture: true,        // No color textures while we interact (default is true)
 *      hidePBR: true,                  // No physically-based rendering while we interact (default is true)
 *      hideTransparentObjects: true,   // Hide transparent objects while we interact (default is false)
 *      scaleCanvasResolution: true,    // Scale canvas resolution while we interact (default is false)
 *      defaultScaleCanvasResolutionFactor: 1.0, // Factor by which we scale canvas resolution when we stop interacting (default is 1.0)
 *      scaleCanvasResolutionFactor: 0.5,  // Factor by which we scale canvas resolution when we interact (default is 0.6)
 *      delayBeforeRestore: true,       // When we stop interacting, delay before restoring normal render (default is true)
 *      delayBeforeRestoreSeconds: 0.5  // The delay duration, in seconds (default is 0.5)
 * });
 *
 * // Load a BIM model from XKT
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *      id: "myModel",
 *      src: "./models/xkt/HolterTower.xkt",
 *      sao: true,                          // Enable ambient shadows for this model
 *      pbr: true                           // Enable physically-based rendering for this model
 * });
 * ````
 *
 * @class FastNavPlugin
 */
class FastNavPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg FastNavPlugin configuration.
     * @param {String} [cfg.id="FastNav"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Boolean} [cfg.hideColorTexture=true] Whether to temporarily hide color textures whenever we interact with the Viewer.
     * @param {Boolean} [cfg.hidePBR=true] Whether to temporarily hide physically-based rendering (PBR) whenever we interact with the Viewer.
     * @param {Boolean} [cfg.hideSAO=true] Whether to temporarily hide scalable ambient occlusion (SAO) whenever we interact with the Viewer.
     * @param {Boolean} [cfg.hideEdges=true] Whether to temporarily hide edges whenever we interact with the Viewer.
     * @param {Boolean} [cfg.hideTransparentObjects=false] Whether to temporarily hide transparent objects whenever we interact with the Viewer.
     * @param {Number} [cfg.scaleCanvasResolution=false] Whether to temporarily down-scale the canvas resolution whenever we interact with the Viewer.
     * @param {Number} [cfg.defaultScaleCanvasResolutionFactor=0.6] The factor by which we downscale the canvas resolution whenever we stop interacting with the Viewer.
     * @param {Number} [cfg.scaleCanvasResolutionFactor=0.6] The factor by which we downscale the canvas resolution whenever we interact with the Viewer.
     * @param {Boolean} [cfg.delayBeforeRestore=true] Whether to temporarily have a delay before restoring normal rendering after we stop interacting with the Viewer.
     * @param {Number} [cfg.delayBeforeRestoreSeconds=0.5] Delay in seconds before restoring normal rendering after we stop interacting with the Viewer.
     * @param {Function} [cfg.onMoved] Optional callback function fired during moving mode, should return the callback function that will be fired when the interaction stops.
     */
    constructor(viewer, cfg = {}) {

        super("FastNav", viewer);

        this._hideColorTexture = cfg.hideColorTexture !== false;
        this._hidePBR = cfg.hidePBR !== false;
        this._hideSAO = cfg.hideSAO !== false;
        this._hideEdges = cfg.hideEdges !== false;
        this._hideTransparentObjects = !!cfg.hideTransparentObjects;
        this._scaleCanvasResolution = !!cfg.scaleCanvasResolution;
        this._defaultScaleCanvasResolutionFactor = cfg.defaultScaleCanvasResolutionFactor;
        this._scaleCanvasResolutionFactor = cfg.scaleCanvasResolutionFactor || 0.6;
        this._delayBeforeRestore = (cfg.delayBeforeRestore !== false);
        this._delayBeforeRestoreSeconds = cfg.delayBeforeRestoreSeconds || 0.5;
        this._onMoved = cfg.onMoved;
        this._onStopped = null;

        let timer = this._delayBeforeRestoreSeconds * 1000;
        let fastMode = false;

        const switchToLowQuality = () => {
            timer = (this._delayBeforeRestoreSeconds * 1000);
            if (!fastMode) {
                viewer.scene._renderer.setColorTextureEnabled(!this._hideColorTexture);
                viewer.scene._renderer.setPBREnabled(!this._hidePBR);
                viewer.scene._renderer.setSAOEnabled(!this._hideSAO);
                viewer.scene._renderer.setTransparentEnabled(!this._hideTransparentObjects);
                viewer.scene._renderer.setEdgesEnabled(!this._hideEdges);
                this._originalCanvasResolutionScale = viewer.scene.canvas.resolutionScale;
                if (this._scaleCanvasResolution) {
                    viewer.scene.canvas.resolutionScale = this._scaleCanvasResolutionFactor;
                } else {
                    viewer.scene.canvas.resolutionScale = this._defaultScaleCanvasResolutionFactor;
                }
                if (this._onMoved) {
                    this._onStopped = this._onMoved();
                }

                fastMode = true;
            }
        };

        const switchToHighQuality = () => {
            viewer.scene.canvas.resolutionScale = this._defaultScaleCanvasResolutionFactor || this._originalCanvasResolutionScale || 1.0;
            viewer.scene._renderer.setEdgesEnabled(true);
            viewer.scene._renderer.setColorTextureEnabled(true);
            viewer.scene._renderer.setPBREnabled(true);
            viewer.scene._renderer.setSAOEnabled(true);
            viewer.scene._renderer.setTransparentEnabled(true);
            if (this._onStopped) {
                this._onStopped();
            }
            fastMode = false;
        };

        this._onCameraMatrix = viewer.scene.camera.on("matrix", switchToLowQuality);

        this._onSceneTick = viewer.scene.on("tick", (tickEvent) => {
            if (!fastMode) {
                return;
            }
            timer -= tickEvent.deltaTime;
            if ((!this._delayBeforeRestore) || timer <= 0) {
                switchToHighQuality();
            }
        });
    }

    /**
     * Gets whether to temporarily hide color textures whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @return {Boolean} ````true```` if hiding color textures.
     */
    get hideColorTexture() {
        return this._hideColorTexture;
    }

    /**
     * Sets whether to temporarily hide color textures whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @param {Boolean} hideColorTexture ````true```` to hide color textures.
     */
    set hideColorTexture(hideColorTexture) {
        this._hideColorTexture = hideColorTexture;
    }
    
    /**
     * Gets whether to temporarily hide physically-based rendering (PBR) whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @return {Boolean} ````true```` if hiding PBR.
     */
    get hidePBR() {
        return this._hidePBR;
    }

    /**
     * Sets whether to temporarily hide physically-based rendering (PBR) whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @param {Boolean} hidePBR ````true```` to hide PBR.
     */
    set hidePBR(hidePBR) {
        this._hidePBR = hidePBR;
    }

    /**
     * Gets whether to temporarily hide scalable ambient shadows (SAO) whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @return {Boolean} ````true```` if hiding SAO.
     */
    get hideSAO() {
        return this._hideSAO;
    }

    /**
     * Sets whether to temporarily hide scalable ambient shadows (SAO) whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @param {Boolean} hideSAO ````true```` to hide SAO.
     */
    set hideSAO(hideSAO) {
        this._hideSAO = hideSAO;
    }

    /**
     * Gets whether to temporarily hide edges whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @return {Boolean}  ````true```` if hiding edges.
     */
    get hideEdges() {
        return this._hideEdges;
    }

    /**
     * Sets whether to temporarily hide edges whenever we interact with the Viewer.
     *
     * Default is ````true````.
     *
     * @param {Boolean} hideEdges ````true```` to hide edges.
     */
    set hideEdges(hideEdges) {
        this._hideEdges = hideEdges;
    }

    /**
     * Gets whether to temporarily hide transparent objects whenever we interact with the Viewer.
     *
     * Does not hide X-rayed, selected, highlighted objects.
     *
     * Default is ````false````.
     *
     * @return {Boolean} ````true```` if hiding transparent objects.
     */
    get hideTransparentObjects() {
        return this._hideTransparentObjects
    }

    /**
     * Sets whether to temporarily hide transparent objects whenever we interact with the Viewer.
     *
     * Does not hide X-rayed, selected, highlighted objects.
     *
     * Default is ````false````.
     *
     * @param {Boolean} hideTransparentObjects ````true```` to hide transparent objects.
     */
    set hideTransparentObjects(hideTransparentObjects) {
        this._hideTransparentObjects = (hideTransparentObjects !== false);
    }

    /**
     * Gets whether to temporarily scale the canvas resolution whenever we interact with the Viewer.
     *
     * Default is ````false````.
     *
     * The scaling factor is configured via {@link FastNavPlugin#scaleCanvasResolutionFactor}.
     *
     * @return {Boolean} ````true```` if scaling the canvas resolution.
     */
    get scaleCanvasResolution() {
        return this._scaleCanvasResolution;
    }

    /**
     * Sets the factor to which we restore the canvas resolution scale when we stop interacting with the viewer.
     *
     * Default is ````false````.
     *
     * The scaling factor is configured via {@link FastNavPlugin#scaleCanvasResolutionFactor}.
     *
     * @param {Boolean} scaleCanvasResolution ````true```` to scale the canvas resolution.
     */
    set scaleCanvasResolution(scaleCanvasResolution) {
        this._scaleCanvasResolution = scaleCanvasResolution;
    }

    /**
     * Gets the factor to which we restore the canvas resolution scale when we stop interacting with the viewer.
     *
     * Default is ````1.0````.
     *
     * Enable canvas resolution scaling by setting {@link FastNavPlugin#scaleCanvasResolution} ````true````.
     *
     * @return {Number} Factor by scale canvas resolution when we stop interacting with the viewer.
     */
    get defaultScaleCanvasResolutionFactor() {
        return this._defaultScaleCanvasResolutionFactor;
    }

    /**
     * Sets the factor to which we restore the canvas resolution scale when we stop interacting with the viewer.
     *
     * Accepted range is ````[0.0 .. 1.0]````.
     *
     * Default is ````1.0````.
     *
     * Enable canvas resolution scaling by setting {@link FastNavPlugin#scaleCanvasResolution} ````true````.
     *
     * @param {Number} defaultScaleCanvasResolutionFactor Factor by scale canvas resolution when we stop interacting with the viewer.
     */
    set defaultScaleCanvasResolutionFactor(defaultScaleCanvasResolutionFactor) {
        this._defaultScaleCanvasResolutionFactor = defaultScaleCanvasResolutionFactor;
    }

    /**
     * Gets the factor by which we temporarily scale the canvas resolution when we interact with the viewer.
     *
     * Default is ````0.6````.
     *
     * Enable canvas resolution scaling by setting {@link FastNavPlugin#scaleCanvasResolution} ````true````.
     *
     * @return {Number} Factor by which we scale the canvas resolution.
     */
    get scaleCanvasResolutionFactor() {
        return this._scaleCanvasResolutionFactor;
    }

    /**
     * Sets the factor by which we temporarily scale the canvas resolution when we interact with the viewer.
     *
     * Accepted range is ````[0.0 .. 1.0]````.
     *
     * Default is ````0.6````.
     *
     * Enable canvas resolution scaling by setting {@link FastNavPlugin#scaleCanvasResolution} ````true````.
     *
     * @param {Number} scaleCanvasResolutionFactor Factor by which we scale the canvas resolution.
     */
    set scaleCanvasResolutionFactor(scaleCanvasResolutionFactor) {
        this._scaleCanvasResolutionFactor = scaleCanvasResolutionFactor || 0.6;
    }

    /**
     * Gets whether to have a delay before restoring normal rendering after we stop interacting with the Viewer.
     *
     * The delay duration is configured via {@link FastNavPlugin#delayBeforeRestoreSeconds}.
     *
     * Default is ````true````.
     *
     * @return {Boolean} Whether to have a delay.
     */
    get delayBeforeRestore() {
        return this._delayBeforeRestore;
    }

    /**
     * Sets whether to have a delay before restoring normal rendering after we stop interacting with the Viewer.
     *
     * The delay duration is configured via {@link FastNavPlugin#delayBeforeRestoreSeconds}.
     *
     * Default is ````true````.
     *
     * @param {Boolean} delayBeforeRestore Whether to have a delay.
     */
    set delayBeforeRestore(delayBeforeRestore) {
        this._delayBeforeRestore = delayBeforeRestore;
    }

    /**
     * Gets the delay before restoring normal rendering after we stop interacting with the Viewer.
     *
     * The delay is enabled when {@link FastNavPlugin#delayBeforeRestore} is ````true````.
     *
     * Default is ````0.5```` seconds.
     *
     * @return {Number} Delay in seconds.
     */
    get delayBeforeRestoreSeconds() {
        return this._delayBeforeRestoreSeconds;
    }

    /**
     * Sets the delay before restoring normal rendering after we stop interacting with the Viewer.
     *
     * The delay is enabled when {@link FastNavPlugin#delayBeforeRestore} is ````true````.
     *
     * Default is ````0.5```` seconds.
     *
     * @param {Number} delayBeforeRestoreSeconds Delay in seconds.
     */
    set delayBeforeRestoreSeconds(delayBeforeRestoreSeconds) {
        this._delayBeforeRestoreSeconds = delayBeforeRestoreSeconds !== null && delayBeforeRestoreSeconds !== undefined ? delayBeforeRestoreSeconds : 0.5;
    }

    /**
     * @private
     */
    send(name, value) {
        switch (name) {
            case "clear":
                break;
        }
    }

    /**
     * Destroys this plugin.
     */
    destroy() {
        this.viewer.scene.camera.off(this._onCameraMatrix);
        this.viewer.scene.canvas.off(this._onCanvasBoundary);
        this.viewer.scene.input.off(this._onSceneMouseDown);
        this.viewer.scene.input.off(this._onSceneMouseUp);
        this.viewer.scene.input.off(this._onSceneMouseMove);
        this.viewer.scene.off(this._onSceneTick);
        super.destroy();
    }
}

export {FastNavPlugin};
