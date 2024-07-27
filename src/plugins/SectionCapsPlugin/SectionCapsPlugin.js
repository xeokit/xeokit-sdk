import {Plugin} from "../../viewer/Plugin.js";
import {math} from "../../viewer/scene/math/math.js";
import { Mesh } from "../../viewer/scene/mesh/Mesh.js";
import { ReadableGeometry } from "../../viewer/scene/geometry/ReadableGeometry.js";
import { PhongMaterial } from "../../viewer/scene/materials/PhongMaterial.js";
import CSG from "../lib/csg.js";

class SectionCapsPlugin extends Plugin {
    constructor(viewer, cfg = {}) {
        super("SectionCaps", viewer, cfg);
        this.sectionPlanes = [];
        this.sceneModel = viewer.scene.models.myModel;
        this.prevIntersectionModels = {};
        this.posTimeout = null;
        this.dirTimeout = null;
        this.setupSectionPlanes();
    }


    //this function will be used to setup event listeners for creation of section planes
    setupSectionPlanes(){
        this._onSectionPlaneCreated = this.viewer.scene.on('sectionPlaneCreated', (sectionPlane) => {
            this._sectionPlaneCreated(sectionPlane);
        })
    }

    //this hook will be called when a section plane is created
    _sectionPlaneCreated(sectionPlane) {
        this.sectionPlanes.push(sectionPlane);
        sectionPlane.on('pos', this.onSectionPlanePosUpdated.bind(this));
        sectionPlane.on('dir', this.onSectionPlaneDirRotated.bind(this));
        sectionPlane.once('destroyed', this.onSectionPlaneDestroyed.bind(this));
    }

    //this hook will be called when a section plane is destroyed
    onSectionPlaneDestroyed(sectionPlane) {
        const sectionPlaneId = sectionPlane.id;
        if(sectionPlaneId) {
            this.sectionPlanes = this.sectionPlanes.filter((sectionPlane) => sectionPlane.id !== sectionPlaneId);
            this.addHatches(this.sceneModel, this.sectionPlanes);
        }
    } 

    //this function will be called when the position of a section plane is updated
    onSectionPlanePosUpdated() {
        this.deletePreviousModels();
        if (this.posTimeout)
            clearTimeout(this.posTimeout);
        this.posTimeout = setTimeout(() => {
            this.addHatches(this.sceneModel, this.sectionPlanes);
            clearTimeout(this.posTimeout);
            this.posTimeout = null;
        }, 1000);
    }

    //this function will be called when the direction of a section plane is updated
    onSectionPlaneDirRotated() {
        this.deletePreviousModels();
        if (this.dirTimeout)
            clearTimeout(this.dirTimeout);
        this.dirTimeout = setTimeout(() => {
            this.addHatches(this.sceneModel, this.sectionPlanes);
            clearTimeout(this.dirTimeout);
            this.dirTimeout = null;
        }, 1000);
    }

    addHatches(sceneModel, plane) {

        this.deletePreviousModels();

        const objects = {};

        for (const key in sceneModel.objects) {
            const isSolid = sceneModel.objects[key].meshes[0].layer.solid ?? false;
            if (isSolid)
                objects[key] = sceneModel.objects[key];
        }

        let cloneModel = {
            ...sceneModel,
            objects: objects
        }

        const { vertices: webglVertices, indices: webglIndices } = this.getVerticesAndIndices(cloneModel);

        const bb = this.calculateWebglBBs(webglVertices);
        const center = this.calculateCenterFromBBs(bb);
        const csgGeometries = this.createCSGGeometries(webglVertices, webglIndices, center);
        const csgPlane = this.createCSGPlane(plane);
        let caps = this.getCapGeometries(csgGeometries, csgPlane);
        this.addIntersectedGeometries(caps);
    }

    //#region main callers

    deletePreviousModels() {
        const keys = Object.keys(this.prevIntersectionModels).length;
        if (keys) {
            for (const key in this.prevIntersectionModels) {
                this.prevIntersectionModels[key].destroy();
            }
        }
    }

    getVerticesAndIndices(sceneModel) {
        const vertices = {};
        const indices = {};
        const objects = sceneModel.objects;
        for (const key in objects) {
            const value = objects[key];
            vertices[key] = [];
            indices[key] = [];
            value.getEachVertex((_vertices) => {
                vertices[key].push(_vertices[0], _vertices[1], _vertices[2]);
            })
            value.getEachIndex((_indices) => {
                indices[key].push(_indices);
            })
        }
        return { vertices, indices };
    }

    createCSGGeometries(vertices, indices, center) {
        const geometries = {};
        for (const key in vertices) {
            const vertex = vertices[key];
            const index = indices[key];
            geometries[key] = this.createGeometry(vertex, index);
        }
        return geometries;
    }

