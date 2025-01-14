import {math, Plugin, SceneModel, utils} from "../../viewer/index.js";
import {CityJSONDefaultDataSource} from "./CityJSONDefaultDataSource.js";

import earcut from '../../viewer/scene/libs/earcut.js';

const tempVec2a = math.vec2();
const tempVec3a = math.vec3();
const tempVec3b = math.vec3();
const tempVec3c = math.vec3();

/**
 * {@link Viewer} plugin that loads models from CityJSON files.
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/index.html#loading_CityJSONLoaderPlugin_Railway"><img src="https://xeokit.io/img/docs/CityJSONLoaderPlugin/CityJSONLoaderPlugin.png"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#loading_CityJSONLoaderPlugin_Railway)]
 *
 * ## Overview
 *
 * * Loads small-to-medium sized models directly from [CityJSON 1.0.0](https://www.cityjson.org/specs/1.0.0/) files.
 * * Loads double-precision coordinates, enabling models to be viewed at global coordinates without accuracy loss.
 * * Allows to set the position, scale and rotation of each model as you load it.
 * * Not recommended for large models. For best performance with large CityJSON datasets, we recommend
 * converting them to ````.xkt```` format (eg. using [convert2xkt](https://github.com/xeokit/xeokit-convert)), then loading
 * the ````.xkt```` using {@link XKTLoaderPlugin}.
 *
 * ## Limitations
 *
 * Loading and parsing huge CityJSON files can be slow, and can overwhelm the browser, however. To view your
 * largest CityJSON models, we recommend instead pre-converting those to xeokit's compressed native .XKT format, then
 * loading them with {@link XKTLoaderPlugin} instead.</p>
 *
 * ## Scene representation
 *
 * When loading a model, CityJSONLoaderPlugin creates an {@link Entity} that represents the model, which
 * will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id}
 * in {@link Scene#models}. The CityJSONLoaderPlugin also creates an {@link Entity} for each object within the
 * model. Those Entities will have {@link Entity#isObject} set ````true```` and will be registered
 * by {@link Entity#id} in {@link Scene#objects}.
 *
 * ## Metadata
 *
 * When loading a model, CityJSONLoaderPlugin also creates a {@link MetaModel} that represents the model, which contains
 * a tree of {@link MetaObject}s that represent the CityJSON objects. .
 *
 * ## Usage
 *
 * In the example below we'll load the LOD 3 Railway model from
 * a [CityJSON file](https://github.com/xeokit/xeokit-sdk/tree/master/assets/models/cityjson/LoD3_Railway.json). Within
 * our {@link Viewer}, this will create a bunch of {@link Entity}s that represents the model and its objects, along with
 * a {@link MetaModel} and {@link MetaObject}s that hold their metadata.
 *
 * We'll also scale our model to half its size, rotate it 90 degrees about its local X-axis, then
 * translate it 100 units along its X axis.
 *
 * * [[Run example](https://xeokit.github.io/xeokit-sdk/examples/index.html#loading_CityJSONLoaderPlugin_Railway)]
 *
 * ````javascript
 * import {Viewer, CityJSONLoaderPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 * });
 *
 * viewer.scene.camera.eye = [14.915582703146043, 14.396781491179095, 5.431098754133695];
 * viewer.scene.camera.look = [6.599999999999998, 8.34099990051474, -4.159999575600315];
 * viewer.scene.camera.up = [-0.2820584034861215, 0.9025563895259413, -0.3253229483893775];
 *
 * const cityJSONLoader = new CityJSONLoaderPlugin(viewer);
 *
 * const model = cityJSONLoader.load({ // Returns an Entity that represents the model
 *     id: "myModel1",
 *     src: "../assets/models/cityjson/LoD3_Railway.json",
 *     saoEnabled: true,
 *     edges: false,
 *     rotation: [-90,0,0],
 *     scale: [0.5, 0.5, 0.5],
 *     origin: [100, 0, 0]
 * });
 * ````
 *
 * ## Configuring a custom data source
 *
 * By default, CityJSONLoaderPlugin will load CityJSON files over HTTP.
 *
 * In the example below, we'll customize the way CityJSONLoaderPlugin loads the files by configuring it with our own data source
 * object. For simplicity, our custom data source example also uses HTTP, using a couple of xeokit utility functions.
 *
 * ````javascript
 * import {utils} from "xeokit-sdk.es.js";
 *
 * class MyDataSource {
 *
 *      constructor() {
 *      }
 *
 *      getCityJSON(src, ok, error) {
 *          console.log("MyDataSource#getCityJSON(" + CityJSONSrc + ", ... )");
 *          utils.loadJSON(src,
 *              (cityJSON) => {
 *                  ok(cityJSON);
 *              },
 *              function (errMsg) {
 *                  error(errMsg);
 *              });
 *      }
 * }
 * ````
 *
 * @class CityJSONLoaderPlugin
 * @since 2.0.13
 */
class CityJSONLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="cityJSONLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} [cfg.dataSource] A custom data source through which the CityJSONLoaderPlugin can load model and
     * metadata files. Defaults to an instance of {@link CityJSONDefaultDataSource}, which loads over HTTP.
     */
    constructor(viewer, cfg = {}) {

        super("cityJSONLoader", viewer, cfg);

        this.dataSource = cfg.dataSource;
    }

    /**
     * Gets the custom data source through which the CityJSONLoaderPlugin can load CityJSON files.
     *
     * Default value is {@link CityJSONDefaultDataSource}, which loads via HTTP.
     *
     * @type {Object}
     */
    get dataSource() {
        return this._dataSource;
    }

    /**
     * Sets a custom data source through which the CityJSONLoaderPlugin can load CityJSON files.
     *
     * Default value is {@link CityJSONDefaultDataSource}, which loads via HTTP.
     *
     * @type {Object}
     */
    set dataSource(value) {
        this._dataSource = value || new CityJSONDefaultDataSource();
    }

    /**
     * Loads an ````CityJSON```` model into this CityJSONLoaderPlugin's {@link Viewer}.
     *
     * @param {*} params Loading parameters.
     * @param {String} [params.id] ID to assign to the root {@link Entity#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default.
     * @param {String} [params.src] Path to a CityJSON file, as an alternative to the ````cityJSON```` parameter.
     * @param {ArrayBuffer} [params.cityJSON] The CityJSON file data, as an alternative to the ````src```` parameter.
     * @param {Boolean} [params.loadMetadata=true] Whether to load metadata on CityJSON objects.
     * @param {Number[]} [params.origin=[0,0,0]] The model's World-space double-precision 3D origin. Use this to position the model within xeokit's World coordinate system, using double-precision coordinates.
     * @param {Number[]} [params.position=[0,0,0]] The model single-precision 3D position, relative to the ````origin```` parameter.
     * @param {Number[]} [params.scale=[1,1,1]] The model's scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model's orientation, given as Euler angles in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model's world transform matrix. Overrides the position, scale and rotation parameters. Relative to ````origin````.
     * @param {Object} [params.stats] Collects model statistics.
     * @param {Boolean} [params.dtxEnabled=true] When ````true```` (default) use data textures (DTX), where appropriate, to
     * represent the returned model. Set false to always use vertex buffer objects (VBOs). Note that DTX is only applicable
     * to non-textured triangle meshes, and that VBOs are always used for meshes that have textures, line segments, or point
     * primitives. Only works while {@link DTX#enabled} is also ````true````.
     * @returns {Entity} Entity representing the model, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}.
     */
    load(params = {}) {

        if (params.id && this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
        }

        const sceneModel = new SceneModel(this.viewer.scene, utils.apply(params, {
            isModel: true,
            edges: true
        }));

        if (!params.src && !params.cityJSON) {
            this.error("load() param expected: src or cityJSON");
            return sceneModel; // Return new empty model
        }

        const options = {};

        if (params.src) {
            this._loadModel(params.src, params, options, sceneModel);
        } else {
            const spinner = this.viewer.scene.canvas.spinner;
            spinner.processes++;
            this._parseModel(params.cityJSON, params, options, sceneModel);
            spinner.processes--;
        }

        return sceneModel;
    }

    _loadModel(src, params, options, sceneModel) {
        const spinner = this.viewer.scene.canvas.spinner;
        spinner.processes++;
        this._dataSource.getCityJSON(params.src, (data) => {
                this._parseModel(data, params, options, sceneModel);
                spinner.processes--;
            },
            (errMsg) => {
                spinner.processes--;
                this.error(errMsg);
                sceneModel.fire("error", errMsg);
            });
    }

    _parseModel(data, params, options, sceneModel) {

        if (sceneModel.destroyed) {
            return;
        }

        const vertices = data.transform ? this._transformVertices(data.vertices, data.transform, options.rotateX) : data.vertices;

        const stats = params.stats || {};
        stats.sourceFormat = data.type || "CityJSON";
        stats.schemaVersion = data.version || "";
        stats.title = "";
        stats.author = "";
        stats.created = "";
        stats.numMetaObjects = 0;
        stats.numPropertySets = 0;
        stats.numObjects = 0;
        stats.numGeometries = 0;
        stats.numTriangles = 0;
        stats.numVertices = 0;

        const loadMetadata = (params.loadMetadata !== false);

        const rootMetaObject = loadMetadata ? {
            id: math.createUUID(),
            name: "Model",
            type: "Model"
        } : null;

        const metadata = loadMetadata ? {
            id: "",
            projectId: "",
            author: "",
            createdAt: "",
            schema: data.version || "",
            creatingApplication: "",
            metaObjects: [rootMetaObject],
            propertySets: []
        } : null;

        const ctx = {
            data,
            vertices,
            sceneModel,
            loadMetadata,
            metadata,
            rootMetaObject,
            nextId: 0,
            stats
        };

        this._parseCityJSON(ctx)

        sceneModel.finalize();

        if (loadMetadata) {
            const metaModelId = sceneModel.id;
            this.viewer.metaScene.createMetaModel(metaModelId, ctx.metadata, options);
        }

        sceneModel.scene.once("tick", () => {
            if (sceneModel.destroyed) {
                return;
            }
            sceneModel.scene.fire("modelLoaded", sceneModel.id); // FIXME: Assumes listeners know order of these two events
            sceneModel.fire("loaded", true, false); // Don't forget the event, for late subscribers
        });
    }

    _transformVertices(vertices, transform, rotateX) {
        const transformedVertices = [];
        const scale = transform.scale || math.vec3([1, 1, 1]);
        const translate = transform.translate || math.vec3([0, 0, 0]);
        for (let i = 0, j = 0; i < vertices.length; i++, j += 3) {
            const x = (vertices[i][0] * scale[0]) + translate[0];
            const y = (vertices[i][1] * scale[1]) + translate[1];
            const z = (vertices[i][2] * scale[2]) + translate[2];
            if (rotateX) {
                transformedVertices.push([x, z, y]);
            } else {
                transformedVertices.push([x, y, z]);
            }
        }
        return transformedVertices;
    }

    _parseCityJSON(ctx) {
        const data = ctx.data;
        const cityObjects = data.CityObjects;
        for (const objectId in cityObjects) {
            if (cityObjects.hasOwnProperty(objectId)) {
                const cityObject = cityObjects[objectId];
                this._parseCityObject(ctx, cityObject, objectId);
            }
        }
    }

    _parseCityObject(ctx, cityObject, objectId) {

        const sceneModel = ctx.sceneModel;
        const data = ctx.data;

        if (ctx.loadMetadata) {

            const metaObjectId = objectId;
            const metaObjectType = cityObject.type;
            const metaObjectName = metaObjectType + " : " + objectId;
            const parentMetaObjectId = cityObject.parents ? cityObject.parents[0] : ctx.rootMetaObject.id;

            ctx.metadata.metaObjects.push({
                id: metaObjectId,
                name: metaObjectName,
                type: metaObjectType,
                parent: parentMetaObjectId
            });
        }

        ctx.stats.numMetaObjects++;

        if (!(cityObject.geometry && cityObject.geometry.length > 0)) {
            return;
        }

        const meshIds = [];

        for (let i = 0, len = cityObject.geometry.length; i < len; i++) {

            const geometry = cityObject.geometry[i];

            let objectMaterial;
            let surfaceMaterials;

            const appearance = data.appearance;
            if (appearance) {
                const materials = appearance.materials;
                if (materials) {
                    const geometryMaterial = geometry.material;
                    if (geometryMaterial) {
                        const themeIds = Object.keys(geometryMaterial);
                        if (themeIds.length > 0) {
                            const themeId = themeIds[0];
                            const theme = geometryMaterial[themeId];
                            if (theme.value !== undefined) {
                                objectMaterial = materials[theme.value];
                            } else {
                                const values = theme.values;
                                if (values) {
                                    surfaceMaterials = [];
                                    for (let j = 0, lenj = values.length; j < lenj; j++) {
                                        const value = values[i];
                                        const surfaceMaterial = materials[value];
                                        surfaceMaterials.push(surfaceMaterial);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (surfaceMaterials) {
                this._parseGeometrySurfacesWithOwnMaterials(ctx, geometry, surfaceMaterials, meshIds);

            } else {
                this._parseGeometrySurfacesWithSharedMaterial(ctx, geometry, objectMaterial, meshIds);
            }
        }

        if (meshIds.length > 0) {
            sceneModel.createEntity({
                id: objectId,
                meshIds: meshIds,
                isObject: true
            });

            ctx.stats.numObjects++;
        }
    }

    _parseGeometrySurfacesWithOwnMaterials(ctx, geometry, surfaceMaterials, meshIds) {

        const geomType = geometry.type;

        switch (geomType) {

            case "MultiPoint":
                break;

            case "MultiLineString":
                break;

            case "MultiSurface":

            case "CompositeSurface":
                const surfaces = geometry.boundaries;
                this._parseSurfacesWithOwnMaterials(ctx, surfaceMaterials, surfaces, meshIds);
                break;

            case "Solid":
                const shells = geometry.boundaries;
                for (let j = 0; j < shells.length; j++) {
                    const surfaces = shells[j];
                    this._parseSurfacesWithOwnMaterials(ctx, surfaceMaterials, surfaces, meshIds);
                }
                break;

            case "MultiSolid":

            case "CompositeSolid":
                const solids = geometry.boundaries;
                for (let j = 0; j < solids.length; j++) {
                    for (let k = 0; k < solids[j].length; k++) {
                        const surfaces = solids[j][k];
                        this._parseSurfacesWithOwnMaterials(ctx, surfaceMaterials, surfaces, meshIds);
                    }
                }
                break;

            case "GeometryInstance":
                break;
        }
    }

    _parseSurfacesWithOwnMaterials(ctx, surfaceMaterials, surfaces, meshIds) {

        const vertices = ctx.vertices;
        const sceneModel = ctx.sceneModel;

        for (let i = 0; i < surfaces.length; i++) {

            const surface = surfaces[i];
            const surfaceMaterial = surfaceMaterials[i] || {diffuseColor: [0.8, 0.8, 0.8], transparency: 1.0};

            const face = [];
            const holes = [];

            const sharedIndices = [];

            const geometryCfg = {
                positions: [],
                indices: []
            };

            for (let j = 0; j < surface.length; j++) {

                if (face.length > 0) {
                    holes.push(face.length);
                }

                const newFace = this._extractLocalIndices(ctx, surface[j], sharedIndices, geometryCfg);

                face.push(...newFace);
            }

            if (face.length === 3) { // Triangle

                geometryCfg.indices.push(face[0]);
                geometryCfg.indices.push(face[1]);
                geometryCfg.indices.push(face[2]);

            } else if (face.length > 3) { // Polygon

                // Prepare to triangulate

                const pList = [];

                for (let k = 0; k < face.length; k++) {
                    pList.push({
                        x: vertices[sharedIndices[face[k]]][0],
                        y: vertices[sharedIndices[face[k]]][1],
                        z: vertices[sharedIndices[face[k]]][2]
                    });
                }

                const normal = this._getNormalOfPositions(pList, math.vec3());

                // Convert to 2D

                let pv = [];

                for (let k = 0; k < pList.length; k++) {

                    this._to2D(pList[k], normal, tempVec2a);

                    pv.unshift(tempVec2a[0]);
                    pv.unshift(tempVec2a[1]);
                }

                // Triangulate

                const tr = earcut(pv, holes, 2);

                // Create triangles

                for (let k = 0; k < tr.length; k += 3) {
                    geometryCfg.indices.unshift(face[tr[k]]);
                    geometryCfg.indices.unshift(face[tr[k + 1]]);
                    geometryCfg.indices.unshift(face[tr[k + 2]]);
                }
            }

            const meshId = "" + ctx.nextId++;

            sceneModel.createMesh({
                id: meshId,
                primitive: "triangles",
                positions: geometryCfg.positions,
                indices: geometryCfg.indices,
                color: (surfaceMaterial && surfaceMaterial.diffuseColor) ? surfaceMaterial.diffuseColor : [0.8, 0.8, 0.8],
                opacity: (surfaceMaterial && surfaceMaterial.transparency !== undefined) ? (1.0 - surfaceMaterial.transparency) : 1.0
            });

            meshIds.push(meshId);

            ctx.stats.numGeometries++;
            ctx.stats.numVertices += geometryCfg.positions.length / 3;
            ctx.stats.numTriangles += geometryCfg.indices.length / 3;
        }
    }

    _parseGeometrySurfacesWithSharedMaterial(ctx, geometry, objectMaterial, meshIds) {

        const sceneModel = ctx.sceneModel;
        const sharedIndices = [];
        const geometryCfg = {
            positions: [],
            indices: []
        };

        const geomType = geometry.type;

        switch (geomType) {
            case "MultiPoint":
                break;

            case "MultiLineString":
                break;

            case "MultiSurface":
            case "CompositeSurface":
                const surfaces = geometry.boundaries;
                this._parseSurfacesWithSharedMaterial(ctx, surfaces, sharedIndices, geometryCfg);
                break;

            case "Solid":
                const shells = geometry.boundaries;
                for (let j = 0; j < shells.length; j++) {
                    const surfaces = shells[j];
                    this._parseSurfacesWithSharedMaterial(ctx, surfaces, sharedIndices, geometryCfg);
                }
                break;

            case "MultiSolid":
            case "CompositeSolid":
                const solids = geometry.boundaries;
                for (let j = 0; j < solids.length; j++) {
                    for (let k = 0; k < solids[j].length; k++) {
                        const surfaces = solids[j][k];
                        this._parseSurfacesWithSharedMaterial(ctx, surfaces, sharedIndices, geometryCfg);
                    }
                }
                break;

            case "GeometryInstance":
                break;
        }

        if (geometryCfg.positions.length > 0 && geometryCfg.indices.length > 0) {

            const meshId = "" + ctx.nextId++;

            sceneModel.createMesh({
                id: meshId,
                primitive: "triangles",
                positions: geometryCfg.positions,
                indices: geometryCfg.indices,
                color: (objectMaterial && objectMaterial.diffuseColor) ? objectMaterial.diffuseColor : [0.8, 0.8, 0.8],
                opacity: 1.0
                //opacity: (objectMaterial && objectMaterial.transparency !== undefined) ? (1.0 - objectMaterial.transparency) : 1.0
            });

            meshIds.push(meshId);

            ctx.stats.numGeometries++;
            ctx.stats.numVertices += geometryCfg.positions.length / 3;
            ctx.stats.numTriangles += geometryCfg.indices.length / 3;
        }
    }

    _parseSurfacesWithSharedMaterial(ctx, surfaces, sharedIndices, primitiveCfg) {

        const vertices = ctx.vertices;

        for (let i = 0; i < surfaces.length; i++) {

            let boundary = [];
            let holes = [];

            for (let j = 0; j < surfaces[i].length; j++) {
                if (boundary.length > 0) {
                    holes.push(boundary.length);
                }
                const newBoundary = this._extractLocalIndices(ctx, surfaces[i][j], sharedIndices, primitiveCfg);
                boundary.push(...newBoundary);
            }

            if (boundary.length === 3) { // Triangle

                primitiveCfg.indices.push(boundary[0]);
                primitiveCfg.indices.push(boundary[1]);
                primitiveCfg.indices.push(boundary[2]);

            } else if (boundary.length > 3) { // Polygon

                let pList = [];

                for (let k = 0; k < boundary.length; k++) {
                    pList.push({
                        x: vertices[sharedIndices[boundary[k]]][0],
                        y: vertices[sharedIndices[boundary[k]]][1],
                        z: vertices[sharedIndices[boundary[k]]][2]
                    });
                }

                const normal = this._getNormalOfPositions(pList, math.vec3());
                let pv = [];

                for (let k = 0; k < pList.length; k++) {
                    this._to2D(pList[k], normal, tempVec2a);
                    pv.unshift(tempVec2a[0]);
                    pv.unshift(tempVec2a[1]);
                }

                const tr = earcut(pv, holes, 2);

                for (let k = 0; k < tr.length; k += 3) {
                    primitiveCfg.indices.unshift(boundary[tr[k]]);
                    primitiveCfg.indices.unshift(boundary[tr[k + 1]]);
                    primitiveCfg.indices.unshift(boundary[tr[k + 2]]);
                }
            }
        }
    }

    _extractLocalIndices(ctx, boundary, sharedIndices, geometryCfg) {

        const vertices = ctx.vertices;
        const newBoundary = []

        for (let i = 0, len = boundary.length; i < len; i++) {

            const index = boundary[i];

            if (sharedIndices.includes(index)) {
                const vertexIndex = sharedIndices.indexOf(index);
                newBoundary.push(vertexIndex);

            } else {
                geometryCfg.positions.push(vertices[index][0]);
                geometryCfg.positions.push(vertices[index][1]);
                geometryCfg.positions.push(vertices[index][2]);

                newBoundary.push(sharedIndices.length);

                sharedIndices.push(index);
            }
        }

        return newBoundary
    }

    _getNormalOfPositions(positions, normal) {

        for (let i = 0; i < positions.length; i++) {

            let nexti = i + 1;
            if (nexti === positions.length) {
                nexti = 0;
            }

            normal[0] += ((positions[i].y - positions[nexti].y) * (positions[i].z + positions[nexti].z));
            normal[1] += ((positions[i].z - positions[nexti].z) * (positions[i].x + positions[nexti].x));
            normal[2] += ((positions[i].x - positions[nexti].x) * (positions[i].y + positions[nexti].y));
        }

        return math.normalizeVec3(normal);
    }

    _to2D(_p, _n, re) {

        const p = tempVec3a;
        const n = tempVec3b;
        const x3 = tempVec3c;

        p[0] = _p.x;
        p[1] = _p.y;
        p[2] = _p.z;

        n[0] = _n.x;
        n[1] = _n.y;
        n[2] = _n.z;

        x3[0] = 1.1;
        x3[1] = 1.1;
        x3[2] = 1.1;

        const dist = math.lenVec3(math.subVec3(x3, n));

        if (dist < 0.01) {
            x3[0] += 1.0;
            x3[1] += 2.0;
            x3[2] += 3.0;
        }

        const dot = math.dotVec3(x3, n);
        const tmp2 = math.mulVec3Scalar(n, dot, math.vec3());

        x3[0] -= tmp2[0];
        x3[1] -= tmp2[1];
        x3[2] -= tmp2[2];

        math.normalizeVec3(x3);

        const y3 = math.cross3Vec3(n, x3, math.vec3());
        const x = math.dotVec3(p, x3);
        const y = math.dotVec3(p, y3);

        re[0] = x;
        re[1] = y;
    }
}

export {CityJSONLoaderPlugin};
