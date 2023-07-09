import {LodState} from "./LodState";

/**
 * Whether the FPS tracker was already installed.
 */
let attachedFPSTracker = false;

/**
 * The list of ````LodCullingManager````'s subscribed to FPS tracking.
 *
 * @type {Array <LodCullingManager>}
 */
const fpsTrackingManagers = [];

export class LodCullingManager {
    /**
     * @param {Scene} scene
     * @param {SceneModel} sceneModel
     * @param {Array<number>} lodLevels
     * @param {number} targetFps
     */
    constructor(scene, sceneModel, lodLevels, targetFps) {

        /**
         * {@link Scene}
         */
        this.scene = scene;

        /**
         * @type {SceneModel}
         */
        this.sceneModel = sceneModel;

        /**
         * @private
         */
        this.lodState = new LodState(lodLevels, targetFps);
        //  console.time("initializeLodState");
        this.lodState.initializeLodState(sceneModel);
        //    console.timeEnd("initializeLodState");
        attachFPSTracker(this.scene, this);
    }

    /**
     * Cull any objects belonging to the current `LOD` level, and increase the `LOD` level.
     *
     * @private
     */
    _increaseLODLevelIndex() {
        const lodState = this.lodState;
        if (lodState.lodLevelIndex === lodState.triangleLODLevels.length) {
            return false;
        }
        const entitiesInLOD = lodState.entitiesInLOD [lodState.triangleLODLevels[lodState.lodLevelIndex]] || [];
        for (let i = 0, len = entitiesInLOD.length; i < len; i++) {
            entitiesInLOD[i].culledLOD = true;
        }
        lodState.lodLevelIndex++;
        return true;
    }

    /**
     * Un-cull any objects belonging to the current `LOD` level, and decrease the `LOD` level.
     *
     * @private
     */
    _decreaseLODLevelIndex() {
        const lodState = this.lodState;
        if (lodState.lodLevelIndex === 0) {
            return false;
        }
        const entitiesInLOD = lodState.entitiesInLOD [lodState.triangleLODLevels[lodState.lodLevelIndex - 1]] || [];
        for (let i = 0, len = entitiesInLOD.length; i < len; i++) {
            entitiesInLOD[i].culledLOD = false;
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
    applyLodCulling(currentFPS) {
        let lodState = this.lodState;
        let retVal = false;
        if (currentFPS < lodState.targetFps) {
            if (++lodState.consecutiveFramesWithoutTargetFps > 0) {
                lodState.consecutiveFramesWithoutTargetFps = 0;
                retVal = this._increaseLODLevelIndex();
            }
        } else if (currentFPS > (lodState.targetFps + 4)) {
            if (++lodState.consecutiveFramesWithTargetFps > 1) {
                lodState.consecutiveFramesWithTargetFps = 0;
                retVal = this._decreaseLODLevelIndex();
            }
        }
        if (retVal) {
            //   console.log("LOD level = " + lodState.lodLevelIndex);
        }
        return retVal;
    }

    resetLodCulling() {
        let retVal = false;
        let decreasedLevel = false;
        do {
            retVal |= (decreasedLevel = this._decreaseLODLevelIndex());
        } while (decreasedLevel);
        if (retVal) {
            //console.log("LOD reset");
        }
        return retVal;
    }
}

/**
 *
 * @param {Scene} scene
 * @param {LodCullingManager} cullingManager
 */
function attachFPSTracker(scene, cullingManager) {
    if (!attachedFPSTracker) {
        attachedFPSTracker = true;

        const MAX_NUM_TICKS = 4;
        let tickTimeArray = new Array(MAX_NUM_TICKS);
        let numTick = 0;

        let currentFPS = -1;

        let preRenderTime = Date.now();
        let deltaTime = 0;

        scene.on("rendering", () => { // Apply LOD-culling before rendering the scene
            if (currentFPS === -1) {
                return;
            }
            for (let i = 0, len = fpsTrackingManagers.length; i < len; i++) {
                fpsTrackingManagers[i].applyLodCulling(currentFPS);
            }
        });

        // Once the scene has dispached the GL draw* commands, the rendering will
        // happen in asynchronous mode.

        // A way to measure the frame-rate, is the time that passes:
        // - since all render commands are sent to the GPU
        //   (the "scene.rendered" event)
        // - until the next animation-frame callback is called
        //   (when the callback passed to "requestAnimationFrame" is called)

        // One advantqage of this method is that the frame-rate tracking will
        // track mostly the GPU-time: if traditional mechanisms based on xeokit events
        // were used instead, the frame-rate counter would also measure possibly
        // the user-side code during dispatching of events.

        // This mechanism here is not ideal but at least makes sure to track the
        // frame-rate in such a way that is directly proportional to the time spent
        // drawing geometry on the GPU. And this makes the metric quite good for the
        // purpose of the LOD mechanism!

        scene.on("rendered", () => {
            preRenderTime = Date.now();

            window.requestAnimationFrame(() => {
                numTick++;
                const newTime = Date.now();
                deltaTime = newTime - preRenderTime;
                preRenderTime = newTime;
                tickTimeArray[numTick % MAX_NUM_TICKS] = deltaTime;
                let sumTickTimes = 0;
                if (numTick > MAX_NUM_TICKS) {
                    for (let i = 0; i < MAX_NUM_TICKS; i++) {
                        sumTickTimes += tickTimeArray[i];
                    }
                    currentFPS = MAX_NUM_TICKS / sumTickTimes * 1000;
                }
            });
        });

        // If the camera stays quiet for more than 3 scene ticks, completely
        // reset the LOD culling mechanism
        {
            let sceneTick = 0;

            let lastTickCameraMoved = sceneTick;

            scene.camera.on("matrix", () => {
                lastTickCameraMoved = sceneTick;
            });

            scene.on("tick", () => {
                if ((sceneTick - lastTickCameraMoved) > 3) {
                    for (let i = 0, len = fpsTrackingManagers.length; i < len; i++) {   // Call LOD-culling tasks
                        fpsTrackingManagers[i].resetLodCulling();
                    }
                }
                sceneTick++;
            });
        }
    }

    fpsTrackingManagers.push(cullingManager);
}

