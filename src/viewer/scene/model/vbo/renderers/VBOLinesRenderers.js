import {VBOLinesColorRenderer} from "./VBOLinesColorRenderer.js";
import {VBOLinesSilhouetteRenderer} from "./VBOLinesSilhouetteRenderer.js";
import {VBOLinesSnapRenderer} from "./VBOLinesSnapRenderer.js";

const cachedRenderers = { batching: { }, instancing: { } };

/**
 * @private
 */
export function getLinesRenderers(scene, instancing) {
    const cache = cachedRenderers[instancing ? "instancing" : "batching"];
    const sceneId = scene.id;
    if (! (sceneId in cache)) {
        const sceneCache = { };

        const cached = function(progMode, instantiate) {
            if (! (progMode in sceneCache)) {
                sceneCache[progMode] = instantiate();
            }
            return sceneCache[progMode];
        };

        cache[sceneId] = {
            get colorRenderer()      { return cached("colorMode",      () => new VBOLinesColorRenderer     (scene, instancing       )); },
            get silhouetteRenderer() { return cached("silhouetteMode", () => new VBOLinesSilhouetteRenderer(scene, instancing       )); },
            get snapInitRenderer()   { return cached("snapInitMode",   () => new VBOLinesSnapRenderer      (scene, instancing, true )); },
            get snapRenderer()       { return cached("snapMode",       () => new VBOLinesSnapRenderer      (scene, instancing, false)); }
        };

        const compile = function() {
            for (let [progMode, renderer] of Object.entries(sceneCache)) {
                if (! renderer.getValid()) {
                    renderer.destroy();
                    delete sceneCache[progMode];
                }
            }
        };

        compile();
        scene.on("compile", compile);
        scene.on("destroyed", () => {
            delete cache[sceneId];
            for (let [progMode, renderer] of Object.entries(sceneCache)) {
                renderer.destroy();
                delete sceneCache[progMode];
            }
        });
    }
    return cache[sceneId];
}
