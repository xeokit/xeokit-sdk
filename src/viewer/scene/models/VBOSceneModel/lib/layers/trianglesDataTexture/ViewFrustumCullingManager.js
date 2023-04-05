import { clusterizeV2 } from "./cluster-helper.js";
import { math } from "../../../../../math/math.js";

// For JSDoc autocompletion
import { DataTexturePeformanceModel }  from "../../../DataTexturePeformanceModel.js"
import { RBush3D } from "./rbush3d.js";
import { VBOSceneModelNode } from "../../VBOSceneModelNode.js";

let tempVec3 = math.vec3 ();

/**
 * Number of bits per-dimension in the 2-dimensional LUT fast atan table
 */
const ATAN2_LUT_BITS = 9;

const ATAN2_FACTOR = 1 << (ATAN2_LUT_BITS - 1);

/**
 * Constant for quick conversion of radians to degrees
 */
const _180_DIV_MATH_PI = 180 / Math.PI;

const atan2LUT = new Float32Array ((1 << ATAN2_LUT_BITS) * (1 << ATAN2_LUT_BITS));

// Initialize the Look Up Table
for (let i = -ATAN2_FACTOR; i < ATAN2_FACTOR; i++)
{
    for (let j = -ATAN2_FACTOR; j < ATAN2_FACTOR; j++)
    {
        const index = ((i+ATAN2_FACTOR) << ATAN2_LUT_BITS) + (j+ATAN2_FACTOR);

        const max = Math.max (
            Math.abs (i),
            Math.abs (j)
        );

        atan2LUT [index] = Math.atan2 (
            i/max,
            j/max
        );
    }
}

/**
 * Fast ````Math.atan2```` implementation based in Look Up Tables.
 * 
 * @param {number} x 
 * @param {number} y 
 * 
 * @returns {number}
 */
function fastAtan2(x, y)
{
    const max_factor = ATAN2_FACTOR / Math.max (
        Math.abs (x),
        Math.abs (y)
    );

    const xx = Math.round (
        x * max_factor
    ) + (ATAN2_FACTOR - 1);

    const yy = Math.round (
        y * max_factor
    ) + (ATAN2_FACTOR - 1);

    return atan2LUT [(xx << ATAN2_LUT_BITS) + yy];
}

const VISIBILITY_CHECK_ALL_D = (1 << 0);
const VISIBILITY_CHECK_NONE_D = (1 << 1);
const VISIBILITY_CHECK_D_LESS = (1 << 2);
const VISIBILITY_CHECK_D_MORE = (1 << 3);

const VISIBILITY_CHECK_ALL_H = (1 << 4);
const VISIBILITY_CHECK_NONE_H = (1 << 5);
const VISIBILITY_CHECK_H_LESS = (1 << 6);
const VISIBILITY_CHECK_H_MORE = (1 << 7);

const VISIBILITY_CHECK_ALL_V = (1 << 8);
const VISIBILITY_CHECK_NONE_V = (1 << 9);
const VISIBILITY_CHECK_V_LESS = (1 << 10);
const VISIBILITY_CHECK_V_MORE = (1 << 11);

const VISIBILITY_CHECK_ENVOLVES_D = (1 << 12);
const VISIBILITY_CHECK_ENVOLVES_H = (1 << 13);
const VISIBILITY_CHECK_ENVOLVES_V = (1 << 14);

