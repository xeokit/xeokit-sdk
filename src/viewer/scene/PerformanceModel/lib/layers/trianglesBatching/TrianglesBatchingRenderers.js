import {TrianglesBatchingColorRenderer} from "./renderers/TrianglesBatchingColorRenderer.js";
import {TrianglesBatchingFlatColorRenderer} from "./renderers/TrianglesBatchingFlatColorRenderer.js";
import {TrianglesBatchingSilhouetteRenderer} from "./renderers/TrianglesBatchingSilhouetteRenderer.js";
import {TrianglesBatchingEdgesRenderer} from "./renderers/TrianglesBatchingEdgesRenderer.js";
import {TrianglesBatchingEdgesColorRenderer} from "./renderers/TrianglesBatchingEdgesColorRenderer.js";
import {TrianglesBatchingPickMeshRenderer} from "./renderers/TrianglesBatchingPickMeshRenderer.js";
import {TrianglesBatchingPickDepthRenderer} from "./renderers/TrianglesBatchingPickDepthRenderer.js";
import {TrianglesBatchingPickNormalsRenderer} from "./renderers/TrianglesBatchingPickNormalsRenderer.js";
import {TrianglesBatchingOcclusionRenderer} from "./renderers/TrianglesBatchingOcclusionRenderer.js";
import {TrianglesBatchingDepthRenderer} from "./renderers/TrianglesBatchingDepthRenderer.js";
import {TrianglesBatchingNormalsRenderer} from "./renderers/TrianglesBatchingNormalsRenderer.js";
import {TrianglesBatchingShadowRenderer} from "./renderers/TrianglesBatchingShadowRenderer.js";
import {TrianglesBatchingColorQualityRenderer} from "./renderers/TrianglesBatchingColorQualityRenderer.js";
import {TrianglesBatchingPickNormalsFlatRenderer} from "./renderers/TrianglesBatchingPickNormalsFlatRenderer.js";

/**
 * @private
 */
class TrianglesBatchingRenderers {

    constructor(scene) {
        this._scene = scene;
    }

    _compile() {
        if (this._colorRenderer && (!this._colorRenderer.getValid())) {
            this._colorRenderer.destroy();
            this._colorRenderer = null;
        }
        if (this._colorRendererWithSAO && (!this._colorRendererWithSAO.getValid())) {
            this._colorRendererWithSAO.destroy();
            this._colorRendererWithSAO = null;
        }
        if (this._flatColorRenderer && (!this._flatColorRenderer.getValid())) {
            this._flatColorRenderer.destroy();
            this._flatColorRenderer = null;
        }
        if (this._flatColorRendererWithSAO && (!this._flatColorRendererWithSAO.getValid())) {
            this._flatColorRendererWithSAO.destroy();
            this._flatColorRendererWithSAO = null;
        }
        if (this._colorQualityRenderer && (!this._colorQualityRenderer.getValid())) {
            this._colorQualityRenderer.destroy();
            this._colorQualityRenderer = null;
        }
        if (this._colorQualityRendererWithSAO && (!this._colorQualityRendererWithSAO.getValid())) {
            this._colorQualityRendererWithSAO.destroy();
            this._colorQualityRendererWithSAO = null;
        }
        if (this._depthRenderer && (!this._depthRenderer.getValid())) {
            this._depthRenderer.destroy();
            this._depthRenderer = null;
        }
        if (this._normalsRenderer && (!this._normalsRenderer.getValid())) {
            this._normalsRenderer.destroy();
            this._normalsRenderer = null;
        }
        if (this._silhouetteRenderer && (!this._silhouetteRenderer.getValid())) {
            this._silhouetteRenderer.destroy();
            this._silhouetteRenderer = null;
        }
        if (this._edgesRenderer && (!this._edgesRenderer.getValid())) {
            this._edgesRenderer.destroy();
            this._edgesRenderer = null;
        }
        if (this._edgesColorRenderer && (!this._edgesColorRenderer.getValid())) {
            this._edgesColorRenderer.destroy();
            this._edgesColorRenderer = null;
        }
        if (this._pickMeshRenderer && (!this._pickMeshRenderer.getValid())) {
            this._pickMeshRenderer.destroy();
            this._pickMeshRenderer = null;
        }
        if (this._pickDepthRenderer && (!this._pickDepthRenderer.getValid())) {
            this._pickDepthRenderer.destroy();
            this._pickDepthRenderer = null;
        }
        if (this._pickNormalsRenderer && this._pickNormalsRenderer.getValid() === false) {
            this._pickNormalsRenderer.destroy();
            this._pickNormalsRenderer = null;
        }
        if (this._pickNormalsFlatRenderer && this._pickNormalsFlatRenderer.getValid() === false) {
            this._pickNormalsFlatRenderer.destroy();
            this._pickNormalsFlatRenderer = null;
        }
        if (this._occlusionRenderer && this._occlusionRenderer.getValid() === false) {
            this._occlusionRenderer.destroy();
            this._occlusionRenderer = null;
        }
        if (this._shadowRenderer && (!this._shadowRenderer.getValid())) {
            this._shadowRenderer.destroy();
            this._shadowRenderer = null;
        }
    }

    get colorRenderer() {
        if (!this._colorRenderer) {
            this._colorRenderer = new TrianglesBatchingColorRenderer(this._scene, false);
        }
        return this._colorRenderer;
    }

    get colorRendererWithSAO() {
        if (!this._colorRendererWithSAO) {
            this._colorRendererWithSAO = new TrianglesBatchingColorRenderer(this._scene, true);
        }
        return this._colorRendererWithSAO;
    }

