import {DTXTrianglesColorRenderer} from "./DTXTrianglesColorRenderer.js";
import {DTXTrianglesSilhouetteRenderer} from "./DTXTrianglesSilhouetteRenderer.js";
import {DTXTrianglesEdgesRenderer} from "./DTXTrianglesEdgesRenderer.js";
import {DTXTrianglesEdgesColorRenderer} from "./DTXTrianglesEdgesColorRenderer.js";
import {DTXTrianglesPickMeshRenderer} from "./DTXTrianglesPickMeshRenderer.js";
import {DTXTrianglesPickDepthRenderer} from "./DTXTrianglesPickDepthRenderer.js";
import {DTXTrianglesSnapRenderer} from "./DTXTrianglesSnapRenderer.js";
import {DTXTrianglesSnapInitRenderer} from "./DTXTrianglesSnapInitRenderer.js";
import {DTXTrianglesOcclusionRenderer} from "./DTXTrianglesOcclusionRenderer.js";
import {DTXTrianglesDepthRenderer} from "./DTXTrianglesDepthRenderer.js";
import {DTXTrianglesNormalsRenderer} from "./DTXTrianglesNormalsRenderer.js";
import {DTXTrianglesPickNormalsFlatRenderer} from "./DTXTrianglesPickNormalsFlatRenderer.js";

/**
 * @private
 */
class DTXTrianglesRenderers {

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
        if (this._snapRenderer && (!this._snapRenderer.getValid())) {
            this._snapRenderer.destroy();
            this._snapRenderer = null;
        }
        if (this._snapInitRenderer && (!this._snapInitRenderer.getValid())) {
            this._snapInitRenderer.destroy();
            this._snapInitRenderer = null;
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
    }

    eagerCreateRenders() {

        // Pre-initialize certain renderers that would otherwise be lazy-initialised
        // on user interaction, such as picking or emphasis, so that there is no delay
        // when user first begins interacting with the viewer.

        if (!this._silhouetteRenderer) { // Used for highlighting and selection
            this._silhouetteRenderer = new DTXTrianglesSilhouetteRenderer(this._scene);
        }
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new DTXTrianglesPickMeshRenderer(this._scene);
        }
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new DTXTrianglesPickDepthRenderer(this._scene);
        }
        if (!this._pickNormalsRenderer) {
            this._pickNormalsRenderer = new DTXTrianglesPickNormalsFlatRenderer(this._scene);
        }
        if (!this._snapRenderer) {
            this._snapRenderer = new DTXTrianglesSnapRenderer(this._scene);
        }
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new DTXTrianglesSnapInitRenderer(this._scene);
        }
        if (!this._snapRenderer) {
            this._snapRenderer = new DTXTrianglesSnapRenderer(this._scene);
        }
    }


    get colorRenderer() {
        if (!this._colorRenderer) {
            this._colorRenderer = new DTXTrianglesColorRenderer(this._scene, false);
        }
        return this._colorRenderer;
    }

    get colorRendererWithSAO() {
        if (!this._colorRendererWithSAO) {
            this._colorRendererWithSAO = new DTXTrianglesColorRenderer(this._scene, true);
        }
        return this._colorRendererWithSAO;
    }

    get colorQualityRendererWithSAO() {
        // if (!this._colorQualityRendererWithSAO) {
        //     this._colorQualityRendererWithSAO = new TrianglesDataTextureColorQualityRenderer(this._scene, true);
        // }
        return this._colorQualityRendererWithSAO;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new DTXTrianglesSilhouetteRenderer(this._scene);
        }
        return this._silhouetteRenderer;
    }

    get depthRenderer() {
        if (!this._depthRenderer) {
            this._depthRenderer = new DTXTrianglesDepthRenderer(this._scene);
        }
        return this._depthRenderer;
    }

    get normalsRenderer() {
        if (!this._normalsRenderer) {
            this._normalsRenderer = new DTXTrianglesNormalsRenderer(this._scene);
        }
        return this._normalsRenderer;
    }

    get edgesRenderer() {
        if (!this._edgesRenderer) {
            this._edgesRenderer = new DTXTrianglesEdgesRenderer(this._scene);
        }
        return this._edgesRenderer;
    }

    get edgesColorRenderer() {
        if (!this._edgesColorRenderer) {
            this._edgesColorRenderer = new DTXTrianglesEdgesColorRenderer(this._scene);
        }
        return this._edgesColorRenderer;
    }

    get pickMeshRenderer() {
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new DTXTrianglesPickMeshRenderer(this._scene);
        }
        return this._pickMeshRenderer;
    }

    get pickNormalsRenderer() {
        if (!this._pickNormalsRenderer) {
            this._pickNormalsRenderer = new DTXTrianglesPickNormalsFlatRenderer(this._scene);
        }
        return this._pickNormalsRenderer;
    }

    get pickNormalsFlatRenderer() {
        if (!this._pickNormalsFlatRenderer) {
            this._pickNormalsFlatRenderer = new DTXTrianglesPickNormalsFlatRenderer(this._scene);
        }
        return this._pickNormalsFlatRenderer;
    }

    get pickDepthRenderer() {
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new DTXTrianglesPickDepthRenderer(this._scene);
        }
        return this._pickDepthRenderer;
    }

    get snapRenderer() {
        if (!this._snapRenderer) {
            this._snapRenderer = new DTXTrianglesSnapRenderer(this._scene);
        }
        return this._snapRenderer;
    }

    get snapInitRenderer() {
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new DTXTrianglesSnapInitRenderer(this._scene);
        }
        return this._snapInitRenderer;
    }

    get occlusionRenderer() {
        if (!this._occlusionRenderer) {
            this._occlusionRenderer = new DTXTrianglesOcclusionRenderer(this._scene);
        }
        return this._occlusionRenderer;
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
        if (this._snapRenderer) {
            this._snapRenderer.destroy();
        }
        if (this._snapInitRenderer) {
            this._snapInitRenderer.destroy();
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
    }
}

const cachdRenderers = {};

/**
 * @private
 */
export function getRenderers(scene) {
    const sceneId = scene.id;
    let dataTextureRenderers = cachdRenderers[sceneId];
    if (!dataTextureRenderers) {
        dataTextureRenderers = new DTXTrianglesRenderers(scene);
        cachdRenderers[sceneId] = dataTextureRenderers;
        dataTextureRenderers._compile();
        dataTextureRenderers.eagerCreateRenders();
        scene.on("compile", () => {
            dataTextureRenderers._compile();
            dataTextureRenderers.eagerCreateRenders();
        });
        scene.on("destroyed", () => {
            delete cachdRenderers[sceneId];
            dataTextureRenderers._destroy();
        });
    }
    return dataTextureRenderers;
}
