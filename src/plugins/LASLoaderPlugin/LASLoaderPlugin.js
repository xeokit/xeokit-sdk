import {utils} from "../../viewer/scene/utils.js";
import {SceneModel} from "../../viewer/scene/model/index.js";
import {Plugin} from "../../viewer/Plugin.js";
import {LASDefaultDataSource} from "./LASDefaultDataSource.js";
import {math} from "../../viewer/index.js";
import {parse} from '@loaders.gl/core';
import {LASLoader} from '@loaders.gl/las';
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

                // Version Number: The version number consists of a major and minor field. The major and minor
                // fields combine to form the number that indicates the format number of the current specification
                // itself. For example, specification number 1.2 would contain 1 in the major field and
                // 2 in the minor field.

                const versionMajor = lasHeader.VersionMajor;
                const versionMinor = lasHeader.VersionMinor;

                if (versionMajor !== 1 || (versionMinor !== 1 && versionMinor !== 2 && versionMinor !== 3)) {
                    sceneModel.finalize();
                    reject("Unsupported LAS version - supported versions are v1.2 and v1.3.");
                    return;
                }

                // console.info(`LAS Version: ${versionMajor}.${versionMinor}`);

                // Point Data Format ID: The point data format ID corresponds to the point data record format
                // type. LAS 1.2 defines types 0, 1, 2 and 3.

                const pointDataFormatId = lasHeader.PointDataFormatID;

                if (pointDataFormatId !== 0 &&
                    pointDataFormatId !== 1 &&
                    pointDataFormatId !== 2 &&
                    pointDataFormatId !== 3) {
                    sceneModel.finalize();
                    reject("Unsupported LAS Point Data Format ID - supported formats are 0, 1, 2 and 3.");
                    return;
                }

                // console.info(`LAS Point Data Format: ${pointDataFormatId}`);

                // X, Y, and Z scale factors: The scale factor fields contain a double floating point value that is used
                // to scale the corresponding X, Y, and Z long values within the point records. The corresponding
                // X, Y, and Z scale factor must be multiplied by the X, Y, or Z point record value to get the actual
                // X, Y, or Z coordinate. For example, if the X, Y, and Z coordinates are intended to have two
                // decimal point values, then each scale factor will contain the number 0.01.

                const scaleFactorX = lasHeader.ScaleFactorX || 1.0;
                const scaleFactorY = lasHeader.ScaleFactorY || 1.0;
                const scaleFactorZ = lasHeader.ScaleFactorZ || 1.0;

                // console.info(`LAS ScaleFactors: [${scaleFactorX},${scaleFactorY},${scaleFactorZ}]`);

                // X, Y, and Z offset: The offset fields should be used to set the overall offset for the point records.
                // In general these numbers will be zero, but for certain cases the resolution of the point data may
                // not be large enough for a given projection system. However, it should always be assumed that
                // these numbers are used. So to scale a given X from the point record, take the point record X
                // multiplied by the X scale factor, and then add the X offset.

                const offsetX = lasHeader.OffsetX || 0.0;
                const offsetY = lasHeader.OffsetY || 0.0;
                const offsetZ = lasHeader.OffsetZ || 0.0;

                // console.info(`LAS Offsets: [${offsetX},${offsetY},${offsetZ}]`);

                // Max and Min X, Y, Z: The max and min data fields are the actual unscaled extents of the LAS
                // point file data, specified in the coordinate system of the LAS data.

                const minX = lasHeader.MinX;
                const minY = lasHeader.MinY;
                const minZ = lasHeader.MinZ;
                const maxX = lasHeader.MaxX;
                const maxY = lasHeader.MaxY;
                const maxZ = lasHeader.MaxZ;

                // console.info(`LAS unscaled Min = [${minX},${minY},${minZ}], Max = [${maxX},${maxY},${maxZ}]`);

                // The projection information for the point data is required for all data. The projection information
                // will be placed in the Variable Length Records. Placing the projection information within the
                // Variable Length Records allows for any projection to be defined including custom projections.
                // The GeoTIff specification http://www.remotesensing.org/geotiff/geotiff.html is the model for
                // representing the projection information, and the format is explicitly defined by this specification.

                const numberOfVariablelengthRecords = lasHeader.NumberOfVaraibleLengthRecords;

                // TODO: Parse projection info from Variable Length Records?

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

                function readPositions(attributesPosition) {
                    const positionsValue = attributesPosition.value;

                    // Positions are already scaled and offset by loaders.gl
                    // Disable scaling and offset, but keep here for reference for now

                    // for (let i = 0, len = positionsValue.length; i < len; i += 3) {
                    //     positionsValue[i + 0] = (positionsValue[i + 0] * scaleFactorX) + offsetX;
                    //     positionsValue[i + 1] = (positionsValue[i + 1] * scaleFactorY) + offsetY;
                    //     positionsValue[i + 2] = (positionsValue[i + 2] * scaleFactorZ) + offsetZ;
                    // }

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

                function worldToRTCPos(worldPos, origin, rtcPos, cellSize = 1000) { // TODO: cellSize guessed
                    origin[0] = Math.round(worldPos[0] / cellSize) * cellSize;
                    origin[1] = Math.round(worldPos[1] / cellSize) * cellSize;
                    origin[2] = Math.round(worldPos[2] / cellSize) * cellSize;
                    rtcPos[0] = worldPos[0] - origin[0];
                    rtcPos[1] = worldPos[1] - origin[1];
                    rtcPos[2] = worldPos[2] - origin[2];
                }

                function getRTCPositions(positions, colors) {

                    if ((positions.length / 3) !== (colors.length / 4)) {
                        throw "Mismatch in lengths of positions and colors arrays";
                    }

                    const rtcTiles = {};

                    const worldPos = math.vec3();
                    const origin = math.vec3();
                    const rtcPos = math.vec3();

                    for (let i = 0, j = 0, len = positions.length; i < len; i += 3, j += 4) {

                        worldPos[0] = positions[i];
                        worldPos[1] = positions[i + 1];
                        worldPos[2] = positions[i + 2];

                        worldToRTCPos(worldPos, origin, rtcPos);

                        const tileId = `${origin[0]}-${origin[1]}-${origin[2]}`;

                        let rtcTile = rtcTiles[tileId];
                        if (!rtcTile) {
                            rtcTile = {
                                origin: origin.slice(),
                                positions: [],
                                colors: []
                            };
                            rtcTiles[tileId] = rtcTile;
                        }

                        rtcTile.positions.push(rtcPos[0]);
                        rtcTile.positions.push(rtcPos[1]);
                        rtcTile.positions.push(rtcPos[2]);

                        rtcTile.colors.push(colors[j + 0]);
                        rtcTile.colors.push(colors[j + 1]);
                        rtcTile.colors.push(colors[j + 2]);
                        rtcTile.colors.push(colors[j + 3]);
                    }

                    return Object.values(rtcTiles);
                }

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

                    const meshIds = [];

                    const rtcTiles = getRTCPositions(positionsValue, colorsCompressed);

                    for (let i = 0, leni = rtcTiles.length; i < leni; i++) {

                        const rtcTile = rtcTiles[i];
                        const pointsChunks = chunkArray(rtcTile.positions, MAX_VERTICES * 3);
                        const colorsChunks = chunkArray(rtcTile.colors, MAX_VERTICES * 4);
                        const origin = rtcTile.origin;

                        for (let j = 0, lenj = pointsChunks.length; j < lenj; j++) {

                            const meshId = `pointsMesh-${i}-${j}`;
                            meshIds.push(meshId);

                            sceneModel.createMesh({
                                id: meshId,
                                primitive: "points",
                                origin,
                                positions: pointsChunks[j],
                                colorsCompressed: (j < colorsChunks.length) ? colorsChunks[j] : null
                            });
                        }
                    }

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
                                    name: `PointCloud (LAS v${versionMajor}.${versionMinor})`,
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
        return [array]; // One chunk
    }
    let result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
}

export {LASLoaderPlugin};
