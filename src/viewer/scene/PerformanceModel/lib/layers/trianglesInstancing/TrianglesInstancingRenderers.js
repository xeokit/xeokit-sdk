import {TrianglesInstancingColorRenderer} from "./renderers/TrianglesInstancingColorRenderer.js";
import {TrianglesInstancingFlatColorRenderer} from "./renderers/TrianglesInstancingFlatColorRenderer.js";
import {TrianglesInstancingSilhouetteRenderer} from "./renderers/TrianglesInstancingSilhouetteRenderer.js";
import {TrianglesInstancingEdgesRenderer} from "./renderers/TrianglesInstancingEdgesRenderer.js";
import {TrianglesInstancingEdgesColorRenderer} from "./renderers/TrianglesInstancingEdgesColorRenderer.js";
import {TrianglesInstancingPickMeshRenderer} from "./renderers/TrianglesInstancingPickMeshRenderer.js";
import {TrianglesInstancingPickDepthRenderer} from "./renderers/TrianglesInstancingPickDepthRenderer.js";
import {TrianglesInstancingPickNormalsRenderer} from "./renderers/TrianglesInstancingPickNormalsRenderer.js";
import {TrianglesInstancingOcclusionRenderer} from "./renderers/TrianglesInstancingOcclusionRenderer.js";
import {TrianglesInstancingDepthRenderer} from "./renderers/TrianglesInstancingDepthRenderer.js";
import {TrianglesInstancingNormalsRenderer} from "./renderers/TrianglesInstancingNormalsRenderer.js";
import {TrianglesInstancingShadowRenderer} from "./renderers/TrianglesInstancingShadowRenderer.js";
import {TrianglesInstancingColorQualityRenderer} from "./renderers/TrianglesInstancingColorQualityRenderer.js";
import {TrianglesInstancingPickNormalsFlatRenderer} from "./renderers/TrianglesInstancingPickNormalsFlatRenderer.js";

/**
 * @private
 */
class TrianglesInstancingRenderers {

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
        if (this._pickNormalsFlatRenderer && (!this._pickNormalsFlatRenderer.getValid())) {
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
            this._colorRenderer = new TrianglesInstancingColorRenderer(this._scene, false);
        }
        return this._colorRenderer;
    }

    get colorRendererWithSAO() {
        if (!this._colorRendererWithSAO) {
            this._colorRendererWithSAO = new TrianglesInstancingColorRenderer(this._scene, true);
        }
        return this._colorRendererWithSAO;
    }

    get flatColorRenderer() {
        if (!this._flatColorRenderer) {
            this._flatColorRenderer = new TrianglesInstancingFlatColorRenderer(this._scene, false);
        }
        return this._flatColorRenderer;
    }

    get flatColorRendererWithSAO() {
        if (!this._flatColorRendererWithSAO) {
            this._flatColorRendererWithSAO = new TrianglesInstancingFlatColorRenderer(this._scene, true);
        }
        return this._flatColorRendererWithSAO;
    }

    get colorQualityRenderer() {
        if (!this._colorQualityRenderer) {
            this._colorQualityRenderer = new TrianglesInstancingColorQualityRenderer(this._scene, false);
        }
        return this._colorQualityRenderer;
    }

    get colorQualityRendererWithSAO() {
        if (!this._colorQualityRendererWithSAO) {
            this._colorQualityRendererWithSAO = new TrianglesInstancingColorQualityRenderer(this._scene, true);
        }
        return this._colorQualityRendererWithSAO;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new TrianglesInstancingSilhouetteRenderer(this._scene);
        }
        return this._silhouetteRenderer;
    }

    get depthRenderer() {
        if (!this._depthRenderer) {
            this._depthRenderer = new TrianglesInstancingDepthRenderer(this._scene);
        }
        return this._depthRenderer;
    }

    get normalsRenderer() {
        if (!this._normalsRenderer) {
            this._normalsRenderer = new TrianglesInstancingNormalsRenderer(this._scene);
        }
        return this._normalsRenderer;
    }

    get edgesRenderer() {
        if (!this._edgesRenderer) {
            this._edgesRenderer = new TrianglesInstancingEdgesRenderer(this._scene);
        }
        return this._edgesRenderer;
    }

    get edgesColorRenderer() {
        if (!this._edgesColorRenderer) {
            this._edgesColorRenderer = new TrianglesInstancingEdgesColorRenderer(this._scene);
        }
        return this._edgesColorRenderer;
    }

    get pickMeshRenderer() {
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new TrianglesInstancingPickMeshRenderer(this._scene);
        }
        return this._pickMeshRenderer;
    }

    get pickNormalsRenderer() {
        if (!this._pickNormalsRenderer) {
            this._pickNormalsRenderer = new TrianglesInstancingPickNormalsRenderer(this._scene);
        }
        return this._pickNormalsRenderer;
    }

    get pickNormalsFlatRenderer() {
        if (!this._pickNormalsFlatRenderer) {
            this._pickNormalsFlatRenderer = new TrianglesInstancingPickNormalsFlatRenderer(this._scene);
        }
        return this._pickNormalsFlatRenderer;
    }

    get pickDepthRenderer() {
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new TrianglesInstancingPickDepthRenderer(this._scene);
        }
        return this._pickDepthRenderer;
    }

    get occlusionRenderer() {
        if (!this._occlusionRenderer) {
            this._occlusionRenderer = new TrianglesInstancingOcclusionRenderer(this._scene);
        }
        return this._occlusionRenderer;
    }

    get shadowRenderer() {
        if (!this._shadowRenderer) {
            this._shadowRenderer = new TrianglesInstancingShadowRenderer(this._scene);
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

const cachedRenderers = {};

/**
 * @private
 */
function getInstancingRenderers(scene) {
    const sceneId = scene.id;
    let instancingRenderers = cachedRenderers[sceneId];
    if (!instancingRenderers) {
        instancingRenderers = new TrianglesInstancingRenderers(scene);
        cachedRenderers[sceneId] = instancingRenderers;
        instancingRenderers._compile();
        scene.on("compile", () => {
            instancingRenderers._compile();
        });
        scene.on("destroyed", () => {
            delete cachedRenderers[sceneId];
            instancingRenderers._destroy();
        });
    }
    return instancingRenderers;
}

export {getInstancingRenderers};