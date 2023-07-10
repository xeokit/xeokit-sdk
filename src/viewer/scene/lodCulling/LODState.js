/**
 * Data structure containing pre-initialized `LOD` data.
 *
 * Will be used by the rest of `LOD` related code.
 *
 * @private
 */
export class LODState {

    /**
     * @param {Array<number>} lodLevels The triangle counts for the LOD levels, for example ```[ 2000, 600, 150, 80, 20 ]```
     * @param {number} targetFps The target FPS (_Frames Per Second_) for the dynamic culling of objects in the different LOD levels.
     */
    constructor(lodLevels, targetFps) {

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
         * @type {Map<number, Array<DataTextureSceneModelNode>>}
         */
        this.entitiesInLOD = {};

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
     * @param {SceneModel} sceneModel
     */
    initializeLodState(sceneModel) {
        const entityList = Object.values(sceneModel.objects);
        if (entityList.length === 0) {
            return;
        }
        const entitiesInLOD = {};
        const triangleCountInLOD = {};
        for (let i = 0, len = entityList.length; i < len; i++) {
            const entity = entityList[i];
            let lodLevel = 0, len;
            for (lodLevel = 0, len = this.triangleLODLevels.length; lodLevel < len; lodLevel++) {
                if (entity.numTriangles >= this.triangleLODLevels [lodLevel]) {
                    break;
                }
            }
            const lodPolys = this.triangleLODLevels [lodLevel] || 0;
            if (!(lodPolys in entitiesInLOD)) {
                entitiesInLOD [lodPolys] = [];
            }
            entitiesInLOD [lodPolys].push(entity);
            if (!(lodPolys in triangleCountInLOD)) {
                triangleCountInLOD [lodPolys] = 0;
            }
            triangleCountInLOD [lodPolys] += entity.numTriangles;
        }
        this.entitiesInLOD = entitiesInLOD;
        this.triangleCountInLOD = triangleCountInLOD;
    }
}