import {SnapInstancingDepthBufInitRenderer} from "./SnapInstancingDepthBufInitRenderer.js";
import {SnapInstancingDepthRenderer} from "./SnapInstancingDepthRenderer.js";

/**
 * @private
 */
class SnapInstancingRenderers {

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
            this._snapDepthBufInitRenderer = new SnapInstancingDepthBufInitRenderer(this._scene, false);
        }
        return this._snapDepthBufInitRenderer;
    }

    get snapDepthRenderer() {
        if (!this._snapDepthRenderer) {
            this._snapDepthRenderer = new SnapInstancingDepthRenderer(this._scene);
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
function getSnapInstancingRenderers(scene) {
    const sceneId = scene.id;
    let instancingRenderers = cachedRenderers[sceneId];
    if (!instancingRenderers) {
        instancingRenderers = new SnapInstancingRenderers(scene);
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

export {getSnapInstancingRenderers}