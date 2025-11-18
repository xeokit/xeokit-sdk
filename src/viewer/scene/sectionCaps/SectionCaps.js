import { math } from "../math/math.js";
import { Mesh } from "../mesh/Mesh.js";
import { ReadableGeometry } from "../geometry/ReadableGeometry.js";
import { buildLineGeometry } from "../geometry/index.js";
import { PhongMaterial } from "../materials/PhongMaterial.js";

const tempVec3a = math.vec3();

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

        let updateTimeout = null;

        const update = () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                const visibleSceneModels = Object.values(scene.models).filter(sceneModel => (sceneModel.id in modelCaches) && sceneModel.visible);
                sectionPlanes.forEach((plane) => {
                    if (plane.active) {
                        const sliceMesh = math.makeSectionPlaneSlicer(plane.pos, plane.quaternion);
                        visibleSceneModels.forEach(sceneModel => {
                            const modelAABB = sceneModel.aabb;
                            if (math.planeIntersectsAABB3(plane, modelAABB)) {
                                // modelCenter is critical to use when handling models with large coordinates.
                                // See XCD-306 and examples/slicing/SectionCaps_at_distance.html for more details.
                                const modelCenter = math.getAABB3Center(modelAABB, math.vec3());

                                modelCaches[sceneModel.id].entityCaches.forEach((entityCache, entityId) => {
                                    const entity = sceneModel.objects[entityId];
                                    if (entityCache.generateCaps && entity.capMaterial && math.planeIntersectsAABB3(plane, entity.aabb)) {
                                        entityCache.meshCaches ||= entity.meshes.filter(mesh => mesh.isSolid()).map(mesh => {
                                            const meshIndices  = [ ];
                                            const meshVertices = [ ];
                                            mesh.getEachIndex(i  => meshIndices.push(i));
                                            mesh.getEachVertex(v => meshVertices.push(...math.subVec3(v, modelCenter, tempVec3a)));
                                            return { mesh: mesh, meshIndices: meshIndices, meshVertices: meshVertices };
                                        });

                                        entityCache.meshCaches.filter(meshCache => math.planeIntersectsAABB3(plane, meshCache.mesh.aabb)).forEach((meshCache, meshIdx) => {
                                            sliceMesh(modelCenter, meshCache.meshIndices, meshCache.meshVertices).forEach((geo, geoIdx) => {
                                                entityCache.capMeshes.push(new Mesh(scene, {
                                                    isObject: true,
                                                    id:       `${plane.id}-${entityId}-${meshIdx}-${geoIdx}`,
                                                    material: entity.capMaterial,
                                                    origin:   math.addVec3(modelCenter, math.mulVec3Scalar(plane.dir, 0.001, tempVec3a), tempVec3a),
                                                    geometry: new ReadableGeometry(scene, {
                                                        primitive: "triangles",
                                                        indices:   geo.indices,
                                                        positions: geo.positions,
                                                        normals:   geo.normals,
                                                        uv:        geo.uv
                                                    })
                                                }));
                                            });
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
