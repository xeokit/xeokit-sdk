import {VBOBatchingPointsColorRenderer} from "./VBOBatchingPointsColorRenderer.js";
import {VBOBatchingPointsSilhouetteRenderer} from "./VBOBatchingPointsSilhouetteRenderer.js";
import {VBOBatchingPointsPickMeshRenderer} from "./VBOBatchingPointsPickMeshRenderer.js";
import {VBOBatchingPointsPickDepthRenderer} from "./VBOBatchingPointsPickDepthRenderer.js";
import {VBOBatchingPointsOcclusionRenderer} from "./VBOBatchingPointsOcclusionRenderer.js";
import {VBOBatchingPointsSnapInitRenderer} from "./VBOBatchingPointsSnapInitRenderer.js";
import {VBOBatchingPointsSnapRenderer} from "./VBOBatchingPointsSnapRenderer.js";

/**
 * @private
 */
class VBOBatchingPointsRenderers {

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
            this._colorRenderer = new VBOBatchingPointsColorRenderer(this._scene);
        }
        return this._colorRenderer;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new VBOBatchingPointsSilhouetteRenderer(this._scene);
        }
        return this._silhouetteRenderer;
    }

    get pickMeshRenderer() {
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new VBOBatchingPointsPickMeshRenderer(this._scene);
        }
        return this._pickMeshRenderer;
    }

    get pickDepthRenderer() {
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new VBOBatchingPointsPickDepthRenderer(this._scene);
        }
        return this._pickDepthRenderer;
    }

    get occlusionRenderer() {
        if (!this._occlusionRenderer) {
            this._occlusionRenderer = new VBOBatchingPointsOcclusionRenderer(this._scene);
        }
        return this._occlusionRenderer;
    }

    get snapInitRenderer() {
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new VBOBatchingPointsSnapInitRenderer(this._scene, false);
        }
        return this._snapInitRenderer;
    }

    get snapRenderer() {
        if (!this._snapRenderer) {
            this._snapRenderer = new VBOBatchingPointsSnapRenderer(this._scene);
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
        if (this._pickMeshRenderer) {
            this._pickMeshRenderer.destroy();
        }
        if (this._pickDepthRenderer) {
            this._pickDepthRenderer.destroy();
        }
        if (this._occlusionRenderer) {
            this._occlusionRenderer.destroy();
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
    let renderers = cachedRenderers[sceneId];
    if (!renderers) {
        renderers = new VBOBatchingPointsRenderers(scene);
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
