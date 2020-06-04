import {Component} from "../Component.js";
import {math} from "../math/math.js";
import {buildEdgeIndices} from '../math/buildEdgeIndices.js';
import {WEBGL_INFO} from '../webglInfo.js';
import {PerformanceMesh} from './lib/PerformanceMesh.js';
import {PerformanceNode} from './lib/PerformanceNode.js';
import {getBatchingBuffer, putBatchingBuffer} from "./lib/batching/BatchingBuffer.js";
import {getBatchingLayerScratchMemory} from "./lib/batching/BatchingLayerScratchMemory.js";
import {BatchingLayer} from './lib/batching/BatchingLayer.js';
import {InstancingLayer} from './lib/instancing/InstancingLayer.js';
import {RENDER_FLAGS} from './lib/renderFlags.js';

const instancedArraysSupported = WEBGL_INFO.SUPPORTED_EXTENSIONS["ANGLE_instanced_arrays"];

var tempMat4 = math.mat4();

const defaultScale = math.vec3([1, 1, 1]);
const defaultPosition = math.vec3([0, 0, 0]);
const defaultRotation = math.vec3([0, 0, 0]);
const defaultQuaternion = math.identityQuaternion();

/**
 * @desc A high-performance model representation for efficient rendering and low memory usage.
 *
 * ## Examples
 *
 * * [PerformanceModel using geometry batching](http://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_batching)
 * * [PerformanceModel using geometry instancing](http://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_instancing)
 *
 * ## User Guide
 *
 * * [High Performance Model Representation](https://github.com/xeokit/xeokit-sdk/wiki/High-Performance-Model-Representation)
 *
 * @implements {Drawable}
 * @implements {Entity}
 */
class PerformanceModel extends Component {

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     * @param {Boolean} [cfg.isModel] Specify ````true```` if this PerformanceModel represents a model, in which case the PerformanceModel will be registered by {@link PerformanceModel#id} in {@link Scene#models} and may also have a corresponding {@link MetaModel} with matching {@link MetaModel#id}, registered by that ID in {@link MetaScene#metaModels}.
     * @param {Number[]} [cfg.position=[0,0,0]] Local 3D position.
     * @param {Number[]} [cfg.scale=[1,1,1]] Local scale.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] Local modelling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [cfg.visible=true] Indicates if the PerformanceModel is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the PerformanceModel is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the PerformanceModel is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the PerformanceModel is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the PerformanceModel is initially included in boundary calculations.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the PerformanceModel is initially xrayed.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the PerformanceModel is initially highlighted.
     * @param {Boolean} [cfg.selected=false] Indicates if the PerformanceModel is initially selected.
     * @param {Boolean} [cfg.edges=false] Indicates if the PerformanceModel's edges are initially emphasized.
     * @param {Number[]} [cfg.colorize=[1.0,1.0,1.0]] PerformanceModel's initial RGB colorize color, multiplies by the rendered fragment colors.
     * @param {Number} [cfg.opacity=1.0] PerformanceModel's initial opacity factor, multiplies by the rendered fragment alpha.
     * @param {Boolean} [cfg.saoEnabled=true] Indicates if Scalable Ambient Obscurance (SAO) will apply to this PerformanceModel. SAO is configured by the Scene's {@link SAO} component.
     * @param {Boolean} [cfg.backfaces=false] Indicates if backfaces are visible.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._aabb = math.collapseAABB3();
        this._layerList = []; // For GL state efficiency when drawing, InstancingLayers are in first part, BatchingLayers are in second
        this._nodeList = [];
        this._lastDecodeMatrix = null;

        this._instancingLayers = {};
        this._currentBatchingLayer = null;
        this._batchingBuffer = getBatchingBuffer();
        this._batchingScratchMemory = getBatchingLayerScratchMemory(this);

        this._meshes = {};
        this._nodes = {};

        /**
         * @private
         */
        this.numGeometries = 0; // Number of instance-able geometries created with createGeometry()

        // These counts are used to avoid unnecessary render passes
        // They are incremented or decremented exclusively by BatchingLayer and InstancingLayer
        /**
         * @private
         */
        this.numPortions = 0;

        /**
         * @private
         */
        this.numVisibleLayerPortions = 0;

        /**
         * @private
         */
        this.numTransparentLayerPortions = 0;

        /**
         * @private
         */
        this.numXRayedLayerPortions = 0;

        /**
         * @private
         */
        this.numHighlightedLayerPortions = 0;

        /**
         * @private
         */
        this.numSelectedLayerPortions = 0;

        /**
         * @private
         */
        this.numEdgesLayerPortions = 0;

        /**
         * @private
         */
        this.numPickableLayerPortions = 0;

        /**
         * @private
         */
        this.numCulledLayerPortions = 0;

        /** @private */
        this.numEntities = 0;

        /** @private */
        this._numTriangles = 0;

