import { math } from "../math/math.js";
import { Mesh } from "../mesh/Mesh.js";
import { ReadableGeometry } from "../geometry/ReadableGeometry.js";
import { buildLineGeometry } from "../geometry/index.js";
import { PhongMaterial } from "../materials/PhongMaterial.js";
import earcut from '../libs/earcut.js';

const epsilon = 1e-6;
const worldUp    = [0, 1, 0];
const worldRight = [1, 0, 0];
const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();
const tempVec3d = math.vec3();

function pointsEqual(p1, p2) {
    return (
        Math.abs(p1[0] - p2[0]) < epsilon &&
        Math.abs(p1[1] - p2[1]) < epsilon &&
        Math.abs(p1[2] - p2[2]) < epsilon
    );
}

class SectionCaps {
    /**
     * @constructor
     */
    constructor(scene) {
        this.scene = scene;
        if (!this.scene.readableGeometryEnabled) {
            console.log('SectionCapsPlugin only works when readable geometry is enable on the viewer.');
            return;
        }
        this._sectionPlanes = [];
        this._sceneModel = [];
        this._verticesMap = {};
        this._indicesMap = {};
        this._dirtyMap = {};
        this._prevIntersectionModelsMap = {};
        this._sectionPlaneTimeout = null;
        this._updateTimeout = null;

        this._onSectionPlaneCreated = this.scene.on('sectionPlaneCreated', (sectionPlane) => {

            const onSectionPlaneUpdated = () => {
                this._setAllDirty(true);
                this._update();
            }
            this._sectionPlanes.push(sectionPlane);
            sectionPlane.on('pos', onSectionPlaneUpdated);
            sectionPlane.on('dir', onSectionPlaneUpdated);
            sectionPlane.once('destroyed', ((sectionPlane) => {
                const sectionPlaneId = sectionPlane.id;
                if (sectionPlaneId) {
                    this._sectionPlanes = this._sectionPlanes.filter((sectionPlane) => sectionPlane.id !== sectionPlaneId);
                    this._update();
                }
            }).bind(this));
        })

        this._onTick = this.scene.on("tick", () => {
            if(Object.keys(this._verticesMap).length === Object.keys(this.scene.models).length) return;
            for(const key in this._verticesMap) {
                if(!this.scene.models[key]){
                    delete this._verticesMap[key];
                    delete this._indicesMap[key];
                }
            }
            this._update();
        })
        
    }

    _onCapMaterialUpdated(entityId, modelId) {
        if(!this.scene.readableGeometryEnabled) return;
        if(!this._verticesMap[modelId]){
            this._verticesMap[modelId] = new Map();
            this._indicesMap[modelId] = new Map();
            this._dirtyMap[modelId] = new Map();
        }
        if(!this._verticesMap[modelId].has(entityId)) {
            const {vertices, indices} = this._getEntityVI(this.scene.models[modelId].objects[entityId]);
            this._verticesMap[modelId].set(entityId, vertices);
            this._indicesMap[modelId].set(entityId, indices);
        }
        this._dirtyMap[modelId].set(entityId, true);
        this._update();
    }

    _update() {
        clearTimeout(this._updateTimeout);
        this._deletePreviousModels();
        this._updateTimeout = setTimeout(() => {
            clearTimeout(this._updateTimeout);
            const sceneModels = Object.keys(this.scene.models).map((key) => this.scene.models[key]);
            this._addHatches(sceneModels, this._sectionPlanes);
            this._setAllDirty(false);
        }, 100);
    }

    _setAllDirty(value) {
        for(const key in this._dirty) {
            this._dirtyMap[key].forEach((_, key2) => this._dirtyMap[key].set(key2, value));
        }
    }

    _addHatches(sceneModels, planes) {

        if (planes.length <= 0) return;

        planes.forEach((plane) => {
            sceneModels.forEach((sceneModel) => {
                this._generateHatchesForModel(sceneModel, plane);
            })
        })

    }

