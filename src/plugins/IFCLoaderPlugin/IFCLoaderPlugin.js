import { utils } from "../../viewer/scene/utils.js"
import { SceneModel } from "../../viewer/scene/model/index.js";
import { Plugin } from "../../viewer/Plugin.js";
import { XktConverter } from "../../../.vscode/dist/index.mjs"
import { XKTLoaderPlugin } from "../../../dist/xeokit-sdk.es.js";

async function fetchFileContent(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const content = await response.text(); // Use .text() for plain text files
        //console.log(content);

        return content;
    } catch (error) {
        console.error('Error fetching file:', error);
    }
}

class IFCLoaderPlugin extends Plugin {
    metaDataGlobal = {};
    XKTs = [];
    progressCallback = (progress) => {};
    progressTextCallback = (progressText) => {};


    constructor(viewer, cfg = {}) {
        super("ifcLoader", viewer, cfg);
    }
    registerProgressCallback(progressCallback) {
        this.progressCallback = progressCallback;
    }
    registerProgressTextCallback(progressTextCallback) {
        this.progressTextCallback = progressTextCallback;
    }
    async loadAllToViewer() {
        const xktLoader = new XKTLoaderPlugin(this.viewer);
        for (let idx = 0; idx < this.XKTs.length; idx++) {
            const currentXKT = this.XKTs[idx];
            await xktLoader.load({ xkt: currentXKT });
        }
        this.viewer.metaScene.createMetaModel("metaModel", this.metaDataGlobal);       
        const aabb = this.viewer.scene.aabb;
        this.viewer.cameraFlight.flyTo(aabb);
    }
    async  handleMetaData(metaData) {
        this.metaDataGlobal = metaData;
    }
    async  handleXKT(xkt) {
        this.XKTs.push(xkt);
    }
    async load(params = {}) {

        const sceneModel = new SceneModel(this.viewer.scene, utils.apply(params, {
            isModel: true
        }));

        if (!params.src && !params.ifc) {
            this.error("load() param expected: src or IFC");
            return sceneModel; // Return new empty model
        }

        //stuff       

        const xktConverter = await XktConverter.create();         
        xktConverter.registerAllReadyCallback(this.loadAllToViewer.bind(this));        
        xktConverter.registerMetaDataCallback(this.handleMetaData.bind(this));        
        xktConverter.registerXKTCallback(this.handleXKT.bind(this));
        xktConverter.registerProgressCallback(this.progressCallback.bind(this));
        xktConverter.registerProgressTextCallback(this.progressTextCallback.bind(this));
        
        const data = await fetchFileContent(params.src);
        // const data = await fetchFileContent("../../assets/6-Maschinen.ifc");
        xktConverter.ifcToXKTs(data);
    }
}
export { IFCLoaderPlugin };
