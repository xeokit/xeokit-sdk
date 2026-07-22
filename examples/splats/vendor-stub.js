// ponytail: serving the Viewer from src/ means the browser must resolve
// external.js's bare `@loaders.gl/*` imports. The splat demo never loads
// glTF/LAS, so these exports only need to *exist* for module resolution - they
// are never called. This one stub is mapped (via the import map in
// splat-example.html) for @loaders.gl/core, /gltf and /las.
//
// Want working glTF/LAS in a src-served example? Point those import-map entries
// at esm.sh (https://esm.sh/@loaders.gl/core@4.3.4, ...) or the prebuilt dist.

const notBundled = (name) => () => {
    throw new Error(`[splat-example] ${name} is stubbed out - @loaders.gl is not bundled in this src-served splat demo.`);
};

export const parse = notBundled("@loaders.gl/core parse()");
export const postProcessGLTF = notBundled("@loaders.gl/gltf postProcessGLTF()");
export class GLTFLoader {}
export class LASLoader {}
