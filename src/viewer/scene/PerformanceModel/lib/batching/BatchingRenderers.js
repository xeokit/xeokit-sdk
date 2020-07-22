import {BatchingDrawRenderer} from "./draw/BatchingDrawRenderer.js";
import {BatchingFillRenderer} from "./emphasis/BatchingFillRenderer.js";
import {BatchingEdgesRenderer} from "./emphasis/BatchingEdgesRenderer.js";
import {BatchingPickMeshRenderer} from "./pick/BatchingPickMeshRenderer.js";
import {BatchingPickDepthRenderer} from "./pick/BatchingPickDepthRenderer.js";
import {BatchingPickNormalsRenderer} from "./pick/BatchingPickNormalsRenderer.js";
import {BatchingOcclusionRenderer} from "./occlusion/BatchingOcclusionRenderer.js";
import {BatchingDepthRenderer} from "./depth/BatchingDepthRenderer.js";
import {BatchingNormalsRenderer} from "./normals/BatchingNormalsRenderer.js";
import {BatchingShadowRenderer} from "./shadow/BatchingShadowRenderer.js";

/**
 * @private
 */
class BatchingRenderers {

    constructor(scene) {
        this._scene = scene;
    }

    _compile() {
        if (this.drawRenderer && (!this.drawRenderer.getValid())) {
            this.drawRenderer.destroy();
            this.drawRenderer = null;
        }
        if (this.drawRendererWithSAO && (!this.drawRendererWithSAO.getValid())) {
            this.drawRendererWithSAO.destroy();
            this.drawRendererWithSAO = null;
        }
        if (this.depthRenderer && (!this.depthRenderer.getValid())) {
            this.depthRenderer.destroy();
            this.depthRenderer = null;
        }
        if (this.normalsRenderer && (!this.normalsRenderer.getValid())) {
            this.normalsRenderer.destroy();
            this.normalsRenderer = null;
        }
        if (this.fillRenderer && (!this.fillRenderer.getValid())) {
            this.fillRenderer.destroy();
            this.fillRenderer = null;
        }
        if (this.edgesRenderer && (!this.edgesRenderer.getValid())) {
            this.edgesRenderer.destroy();
            this.edgesRenderer = null;
        }
        if (this.pickMeshRenderer && (!this.pickMeshRenderer.getValid())) {
            this.pickMeshRenderer.destroy();
            this.pickMeshRenderer = null;
        }
        if (this.pickDepthRenderer && (!this.pickDepthRenderer.getValid())) {
            this.pickDepthRenderer.destroy();
            this.pickDepthRenderer = null;
        }
        if (this.pickNormalsRenderer && this.pickNormalsRenderer.getValid() === false) {
            this.pickNormalsRenderer.destroy();
            this.pickNormalsRenderer = null;
        }
        if (this.occlusionRenderer && this.occlusionRenderer.getValid() === false) {
            this.occlusionRenderer.destroy();
            this.occlusionRenderer = null;
        }
        if (this.shadowRenderer && (!this.shadowRenderer.getValid())) {
            this.shadowRenderer.destroy();
            this.shadowRenderer = null;
        }
        this._createRenderers();
    }

    _createRenderers() {
        if (!this.drawRenderer) {
            this.drawRenderer = new BatchingDrawRenderer(this._scene);
        }
        if (!this.drawRendererWithSAO) {
            const withSAO = true;
            this.drawRendererWithSAO = new BatchingDrawRenderer(this._scene, withSAO);
        }
        if (!this.fillRenderer) {
            this.fillRenderer = new BatchingFillRenderer(this._scene);
        }
        if (!this.edgesRenderer) {
            this.edgesRenderer = new BatchingEdgesRenderer(this._scene);
        }
        if (!this.pickMeshRenderer) {
            this.pickMeshRenderer = new BatchingPickMeshRenderer(this._scene);
        }
        if (!this.pickDepthRenderer) {
            this.pickDepthRenderer = new BatchingPickDepthRenderer(this._scene);
        }
        if (!this.pickNormalsRenderer) {
            this.pickNormalsRenderer = new BatchingPickNormalsRenderer(this._scene);
        }
        if (!this.occlusionRenderer) {
            this.occlusionRenderer = new BatchingOcclusionRenderer(this._scene);
        }
        if (!this.depthRenderer) {
            this.depthRenderer = new BatchingDepthRenderer(this._scene);
        }
        if (!this.normalsRenderer) {
            this.normalsRenderer = new BatchingNormalsRenderer(this._scene);
        }
        if (!this.shadowRenderer) {
            this.shadowRenderer = new BatchingShadowRenderer(this._scene);
        }
    }

    _destroy() {
        if (this.drawRenderer) {
            this.drawRenderer.destroy();
        }
        if (this.drawRendererWithSAO) {
            this.drawRendererWithSAO.destroy();
        }
        if (this.depthRenderer) {
            this.depthRenderer.destroy();
        }
        if (this.normalsRenderer) {
            this.normalsRenderer.destroy();
        }
        if (this.fillRenderer) {
            this.fillRenderer.destroy();
        }
        if (this.edgesRenderer) {
            this.edgesRenderer.destroy();
        }
        if (this.pickMeshRenderer) {
            this.pickMeshRenderer.destroy();
        }
        if (this.pickDepthRenderer) {
            this.pickDepthRenderer.destroy();
        }
        if (this.pickNormalsRenderer) {
            this.pickNormalsRenderer.destroy();
        }
        if (this.occlusionRenderer) {
            this.occlusionRenderer.destroy();
        }
        if (this.shadowRenderer) {
            this.shadowRenderer.destroy();
        }
    }
}

const sceneBatchingRenderers = {};

function getBatchingRenderers(scene) {
    const sceneId = scene.id;
    let batchingRenderers = sceneBatchingRenderers[sceneId];
    if (!batchingRenderers) {
        batchingRenderers = new BatchingRenderers(scene);
        sceneBatchingRenderers[sceneId] = batchingRenderers;
        batchingRenderers._compile();
        scene.on("compile", () => {
            batchingRenderers._compile();
        });
        scene.on("destroyed", () => {
            delete sceneBatchingRenderers[sceneId];
            batchingRenderers._destroy();
        });
    }
    return batchingRenderers;
}

export {getBatchingRenderers};