        this.visible = cfg.visible;
        this.culled = cfg.culled;
        this.pickable = cfg.pickable;
        this.clippable = cfg.clippable;
        this.collidable = cfg.collidable;
        this.castsShadow = cfg.castsShadow;
        this.receivesShadow = cfg.receivesShadow;
        this.xrayed = cfg.xrayed;
        this.highlighted = cfg.highlighted;
        this.selected = cfg.selected;
        this.edges = cfg.edges;
        this.colorize = cfg.colorize;
        this.opacity = cfg.opacity;

        this.backfaces = cfg.backfaces;

        // Build static matrix

        this._position = new Float32Array(cfg.position || [0, 0, 0]);
        this._rotation = new Float32Array(cfg.rotation || [0, 0, 0]);
        this._quaternion = new Float32Array(cfg.quaternion || [0, 0, 0, 1]);
        if (cfg.rotation) {
            math.eulerToQuaternion(this._rotation, "XYZ", this._quaternion);
        }
        this._scale = new Float32Array(cfg.scale || [1, 1, 1]);
        this._worldMatrix = math.mat4();
        math.composeMat4(this._position, this._quaternion, this._scale, this._worldMatrix);
        this._worldNormalMatrix = math.mat4();

        if (cfg.matrix || cfg.position || cfg.rotation || cfg.scale || cfg.quaternion) {
            this._viewMatrix = math.mat4();
            this._viewNormalMatrix = math.mat4();
            this._viewMatrixDirty = true;
            this._worldMatrixNonIdentity = true;
        }

        this._opacity = 1.0;
        this._colorize = [1, 1, 1];

        this._saoEnabled = (cfg.saoEnabled !== false);

        this._isModel = cfg.isModel;
        if (this._isModel) {
            this.scene._registerModel(this);
        }

