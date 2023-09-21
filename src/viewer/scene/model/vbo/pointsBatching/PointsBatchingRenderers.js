import {PointsBatchingColorRenderer} from "./renderers/PointsBatchingColorRenderer.js";
import {PointsBatchingSilhouetteRenderer} from "./renderers/PointsBatchingSilhouetteRenderer.js";
import {PointsBatchingPickMeshRenderer} from "./renderers/PointsBatchingPickMeshRenderer.js";
import {PointsBatchingPickDepthRenderer} from "./renderers/PointsBatchingPickDepthRenderer.js";
import {PointsBatchingOcclusionRenderer} from "./renderers/PointsBatchingOcclusionRenderer.js";

/**
 * @private
 */
class PointsBatchingRenderers {

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
        if (this._pickMeshRenderer && (!this._pickMeshRenderer.getValid())) {
            this._pickMeshRenderer.destroy();
            this._pickMeshRenderer = null;
        }
        if (this._pickDepthRenderer && (!this._pickDepthRenderer.getValid())) {
            this._pickDepthRenderer.destroy();
            this._pickDepthRenderer = null;
        }
        if (this._occlusionRenderer && this._occlusionRenderer.getValid() === false) {
            this._occlusionRenderer.destroy();
            this._occlusionRenderer = null;
        }
    }

    get colorRenderer() {
        if (!this._colorRenderer) {
            this._colorRenderer = new PointsBatchingColorRenderer(this._scene);
        }
        return this._colorRenderer;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new PointsBatchingSilhouetteRenderer(this._scene);
        }
        return this._silhouetteRenderer;
    }

    get pickMeshRenderer() {
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new PointsBatchingPickMeshRenderer(this._scene);
        }
        return this._pickMeshRenderer;
    }

    get pickDepthRenderer() {
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new PointsBatchingPickDepthRenderer(this._scene);
        }
        return this._pickDepthRenderer;
    }

    get occlusionRenderer() {
        if (!this._occlusionRenderer) {
            this._occlusionRenderer = new PointsBatchingOcclusionRenderer(this._scene);
        }
        return this._occlusionRenderer;
    }

    _destroy() {
        if (this._colorRenderer) {
            this._colorRenderer.destroy();
        }
        if (this._silhouetteRenderer) {
            this._silhouetteRenderer.destroy();
        }
        if (this._pickMeshRenderer) {
            this._pickMeshRenderer.destroy();
        }
        if (this._pickDepthRenderer) {
            this._pickDepthRenderer.destroy();
        }
        if (this._occlusionRenderer) {
            this._occlusionRenderer.destroy();
        }
    }
}

const cachedRenderers = {};

/**
 * @private
 */
function getPointsBatchingRenderers(scene) {
    const sceneId = scene.id;
    let renderers = cachedRenderers[sceneId];
    if (!renderers) {
        renderers = new PointsBatchingRenderers(scene);
        cachedRenderers[sceneId] = renderers;
        renderers._compile();
        scene.on("compile", () => {
            renderers._compile();
        });
        scene.on("destroyed", () => {
            delete cachedRenderers[sceneId];
            renderers._destroy();
        });
    }
    return renderers;
}

export {getPointsBatchingRenderers};