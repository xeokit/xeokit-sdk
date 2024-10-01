import { math } from "../math/math.js";
import { Mesh } from "../mesh/Mesh.js";
import { ReadableGeometry } from "../geometry/ReadableGeometry.js";
import CSG from "../libs/csg.js";

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
        this._prevIntersectionModels = {};
        this._sectionPlaneTimeout = null;
        this._capsDirty = false;
        this._setupSectionPlanes();
        this._setupTicks();
    }


    //this function will be used to setup event listeners for creation of section planes
    _setupSectionPlanes() {
        this._onSectionPlaneCreated = this.scene.on('sectionPlaneCreated', (sectionPlane) => {
            this._sectionPlaneCreated(sectionPlane);
        })
    }

    _setupTicks() {
        this._onTick = this.scene.on("tick", () => {
            if (this._capsDirty) {
                this._capsDirty = false;
                this._sceneModel = Object.keys(this.scene.models).map((key) => this.scene.models[key]);
                this._addHatches(this._sceneModel, this._sectionPlanes);
            }
        })
    }

    //this hook will be called when a section plane is created
    _sectionPlaneCreated(sectionPlane) {
        this._sectionPlanes.push(sectionPlane);
        this._update();
        sectionPlane.on('pos', this._onSectionPlaneUpdated.bind(this));
        sectionPlane.on('dir', this._onSectionPlaneUpdated.bind(this));
        sectionPlane.once('destroyed', this._onSectionPlaneDestroyed.bind(this));
    }

    //this hook will be called when a section plane is destroyed
    _onSectionPlaneDestroyed(sectionPlane) {
        const sectionPlaneId = sectionPlane.id;
        if (sectionPlaneId) {
            this._sectionPlanes = this._sectionPlanes.filter((sectionPlane) => sectionPlane.id !== sectionPlaneId);
            this._update();
        }
    }

    //this function will be called when the position of a section plane is updated
    _onSectionPlaneUpdated() {
        this._deletePreviousModels();
        if (this._sectionPlaneTimeout)
            clearTimeout(this._sectionPlaneTimeout);
        this._sectionPlaneTimeout = setTimeout(() => {
            this._update();
            clearTimeout(this._sectionPlaneTimeout);
            this._sectionPlaneTimeout = null;
        }, 1000);
    }

    _onCapMaterialUpdated() {
        this._update();
    }

    _update() {
        this._capsDirty = true;
    }

    _addHatches(sceneModel, plane) {

        if (plane.length <= 0) return;

        this._deletePreviousModels();

        const { csgGeometries, materials } = this._convertWebglGeometriesToCsgGeometries(sceneModel);

        if (Object.keys(materials).length <= 0) return;

        const csgPlane = this._createCSGPlane(plane);
        let caps = this._getCapGeometries(csgGeometries, csgPlane);
        this._addIntersectedGeometries(caps, materials);
    }

    //#region main callers

    _deletePreviousModels() {
        const keys = Object.keys(this._prevIntersectionModels).length;
        if (keys) {
            for (const key in this._prevIntersectionModels) {
                this._prevIntersectionModels[key].destroy();
            }
        }
    }

    _convertWebglGeometriesToCsgGeometries(sceneModels) {
        let csgGeometries = {};
        let materials = {};
        sceneModels.forEach((sceneModel) => {
            const objects = {};
            for (const key in sceneModel.objects) {

                const object = sceneModel.objects[key];
                const isSolid = object.meshes[0].layer.solid !== false;
                if (isSolid && object.capMaterial) {
                    objects[key] = sceneModel.objects[key];
                    materials[key] = sceneModel.objects[key].capMaterial;
                }
            }

            let cloneModel = {
                ...sceneModel,
                objects: objects
            }

            const { vertices: webglVertices, indices: webglIndices } = this._getVerticesAndIndices(cloneModel);
            const csgGeometry = this._createCSGGeometries(webglVertices, webglIndices);
            csgGeometries = {
                ...csgGeometries,
                ...csgGeometry
            }
        })

        return { csgGeometries, materials };
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

    _createCSGGeometries(vertices, indices) {
        const geometries = {};
        for (const key in vertices) {
            const vertex = vertices[key];
            const index = indices[key];
            if (!Array.isArray(vertex[0]))
                geometries[key] = this._createGeometry(vertex, index);
            else {
                let geometry = null;
                for (let i = 0; i < vertex.length; i++) {
                    if (vertex[i].length > 0) {
                        const g = this._createGeometry(vertex[i], index[i])
                        geometry = geometry ? geometry.union(g) : g;
                    }
                }
                geometries[key] = geometry;
            }
        }
        return geometries;
    }

    _createCSGPlane(sectionPlanes) {
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
            const planeNormal = this._getObjectNormal(vertices, indices);
            const normalizedDir = math.normalizeVec3(sectionPlane.dir);
            const rotationQuaternion = this._computeQuaternionFromVectors(planeNormal, normalizedDir);

            const planeTransformMatrix = this._getTransformationMatrix(sectionPlane.pos, rotationQuaternion, true);
            const planeTransformedVertices = this._transformVertices(vertices, planeTransformMatrix);

            const csgPlane = this._createGeometry(planeTransformedVertices, indices);

            if (csgPlaneMerged)
                csgPlaneMerged = csgPlaneMerged.union(csgPlane);
            else
                csgPlaneMerged = csgPlane;
        })
        return csgPlaneMerged;
    }

    _getCapGeometries(csgGeometries, csgPlane) {
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

    _addIntersectedGeometries(csgGometries, materials) {
        for (const key in csgGometries) {
            const webglGeometry = this._csgToWebGLGeometry(csgGometries[key]);
            const model = this._addGeometryToScene(webglGeometry.vertices, webglGeometry.indices, key, materials[key]);
            if (model)
                this._prevIntersectionModels[key] = model;
        }
    }

    //#endregion

    //#region utility functions

    _createGeometry(vertices, indices) {
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

    _getObjectNormal(vertices, indices) {
        const v0 = this._getVertex(vertices, indices[0]);
        const v1 = this._getVertex(vertices, indices[1]);
        const v2 = this._getVertex(vertices, indices[2]);

        const edge1 = math.subVec3(v1, v0);
        const edge2 = math.subVec3(v2, v0);

        const normal = math.cross3Vec3(edge1, edge2);

        return math.normalizeVec3(normal)
    }

    _getVertex(positionArray, index) {
        return [
            positionArray[3 * index],
            positionArray[3 * index + 1],
            positionArray[3 * index + 2]
        ];
    }

    _computeQuaternionFromVectors(v1, v2) {
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

    _getTransformationMatrix(position, rotation, _isQuat = false) {
        const quat = _isQuat ? rotation : math.eulerToQuaternion(rotation, 'XYZ');
        const mat4 = math.rotationTranslationMat4(quat, position);
        return mat4;
    }

    _transformVertices(vertices, transformationMatrix) {
        const transformedVertices = [];
        for (let i = 0; i < vertices.length; i += 3) {
            const vertex = [vertices[i], vertices[i + 1], vertices[i + 2], 1];
            const transformedVertex = this._multiplyMatrixAndPoint(transformationMatrix, vertex);
            transformedVertices.push(transformedVertex[0], transformedVertex[1], transformedVertex[2]);
        }
        return new Float32Array(transformedVertices);
    }

    _multiplyMatrixAndPoint(matrix, point) {
        const result = [];
        for (let i = 0; i < 4; i++) {
            result[i] = matrix[i] * point[0] + matrix[i + 4] * point[1] + matrix[i + 8] * point[2] + matrix[i + 12] * point[3];
        }
        return result;
    }

    // Convert CSG to WebGL-compatible geometry
    _csgToWebGLGeometry(csgGeometry) {
        const vertices = [];
        const indices = [];
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

    _addGeometryToScene(vertices, indices, id, material) {
        if (vertices.length <= 0 && indices.length <= 0) return;
        const meshNormals = math.buildNormals(vertices, indices);
        const uvs = this._createUVsFromNormals(vertices, meshNormals);
        const intersectedModel = new Mesh(this.scene, {
            id,
            geometry: new ReadableGeometry(this.scene, {
                primitive: 'triangles',
                positions: vertices,
                indices: indices,
                normals: meshNormals,
                uv: uvs
            }),
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            material,
        })

        return intersectedModel;
    }

    _createUVsFromNormals(vertices, normals) {
        const avgMeshNormal = this._calculateAverageNormal(normals);
        const projectionPlane = this._selectProjectionPlaneFromNormal(avgMeshNormal);
        return this._generateUVsFromVertices(vertices, projectionPlane);
    }

    _calculateAverageNormal(normals) {
        // Initialize the sum of normal components
        let sumX = 0, sumY = 0, sumZ = 0;
        const normalCount = normals.length / 3;

        // Loop through the normals array
        for (let i = 0; i < normals.length; i += 3) {
            sumX += normals[i];      // x component of the normal
            sumY += normals[i + 1];  // y component of the normal
            sumZ += normals[i + 2];  // z component of the normal
        }

        // Calculate the average normal
        const avgNormal = [
            sumX / normalCount,
            sumY / normalCount,
            sumZ / normalCount
        ];

        // Normalize the average normal to unit length
        const length = Math.sqrt(avgNormal[0] * avgNormal[0] + avgNormal[1] * avgNormal[1] + avgNormal[2] * avgNormal[2]);

        // Return the normalized average normal
        return [
            avgNormal[0] / length,
            avgNormal[1] / length,
            avgNormal[2] / length
        ];

    }

    _selectProjectionPlaneFromNormal(normal) {
        const absNormal = [
            Math.abs(normal[0]),
            Math.abs(normal[1]),
            Math.abs(normal[2])
        ]

        if (absNormal[0] >= absNormal[1] && absNormal[0] >= absNormal[2])
            return 'yz';
        else if (absNormal[1] >= absNormal[0] && absNormal[1] >= absNormal[2])
            return 'xz';
        else
            return 'xy';
    }

    _generateUVsFromVertices(vertices, projectionPlane = 'xy') {
        const uvs = [];
        let min = { x: Infinity, y: Infinity };
        let max = { x: -Infinity, y: -Infinity };

        // Project and find min/max for UV normalization
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];

            let u, v;

            // Select projection plane (XY, XZ, or YZ)
            if (projectionPlane === 'xy') {
                u = x;
                v = y;
            } else if (projectionPlane === 'xz') {
                u = x;
                v = z;
            } else if (projectionPlane === 'yz') {
                u = y;
                v = z;
            }

            // Update the min/max for normalization
            min.x = Math.min(min.x, u);
            min.y = Math.min(min.y, v);
            max.x = Math.max(max.x, u);
            max.y = Math.max(max.y, v);

            // Store raw UVs before normalization
            uvs.push(u, v);
        }

        // Calculate UV ranges
        const range = {
            x: max.x - min.x,
            y: max.y - min.y
        };

        // Normalize UVs to fit within [0, 1]
        for (let i = 0; i < uvs.length; i += 2) {
            uvs[i] = (uvs[i] - min.x) / range.x;
            uvs[i + 1] = (uvs[i + 1] - min.y) / range.y;
        }

        return uvs;
    }

    //#endregion

    destroy() {
        this._deletePreviousModels();
        this.scene.off(this._onSectionPlaneCreated);
        this.scene.off(this._onTick);
    }
}

export { SectionCaps };