    createCSGPlane(sectionPlanes) {
        const vertices = [
            20, 20, 0.01,
            -20, 20, 0.01,
            -20, -20, 0.01,
            20, -20, 0.01,
            20, 20, 0.01,
            20, -20, 0.01,
            20, -20, -0.01,
            20, 20, -0.01,
            20, 20, 0.01,
            20, 20, -0.01,
            -20, 20, -0.01,
            -20, 20, 0.01,
            -20, 20, 0.01,
            -20, 20, -0.01,
            -20, -20, -0.01,
            -20, -20, 0.01,
            -20, -20, -0.01,
            20, -20, -0.01,
            20, -20, 0.01,
            -20, -20, 0.01,
            20, -20, -0.01,
            -20, -20, -0.01,
            -20, 20, -0.01,
            20, 20, -0.01
        ];

        const indices = [
            0, 1, 2, 0, 2, 3,            // front
            4, 5, 6, 4, 6, 7,            // right
            8, 9, 10, 8, 10, 11,         // top
            12, 13, 14, 12, 14, 15,      // left
            16, 17, 18, 16, 18, 19,      // bottom
            20, 21, 22, 20, 22, 23
        ]

        let csgPlaneMerged = null;

        sectionPlanes.forEach((sectionPlane) => {
            const planeNormal = this.getObjectNormal(vertices, indices);
            const normalizedDir = math.normalizeVec3(sectionPlane.dir);
            const rotationQuaternion = this.computeQuaternionFromVectors(planeNormal, normalizedDir);

            const planeTransformMatrix = this.getTransformationMatrix(sectionPlane.pos, rotationQuaternion, true);
            const planeTransformedVertices = this.transformVertices(vertices, planeTransformMatrix);

            const csgPlane = this.createGeometry(planeTransformedVertices, indices);

            if (csgPlaneMerged)
                csgPlaneMerged = csgPlaneMerged.union(csgPlane);
            else
                csgPlaneMerged = csgPlane;
        })



        return csgPlaneMerged;
    }

    getCapGeometries(csgGeometries, csgPlane) {
        const cappedGeometries = {};
        for (const key in csgGeometries) {
            const geometry = csgGeometries[key];
            if (geometry.polygons.length) {
                const intersected = geometry.intersect(csgPlane);
                cappedGeometries[key] = intersected;
            }

        }

        return cappedGeometries;
    }

    calculatePositions(capVertices) {
        const positions = {};
        const boundingBox = {};
        for (const key in capVertices) {
            const polygons = capVertices[key].polygons;
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
            polygons.forEach((polygon) => {
                const vertices = polygon.vertices;
                for (let i = 0; i < vertices.length; i++) {
                    const x = vertices[i].pos.x;
                    const y = vertices[i].pos.y;
                    const z = vertices[i].pos.z;

                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (z < minZ) minZ = z;

                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                    if (z > maxZ) maxZ = z;
                }
            })
            // boundingBoxes[key] =
            positions[key] = [
                (minX + maxX) / 2,
                (minY + maxY) / 2,
                (minZ + maxZ) / 2
            ]

            boundingBox[key] = {
                minX, maxX, minY, maxY, minZ, maxZ
            }

        }
        return { positions, boundingBox };
    }

    calculateWebglBBs(_vertices) {
        const bbs = {};
        for (const key in _vertices) {
            const vertices = _vertices[key];
            bbs[key] = this.calculateWebglBB(vertices);
        }
        return bbs;
    }

