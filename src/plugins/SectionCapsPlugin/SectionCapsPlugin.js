import { Plugin } from "../../viewer/Plugin.js";
import { math } from "../../viewer/scene/math/math.js";
import { Mesh } from "../../viewer/scene/mesh/Mesh.js";
import { ReadableGeometry } from "../../viewer/scene/geometry/ReadableGeometry.js";
import { PhongMaterial } from "../../viewer/scene/materials/PhongMaterial.js";
import CSG from "../lib/csg.js";

class SectionCapsPlugin extends Plugin {
    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {boolean} [cfg.enabled=true] Default value for, if this plugin is enabled or not.
     * @param {number} [cfg.opacityThreshold=1.0] Default value to cap objects with opacity above this threshold
     */
    constructor(viewer, cfg = {}) {
        super("SectionCaps", viewer, cfg);
        if (!viewer.scene.readableGeometryEnabled) {
            console.log('SectionCapsPlugin only works when readable geometry is enable on the viewer.');
            return;
        }
        this._viewer = viewer;
        this._enabled = cfg.enabled !== false;
        this._opacityThreshold = !isNaN(cfg.opacityThreshold) ? cfg.opacityThreshold : 1.0;
        this._sectionPlanes = [];
        this._sceneModel = Object.keys(viewer.scene.models).map((key) => viewer.scene.models[key]);
        this._prevIntersectionModels = {};
        this._posTimeout = null;
        this._dirTimeout = null;
        this._setupSectionPlanes();
    }

    set enabled(value) {
        if (value !== undefined && value !== this._enabled) {
            this._enabled = value;
            if (this._enabled)
                this._addHatches(this._sceneModel, this._sectionPlanes);
            else
                this._deletePreviousModels();
        }
    }

    get enabled() {
        return this._enabled;
    }

    set opacityThreshold(value) {
        if (!isNaN(value) && value !== this._opacityThreshold) {
            this._opacityThreshold = value;
            if (this._enabled)
                this._addHatches(this._sceneModel, this._sectionPlanes);
            else
                this._deletePreviousModels();
        }
    }

    get opacityThreshold() {
        return this._opacityThreshold;
    }


    //this function will be used to setup event listeners for creation of section planes
    _setupSectionPlanes() {
        this._onSectionPlaneCreated = this.viewer.scene.on('sectionPlaneCreated', (sectionPlane) => {
            this._sectionPlaneCreated(sectionPlane);
        })
    }

    //this hook will be called when a section plane is created
    _sectionPlaneCreated(sectionPlane) {
        this._sectionPlanes.push(sectionPlane);
        sectionPlane.on('pos', this._onSectionPlanePosUpdated.bind(this));
        sectionPlane.on('dir', this._onSectionPlaneDirRotated.bind(this));
        sectionPlane.once('destroyed', this._onSectionPlaneDestroyed.bind(this));
    }

    //this hook will be called when a section plane is destroyed
    _onSectionPlaneDestroyed(sectionPlane) {
        const sectionPlaneId = sectionPlane.id;
        if (sectionPlaneId) {
            this._sectionPlanes = this._sectionPlanes.filter((sectionPlane) => sectionPlane.id !== sectionPlaneId);
            this._addHatches(this._sceneModel, this._sectionPlanes);
        }
    }

    //this function will be called when the position of a section plane is updated
    _onSectionPlanePosUpdated() {
        this._deletePreviousModels();
        if (this._posTimeout)
            clearTimeout(this._posTimeout);
        this._posTimeout = setTimeout(() => {
            this._addHatches(this._sceneModel, this._sectionPlanes);
            clearTimeout(this._posTimeout);
            this._posTimeout = null;
        }, 1000);
    }

    //this function will be called when the direction of a section plane is updated
    _onSectionPlaneDirRotated() {
        this._deletePreviousModels();
        if (this._dirTimeout)
            clearTimeout(this._dirTimeout);
        this._dirTimeout = setTimeout(() => {
            this._addHatches(this._sceneModel, this._sectionPlanes);
            clearTimeout(this._dirTimeout);
            this._dirTimeout = null;
        }, 1000);
    }

    _addHatches(sceneModel, plane) {

        if (!this._enabled) return;

        this._deletePreviousModels();

        const csgGeometries = this._convertWebglGeometriesToCsgGeometries(sceneModel);

        const csgPlane = this._createCSGPlane(plane);
        let caps = this._getCapGeometries(csgGeometries, csgPlane);
        this._addIntersectedGeometries(caps);
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
        sceneModels.forEach((sceneModel) => {
            const objects = {};
            for (const key in sceneModel.objects) {

                const object = sceneModel.objects[key];
                const isSolid = object.meshes[0].layer.solid !== false;
                if (isSolid && object.opacity >= this._opacityThreshold)
                    objects[key] = sceneModel.objects[key];
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

        return csgGeometries;
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
                        mesh.getEachVertex((_vertices) => {
                            vertices[key][index].push(_vertices[0], _vertices[1], _vertices[2]);
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

    _addIntersectedGeometries(csgGometries) {
        for (const key in csgGometries) {
            const webglGeometry = this._csgToWebGLGeometry(csgGometries[key]);
            const model = this._addGeometryToScene(webglGeometry.vertices, webglGeometry.indices, key);
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

    _addGeometryToScene(vertices, indices, id) {
        if (vertices.length <= 0 && indices.length <= 0) return;
        const intersectedModel = new Mesh(this.viewer.scene, {
            id,
            geometry: new ReadableGeometry(this.viewer.scene, {
                primitive: 'triangles',
                positions: vertices,
                indices: indices,
            }),
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            material: new PhongMaterial(this.viewer.scene, {
                diffuse: [1, 0, 0],
                backfaces: true,
            }),
        })

        return intersectedModel;
    }

    //#endregion

    destroy() {
        this._deletePreviousModels();
        this.viewer.scene.off(this._onSectionPlaneCreated);
        super.destroy();
    }
}

export { SectionCapsPlugin };