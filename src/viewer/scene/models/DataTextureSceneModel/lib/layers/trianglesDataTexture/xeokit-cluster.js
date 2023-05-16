/**
 * @author https://github.com/tmarti, with support from https://tribia.com/
 * @license MIT
 */

var makeClusters = function (inputData) {
    function countEntityTriangles (entity)
    {
        var numTriangles = 0;
    
        entity.meshes.forEach (function (mesh) {
            numTriangles += mesh.numTriangles;
        });
    
        return numTriangles;
    }
    
    function scanCellsForEntities (cellSideInMeters, entityFilterFunc)
    {
        var filterFunc = entityFilterFunc || function (entity) {
            return true;
        };
    
        var sizeX = inputData.aabbTree.data.maxX - inputData.aabbTree.data.minX;
        var sizeZ = inputData.aabbTree.data.maxZ - inputData.aabbTree.data.minZ;
    
        var numCellsPerAxisX = 10;
        var numCellsPerAxisZ = 10;
    
        var stepX = sizeX / numCellsPerAxisX;
        var stepZ = sizeZ / numCellsPerAxisZ;
    
        var cells = [];
    
        var x = inputData.aabbTree.data.minX;
    
        for (var i = 0; i < numCellsPerAxisX; i++, x += stepX)
        {
            var z = inputData.aabbTree.data.minZ;
    
            for (var j = 0; j < numCellsPerAxisZ; j++, z += stepZ)
            {
                cells.push ({
                    minX: x,
                    maxX: x+stepX,
                    minY: -100000000.0,
                    maxY:  100000000.0,
                    minZ: z,
                    maxZ: z+stepZ,
                    indexX: i,
                    indexZ: j,
                });
            }
        }
    
        var scanResult = {
            cellsByEntity: {},
            entitiesByCell: {},
            cellsX: numCellsPerAxisX,
            cellsZ: numCellsPerAxisZ,
        };
    
        (cells || []).forEach (function (cell) {
            inputData.aabbTree.search(
                cell
            ).filter (function (x) {
                return filterFunc (x.entity); 
            }).forEach (function (x) {
                var id = x.entity.id;
    
                scanResult.cellsByEntity [id] = scanResult.cellsByEntity [id] || {
                    cells: [],
                    entity: x.entity,
                };
    
                scanResult.cellsByEntity [id].cells.push (cell);
    
                var cellId = cell.indexX + "_" + cell.indexZ;
    
                scanResult.entitiesByCell [cellId] = scanResult.entitiesByCell [cellId] || {
                    entities: [],
                    cell: cell,
                };
    
                scanResult.entitiesByCell[cellId].entities.push (x.entity);
            });
        });
    
        return scanResult;
    }
    
    /**
     * Get maximum cells that clustered entities can use in order to make sure that at least
     * ```minPercentOfClusteredPolygons``` % polygons are clustered.
     * @param {float} minPercentOfClusteredPolygons 
     */
    function getMaxCellsPerEntity (
        minPercentOfClusteredPolygons,
        cellsByEntity)
    {
        var trianglesForEntityCellsCount = {};
        var totalTriangles = 0;
    
        Object.keys (cellsByEntity).forEach (function (entityId) {
            var entityCells = cellsByEntity[entityId].cells;
            var numCellsForEntity = entityCells.length;
            var entity = cellsByEntity[entityId].entity;
    
            var numTriangles = countEntityTriangles (entity);
    
            trianglesForEntityCellsCount [numCellsForEntity] =
                (trianglesForEntityCellsCount [numCellsForEntity] || 0) + numTriangles;
    
            totalTriangles += numTriangles;
        });
    
        var cellsCounts = Object.keys (trianglesForEntityCellsCount);
    
        cellsCounts.sort(function (a, b) {
            return a - b;
        });
    
        var cellCount = 0;
        var accum = 0.0;
    
        for (var i = 0; i < cellsCounts.length && accum < minPercentOfClusteredPolygons; i++)
        {
            cellCount = cellsCounts[i];
    
            accum += trianglesForEntityCellsCount[cellCount] / totalTriangles;
        }
    
        return {
            maxCellsPerEntity: cellCount,
            polygonStats: {
                percentClustered: accum,
                numberClustered: Math.round (accum * totalTriangles),
                numberUnclustered: totalTriangles - Math.round (accum * totalTriangles)    ,
            },
        };
    }
    
    function generateSpiralIndexes (sizeX, sizeY)
    {
        var state = {
            pos: {
                x: 0,
                y: 0,
            },
            left: 0,
            right: sizeX,
            top: 0,
            bottom: sizeY,
            dir: 0, // 0 right, 1 down, 2 left, 3 up 
        };
    
        function mustTurn ()
        {
            if (state.dir == 0 && (state.pos.x + 1) >= state.right)
                return true;
            
            if (state.dir == 1 && (state.pos.y + 1) >= state.bottom)
                return true;
    
            if (state.dir == 2 && (state.pos.x - 1) <= (state.left - 1))
                return true;
    
            if (state.dir == 3 && (state.pos.y - 1) <= (state.top -1))
                return true;
    
            return false;
        }
    
        function turn ()
        {
            state.dir = (state.dir + 1) % 4;
    
            if (state.dir == 0) state.left++;
            if (state.dir == 1) state.top++;
            if (state.dir == 2) state.right--;
            if (state.dir == 3) state.bottom--;
        }
    
        function advance ()
        {
            if (mustTurn ())
                turn ();
    
            if (state.dir == 0) state.pos.x++;
            if (state.dir == 1) state.pos.y++;
            if (state.dir == 2) state.pos.x--;
            if (state.dir == 3) state.pos.y--;
        }
    
        var retVal = [];
    
        for (var len = sizeX*sizeY; retVal.length < len; advance ())
        {
            retVal.push (
                state.pos.x + "_" + state.pos.y
            );
        }
    
        return retVal;
    }
    
    function getAllEntitesOnCell (cellId, maxCellsPerEntity, entitiesByCell, cellsByEntity)
    {
        var ebc = entitiesByCell [cellId] || {
            entities: [],
        };
    
        return ebc.entities.filter (function (entity) {
            return cellsByEntity [entity.id].cells.length <= maxCellsPerEntity;
        });
    }
    
    function generateEntityMappings (cellsX, cellsZ, maxCellsPerEntity, entitiesByCell, cellsByEntity, maxPolygonsPerCluster)
    {
        var processedEntities = {};
    
        // Create clusters for entities
        var previousState = {
            accumEntities: [],
        };
    
        var entityClusters = [];
    
        generateSpiralIndexes (
            cellsX,
            cellsZ
        ).forEach (function (cellId) {
            var entities = getAllEntitesOnCell (
                cellId,
                maxCellsPerEntity,
                entitiesByCell,
                cellsByEntity
            ).filter (function (entity) {
                return !(entity.id in processedEntities);
            });
            
            entities.forEach (function (entity) {
               processedEntities [entity.id] = true; 
            });
    
            entities.sort (function (e1, e2) {
                return countEntityTriangles(e1) - countEntityTriangles (e2);
            });
    
            var entitiesToProcess = previousState.accumEntities.concat(entities);
    
            var accumEntities = [];
    
            var remainingTriangles = maxPolygonsPerCluster;
    
            var i = 0;
            do {
                for (; i < entitiesToProcess.length; i++)
                {
                    var entity = entitiesToProcess [i];
                    var numTriangles = countEntityTriangles (entity);
    
                    if (numTriangles > remainingTriangles)
                    {
                        entityClusters.push (accumEntities);
                        accumEntities = [];
                        remainingTriangles = maxPolygonsPerCluster;
                    }
    
                    accumEntities.push (entity);
                    remainingTriangles -= numTriangles;
                }
            } while (i < entitiesToProcess.length);
    
            previousState.accumEntities = accumEntities;
        });
    
        if (previousState.accumEntities.length)
        {
            entityClusters.push (previousState.accumEntities);
        }
    
        // Create shared clusters for unclustered entities
        var unClusteredEntities = [];
    
        Object.keys (cellsByEntity).forEach (function (entityId) {
            if (!(entityId in processedEntities))
            {
                unClusteredEntities.push (cellsByEntity[entityId].entity);
            }
        });
        
        var remainingTriangles = maxPolygonsPerCluster;
        var accumEntities = [];
    
        unClusteredEntities.forEach (function (entity) {
            var numTriangles = countEntityTriangles (entity);
    
            if (numTriangles > remainingTriangles)
            {
                entityClusters.push (accumEntities);
                accumEntities = [];
                remainingTriangles = maxPolygonsPerCluster;
            }
    
            accumEntities.push (entity);
            remainingTriangles -= numTriangles;
        });
    
        if (accumEntities.length)
        {
            entityClusters.push (accumEntities);
        }
    
        // Prepare return value
        var entityIdToClusterIdMapping = {};
    
        entityClusters.forEach (function (cluster, clusterIndex) {
            cluster.forEach (function (entity) {
                entityIdToClusterIdMapping [entity.id] = clusterIndex;
            });
        });
    
        return {
            clusters: entityClusters,
            entityIdToClusterIdMapping: entityIdToClusterIdMapping,
        };
    }
    
    function generateClusters (cfg)
    {
        // console.time ("scanCells");
        var scanResult = scanCellsForEntities (
            cfg.cellSideInMeters,
            cfg.entityFilterFunc
        );
        // console.timeEnd ("scanCells");
    
        // console.time ("stats-max-cells");
        var maxCellsResult = getMaxCellsPerEntity(
            cfg.minPercentOfClustredPolygons,
            scanResult.cellsByEntity
        );
        // console.timeEnd ("stats-max-cells");
        // console.log (maxCellsResult);
    
        // console.time ("clustering");
        var clusteringResult = generateEntityMappings (
            scanResult.cellsX,
            scanResult.cellsZ,
            maxCellsResult.maxCellsPerEntity,
            scanResult.entitiesByCell,
            scanResult.cellsByEntity,
            cfg.maxPolygonsPerCluster
        );
        // console.timeEnd ("clustering");
    
        //console.log (clusteringResult);
    
        // var visibleClusters = {};
    
        // inputData.aabbTree.searchCustom(
        //     inputData._aabbIntersectsCameraFrustum,
        //     inputData._aabbContainedInCameraFrustum
        // ).forEach (function (aabb) {
        //     var clusterId = clusteringResult.entityIdToClusterIdMapping [aabb.entity.id];
    
        //     visibleClusters[clusterId] = true;
        // });
    
        return {
            clusters: {
                // visible: Object.keys (visibleClusters).length,
                total: clusteringResult.clusters.length,
            },
            clusteringResult: clusteringResult,
        };
    };
    
    var totalClusters = 0;
    // var totalVisibleClusters = 0;
    
    // console.time ("clustering");
    
    var generateClustersResult = generateClusters ({
        cellSideInMeters: 0.05,
        entityFilterFunc: function (entity) {
            return true;
        },
        maxPolygonsPerCluster: 90000,
        minPercentOfClustredPolygons: 0.9,
    });

    // totalVisibleClusters += generateClustersResult.clusters.visible;
    totalClusters += generateClustersResult.clusters.total;

    // console.timeEnd ("clustering");
    
    console.log ("Total clusters: " + totalClusters);

    // console.log (generateClustersResult);
    // console.log ("Total visible clusters: " + totalVisibleClusters);
    // console.log ("Visible clusters %: " + (totalVisibleClusters / totalClusters * 100).toFixed (2));

    var orderedEntityIds = [];

    generateClustersResult.clusteringResult.clusters.forEach (function (cluster) {
        cluster.forEach (function (item) {
            orderedEntityIds.push (item.id);
        });
    });

    generateClustersResult.orderedEntityIds = orderedEntityIds;

    return generateClustersResult;
};

export {makeClusters}