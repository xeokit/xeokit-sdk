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

    eagerCreateRenders() {

        // Pre-initialize renderers that would otherwise be lazy-initialised
        // on user interaction, such as picking or emphasis, so that there is no delay
        // when user first begins interacting with the viewer.

        if (!this._snapDepthBufInitRenderer) {
            this._snapDepthBufInitRenderer = new SnapInstancingDepthBufInitRenderer(this._scene, false);
        }
        if (!this._snapDepthRenderer) {
            this._snapDepthRenderer = new SnapInstancingDepthRenderer(this._scene);
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
        instancingRenderers.eagerCreateRenders();
        scene.on("compile", () => {
            instancingRenderers._compile();
            instancingRenderers.eagerCreateRenders();
        });
        scene.on("destroyed", () => {
            delete cachedRenderers[sceneId];
            instancingRenderers._destroy();
        });
    }
    return instancingRenderers;
}

export {getSnapInstancingRenderers}