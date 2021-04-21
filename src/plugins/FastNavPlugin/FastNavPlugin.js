import {Plugin} from "../../viewer/Plugin.js";

/**
 * {@link Viewer} plugin that improves interactivity by disabling expensive rendering effects while the {@link Camera} is moving.
 *
 * # Usage
 *
 * In the example below, we'll create a {@link Viewer}, add a {@link FastNavPlugin}, then use an {@link XKTLoaderPlugin} to load a model.
 *
 * This viewer will only render the model with enhanced edges, physically-based rendering (PBR) and scalable
 * ambient obscurance (SAO) when the camera is not moving.
 *
 * Note how we enable SAO and PBR on the ````Scene```` and the model.
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#performance_FastNavPlugin)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {XKTLoaderPlugin} from "../src/plugins/XKTLoaderPlugin/XKTLoaderPlugin.js";
 * import {FastNavPlugin} from "../src/plugins/FastNavPlugin/FastNavPlugin.js";
 *
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true,
 *      pbrEnabled: true,
 *      saoEnabled: true
 *  });
 *
 * viewer.scene.camera.eye = [-66.26, 105.84, -281.92];
 * viewer.scene.camera.look = [42.45, 49.62, -43.59];
 * viewer.scene.camera.up = [0.05, 0.95, 0.15];
 *
 * new FastNavPlugin(viewer, {
 *     pbrEnabled: true,
 *     saoEnabled: true,
 *     edgesEnabled: true
 * });
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *      id: "myModel",
 *      src: "./models/xkt/HolterTower/HolterTower.xkt",
 *      metaModelSrc: "./metaModels/HolterTower/HolterTower.json",
 *      edges: true,
 *      saoEnabled: true,
 *      pbrEnabled: true
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
     * @param {Boolean} [cfg.pbrEnabled] Whether to enable physically-based rendering (PBR) when the camera stops moving. When not specified, PBR will be enabled if it's currently enabled for the Viewer (see {@link Viewer#pbrEnabled}).
     * @param {Boolean} [cfg.saoEnabled] Whether to enable scalable ambient occlusion (SAO) when the camera stops moving. When not specified, SAO will be enabled if it's currently enabled for the Viewer (see {@link Scene#pbrEnabled}).
     * @param {Boolean} [cfg.edgesEnabled] Whether to show enhanced edges when the camera stops moving. When not specified, edges will be enabled if they're currently enabled for the Viewer (see {@link EdgeMaterial#edges}).
     */
    constructor(viewer, cfg) {

        super("FastNav", viewer);

        this._pbrEnabled = (cfg.pbrEnabled !== undefined && cfg.pbrEnabled !== null) ? cfg.pbrEnabled : viewer.scene.pbrEnabled;
        this._saoEnabled = (cfg.saoEnabled !== undefined && cfg.saoEnabled !== null) ? cfg.saoEnabled : viewer.scene.sao.enabled;
        this._edgesEnabled = (cfg.edgesEnabled !== undefined && cfg.edgesEnabled !== null) ? cfg.edgesEnabled : viewer.scene.edgeMaterial.edges;

        this._pInterval = null;
        this._fadeMillisecs = 500;

        let timeoutDuration = 600; // Milliseconds
        let timer = timeoutDuration;
        let fastMode = false;

        this._onCameraMatrix = viewer.scene.camera.on("matrix", () => {
            timer = timeoutDuration;
            if (!fastMode) {
                this._cancelFade();
                viewer.scene.pbrEnabled = false;
                viewer.scene.sao.enabled = false;
                viewer.scene.edgeMaterial.edges = false;
                fastMode = true;
            }
        });

        this._onSceneTick = viewer.scene.on("tick", (tickEvent) => {  // Milliseconds
            if (!fastMode) {
                return;
            }
            timer -= tickEvent.deltaTime;
            if (timer <= 0) {
                if (fastMode) {
                    this._startFade();
                    viewer.scene.pbrEnabled = this._pbrEnabled;
                    viewer.scene.sao.enabled = this._saoEnabled;
                    viewer.scene.edgeMaterial.edges = this._edgesEnabled;
                    fastMode = false;
                }
            }
        });

        this._onSceneObjectVisibility = viewer.scene.on("objectVisibility", () => {
            timer = timeoutDuration;
            if (!fastMode) {
                this._cancelFade();
                viewer.scene.pbrEnabled = false;
                viewer.scene.sao.enabled = false;
                viewer.scene.edgeMaterial.edges = false;
                fastMode = true;
            }
        });

        let down = false;

        this._onSceneMouseDown = viewer.scene.input.on("mousedown", () => {
            timer = timeoutDuration;
            if (!fastMode) {
                this._cancelFade();
                viewer.scene.pbrEnabled = false;
                viewer.scene.sao.enabled = false;
                viewer.scene.edgeMaterial.edges = false;
                fastMode = true;
            }
            down = true;
        });

        this._onSceneMouseUp = viewer.scene.input.on("mouseup", () => {
            down = false;
        });

        this._onSceneMouseMove = viewer.scene.input.on("mousemove", () => {
            if (!down) {
                return;
            }
            timer = timeoutDuration;
            if (!fastMode) {
                this._cancelFade();
                viewer.scene.pbrEnabled = false;
                viewer.scene.sao.enabled = false;
                viewer.scene.edgeMaterial.edges = false;
                fastMode = true;
            }
        });
    }

    _startFade() {

        if (!this._img) {
            this._initFade();
        }

        const interval = 50;
        const inc = 1 / (this._fadeMillisecs / interval);

        if (this._pInterval) {
            clearInterval(this._pInterval);
            this._pInterval = null;
        }

        const canvas = this.viewer.scene.canvas.canvas;
        const canvasOffset = cumulativeOffset(canvas);
        //const zIndex = (parseInt(canvas.style["z-index"]) || 0) + 1;

        this._img.style.position = "absolute";
        this._img.style["z-index"] = 5;
        this._img.style["background"] = canvas.style.background;
        this._img.style.left = canvasOffset.left + "px";
        this._img.style.top = canvasOffset.top + "px";
        this._img.style.width = canvas.width + "px";
        this._img.style.height = canvas.height + "px";
        this._img.style.opacity = 1;
        this._img.width = canvas.width;
        this._img.height = canvas.height;
        this._img.src = this.viewer.getSnapshot({
            format: "png",
            includeGizmos: true
        });
        this._img.style.visibility = "visible";

        let opacity = 1;
        this._pInterval = setInterval(() => {
            opacity -= inc;
            if (opacity > 0) {
                this._img.style.opacity = opacity;
            } else {
                this._img.style.opacity = 0;
                this._img.style.visibility = "hidden";
                clearInterval(this._pInterval);
                this._pInterval = null;
            }
        }, interval);
    }

    _initFade() {
        this._img = document.createElement('img');
        const canvas = this.viewer.scene.canvas.canvas;
        const canvasOffset = cumulativeOffset(canvas);
        const zIndex = (parseInt(canvas.style["z-index"]) || 0) + 1;
        this._img.style.position = "absolute";
        this._img.style.visibility = "hidden";
        this._img.style["pointer-events"] = "none";
        this._img.style["z-index"] = 5;
        this._img.style.left = canvasOffset.left + "px";
        this._img.style.top = canvasOffset.top + "px";
        this._img.style.width = canvas.width + "px";
        this._img.style.height = canvas.height + "px";
        this._img.style.opacity = 1;
        this._img.width = canvas.width;
        this._img.height = canvas.height;
        this._img.left = canvasOffset.left;
        this._img.top = canvasOffset.top;
        canvas.parentNode.insertBefore(this._img, canvas.nextSibling);
    }

    _cancelFade() {
        if (!this._img) {
            return;
        }
        if (this._pInterval) {
            clearInterval(this._pInterval);
            this._pInterval = null;
        }
        this._img.style.opacity = 0;
        this._img.style.visibility = "hidden";
    }

    /**
     * @private
     */
    send(name, value) {
        switch (name) {
            case "clear":
                this._cancelFade();
                break;
        }
    }

    /**
     * Destroys this plugin.
     */
    destroy() {
        this._cancelFade();
        this.viewer.scene.camera.off(this._onCameraMatrix);
        this.viewer.scene.off(this._onSceneTick);
        this.viewer.scene.off(this._onSceneObjectVisibility);
        this.viewer.scene.input.off(this._onSceneMouseDown);
        this.viewer.scene.input.off(this._onSceneMouseUp);
        this.viewer.scene.input.off(this._onSceneMouseMove);
        super.destroy();
        this._img.parentNode.removeChild(this._img);
        this._img = null;
    }
}

function cumulativeOffset(element) {
    let top = 0, left = 0;
    do {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
    } while (element);

    return {
        top: top,
        left: left
    };
}

export {FastNavPlugin}
