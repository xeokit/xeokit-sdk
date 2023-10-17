import {LODState} from "./LODState.js";

/**
 * @private
 */
export class LODCullingManager {

    constructor(scene, sceneModel, lodLevels, targetFps) {
        this.id = sceneModel.id;
        this.scene = scene;
        this.sceneModel = sceneModel;
        this.lodState = new LODState(lodLevels, targetFps);
        this.lodState.initializeLodState(sceneModel);
    }

    /**
     * Cull any objects belonging to the current `LOD` level, and increase the `LOD` level.
     */
    _increaseLODLevelIndex() {
        const lodState = this.lodState;
        if (lodState.lodLevelIndex === lodState.primLODLevels.length) {
            return false;
        }
        const entitiesInLOD = lodState.entitiesInLOD [lodState.primLODLevels[lodState.lodLevelIndex]] || [];
        for (let i = 0, len = entitiesInLOD.length; i < len; i++) {
            entitiesInLOD[i].culledLOD = true;
        }
        lodState.lodLevelIndex++;
        return true;
    }

    /**
     * Un-cull any objects belonging to the current `LOD` level, and decrease the `LOD` level.
     */
    _decreaseLODLevelIndex() {
        const lodState = this.lodState;
        if (lodState.lodLevelIndex === 0) {
            return false;
        }
        const entitiesInLOD = lodState.entitiesInLOD [lodState.primLODLevels[lodState.lodLevelIndex - 1]] || [];
        for (let i = 0, len = entitiesInLOD.length; i < len; i++) {
            entitiesInLOD[i].culledLOD = false;
        }
        lodState.lodLevelIndex--;
        return true;
    }

    /**
     * Apply LOD culling.
     *
     * Will update LOD level, if needed, based on current FPS and target FPS,
     * and then will cull/uncull the needed objects according to the LOD level.
     *
     * @param {number} currentFPS The current FPS (frames per second)
     * @returns {boolean} Whether the LOD level was changed. This is, if some object was culled/unculled.
     */
    applyLodCulling(currentFPS) {
        let lodState = this.lodState;
        let retVal = false;
        if (currentFPS < lodState.targetFps) {
            if (++lodState.consecutiveFramesWithoutTargetFps > 2) {
                lodState.consecutiveFramesWithoutTargetFps = 0;
                retVal = this._increaseLODLevelIndex();
            }
        } else if (currentFPS > (lodState.targetFps + 4)) {
            if (++lodState.consecutiveFramesWithTargetFps > 2) {
                lodState.consecutiveFramesWithTargetFps = 0;
                retVal = this._decreaseLODLevelIndex();
            }
        }
        return retVal;
    }

    resetLodCulling() {
        let retVal = false;
        let decreasedLevel = false;
        do {
            retVal |= (decreasedLevel = this._decreaseLODLevelIndex());
        } while (decreasedLevel);
        return retVal;
    }
}
