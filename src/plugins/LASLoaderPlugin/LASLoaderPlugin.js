import {utils} from "../../viewer/scene/utils.js";
import {SceneModel} from "../../viewer/scene/model/index.js";
import {Plugin} from "../../viewer/Plugin.js";
import {LASDefaultDataSource} from "./LASDefaultDataSource.js";
import {math} from "../../viewer/index.js";
import {parse} from "../../external.js";
import {LASLoader} from "../../external.js";
import {loadLASHeader} from "./loadLASHeader.js";

const MAX_VERTICES = 500000; // TODO: Rough estimate

/**
 * {@link Viewer} plugin that loads lidar point cloud geometry from LAS files.
 *
 * <a href="https://xeokit.github.io/xeokit-sdk/examples/index.html#loading_LASLoaderPlugin_Autzen"><img src="https://xeokit.github.io/xeokit-sdk/assets/images/autzen.png"></a>
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#loading_LASLoaderPlugin_Autzen)]
 *
 * ## Summary
 *
 * * Loads [LAS Formats](https://www.asprs.org/divisions-committees/lidar-division/laser-las-file-format-exchange-activities) up to v1.3 from both *.las* and *.laz* files. It does not support LAS v1.4.
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
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/index.html#loading_LASLoaderPlugin_Autzen)]
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
 * ## Showing a LAS/LAZ model in TreeViewPlugin
 *
 * We can use the `load()` method's `elementId` parameter
 * to make LASLoaderPlugin load the entire model into a single Entity that gets this ID.
 *
 * In conjunction with that parameter, we can then use the `load()` method's `metaModelJSON` parameter to create a MetaModel that
 * contains a MetaObject that corresponds to that Entity.
 *
 * When we've done that, then xeokit's {@link TreeViewPlugin} is able to have a node that represents the model and controls
 * the visibility of that Entity (ie. to control the visibility of the entire model).
 *
 * The snippet below shows how this is done.
 *
 * ````javascript
 * import {Viewer, LASLoaderPlugin, NavCubePlugin, TreeViewPlugin} from "../../dist/xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * new TreeViewPlugin(viewer, {
 *     containerElement: document.getElementById("treeViewContainer"),
 *     hierarchy: "containment"
 * });
 *
 * const lasLoader = new LASLoaderPlugin(viewer);
 *
 * const sceneModel = lasLoader.load({  // Creates a SceneModel with ID "myScanModel"
 *     id: "myScanModel",
 *     src: "../../assets/models/las/Nalls_Pumpkin_Hill.laz",
 *     rotation: [-90, 0, 0],
 *
 *     entityId: "3toKckUfH2jBmd$7uhJHa4", // Creates an Entity with this ID
 *
 *     metaModelJSON: { // Creates a MetaModel with ID "myScanModel"
 *         "metaObjects": [
 *             {
 *                 "id": "3toKckUfH2jBmd$7uhJHa6", // Creates this MetaObject with this ID
 *                 "name": "My Project",
 *                 "type": "Default",
 *                 "parent": null
 *             },
 *             {
 *                 "id": "3toKckUfH2jBmd$7uhJHa4", // Creates this MetaObject with this ID
 *                 "name": "My Scan",
 *                 "type": "Default",
 *                 "parent": "3toKckUfH2jBmd$7uhJHa6"
 *             }
 *         ]
 *     }
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
     * @param {Boolean} [cfg.center=false] Whether to center the LAS points.  Applied before "rotateX", "rotate" and "transform".
     * @param {Boolean} [cfg.rotateX=false] Whether to rotate the LAS point positions 90 degrees. Applied after "center".
     * @param {Number[]} [cfg.rotate=[0,0,0]] Rotations to immediately apply to the LAS points, given as Euler angles in degrees, for each of the X, Y and Z axis. Rotation is applied after "center" and "rotateX".
     * @param {Number[]} [cfg.transform] 4x4 transform matrix to immediately apply to the LAS points. This is applied after "center", "rotateX" and "rotate". Typically used instead of "rotateX" and "rotate".
     */
    constructor(viewer, cfg = {}) {

        super("lasLoader", viewer, cfg);

        this.dataSource = cfg.dataSource;
        this.skip = cfg.skip;
        this.fp64 = cfg.fp64;
        this.colorDepth = cfg.colorDepth;
        this.center = cfg.center;
        this.rotate = cfg.rotate;
        this.rotateX = cfg.rotateX;
        this.transform = cfg.transform;
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
     * Gets if LASLoaderPlugin immediately centers LAS positions.
     *
     * If this is ````true```` then centering is the first thing that happens to LAS positions as they are loaded.
     *
     * Default value is ````false````.
     *
     * @returns {Boolean} True if LASLoaderPlugin immediately centers LAS positions.
     */
    get center() {
        return this._center;
    }

    /**
     * Configures if LASLoaderPlugin immediately centers LAS positions.
     *
     * If this is ````true```` then centering is the first thing that happens to LAS positions as they are loaded.
     *
     * Default value is ````false````.
     *
     * @param {Boolean} value True if LASLoaderPlugin immediately centers LAS positions.
     */
    set center(value) {
        this._center = !!value;
    }

    /**
     * Gets the current transformation to apply to LAS positions as they are loaded.
     *
     * If this is ````true````, then LAS positions will be transformed after they are centered and rotated.
     *
     * Default value is null.
     *
     * @returns {Number[]|null} A 16-element array containing a 4x4 transformation matrix.
     */
    get transform() {
        return this._transform;
    }

    /**
     * Sets the current transformation to apply to LAS positions as they are loaded.
     *
     * If this is ````true````, then LAS positions will be transformed after they are centered and rotated.
     *
     * Default value is null.
     *
     * @param {Number[]|null} transform A 16-element array containing a 4x4 transformation matrix.
     */
    set transform(transform) {
        this._transform = transform;
    }

    /**
     * Gets the current rotations to apply to LAS positions as they are loaded.
     *
     * Rotations are an array of three Euler angles in degrees, for each of the X, Y and Z axis, applied in that order.
     *
     * Default value is null.
     *
     * @returns {Number[]|null} If defined, an array of three Euler angles in degrees, for each of the X, Y and Z axis. Null if undefined.
     */
    get rotate() {
        return this._rotate;
    }

    /**
     * Sets the current rotations to apply to LAS positions as they are loaded.
     *
     * Rotations are an array of three Euler angles in degrees, for each of the X, Y and Z axis, applied in that order.
     *
     * Default value is null.
     *
     * @param {Number[]|null} rotate Array of three Euler angles in degrees, for each of the X, Y and Z axis.
     */
    set rotate(rotate) {
        this._rotate = rotate;
    }

    /**
     * Gets if LAS positions are rotated 90 degrees about X as they are loaded.
     *
     * Default value is ````false````.
     *
     * @returns {*}
     */
    get rotateX() {
        return this._rotateX;
    }

    /**
     * Sets if LAS positions are rotated 90 degrees about X as they are loaded.
     *
     * Default value is ````false````.
     *
     * @param rotateX
     */
    set rotateX(rotateX) {
        this._rotateX = rotateX;
    }

    /**
     * Loads an ````LAS```` model into this LASLoaderPlugin's {@link Viewer}.
     *
     * @param {*} params Loading parameters.
     * @param {String} [params.id] ID to assign to the root {@link Entity#id}, unique among all components in the Viewer's {@link Scene}, generated automatically by default.
     * @param {String} [params.src] Path to a LAS file, as an alternative to the ````las```` parameter.
     * @param {ArrayBuffer} [params.las] The LAS file data, as an alternative to the ````src```` parameter.
     *  @param {String} [params.manifestSrc] Path or URL to a JSON manifest file that provides paths to ````.laz```` || ````.las```` files to load as parts of the model. Use this option to load models that have been split into
     * @param {Object} [params.manifest] A JSON manifest object (as an alternative to a path or URL) that provides paths to ````.laz```` || ````.las```` files to load as parts of the model. Use this option to load models that have been split into
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
            maxGeometryBatchSize: MAX_VERTICES,
            isModel: true
        }));

        if (!params.src && !params.las && !params.manifest && !params.manifestSrc) {
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

        const spinner = this.viewer.scene.canvas.spinner;
        const done = () => {
            sceneModel.scene.once("tick", () => {
                if (sceneModel.destroyed) {
                    return;
                }
                sceneModel.scene.fire("modelLoaded", sceneModel.id); // FIXME: Assumes listeners know order of these two events
                sceneModel.fire("loaded", true, false); // Don't forget the event, for late subscribers
            });
            spinner.processes--;
        }
        const error = (errMsg) => {
            spinner.processes--;
            this.error(errMsg);
            sceneModel.fire("error", errMsg);
        }

        if (params.src) {
            this._loadModel(params.src, params, options, sceneModel);
        } else if(params.las) {
            spinner.processes++;
            this._parseModel(params.las, params, options, sceneModel).then(done, error);
        } else if (params.manifest || params.manifestSrc) {
            const baseDir = params.manifestSrc ? getBaseDirectory(params.manifestSrc) : "";
            const loadAllFiles = (lasFiles) => { 
                let i = 0;
                const modelsLoaded = new Array(lasFiles.length);
                const loadNext = () => {
                    if (sceneModel.destroyed) {
                        done();
                    } else if (i >= lasFiles.length) {
                        return
                    } else {
                        modelsLoaded[i] = false;
                        this._dataSource.getLAS(`${baseDir}${lasFiles[i]}`, (arrayBuffer) => {
                            const modelParams = utils.apply(params, {isManifest: true, index: i});
                            this._parseModel(arrayBuffer, modelParams, options, sceneModel).then(() => {
                                modelsLoaded[modelParams.index] = true;
                                let allLoaded = true;
                                modelsLoaded.forEach((loaded) => {
                                    if(!loaded) allLoaded = false;
                                })
                                if(allLoaded) done();
                            });
                            i++;
                            this.scheduleTask(loadNext, 200);
                        }, error);
                    }
                }
                loadNext();
            };
            const loadManifestData = (manifestData) => {
                if(sceneModel.destroyed) return;
                const files = manifestData.lasFiles || manifestData.lazFiles;
                if(!files || files.length <= 0) {
                    this.error(`load(): Failed to load model manifest - manifest not valid`);
                    return;
                }
                loadAllFiles(files);
            }
            if(params.manifestSrc) {
                this._dataSource.getManifest(params.manifestSrc, (manifestData) => {
                    loadManifestData(manifestData);
                }, (errMsg) => {
                    this.error(errMsg);
                    sceneModel.fire("error", errMsg);
                })
            } else {
                const manifestData = params.manifest;
                loadManifestData(manifestData);
            }
        }

        return sceneModel;
    }

    _loadModel(src, params, options, sceneModel) {
        const spinner = this.viewer.scene.canvas.spinner;
        spinner.processes++;
        this._dataSource.getLAS(params.src, (arrayBuffer) => {
                this._parseModel(arrayBuffer, params, options, sceneModel).then(() => {
                    sceneModel.scene.once("tick", () => {
                        if (sceneModel.destroyed) {
                            return;
                        }
                        sceneModel.scene.fire("modelLoaded", sceneModel.id); // FIXME: Assumes listeners know order of these two events
                        sceneModel.fire("loaded", true, false); // Don't forget the event, for late subscribers
                    });
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

        const readPositions = (attributesPosition) => {
            const positionsValue = attributesPosition.value;
            if (this._center) {
                const centerPos = math.vec3();
                const numPoints = positionsValue.length;
                for (let i = 0, len = positionsValue.length; i < len; i += 3) {
                    centerPos[0] += positionsValue[i + 0];
                    centerPos[1] += positionsValue[i + 1];
                    centerPos[2] += positionsValue[i + 2];
                }
                centerPos[0] /= numPoints;
                centerPos[1] /= numPoints;
                centerPos[2] /= numPoints;
                for (let i = 0, len = positionsValue.length; i < len; i += 3) {
                    positionsValue[i + 0] -= centerPos[0];
                    positionsValue[i + 1] -= centerPos[1];
                    positionsValue[i + 2] -= centerPos[2];
                }
            }
            if (this._rotateX) {
                if (positionsValue) {
                    for (let i = 0, len = positionsValue.length; i < len; i += 3) {
                        const temp = positionsValue[i + 1];
                        positionsValue[i + 1] = positionsValue[i + 2];
                        positionsValue[i + 2] = temp;
                    }
                }
            }
            if (this._rotate) {
                const quaternion = math.identityQuaternion();
                const mat = math.mat4();
                math.eulerToQuaternion(this._rotate, "XYZ", quaternion);
                math.quaternionToRotationMat4(quaternion, mat);
                const pos = math.vec3();
                for (let i = 0, len = positionsValue.length; i < len; i += 3) {
                    pos[0] = positionsValue[i + 0];
                    pos[1] = positionsValue[i + 1];
                    pos[2] = positionsValue[i + 2];
                    math.transformPoint3(mat, pos, pos);
                    positionsValue[i + 0] = pos[0];
                    positionsValue[i + 1] = pos[1];
                    positionsValue[i + 2] = pos[2];
                }
            }
            if (this._transform) {
                const mat = math.mat4(this._transform);
                const pos = math.vec3();
                for (let i = 0, len = positionsValue.length; i < len; i += 3) {
                    pos[0] = positionsValue[i + 0];
                    pos[1] = positionsValue[i + 1];
                    pos[2] = positionsValue[i + 2];
                    math.transformPoint3(mat, pos, pos);
                    positionsValue[i + 0] = pos[0];
                    positionsValue[i + 1] = pos[1];
                    positionsValue[i + 2] = pos[2];
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
            const intensities = attributesIntensity.value;
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
                        const meshId = `${params.isManifest ? 'model'+params.index : ''}pointsMesh${i}`;
                        meshIds.push(meshId);
                        sceneModel.createMesh({
                            id: meshId,
                            primitive: "points",
                            positions: pointsChunks[i],
                            colorsCompressed: (i < colorsChunks.length) ? colorsChunks[i] : null
                        });
                    }

                    const pointsObjectId = params.entityId || math.createUUID();

                    sceneModel.createEntity({
                        id: pointsObjectId,
                        meshIds,
                        isObject: true
                    });

                    sceneModel.finalize();

                    if (params.metaModelJSON) {
                        const metaModelId = sceneModel.id;
                        this.viewer.metaScene.createMetaModel(metaModelId, params.metaModelJSON, options);
                    } else if (params.loadMetadata !== false) {
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
        return [array];
    }
    let result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
}

function getBaseDirectory(filePath) {
    if (filePath.indexOf('?') > -1) {
        filePath = filePath.split('?')[0];
    }

    const pathArray = filePath.split('/');
    pathArray.pop(); // Remove the file name or the last segment of the path
    return pathArray.join('/') + '/';
}

export {LASLoaderPlugin};
