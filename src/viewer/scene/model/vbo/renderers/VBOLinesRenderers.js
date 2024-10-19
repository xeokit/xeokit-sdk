import {VBOLinesColorRenderer} from "./VBOLinesColorRenderer.js";
import {VBOLinesSilhouetteRenderer} from "./VBOLinesSilhouetteRenderer.js";
import {VBOLinesSnapRenderer} from "./VBOLinesSnapRenderer.js";

/**
 * @private
 */
class VBOLinesRenderers {

    constructor(scene, instancing) {
        this._scene = scene;
        this._instancing = instancing;
    }

    _compile() {
        if (this._colorRenderer && (!this._colorRenderer.getValid())) {
            this._colorRenderer.destroy();
            this._colorRenderer = null;
        }
        if (this._silhouetteRenderer && (!this._silhouetteRenderer.getValid())) {
            this._silhouetteRenderer.destroy();
            this._silhouetteRenderer = null;
        }
        if (this._snapInitRenderer && (!this._snapInitRenderer.getValid())) {
            this._snapInitRenderer.destroy();
            this._snapInitRenderer = null;
        }
        if (this._snapRenderer && (!this._snapRenderer.getValid())) {
            this._snapRenderer.destroy();
            this._snapRenderer = null;
        }
    }

    get colorRenderer() {
        if (!this._colorRenderer) {
            this._colorRenderer = new VBOLinesColorRenderer(this._scene, this._instancing);
        }
        return this._colorRenderer;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new VBOLinesSilhouetteRenderer(this._scene, this._instancing);
        }
        return this._silhouetteRenderer;
    }

    get snapInitRenderer() {
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new VBOLinesSnapRenderer(this._scene, this._instancing, true);
        }
        return this._snapInitRenderer;
    }

    get snapRenderer() {
        if (!this._snapRenderer) {
            this._snapRenderer = new VBOLinesSnapRenderer(this._scene, this._instancing, false);
        }
        return this._snapRenderer;
    }

    _destroy() {
        if (this._colorRenderer) {
            this._colorRenderer.destroy();
        }
        if (this._silhouetteRenderer) {
            this._silhouetteRenderer.destroy();
        }
        if (this._snapInitRenderer) {
            this._snapInitRenderer.destroy();
        }
        if (this._snapRenderer) {
            this._snapRenderer.destroy();
        }
    }
}

const cachedRenderers = { batching: { }, instancing: { } };

/**
 * @private
 */
export function getLinesRenderers(scene, instancing) {
    const sceneId = scene.id;
    const cache = cachedRenderers[instancing ? "instancing" : "batching"];
    if (! (sceneId in cache)) {
        const renderers = new VBOLinesRenderers(scene, instancing);
        cache[sceneId] = renderers;
        renderers._compile();
        scene.on("compile", () => {
            renderers._compile();
        });
        scene.on("destroyed", () => {
            delete cache[sceneId];
            renderers._destroy();
        });
    }
    return cache[sceneId];
}
