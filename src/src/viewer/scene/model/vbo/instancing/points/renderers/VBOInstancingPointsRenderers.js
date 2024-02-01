import {VBOInstancingPointsColorRenderer} from "./VBOInstancingPointsColorRenderer.js";
import {VBOInstancingPointsSilhouetteRenderer} from "./VBOInstancingPointsSilhouetteRenderer.js";
import {VBOInstancingPointsPickMeshRenderer} from "./VBOInstancingPointsPickMeshRenderer.js";
import {VBOInstancingPointsPickDepthRenderer} from "./VBOInstancingPointsPickDepthRenderer.js";
import {VBOInstancingPointsOcclusionRenderer} from "./VBOInstancingPointsOcclusionRenderer.js";
import {VBOInstancingPointsDepthRenderer} from "./VBOInstancingPointsDepthRenderer.js";
import {VBOInstancingPointsShadowRenderer} from "./VBOInstancingPointsShadowRenderer.js";
import {VBOInstancingPointsSnapInitRenderer} from "./VBOInstancingPointsSnapInitRenderer.js";
import {VBOInstancingPointsSnapRenderer} from "./VBOInstancingPointsSnapRenderer.js";

/**
 * @private
 */
 class VBOInstancingPointsRenderers {

    constructor(scene) {
        this._scene = scene;
    }

    _compile() {
        if (this._colorRenderer && (!this._colorRenderer.getValid())) {
            this._colorRenderer.destroy();
            this._colorRenderer = null;
        }
        if (this._depthRenderer && (!this._depthRenderer.getValid())) {
            this._depthRenderer.destroy();
            this._depthRenderer = null;
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

    get colorRenderer() {
        if (!this._colorRenderer) {
            this._colorRenderer = new VBOInstancingPointsColorRenderer(this._scene, false);
        }
        return this._colorRenderer;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new VBOInstancingPointsSilhouetteRenderer(this._scene);
        }
        return this._silhouetteRenderer;
    }

    get depthRenderer() {
        if (!this._depthRenderer) {
            this._depthRenderer = new VBOInstancingPointsDepthRenderer(this._scene);
        }
        return this._depthRenderer;
    }

    get pickMeshRenderer() {
        if (!this._pickMeshRenderer) {
            this._pickMeshRenderer = new VBOInstancingPointsPickMeshRenderer(this._scene);
        }
        return this._pickMeshRenderer;
    }

    get pickDepthRenderer() {
        if (!this._pickDepthRenderer) {
            this._pickDepthRenderer = new VBOInstancingPointsPickDepthRenderer(this._scene);
        }
        return this._pickDepthRenderer;
    }

    get occlusionRenderer() {
        if (!this._occlusionRenderer) {
            this._occlusionRenderer = new VBOInstancingPointsOcclusionRenderer(this._scene);
        }
        return this._occlusionRenderer;
    }

    get shadowRenderer() {
        if (!this._shadowRenderer) {
            this._shadowRenderer = new VBOInstancingPointsShadowRenderer(this._scene);
        }
        return this._shadowRenderer;
    }

    get snapInitRenderer() {
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new VBOInstancingPointsSnapInitRenderer(this._scene, false);
        }
        return this._snapInitRenderer;
    }

    get snapRenderer() {
        if (!this._snapRenderer) {
            this._snapRenderer = new VBOInstancingPointsSnapRenderer(this._scene);
        }
        return this._snapRenderer;
    }

    _destroy() {
        if (this._colorRenderer) {
            this._colorRenderer.destroy();
        }
        if (this._depthRenderer) {
            this._depthRenderer.destroy();
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
    let instancingRenderers = cachedRenderers[sceneId];
    if (!instancingRenderers) {
        instancingRenderers = new VBOInstancingPointsRenderers(scene);
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
