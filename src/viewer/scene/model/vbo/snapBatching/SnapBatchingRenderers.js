import {SnapBatchingDepthBufInitRenderer} from "./SnapBatchingDepthBufInitRenderer.js";
import {SnapBatchingDepthRenderer} from "./SnapBatchingDepthRenderer.js";

/**
 * @private
 */
class SnapBatchingRenderers {

    constructor(scene) {
        this._scene = scene;
    }

    _compile() {
        if (this._snapDepthBufInitRenderer && (!this._snapDepthBufInitRenderer.getValid())) {
            this._snapDepthBufInitRenderer.destroy();
            this._snapDepthBufInitRenderer = null;
        }
        if (this._snapDepthRenderer && (!this._snapDepthRenderer.getValid())) {
            this._snapDepthRenderer.destroy();
            this._snapDepthRenderer = null;
        }
    }

    get snapDepthBufInitRenderer() {
        if (!this._snapDepthBufInitRenderer) {
            this._snapDepthBufInitRenderer = new SnapBatchingDepthBufInitRenderer(this._scene, false);
        }
        return this._snapDepthBufInitRenderer;
    }

    get snapDepthRenderer() {
        if (!this._snapDepthRenderer) {
            this._snapDepthRenderer = new SnapBatchingDepthRenderer(this._scene);
        }
        return this._snapDepthRenderer;
    }

    _destroy() {
        if (this._snapDepthBufInitRenderer) {
            this._snapDepthBufInitRenderer.destroy();
        }
        if (this._snapDepthRenderer) {
            this._snapDepthRenderer.destroy();
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
        batchingRenderers = new SnapBatchingRenderers(scene);
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

export {getSnapBatchingRenderers}