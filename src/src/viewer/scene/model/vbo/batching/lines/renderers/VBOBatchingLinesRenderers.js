import {VBOBatchingLinesColorRenderer} from "./VBOBatchingLinesColorRenderer.js";
import {VBOBatchingLinesSilhouetteRenderer} from "./VBOBatchingLinesSilhouetteRenderer.js";
import {VBOBatchingLinesSnapInitRenderer} from "./VBOBatchingLinesSnapInitRenderer.js";
import {VBOBatchingLinesSnapRenderer} from "./VBOBatchingLinesSnapRenderer.js";

/**
 * @private
 */
class VBOBatchingLinesRenderers {

    constructor(scene) {
        this._scene = scene;
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
            this._colorRenderer = new VBOBatchingLinesColorRenderer(this._scene, false);
        }
        return this._colorRenderer;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new VBOBatchingLinesSilhouetteRenderer(this._scene);
        }
        return this._silhouetteRenderer;
    }

    get snapInitRenderer() {
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new VBOBatchingLinesSnapInitRenderer(this._scene, false);
        }
        return this._snapInitRenderer;
    }

    get snapRenderer() {
        if (!this._snapRenderer) {
            this._snapRenderer = new VBOBatchingLinesSnapRenderer(this._scene);
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

const cachedRenderers = {};

/**
 * @private
 */
export function getRenderers(scene) {
    const sceneId = scene.id;
    let batchingRenderers = cachedRenderers[sceneId];
    if (!batchingRenderers) {
        batchingRenderers = new VBOBatchingLinesRenderers(scene);
        cachedRenderers[sceneId] = batchingRenderers;
        batchingRenderers._compile();
        scene.on("compile", () => {
            batchingRenderers._compile();
        });
        scene.on("destroyed", () => {
            delete cachedRenderers[sceneId];
            batchingRenderers._destroy();
        });
    }
    return batchingRenderers;
}
