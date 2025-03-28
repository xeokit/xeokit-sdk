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

/**
 * @desc Implements hatching for Solid objects on a {@link Scene}.
 * 
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/slicing/SectionPlanesPlugin_Duplex_SectionCaps.html)]
 * 
 * ##Overview
 * 
 * The WebGL implementation for capping sliced 3D objects works by first calculating intersection segments where a cutting 
 * plane meets the object's edges. These segments form a contour that is triangulated using the Earcut algorithm, which 
 * handles any internal holes efficiently. The resulting triangulated cap is then integrated into the original mesh with 
 * appropriate normals and UVs.
 * 
 * ##Usage
 * 
 * In the example, we'll start by enabling readable geometry on the viewer.
 * 
 * Then we'll position the camera, and configure the near and far perspective and orthographic
 * clipping planes. Finally, we'll use {@link XKTLoaderPlugin} to load the Duplex model.
 * 
 * ````javascript
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true,
 *     readableGeometryEnabled: true
 * });
 * 
 * viewer.camera.eye = [-2.341298674548419, 22.43987089731119, 7.236688436028655];
 * viewer.camera.look = [4.399999999999963, 3.7240000000000606, 8.899000000000006];
 * viewer.camera.up = [0.9102954845584759, 0.34781746407929504, 0.22446635042673466];
 * 
 * const cameraControl = viewer.cameraControl;
 * cameraControl.navMode = "orbit";
 * cameraControl.followPointer = true;
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 * 
 * var t0 = performance.now();
 * 
 * document.getElementById("time").innerHTML = "Loading model...";
 * 
 * const sceneModel = xktLoader.load({
 *     id: "myModel",
 *     src: "../../assets/models/xkt/v10/glTF-Embedded/Duplex_A_20110505.glTFEmbedded.xkt",
 *     edges: true
 * });
 * 
 * sceneModel.on("loaded", () => {
 * 
 *     var t1 = performance.now();
 *     document.getElementById("time").innerHTML = "Model loaded in " + Math.floor(t1 - t0) / 1000.0 + " seconds<br>Objects: " + sceneModel.numEntities;
 * 
 *     //------------------------------------------------------------------------------------------------------------------
 *     // Add caps materials to all objects inside the loaded model that have an opacity equal to or above 0.7
 *     //------------------------------------------------------------------------------------------------------------------        
 *     const opacityThreshold = 0.7;
 *     const material = new PhongMaterial(viewer.scene,{
 *         diffuse: [1.0, 0.0, 0.0],
 *         backfaces: true
 *     });
 *     addCapsMaterialsToAllObjects(sceneModel, opacityThreshold, material);
 * 
 *     //------------------------------------------------------------------------------------------------------------------
 *     // Create a moving SectionPlane, that moves through the table models
 *     //------------------------------------------------------------------------------------------------------------------
 * 
 *     const sectionPlanes = new SectionPlanesPlugin(viewer, {
 *         overviewCanvasId: "mySectionPlanesOverviewCanvas",
 *         overviewVisible: true,
 *     });
 * 
 *     const sectionPlane = sectionPlanes.createSectionPlane({
 *         id: "mySectionPlane",
 *         pos: [0.5, 2.5, 5.0],
 *         dir: math.normalizeVec3([1.0, 0.01, 1])
 *     });
 * 
 *     sectionPlanes.showControl(sectionPlane.id);
 * 
 *     window.viewer = viewer;
 * 
 * });
 * 
 * function addCapsMaterialsToAllObjects(sceneModel, opacityThreshold, material) {
 *     const allObjects = sceneModel.objects;
 *     for(const key in allObjects){
 *         const object = allObjects[key];
 *         if(object.opacity >= opacityThreshold)
 *             object.capMaterial = material;
 *     }
 * }
 * ````
 */

class SectionCaps {
    /**
     * @constructor
     */
    constructor(scene) {
        this.scene = scene;
        this._resourcesAllocated = false;
    }

