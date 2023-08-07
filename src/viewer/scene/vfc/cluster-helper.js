/**
 * @author https://github.com/tmarti, with support from https://tribia.com/
 * @license MIT
 */

import {math} from "../math/math.js";
import {geometryCompressionUtils} from "../math/geometryCompressionUtils.js";
import {RBush3D} from "./rbush3d.js";

import {makeClusters} from "./xeokit-cluster.js"

export function clusterizeV2(entities, meshes) {
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
    const aabbsForIndexes = [];
    const instancedIndexes = [];

    const entityUsesInstancing = (entity) => {
        for (let i = 0, len = entity.meshIds.length; i < len; i++) {
            if (meshes[entity.meshIds[i]].geometryId) {
                return true;
            }
        }
        return false;
    }

    for (let i = 0; i < numEntities; i++) {
        const entity = entities[i];

        // TODO
        if (entityUsesInstancing(entity)) {
            instancedIndexes.push(i);
            continue;
        }

        const aabbEntity = math.collapseAABB3();
        let numPrimitives = 0

        entity.meshIds.forEach(meshId => {
            const mesh = meshes[meshId];
            let min;
            let max;
            if (mesh.positionsCompressed) {
                const bounds = geometryCompressionUtils.getPositionsBounds(mesh.positionsCompressed);
                min = geometryCompressionUtils.decompressPosition(bounds.min, mesh.positionsDecodeMatrix, []);
                max = geometryCompressionUtils.decompressPosition(bounds.max, mesh.positionsDecodeMatrix, []);
            } else {
                const bounds = geometryCompressionUtils.getPositionsBounds(mesh.positions);
                min = bounds.min;
                max = bounds.max;
            }
            min[0] += mesh.origin[0];
            min[1] += mesh.origin[1];
            min[2] += mesh.origin[2];
            max[0] += mesh.origin[0];
            max[1] += mesh.origin[1];
            max[2] += mesh.origin[2];
            math.expandAABB3Point3(aabbEntity, min);
            math.expandAABB3Point3(aabbEntity, max);
            numPrimitives += mesh.numPrimitives;
        });

        aabbsForIndexes [i] = {
            aabb: aabbEntity,
            numPrimitives,
            entityId: entity.id,
        };
    }

    let orderedEntityIds = [];
    let entityIdToClusterIdMapping = {};
    let rTreeBasedAabbTree;

    if (Object.keys(aabbsForIndexes).length > 0) {
        rTreeBasedAabbTree = generateAABB(aabbsForIndexes);
        let generateClustersResult = makeClusters({
            aabbTree: rTreeBasedAabbTree,
        });
        orderedEntityIds = generateClustersResult.orderedEntityIds;
        entityIdToClusterIdMapping = generateClustersResult.clusteringResult.entityIdToClusterIdMapping;
    }
    // console.log (generateClustersResult);
    return {
        orderedClusteredIndexes: orderedEntityIds,
        entityIdToClusterIdMapping: entityIdToClusterIdMapping,
        instancedIndexes: instancedIndexes,
        rTreeBasedAabbTree
    };
}

function generateAABB(aabbsForIndexes) {
    const aabbsToLoad = [];
    for (let i = 0, len = aabbsForIndexes.length; i < len; i++) {
        const item = aabbsForIndexes [i];
        if (!item) {
            continue;
        }
        aabbsToLoad.push({
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
                        numPrimitives: item.numPrimitives,
                    }
                ]
            },
            numPrimitives: item.numPrimitives,
        });
    }
    const aabbTree = new RBush3D(4);
    aabbTree.load(aabbsToLoad);
    return aabbTree;
}