    calculateWebglBB(vertices) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];

            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (z < minZ) minZ = z;

            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            if (z > maxZ) maxZ = z;
        }

        return {
            minX, maxX, minY, maxY, minZ, maxZ
        };
    }

    calculateCenterFromBBs(_bb) {
        const centers = {};
        for (const key in _bb) {
            const bb = _bb[key];
            centers[key] = this.calculateCenterFromBB(bb);
        }

        return centers;
    }

    calculateCenterFromBB(bb) {
        return [
            (bb.minX + bb.maxX) / 2,
            (bb.minY + bb.maxY) / 2,
            (bb.minZ + bb.maxZ) / 2
        ]
    }

    translateToOrigin(_vertices, _centers) {
        const translatedVertices = {};
        for (const key in _vertices) {
            const vertices = _vertices[key];
            const center = _centers[key];
            translatedVertices[key] = [];
            for (let i = 0; i < vertices.length; i += 3) {
                translatedVertices[key].push(
                    vertices[i] -= center[0],
                    vertices[i + 1] -= center[1],
                    vertices[i + 2] -= center[2]
                )
            }
        }
        return translatedVertices;
    }

    addIntersectedGeometries(csgGometries) {
        for (const key in csgGometries) {
            const webglGeometry = this.csgToWebGLGeometry(csgGometries[key]);
            const model = this.addGeometryToScene(webglGeometry.vertices, webglGeometry.indices, key);
            if (model)
                this.prevIntersectionModels[key] = model;
        }
    }

    //#endregion

    //#region utility functions

    createGeometry(vertices, indices) {
        let polygons = [];
        for (let i = 0; i < indices.length; i += 3) {
            let points = [];
            for (let j = 0; j < 3; j++) {
                let vertexIndex = indices[i + j];
                points.push(new CSG.Vertex(
                    {
                        x: vertices[vertexIndex * 3],
                        y: vertices[vertexIndex * 3 + 1],
                        z: vertices[vertexIndex * 3 + 2]
                    }
                ));
            }
            polygons.push(new CSG.Polygon(points));
        }
        return CSG.fromPolygons(polygons);
    }

    getObjectNormal(vertices, indices) {
        const v0 = this.getVertex(vertices, indices[0]);
        const v1 = this.getVertex(vertices, indices[1]);
        const v2 = this.getVertex(vertices, indices[2]);

        const edge1 = math.subVec3(v1, v0);
        const edge2 = math.subVec3(v2, v0);

        const normal = math.cross3Vec3(edge1, edge2);

        return math.normalizeVec3(normal)
    }

    getVertex(positionArray, index) {
        return [
            positionArray[3 * index],
            positionArray[3 * index + 1],
            positionArray[3 * index + 2]
        ];
    }

    computeQuaternionFromVectors(v1, v2) {
        const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
        const cross = {
            x: v1[1] * v2[2] - v1[2] * v2[1],
            y: v1[2] * v2[0] - v1[0] * v2[2],
            z: v1[0] * v2[1] - v1[1] * v2[2]
        };
        const s = Math.sqrt((1 + dot) * 2);
        const invs = 1 / s;

        return [
            cross.x * invs,
            cross.y * invs,
            cross.z * invs,
            s * 0.5
        ]
    }

    getTransformationMatrix(position, rotation, _isQuat = false) {
        const quat = _isQuat ? rotation : math.eulerToQuaternion(rotation, 'XYZ');
        const mat4 = math.rotationTranslationMat4(quat, position);
        return mat4;
    }

    transformVertices(vertices, transformationMatrix) {
        const transformedVertices = [];
        for (let i = 0; i < vertices.length; i += 3) {
            const vertex = [vertices[i], vertices[i + 1], vertices[i + 2], 1];
            const transformedVertex = this.multiplyMatrixAndPoint(transformationMatrix, vertex);
            transformedVertices.push(transformedVertex[0], transformedVertex[1], transformedVertex[2]);
        }
        return new Float32Array(transformedVertices);
    }

    multiplyMatrixAndPoint(matrix, point) {
        const result = [];
        for (let i = 0; i < 4; i++) {
            result[i] = matrix[i] * point[0] + matrix[i + 4] * point[1] + matrix[i + 8] * point[2] + matrix[i + 12] * point[3];
        }
        return result;
    }

    // Convert CSG to WebGL-compatible geometry
    csgToWebGLGeometry(csgGeometry) {
        const vertices = [];
        const indices = [];
        let index = 0;
        csgGeometry.polygons.forEach(polygon => {
            const vertexStartIndex = Math.floor(vertices.length / 3);
            polygon.vertices.forEach(vertex => {
                vertices.push(vertex.pos.x, vertex.pos.y, vertex.pos.z);
            });
            for (let i = 2; i < polygon.vertices.length; i++) {
                indices.push(vertexStartIndex, vertexStartIndex + i - 1, vertexStartIndex + i);
            }
        });
        return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
    }

    addGeometryToScene(vertices, indices, id) {
        if (vertices.length <= 0 && indices.length <= 0) return;
        const intersectedModel = new Mesh(viewer.scene, {
            id,
            geometry: new ReadableGeometry(viewer.scene, {
                primitive: 'triangles',
                positions: vertices,
                indices: indices,
            }),
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            material: new PhongMaterial(viewer.scene, {
                diffuse: [1, 0, 0],
                backfaces: true,
            }),
        })

        return intersectedModel;
    }

    updateSceneGeometry(mesh, vertices, indices) {
        mesh.geometry.positions = vertices;
        mesh.geometry.indicies = indices;
        mesh.visible = true;
    }

    doBoundingBoxesIntersect(box1, box2) {
        return (
            box1.minX <= box2.maxX && box1.maxX >= box2.minX &&
            box1.minY <= box2.maxY && box1.maxY >= box2.minY &&
            box1.minZ <= box2.maxZ && box1.maxZ >= box2.minZ
        );
    }

    //#endregion

    destroy(){
        this.deletePreviousModels();
        this.viewer.scene.off(this._onSectionPlaneCreated);
        super.destroy();
    }
}

export {SectionCapsPlugin};