    _onCapMaterialUpdated(entityId, modelId) {
        if(!this._resourcesAllocated) {
            this._resourcesAllocated = true;
            this._sectionPlanes = [];
            this._sceneModelsData = {};
            this._dirtyMap = {};
            this._prevIntersectionModelsMap = {};
            this._sectionPlaneTimeout = null;
            this._updateTimeout = null;

            const handleSectionPlane = (sectionPlane) => {

                const onSectionPlaneUpdated = () => {
                    this._setAllDirty(true);
                    this._update();
                }
                this._sectionPlanes.push(sectionPlane);
                sectionPlane.on('pos', onSectionPlaneUpdated);
                sectionPlane.on('dir', onSectionPlaneUpdated);
                sectionPlane.on('active', onSectionPlaneUpdated);
                sectionPlane.once('destroyed', (() => {
                    const sectionPlaneId = sectionPlane.id;
                    if (sectionPlaneId) {
                        this._sectionPlanes = this._sectionPlanes.filter((sectionPlane) => sectionPlane.id !== sectionPlaneId);
                        this._update();
                    }
                }).bind(this));
            }

            for(const key in this.scene.sectionPlanes){
                handleSectionPlane(this.scene.sectionPlanes[key]);
            }

            this._onSectionPlaneCreated = this.scene.on('sectionPlaneCreated', handleSectionPlane)

            this._onTick = this.scene.on("tick", () => {
                //on ticks we only check if there is a model that we have saved vertices for,
                //but it's no more available on the scene, or if its visibility changed
                let dirty = false;
                for(const sceneModelId in this._sceneModelsData) {
                    if(!this.scene.models[sceneModelId]){
                        delete this._sceneModelsData[sceneModelId];
                        dirty = true;
                    } else if (this._sceneModelsData[sceneModelId].visible !== (!!this.scene.models[sceneModelId].visible)) {
                        this._sceneModelsData[sceneModelId].visible = !!this.scene.models[sceneModelId].visible;
                        dirty = true;
                    }
                }
                if (dirty) {
                    this._update();
                }
            })
        }

        if(!this._dirtyMap[modelId])
            this._dirtyMap[modelId] = new Map();

        this._dirtyMap[modelId].set(entityId, true);
        this._update();
    }

    _update() {
        clearTimeout(this._updateTimeout);
        this._deletePreviousModels();
        this._updateTimeout = setTimeout(() => {
            clearTimeout(this._updateTimeout);
            const sceneModels = Object.values(this.scene.models).filter(sceneModel => sceneModel.visible);
            this._addHatches(sceneModels, this._sectionPlanes.filter(sectionPlane => sectionPlane.active));
            this._setAllDirty(false);
        }, 100);
    }

    _setAllDirty(value) {
        for(const key in this._dirty) {
            this._dirtyMap[key].forEach((_, key2) => this._dirtyMap[key].set(key2, value));
        }
    }

