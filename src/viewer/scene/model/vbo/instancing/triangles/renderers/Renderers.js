import {VBOTrianglesColorRenderer} from "../../../renderers/VBOTrianglesColorRenderer.js";
import {VBOTrianglesColorTextureRenderer} from "../../../renderers/VBOTrianglesColorTextureRenderer.js";
import {VBOTrianglesDepthRenderer} from "../../../renderers/VBOTrianglesDepthRenderer.js";
import {TrianglesSilhouetteRenderer} from "./TrianglesSilhouetteRenderer.js";
import {VBOTrianglesEdgesRenderer} from "../../../renderers/VBOTrianglesEdgesRenderer.js";
import {VBOTrianglesFlatColorRenderer} from "../../../renderers/VBOTrianglesFlatColorRenderer.js";
import {TrianglesPickNormalsRenderer} from "./TrianglesPickNormalsRenderer.js";
import {VBOTrianglesOcclusionRenderer} from "../../../renderers/VBOTrianglesOcclusionRenderer.js";
import {TrianglesShadowRenderer} from "./TrianglesShadowRenderer.js";
import {VBOTrianglesPBRRenderer} from "../../../renderers/VBOTrianglesPBRRenderer.js";
import {VBOTrianglesPickDepthRenderer} from "../../../renderers/VBOTrianglesPickDepthRenderer.js";
import {VBOTrianglesPickMeshRenderer} from "../../../renderers/VBOTrianglesPickMeshRenderer.js";
import {TrianglesPickNormalsFlatRenderer} from "./TrianglesPickNormalsFlatRenderer.js";
import {TrianglesSnapRenderer} from "./TrianglesSnapRenderer.js";

/**
 * @private
 */