    _generateHatchesForModel(sceneModel, plane) {
        //we create a plane equation that will be used to slice through each triangle
        const planeEquation = this._createPlaneEquation(plane.pos, plane.dir);

        if(!this._doesPlaneIntersectBoundingBox(sceneModel.aabb, planeEquation)) return;
        
        //we get the vertices and indices of each object in the scene model
        //the vertices and indices are structured in the same way as objects in the scene model
        if(this._verticesMap[sceneModel.id].size <=0 ) return;

        //we calculate the segments by intersecting plane each triangle
        const unsortedSegmentsMap = this._getIntersectionSegments(sceneModel, this._verticesMap[sceneModel.id], this._indicesMap[sceneModel.id], this._dirtyMap[sceneModel.id], planeEquation);
        const sortedSegmentsMap = this._sortAndCombineSegments(unsortedSegmentsMap);
        const projectedSegmentsMap = this._projectSegments(sortedSegmentsMap, plane.dir);
        const capsMap = this._createCaps(projectedSegmentsMap, plane);
        const geometriesMap = this._convertCapsToGeometry(capsMap);
        
        if(!this._prevIntersectionModelsMap[sceneModel.id])
            this._prevIntersectionModelsMap[sceneModel.id] = new Map();

        // Cache plane direction values
        const offsetX = plane.dir[0] * 0.001;
        const offsetY = plane.dir[1] * 0.001;
        const offsetZ = plane.dir[2] * 0.001;

        geometriesMap.forEach((value, key) => {
            const meshArray = new Array(value.size); // Pre-allocate array with known size
            let meshIndex = 0;

            value.forEach((geometry, index) => {
                const vertices = geometry.positions;
                const indices = geometry.indices;
                const verticesLength = vertices.length;

                for (let i = 0; i < verticesLength; i += 3) {
                    vertices[i] += offsetX;
                    vertices[i + 1] += offsetY;
                    vertices[i + 2] +=  offsetZ;
                }
                
                // Build normals and UVs in parallel if possible
                const meshNormals = math.buildNormals(vertices, indices);
                const uvs = this._createUVs(vertices, plane);
                
                // Create mesh with transformed vertices
                meshArray[meshIndex++] = new Mesh(this.scene, {
                    id: `${plane.id}-${key}-${index}`,
                    geometry: new ReadableGeometry(this.scene, {
                        primitive: 'triangles',
                        positions: vertices, // Only copy what we need
                        indices,
                        normals: meshNormals,
                        uv: uvs
                    }),
                    position: [0, 0, 0],
                    rotation: [0, 0, 0],
                    material: sceneModel.objects[key].capMaterial
                });
            })
            if(this._prevIntersectionModelsMap[sceneModel.id].has(key)) {
                this._prevIntersectionModelsMap[sceneModel.id].get(key).push(...meshArray)
            }
            else
                this._prevIntersectionModelsMap[sceneModel.id].set(key, meshArray);
        })
    }

    _createPlaneEquation(position, normal) {
        const A = normal[0];
        const B = normal[1];
        const C = normal[2];
        const D = -(A * position[0] + B * position[1] + C * position[2]);

        return { A, B, C, D }; // Return the plane equation
    }

    _getVI(sceneModel) {
        const objects = {};
        for (const key in sceneModel.objects) {

            const object = sceneModel.objects[key];
            const isSolid = object.meshes[0].layer.solid !== false;
            if (isSolid && object.capMaterial) {
                objects[key] = sceneModel.objects[key];
            }
        }

        let cloneModel = {
            ...sceneModel,
            objects: objects
        }

        return this._getVerticesAndIndices(cloneModel);
    }

    _getEntityVI(entity) {
        const vertices = [];
        const indices = [];
        const isSolid = entity.meshes[0].layer.solid !== false;
        if(isSolid && entity.capMaterial) {

            if (entity.meshes.length > 1) {
                let index = 0;
                entity.meshes.forEach((mesh) => {
                    if (mesh.layer.solid) {
                        vertices.push([]);
                        indices.push([]);
                        mesh.getEachVertex((v) => {
                            vertices[index].push(v[0], v[1], v[2]);
                        })
                        mesh.getEachIndex((_indices) => {
                            indices[index].push(_indices);
                        })
                        index++;
                    }

                })
            }
            else {
                entity.getEachVertex((_vertices) => {
                    vertices.push(_vertices[0], _vertices[1], _vertices[2]);
                })
                entity.getEachIndex((_indices) => {
                    indices.push(_indices);
                })
            }
        }
        return { vertices, indices };
    }

