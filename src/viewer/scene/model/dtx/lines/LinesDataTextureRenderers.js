import {LinesDataTextureColorRenderer} from "./renderers/LinesDataTextureColorRenderer.js";

/**
 * @private
 */
class LinesDataTextureRenderers {

    constructor(scene) {
        this._scene = scene;
    }

    _compile() {
        if (this._colorRenderer && (!this._colorRenderer.getValid())) {
            this._colorRenderer.destroy();
            this._colorRenderer = null;
        }
       
    }

    eagerCreateRenders() {

        // Pre-initialize certain renderers that would otherwise be lazy-initialised
        // on user interaction, such as picking or emphasis, so that there is no delay
        // when user first begins interacting with the viewer.
       
    }
    
    get colorRenderer() {
        if (!this._colorRenderer) {
            this._colorRenderer = new LinesDataTextureColorRenderer(this._scene, false);
        }
        return this._colorRenderer;
    }
    
    _destroy() {
        if (this._colorRenderer) {
            this._colorRenderer.destroy();
        }
    }
}

const cachedRenderers = {};

/**
 * @private
 */
function getDataTextureRenderers(scene) {
    const sceneId = scene.id;
    let dataTextureRenderers = cachedRenderers[sceneId];
    if (!dataTextureRenderers) {
        dataTextureRenderers = new LinesDataTextureRenderers(scene);
        cachedRenderers[sceneId] = dataTextureRenderers;
        dataTextureRenderers._compile();
        dataTextureRenderers.eagerCreateRenders();
        scene.on("compile", () => {
            dataTextureRenderers._compile();
            dataTextureRenderers.eagerCreateRenders();
        });
        scene.on("destroyed", () => {
            delete cachedRenderers[sceneId];
            dataTextureRenderers._destroy();
        });
    }
    return dataTextureRenderers;
}

export {getDataTextureRenderers};