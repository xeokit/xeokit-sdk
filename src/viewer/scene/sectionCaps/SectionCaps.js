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

const triangle = [ math.vec3(), math.vec3(), math.vec3() ];

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
        const modelCaches = { };
        const sectionPlanes = [ ];

        this.destroy = () => destroy && destroy();

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

        const ccw = (a, b, c) => ((c[1] - a[1]) * (b[0] - a[0])) > ((b[1] - a[1]) * (c[0] - a[0]));

        const isLoopInside = (inner, outer) => {
            const bbI = inner.boundingBox;
            const bbO = outer.boundingBox;
            if ((bbI[0] < bbO[0]) || (bbI[1] < bbO[1]) || (bbI[2] > bbO[2]) || (bbI[3] > bbO[3])) {
                return false;
            }

            const innerEndpoints = inner.endPoints;
            const outerEndpoints = outer.endPoints;
            for (let ii = 0, ij = innerEndpoints.length - 1; ii < innerEndpoints.length; ij = ii++) {
                const i0 = innerEndpoints[ii];
                const [i0x, i0y] = i0;
                const i1 = innerEndpoints[ij];

                let inside = false;
                for (let i = 0, j = outerEndpoints.length - 1; i < outerEndpoints.length; j = i++) {
                    const o0 = outerEndpoints[i];
                    const o1 = outerEndpoints[j];

                    if ((ccw(i0, o0, o1) !== ccw(i1, o0, o1)) && (ccw(i0, i1, o0) !== ccw(i0, i1, o1))) {
                        return false; // segments intersect
                    }

                    const [o0x, o0y] = o0;
                    const [o1x, o1y] = o1;

                    const dx = i0x - o0x;
                    const dy = i0y - o0y;

                    const oDx = o1x - o0x;
                    const oDy = o1y - o0y;

                    const dot = (Math.abs(oDx * dy - oDy * dx) < 1e-10) ? (dx * oDx + dy * oDy) : -1;
                    if ((dot >= 0) && (dot <= (Math.pow(oDx, 2) + Math.pow(oDy, 2)))) {
                        return false; // on edge
                    }

                    if (((o0y > i0y) !== (o1y > i0y)) && (dx < (dy * oDx / oDy))) {
                        inside = !inside;
                    }
                }
                if (! inside) {
                    return false;
                }
            }

            return true;
        };

        let updateTimeout = null;

        const update = () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                const visibleSceneModels = Object.values(scene.models).filter(sceneModel => (sceneModel.id in modelCaches) && sceneModel.visible);
                sectionPlanes.forEach((plane) => {
                    if (plane.active) {
                        const planeDir = plane.dir;
                        const planePos = plane.pos;
                        const planeU = math.normalizeVec3(math.vec3((Math.abs(planeDir[0]) > Math.abs(planeDir[1]))
                                                                    ? [-planeDir[2], 0, planeDir[0]]
                                                                    : [0, planeDir[2], -planeDir[1]]));
                        const planeV = math.normalizeVec3(math.cross3Vec3(planeDir, planeU, math.vec3()));
                        const projectToPlane2D = point => [ math.dotVec3(planeU, point), math.dotVec3(planeV, point) ];

                        visibleSceneModels.forEach(sceneModel => {
                            const modelAABB = sceneModel.aabb;
                            if (doesPlaneIntersectBoundingBox(modelAABB, plane)) {
                                // modelCenter is critical to use when handling models with large coordinates.
                                // See XCD-306 and examples/slicing/SectionCaps_at_distance.html for more details.
                                const modelCenter = math.getAABB3Center(modelAABB, math.vec3());
                                const planeDist = math.dotVec3(planeDir, math.subVec3(modelCenter, planePos, tempVec3a));

                                modelCaches[sceneModel.id].entityCaches.forEach((entityCache, entityId) => {
                                    const entity = sceneModel.objects[entityId];
                                    if (entityCache.generateCaps && entity.capMaterial && doesPlaneIntersectBoundingBox(entity.aabb, plane)) {
                                        entityCache.meshCaches ||= entity.meshes.filter(mesh => mesh.isSolid()).map(mesh => {
                                            const indices  = [ ];
                                            const vertices = [ ];
                                            mesh.getEachIndex(i  => indices.push(i));
                                            mesh.getEachVertex(v => vertices.push(...math.subVec3(v, modelCenter, tempVec3a)));
                                            return { mesh: mesh, indices: indices, vertices: vertices };
                                        });

                                        entityCache.meshCaches.filter(meshCache => doesPlaneIntersectBoundingBox(meshCache.mesh.aabb, plane)).forEach(meshCache => {
                                            const indices  = meshCache.indices;
                                            const vertices = meshCache.vertices;

                                            const unsortedSegment = [];
                                            const setVertex = (i, dst) => {
                                                const idx = indices[i] * 3;
                                                dst[0] = vertices[idx + 0];
                                                dst[1] = vertices[idx + 1];
                                                dst[2] = vertices[idx + 2];
                                                return dst;
                                            };

                                            for (let i = 0; i < indices.length; i += 3) {
                                                const p0 = setVertex(i + 0, triangle[0]);
                                                const p1 = setVertex(i + 1, triangle[1]);
                                                const p2 = setVertex(i + 2, triangle[2]);

                                                if (math.compareVec3(p0, p1) || math.compareVec3(p1, p2) || math.compareVec3(p2, p0)) {
                                                    continue; // skip degenerate triangle
                                                }

                                                const d0 = planeDist + math.dotVec3(planeDir, p0);
                                                const d1 = planeDist + math.dotVec3(planeDir, p1);
                                                const d2 = planeDist + math.dotVec3(planeDir, p2);

                                                if ((d0 !== 0) || (d1 !== 0) || (d2 !== 0)) {
                                                    const i01 = (d0 * d1 <= 0) && math.lerpVec3(d0 / (d0 - d1), 0, 1, p0, p1, math.vec3());
                                                    const i12 = (d1 * d2 <= 0) && math.lerpVec3(d1 / (d1 - d2), 0, 1, p1, p2, math.vec3());
                                                    const i20 = (d2 * d0 <= 0) && math.lerpVec3(d2 / (d2 - d0), 0, 1, p2, p0, math.vec3());

                                                    if (i01 ? (i12 || i20) : (i12 && i20)) { // triangle intersected by the section plane
                                                        unsortedSegment.push(i01 ? [ i01, i12 || i20 ] : [ i12, i20 ]);
                                                    }
                                                }
                                            }

                                            if (unsortedSegment.length > 0) {
                                                // sorting the segments
                                                const endpointLoops = [ ];
                                                let firstStart = unsortedSegment[0][0];
                                                endpointLoops.push([ unsortedSegment[0][1] ]);
                                                unsortedSegment.splice(0, 1);
                                                while (unsortedSegment.length > 0) {
                                                    const curEndpoints = endpointLoops[endpointLoops.length - 1];
                                                    const lastPoint = curEndpoints[curEndpoints.length - 1];
                                                    const closest = { distSq: window.Infinity, idx: -1, side: -1 };
                                                    unsortedSegment.forEach((seg, i) => {
                                                        const distSq0 = math.sqLenVec3(math.subVec3(seg[0], lastPoint, tempVec3a));
                                                        const distSq1 = math.sqLenVec3(math.subVec3(seg[1], lastPoint, tempVec3a));
                                                        const distSq = Math.min(distSq0, distSq1);
                                                        if (closest.distSq > distSq) {
                                                            closest.distSq = distSq;
                                                            closest.idx = i;
                                                            closest.side = (distSq1 < distSq0) ? 1 : 0;
                                                        }
                                                    });

                                                    const next = unsortedSegment[closest.idx];
                                                    if (pointsEqual(lastPoint, next[closest.side])) {
                                                        curEndpoints.push(next[1 - closest.side]);
                                                        unsortedSegment.splice(closest.idx, 1);
                                                    } else if (pointsEqual(lastPoint, firstStart) && (unsortedSegment.length > 1)) {
                                                        firstStart = unsortedSegment[0][0];
                                                        endpointLoops.push([ unsortedSegment[0][1] ]);
                                                        unsortedSegment.splice(0, 1);
                                                    } else {
                                                        // console.error(`Could not find a matching segment. Loop may not be closed. Key: ${key}`);
                                                        break;
                                                    }
                                                }

                                                const loops = endpointLoops.filter(endPoints => endPoints.length > 2).map((endPoints, idx) => {
                                                    const planeEndpoints = endPoints.map(projectToPlane2D);
                                                    let doubleArea = 0;
                                                    const aabb = math.collapseAABB2(math.AABB2());
                                                    for (let i = 0; i < planeEndpoints.length; i++) {
                                                        const p0 = planeEndpoints[i];
                                                        math.expandAABB2Point2(aabb, p0);
                                                        const p1 = planeEndpoints[(i + 1) % planeEndpoints.length];
                                                        doubleArea += (p0[0] * p1[1] - p1[0] * p0[1]);
                                                    }
                                                    return {
                                                        boundingBox: aabb,
                                                        doubleArea: Math.abs(doubleArea),
                                                        endPoints: planeEndpoints
                                                    };
                                                }).sort((a, b) => b.doubleArea - a.doubleArea);

                                                while (loops.length > 0) {
                                                        const vertices = [ ];
                                                        const appendLoopVertices = loop => loop.endPoints.forEach(p => vertices.push(p[0], p[1]));

                                                        const outerLoop = loops.shift();
                                                        appendLoopVertices(outerLoop);

                                                        const innerLoops = [ ];
                                                        for (let i = 0; i < loops.length; ) {
                                                            const loop = loops[i];
                                                            if (isLoopInside(loop, outerLoop) && innerLoops.every(inner => !isLoopInside(loop, inner))) {
                                                                loop.index = vertices.length / 2;
                                                                appendLoopVertices(loop);
                                                                innerLoops.push(loop);
                                                                loops.splice(i, 1);
                                                            } else {
                                                                ++i;
                                                            }
                                                        }

                                                        // Triangulate
                                                        const triangles = earcut(vertices, innerLoops.map(loop => loop.index));

                                                        const positions = [];
                                                        const indices = [];
                                                        const uvs = [ ];
                                                        let curVertexIndex = 0;

                                                        // Convert triangulated 2D points back to 3D
                                                        for (let i = 0; i < triangles.length; i += 3) {
                                                            for (let j = 0; j < 3; j++) {
                                                                const idx = triangles[i + j] * 2;
                                                                // Reconstruct 3D point using the basis vectors
                                                                const result = math.addVec3(math.mulVec3Scalar(planeU, vertices[idx],     tempVec3b),
                                                                                            math.mulVec3Scalar(planeV, vertices[idx + 1], tempVec3c),
                                                                                            tempVec3b);

                                                                // Project the point onto the cutting plane
                                                                const t = math.dotVec3(planeDir, math.subVec3(planePos, math.addVec3(modelCenter, result, tempVec3a), tempVec3a));
                                                                const vertex = math.addVec3(result, math.mulVec3Scalar(planeDir, t, tempVec3a), tempVec3a);
                                                                triangle[j].set(vertex);

                                                                positions.push(vertex[0], vertex[1], vertex[2]);
                                                                indices.push(curVertexIndex++);

                                                                const P = math.addVec3(modelCenter, vertex, tempVec3b);
                                                                // Project P onto the plane
                                                                const dist = math.dotVec3(planeDir, math.subVec3(planePos, P, tempVec3c));
                                                                math.addVec3(P, math.mulVec3Scalar(planeDir, dist, tempVec3c), P);

                                                                const right = ((Math.abs(math.dotVec3(planeDir, worldUp)) < 0.999)
                                                                               ? math.cross3Vec3(planeDir, worldUp, tempVec3c)
                                                                               : worldRight);
                                                                const v = math.normalizeVec3(math.cross3Vec3(planeDir, right, tempVec3c));

                                                                const OP_proj = math.subVec3(P, planePos, P);
                                                                uvs.push(
                                                                    math.dotVec3(OP_proj, math.normalizeVec3(math.cross3Vec3(v, planeDir, tempVec3d))),
                                                                    math.dotVec3(OP_proj, v));
                                                            }

                                                            math.subVec3(triangle[1], triangle[0], tempVec3b);
                                                            math.subVec3(triangle[2], triangle[0], tempVec3c);
                                                            math.normalizeVec3(math.cross3Vec3(tempVec3b, tempVec3c, tempVec3c), tempVec3c);
                                                            if (math.dotVec3(tempVec3c, planeDir) > 0) {
                                                                // The cap is oriented along the planeDir, need to flip it
                                                                const tmp = indices[indices.length - 1];
                                                                indices[indices.length - 1] = indices[indices.length - 2];
                                                                indices[indices.length - 2] = tmp;
                                                            }
                                                        }

                                                        entityCache.capMeshes.push(new Mesh(scene, {
                                                            id:       `${plane.id}-${entityId}-${entityCache.capMeshes.length}`,
                                                            material: entity.capMaterial,
                                                            origin:   math.addVec3(modelCenter, math.mulVec3Scalar(planeDir, 0.001, tempVec3a), tempVec3a),
                                                            geometry: new ReadableGeometry(scene, {
                                                                primitive: "triangles",
                                                                indices:   indices,
                                                                positions: positions,
                                                                normals:   math.buildNormals(positions, indices),
                                                                uv:        uvs
                                                            })
                                                        }));
                                                }
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
                visibleSceneModels.forEach(sceneModel => modelCaches[sceneModel.id].entityCaches.forEach(entityCache => entityCache.generateCaps = false));
            }, 100);
        };

        this._onCapMaterialUpdated = (entity) => {
            if (! destroy) {
                updateTimeout = null;

                const handleSectionPlane = (sectionPlane) => {
                    const onSectionPlaneUpdated = () => {
                        Object.values(modelCaches).forEach(modelCache => modelCache.entityCaches.forEach(entityCache => {
                            entityCache.destroyCaps();
                            entityCache.generateCaps = true;
                        }));
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
                            onSectionPlaneUpdated();
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
                    let doUpdate = false;
                    for (const sceneModelId in modelCaches) {
                        const sceneModel = scene.models[sceneModelId];
                        if (! sceneModel) {
                            modelCaches[sceneModelId].entityCaches.forEach(entityCache => entityCache.destroyCaps());
                            delete modelCaches[sceneModelId];
                            doUpdate = true;
                        } else if (modelCaches[sceneModelId].modelVisible != sceneModel.visible) {
                            const modelCache = modelCaches[sceneModelId];
                            modelCache.modelVisible = !!sceneModel.visible;
                            modelCache.entityCaches.forEach(entityCache => {
                                entityCache.destroyCaps();
                                entityCache.generateCaps = true;
                            });
                            doUpdate = true;
                        }
                    }
                    if (doUpdate) {
                        update();
                    }
                });
                destroy = () => {
                    for (const sceneModelId in modelCaches) {
                        modelCaches[sceneModelId].entityCaches.forEach(entityCache => entityCache.destroyCaps());
                    }
                    scene.off(onSectionPlaneCreated);
                    scene.off(onTick);
                };
            }

            const model = entity.model;
            const modelId = model.id;
            modelCaches[modelId] ||= { modelVisible: model.visible, entityCaches: new Map() };
            const entityCaches = modelCaches[modelId].entityCaches;
            const entityId = entity.id;
            if (! entityCaches.has(entityId)) {
                const entityCache = {
                    capMeshes: [ ],
                    meshCaches: null,
                    generateCaps: false,
                    destroyCaps: () => {
                        entityCache.capMeshes.forEach(capMesh => capMesh.destroy());
                        entityCache.capMeshes.length = 0;
                    }
                };
                entityCaches.set(entityId, entityCache);
            }
            const entityCache = entityCaches.get(entityId);
            entityCache.destroyCaps();
            entityCache.generateCaps = true;
            update();
        };
    }
}
export { SectionCaps };
