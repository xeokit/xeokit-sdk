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
const planeOff  = math.vec3();

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
        let destroy = null;
        const dirtyMap = { };
        const prevIntersectionModelsMap = { };
        const sceneModelsData = { };
        const sectionPlanes = [ ];

        const deletePreviousModels = () => {
            for (const sceneModelId in prevIntersectionModelsMap) {
                const objects = prevIntersectionModelsMap[sceneModelId];
                objects.forEach((value, objectId) => {
                    if (dirtyMap[sceneModelId].get(objectId)) {
                        value.forEach(mesh => mesh.destroy());
                        prevIntersectionModelsMap[sceneModelId].delete(objectId);
                    }
                });
                if (prevIntersectionModelsMap[sceneModelId].size <= 0)
                    delete prevIntersectionModelsMap[sceneModelId];
            }
        };

        const setAllDirty = (value) => {
            for (const key in dirtyMap) {
                dirtyMap[key].forEach((_, key2) => dirtyMap[key].set(key2, value));
            }
        };

        this.destroy = () => {
            deletePreviousModels();
            destroy && destroy();
        };

        const doesPlaneIntersectBoundingBox = (bb, plane) => {
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
            ];

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
        };

        const isLoopInside = (loop1, loop2) => {
            // Simple point-in-polygon test using the first point of loop1
            const point = loop1[0][0];  // First point of first segment
            let inside = false;
            for (let i = 0, j = loop2.length - 1; i < loop2.length; j = i++) {
                const xi = loop2[i][0][0], yi = loop2[i][0][1];
                const xj = loop2[j][0][0], yj = loop2[j][0][1];

                if (((yi > point[1]) !== (yj > point[1]))
                    &&
                    (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)) { // if intersect
                    inside = !inside;
                }
            }
            return inside;
        };

        const projectTo2D = (point, normal) => {
            const u = math.normalizeVec3((Math.abs(normal[0]) > Math.abs(normal[1]))
                                         ? [-normal[2], 0, normal[0]]
                                         : [0, normal[2], -normal[1]]);
            return [
                math.dotVec3(point, u),
                math.dotVec3(point, math.normalizeVec3(math.cross3Vec3(normal, u, math.vec3())))
            ];
        };

        let updateTimeout = null;

        const update = () => {
            deletePreviousModels();
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                const sceneModels = Object.values(scene.models).filter(sceneModel => sceneModel.visible);
                sectionPlanes.forEach((plane) => {
                    if (plane.active) {
                        sceneModels.forEach((sceneModel) => {
                            if (doesPlaneIntersectBoundingBox(sceneModel.aabb, plane) && dirtyMap[sceneModel.id]) {
                                // calculating segments in unsorted way
                                // we calculate the segments by intersecting plane with each triangle
                                const unsortedSegments = new Map();
                                const objects = sceneModel.objects;
                                // Preallocate arrays for triangle vertices to avoid repeated allocation
                                const triangle = [
                                    math.vec3(),
                                    math.vec3(),
                                    math.vec3()
                                ];

                                dirtyMap[sceneModel.id].forEach((isDirty, objectId) => {
                                    if (isDirty) {
                                        const object = objects[objectId];
                                        if (doesPlaneIntersectBoundingBox(object.aabb, plane)) {
                                            if (! sceneModelsData[sceneModel.id]) {
                                                const aabb = sceneModel.aabb;
                                                sceneModelsData[sceneModel.id] = {
                                                    verticesMap: new Map(),
                                                    indicesMap:  new Map(),
                                                    // modelOrigin is critical to use when handling models with large coordinates.
                                                    // See XCD-306 and examples/slicing/SectionCaps_at_distance.html for more details.
                                                    modelOrigin: math.vec3([
                                                        (aabb[0] + aabb[3]) / 2,
                                                        (aabb[1] + aabb[4]) / 2,
                                                        (aabb[2] + aabb[5]) / 2
                                                    ])
                                                };
                                            }

                                            const modelData = sceneModelsData[sceneModel.id];
                                            const modelOrigin = modelData.modelOrigin;

                                            if (!modelData.verticesMap.has(objectId)) {
                                                const isSolid = object.meshes[0].isSolid();
                                                const vertices = [ ];
                                                const indices  = [ ];
                                                if (isSolid && object.capMaterial) {
                                                    object.getEachVertex(v => vertices.push(v[0]-modelOrigin[0], v[1]-modelOrigin[1], v[2]-modelOrigin[2]));
                                                    object.getEachIndex(i  => indices.push(i));
                                                }
                                                modelData.verticesMap.set(objectId, vertices);
                                                modelData.indicesMap.set(objectId, indices);
                                            }

                                            const vertices = modelData.verticesMap.get(objectId);
                                            const indices  = modelData.indicesMap.get(objectId);
                                            const planeDist = -math.dotVec3(math.subVec3(plane.pos, modelOrigin, tempVec3a), plane.dir);

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
                                                if (triangle[0][0] || triangle[0][1] || triangle[0][2]) {
                                                    const intersections = [];
                                                    for (let i = 0; i < 3; i++) {
                                                        const p1 = triangle[i];
                                                        const p2 = triangle[(i + 1) % 3];
                                                        const d1 = planeDist + math.dotVec3(plane.dir, p1);
                                                        const d2 = planeDist + math.dotVec3(plane.dir, p2);
                                                        if (d1 * d2 <= 0) {
                                                            intersections.push(math.lerpVec3(-d1 / (d2 - d1), 0, 1, p1, p2, math.vec3()));
                                                        }
                                                    }

                                                    if (intersections.length === 2)
                                                        capSegments.push(intersections);
                                                }
                                            }

                                            if (capSegments.length > 0) {
                                                unsortedSegments.set(objectId, capSegments);
                                            }
                                        }
                                    }
                                });

                                // sorting the segments
                                const orderedSegments = new Map();
                                unsortedSegments.forEach((unsortedSegment, segmentedId) => {
                                    const segments = [ [ unsortedSegment[0] ] ]; // an array of two vectors
                                    orderedSegments.set(segmentedId, segments);
                                    unsortedSegment.splice(0, 1);
                                    let index = 0;
                                    while (unsortedSegment.length > 0) {
                                        const curSegments = segments[index];
                                        const lastPoint = curSegments[curSegments.length - 1][1];

                                        let newSegment = null;
                                        for (let i = 0; i < unsortedSegment.length; i++) {
                                            const [start, end] = unsortedSegment[i];
                                            newSegment = ((pointsEqual(lastPoint, start) && [start, end])
                                                          ||
                                                          (pointsEqual(lastPoint, end)   && [end, start]));
                                            if (newSegment) {
                                                curSegments.push(newSegment);
                                                unsortedSegment.splice(i, 1);
                                                break;
                                            }
                                        }

                                        if (! newSegment) {
                                            if (pointsEqual(lastPoint, curSegments[0][0]) && (unsortedSegment.length > 1)) {
                                                segments.push([ unsortedSegments.get(segmentedId)[0] ]);
                                                unsortedSegment.splice(0, 1);
                                                index++;
                                            } else {
                                                // console.error(`Could not find a matching segment. Loop may not be closed. Key: ${key}`);
                                                break;
                                            }
                                        }
                                    }
                                });

                                // adding meshes to the scene
                                if (!prevIntersectionModelsMap[sceneModel.id])
                                    prevIntersectionModelsMap[sceneModel.id] = new Map();

                                // Cache plane direction values
                                math.mulVec3Scalar(plane.dir, 0.001, planeOff);

                                orderedSegments.forEach((orderedSegment, objectId) => {
                                    const loops = [];
                                    for (let i = 0; i < orderedSegment.length; i++) {
                                        loops.push([]);
                                        orderedSegment[i].forEach((seg) => {
                                            loops[i].push([
                                                projectTo2D(seg[0], plane.dir),
                                                projectTo2D(seg[1], plane.dir)
                                            ]);
                                        });
                                    }

                                    // creating caps using earcut and then projecting them back to 3D
                                    const modelOrigin = sceneModelsData[sceneModel.id].modelOrigin;

                                    // Group related loops (outer boundaries with their holes)
                                    const groupedLoops = [];
                                    const used = new Set();

                                    for (let i = 0; i < loops.length; i++) {
                                        if (! used.has(i)) {
                                            const group = [loops[i]];
                                            used.add(i);

                                            // Check remaining loops
                                            for (let j = i + 1; j < loops.length; j++) {
                                                if (! used.has(j)) {
                                                    if (isLoopInside(loops[i], loops[j]) || isLoopInside(loops[j], loops[i])) {
                                                        group.push(loops[j]);
                                                        used.add(j);
                                                    }
                                                }
                                            }

                                            groupedLoops.push(group);
                                        }
                                    }

                                    // Process each group separately
                                    const meshArray = groupedLoops.map((group, index) => {
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
                                        const capTriangles = [];

                                        // Process each triangle
                                        for (let i = 0; i < triangles.length; i += 3) {
                                            const triangle = [];

                                            // Convert each vertex
                                            for (let j = 0; j < 3; j++) {
                                                const idx = triangles[i + j] * 2;
                                                const point2D = [vertices[idx], vertices[idx + 1]];
                                                // Reconstruct the same basis vectors used in projectTo2D
                                                const planeDir = plane.dir;
                                                const planePos = plane.pos;

                                                const u = math.normalizeVec3((Math.abs(planeDir[0]) > Math.abs(planeDir[1]))
                                                                             ? [-planeDir[2], 0, planeDir[0]]
                                                                             : [0, planeDir[2], -planeDir[1]]);
                                                const v = math.normalizeVec3(math.cross3Vec3(planeDir, u, math.vec3()));

                                                // Reconstruct 3D point using the basis vectors
                                                const x = point2D[0];
                                                const y = point2D[1];
                                                const result = [
                                                    u[0] * x + v[0] * y,
                                                    u[1] * x + v[1] * y,
                                                    u[2] * x + v[2] * y
                                                ];

                                                // Project the point onto the cutting plane
                                                const t = math.dotVec3(planeDir, [
                                                    planePos[0] - result[0] - modelOrigin[0],
                                                    planePos[1] - result[1] - modelOrigin[1],
                                                    planePos[2] - result[2] - modelOrigin[2]
                                                ]);

                                                triangle.push([
                                                    result[0] + planeDir[0] * t,
                                                    result[1] + planeDir[1] * t,
                                                    result[2] + planeDir[2] * t
                                                ]);
                                            }

                                            capTriangles.push(triangle);
                                        }

                                        // converting caps to geometry
                                        // Create a vertex map to reuse vertices
                                        const vertexMap = new Map();
                                        const positions = [];
                                        const indices = [];
                                        let curVertexIndex = 0;

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
                                                    positions.push(vertex[0], vertex[1], vertex[2]);
                                                    vertexMap.set(vertexKey, curVertexIndex);
                                                    triangleIndices.push(curVertexIndex);
                                                    curVertexIndex++;
                                                }
                                            });

                                            // Add triangle indices
                                            indices.push(...triangleIndices);
                                        });

                                        // Build normals and UVs in parallel if possible
                                        const meshNormals = math.buildNormals(positions, indices);

                                        // create uvs
                                        const O = plane.pos;
                                        const D = tempVec3a;
                                        D.set(plane.dir);
                                        math.normalizeVec3(D);
                                        const P = tempVec3b;

                                        const uvs = [ ];
                                        for (let i = 0; i < positions.length; i += 3) {
                                            P[0] = positions[i]     + modelOrigin[0];
                                            P[1] = positions[i + 1] + modelOrigin[1];
                                            P[2] = positions[i + 2] + modelOrigin[2];

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

                                        // Create mesh with transformed positions
                                        return new Mesh(scene, {
                                            id: `${plane.id}-${objectId}-${index}`,
                                            geometry: new ReadableGeometry(scene, {
                                                primitive: 'triangles',
                                                positions: positions, // Only copy what we need
                                                indices,
                                                normals: meshNormals,
                                                uv: uvs
                                            }),
                                            origin:   math.addVec3(modelOrigin, planeOff, tempVec3a),
                                            position: [0, 0, 0],
                                            rotation: [0, 0, 0],
                                            material: sceneModel.objects[objectId].capMaterial
                                        });
                                    });

                                    if (prevIntersectionModelsMap[sceneModel.id].has(objectId)) {
                                        prevIntersectionModelsMap[sceneModel.id].get(objectId).push(...meshArray);
                                    }
                                    else
                                        prevIntersectionModelsMap[sceneModel.id].set(objectId, meshArray);
                                });
                            }
                        });
                    }
                });
                setAllDirty(false);
            }, 100);
        };

        this._onCapMaterialUpdated = (entityId, modelId) => {
            if (! destroy) {
                updateTimeout = null;

                const handleSectionPlane = (sectionPlane) => {
                    const onSectionPlaneUpdated = () => {
                        setAllDirty(true);
                        update();
                    };
                    sectionPlanes.push(sectionPlane);
                    sectionPlane.on('pos',    onSectionPlaneUpdated);
                    sectionPlane.on('dir',    onSectionPlaneUpdated);
                    sectionPlane.on('active', onSectionPlaneUpdated);
                    sectionPlane.once('destroyed', () => {
                        const idx = sectionPlanes.indexOf(sectionPlane);
                        if (idx >= 0) {
                            sectionPlanes.splice(idx, 1);
                            update();
                        }
                    });
                };

                for (const key in scene.sectionPlanes){
                    handleSectionPlane(scene.sectionPlanes[key]);
                }

                const onSectionPlaneCreated = scene.on('sectionPlaneCreated', handleSectionPlane);

                const onTick = scene.on("tick", () => {
                    //on ticks we only check if there is a model that we have saved vertices for,
                    //but it's no more available on the scene, or if its visibility changed
                    let dirty = false;
                    for (const sceneModelId in sceneModelsData) {
                        if (! scene.models[sceneModelId]){
                            delete sceneModelsData[sceneModelId];
                            dirty = true;
                        } else if (sceneModelsData[sceneModelId].visible !== (!!scene.models[sceneModelId].visible)) {
                            sceneModelsData[sceneModelId].visible = !!scene.models[sceneModelId].visible;
                            dirty = true;
                        }
                    }
                    if (dirty) {
                        update();
                    }
                });
                destroy = () => {
                    scene.off(onSectionPlaneCreated);
                    scene.off(onTick);
                };
            }

            if (! dirtyMap[modelId])
                dirtyMap[modelId] = new Map();

            dirtyMap[modelId].set(entityId, true);
            update();
        };
    }
}
export { SectionCaps };
