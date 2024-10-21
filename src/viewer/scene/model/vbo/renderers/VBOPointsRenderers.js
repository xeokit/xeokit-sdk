import {VBOPointsColorRenderer} from "./VBOPointsColorRenderer.js";
import {VBOPointsOcclusionRenderer} from "./VBOPointsOcclusionRenderer.js";
import {VBOPointsPickDepthRenderer} from "./VBOPointsPickDepthRenderer.js";
import {VBOPointsPickMeshRenderer} from "./VBOPointsPickMeshRenderer.js";
import {VBOPointsShadowRenderer} from "./VBOPointsShadowRenderer.js";
import {VBOPointsSilhouetteRenderer} from "./VBOPointsSilhouetteRenderer.js";
import {VBOPointsSnapRenderer} from "./VBOPointsSnapRenderer.js";

/**
 * @private
 */
class VBOPointsRenderers {

    constructor(scene, instancing) {
        this._scene = scene;
        this._instancing = instancing;
    }

    _compile() {
        if (this._colorRenderer && (!this._colorRenderer.getValid())) {
            this._colorRenderer.destroy();
            this._colorRenderer = null;
        }
        if (this._occlusionRenderer && (!this._occlusionRenderer.getValid())) {
            this._occlusionRenderer.destroy();
            this._occlusionRenderer = null;
        }
        if (this._pickDepthRenderer && (!this._pickDepthRenderer.getValid())) {
            this._pickDepthRenderer.destroy();
            this._pickDepthRenderer = null;
        }
        if (this._pickMeshRenderer && (!this._pickMeshRenderer.getValid())) {
            this._pickMeshRenderer.destroy();
            this._pickMeshRenderer = null;
        }
        if (this._shadowRenderer && (!this._shadowRenderer.getValid())) {
            this._shadowRenderer.destroy();
            this._shadowRenderer = null;
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
            this._colorRenderer = new VBOPointsColorRenderer(this._scene, this._instancing);
        }
        return this._colorRenderer;
    }

    get occlusionRenderer() {
        if (!this._occlusionRenderer) {
            this._occlusionRenderer = new VBOPointsOcclusionRenderer(this._scene, this._instancing);
        }
        return this._occlusionRenderer;
    }

    get pickDepthRenderer() {
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new VBOPointsPickDepthRenderer(this._scene, this._instancing);
        }
        return this._pickDepthRenderer;
    }

    get pickMeshRenderer() {
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new VBOPointsPickMeshRenderer(this._scene, this._instancing);
        }
        return this._pickMeshRenderer;
    }

    get shadowRenderer() {
        if (!this._instancing) {
            // VBOBatchingPointsShadowRenderer has been implemented by 14e973df6268369b00baef60e468939e062ac320,
            // but never used (and probably not maintained), as opposed to VBOInstancingPointsShadowRenderer in the same commit
            return null;
        }
        if (!this._shadowRenderer) {
            this._shadowRenderer = new VBOPointsShadowRenderer(this._scene, this._instancing);
        }
        return this._shadowRenderer;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new VBOPointsSilhouetteRenderer(this._scene, this._instancing);
        }
        return this._silhouetteRenderer;
    }

    get snapInitRenderer() {
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new VBOPointsSnapRenderer(this._scene, this._instancing, true);
        }
        return this._snapInitRenderer;
    }

    get snapRenderer() {
        if (!this._snapRenderer) {
            this._snapRenderer = new VBOPointsSnapRenderer(this._scene, this._instancing, false);
        }
        return this._snapRenderer;
    }

    _destroy() {
        if (this._colorRenderer) {
            this._colorRenderer.destroy();
        }
        if (this._occlusionRenderer) {
            this._occlusionRenderer.destroy();
        }
        if (this._pickDepthRenderer) {
            this._pickDepthRenderer.destroy();
        }
        if (this._pickMeshRenderer) {
            this._pickMeshRenderer.destroy();
        }
        if (this._shadowRenderer) {
            this._shadowRenderer.destroy();
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
export function getPointsRenderers(scene, instancing) {
    const cache = cachedRenderers[instancing ? "instancing" : "batching"];
    const sceneId = scene.id;
    if (! (sceneId in cache)) {
        const renderers = new VBOPointsRenderers(scene, instancing);
        renderers._compile();
        scene.on("compile", () => renderers._compile());
        scene.on("destroyed", () => {
            delete cache[sceneId];
            renderers._destroy();
        });
        cache[sceneId] = renderers;
    }
    return cache[sceneId];
}
