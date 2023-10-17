import {math} from "../math/math.js";

/**
 * Data structure containing pre-initialized `LOD` data.
 *
 * Will be used by the rest of `LOD` related code.
 *
 * @private
 */

export class LODState {

    /**
     * @param {Array<number>} primLODLevels The primtive counts for the LOD levels, for example ```[ 2000, 600, 150, 80, 20 ]```
     * @param {number} targetFps The target FPS (_Frames Per Second_) for the dynamic culling of objects in the different LOD levels.
     */
    constructor(primLODLevels, targetFps) {

        /**
         * An array ordered DESC with the number of primtives allowed in each LOD bucket.
         *
         * @type {Array<number>}
         */
        this.primLODLevels = primLODLevels;

        /**
         * A computed dictionary for `primtive-number-buckets` where:
         * - key: the number of primtives allowed for the objects in the bucket.
         * - value: all PerformanceNodes that have the number of primtives or more.
         *
         * @type {Map<number, Array<DataTextureSceneModelNode>>}
         */
        this.entitiesInLOD = {};

        /**
         * A computed dictionary for `primtive-number-buckets` where:
         * - key: the number of primtives allowed for the objects in the bucket.
         * - value: the sum of primtives counts for all PeformanceNodes in the bucket.
         *
         * @type {Map<number, number>}
         */
        this.primCountInLOD = {};

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
     * @param {SceneModel} sceneModel
     */
    initializeLodState(sceneModel) {
        const entityList = Object.values(sceneModel.objects);
        if (entityList.length === 0) {
            return;
        }
        const neverCullTypesMap = sceneModel.scene.lod.neverCullTypesMap;
        const metaScene = sceneModel.scene.viewer.metaScene;
        const entitiesInLOD = {};
        const primCountInLOD = {};
        const maxSize = 20;
        const minComplexity = 25;

        for (let i = 0, len = entityList.length; i < len; i++) {
            const entity = entityList[i];
            const metaObject = metaScene.metaObjects[entity.id];
            if (metaObject && neverCullTypesMap[metaObject.type]) {
                continue;
            }
            const entityComplexity = entity.numPrimitives;
            const entitySize = math.getAABB3Diag(entity.aabb);
            // const isCullable = ((minComplexity <= entityComplexity) && (entitySize <= maxSize));
            // if (!isCullable) {
            //     continue;
            // }
            let lodLevel = 0, len;
            for (lodLevel = 0, len = this.primLODLevels.length; lodLevel < len; lodLevel++) {
                if (entity.numPrimitives >= this.primLODLevels [lodLevel]) {
                    break;
                }
            }
            const lodPrims = this.primLODLevels [lodLevel] || 0;
            if (!(lodPrims in entitiesInLOD)) {
                entitiesInLOD [lodPrims] = [];
            }
            entitiesInLOD [lodPrims].push(entity);
            if (!(lodPrims in primCountInLOD)) {
                primCountInLOD [lodPrims] = 0;
            }
            primCountInLOD [lodPrims] += entity.numPrimitives;
        }
        this.entitiesInLOD = entitiesInLOD;
        this.primCountInLOD = primCountInLOD;
    }
}