/**
 * Data structure containing pre-initialized `View Frustum Culling` data.
 * 
 * Will be used by the rest of `View Frustum Culling` related code.
 */
 class ViewFrustumCullingState {
    constructor () {
        /**
         * The pre-computed AABB tree that will be used for efficient View Frustum Culling.
         * 
         * @type {RBush3D}
         * @private
         */
        this._aabbTree = null;

        /**
         * @type {Array<{mesh: object, clusterNumber: number}>}
         * @private
         */
        this._orderedMeshList = [];

        /**
         * @type {Array<object>}
         * @private
         */
        this._orderedEntityList = [];

        /**
         * @private
         */
        this._frustumProps = {
            dirty: true,
            wMultiply: 1.0,
            hMultiply: 1.0,
        };

        /**
         * @private
         */
        this._cullFrame = 0;

        /**
         * @type {boolean}
         * @private
         */
        this.finalized = false;
    }

    /**
     * 
     * @param {Array<object>} entityList 
     * @param {Array<object>} meshList 
     */
    initializeVfcState (entityList, meshList) {
        if (this.finalized) {
            throw "Already finalized";
        }

        const clusterResult = clusterizeV2 (entityList, meshList);

        this._aabbTree = clusterResult.rTreeBasedAabbTree;

        for (let i = 0, len = clusterResult.orderedClusteredIndexes.length; i < len; i++)
        {
            const entityIndex = clusterResult.orderedClusteredIndexes[i];

            const clusterNumber = clusterResult.entityIdToClusterIdMapping[entityIndex];

            const entity = entityList[entityIndex];

            const newMeshIds = [];

            for (let j = 0, len2 = entity.meshIds.length; j < len2; j++)
            {
                const meshIndex = entity.meshIds[j];

                meshList[meshIndex].id = this._orderedMeshList.length;

                newMeshIds.push (this._orderedMeshList.length);

                this._orderedMeshList.push ({
                    clusterNumber: clusterNumber,
                    mesh: meshList[meshIndex]
                });
            }

            entity.meshIds = newMeshIds;

            this._orderedEntityList.push (
                entity
            );
        }

        for (let i = 0, len = clusterResult.instancedIndexes.length; i < len; i++) {
            const entityIndex = clusterResult.instancedIndexes[i];

            let entity = entityList[entityIndex];

            const newMeshIds = [];

            for (let j = 0, len2 = entity.meshIds.length; j < len2; j++)
            {
                const meshIndex = entity.meshIds[j];

                meshList[meshIndex].id = this._orderedMeshList.length;

                newMeshIds.push (this._orderedMeshList.length);

                this._orderedMeshList.push ({
                    clusterNumber: 99999,
                    mesh: meshList[meshIndex]
                });
            }

            entity.meshIds = newMeshIds;

            this._orderedEntityList.push (
                entity
            );
        }
    }

    /**
     * @param {DataTexturePeformanceModel} model
     * @param {*} fnForceFinalizeLayer 
     */
    finalize (model, fnForceFinalizeLayer) {
        if (this.finalized) {
            throw "Already finalized";
        }

        let lastClusterNumber = -1;

        for (let i = 0, len = this._orderedMeshList.length; i < len; i++) {
            const { clusterNumber, mesh } = this._orderedMeshList [i];

            if (lastClusterNumber != -1 && lastClusterNumber != clusterNumber) {
                fnForceFinalizeLayer.call (model);
            }

            model.createMesh (mesh);

            lastClusterNumber = clusterNumber;
        }

        // fnForceFinalizeLayer ();

        for (let i = 0, len = this._orderedEntityList.length; i < len; i++) {
            model.createEntity (this._orderedEntityList[i])
        }

        // Free memory
        this._orderedMeshList = [];
        this._orderedEntityList = [];

        this.finalized = true;
    }

    /**
     * @param {DataTexturePeformanceModel} model
     */
    applyViewFrustumCulling (model) {
        if (!this.finalized) {
            throw "Not finalized";
        }

        if (!this._aabbTree) {
            return;
        }
        
        if (!this._canvasElement) {
            /**
             * @type {HTMLCanvasElement}
             * @private
             */
            this._canvasElement = model.scene.canvas.canvas;
        }

        if (!this._camera) {
            this._camera = model.scene.camera;
        }

        this._ensureFrustumPropsUpdated ();

        this._initializeCullingDataIfNeeded (model);

        const visibleNodes = this._searchVisibleNodesWithFrustumCulling ();

        // console.log (`visibleNodes: ${visibleNodes.length} / ${this._internalNodesList.length}`);

        this._cullFrame++;

        this._markVisibleFrameOfVisibleNodes (
            visibleNodes,
            this._cullFrame
        );
        
        this._cullNonVisibleNodes (
            model,
            this._cullFrame
        );

        // console.log (`${numIntersectionChecks} intersection checks`);
    }

    _initializeCullingDataIfNeeded (model) {
        if (this._internalNodesList)
        {
            return;
        }

        if (!this._aabbTree) {
            return;
        }

        const allAabbNodes = this._aabbTree.all();

        let maxEntityId = 0;

        allAabbNodes.forEach (aabbbNode => {
            maxEntityId = Math.max (
                maxEntityId,
                aabbbNode.entity.id
            )
        });

        const internalNodesList = new Array(maxEntityId + 1);

        allAabbNodes.forEach (aabbbNode => {
            internalNodesList [
                aabbbNode.entity.id
            ] = model._nodes[aabbbNode.entity.xeokitId];
        });

        /**
         * @type {Array<VBOSceneModelNode>}
         * @private
         */
        this._internalNodesList = internalNodesList;

        /**
         * @private
         */
        this._lastVisibleFrameOfNodes = new Array (internalNodesList.length);

        this._lastVisibleFrameOfNodes.fill(0);
    }

    _searchVisibleNodesWithFrustumCulling() {
        return this._aabbTree.searchCustom(
            (bbox, isLeaf) => this._aabbIntersectsCameraFrustum (bbox, isLeaf),
            (bbox) => this._aabbContainedInCameraFrustum (bbox)
        )
    }

    _markVisibleFrameOfVisibleNodes (visibleNodes, cullFrame) {
        const lastVisibleFrameOfNodes = this._lastVisibleFrameOfNodes;

        for (let i = 0, len = visibleNodes.length; i < len; i++)
        {
            lastVisibleFrameOfNodes [visibleNodes[i].entity.id] = cullFrame;
        }
    }

    _cullNonVisibleNodes (model, cullFrame) {
        const internalNodesList = this._internalNodesList;
        const lastVisibleFrameOfNodes = this._lastVisibleFrameOfNodes;

        model.beginDeferredFlagsInAllLayers ();

        for (let i = 0, len = internalNodesList.length; i < len; i++)
        {
            if (internalNodesList[i]) {
                internalNodesList[i].culledVFC = lastVisibleFrameOfNodes[i] !== cullFrame;
            }
        }

        model.commitDeferredFlagsInAllLayers ();
    }

    /**
     * Returns all 8 coordinates of an AABB.
     * 
     * @param {Array<number>} bbox An AABB
     * 
     * @private
     */
    _getPointsForBBox (bbox) {
        var retVal = [];

        for (var i = 0; i < 8; i++)
        {
            retVal.push ([
                (i & 1) ? bbox.maxX : bbox.minX,
                (i & 2) ? bbox.maxY : bbox.minY,
                (i & 4) ? bbox.maxZ : bbox.minZ,
            ]);
        }

        return retVal;
    }

    /**
     * @param {*} bbox 
     * @param {*} isLeaf 
     * @returns 
     * 
     * @private
     */
    _aabbIntersectsCameraFrustum (bbox, isLeaf)
    {
        if (isLeaf) {
            return true;
        }

        if (this._camera.projection == "ortho") {
            // TODO: manage ortho views
            this._frustumProps.dirty = false;
            return true;
        }

        // numIntersectionChecks++;

        var check = this._aabbIntersectsCameraFrustum_internal (bbox);

        var interD = !(check & VISIBILITY_CHECK_ALL_D) && !(check & VISIBILITY_CHECK_NONE_D);
        var interH = !(check & VISIBILITY_CHECK_ALL_H) && !(check & VISIBILITY_CHECK_NONE_H);
        var interV = !(check & VISIBILITY_CHECK_ALL_V) && !(check & VISIBILITY_CHECK_NONE_V);

        if (((check & VISIBILITY_CHECK_ENVOLVES_D) || interD || (check & VISIBILITY_CHECK_ALL_D)) &&
            ((check & VISIBILITY_CHECK_ENVOLVES_H) || interH || (check & VISIBILITY_CHECK_ALL_H)) &&
            ((check & VISIBILITY_CHECK_ENVOLVES_V) || interV || (check & VISIBILITY_CHECK_ALL_V)))
        {
            return true;
        }
        
        return false;
    }

    /**
     * @param {*} bbox 
     * @returns 
     * 
     * @private
     */
    _aabbContainedInCameraFrustum (bbox)
    {
        if (this._camera.projection == "ortho") {
            // TODO: manage ortho views
            this._frustumProps.dirty = false;
            return true;
        }

        var check = bbox._check;

        return (check & VISIBILITY_CHECK_ALL_D) &&
               (check & VISIBILITY_CHECK_ALL_H) &&
               (check & VISIBILITY_CHECK_ALL_V);
    }

    /**
     * @private
     */
    _ensureFrustumPropsUpdated ()
    {
        // Assuming "min" for fovAxis
        const min = Math.min (
            this._canvasElement.width,
            this._canvasElement.height
        );

        this._frustumProps.wMultiply = this._canvasElement.width / min;
        this._frustumProps.hMultiply = this._canvasElement.height / min;
        
        const aspect = this._canvasElement.width / this._canvasElement.height;

        let fov = this._camera.perspective.fov;

        if (aspect < 1)
        {
            fov = fov / aspect;
        }

        fov = Math.min (fov, 120);

        this._frustumProps.fov = fov;
        
        // if (!this._frustumProps.dirty)
        // {
        //     return;
        // }

        this._frustumProps.forward = math.normalizeVec3 (
            math.subVec3 (
                this._camera.look,
                this._camera.eye,
                [ 0, 0, 0]
            ),
            [ 0, 0, 0]
        );

        this._frustumProps.up = math.normalizeVec3(
            this._camera.up,
            [ 0, 0, 0 ]
        );

        this._frustumProps.right = math.normalizeVec3 (
            math.cross3Vec3 (
                this._frustumProps.forward,
                this._frustumProps.up,
                [ 0, 0, 0]
            ),
            [ 0, 0, 0 ]
        );

        this._frustumProps.eye = this._camera.eye.slice ();

        this._frustumProps.CAM_FACTOR_1 = this._frustumProps.fov / 2 * this._frustumProps.wMultiply / _180_DIV_MATH_PI;
        this._frustumProps.CAM_FACTOR_2 = this._frustumProps.fov / 2 * this._frustumProps.hMultiply / _180_DIV_MATH_PI;

        // this._frustumProps.dirty = false;
    }

    /**
     * @param {*} bbox 
     * @returns 
     * 
     * @private
     */
    _aabbIntersectsCameraFrustum_internal (bbox)
    {
        var bboxPoints = bbox._points || this._getPointsForBBox (bbox);

        bbox._points = bboxPoints;
                    
        var retVal = 
            VISIBILITY_CHECK_ALL_D | VISIBILITY_CHECK_NONE_D |
            VISIBILITY_CHECK_ALL_H | VISIBILITY_CHECK_NONE_H |
            VISIBILITY_CHECK_ALL_V | VISIBILITY_CHECK_NONE_V;

        if (window._debug)
        {
            window._debug = false;

            debugger;
        }

        for (var i = 0, len = bboxPoints.length; i < len; i++) {
            // if ((!(retVal & VISIBILITY_CHECK_ALL_D) && !(retVal & VISIBILITY_CHECK_NONE_D)) ||
            //     (!(retVal & VISIBILITY_CHECK_ALL_H) && !(retVal & VISIBILITY_CHECK_NONE_H)) ||
            //     (!(retVal & VISIBILITY_CHECK_ALL_V) && !(retVal & VISIBILITY_CHECK_NONE_V)))
            // {
            //     break;
            // }

            var bboxPoint = bboxPoints [i];

            var pointRelToCam = tempVec3;

            pointRelToCam[0] = bboxPoint[0] - this._frustumProps.eye[0];
            pointRelToCam[1] = bboxPoint[1] - this._frustumProps.eye[1];
            pointRelToCam[2] = bboxPoint[2] - this._frustumProps.eye[2];

            var forwardComponent = math.dotVec3 (
                pointRelToCam,
                this._frustumProps.forward
            );

            if (forwardComponent < 0)
            {
                retVal |= VISIBILITY_CHECK_D_LESS;
                retVal &= ~VISIBILITY_CHECK_ALL_D;
            }
            else
            {
                retVal |= VISIBILITY_CHECK_D_MORE;
                retVal &= ~VISIBILITY_CHECK_NONE_D;
            }

            var rightComponent = math.dotVec3 (
                pointRelToCam,
                this._frustumProps.right
            );

            var rightAngle = fastAtan2 (
                rightComponent,
                forwardComponent
            );

            if (Math.abs (rightAngle) > this._frustumProps.CAM_FACTOR_1)
            {
                if (rightAngle < 0)
                    retVal |= VISIBILITY_CHECK_H_LESS;
                else
                    retVal |= VISIBILITY_CHECK_H_MORE;

                retVal &= ~VISIBILITY_CHECK_ALL_H;
            }
            else
            {
                retVal &= ~VISIBILITY_CHECK_NONE_H;
            }

            var upComponent = math.dotVec3 (
                pointRelToCam,
                this._frustumProps.up
            );

            var upAngle = fastAtan2 (
                upComponent,
                forwardComponent
            );

            if (Math.abs (upAngle) > this._frustumProps.CAM_FACTOR_2)
            {
                if (upAngle < 0)
                    retVal |= VISIBILITY_CHECK_V_LESS;
                else
                    retVal |= VISIBILITY_CHECK_V_MORE;

                retVal &= ~VISIBILITY_CHECK_ALL_V;
            }
            else
            {
                retVal &= ~VISIBILITY_CHECK_NONE_V;
            }
        }

        // console.log (retVal);
        
        if ((retVal & VISIBILITY_CHECK_D_LESS) && (retVal & VISIBILITY_CHECK_D_MORE))
        {
            retVal |= VISIBILITY_CHECK_ENVOLVES_D;    
        }

        if ((retVal & VISIBILITY_CHECK_H_LESS) && (retVal & VISIBILITY_CHECK_H_MORE))
        {
            retVal |= VISIBILITY_CHECK_ENVOLVES_H;    
        }

        if ((retVal & VISIBILITY_CHECK_V_LESS) && (retVal & VISIBILITY_CHECK_V_MORE))
        {
            retVal |= VISIBILITY_CHECK_ENVOLVES_V;    
        }

        bbox._check = retVal;

        // console.log (retVal);

        return retVal;
    }
}

