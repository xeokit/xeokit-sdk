import {VBOBatchingTrianglesColorRenderer} from "./VBOBatchingTrianglesColorRenderer.js";
import {VBOBatchingTrianglesFlatColorRenderer} from "./VBOBatchingTrianglesFlatColorRenderer.js";
import {VBOBatchingTrianglesSilhouetteRenderer} from "./VBOBatchingTrianglesSilhouetteRenderer.js";
import {VBOBatchingTrianglesEdgesRenderer} from "./VBOBatchingTrianglesEdgesRenderer.js";
import {VBOBatchingTrianglesEdgesColorRenderer} from "./VBOBatchingTrianglesEdgesColorRenderer.js";
import {VBOBatchingTrianglesPickMeshRenderer} from "./VBOBatchingTrianglesPickMeshRenderer.js";
import {VBOBatchingTrianglesPickDepthRenderer} from "./VBOBatchingTrianglesPickDepthRenderer.js";
import {VBOBatchingTrianglesPickNormalsRenderer} from "./VBOBatchingTrianglesPickNormalsRenderer.js";
import {VBOBatchingTrianglesOcclusionRenderer} from "./VBOBatchingTrianglesOcclusionRenderer.js";
import {VBOBatchingTrianglesDepthRenderer} from "./VBOBatchingTrianglesDepthRenderer.js";
import {VBOBatchingTrianglesNormalsRenderer} from "./VBOBatchingTrianglesNormalsRenderer.js";
import {VBOBatchingTrianglesShadowRenderer} from "./VBOBatchingTrianglesShadowRenderer.js";
import {VBOBatchingTrianglesPBRRenderer} from "./VBOBatchingTrianglesPBRRenderer.js";
import {VBOBatchingTrianglesPickNormalsFlatRenderer} from "./VBOBatchingTrianglesPickNormalsFlatRenderer.js";
import {VBOBatchingTrianglesColorTextureRenderer} from "./VBOBatchingTrianglesColorTextureRenderer.js";
import {VBOBatchingTrianglesSnapInitRenderer} from "./VBOBatchingTrianglesSnapInitRenderer";
import {VBOBatchingTrianglesSnapRenderer} from "./VBOBatchingTrianglesSnapRenderer";

/**
 * @private
 */
