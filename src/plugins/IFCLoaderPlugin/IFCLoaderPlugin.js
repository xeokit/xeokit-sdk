import { Plugin } from "../../viewer/Plugin.js";
import { XKTLoaderPlugin } from "./../XKTLoaderPlugin/XKTLoaderPlugin.js";
import { XktConverter } from "@jakub.lewandowski/cx-ifcconverter-wasm";

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
        if (!params.src) {
            this.error("load() param expected: src");            
        }

        const xktConverter = await XktConverter.create();         
        xktConverter.registerAllReadyCallback(this.loadAllToViewer.bind(this));        
        xktConverter.registerMetaDataCallback(this.handleMetaData.bind(this));        
        xktConverter.registerXKTCallback(this.handleXKT.bind(this));
        xktConverter.registerProgressCallback(this.progressCallback.bind(this));
        xktConverter.registerProgressTextCallback(this.progressTextCallback.bind(this));
        
        const data = await fetchFile(params.src);        
        xktConverter.ifcToXKTs(data);
    }
}
export { IFCLoaderPlugin };
