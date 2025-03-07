import { Plugin } from "../../viewer/Plugin";
import { Viewer } from "../../viewer/Viewer";
import { GLTFLoaderPlugin } from "../GLTFLoaderPlugin/GLTFLoaderPlugin";
import { SceneModel } from "../../viewer/scene/models/SceneModel";

/**
 * {@link Viewer} plugin that loads IFC models using the CxConverter library.
 */
export declare class CxConverterIFCLoaderPlugin extends Plugin {
    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} [cfg] Plugin configuration.
     */
    constructor(viewer: Viewer, cfg?: {});

    /**
     * The GLTFLoaderPlugin used internally to load the converted GLTF.
     */
    gltfLoader: GLTFLoaderPlugin;

    /**
     * Loads an IFC model from the given source.
     *
     * @param {Object} params Loading parameters.
     * @param {String} params.src Path to an IFC file.
     * @param {Function} [params.progressCallback] Callback to track loading progress.
     * @param {Function} [params.progressTextCallback] Callback to track loading progress with text updates.
     * @returns {Promise<SceneModel>} A promise that resolves to the loaded SceneModel.
     */
    load(params?: {
        src: string;
        progressCallback?: (progress: number) => void;
        progressTextCallback?: (text: string) => void;
    }): Promise<SceneModel>;
}