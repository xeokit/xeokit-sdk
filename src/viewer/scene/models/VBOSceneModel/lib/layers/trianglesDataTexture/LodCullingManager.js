import { DataTexturePeformanceModel }  from "../../../DataTexturePeformanceModel.js"

// For JSDoc autocompletion
import { VBOSceneModelNode } from "../../VBOSceneModelNode.js"
import { Scene } from "../../../../../scene/Scene.js"

/**
 * Wheter the FPS tracker was already installed.
 */
let _attachedFPSTracker = false;

/**
 * The list of ````LodCullingManager````'s subscribed to FPS tracking.
 * 
 * @type {Array <LodCullingManager>}
 */
const _fpsTrackingManagers = [];

/**
 * 
 * @param {Scene} scene 
 * @param {LodCullingManager} cullingManager
 */
function attachFPSTracker (scene, cullingManager) {   
    if (!_attachedFPSTracker) {
        _attachedFPSTracker = true;

        const MAX_NUM_TICKS = 10;
        let tickTimeArray = new Array (MAX_NUM_TICKS);
        let numTick = 0;

        let currentFPS = -1;

        scene.on ("tick", function (tickEvent) {
            let cullApplied = false;

            if (currentFPS != -1)
            {
                // Call LOD-culling tasks
                for (let i = 0, len = _fpsTrackingManagers.length; i < len; i++)
                {
                    cullApplied |= _fpsTrackingManagers[i].applyLodCulling (currentFPS);
                }
            }

            // If culling was applied, do not count this frame towards FPS stats
            if (cullApplied)
            {
                return;
            }

            tickTimeArray[numTick % MAX_NUM_TICKS] = tickEvent.deltaTime;

            let sumTickTimes = 0;

            if (numTick > MAX_NUM_TICKS)
            {
                for (let i = 0; i < MAX_NUM_TICKS; i++)
                {
                    sumTickTimes += tickTimeArray[i];
                }
        
                currentFPS = MAX_NUM_TICKS / sumTickTimes * 1000;
            }

            numTick++;
        });
    }

    _fpsTrackingManagers.push (cullingManager);
}

/**
 * Data structure containing pre-initialized `LOD` data.
 * 
 * Will be used by the rest of `LOD` related code.
 */
 class LodState {
    /**
     * @param {Array<number>} lodLevels The triangle counts for the LOD levels, for example ```[ 2000, 600, 150, 80, 20 ]```
     * @param {number} targetFps The target FPS (_Frames Per Second_) for the dynamic culling of objects in the different LOD levels.
     */
    constructor (lodLevels, targetFps) {
        /**
         * An array ordered DESC with the number of triangles allowed in each LOD bucket.
         * 
         * @type {Array<number>}
         */
        this.triangleLODLevels = lodLevels;

        /**
         * A computed dictionary for `triangle-number-buckets` where:
         * - key: the number of triangles allowed for the objects in the bucket.
         * - value: all PerformanceNodes that have the number of triangles or more.
         * 
         * @type {Map<number, Array<VBOSceneModelNode>>}
         */
        this.nodesInLOD = {};

        /**
         * A computed dictionary for `triangle-number-buckets` where:
         * - key: the number of triangles allowed for the objects in the bucket.
         * - value: the sum of triangles counts for all PeformanceNodes in the bucket.
         * 
         * @type {Map<number, number>}
         */
        this.triangleCountInLOD = {};

        /**
         * The target FPS for the `LOD` mechanism:
         * - if real FPS are below this number, the next `LOD` level will be applied.
         * 
         * - if real FPS are...
         *   - above this number plus a margin
         *   - and for some consecutive frames
         *  ... then the previous `LOD` level will be applied.
         * 
         * @type {number}
         */
        this.targetFps = targetFps;

        // /**
        //  * Not used at the moment.
        //  */
        // this.restoreTime = LOD_RESTORE_TIME;

        /**
         * Current `LOD` level. Starts at 0.
         * 
         * @type {number}
         */
        this.lodLevelIndex = 0;

        /**
         * Number of consecutive frames in current `LOD` level where FPS was above `targetFps`
         * 
         * @type {number}
         */
        this.consecutiveFramesWithTargetFps = 0;

        /**
         * Number of consecutive frames in current `LOD` level where FPS was below `targetFps`
         * 
         * @type {number}
         */
        this.consecutiveFramesWithoutTargetFps = 0;
    }

    /**
     * @param {DataTexturePeformanceModel} model
     */
    initializeLodState (model) {
        if (model._nodeList.length == 0)
        {
            return;
        }

        //      const LOD_LEVELS = [ 2000, 600, 150, 80, 20 ];
        //      const LOD_RESTORE_TIME = 600;
        //      const LOD_TARGET_FPS = 20;
        const nodeList = model._nodeList;
        
        let nodesInLOD = {};
        let triangleCountInLOD = {};

        for (let i = 0, len = nodeList.length; i < len; i++)
        {
            const node = nodeList[i];

            let lodLevel, len;

            for (lodLevel = 0, len = this.triangleLODLevels.length; lodLevel < len; lodLevel++)
            {
                if (node.numTriangles >= this.triangleLODLevels [lodLevel])
                {
                    break;
                }
            }

            var lodPolys = this.triangleLODLevels [lodLevel] || 0;

            if (!(lodPolys in nodesInLOD))
            {
                nodesInLOD [lodPolys] = [];
            }

            nodesInLOD [lodPolys].push (node);

            if (!(lodPolys in triangleCountInLOD))
            {
                triangleCountInLOD [lodPolys] = 0;
            }

            triangleCountInLOD [lodPolys] += node.numTriangles;
        }

        this.nodesInLOD = nodesInLOD;
        this.triangleCountInLOD = triangleCountInLOD;
    }
}