        this._onCameraViewMatrix = this.scene.camera.on("matrix", () => {
            this._viewMatrixDirty = true;
        });
    }

    //------------------------------------------------------------------------------------------------------------------
    // PerformanceModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that this Component is a PerformanceModel.
     * @type {Boolean}
     */
    get isPerformanceModel() {
        return true;
    }

    /**
     * Gets the PerformanceModel's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get position() {
        return this._position;
    }

    /**
     * Gets the PerformanceModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get rotation() {
        return this._rotation;
    }

    /**
     * Gets the PerformanceModels's local rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {Number[]}
     */
    get quaternion() {
        return this._quaternion;
    }

    /**
     * Gets the PerformanceModel's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     */
    get scale() {
        return this._scale;
    }

    /**
     * Gets the PerformanceModel's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     */
    get matrix() {
        return this._worldMatrix;
    }

    /**
     * Gets the PerformanceModel's World matrix.
     *
     * @property worldMatrix
     * @type {Number[]}
     */
    get worldMatrix() {
        return this._worldMatrix;
    }

    /**
     * Gets the PerformanceModel's World normal matrix.
     *
     * @type {Number[]}
     */
    get worldNormalMatrix() {
        return this._worldNormalMatrix;
    }

    /**
     * Called by private renderers in ./lib, returns the view matrix with which to
     * render this PerformanceModel. The view matrix is the concatenation of the
     * Camera view matrix with the Performance model's world (modeling) matrix.
     *
     * @private
     */
    get viewMatrix() {
        if (!this._viewMatrix) {
            return this.scene.camera.viewMatrix;
        }
        if (this._viewMatrixDirty) {
            math.mulMat4(this.scene.camera.viewMatrix, this._worldMatrix, this._viewMatrix);
            math.inverseMat4(this._viewMatrix, this._viewNormalMatrix);
            math.transposeMat4(this._viewNormalMatrix);
            this._viewMatrixDirty = false;
        }
        return this._viewMatrix;
    }

    /**
     * Called by private renderers in ./lib, returns the picking view matrix with which to
     * ray-pick on this PerformanceModel.
     *
     * @private
     */
    getPickViewMatrix(pickViewMatrix) {
        if (!this._viewMatrix) {
            return pickViewMatrix;
        }
        return this._viewMatrix;
    }

    /**
     * Called by private renderers in ./lib, returns the view normal matrix with which to render this PerformanceModel.
     *
     * @private
     */
    get viewNormalMatrix() {
        if (!this._viewNormalMatrix) {
            return this.scene.camera.viewNormalMatrix;
        }
        if (this._viewMatrixDirty) {
            math.mulMat4(this.scene.camera.viewMatrix, this._worldMatrix, this._viewMatrix);
            math.inverseMat4(this._viewMatrix, this._viewNormalMatrix);
            math.transposeMat4(this._viewNormalMatrix);
            this._viewMatrixDirty = false;
        }
        return this._viewNormalMatrix;
    }

    /**
     * Creates a reusable geometry within this PerformanceModel.
     *
     * We can then supply the geometry ID to {@link PerformanceModel#createMesh} when we want to create meshes that instance the geometry.
     *
     * If provide a  ````positionsDecodeMatrix```` , then ````createGeometry()```` will assume
     * that the ````positions```` and ````normals```` arrays are compressed. When compressed, ````positions```` will be
     * quantized and in World-space, and ````normals```` will be oct-encoded and in World-space.
     *
     * Note that ````positions````, ````normals```` and ````indices```` are all required together.
     *
     * @param {*} cfg Geometry properties.
     * @param {String|Number} cfg.id Mandatory ID for the geometry, to refer to with {@link PerformanceModel#createMesh}.
     * @param {String} [cfg.primitive="triangles"] The primitive type. Accepted values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
     * @param {Number[]} cfg.positions Flat array of positions.
     * @param {Number[]} cfg.normals Flat array of normal vectors.
     * @param {Number[]} cfg.indices Array of triangle indices.
     * @param {Number[]} cfg.edgeIndices Array of edge line indices.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positions````.
     */
    createGeometry(cfg) {
        if (!instancedArraysSupported) {
            this.error("WebGL instanced arrays not supported"); // TODO: Gracefully use batching?
            return;
        }
        const geometryId = cfg.id;
        if (geometryId === undefined || geometryId === null) {
            this.error("Config missing: id");
            return;
        }
        if (this._instancingLayers[geometryId]) {
            this.error("Geometry already created: " + geometryId);
            return;
        }
        const instancingLayer = new InstancingLayer(this, cfg);
        this._instancingLayers[geometryId] = instancingLayer;
        this._layerList.push(instancingLayer);
        this.numGeometries++;
        this._numTriangles += (cfg.indices ? Math.round(cfg.indices.length / 3) : 0);
    }

    /**
     * Creates a mesh within this PerformanceModel.
     *
     * A mesh can either share geometry with other meshes, or have its own unique geometry.
     *
     * To share a geometry with other meshes, provide the ID of a geometry created earlier
     * with {@link PerformanceModel#createGeometry}.
     *
     * To create unique geometry for the mesh, provide geometry data arrays.
     *
     * Internally, PerformanceModel will batch all unique mesh geometries into the same arrays, which improves
     * rendering performance.
     *
     * If you accompany the arrays with a  ````positionsDecodeMatrix```` , then ````createMesh()```` will assume
     * that the ````positions```` and ````normals```` arrays are compressed. When compressed, ````positions```` will be
     * quantized and in World-space, and ````normals```` will be oct-encoded and in World-space.
     *
     * When creating compressed batches, ````createMesh()```` will start a new batch each time ````positionsDecodeMatrix````
     * changes. Therefore, to combine arrays into the minimum number of batches, it's best for performance to create
     * your shared meshes in runs that have the value for ````positionsDecodeMatrix````.
     *
     * Note that ````positions````, ````normals```` and ````indices```` are all required together.
     *
     * @param {object} cfg Object properties.
     * @param {String} cfg.id Mandatory ID for the new mesh. Must not clash with any existing components within the {@link Scene}.
     * @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link PerformanceModel#createGeometry:method"}}createMesh(){{/crossLink}}. Overrides all other geometry parameters given to this method.
     * @param {String} [cfg.primitive="triangles"]  Geometry primitive type. Ignored when ````geometryId```` is given. Accepted values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
     * @param {Number[]} [cfg.positions] Flat array of geometry positions. Ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positions````.
     * @param {Number[]} [cfg.indices] Array of triangle indices. Ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.position=[0,0,0]] Local 3D position. of the mesh
     * @param {Number[]} [cfg.scale=[1,1,1]] Scale of the mesh.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Rotation of the mesh as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Mesh modelling transform matrix. Overrides the ````position````, ````scale```` and ````rotation```` parameters.
     * @param {Number[]} [cfg.color=[1,1,1]] RGB color in range ````[0..1, 0..`, 0..1]````.
     * @param {Number} [cfg.opacity=1] Opacity in range ````[0..1]````.
     */
    createMesh(cfg) {

        let id = cfg.id;
        if (id === undefined || id === null) {
            this.error("Config missing: id");
            return;
        }
        if (this._meshes[id]) {
            this.error("PerformanceModel already has a Mesh with this ID: " + id + "");
            return;
        }

        const geometryId = cfg.geometryId;
        const instancing = (geometryId !== undefined);

        if (instancing) {
            if (!instancedArraysSupported) {
                this.error("WebGL instanced arrays not supported"); // TODO: Gracefully use batching?
                return;
            }
            if (!this._instancingLayers[geometryId]) {
                this.error("Geometry not found: " + geometryId + " - ensure that you create it first with createGeometry()");
                return;
            }
        }

        var flags = 0;
        var layer;
        var portionId;

        const color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : [255, 255, 255];
        const opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;

        if (opacity < 255) {
            this.numTransparentLayerPortions++;
        }

        var mesh = new PerformanceMesh(this, id, color, opacity);

        var pickId = mesh.pickId;

        const a = pickId >> 24 & 0xFF;
        const b = pickId >> 16 & 0xFF;
        const g = pickId >> 8 & 0xFF;
        const r = pickId & 0xFF;

        const pickColor = new Uint8Array([r, g, b, a]); // Quantized pick color

        const aabb = math.collapseAABB3();

        if (instancing) {

            let meshMatrix;
            let worldMatrix = this._worldMatrixNonIdentity ? this._worldMatrix : null;

            if (cfg.matrix) {
                meshMatrix = cfg.matrix;
            } else {
                const scale = cfg.scale || defaultScale;
                const position = cfg.position || defaultPosition;
                const rotation = cfg.rotation || defaultRotation;
                math.eulerToQuaternion(rotation, "XYZ", defaultQuaternion);
                meshMatrix = math.composeMat4(position, defaultQuaternion, scale, tempMat4);
            }

            var instancingLayer = this._instancingLayers[geometryId];
            layer = instancingLayer;
            portionId = instancingLayer.createPortion(flags, color, opacity, meshMatrix, worldMatrix, aabb, pickColor);
            math.expandAABB3(this._aabb, aabb);

            const numTriangles = Math.round(instancingLayer.numIndices / 3);
            this._numTriangles += numTriangles;
            mesh.numTriangles = numTriangles;

        } else { // Batching

            var primitive = cfg.primitive || "triangles";
            if (primitive !== "points" && primitive !== "lines" && primitive !== "line-loop" &&
                primitive !== "line-strip" && primitive !== "triangles" && primitive !== "triangle-strip" && primitive !== "triangle-fan") {
                this.error(`Unsupported value for 'primitive': '${primitive}' - supported values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'. Defaulting to 'triangles'.`);
                primitive = "triangles";
            }

            var indices = cfg.indices;
            var edgeIndices = cfg.edgeIndices;

            var positions = cfg.positions;

            if (!positions) {
                this.error("Config missing: positions (no meshIds provided, so expecting geometry arrays instead)");
                return null;
            }

            var normals = cfg.normals;

            if (!normals) {
                this.error("Config missing: normals (no meshIds provided, so expecting geometry arrays instead)");
                return null;
            }

            if (!edgeIndices && !indices) {
                this.error("Config missing: must have one or both of indices and edgeIndices  (no meshIds provided, so expecting geometry arrays instead)");
                return null;
            }

            if (cfg.positionsDecodeMatrix) {
                if (!this._lastDecodeMatrix) {
                    this._lastDecodeMatrix = math.mat4(cfg.positionsDecodeMatrix);
                } else {
                    if (!math.compareMat4(this._lastDecodeMatrix, cfg.positionsDecodeMatrix)) {
                        if (this._currentBatchingLayer) {
                            this._currentBatchingLayer.finalize();
                            this._currentBatchingLayer = null;
                        }
                        this._lastDecodeMatrix.set(cfg.positionsDecodeMatrix)
                    }
                }
            }

            if (this._currentBatchingLayer) {
                if (!this._currentBatchingLayer.canCreatePortion(positions.length)) {
                    this._currentBatchingLayer.finalize();
                    this._currentBatchingLayer = null;
                }
            }

            if (!this._currentBatchingLayer) {
                // console.log("New batching layer");
                this._currentBatchingLayer = new BatchingLayer(this, {
                    primitive: "triangles",
                    buffer: this._batchingBuffer,
                    scratchMemory: this._batchingScratchMemory,
                    positionsDecodeMatrix: cfg.positionsDecodeMatrix,
                });
                this._layerList.push(this._currentBatchingLayer);
            }

            layer = this._currentBatchingLayer;

            if (!edgeIndices && indices) {
                edgeIndices = buildEdgeIndices(positions, indices, null, 10);
            }

            let meshMatrix;
            let worldMatrix = this._worldMatrixNonIdentity ? this._worldMatrix : null;

            if (!cfg.positionsDecodeMatrix) {

                if (cfg.matrix) {
                    meshMatrix = cfg.matrix;
                } else {
                    const scale = cfg.scale || defaultScale;
                    const position = cfg.position || defaultPosition;
                    const rotation = cfg.rotation || defaultRotation;
                    math.eulerToQuaternion(rotation, "XYZ", defaultQuaternion);
                    meshMatrix = math.composeMat4(position, defaultQuaternion, scale, tempMat4);
                }
            }

            portionId = this._currentBatchingLayer.createPortion(positions, normals, indices, edgeIndices, flags, color, opacity, meshMatrix, worldMatrix, aabb, pickColor);

            math.expandAABB3(this._aabb, aabb);

            this.numGeometries++;

            const numTriangles = Math.round(indices.length / 3);
            this._numTriangles += numTriangles;
            mesh.numTriangles = numTriangles;
        }

        mesh.parent = null; // Will be set within PerformanceModelNode constructor
        mesh._layer = layer;
        mesh._portionId = portionId;
        mesh.aabb = aabb;

        this._meshes[id] = mesh;
    }

    /**
     * Creates an {@link Entity} within this PerformanceModel, giving it one or more meshes previously created with {@link PerformanceModel#createMesh}.
     *
     * A mesh can only belong to one {@link Entity}, so you'll get an error if you try to reuse a mesh among multiple {@link Entity}s.
     *
     * @param {Object} cfg Entity configuration.
     * @param {String} cfg.id Optional ID for the new Entity. Must not clash with any existing components within the {@link Scene}.
     * @param {String[]} cfg.meshIds IDs of one or more meshes created previously with {@link PerformanceModel@createMesh}.

     * @param {Boolean} [cfg.isObject] Set ````true```` if the {@link Entity} represents an object, in which case it will be registered by {@link Entity#id} in {@link Scene#objects} and can also have a corresponding {@link MetaObject} with matching {@link MetaObject#id}, registered by that ID in {@link MetaScene#metaObjects}.
     * @param {Boolean} [cfg.visible=true] Indicates if the Entity is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the Entity is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the Entity is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the Entity is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the Entity is initially included in boundary calculations.
     * @param {Boolean} [cfg.castsShadow=true] Indicates if the Entity initially casts shadows.
     * @param {Boolean} [cfg.receivesShadow=true]  Indicates if the Entity initially receives shadows.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the Entity is initially xrayed. XRayed appearance is configured by {@link PerformanceModel#xrayMaterial}.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the Entity is initially highlighted. Highlighted appearance is configured by {@link PerformanceModel#highlightMaterial}.
     * @param {Boolean} [cfg.selected=false] Indicates if the Entity is initially selected. Selected appearance is configured by {@link PerformanceModel#selectedMaterial}.
     * @param {Boolean} [cfg.edges=false] Indicates if the Entity's edges are initially emphasized. Edges appearance is configured by {@link PerformanceModel#edgeMaterial}.
     * @returns {Entity}
     */
    createEntity(cfg) {
        // Validate or generate Entity ID
        let id = cfg.id;
        if (id === undefined) {
            id = math.createUUID();
        } else if (this.scene.components[id]) {
            this.error("Scene already has a Component with this ID: " + id + " - will assign random ID");
            id = math.createUUID();
        }
        // Collect PerformanceModelNode's PerformanceModelMeshes
        const meshIds = cfg.meshIds;
        if (meshIds === undefined) {
            this.error("Config missing: meshIds");
            return;
        }
        var i;
        var len;
        var meshId;
        var mesh;
        var meshes = [];
        for (i = 0, len = meshIds.length; i < len; i++) {
            meshId = meshIds[i];
            mesh = this._meshes[meshId];
            if (!mesh) {
                this.error("Mesh with this ID not found: " + meshId + " - ignoring this mesh");
                continue;
            }
            if (mesh.parent) {
                this.error("Mesh with ID " + meshId + " already belongs to object with ID " + mesh.parent.id + " - ignoring this mesh");
                continue;
            }
            meshes.push(mesh);
        }
        // Create PerformanceModelNode flags
        var flags = 0;
        if (this._visible && cfg.visible !== false) {
            flags = flags | RENDER_FLAGS.VISIBLE;
        }
        if (this._pickable && cfg.pickable !== false) {
            flags = flags | RENDER_FLAGS.PICKABLE;
        }
        if (this._culled && cfg.culled !== false) {
            flags = flags | RENDER_FLAGS.CULLED;
        }
        if (this._clippable && cfg.clippable !== false) {
            flags = flags | RENDER_FLAGS.CLIPPABLE;
        }
        if (this._collidable && cfg.collidable !== false) {
            flags = flags | RENDER_FLAGS.COLLIDABLE;
        }
        if (this._edges && cfg.edges !== false) {
            flags = flags | RENDER_FLAGS.EDGES;
        }
        if (this._xrayed && cfg.xrayed !== false) {
            flags = flags | RENDER_FLAGS.XRAYED;
        }
        if (this._highlighted && cfg.highlighted !== false) {
            flags = flags | RENDER_FLAGS.HIGHLIGHTED;
        }
        if (this._selected && cfg.selected !== false) {
            flags = flags | RENDER_FLAGS.SELECTED;
        }

        // Create PerformanceModelNode AABB
        var aabb;
        if (meshes.length === 1) {
            aabb = meshes[0].aabb;
        } else {
            aabb = math.collapseAABB3();
            for (i = 0, len = meshes.length; i < len; i++) {
                math.expandAABB3(aabb, meshes[i].aabb);
            }
        }

        const node = new PerformanceNode(this, cfg.isObject, id, meshes, flags, aabb); // Internally sets PerformanceModelMesh#parent to this PerformanceModelNode
        this._nodeList.push(node);
        this._nodes[id] = node;
        this.numEntities++;
        return node;
    }

    /**
     * Finalizes this PerformanceModel.
     *
     * Immediately creates the PerformanceModel's {@link Entity}s within the {@link Scene}.
     *
     * Once finalized, you can't add anything more to this PerformanceModel.
     */
    finalize() {
        if (this._currentBatchingLayer) {
            this._currentBatchingLayer.finalize();
            this._currentBatchingLayer = null;
        }
        if (this._batchingBuffer) {
            putBatchingBuffer(this._batchingBuffer);
            this._batchingBuffer = null;
        }
        for (const geometryId in this._instancingLayers) {
            if (this._instancingLayers.hasOwnProperty(geometryId)) {
                this._instancingLayers[geometryId].finalize();
            }
        }
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            const node = this._nodeList[i];
            node._finalize();
        }
        this.glRedraw();
        this.scene._aabbDirty = true;
    }

    //------------------------------------------------------------------------------------------------------------------
    // PerformanceModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Sets if backfaces are rendered for this PerformanceModel.
     *
     * Default is ````false````.
     *
     * @type {Boolean}
     */
    set backfaces(backfaces) {
        backfaces = !!backfaces;
        this._backfaces = backfaces;
        this.glRedraw();
    }

    /**
     * Sets if backfaces are rendered for this PerformanceModel.
     *
     * Default is ````false````.
     *
     * @type {Boolean}
     */
    get backfaces() {
        return this._backfaces;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Entity members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that PerformanceModel is an {@link Entity}.
     * @type {Boolean}
     */
    get isEntity() {
        return true;
    }

    /**
     * Returns ````true```` if this PerformanceModel represents a model.
     *
     * When ````true```` the PerformanceModel will be registered by {@link PerformanceModel#id} in
     * {@link Scene#models} and may also have a {@link MetaObject} with matching {@link MetaObject#id}.
     *
     * @type {Boolean}
     */
    get isModel() {
        return this._isModel;
    }

    /**
     * Returns ````false```` to indicate that PerformanceModel never represents an object.
     *
     * @type {Boolean}
     */
    get isObject() {
        return false;
    }

    /**
     * Gets the PerformanceModel's World-space 3D axis-aligned bounding box.
     *
     * Represented by a six-element Float32Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Number[]}
     */
    get aabb() {
        return this._aabb;
    }

    /**
     * The approximate number of triangles in this PerformanceModel.
     *
     * @type {Number}
     */
    get numTriangles() {
        return this._numTriangles;
    }

    /**
     * Sets if this PerformanceModel is visible.
     *
     * The PerformanceModel is only rendered when {@link PerformanceModel#visible} is ````true```` and {@link PerformanceModel#culled} is ````false````.
     **
     * @type {Boolean}
     */
    set visible(visible) {
        visible = visible !== false;
        this._visible = visible;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].visible = visible;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this PerformanceModel are visible.
     *
     * The PerformanceModel is only rendered when {@link PerformanceModel#visible} is ````true```` and {@link PerformanceModel#culled} is ````false````.
     *
     * @type {Boolean}
     */
    get visible() {
        return (this.numVisibleLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this PerformanceModel are xrayed.
     *
     * @type {Boolean}
     */
    set xrayed(xrayed) {
        xrayed = !!xrayed;
        this._xrayed = xrayed;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].xrayed = xrayed;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this PerformanceModel are xrayed.
     *
     * @type {Boolean}
     */
    get xrayed() {
        return (this.numXRayedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this PerformanceModel are highlighted.
     *
     * @type {Boolean}
     */
    set highlighted(highlighted) {
        highlighted = !!highlighted;
        this._highlighted = highlighted;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].highlighted = highlighted;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this PerformanceModel are highlighted.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return (this.numHighlightedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this PerformanceModel are selected.
     *
     * @type {Boolean}
     */
    set selected(selected) {
        selected = !!selected;
        this._selected = selected;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].selected = selected;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this PerformanceModel are selected.
     *
     * @type {Boolean}
     */
    get selected() {
        return (this.numSelectedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this PerformanceModel have edges emphasised.
     *
     * @type {Boolean}
     */
    set edges(edges) {
        edges = !!edges;
        this._edges = edges;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].edges = edges;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this PerformanceModel have edges emphasised.
     *
     * @type {Boolean}
     */
    get edges() {
        return (this.numEdgesLayerPortions > 0);
    }

    /**
     * Sets if this PerformanceModel is culled from view.
     *
     * The PerformanceModel is only rendered when {@link PerformanceModel#visible} is true and {@link PerformanceModel#culled} is false.
     *
     * @type {Boolean}
     */
    set culled(culled) {
        culled = !!culled;
        this._culled = culled;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].culled = culled;
        }
        this.glRedraw();
    }

    /**
     * Gets if this PerformanceModel is culled from view.
     *
     * The PerformanceModel is only rendered when {@link PerformanceModel#visible} is true and {@link PerformanceModel#culled} is false.
     *
     * @type {Boolean}
     */
    get culled() {
        return this._culled;
    }

    /**
     * Sets if {@link Entity}s in this PerformanceModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    set clippable(clippable) {
        clippable = clippable !== false;
        this._clippable = clippable;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].clippable = clippable;
        }
        this.glRedraw();
    }

    /**
     * Gets if {@link Entity}s in this PerformanceModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._clippable;
    }

    /**
     * Sets if {@link Entity}s in this PerformanceModel are collidable.
     *
     * @type {Boolean}
     */
    set collidable(collidable) {
        collidable = collidable !== false;
        this._collidable = collidable;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].collidable = collidable;
        }
    }

    /**
     * Gets if this PerformanceModel is collidable.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._collidable;
    }

    /**
     * Sets if {@link Entity}s in this PerformanceModel are pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    set pickable(pickable) {
        pickable = pickable !== false;
        this._pickable = pickable;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].pickable = pickable;
        }
    }

    /**
     * Gets if this PerformanceModel is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    get pickable() {
        return this._pickable;
    }

    /**
     * Sets the RGB colorize color for this PerformanceModel.
     *
     * Multiplies by rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    set colorize(colorize) {
        this._colorize = colorize;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].colorize = colorize;
        }
    }

    /**
     * Gets the RGB colorize color for this PerformanceModel.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    get colorize() {
        return this._colorize;
    }

    /**
     * Sets the opacity factor for this PerformanceModel.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity) {
        this._opacity = opacity;
        for (var i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].opacity = opacity;
        }
    }

    /**
     * Gets this PerformanceModel's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        return this._opacity;
    }

    /**
     * Sets if this PerformanceModel casts a shadow.
     *
     * @type {Boolean}
     */
    set castsShadow(castsShadow) { // TODO
    }

    /**
     * Gets if this PerformanceModel casts a shadow.
     *
     * @type {Boolean}
     */
    get castsShadow() { // TODO
        return false;
    }

    /**
     * Sets if this PerformanceModel can have shadow cast upon it.
     *
     * @type {Boolean}
     */
    set receivesShadow(receivesShadow) { // TODO
    }

    /**
     * Sets if this PerformanceModel can have shadow cast upon it.
     *
     * @type {Boolean}
     */
    get receivesShadow() { // TODO
        return false;
    }

    /**
     * Gets if Scalable Ambient Obscurance (SAO) will apply to this PerformanceModel.
     *
     * SAO is configured by the Scene's {@link SAO} component.
     *
     * @type {Boolean}
     * @abstract
     */
    get saoEnabled() {
        return this._saoEnabled;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Drawable members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that PerformanceModel is implements {@link Drawable}.
     *
     * @type {Boolean}
     */
    get isDrawable() {
        return true;
    }

    /** @private */
    get isStateSortable() {
        return false
    }

    /** @private */
    stateSortCompare(drawable1, drawable2) {
    }

    /** @private */
    getRenderFlags(renderFlags) {

        renderFlags.reset();

        if (this.numVisibleLayerPortions === 0) {
            return;
        }

        if (this.numCulledLayerPortions === this.numPortions) {
            return;
        }

        renderFlags.normalFillOpaque = true;

        if (this.numXRayedLayerPortions > 0) {
            const xrayMaterial = this.scene.xrayMaterial._state;
            if (xrayMaterial.fill) {
                if (xrayMaterial.fillAlpha < 1.0) {
                    renderFlags.xrayedFillTransparent = true;
                } else {
                    renderFlags.xrayedFillOpaque = true;
                }
            }
            if (xrayMaterial.edges) {
                if (xrayMaterial.edgeAlpha < 1.0) {
                    renderFlags.xrayedEdgesTransparent = true;
                } else {
                    renderFlags.xrayedEdgesOpaque = true;
                }
            }
        }

        if (this.numEdgesLayerPortions > 0) {
            const edgeMaterial = this.scene.edgeMaterial._state;
            if (edgeMaterial.edges) {
                if (edgeMaterial.alpha < 1.0) {
                    renderFlags.normalEdgesTransparent = true;
                } else {
                    renderFlags.normalEdgesOpaque = true;
                }
            }
        }

        if (this.numTransparentLayerPortions > 0) {
            renderFlags.normalFillTransparent = true;
        }

        if (this.numSelectedLayerPortions > 0) {
            const selectedMaterial = this.scene.selectedMaterial._state;
            if (selectedMaterial.fill) {
                if (selectedMaterial.fillAlpha < 1.0) {
                    renderFlags.selectedFillTransparent = true;
                } else {
                    renderFlags.selectedFillOpaque = true;
                }
            }
            if (selectedMaterial.edges) {
                if (selectedMaterial.edgeAlpha < 1.0) {
                    renderFlags.selectedEdgesTransparent = true;
                } else {
                    renderFlags.selectedEdgesOpaque = true;
                }
            }
        }

        if (this.numHighlightedLayerPortions > 0) {
            const highlightMaterial = this.scene.highlightMaterial._state;
            if (highlightMaterial.fill) {
                if (highlightMaterial.fillAlpha < 1.0) {
                    renderFlags.highlightedFillTransparent = true;
                } else {
                    renderFlags.highlightedFillOpaque = true;
                }
            }
            if (highlightMaterial.edges) {
                if (highlightMaterial.edgeAlpha < 1.0) {
                    renderFlags.highlightedEdgesTransparent = true;
                } else {
                    renderFlags.highlightedEdgesOpaque = true;
                }
            }
        }
    }

    /**
     * Configures the appearance of xrayed {@link Entity}s within this PerformanceModel.
     *
     * This is the {@link Scene#xrayMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get xrayMaterial() {
        return this.scene.xrayMaterial;
    }

    /**
     * Configures the appearance of highlighted {@link Entity}s within this PerformanceModel.
     *
     * This is the {@link Scene#highlightMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get highlightMaterial() {
        return this.scene.highlightMaterial;
    }

    /**
     * Configures the appearance of selected {@link Entity}s within this PerformanceModel.
     *
     * This is the {@link Scene#selectedMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get selectedMaterial() {
        return this.scene.selectedMaterial;
    }

    /**
     * Configures the appearance of edges of {@link Entity}s within this PerformanceModel.
     *
     * This is the {@link Scene#edgeMaterial}.
     *
     * @type {EdgeMaterial}
     */
    get edgeMaterial() {
        return this.scene.edgeMaterial;
    }

    /** @private */
    drawNormalFillOpaque(frameCtx) {
        if (frameCtx.backfaces !== this.backfaces) {
            const gl = this.scene.canvas.gl;
            if (this.backfaces) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }
            frameCtx.backfaces = this.backfaces;
        }
        for (let i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawNormalFillOpaque(frameCtx);
        }
    }

    /** @private */
    drawDepth(frameCtx) { // Dedicated to SAO because it skips transparent objects
        if (frameCtx.backfaces !== this.backfaces) {
            const gl = this.scene.canvas.gl;
            if (this.backfaces) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }
            frameCtx.backfaces = this.backfaces;
        }
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawDepth(frameCtx);
        }
    }

    /** @private */
    drawNormals(frameCtx) { // Dedicated to SAO because it skips transparent objects
        if (frameCtx.backfaces !== this.backfaces) {
            const gl = this.scene.canvas.gl;
            if (this.backfaces) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }
            frameCtx.backfaces = this.backfaces;
        }
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawNormals(frameCtx);
        }
    }

    /** @private */
    drawNormalEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawNormalEdgesOpaque(frameCtx);
        }
    }

    /** @private */
    drawNormalFillTransparent(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawNormalFillTransparent(frameCtx);
        }
    }

    /** @private */
    drawNormalEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawNormalEdgesTransparent(frameCtx);
        }
    }

    /** @private */
    drawXRayedFillOpaque(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawXRayedFillOpaque(frameCtx);
        }
    }

    /** @private */
    drawXRayedEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawXRayedEdgesOpaque(frameCtx);
        }
    }

    /** @private */
    drawXRayedFillTransparent(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawXRayedFillTransparent(frameCtx);
        }
    }

    /** @private */
    drawXRayedEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawXRayedEdgesTransparent(frameCtx);
        }
    }

    /** @private */
    drawHighlightedFillOpaque(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawHighlightedFillOpaque(frameCtx);
        }
    }

    /** @private */
    drawHighlightedEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawHighlightedEdgesOpaque(frameCtx);
        }
    }

    /** @private */
    drawHighlightedFillTransparent(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawHighlightedFillTransparent(frameCtx);
        }
    }

    /** @private */
    drawHighlightedEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawHighlightedEdgesTransparent(frameCtx);
        }
    }

    /** @private */
    drawSelectedFillOpaque(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawSelectedFillOpaque(frameCtx);
        }
    }

    /** @private */
    drawSelectedEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawSelectedEdgesOpaque(frameCtx);
        }
    }

    /** @private */
    drawSelectedFillTransparent(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawSelectedFillTransparent(frameCtx);
        }
    }

    /** @private */
    drawSelectedEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawSelectedEdgesTransparent(frameCtx);
        }
    }

    /** @private */
    drawPickMesh(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        if (frameCtx.backfaces !== this.backfaces) {
            const gl = this.scene.canvas.gl;
            if (this.backfaces) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }
            frameCtx.backfaces = this.backfaces;
        }
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawPickMesh(frameCtx);
        }
    }

    /**
     * Called by PerformanceMesh.drawPickDepths()
     * @private
     */
    drawPickDepths(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        if (frameCtx.backfaces !== this.backfaces) {
            const gl = this.scene.canvas.gl;
            if (this.backfaces) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }
            frameCtx.backfaces = this.backfaces;
        }
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawPickDepths(frameCtx);
        }
    }

    /**
     * Called by PerformanceMesh.drawPickNormals()
     * @private
     */
    drawPickNormals(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        if (frameCtx.backfaces !== this.backfaces) {
            const gl = this.scene.canvas.gl;
            if (this.backfaces) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }
            frameCtx.backfaces = this.backfaces;
        }
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawPickNormals(frameCtx);
        }
    }

    /**
     * @private
     */
    drawOcclusion(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        if (frameCtx.backfaces !== this.backfaces) {
            const gl = this.scene.canvas.gl;
            if (this.backfaces) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }
            frameCtx.backfaces = this.backfaces;
        }
        for (var i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].drawOcclusion(frameCtx);
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Component members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Destroys this PerformanceModel.
     */
    destroy() {
        if (this._currentBatchingLayer) {
            this._currentBatchingLayer.destroy();
            this._currentBatchingLayer = null;
        }
        if (this._batchingBuffer) {
            putBatchingBuffer(this._batchingBuffer);
            this._batchingBuffer = null;
        }
        this.scene.camera.off(this._onCameraViewMatrix);
        for (let i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].destroy();
        }
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i]._destroy();
        }
        this.scene._aabbDirty = true;
        if (this._isModel) {
            this.scene._deregisterModel(this);
        }
        super.destroy();
    }
}

export {PerformanceModel};