    get flatColorRenderer() {
        if (!this._flatColorRenderer) {
            this._flatColorRenderer = new TrianglesBatchingFlatColorRenderer(this._scene, false);
        }
        return this._flatColorRenderer;
    }

    get flatColorRendererWithSAO() {
        if (!this._flatColorRendererWithSAO) {
            this._flatColorRendererWithSAO = new TrianglesBatchingFlatColorRenderer(this._scene, true);
        }
        return this._flatColorRendererWithSAO;
    }

    get colorQualityRenderer() {
        if (!this._colorQualityRenderer) {
            this._colorQualityRenderer = new TrianglesBatchingColorQualityRenderer(this._scene, false);
        }
        return this._colorQualityRenderer;
    }

    get colorQualityRendererWithSAO() {
        if (!this._colorQualityRendererWithSAO) {
            this._colorQualityRendererWithSAO = new TrianglesBatchingColorQualityRenderer(this._scene, true);
        }
        return this._colorQualityRendererWithSAO;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new TrianglesBatchingSilhouetteRenderer(this._scene);
        }
        return this._silhouetteRenderer;
    }

    get depthRenderer() {
        if (!this._depthRenderer) {
            this._depthRenderer = new TrianglesBatchingDepthRenderer(this._scene);
        }
        return this._depthRenderer;
    }

    get normalsRenderer() {
        if (!this._normalsRenderer) {
            this._normalsRenderer = new TrianglesBatchingNormalsRenderer(this._scene);
        }
        return this._normalsRenderer;
    }

    get edgesRenderer() {
        if (!this._edgesRenderer) {
            this._edgesRenderer = new TrianglesBatchingEdgesRenderer(this._scene);
        }
        return this._edgesRenderer;
    }

    get edgesColorRenderer() {
        if (!this._edgesColorRenderer) {
            this._edgesColorRenderer = new TrianglesBatchingEdgesColorRenderer(this._scene);
        }
        return this._edgesColorRenderer;
    }

    get pickMeshRenderer() {
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new TrianglesBatchingPickMeshRenderer(this._scene);
        }
        return this._pickMeshRenderer;
    }

    get pickNormalsRenderer() {
        if (!this._pickNormalsRenderer) {
            this._pickNormalsRenderer = new TrianglesBatchingPickNormalsRenderer(this._scene);
        }
        return this._pickNormalsRenderer;
    }

    get pickNormalsFlatRenderer() {
        if (!this._pickNormalsFlatRenderer) {
            this._pickNormalsFlatRenderer = new TrianglesBatchingPickNormalsFlatRenderer(this._scene);
        }
        return this._pickNormalsFlatRenderer;
    }

    get pickDepthRenderer() {
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new TrianglesBatchingPickDepthRenderer(this._scene);
        }
        return this._pickDepthRenderer;
    }

    get occlusionRenderer() {
        if (!this._occlusionRenderer) {
            this._occlusionRenderer = new TrianglesBatchingOcclusionRenderer(this._scene);
        }
        return this._occlusionRenderer;
    }

    get shadowRenderer() {
        if (!this._shadowRenderer) {
            this._shadowRenderer = new TrianglesBatchingShadowRenderer(this._scene);
        }
        return this._shadowRenderer;
    }

    _destroy() {
        if (this._colorRenderer) {
            this._colorRenderer.destroy();
        }
        if (this._colorRendererWithSAO) {
            this._colorRendererWithSAO.destroy();
        }
        if (this._flatColorRenderer) {
            this._flatColorRenderer.destroy();
        }
        if (this._flatColorRendererWithSAO) {
            this._flatColorRendererWithSAO.destroy();
        }
        if (this._colorQualityRenderer) {
            this._colorQualityRenderer.destroy();
        }
        if (this._colorQualityRendererWithSAO) {
            this._colorQualityRendererWithSAO.destroy();
        }
        if (this._depthRenderer) {
            this._depthRenderer.destroy();
        }
        if (this._normalsRenderer) {
            this._normalsRenderer.destroy();
        }
        if (this._silhouetteRenderer) {
            this._silhouetteRenderer.destroy();
        }
        if (this._edgesRenderer) {
            this._edgesRenderer.destroy();
        }
        if (this._edgesColorRenderer) {
            this._edgesColorRenderer.destroy();
        }
        if (this._pickMeshRenderer) {
            this._pickMeshRenderer.destroy();
        }
        if (this._pickDepthRenderer) {
            this._pickDepthRenderer.destroy();
        }
        if (this._pickNormalsRenderer) {
            this._pickNormalsRenderer.destroy();
        }
        if (this._pickNormalsFlatRenderer) {
            this._pickNormalsFlatRenderer.destroy();
        }
        if (this._occlusionRenderer) {
            this._occlusionRenderer.destroy();
        }
        if (this._shadowRenderer) {
            this._shadowRenderer.destroy();
        }
    }
}

const cachdRenderers = {};

/**
 * @private
 */
function getBatchingRenderers(scene) {
    const sceneId = scene.id;
    let batchingRenderers = cachdRenderers[sceneId];
    if (!batchingRenderers) {
        batchingRenderers = new TrianglesBatchingRenderers(scene);
        cachdRenderers[sceneId] = batchingRenderers;
        batchingRenderers._compile();
        scene.on("compile", () => {
            batchingRenderers._compile();
        });
        scene.on("destroyed", () => {
            delete cachdRenderers[sceneId];
            batchingRenderers._destroy();
        });
    }
    return batchingRenderers;
}

export {getBatchingRenderers};