class Renderers {

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
        if (this._colorTextureRendererAlphaCutoff && (!this._colorTextureRendererAlphaCutoff.getValid())) {
            this._colorTextureRendererAlphaCutoff.destroy();
            this._colorTextureRendererAlphaCutoff = null;
        }
        if (this._colorTextureRendererWithSAOAlphaCutoff && (!this._colorTextureRendererWithSAOAlphaCutoff.getValid())) {
            this._colorTextureRendererWithSAOAlphaCutoff.destroy();
            this._colorTextureRendererWithSAOAlphaCutoff = null;
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
            this._silhouetteRenderer = new TrianglesSilhouetteRenderer(this._scene);
        }
        // Return to make sure the getter calls never get optimized away as incorrectly considered nonconsequential
        return [
            this.pickDepthRenderer,
            this.pickMeshRenderer,
            this.snapInitRenderer,
            this.snapRenderer
        ];
    }

    get colorRenderer() {
        if (!this._colorRenderer) {
            this._colorRenderer = new VBOTrianglesColorRenderer(this._scene, true, false);
        }
        return this._colorRenderer;
    }

    get colorRendererWithSAO() {
        if (!this._colorRendererWithSAO) {
            this._colorRendererWithSAO = new VBOTrianglesColorRenderer(this._scene, true, true);
        }
        return this._colorRendererWithSAO;
    }

    get flatColorRenderer() {
        if (!this._flatColorRenderer) {
            this._flatColorRenderer = new VBOTrianglesFlatColorRenderer(this._scene, true, false);
        }
        return this._flatColorRenderer;
    }

    get flatColorRendererWithSAO() {
        if (!this._flatColorRendererWithSAO) {
            this._flatColorRendererWithSAO = new VBOTrianglesFlatColorRenderer(this._scene, true, true);
        }
        return this._flatColorRendererWithSAO;
    }

    get colorTextureRenderer() {
        if (!this._colorTextureRenderer) {
            this._colorTextureRenderer = new VBOTrianglesColorTextureRenderer(this._scene, true, false, false);
        }
        return this._colorTextureRenderer;
    }

    get colorTextureRendererWithSAO() {
        if (!this._colorTextureRendererWithSAO) {
            this._colorTextureRendererWithSAO = new VBOTrianglesColorTextureRenderer(this._scene, true, true, false);
        }
        return this._colorTextureRendererWithSAO;
    }

    get colorTextureRendererAlphaCutoff() {
        if (!this._colorTextureRendererAlphaCutoff) {
            this._colorTextureRendererAlphaCutoff = new VBOTrianglesColorTextureRenderer(this._scene, true, false, true);
        }
        return this._colorTextureRendererAlphaCutoff;
    }

    get colorTextureRendererWithSAOAlphaCutoff() {
        if (!this._colorTextureRendererWithSAOAlphaCutoff) {
            this._colorTextureRendererWithSAOAlphaCutoff = new VBOTrianglesColorTextureRenderer(this._scene, true, true, true);
        }
        return this._colorTextureRendererWithSAOAlphaCutoff;
    }

    get pbrRenderer() {
        if (!this._pbrRenderer) {
            this._pbrRenderer = new VBOTrianglesPBRRenderer(this._scene, true, false);
        }
        return this._pbrRenderer;
    }

    get pbrRendererWithSAO() {
        if (!this._pbrRendererWithSAO) {
            this._pbrRendererWithSAO = new VBOTrianglesPBRRenderer(this._scene, true, true);
        }
        return this._pbrRendererWithSAO;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new TrianglesSilhouetteRenderer(this._scene);
        }
        return this._silhouetteRenderer;
    }

    get depthRenderer() {
        if (!this._depthRenderer) {
            this._depthRenderer = new VBOTrianglesDepthRenderer(this._scene, true);
        }
        return this._depthRenderer;
    }

    get edgesRenderer() {
        if (!this._edgesRenderer) {
            this._edgesRenderer = new VBOTrianglesEdgesRenderer(this._scene, true, true);
        }
        return this._edgesRenderer;
    }

    get edgesColorRenderer() {
        if (!this._edgesColorRenderer) {
            this._edgesColorRenderer = new VBOTrianglesEdgesRenderer(this._scene, true, false);
        }
        return this._edgesColorRenderer;
    }

    get pickMeshRenderer() {
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new VBOTrianglesPickMeshRenderer(this._scene, true);
        }
        return this._pickMeshRenderer;
    }

    get pickNormalsRenderer() {
        if (!this._pickNormalsRenderer) {
            this._pickNormalsRenderer = new TrianglesPickNormalsRenderer(this._scene);
        }
        return this._pickNormalsRenderer;
    }

    get pickNormalsFlatRenderer() {
        if (!this._pickNormalsFlatRenderer) {
            this._pickNormalsFlatRenderer = new TrianglesPickNormalsFlatRenderer(this._scene);
        }
        return this._pickNormalsFlatRenderer;
    }

    get pickDepthRenderer() {
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new VBOTrianglesPickDepthRenderer(this._scene, true);
        }
        return this._pickDepthRenderer;
    }

    get occlusionRenderer() {
        if (!this._occlusionRenderer) {
            this._occlusionRenderer = new VBOTrianglesOcclusionRenderer(this._scene, true);
        }
        return this._occlusionRenderer;
    }

    get shadowRenderer() {
        if (!this._shadowRenderer) {
            this._shadowRenderer = new TrianglesShadowRenderer(this._scene);
        }
        return this._shadowRenderer;
    }

    get snapRenderer() {
        if (!this._snapRenderer) {
            this._snapRenderer = new TrianglesSnapRenderer(this._scene, false);
        }
        return this._snapRenderer;
    }

    get snapInitRenderer() {
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new TrianglesSnapRenderer(this._scene, true);
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
        if (this._colorTextureRendererAlphaCutoff) {
            this._colorTextureRendererAlphaCutoff.destroy();
        }
        if (this._colorTextureRendererWithSAOAlphaCutoff) {
            this._colorTextureRendererWithSAOAlphaCutoff.destroy();
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

const cachedRenderers = {};

/**
 * @private
 */
export function getRenderers(scene) {
    const sceneId = scene.id;
    let renderers = cachedRenderers[sceneId];
    if (!renderers) {
        renderers = new Renderers(scene);
        cachedRenderers[sceneId] = renderers;
        renderers._compile();
        renderers.eagerCreateRenders();
        scene.on("compile", () => {
            renderers._compile();
            renderers.eagerCreateRenders();
        });
        scene.on("destroyed", () => {
            delete cachedRenderers[sceneId];
            renderers._destroy();
        });
    }
    return renderers;
}
