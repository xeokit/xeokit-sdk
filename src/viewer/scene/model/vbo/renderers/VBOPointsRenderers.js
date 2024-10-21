import {VBOPointsColorRenderer} from "./VBOPointsColorRenderer.js";
import {VBOPointsOcclusionRenderer} from "./VBOPointsOcclusionRenderer.js";
import {VBOPointsPickDepthRenderer} from "./VBOPointsPickDepthRenderer.js";
import {VBOPointsPickMeshRenderer} from "./VBOPointsPickMeshRenderer.js";
import {VBOPointsShadowRenderer} from "./VBOPointsShadowRenderer.js";
import {VBOPointsSilhouetteRenderer} from "./VBOPointsSilhouetteRenderer.js";
import {VBOPointsSnapRenderer} from "./VBOPointsSnapRenderer.js";

const cachedRenderers = { batching: { }, instancing: { } };

/**
 * @private
 */
export function getPointsRenderers(scene, instancing) {
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
            get colorRenderer()      { return cached("colorMode",      () => new VBOPointsColorRenderer               (scene, instancing       )); },
            get occlusionRenderer()  { return cached("occlusionMode",  () => new VBOPointsOcclusionRenderer           (scene, instancing       )); },
            get pickDepthRenderer()  { return cached("pickDepthMode",  () => new VBOPointsPickDepthRenderer           (scene, instancing       )); },
            get pickMeshRenderer()   { return cached("pickMeshMode",   () => new VBOPointsPickMeshRenderer            (scene, instancing       )); },
            // VBOBatchingPointsShadowRenderer has been implemented by 14e973df6268369b00baef60e468939e062ac320,
            // but never used (and probably not maintained), as opposed to VBOInstancingPointsShadowRenderer in the same commit
            get shadowRenderer()     { return instancing && cached("shadowRenderer", () => new VBOPointsShadowRenderer(scene, instancing       )); },
            get silhouetteRenderer() { return cached("silhouetteMode", () => new VBOPointsSilhouetteRenderer          (scene, instancing       )); },
            get snapInitRenderer()   { return cached("snapInitMode",   () => new VBOPointsSnapRenderer                (scene, instancing, true )); },
            get snapRenderer()       { return cached("snapMode",       () => new VBOPointsSnapRenderer                (scene, instancing, false)); }
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
