import {VBOTrianglesColorRenderer} from "./VBOTrianglesColorRenderer.js";
import {VBOTrianglesColorTextureRenderer} from "./VBOTrianglesColorTextureRenderer.js";
import {VBOTrianglesDepthRenderer} from "./VBOTrianglesDepthRenderer.js";
import {VBOTrianglesEdgesRenderer} from "./VBOTrianglesEdgesRenderer.js";
import {VBOTrianglesFlatColorRenderer} from "./VBOTrianglesFlatColorRenderer.js";
import {VBOTrianglesOcclusionRenderer} from "./VBOTrianglesOcclusionRenderer.js";
import {VBOTrianglesPBRRenderer} from "./VBOTrianglesPBRRenderer.js";
import {VBOTrianglesPickDepthRenderer} from "./VBOTrianglesPickDepthRenderer.js";
import {VBOTrianglesPickMeshRenderer} from "./VBOTrianglesPickMeshRenderer.js";
import {VBOTrianglesPickNormalsFlatRenderer} from "./VBOTrianglesPickNormalsFlatRenderer.js";
import {VBOTrianglesPickNormalsRenderer} from "./VBOTrianglesPickNormalsRenderer.js";
import {VBOTrianglesShadowRenderer} from "./VBOTrianglesShadowRenderer.js";
import {VBOTrianglesSilhouetteRenderer} from "./VBOTrianglesSilhouetteRenderer.js";
import {VBOTrianglesSnapRenderer} from "./VBOTrianglesSnapRenderer.js";

const cachedRenderers = { batching: { }, instancing: { } };

/**
 * @private
 */
export function getTrianglesRenderers(scene, instancing) {
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
            get colorRenderer()                          { return cached("colorMode",           () => new VBOTrianglesColorRenderer          (scene, instancing, false       )); },
            get colorRendererWithSAO()                   { return cached("colorMode S",         () => new VBOTrianglesColorRenderer          (scene, instancing, true        )); },
            get colorTextureRenderer()                   { return cached("colorTextureMode",    () => new VBOTrianglesColorTextureRenderer   (scene, instancing, false, false)); },
            get colorTextureRendererAlphaCutoff()        { return cached("colorTextureMode A",  () => new VBOTrianglesColorTextureRenderer   (scene, instancing, false, true )); },
            get colorTextureRendererWithSAO()            { return cached("colorTextureMode S",  () => new VBOTrianglesColorTextureRenderer   (scene, instancing, true, false )); },
            get colorTextureRendererWithSAOAlphaCutoff() { return cached("colorTextureMode SA", () => new VBOTrianglesColorTextureRenderer   (scene, instancing, true, true  )); },
            get depthRenderer()                          { return cached("depthMode",           () => new VBOTrianglesDepthRenderer          (scene, instancing              )); },
            get edgesColorRenderer()                     { return cached("edgesMode C",         () => new VBOTrianglesEdgesRenderer          (scene, instancing, false       )); },
            get edgesRenderer()                          { return cached("edgesMode",           () => new VBOTrianglesEdgesRenderer          (scene, instancing, true        )); },
            get flatColorRenderer()                      { return cached("flatColorMode",       () => new VBOTrianglesFlatColorRenderer      (scene, instancing, false       )); },
            get flatColorRendererWithSAO()               { return cached("flatColorMode S",     () => new VBOTrianglesFlatColorRenderer      (scene, instancing, true        )); },
            get occlusionRenderer()                      { return cached("occlusionMode",       () => new VBOTrianglesOcclusionRenderer      (scene, instancing              )); },
            get pbrRenderer()                            { return cached("pbrMode",             () => new VBOTrianglesPBRRenderer            (scene, instancing, false       )); },
            get pbrRendererWithSAO()                     { return cached("pbrMode S",           () => new VBOTrianglesPBRRenderer            (scene, instancing, true        )); },
            get pickDepthRenderer()                      { return cached("pickDepthMode",       () => new VBOTrianglesPickDepthRenderer      (scene, instancing              )); },
            get pickMeshRenderer()                       { return cached("pickMeshMode",        () => new VBOTrianglesPickMeshRenderer       (scene, instancing              )); },
            get pickNormalsFlatRenderer()                { return cached("pickNormalsFlatMode", () => new VBOTrianglesPickNormalsFlatRenderer(scene, instancing              )); },
            get pickNormalsRenderer()                    { return cached("pickNormalsMode",     () => new VBOTrianglesPickNormalsRenderer    (scene, instancing              )); },
            get shadowRenderer()                         { return cached("shadowMode",          () => new VBOTrianglesShadowRenderer         (scene, instancing              )); },
            get silhouetteRenderer()                     { return cached("silhouetteMode",      () => new VBOTrianglesSilhouetteRenderer     (scene, instancing              )); },
            get snapInitRenderer()                       { return cached("snapInitMode",        () => new VBOTrianglesSnapRenderer           (scene, instancing, true        )); },
            get snapRenderer()                           { return cached("snapMode",            () => new VBOTrianglesSnapRenderer           (scene, instancing, false       )); }
        };

        const compile = function() {
            for (let [progMode, renderer] of Object.entries(sceneCache)) {
                if (! renderer.getValid()) {
                    renderer.destroy();
                    delete sceneCache[progMode];
                }
            }
            // Pre-initialize certain renderers that would otherwise be lazy-initialised
            // on user interaction, such as picking or emphasis, so that there is no delay
            // when user first begins interacting with the viewer.
            // Return to make sure the getter calls never get optimized away as incorrectly considered nonconsequential
            return [
                cache[sceneId].pickDepthRenderer,
                cache[sceneId].pickMeshRenderer,
                cache[sceneId].silhouetteRenderer,
                cache[sceneId].snapInitRenderer,
                cache[sceneId].snapRenderer
            ];
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
