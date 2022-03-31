/**
 * @author https://github.com/tmarti, with support from https://tribia.com/
 * @license MIT
 */

import {math} from "../../../../math/math.js";
import {geometryCompressionUtils} from "../../../../math/geometryCompressionUtils.js";
import {RBush3D} from "./rbush3d.js";

import {makeClusters} from "./xeokit-cluster.js"

function generateAABB (aabbsForIndexes) {
    const aabbsToLoad = [];
 
    for (let i = 0, len = aabbsForIndexes.length; i < len; i++) {
        const item = aabbsForIndexes [i];

        if (!item) {
            continue;
        }

        aabbsToLoad.push ({
            minX: item.aabb [0],
            minY: item.aabb [1],
            minZ: item.aabb [2],
            maxX: item.aabb [3],
            maxY: item.aabb [4],
            maxZ: item.aabb [5],
            entity: {
                id: i,
                xeokitId: item.entityId,
                meshes: [
                    {
                        numTriangles: item.numTriangles,
                    }
                ]
            },
            numTriangles: item.numTriangles,
        });
    }

    const aabbTree = new RBush3D (4);

    aabbTree.load (aabbsToLoad);

    return aabbTree;
}

function clusterizeV2 (entities, meshes) {
    // const meshesById = {};
    // meshes.forEach(mesh => meshesById[mesh.id] = mesh);

    // const positions = inflatedData.positions;
    // const indices = inflatedData.indices;
    // const meshPositions = inflatedData.meshPositions;
    // const meshIndices = inflatedData.meshIndices;
    // const entityMeshes = inflatedData.entityMeshes;
    // const entityMeshIds = inflatedData.entityMeshIds;
    // const entityUsesInstancing = inflatedData.entityUsesInstancing;
    
    // const numMeshes = meshPositions.length;
    // const numEntities = entityMeshes.length;

    const numMeshes = meshes.length;
    const numEntities = entities.length;

    const _aabbsForIndexes = [];
    const _instancedIndexes = [];

    function entityUsesInstancing (entity) {
        for (let i = 0, len = entity.meshIds.length; i < len; i++) {
            if (meshes[entity.meshIds[i]].geometryId) {
                return true;
            }
        }

        return false;
    };

    for (let i = 0; i < numEntities; i++) {
        const entity = entities[i];

        // TODO
        if (entityUsesInstancing (entity)) {
            _instancedIndexes.push (i);
            continue;
        }

        const aabbEntity = math.collapseAABB3();
        let numTriangles = 0

        entity.meshIds.forEach (meshId => {
            const mesh = meshes[meshId];
            
            const bounds = geometryCompressionUtils.getPositionsBounds(mesh.positions);

            const min = geometryCompressionUtils.decompressPosition(bounds.min, mesh.positionsDecodeMatrix, []);
            const max = geometryCompressionUtils.decompressPosition(bounds.max, mesh.positionsDecodeMatrix, []);

            min[0] += mesh.origin[0];
            min[1] += mesh.origin[1];
            min[2] += mesh.origin[2];

            max[0] += mesh.origin[0];
            max[1] += mesh.origin[1];
            max[2] += mesh.origin[2];

            math.expandAABB3Point3(aabbEntity, min);
            math.expandAABB3Point3(aabbEntity, max);

            numTriangles += Math.round (mesh.indices.length / 3);
        });

        _aabbsForIndexes [i] = {
            aabb: aabbEntity,
            numTriangles,
            entityId: entity.id,
        };
    }

    let _orderedEntityIds = [];
    let _entityIdToClusterIdMapping = {};
    let rTreeBasedAabbTree;

    if (Object.keys(_aabbsForIndexes).length > 0)
    {
        rTreeBasedAabbTree = generateAABB (_aabbsForIndexes);

        let generateClustersResult = makeClusters ({
            aabbTree: rTreeBasedAabbTree,
        });
        
        _orderedEntityIds = generateClustersResult.orderedEntityIds;
        _entityIdToClusterIdMapping = generateClustersResult.clusteringResult.entityIdToClusterIdMapping;
    }

    // console.log (generateClustersResult);

    return { 
        orderedClusteredIndexes: _orderedEntityIds,
        entityIdToClusterIdMapping: _entityIdToClusterIdMapping,
        instancedIndexes: _instancedIndexes,
        rTreeBasedAabbTree
    };
}

export {clusterizeV2}