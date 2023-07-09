import {ViewFrustumCullingState} from "./ViewFrustumCullingState";

export class ViewFrustumCullingManager {

    constructor(scene, sceneModel) {
        this.sceneModel = sceneModel;
        this.entities = [];
        this.meshes = [];
        this.finalized = false;
    }

    addEntity(entity) {
        if (this.finalized) {
            throw "Already finalized";
        }
        this.entities.push(entity);
    }

    addMesh(mesh) {
        if (this.finalized) {
            throw "Already finalized";
        }
        this.meshes.push(mesh);
    }

    finalize(fnForceFinalizeLayer) {
        if (this.finalized) {
            throw "Already finalized";
        }
        this.finalized = true;
        this.vfcState = new ViewFrustumCullingState();
        this.vfcState.initializeVfcState(this.entities, this.meshes);
        this.vfcState.finalize(this.sceneModel, fnForceFinalizeLayer);
        this._onSceneRendering = this.sceneModel.scene.on("rendering", () => this.applyViewFrustumCulling.call(this));
    }

    applyViewFrustumCulling() {
        if (!this.finalized) {
            throw "Not finalized";
        }
        this.vfcState.applyViewFrustumCulling(this.sceneModel);
    }

    destroy() {
        if (this.finalized) {
            this.sceneModel.off(this._onSceneRendering);
        }
    }
}


