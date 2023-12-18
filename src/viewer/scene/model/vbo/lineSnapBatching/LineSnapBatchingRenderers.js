import {LineSnapBatchingDepthBufInitRenderer} from "./SnapBatchingDepthBufInitRenderer.js";
import {LineSnapBatchingDepthRenderer} from "./SnapBatchingDepthRenderer.js";

/**
 * @private
 */
class LineSnapBatchingRenderers {

    constructor(scene) {
        this._scene = scene;
    }

    _compile() {
        if (this._snapInitRenderer && (!this._snapInitRenderer.getValid())) {
            this._snapInitRenderer.destroy();
            this._snapInitRenderer = null;
        }
        if (this._snapRenderer && (!this._snapRenderer.getValid())) {
            this._snapRenderer.destroy();
            this._snapRenderer = null;
        }
    }

    eagerCreateRenders() {

        // Pre-initialize renderers that would otherwise be lazy-initialised
        // on user interaction, such as picking or emphasis, so that there is no delay
        // when user first begins interacting with the viewer.

        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new LineSnapBatchingDepthBufInitRenderer(this._scene, false);
        }
        if (!this._snapRenderer) {
            this._snapRenderer = new LineSnapBatchingDepthRenderer(this._scene);
        }
    }

    get snapInitRenderer() {
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new LineSnapBatchingDepthBufInitRenderer(this._scene, false);
        }
        return this._snapInitRenderer;
    }

    get snapRenderer() {
        if (!this._snapRenderer) {
            this._snapRenderer = new LineSnapBatchingDepthRenderer(this._scene);
        }
        return this._snapRenderer;
    }

    _destroy() {
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
function getSnapBatchingRenderers(scene) {
    const sceneId = scene.id;
    let batchingRenderers = cachedRenderers[sceneId];
    if (!batchingRenderers) {
        batchingRenderers = new LineSnapBatchingRenderers(scene);
        cachedRenderers[sceneId] = batchingRenderers;
        batchingRenderers._compile();
        batchingRenderers.eagerCreateRenders();
        scene.on("compile", () => {
            batchingRenderers._compile();
            batchingRenderers.eagerCreateRenders();
        });
        scene.on("destroyed", () => {
            delete cachedRenderers[sceneId];
            batchingRenderers._destroy();
        });
    }
    return batchingRenderers;
}

export {getSnapBatchingRenderers}