    _getIntersectionSegments(sceneModel, vertices, indices, dirty, planeEquation) {
        const unsortedSegments = new Map();
        const objects = sceneModel.objects;
        // Preallocate arrays for triangle vertices to avoid repeated allocation
        const triangle = [
            new Float32Array(3),
            new Float32Array(3),
            new Float32Array(3)
        ];

        vertices.forEach((value, key) => {
            if (!dirty.get(key)) {
                return;
            }

            if(!this._doesPlaneIntersectBoundingBox(objects[key].aabb, planeEquation)) return;
            
            const segment = this._processModel(value, indices.get(key), planeEquation, triangle);
            if (segment.length > 0) {
                unsortedSegments.set(key, segment);
            }
        })
        
        return unsortedSegments;
    }

    _doesPlaneIntersectBoundingBox(bb, planeEquation) {
        const min = [bb[0], bb[1], bb[2]];
        const max = [bb[3], bb[4], bb[5]];

        const corners = [
            [min[0], min[1], min[2]], // 000
            [max[0], min[1], min[2]], // 100
            [min[0], max[1], min[2]], // 010
            [max[0], max[1], min[2]], // 110
            [min[0], min[1], max[2]], // 001
            [max[0], min[1], max[2]], // 101
            [min[0], max[1], max[2]], // 011
            [max[0], max[1], max[2]]  // 111
        ]

        // Calculate distance from each corner to the plane
        let hasPositive = false;
        let hasNegative = false;

        for (const corner of corners) {
            const distance = planeEquation.A * corner[0] +
                planeEquation.B * corner[1] +
                planeEquation.C * corner[2] +
                planeEquation.D;

            if (distance > 0) hasPositive = true;
            if (distance < 0) hasNegative = true;

            // If we found points on both sides, the plane intersects the box
            if (hasPositive && hasNegative) return true;
        }

        // If all points are on the same side, no intersection
        return false;
    }
    
    _processModel(vertices, indices, planeEquation, triangleBuffer) {
        const capSegments = [];
        const vertCount = indices.length;
        
        // Preallocate intersection result array
        const intersection = new Float32Array(3);
        
        for (let i = 0; i < vertCount; i += 3) {
            // Reuse triangle buffer instead of creating new arrays
            this._fillTriangleBuffer(vertices, indices, i, triangleBuffer);
            
            // Early null check
            if (!triangleBuffer[0][0] && !triangleBuffer[0][1] && !triangleBuffer[0][2]) continue;
            
            const segment = this._sliceTriangle(planeEquation, triangleBuffer, intersection);
            if (segment) {
                capSegments.push(segment);
            }
        }
        
        return capSegments;
    }
    
    _fillTriangleBuffer(vertices, indices, startIndex, triangleBuffer) {
        for (let i = 0; i < 3; i++) {
            const idx = indices[startIndex + i] * 3;
            triangleBuffer[i][0] = vertices[idx];
            triangleBuffer[i][1] = vertices[idx + 1];
            triangleBuffer[i][2] = vertices[idx + 2];
        }
    }
    
    _sliceTriangle(plane, triangle, intersectionBuffer) {
        const intersections = [];
        // const t0 = performance.now();
        for (let i = 0; i < 3; i++) {
            const p1 = triangle[i];
            const p2 = triangle[(i + 1) % 3];
            
            // Inline the distance calculations to avoid function calls
            const d1 = plane.A * p1[0] + plane.B * p1[1] + plane.C * p1[2] + plane.D;
            const d2 = plane.A * p2[0] + plane.B * p2[1] + plane.C * p2[2] + plane.D;
            
            if (d1 * d2 > 0) continue;
            
            const t = -d1 / (d2 - d1);
            // Reuse intersection buffer
            intersectionBuffer[0] = p1[0] + t * (p2[0] - p1[0]);
            intersectionBuffer[1] = p1[1] + t * (p2[1] - p1[1]);
            intersectionBuffer[2] = p1[2] + t * (p2[2] - p1[2]);
            
            // Clone the buffer for storage
            intersections.push(new Float32Array(intersectionBuffer));
        }
        // const t1 = performance.now();
        // console.log('time taken in calculation: ', t1 - t0);
        
        return intersections.length === 2 ? intersections : null;
    }

