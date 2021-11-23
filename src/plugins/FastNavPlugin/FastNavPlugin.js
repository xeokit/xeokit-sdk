import {Plugin} from "../../viewer/Plugin.js";

/**
 * {@link Viewer} plugin that improves interactivity by temporarily switching to fast and simple rendering while the
 * {@link Camera} is moving or the {@link Canvas} is resizing.
 *
 * FastNavPlugin works by disabling specified rendering features, and optionally down-scaling the canvas, whenever we
 * move the Camera or resize the Canvas. Then, once the Camera or Canvas has been at rest after a certain time, FastNavPlugin
 * restores those rendering features and original canvas scale again.
 *
 * The effect we experience is a low-fidelity view while moving, then a high-fidelity view
 * once we're at rest again, after an optional delay.
 *
 * Down-scaling the canvas resolution gives particularly good results. For example, scaling by ````0.5````
 * means that we're rendering a quarter of the pixels while moving, which makes the Viewer noticeably smoother
 * with big models.
 *
 * # Usage
 *
 * In the example below, we'll create a {@link Viewer}, add a {@link FastNavPlugin}, then use an {@link XKTLoaderPlugin} to load a model.
 *
 * We'll configure our FastNavPlugin to disable edges, ambient shadows and physically-based materials when
 * the camera is moving ("dynamic"), as well as reduce the canvas resolution.
 *
 * We'll also have a 0.4 second delay before we transition to high-fidelity each time we stop
 * moving.
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#performance_FastNavPlugin)]
 *
 * ````javascript
 * import {Viewer, XKTLoaderPlugin, FastNavPlugin} from "xeokit-sdk.es.js";
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
 * new FastNavPlugin(viewer, {
 *      dynamicEdges: false,                // Don't show edges while moving
 *      dynamicSAO: false,                  // Don't show ambient shadows while moving
 *      dynamicPBR: false,                  // Non-physically-based rendering while moving
 *      dynamicTransparent: false,          // Hide transparent objects while moving
 *      dynamicCanvasResolution: true,      // Reduce canvas resolution while moving
 *      dynamicCanvasResolutionScale: 0.6,  // Factor by which we reduce canvas resolution
 *      delayBeforeStatic: true,            // When we stop, delay before returning to quality render
 *      delayBeforeStaticDuration: 0.4      // The delay duration, in seconds
 * });
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
     * @param {Boolean} [cfg.dynamicPBR=false] Whether to enable physically-based rendering (PBR) while the camera is moving.
     * @param {Boolean} [cfg.dynamicSAO=false] Whether to enable scalable ambient occlusion (SAO) while the camera is moving.
     * @param {Boolean} [cfg.dynamicEdges=false] Whether to enable enhanced edges while the camera is moving.
     * @param {Boolean} [cfg.dynamicTransparent=true] Whether to show transparent objects when the camera is moving.
     * @param {Number} [cfg.dynamicCanvasResolution=true] Whether to down-scale the canvas resolution while the camera is moving.
     * @param {Number} [cfg.dynamicCanvasResolutionScale=0.6] The factor by which we downscale the canvas resolution while the camera is moving.
     * @param {Boolean} [cfg.delayBeforeStatic=true] Once the camera stops moving, whether to have a delay before transitioning back to normal rendering.
     * @param {Number} [cfg.delayBeforeStaticDuration=0.5] Delay in seconds before transitioning back to normal rendering when camera stops moving. Only works when ````delayBeforeStatic```` is ````true````.
     */
    constructor(viewer, cfg = {}) {

        super("FastNav", viewer);

        this._dynamicPBR = !!cfg.dynamicPBR;
        this._dynamicSAO = !!cfg.dynamicSAO;
        this._dynamicEdges = !!cfg.dynamicEdges;
        this._dynamicTransparent = (cfg.dynamicTransparent !== false);
        this._dynamicCanvasResolution = (cfg.dynamicCanvasResolution !== false);
        this._dynamicCanvasResolutionScale = cfg.dynamicCanvasResolutionScale || 0.6;
        this._delayBeforeStatic = (cfg.delayBeforeStatic !== false);
        this._delayBeforeStaticDuration = cfg.delayBeforeStaticDuration || 0.5;

        let timer = this._delayBeforeStaticDuration * 1000;
        let fastMode = false;

        const goFast = () => {
            timer = (this._delayBeforeStaticDuration * 1000);
            if (!fastMode) {
                viewer.scene._renderer.setPBREnabled(this._dynamicPBR);
                viewer.scene._renderer.setSAOEnabled(this._dynamicSAO);
                viewer.scene._renderer.setTransparentEnabled(this._dynamicTransparent);
                viewer.scene._renderer.setEdgesEnabled(this._dynamicEdges);
                if (this._dynamicCanvasResolution) {
                    viewer.scene.canvas.resolutionScale = this._dynamicCanvasResolutionScale;
                } else {
                    viewer.scene.canvas.resolutionScale = 1;
                }
                fastMode = true;
            }
        };

        this._onCanvasBoundary = viewer.scene.canvas.on("boundary", goFast);
        this._onCameraMatrix = viewer.scene.camera.on("matrix", goFast);

        this._onSceneTick = viewer.scene.on("tick", (tickEvent) => {  // Milliseconds
            if (!fastMode) {
                return;
            }
            timer -= tickEvent.deltaTime;
            if ((!this._delayBeforeStatic) || timer <= 0) {
                requestAnimationFrame(() => {
                    viewer.scene.canvas.resolutionScale = 1;
                    viewer.scene._renderer.setEdgesEnabled(true);
                    viewer.scene._renderer.setPBREnabled(true);
                    viewer.scene._renderer.setSAOEnabled(true);
                    viewer.scene._renderer.setTransparentEnabled(true);
                });
                fastMode = false;
            }
        });

        let down = false;

        this._onSceneMouseDown = viewer.scene.input.on("mousedown", () => {
            down = true;
        });

        this._onSceneMouseUp = viewer.scene.input.on("mouseup", () => {
            down = false;
        });

        this._onSceneMouseMove = viewer.scene.input.on("mousemove", () => {
            if (!down) {
                return;
            }
            goFast();
        });
    }

    /**
     * Gets whether to enable physically-based rendering (PBR) while the camera is moving.
     *
     * Default is ````false````.
     *
     * @return {Boolean} Whether PBR will be enabled while the camera is moving.
     */
    get dynamicPBR() {
        return this._dynamicPBR;
    }

    /**
     * Sets whether to enable physically-based rendering (PBR) while the camera is moving.
     *
     * Default is ````false````.
     *
     * @param {Boolean} dynamicPBR Whether PBR will be enabled while the camera is moving.
     */
    set dynamicPBR(dynamicPBR) {
        this._dynamicPBR = dynamicPBR;
    }

    /**
     * Gets whether to enable Scalable Ambient Obscurrance (SAO) while the camera is moving.
     *
     * Default is ````false````.
     *
     * @return {Boolean} Whether SAO will be enabled.
     */
    get dynamicSAO() {
        return this._dynamicSAO;
    }

    /**
     * Sets whether to enable Scalable Ambient Obscurrance (SAO) while the camera is moving.
     *
     * Default is ````false````.
     *
     * @param {Boolean} dynamicSAO Whether SAO will be enabled while the camera is moving.
     */
    set dynamicSAO(dynamicSAO) {
        this._dynamicSAO = dynamicSAO;
    }

    /**
     * Gets whether to enable enhanced edges while the camera is moving.
     *
     * Default is ````false````.
     *
     * @return {Boolean} Whether edges will be enabled while the camera is moving.
     */
    get dynamicEdges() {
        return this._dynamicEdges;
    }

    /**
     * Sets whether to enable enhanced edges while the camera is moving.
     *
     * Default is ````false````.
     *
     * @param {Boolean} dynamicEdges Whether edge enhancement will be enabled while the camera is moving.
     */
    set dynamicEdges(dynamicEdges) {
        this._dynamicEdges = dynamicEdges;
    }

    /**
     * Gets whether to show transparent objects while the camera is moving.
     *
     * Default is ````true````.
     *
     * @return {Boolean} Whether to show transparent objects while the camera is moving.
     */
    get dynamicTransparent() {
        return this._dynamicTransparent
    }

    /**
     * Sets whether to show transparent objects while the camera is moving.
     *
     * Default is ````true````.
     *
     * @param {Boolean} dynamicTransparent Whether to show transparent objects while the camera is moving.
     */
    set dynamicTransparent(dynamicTransparent) {
        this._dynamicTransparent = (dynamicTransparent !== false);
    }

    /**
     * Gets whether to down-scale the canvas resolution while the camera is moving.
     *
     * Default is ````true````.
     *
     * The down-scaling factor is configured via {@link FastNavPlugin#dynamicCanvasResolutionScale}.
     *
     * @return {Boolean} Whether to down-scale the canvas resolution while the camera is moving.
     */
    get dynamicCanvasResolution() {
        return this._dynamicCanvasResolution;
    }

    /**
     * Sets whether to down-scale the canvas resolution while the camera is moving.
     *
     * Default is ````true````.
     *
     * The down-scaling factor is configured via {@link FastNavPlugin#dynamicCanvasResolutionScale}.
     *
     * @param {Boolean} dynamicCanvasResolution Whether to down-scale the canvas resolution while the camera is moving.
     */
    set dynamicCanvasResolution(dynamicCanvasResolution) {
        this._dynamicCanvasResolution = dynamicCanvasResolution;
    }

    /**
     * Gets the factor by which we downscale the canvas resolution while the camera is moving.
     *
     * This allows us to render a low-resolution image to the canvas while we're moving the camera.
     *
     * Accepted range is ````[0.0 .. 1.0]````.
     *
     * Default is ````0.6````.
     *
     * @return {Number} Factor by which we downscale the canvas resolution while the camera is moving.
     */
    get dynamicCanvasResolutionScale() {
        return this._dynamicCanvasResolutionScale;
    }

    /**
     * Sets the factor by which we downscale the canvas resolution while the camera is moving.
     *
     * This allows us to render a low-resolution image to the canvas while we're moving the camera.
     *
     * Accepted range is ````[0.0 .. 1.0]````.
     *
     * Default is ````0.6````.
     *
     * @param {Number} dynamicCanvasResolutionScale Factor by which we downscale the canvas resolution while the camera is moving.
     */
    set dynamicCanvasResolutionScale(dynamicCanvasResolutionScale) {
        this._dynamicCanvasResolutionScale = dynamicCanvasResolutionScale || 0.6;
    }

    /**
     * Gets whether to have a delay before transitioning back to normal static rendering after the camera stops moving.
     *
     * The delay duration is configured via {@link FastNavPlugin#delayBeforeStaticDuration}.
     *
     * Default is ````true````.
     *
     * @return {Boolean} Whether to have a delay.
     */
    get delayBeforeStatic() {
        return this._delayBeforeStatic;
    }

    /**
     * Sets whether to have a delay before transitioning back to normal static rendering after the camera stops moving.
     *
     * The delay duration is configured via {@link FastNavPlugin#delayBeforeStaticDuration}.
     *
     * Default is ````true````.
     *
     * @param {Boolean} delayBeforeStatic Whether to have a delay.
     */
    set delayBeforeStatic(delayBeforeStatic) {
        this._delayBeforeStatic = delayBeforeStatic;
    }

    /**
     * Gets the delay in seconds before transitioning back to normal static rendering when camera stops moving.
     *
     * The delay is enabled when {@link FastNavPlugin#delayBeforeStatic} is ````true````.
     *
     * Default is ````0.5```` seconds.
     *
     * @return {Number} Timeout duration in seconds.
     */
    get delayBeforeStaticDuration() {
        return this._delayBeforeStaticDuration;
    }

    /**
     * Sets the delay in seconds before transitioning back to normal static rendering when camera stops moving.
     *
     * The delay is enabled when {@link FastNavPlugin#delayBeforeStatic} is ````true````.
     *
     * Default is ````0.5```` seconds.
     *
     * @param {Number} delayBeforeStaticDuration Timeout duration in seconds.
     */
    set delayBeforeStaticDuration(delayBeforeStaticDuration) {
        this._delayBeforeStaticDuration = delayBeforeStaticDuration !== null && delayBeforeStaticDuration !== undefined ? delayBeforeStaticDuration : 0.5;
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
        if (this._img) {
            this._img.parentNode.removeChild(this._img);
            this._img = null;
        }
    }
}

export {FastNavPlugin};
