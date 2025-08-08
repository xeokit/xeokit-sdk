import { Plugin } from "../../viewer/Plugin.js";
import { GLTFLoaderPlugin } from "../GLTFLoaderPlugin/GLTFLoaderPlugin.js";

/**
 * Fetches a file from the given URL and returns its contents as text.
 *
 * @param {string} url - The URL to fetch the file from.
 * @returns {Promise<string>} A promise that resolves to the file contents.
 * @private
 */
async function fetchFile(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
    } catch (error) {
        console.error('Error fetching file:', error);
    }
}

/**
 * {@link Viewer} plugin that uses [CxConverter](https://github.com/Creoox/cxconverter) to load BIM models directly from IFC files, using its WebAssembly buid from [npm package](https://www.npmjs.com/package/@creooxag/cxconverter).
 *
 * ## Overview
 * The WebAssembly build of CxConverter is still in alfa stage, so it may not work as expected. This documentation will be updated as the library and the plugin evolve. The example below shows how to use the plugin:
 * ````javascript
 * import { CxConverterIFCLoaderPlugin, Viewer } from "../../dist/xeokit-sdk.es.js";
 * const cxConverterIFCLoaderPlugin = new CxConverterIFCLoaderPlugin(viewer);
 * 
 * const sceneModel = await cxConverterIFCLoaderPlugin.load({
 *        src: "../../assets/models/ifc/Duplex.ifc"
 * }); 
 * ````
    See the code in action [here](https://xeokit.github.io/xeokit-sdk/examples/buildings/#cxConverterIFC_vbo_Duplex).
 */

class CxConverterIFCLoaderPlugin extends Plugin {
    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} [cfg={}] Plugin configuration.
     */
    constructor(viewer, cfg = {}) {
        super("ifcLoader", viewer, cfg);

        /**
         * The GLTFLoaderPlugin used internally to load the converted GLTF.
         * @type {GLTFLoaderPlugin}
         */
        this.gltfLoader = new GLTFLoaderPlugin(this.viewer);
        this.cxConverterModule = null;
    }

    /**
     * Sets the CxConverter module to be used by this plugin.
     * @param {Object} module The CxConverter module.
     */
    setCxConverterModule(module) {
        this.cxConverterModule = module;
    }

    /**
     * Loads an IFC model from the given source.
     *
     * @param {Object} [params={}] Loading parameters.
     * @param {string} params.src Path to an IFC file.
     * @param {Function} [params.progressCallback] Callback to track loading progress.
     * @param {Function} [params.progressTextCallback] Callback to track loading progress with text updates.
     * @returns {Promise<SceneModel>} A promise that resolves to the loaded SceneModel.
     */
    async load(params = {}) {
        if (!this.cxConverterModule) {
            throw new Error("CxConverter module is not set. Use setCxConverterModule() to set it.");
        }
        if (!params.src) {
            this.error("load() param expected: src");
        }
        const data = await fetchFile(params.src);
        const { gltf, metaData } = await this.cxConverterModule.ifc2gltf(
            data,
            {
                remote: true,
                progressCallback: params.progressCallback,
                progressTextCallback: params.progressTextCallback
            }
        );
        const sceneModel = this.gltfLoader.load({
            id: "myModel",
            gltf: gltf,
            metaModelJSON: metaData
        });
        return sceneModel;
    }
}
export { CxConverterIFCLoaderPlugin };
