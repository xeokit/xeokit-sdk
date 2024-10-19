import {VBOLinesColorRenderer} from "../../../renderers/VBOLinesColorRenderer.js";
import {VBOInstancingLinesSilhouetteRenderer} from "./VBOInstancingLinesSilhouetteRenderer.js";
import {VBOInstancingLinesSnapRenderer} from "./VBOInstancingLinesSnapRenderer.js";

/**
 * @private
 */
class VBOInstancingLinesRenderers {

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
            this._colorRenderer = new VBOLinesColorRenderer(this._scene, true);
        }
        return this._colorRenderer;
    }

    get silhouetteRenderer() {
        if (!this._silhouetteRenderer) {
            this._silhouetteRenderer = new VBOInstancingLinesSilhouetteRenderer(this._scene);
        }
        return this._silhouetteRenderer;
    }

    get snapInitRenderer() {
        if (!this._snapInitRenderer) {
            this._snapInitRenderer = new VBOInstancingLinesSnapRenderer(this._scene, true);
        }
        return this._snapInitRenderer;
    }

    get snapRenderer() {
        if (!this._snapRenderer) {
            this._snapRenderer = new VBOInstancingLinesSnapRenderer(this._scene, false);
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
        instancingRenderers = new VBOInstancingLinesRenderers(scene);
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
