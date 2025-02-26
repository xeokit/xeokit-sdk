import { Plugin } from "../../viewer/Plugin.js";
import { GLTFLoaderPlugin } from "../GLTFLoaderPlugin/GLTFLoaderPlugin.js";
import { ifc2gltf } from "@creooxag/cx-converter";

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

class CxConverterIFCLoaderPlugin extends Plugin {    
    constructor(viewer, cfg = {}) {
        super("ifcLoader", viewer, cfg);
        this.gltfLoader = new GLTFLoaderPlugin(this.viewer);
    }
    async load(params = {}) {
        if (!params.src) {
            this.error("load() param expected: src");
        }
        const data = await fetchFile(params.src);
        const { gltf, metaData } = await ifc2gltf(
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
