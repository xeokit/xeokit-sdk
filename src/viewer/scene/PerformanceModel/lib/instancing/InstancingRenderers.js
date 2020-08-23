import {InstancingDrawRenderer} from "./draw/InstancingDrawRenderer.js";
import {InstancingFillRenderer} from "./emphasis/InstancingFillRenderer.js";
import {InstancingEdgesRenderer} from "./emphasis/InstancingEdgesRenderer.js";
import {InstancingPickMeshRenderer} from "./pick/InstancingPickMeshRenderer.js";
import {InstancingPickDepthRenderer} from "./pick/InstancingPickDepthRenderer.js";
import {InstancingPickNormalsRenderer} from "./pick/InstancingPickNormalsRenderer.js";
import {InstancingOcclusionRenderer} from "./occlusion/InstancingOcclusionRenderer.js";
import {InstancingDepthRenderer} from "./depth/InstancingDepthRenderer.js";
import {InstancingNormalsRenderer} from "./normals/InstancingNormalsRenderer.js";
import {InstancingShadowRenderer} from "./shadow/InstancingShadowRenderer.js";

/**
 * @private
 */
class InstancingRenderers {

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
        if (this.pickNormalsRenderer && (!this.pickNormalsRenderer.getValid())) {
            this.pickNormalsRenderer.destroy();
            this.pickNormalsRenderer = null;
        }
        if (this.occlusionRenderer && (!this.occlusionRenderer.getValid())) {
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
            this.drawRenderer = new InstancingDrawRenderer(this._scene);
        }
        if (!this.drawRendererWithSAO) {
            const withSAO = true;
            this.drawRendererWithSAO = new InstancingDrawRenderer(this._scene, withSAO);
        }
        if (!this.fillRenderer) {
            this.fillRenderer = new InstancingFillRenderer(this._scene);
        }
        if (!this.edgesRenderer) {
            this.edgesRenderer = new InstancingEdgesRenderer(this._scene);
        }
        if (!this.pickMeshRenderer) {
            this.pickMeshRenderer = new InstancingPickMeshRenderer(this._scene);
        }
        if (!this.pickDepthRenderer) {
            this.pickDepthRenderer = new InstancingPickDepthRenderer(this._scene);
        }
        if (!this.pickNormalsRenderer) {
            this.pickNormalsRenderer = new InstancingPickNormalsRenderer(this._scene);
        }
        if (!this.occlusionRenderer) {
            this.occlusionRenderer = new InstancingOcclusionRenderer(this._scene);
        }
        if (!this.depthRenderer) {
            this.depthRenderer = new InstancingDepthRenderer(this._scene);
        }
        if (!this.normalsRenderer) {
            this.normalsRenderer = new InstancingNormalsRenderer(this._scene);
        }
        if (!this.shadowRenderer) {
            this.shadowRenderer = new InstancingShadowRenderer(this._scene);
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

export {InstancingRenderers};

const sceneInstancingRenderers = {};

function getInstancingRenderers(scene) {
    const sceneId = scene.id;
    let instancingRenderers = sceneInstancingRenderers[sceneId];
    if (!instancingRenderers) {
        instancingRenderers = new InstancingRenderers(scene);
        sceneInstancingRenderers[sceneId] = instancingRenderers;
        instancingRenderers._compile();
        scene.on("compile", () => {
            instancingRenderers._compile();
        });
        scene.on("destroyed", () => {
            delete sceneInstancingRenderers[sceneId];
            instancingRenderers._destroy();
        });
    }
    return instancingRenderers;
}

export {getInstancingRenderers};