class ViewFrustumCullingManager {
    /**
     * @param {DataTexturePeformanceModel} model
     */
    constructor (model) {
        /**
         * @private
         */
        this.model = model;

        /**
         * @private
         */
        this.entities = [];

        /**
         * @private
         */
        this.meshes = [];

        this.finalized = false;
    }

    /**
     */
    addEntity (entity) {
        if (this.finalized) {
            throw "Already finalized";
        }

        this.entities.push (entity);
    }

    /**
     */
    addMesh (mesh) {
        if (this.finalized) {
            throw "Already finalized";
        }

        this.meshes.push (mesh);
    }
    
    finalize (fnForceFinalizeLayer) {
        if (this.finalized) {
            throw "Already finalized";
        }
                
        this.finalized = true;

        /**
         * @private
         */
        this.vfcState = new ViewFrustumCullingState ();

        console.time ("initializeVfcState");
                 
        this.vfcState.initializeVfcState (this.entities, this.meshes);
                 
        console.timeEnd ("initializeVfcState");
         
        console.time ("finalizeVfcState");
                 
        this.vfcState.finalize (this.model, fnForceFinalizeLayer);
                 
        console.timeEnd ("finalizeVfcState");
        
        const self = this;

        const cb = () => this.applyViewFrustumCulling.call (self);

        this.model.scene.on ("rendering", cb);
    }

    /**
     * @private
     */
    applyViewFrustumCulling () {
        if (!(this.finalized)) {
            throw "Not finalized";
        }

        this.vfcState.applyViewFrustumCulling (this.model);
     }
}

export { ViewFrustumCullingManager }