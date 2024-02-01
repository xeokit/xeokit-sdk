import {utils} from "../../viewer/scene/utils.js";
import {SceneModel} from "../../viewer/scene/model/index.js";
import {Plugin} from "../../viewer/Plugin.js";
import {LASDefaultDataSource} from "./LASDefaultDataSource.js";
import {math} from "../../viewer/index.js";
import {parse} from '@loaders.gl/core';
import {LASLoader} from '@loaders.gl/las/dist/esm/las-loader.js';
import {loadLASHeader} from "./loadLASHeader";

const MAX_VERTICES = 500000; // TODO: Rough estimate

/**
 * {@link Viewer} plugin that loads lidar point cloud geometry from LAS files.
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/#loading_LASLoaderPlugin_Autzen"><img src="https://xeokit.github.io/xeokit-sdk/assets/images/autzen.png"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_LASLoaderPlugin_Autzen)]
 *
 * ## Summary
 *
 * * Loads [LAS 1.4 Format](https://www.asprs.org/divisions-committees/lidar-division/laser-las-file-format-exchange-activities) from both *.las* and *.laz* files.
 * * Loads lidar point cloud positions, colors and intensities.
 * * Supports 32 and 64-bit positions.
 * * Supports 8 and 16-bit color depths.
 * * Option to load every *n* points.
 * * Does not (yet) load [point classifications](https://www.usna.edu/Users/oceano/pguth/md_help/html/las_format_classification_codes.htm).
 *
 * ## Performance
 *
 * If you need faster loading, consider pre-converting your LAS files to XKT format using [xeokit-convert](https://github.com/xeokit/xeokit-convert), then loading them
 * with {@link XKTLoaderPlugin}.
 *
 * ## Scene and metadata representation
 *
 * When LASLoaderPlugin loads a LAS file, it creates two {@link Entity}s, a {@link MetaModel} and a {@link MetaObject}.
 *
 * The first Entity represents the file as a model within the Viewer's {@link Scene}. To indicate that it represents a model,
 * this Entity will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}.
 *
 * The second Entity represents the the point cloud itself, as an object within the Scene. To indicate that it
 * represents an object, this Entity will have {@link Entity#isObject} set ````true```` and will be registered
 * by {@link Entity#id} in {@link Scene#objects}.
 *
 * The MetaModel registers the LAS file as a model within the Viewer's {@link MetaScene}. The MetaModel will be registered
 * by {@link MetaModel#id} in {@link MetaScene#metaModels} .
 *
 * Finally, the MetaObject registers the point cloud as an object within the {@link MetaScene}. The MetaObject will be registered
 * by {@link MetaObject#id} in {@link MetaScene#metaObjects}.
 *
 * ## Usage
 *
 * In the example below we'll load the Autzen model from
 * a [LAS file](/assets/models/las/). Once the model has
 * loaded, we'll then find its {@link MetaModel}, and the {@link MetaObject} and {@link Entity} that represent its point cloud.
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#loading_LASLoaderPlugin_Autzen)]
 *
 * ````javascript
 * import {Viewer, LASLoaderPlugin} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *      canvasId: "myCanvas",
 *      transparent: true
 * });
 *
 * viewer.camera.eye = [-2.56, 8.38, 8.27];
 * viewer.camera.look = [13.44, 3.31, -14.83];
 * viewer.camera.up = [0.10, 0.98, -0.14];
 *
 * const lasLoader = new LASLoaderPlugin(viewer, {
 *     colorDepth: 8, // Default
 *     fp64: false,   // Default
 *     skip: 1        // Default
 * });
 *
 * const modelEntity = lasLoader.load({
 *     id: "myModel",
 *     src: "../assets/models/las/autzen.laz"
 * });
 *
 * modelEntity.on("loaded", () => {
 *
 *      const metaModel = viewer.metaScene.metaModels[modelEntity.id];
 *      const pointCloudMetaObject = metaModel.rootMetaObject;
 *
 *      const pointCloudEntity = viewer.scene.objects[pointCloudMetaObject.id];
 *
 *      //...
 * });
 * ````
 *
 * ## Transforming
 *
 * We have the option to rotate, scale and translate each LAS model as we load it.
 *
 * In the example below, we'll scale our model to half its size, rotate it 90 degrees about its local X-axis, then
 * position it at [1842022, 10, -5173301] within xeokit's world coordinate system.
 *
 * ````javascript
 * const modelEntity = lasLoader.load({
 *      id: "myModel",
 *      src: "../assets/models/las/autzen.laz"
 *      rotation: [90,0,0],
 *      scale: [0.5, 0.5, 0.5],
 *      origin: [1842022, 10, -5173301]
 * });
 * ````
 *
 * ## Configuring a custom data source
 *
 * By default, LASLoaderPlugin will load LAS files over HTTP.
 *
 * In the example below, we'll customize the way LASLoaderPlugin loads the files by configuring it with our own data source
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
 *      // Gets the contents of the given LAS file in an arraybuffer
 *      getLAS(src, ok, error) {
 *          utils.loadArraybuffer(src,
 *              (arraybuffer) => {
 *                  ok(arraybuffer);
 *              },
 *              (errMsg) => {
 *                  error(errMsg);
 *              });
 *      }
 * }
 *
 * const lasLoader = new LASLoaderPlugin(viewer, {
 *       dataSource: new MyDataSource()
 * });
 *
 * const modelEntity = lasLoader.load({
 *      id: "myModel",
 *      src: "../assets/models/las/autzen.laz"
 * });
 * ````
 *
 * @class LASLoaderPlugin
 * @since 2.0.17
 */
class LASLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="lasLoader"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Object} [cfg.dataSource] A custom data source through which the LASLoaderPlugin can load model and metadata files. Defaults to an instance of {@link LASDefaultDataSource}, which loads over HTTP.
     * @param {Number} [cfg.skip=1] Configures LASLoaderPlugin to load every **n** points.
     * @param {Number} [cfg.fp64=false] Configures if LASLoaderPlugin assumes that LAS positions are stored in 64-bit floats instead of 32-bit.
     * @param {Number} [cfg.colorDepth=8] Configures whether LASLoaderPlugin assumes that LAS colors are encoded using 8 or 16 bits. Accepted values are 8, 16 an "auto".
     */
    constructor(viewer, cfg = {}) {

        super("lasLoader", viewer, cfg);

        this.dataSource = cfg.dataSource;
        this.skip = cfg.skip;
        this.fp64 = cfg.fp64;
        this.colorDepth = cfg.colorDepth;
    }

    /**
     * Gets the custom data source through which the LASLoaderPlugin can load LAS files.
     *
     * Default value is {@link LASDefaultDataSource}, which loads via HTTP.
     *
     * @type {Object}
     */
    get dataSource() {
        return this._dataSource;
    }

    /**
     * Sets a custom data source through which the LASLoaderPlugin can load LAS files.
     *
     * Default value is {@link LASDefaultDataSource}, which loads via HTTP.
     *
     * @type {Object}
     */
    set dataSource(value) {
        this._dataSource = value || new LASDefaultDataSource();
    }

    /**
     * When LASLoaderPlugin is configured to load every **n** points, returns the value of **n**.
     *
     * Default value is ````1````.
     *
     * @returns {Number} The **n**th point that LASLoaderPlugin will read.
     */
    get skip() {
        return this._skip;
    }

    /**
     * Configures LASLoaderPlugin to load every **n** points.
     *
     * Default value is ````1````.
     *
     * @param {Number} value The **n**th point that LASLoaderPlugin will read.
     */
    set skip(value) {
        this._skip = value || 1;
    }

    /**
     * Gets if LASLoaderPlugin assumes that LAS positions are stored in 64-bit floats instead of 32-bit.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} True if LASLoaderPlugin assumes that positions are stored in 64-bit floats instead of 32-bit.
     */
    get fp64() {
        return this._fp64;
    }

    /**
     * Configures if LASLoaderPlugin assumes that LAS positions are stored in 64-bit floats instead of 32-bit.
     *
     * Default value is ````false````.
     *
     * @param {Boolean} value True if LASLoaderPlugin assumes that positions are stored in 64-bit floats instead of 32-bit.
     */
    set fp64(value) {
        this._fp64 = !!value;
    }

    /**
     * Gets whether LASLoaderPlugin assumes that LAS colors are encoded using 8 or 16 bits.
     *
     * Default value is ````8````.
     *
     * Note: LAS specification recommends 16 bits.
     *
     * @returns {Number|String} Possible returned values are 8, 16 and "auto".
     */
    get colorDepth() {
        return this._colorDepth;
    }

    /**
     * Configures whether LASLoaderPlugin assumes that LAS colors are encoded using 8 or 16 bits.
     *
     * Default value is ````8````.
     *
     * Note: LAS specification recommends 16 bits.
     *
     * @param {Number|String} value Valid values are 8, 16 and "auto".
     */
    set colorDepth(value) {
        this._colorDepth = value || "auto";
    }

    /**
     * Loads an ````LAS```` model into this LASLoaderPlugin's {@link Viewer}.
     *
     * @param {*} params Loading parameters.
     * @param {String} [params.id] ID to assign to the root {@link Entity#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default.
     * @param {String} [params.src] Path to a LAS file, as an alternative to the ````las```` parameter.
     * @param {ArrayBuffer} [params.las] The LAS file data, as an alternative to the ````src```` parameter.
     * @param {Boolean} [params.loadMetadata=true] Whether to load metadata for the LAS model.
     * @param {Number[]} [params.origin=[0,0,0]] The model's World-space double-precision 3D origin. Use this to position the model within xeokit's World coordinate system, using double-precision coordinates.
     * @param {Number[]} [params.position=[0,0,0]] The model single-precision 3D position, relative to the ````origin```` parameter.
     * @param {Number[]} [params.scale=[1,1,1]] The model's scale.
     * @param {Number[]} [params.rotation=[0,0,0]] The model's orientation, given as Euler angles in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [params.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] The model's world transform matrix. Overrides the position, scale and rotation parameters. Relative to ````origin````.
     * @param {Object} [params.stats] Collects model statistics.
     * @returns {Entity} Entity representing the model, which will have {@link Entity#isModel} set ````true```` and will be registered by {@link Entity#id} in {@link Scene#models}.
     */
    load(params = {}) {

        if (params.id && this.viewer.scene.components[params.id]) {
            this.error("Component with this ID already exists in viewer: " + params.id + " - will autogenerate this ID");
            delete params.id;
        }

        const sceneModel = new SceneModel(this.viewer.scene, utils.apply(params, {
            isModel: true
        }));

        if (!params.src && !params.las) {
            this.error("load() param expected: src or las");
            return sceneModel; // Return new empty model
        }

        const options = {
            las: {
                skip: this._skip,
                fp64: this._fp64,
                colorDepth: this._colorDepth
            }
        };

        if (params.src) {
            this._loadModel(params.src, params, options, sceneModel);
        } else {
            const spinner = this.viewer.scene.canvas.spinner;
            spinner.processes++;
            this._parseModel(params.las, params, options, sceneModel).then(() => {
                spinner.processes--;
            }, (errMsg) => {
                spinner.processes--;
                this.error(errMsg);
                sceneModel.fire("error", errMsg);
            });
        }

        return sceneModel;
    }

    _loadModel(src, params, options, sceneModel) {
        const spinner = this.viewer.scene.canvas.spinner;
        spinner.processes++;
        this._dataSource.getLAS(params.src, (arrayBuffer) => {
                this._parseModel(arrayBuffer, params, options, sceneModel).then(() => {
                    spinner.processes--;
                }, (errMsg) => {
                    spinner.processes--;
                    this.error(errMsg);
                    sceneModel.fire("error", errMsg);
                });
            },
            (errMsg) => {
                spinner.processes--;
                this.error(errMsg);
                sceneModel.fire("error", errMsg);
            });
    }

    _parseModel(arrayBuffer, params, options, sceneModel) {

        function readPositions(attributesPosition) {
            const positionsValue = attributesPosition.value;
            if (params.rotateX) {
                if (positionsValue) {
                    for (let i = 0, len = positionsValue.length; i < len; i += 3) {
                        const temp = positionsValue[i + 1];
                        positionsValue[i + 1] = positionsValue[i + 2];
                        positionsValue[i + 2] = temp;
                    }
                }
            }
            return positionsValue;
        }

        function readColorsAndIntensities(attributesColor, attributesIntensity) {
            const colors = attributesColor.value;
            const colorSize = attributesColor.size;
            const intensities = attributesIntensity.value;
            const colorsCompressedSize = intensities.length * 4;
            const colorsCompressed = new Uint8Array(colorsCompressedSize);
            for (let i = 0, j = 0, k = 0, len = intensities.length; i < len; i++, k += colorSize, j += 4) {
                colorsCompressed[j + 0] = colors[k + 0];
                colorsCompressed[j + 1] = colors[k + 1];
                colorsCompressed[j + 2] = colors[k + 2];
                colorsCompressed[j + 3] = Math.round((intensities[i] / 65536) * 255);
            }
            return colorsCompressed;
        }

        function readIntensities(attributesIntensity) {
            const intensities = attributesIntensity.intensity;
            const colorsCompressedSize = intensities.length * 4;
            const colorsCompressed = new Uint8Array(colorsCompressedSize);
            for (let i = 0, j = 0, k = 0, len = intensities.length; i < len; i++, k += 3, j += 4) {
                colorsCompressed[j + 0] = 0;
                colorsCompressed[j + 1] = 0;
                colorsCompressed[j + 2] = 0;
                colorsCompressed[j + 3] = Math.round((intensities[i] / 65536) * 255);
            }
            return colorsCompressed;
        }

        return new Promise((resolve, reject) => {

            if (sceneModel.destroyed) {
                reject();
                return;
            }

            const stats = params.stats || {};
            stats.sourceFormat = "LAS";
            stats.schemaVersion = "";
            stats.title = "";
            stats.author = "";
            stats.created = "";
            stats.numMetaObjects = 0;
            stats.numPropertySets = 0;
            stats.numObjects = 0;
            stats.numGeometries = 0;
            stats.numTriangles = 0;
            stats.numVertices = 0;

            try {

                const lasHeader = loadLASHeader(arrayBuffer);

                parse(arrayBuffer, LASLoader, options).then((parsedData) => {

                    const attributes = parsedData.attributes;
                    const loaderData = parsedData.loaderData;
                    const pointsFormatId = loaderData.pointsFormatId !== undefined ? loaderData.pointsFormatId : -1;

                    if (!attributes.POSITION) {
                        sceneModel.finalize();
                        reject("No positions found in file");
                        return;
                    }

                    let positionsValue
                    let colorsCompressed;

                    switch (pointsFormatId) {
                        case 0:
                            positionsValue = readPositions(attributes.POSITION);
                            colorsCompressed = readIntensities(attributes.intensity);
                            break;
                        case 1:
                            if (!attributes.intensity) {
                                sceneModel.finalize();
                                reject("No positions found in file");
                                return;
                            }
                            positionsValue = readPositions(attributes.POSITION);
                            colorsCompressed = readIntensities(attributes.intensity);
                            break;
                        case 2:
                            if (!attributes.intensity) {
                                sceneModel.finalize();
                                reject("No positions found in file");
                                return;
                            }
                            positionsValue = readPositions(attributes.POSITION);
                            colorsCompressed = readColorsAndIntensities(attributes.COLOR_0, attributes.intensity);
                            break;
                        case 3:
                            if (!attributes.intensity) {
                                sceneModel.finalize();
                                reject("No positions found in file");
                                return;
                            }
                            positionsValue = readPositions(attributes.POSITION);
                            colorsCompressed = readColorsAndIntensities(attributes.COLOR_0, attributes.intensity);
                            break;
                    }

                    const pointsChunks = chunkArray(positionsValue, MAX_VERTICES * 3);
                    const colorsChunks = chunkArray(colorsCompressed, MAX_VERTICES * 4);
                    const meshIds = [];

                    for (let i = 0, len = pointsChunks.length; i < len; i++) {
                        const meshId = `pointsMesh${i}`;
                        meshIds.push(meshId);
                        sceneModel.createMesh({
                            id: meshId,
                            primitive: "points",
                            positions: pointsChunks[i],
                            colorsCompressed: (i < colorsChunks.length) ? colorsChunks[i] : null
                        });
                    }
                    /*
                                const pointsChunks = chunkArray(positionsValue, MAX_VERTICES * 3);
                    const colorsChunks = chunkArray(colorsCompressed, MAX_VERTICES * 4);
                    const meshIds = [];

                    for (let i = 0, len = pointsChunks.length; i < len; i++) {

                        const geometryId = `geometryMesh${i}`;
                        const meshId = `pointsMesh${i}`;
                        meshIds.push(meshId);

                        sceneModel.createGeometry({
                            id: geometryId,
                            primitive: "points",
                            positions: pointsChunks[i],
                            colorsCompressed: (i < colorsChunks.length) ? colorsChunks[i] : null
                        });

                        sceneModel.createMesh({
                            id: meshId,
                            geometryId
                        });
                    }
                     */

                    const pointsObjectId = math.createUUID();

                    sceneModel.createEntity({
                        id: pointsObjectId,
                        meshIds,
                        isObject: true
                    });

                    sceneModel.finalize();

                    if (params.loadMetadata !== false) {
                        const rootMetaObjectId = math.createUUID();
                        const metadata = {
                            projectId: "",
                            author: "",
                            createdAt: "",
                            schema: "",
                            creatingApplication: "",
                            metaObjects: [
                                {
                                    id: rootMetaObjectId,
                                    name: "Model",
                                    type: "Model"
                                },
                                {
                                    id: pointsObjectId,
                                    name: "PointCloud (LAS)",
                                    type: "PointCloud",
                                    parent: rootMetaObjectId,
                                    attributes: lasHeader || {}
                                }
                            ],
                            propertySets: []
                        };
                        const metaModelId = sceneModel.id;
                        this.viewer.metaScene.createMetaModel(metaModelId, metadata, options);
                    }

                    sceneModel.scene.once("tick", () => {
                        if (sceneModel.destroyed) {
                            return;
                        }
                        sceneModel.scene.fire("modelLoaded", sceneModel.id); // FIXME: Assumes listeners know order of these two events
                        sceneModel.fire("loaded", true, false); // Don't forget the event, for late subscribers
                    });

                    resolve();
                });
            } catch (e) {
                sceneModel.finalize();
                reject(e);
            }
        });
    }
}

function chunkArray(array, chunkSize) {
    if (chunkSize >= array.length) {
        return array;
    }
    let result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
}

export {LASLoaderPlugin};