class VBOBatchingTrianglesRenderers {

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
        if (this._colorTextureRenderer && (!this._colorTextureRenderer.getValid())) {
            this._colorTextureRenderer.destroy();
            this._colorTextureRenderer = null;
        }
        if (this._colorTextureRendererWithSAO && (!this._colorTextureRendererWithSAO.getValid())) {
            this._colorTextureRendererWithSAO.destroy();
            this._colorTextureRendererWithSAO = null;
        }
        if (this._pbrRenderer && (!this._pbrRenderer.getValid())) {
            this._pbrRenderer.destroy();
            this._pbrRenderer = null;
        }
        if (this._pbrRendererWithSAO && (!this._pbrRendererWithSAO.getValid())) {
            this._pbrRendererWithSAO.destroy();
            this._pbrRendererWithSAO = null;
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

        // Pre-initialize certain renderers that would otherwise be lazy-initialised
        // on user interaction, such as picking or emphasis, so that there is no delay
        // when user first begins interacting with the viewer.

        if (!this._silhouetteRenderer) { // Used for highlighting and selection
            this._silhouetteRenderer = new VBOBatchingTrianglesSilhouetteRenderer(this._scene);
        }
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new VBOBatchingTrianglesPickMeshRenderer(this._scene);
        }
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new VBOBatchingTrianglesPickDepthRenderer(this._scene);
        }
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new VBOBatchingTrianglesSnapInitRenderer(this._scene, false);
        }
        if (!this._snapRenderer) {
            this._snapRenderer = new VBOBatchingTrianglesSnapRenderer(this._scene);
        }
    }

    get colorRenderer() {
        if (!this._colorRenderer) {
            this._colorRenderer = new VBOBatchingTrianglesColorRenderer(this._scene, false);
        }
        return this._colorRenderer;
    }

    get colorRendererWithSAO() {
        if (!this._colorRendererWithSAO) {
            this._colorRendererWithSAO = new VBOBatchingTrianglesColorRenderer(this._scene, true);
        }
        return this._colorRendererWithSAO;
    }

    get flatColorRenderer() {
        if (!this._flatColorRenderer) {
            this._flatColorRenderer = new VBOBatchingTrianglesFlatColorRenderer(this._scene, false);
        }
        return this._flatColorRenderer;
    }

    get flatColorRendererWithSAO() {
        if (!this._flatColorRendererWithSAO) {
            this._flatColorRendererWithSAO = new VBOBatchingTrianglesFlatColorRenderer(this._scene, true);
        }
        return this._flatColorRendererWithSAO;
    }

    get colorTextureRenderer() {
        if (!this._colorTextureRenderer) {
            this._colorTextureRenderer = new VBOBatchingTrianglesColorTextureRenderer(this._scene, false);
        }
        return this._colorTextureRenderer;
    }

    get colorTextureRendererWithSAO() {
        if (!this._colorTextureRendererWithSAO) {
            this._colorTextureRendererWithSAO = new VBOBatchingTrianglesColorTextureRenderer(this._scene, true);
        }
        return this._colorTextureRendererWithSAO;
    }

    get pbrRenderer() {
        if (!this._pbrRenderer) {
            this._pbrRenderer = new VBOBatchingTrianglesPBRRenderer(this._scene, false);
        }
        return this._pbrRenderer;
    }

    get pbrRendererWithSAO() {
        if (!this._pbrRendererWithSAO) {
            this._pbrRendererWithSAO = new VBOBatchingTrianglesPBRRenderer(this._scene, true);
        }
        return this._pbrRendererWithSAO;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new VBOBatchingTrianglesSilhouetteRenderer(this._scene);
        }
        return this._silhouetteRenderer;
    }

    get depthRenderer() {
        if (!this._depthRenderer) {
            this._depthRenderer = new VBOBatchingTrianglesDepthRenderer(this._scene);
        }
        return this._depthRenderer;
    }

    get normalsRenderer() {
        if (!this._normalsRenderer) {
            this._normalsRenderer = new VBOBatchingTrianglesNormalsRenderer(this._scene);
        }
        return this._normalsRenderer;
    }

    get edgesRenderer() {
        if (!this._edgesRenderer) {
            this._edgesRenderer = new VBOBatchingTrianglesEdgesRenderer(this._scene);
        }
        return this._edgesRenderer;
    }

    get edgesColorRenderer() {
        if (!this._edgesColorRenderer) {
            this._edgesColorRenderer = new VBOBatchingTrianglesEdgesColorRenderer(this._scene);
        }
        return this._edgesColorRenderer;
    }

    get pickMeshRenderer() {
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new VBOBatchingTrianglesPickMeshRenderer(this._scene);
        }
        return this._pickMeshRenderer;
    }

    get pickNormalsRenderer() {
        if (!this._pickNormalsRenderer) {
            this._pickNormalsRenderer = new VBOBatchingTrianglesPickNormalsRenderer(this._scene);
        }
        return this._pickNormalsRenderer;
    }

    get pickNormalsFlatRenderer() {
        if (!this._pickNormalsFlatRenderer) {
            this._pickNormalsFlatRenderer = new VBOBatchingTrianglesPickNormalsFlatRenderer(this._scene);
        }
        return this._pickNormalsFlatRenderer;
    }

    get pickDepthRenderer() {
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new VBOBatchingTrianglesPickDepthRenderer(this._scene);
        }
        return this._pickDepthRenderer;
    }

    get occlusionRenderer() {
        if (!this._occlusionRenderer) {
            this._occlusionRenderer = new VBOBatchingTrianglesOcclusionRenderer(this._scene);
        }
        return this._occlusionRenderer;
    }

    get shadowRenderer() {
        if (!this._shadowRenderer) {
            this._shadowRenderer = new VBOBatchingTrianglesShadowRenderer(this._scene);
        }
        return this._shadowRenderer;
    }

    get snapRenderer() {
        if (!this._snapRenderer) {
            this._snapRenderer = new VBOBatchingTrianglesSnapRenderer(this._scene);
        }
        return this._snapRenderer;
    }

    get snapInitRenderer() {
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new VBOBatchingTrianglesSnapInitRenderer(this._scene);
        }
        return this._snapInitRenderer;
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
        if (this._colorTextureRenderer) {
            this._colorTextureRenderer.destroy();
        }
        if (this._colorTextureRendererWithSAO) {
            this._colorTextureRendererWithSAO.destroy();
        }
        if (this._pbrRenderer) {
            this._pbrRenderer.destroy();
        }
        if (this._pbrRendererWithSAO) {
            this._pbrRendererWithSAO.destroy();
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
        if (this._snapInitRenderer) {
            this._snapInitRenderer.destroy();
        }
        if (this._snapRenderer) {
            this._snapRenderer.destroy();
        }
    }
}

const cachdRenderers = {};

/**
 * @private
 */
export function getRenderers(scene) {
    const sceneId = scene.id;
    let batchingRenderers = cachdRenderers[sceneId];
    if (!batchingRenderers) {
        batchingRenderers = new VBOBatchingTrianglesRenderers(scene);
        cachdRenderers[sceneId] = batchingRenderers;
        batchingRenderers._compile();
        batchingRenderers.eagerCreateRenders();
        scene.on("compile", () => {
            batchingRenderers._compile();
            batchingRenderers.eagerCreateRenders();
        });
        scene.on("destroyed", () => {
            delete cachdRenderers[sceneId];
            batchingRenderers._destroy();
        });
    }
    return batchingRenderers;
}