class LodCullingManager {
    /**
     * @param {DataTexturePeformanceModel} model 
     * @param {Array<number>} lodLevels 
     * @param {number} targetFps 
     */
    constructor (model, lodLevels, targetFps) {
        /**
         * @type {DataTexturePeformanceModel}
         */
        this.model = model;

        /**
         * @private
         */
        this.lodState = new LodState (
            lodLevels,
            targetFps
        );

        console.time ("initializeLodState");
        
        this.lodState.initializeLodState (model);
        
        console.timeEnd ("initializeLodState");

        attachFPSTracker (this.model.scene, this);
    }

    /** 
     * Cull any objects belonging to the current `LOD` level, and increase the `LOD` level.
     * 
     * @private
     */
    _increaseLODLevelIndex ()
    {
        const lodState = this.lodState;

        if (lodState.lodLevelIndex == lodState.triangleLODLevels.length)
        {
            return false;
        }

        const nodesInLOD = lodState.nodesInLOD [lodState.triangleLODLevels[lodState.lodLevelIndex]] || [];

        for (let i = 0, len = nodesInLOD.length; i < len; i++)
        {
            nodesInLOD[i].culledLOD = true;
        }

        lodState.lodLevelIndex++;

        return true;
    }

    /** 
     * Un-cull any objects belonging to the current `LOD` level, and decrease the `LOD` level.
     * 
     * @private
     */
    _decreaseLODLevelIndex ()
    {
        const lodState = this.lodState;

        if (lodState.lodLevelIndex == 0)
        {
            return false;
        }

        const nodesInLOD = lodState.nodesInLOD [lodState.triangleLODLevels[lodState.lodLevelIndex - 1]] || [];

        for (let i = 0, len = nodesInLOD.length; i < len; i++)
        {
            nodesInLOD[i].culledLOD = false;
        }

        lodState.lodLevelIndex--;

        return true;
    }

    /**
     * Apply LOD culling.
     * 
     * Will update LOD level, if needed, based in...
     * - current FPS
     * - target FPS
     * 
     * ... and then will cull/uncull the needed objects according to the LOD level.
     * 
     * @param {number} currentFPS The current FPS (frames per second)
     * @returns {boolean} Whether the LOD level was changed. This is, if some object was culled/unculled
     */
    applyLodCulling (currentFPS)
    {
        let lodState = this.lodState;
        const model = this.model;

        model.beginDeferredFlagsInAllLayers ();

        let retVal = false;

        if (currentFPS < lodState.targetFps)
        {
            if (++lodState.consecutiveFramesWithoutTargetFps > 8)
            {
                lodState.consecutiveFramesWithoutTargetFps = 0;
                retVal = this._increaseLODLevelIndex();
            }
        }
        else if (currentFPS > (lodState.targetFps + 4))
        {
            if (++lodState.consecutiveFramesWithTargetFps > 20)
            {
                lodState.consecutiveFramesWithTargetFps = 0;
                retVal = this._decreaseLODLevelIndex();
            }
        }

        model.commitDeferredFlagsInAllLayers ();

        if (retVal) {
            console.log ("LOD level = " + lodState.lodLevelIndex);
        }

        return retVal;
    }
}

export { LodCullingManager }