    _addHatches(sceneModels, planes) {

        planes.forEach((plane) => {
            sceneModels.forEach((sceneModel) => {
                if(!this._doesPlaneIntersectBoundingBox(sceneModel.aabb, plane)) return;

                if(!this._dirtyMap[sceneModel.id]) return;

                //#region calculating segments in unsorted way
                //we calculate the segments by intersecting plane with each triangle
                const unsortedSegments = new Map();
                const objects = sceneModel.objects;
                // Preallocate arrays for triangle vertices to avoid repeated allocation
                const triangle = [
                    new Float32Array(3),
                    new Float32Array(3),
                    new Float32Array(3)
                ];

                this._dirtyMap[sceneModel.id].forEach((isDirty, objectId) => {
                    if (!isDirty) {
                        return;
                    }

                    const object = objects[objectId];

                    if(!this._doesPlaneIntersectBoundingBox(object.aabb, plane)) return;

                    if(!this._sceneModelsData[sceneModel.id]) {
                        this._sceneModelsData[sceneModel.id] = {
                            verticesMap: new Map(),
                            indicesMap:  new Map()
                        };
                    }

                    const sceneModelData = this._sceneModelsData[sceneModel.id];

                    if(!sceneModelData.verticesMap.has(objectId)) {
                        const isSolid = object.meshes[0].isSolid();
                        const vertices = [ ];
                        const indices  = [ ];
                        if(isSolid && object.capMaterial) {
                            object.getEachVertex(v => vertices.push(v[0], v[1], v[2]));
                            object.getEachIndex(i  => indices.push(i));
                        }
                        sceneModelData.verticesMap.set(objectId, vertices);
                        sceneModelData.indicesMap.set(objectId, indices);
                    }

                    const vertices = sceneModelData.verticesMap.get(objectId);
                    const indices  = sceneModelData.indicesMap.get(objectId);

                    const capSegments = [];
                    const vertCount = indices.length;

                    for (let i = 0; i < vertCount; i += 3) {
                        // Reuse triangle buffer instead of creating new arrays
                        for (let j = 0; j < 3; j++) {
                            const idx = indices[i + j] * 3;
                            triangle[j][0] = vertices[idx];
                            triangle[j][1] = vertices[idx + 1];
                            triangle[j][2] = vertices[idx + 2];
                        }
                        
                        // Early null check
                        if (!triangle[0][0] && !triangle[0][1] && !triangle[0][2]) continue;
                        
                        const intersections = [];
                        for (let i = 0; i < 3; i++) {
                            const p1 = triangle[i];
                            const p2 = triangle[(i + 1) % 3];

                            const d1 = plane.dist + math.dotVec3(plane.dir, p1);
                            const d2 = plane.dist + math.dotVec3(plane.dir, p2);

                            if (d1 * d2 > 0) continue;

                            const t = -d1 / (d2 - d1);

                            intersections.push(math.lerpVec3(t, 0, 1, p1, p2, math.vec3()));
                        }

                        if(intersections.length === 2) capSegments.push(intersections);
                    }

                    if (capSegments.length > 0) {
                        unsortedSegments.set(objectId, capSegments);
                    }
                })
                //#endregion

                //#region sorting the segments
                const orderedSegments = new Map();
                unsortedSegments.forEach((unsortedSegment, segmentedId) => {
                    orderedSegments.set(segmentedId, [
                        [
                            unsortedSegment[0] //this is also an array of two vectors
                        ]
                    ]);
                    unsortedSegment.splice(0, 1);
                    let index = 0;
                    while (unsortedSegment.length > 0) {
                        const lastPoint = orderedSegments.get(segmentedId)[index][orderedSegments.get(segmentedId)[index].length - 1][1];
                        let found = false;

                        for (let i = 0; i < unsortedSegment.length; i++) {
                            const [start, end] = unsortedSegment[i];
                            if (pointsEqual(lastPoint, start)) {
                                orderedSegments.get(segmentedId)[index].push(unsortedSegment[i]);
                                unsortedSegment.splice(i, 1);
                                found = true;
                                break;
                            } else if (pointsEqual(lastPoint, end)) {
                                orderedSegments.get(segmentedId)[index].push([end, start]);
                                unsortedSegment.splice(i, 1);
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            if (pointsEqual(lastPoint, orderedSegments.get(segmentedId)[index][0][0])) {
                                if (unsortedSegment.length > 1) {
                                    orderedSegments.get(segmentedId).push([
                                        unsortedSegments.get(segmentedId)[0]
                                    ]);
                                    unsortedSegment.splice(0, 1);
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
                //#endregion
                
                //#region projecting the segments to 2D
                const projectedSegments = new Map();
                orderedSegments.forEach((orderedSegment, key) => {
                    const arr = [];
                    for (let i = 0; i < orderedSegment.length; i++) {
                        arr.push([]);
                        orderedSegment[i].forEach((segment) => {
                            arr[i].push([
                                this._projectTo2D(segment[0], plane.dir),
                                this._projectTo2D(segment[1], plane.dir)
                            ])
                        })
                    }
                    projectedSegments.set(key, arr);
                })
                //#endregion
                
                //#region creating caps using earcut and then projecting them back to 3D
                const caps = new Map();
                let arr;
                projectedSegments.forEach((segment, segmentId) => {
                    arr = [];
                    const loops = segment;

                    // Group related loops (outer boundaries with their holes)

                    const groupedLoops = [];
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

                        groupedLoops.push(group);
                    }

                    // Process each group separately
                    groupedLoops.forEach(group => {
                        // Convert the segments into a flat array of vertices and find holes
                        const vertices = [];
                        const holes = [];
                        let currentIndex = 0;

                        // First, determine which loop has the largest area - this will be our outer boundary
                        const areas = group.map(loop => {
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
                        group[outerLoopIndex].forEach(segment => {
                            vertices.push(segment[0][0], segment[0][1]);
                            currentIndex += 2;
                        });

                        // Then add all other loops as holes
                        for (let i = 0; i < group.length; i++) {
                            if (i !== outerLoopIndex) {
                                // Store the starting vertex index for this hole
                                holes.push(currentIndex / 2);

                                group[i].forEach(segment => {
                                    vertices.push(segment[0][0], segment[0][1]);
                                    currentIndex += 2;
                                });
                            }
                        }

                        // Triangulate using earcut
                        const triangles = earcut(vertices, holes);

                        // // Convert triangulated 2D points back to 3D
                        const cap3D = [];

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

                            cap3D.push(triangle);
                        }
                        arr.push(cap3D);
                    });
                    caps.set(segmentId, arr);
                })
                //#endregion

                //#region converting caps to geometry
                const geometryData = new Map();

                caps.forEach((cap, capId) => {
                    arr = [];
                    cap.forEach(capTriangles => {
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

                    geometryData.set(capId, arr);
                })
                //#endregion

                //#region adding meshes to the scene
                if(!this._prevIntersectionModelsMap[sceneModel.id])
                    this._prevIntersectionModelsMap[sceneModel.id] = new Map();

                // Cache plane direction values
                const offsetX = plane.dir[0] * 0.001;
                const offsetY = plane.dir[1] * 0.001;
                const offsetZ = plane.dir[2] * 0.001;

                geometryData.forEach((geometries, objectId) => {
                    const meshArray = new Array(geometries.size); // Pre-allocate array with known size
                    let meshIndex = 0;

                    geometries.forEach((geometry, index) => {
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
                            id: `${plane.id}-${objectId}-${index}`,
                            geometry: new ReadableGeometry(this.scene, {
                                primitive: 'triangles',
                                positions: vertices, // Only copy what we need
                                indices,
                                normals: meshNormals,
                                uv: uvs
                            }),
                            position: [0, 0, 0],
                            rotation: [0, 0, 0],
                            material: sceneModel.objects[objectId].capMaterial
                        });
                    })
                    if(this._prevIntersectionModelsMap[sceneModel.id].has(objectId)) {
                        this._prevIntersectionModelsMap[sceneModel.id].get(objectId).push(...meshArray)
                    }
                    else
                        this._prevIntersectionModelsMap[sceneModel.id].set(objectId, meshArray);
                })
                //#endregion
            })
            
        })

    }

    _doesPlaneIntersectBoundingBox(bb, plane) {
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
            const distance = plane.dist + math.dotVec3(plane.dir, corner);

            if (distance > 0) hasPositive = true;
            if (distance < 0) hasNegative = true;

            // If we found points on both sides, the plane intersects the box
            if (hasPositive && hasNegative) return true;
        }

        // If all points are on the same side, no intersection
        return false;
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

    _isLoopInside(loop1, loop2) {
        // Simple point-in-polygon test using the first point of loop1
        const point = loop1[0][0];  // First point of first segment
        let inside = false;
        for (let i = 0, j = loop2.length - 1; i < loop2.length; j = i++) {
            const xi = loop2[i][0][0], yi = loop2[i][0][1];
            const xj = loop2[j][0][0], yj = loop2[j][0][1];

            const intersect = ((yi > point[1]) !== (yj > point[1]))
                && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
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
        if(this._resourcesAllocated) {
            this.scene.off(this._onModelLoaded);
            this.scene.off(this._onModelUnloaded);
            this.scene.off(this._onSectionPlaneCreated);
            this.scene.off(this._onTick);
        }
        
    }
}

export { SectionCaps };