    //not used but kept for debugging
    _buildLines(sortedSegments) {
        for (const key in sortedSegments) {
            for (let i = 0; i < sortedSegments[key].length; i++) {
                const segments = sortedSegments[key][i];
                if (segments.length <= 0) continue;
                segments.forEach((segment, index) => {
                    new Mesh(this.scene, {
                        clippable: false,
                        geometry: new ReadableGeometry(this.scene, buildLineGeometry({
                            startPoint: segment[0],
                            endPoint: segment[1],
                        })),
                        material: new PhongMaterial(this.scene, {
                            emissive: [1, 0, 0]
                        })
                    });
                })
            }

        }
    }

    _sortAndCombineSegments(segments) {

        const orderedSegments = new Map;
        segments.forEach((value, key) => {
            orderedSegments.set(key, [
                [
                    value[0] //this is also an array of two vectors
                ]
            ]);
            value.splice(0, 1);
            let index = 0;
            while (value.length > 0) {
                const lastPoint = orderedSegments.get(key)[index][orderedSegments.get(key)[index].length - 1][1];
                let found = false;

                for (let i = 0; i < value.length; i++) {
                    const [start, end] = value[i];
                    if (pointsEqual(lastPoint, start)) {
                        orderedSegments.get(key)[index].push(value[i]);
                        value.splice(i, 1);
                        found = true;
                        break;
                    } else if (pointsEqual(lastPoint, end)) {
                        orderedSegments.get(key)[index].push([end, start]);
                        value.splice(i, 1);
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    if (pointsEqual(lastPoint, orderedSegments.get(key)[index][0][0])) {
                        if (value.length > 1) {
                            orderedSegments.get(key).push([
                                segments.get(key)[0]
                            ]);
                            value.splice(0, 1);
                            index++;
                            continue;
                        }

                    }
                }

                if (!found) {
                    // console.error(`Could not find a matching segment. Loop may not be closed. Key: ${key}`);
                    break;
                }
            }
        })
        return orderedSegments;
    }

    _projectSegments(segments, normal) {
        const projectedSegments = new Map();

        segments.forEach((value, key) => {
            const arr = [];
            for (let i = 0; i < value.length; i++) {
                arr.push([]);
                value[i].forEach((segment) => {
                    arr[i].push([
                        this._projectTo2D(segment[0], normal),
                        this._projectTo2D(segment[1], normal)
                    ])
                })
            }
            projectedSegments.set(key, arr);
        })
        return projectedSegments;
    }

    _projectTo2D(point, normal) {
        let u;
        if (Math.abs(normal[0]) > Math.abs(normal[1]))
            u = [-normal[2], 0, normal[0]];
        else
            u = [0, normal[2], -normal[1]];

        u = math.normalizeVec3(u);
        const normalTemp = math.vec3(normal);
        const cross = math.cross3Vec3(normalTemp, u)
        const v = math.normalizeVec3(cross);
        const x = math.dotVec3(point, u);
        const y = math.dotVec3(point, v);

        return [x, y]

    }

    _createCaps(projectedSegments, plane) {
        const caps = new Map();
        let arr;
        projectedSegments.forEach((value, key) => {
            arr = [];
            const loops = value;

            // Group related loops (outer boundaries with their holes)
            const groupedLoops = this._groupRelatedLoops(loops);

            // Process each group separately
            groupedLoops.forEach(group => {
                // Convert the segments into a flat array of vertices and find holes
                const { vertices, holes } = this._prepareDataForEarcut(group);

                // Triangulate using earcut
                const triangles = earcut(vertices, holes);

                // // Convert triangulated 2D points back to 3D
                const cap3D = this._convertTrianglesTo3D(triangles, vertices, plane);
                arr.push(cap3D);
            });
            caps.set(key, arr);
        })

        return caps;
    }

    _groupRelatedLoops(loops) {
        const groups = [];
        const used = new Set();

        for (let i = 0; i < loops.length; i++) {
            if (used.has(i)) continue;

            const group = [loops[i]];
            used.add(i);

            // Check remaining loops
            for (let j = i + 1; j < loops.length; j++) {
                if (used.has(j)) continue;

                if (this._isLoopInside(loops[i], loops[j]) ||
                    this._isLoopInside(loops[j], loops[i])) {
                    group.push(loops[j]);
                    used.add(j);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    _isLoopInside(loop1, loop2) {
        // Simple point-in-polygon test using the first point of loop1
        const point = loop1[0][0];  // First point of first segment
        return this._isPointInPolygon(point, loop2);
    }

    _isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0][0], yi = polygon[i][0][1];
            const xj = polygon[j][0][0], yj = polygon[j][0][1];

            const intersect = ((yi > point[1]) !== (yj > point[1]))
                && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
    }


    _prepareDataForEarcut(loops) {
        const vertices = [];
        const holes = [];
        let currentIndex = 0;

        // First, determine which loop has the largest area - this will be our outer boundary
        const areas = loops.map(loop => {
            let area = 0;
            for (let i = 0; i < loop.length; i++) {
                const j = (i + 1) % loop.length;
                area += loop[i][0][0] * loop[j][0][1];
                area -= loop[j][0][0] * loop[i][0][1];
            }
            return Math.abs(area) / 2;
        });

        // Find index of the loop with maximum area
        const outerLoopIndex = areas.indexOf(Math.max(...areas));

        // Add the outer boundary first
        loops[outerLoopIndex].forEach(segment => {
            vertices.push(segment[0][0], segment[0][1]);
            currentIndex += 2;
        });

        // Then add all other loops as holes
        for (let i = 0; i < loops.length; i++) {
            if (i !== outerLoopIndex) {
                // Store the starting vertex index for this hole
                holes.push(currentIndex / 2);

                loops[i].forEach(segment => {
                    vertices.push(segment[0][0], segment[0][1]);
                    currentIndex += 2;
                });
            }
        }

        return { vertices, holes };
    }

    _convertTrianglesTo3D(triangles, vertices, plane) {
        const triangles3D = [];

        // Process each triangle
        for (let i = 0; i < triangles.length; i += 3) {
            const triangle = [];

            // Convert each vertex
            for (let j = 0; j < 3; j++) {
                const idx = triangles[i + j] * 2;
                const point2D = [vertices[idx], vertices[idx + 1]];
                const point3D = this._convertTo3D(point2D, plane);
                triangle.push(point3D);
            }

            triangles3D.push(triangle);
        }

        return triangles3D;
    }

    _convertTo3D(point2D, plane) {
        // Reconstruct the same basis vectors used in _projectTo2D
        let u, normal = plane.dir, planePosition = plane.pos;
        if (Math.abs(normal[0]) > Math.abs(normal[1])) {
            u = [-normal[2], 0, normal[0]];
        } else {
            u = [0, normal[2], -normal[1]];
        }

        u = math.normalizeVec3(u);
        const normalTemp = math.vec3(normal);
        const cross = math.cross3Vec3(normalTemp, u);
        const v = math.normalizeVec3(cross);

        // Reconstruct 3D point using the basis vectors
        const x = point2D[0];
        const y = point2D[1];
        const result = [
            u[0] * x + v[0] * y,
            u[1] * x + v[1] * y,
            u[2] * x + v[2] * y
        ];

        // Project the point onto the cutting plane
        // const d = -(normal[0] * result[0] + normal[1] * result[1] + normal[2] * result[2]);
        // const t = -d / (normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);

        const t = math.dotVec3(normal, [
            planePosition[0] - result[0],
            planePosition[1] - result[1],
            planePosition[2] - result[2]
        ]);

        return [
            result[0] + normal[0] * t,
            result[1] + normal[1] * t,
            result[2] + normal[2] * t
        ];
    }

    _convertCapsToGeometry(caps) {
        const geometryData = new Map();
        let arr;

        caps.forEach((value, key) => {
            arr = [];
            value.forEach(capTriangles => {
                // Create a vertex map to reuse vertices
                const vertexMap = new Map();
                const vertices = [];
                const indices = [];
                let currentIndex = 0;

                capTriangles.forEach(triangle => {
                    const triangleIndices = [];

                    // Process each vertex of the triangle
                    triangle.forEach(vertex => {
                        // Create a key for the vertex to check for duplicates
                        const vertexKey = `${vertex[0].toFixed(6)},${vertex[1].toFixed(6)},${vertex[2].toFixed(6)}`;

                        if (vertexMap.has(vertexKey)) {
                            // Reuse existing vertex
                            triangleIndices.push(vertexMap.get(vertexKey));
                        } else {
                            // Add new vertex
                            vertices.push(vertex[0], vertex[1], vertex[2]);
                            vertexMap.set(vertexKey, currentIndex);
                            triangleIndices.push(currentIndex);
                            currentIndex++;
                        }
                    });

                    // Add triangle indices
                    indices.push(...triangleIndices);
                });

                arr.push({
                    positions: vertices,
                    indices: indices
                });
            });

            geometryData.set(key, arr);
        })

        return geometryData;
    }

    _deletePreviousModels() {

        for(const sceneModelId in this._prevIntersectionModelsMap) {
            const objects = this._prevIntersectionModelsMap[sceneModelId];
            objects.forEach((value, objectId) => {
                if(this._dirtyMap[sceneModelId].get(objectId)) {
                    value.forEach((mesh) => {
                        mesh.destroy();
                    })
                    this._prevIntersectionModelsMap[sceneModelId].delete(objectId);
                }
            })
            if(this._prevIntersectionModelsMap[sceneModelId].size <= 0)
                delete this._prevIntersectionModelsMap[sceneModelId];

        }

    }

    _getVerticesAndIndices(sceneModel) {
        const vertices = {};
        const indices = {};
        const objects = sceneModel.objects;
        for (const key in objects) {
            const value = objects[key];
            vertices[key] = [];
            indices[key] = [];

            if (value.meshes.length > 1) {
                let index = 0;
                value.meshes.forEach((mesh) => {
                    if (mesh.layer.solid) {
                        vertices[key].push([]);
                        indices[key].push([]);
                        mesh.getEachVertex((v) => {
                            vertices[key][index].push(v[0], v[1], v[2]);
                        })
                        mesh.getEachIndex((_indices) => {
                            indices[key][index].push(_indices);
                        })
                        index++;
                    }

                })
            }
            else {
                value.getEachVertex((_vertices) => {
                    vertices[key].push(_vertices[0], _vertices[1], _vertices[2]);
                })
                value.getEachIndex((_indices) => {
                    indices[key].push(_indices);
                })
            }
        }
        return { vertices, indices };
    }

    _createUVs(vertices, plane) {
        const O = plane.pos;
        const D = tempVec3a;
        D.set(plane.dir);
        math.normalizeVec3(D);
        const P = tempVec3b;

        const uvs = [ ];
        for (let i = 0; i < vertices.length; i += 3) {
            P[0] = vertices[i];
            P[1] = vertices[i + 1];
            P[2] = vertices[i + 2];

            // Project P onto the plane
            const OP = math.subVec3(P, O, tempVec3c);
            const dist = math.dotVec3(OP, D);
            math.subVec3(P, math.mulVec3Scalar(D, dist, tempVec3c), P);

            const right = ((Math.abs(math.dotVec3(D, worldUp)) < 0.999)
                        ? math.cross3Vec3(D, worldUp, tempVec3c)
                        : worldRight);
            const v = math.cross3Vec3(D, right, tempVec3c);
            math.normalizeVec3(v, v);

            const OP_proj = math.subVec3(P, O, P);
            uvs.push(
                math.dotVec3(OP_proj, math.normalizeVec3(math.cross3Vec3(v, D, tempVec3d))),
                math.dotVec3(OP_proj, v));
        }
        return uvs;
    }

    destroy() {
        this._deletePreviousModels();
        this.scene.off(this._onModelLoaded);
        this.scene.off(this._onModelUnloaded);
        this.scene.off(this._onSectionPlaneCreated);
        this.scene.off(this._onTick);
    }
}

export { SectionCaps };