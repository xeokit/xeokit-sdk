import {Component} from "./../Component.js";
import {math} from "../math/math.js";
import {buildEdgeIndices} from '../math/buildEdgeIndices.js';
import {WEBGL_INFO} from './../webglInfo.js';

import {PerformanceMesh} from './PerformanceMesh.js';
import {PerformanceNode} from './PerformanceNode.js';
import {getBatchingBuffer, putBatchingBuffer} from "./batching/batchingBuffer.js";
import {BatchingLayer} from './batching/batchingLayer.js';
import {InstancingLayer} from './instancing/instancingLayer.js';
import {RENDER_FLAGS} from './renderFlags.js';

const instancedArraysSupported = WEBGL_INFO.SUPPORTED_EXTENSIONS["ANGLE_instanced_arrays"];

var tempColor = new Uint8Array(3);
var tempMat4 = math.mat4();
var tempMat4b = math.mat4();

const defaultScale = math.vec3([1, 1, 1]);
const defaultPosition = math.vec3([0, 0, 0]);
const defaultRotation = math.vec3([0, 0, 0]);
const defaultQuaternion = math.identityQuaternion();

/**
 * @desc An {@link Entity} that is a high-performance model representation designed for efficient rendering and low memory usage.
 *
 * ## PerformanceModel Structure
 *
 * * A PerformanceModel represents each of its elements with an {@link Entity}.
 * * Each {@link Entity} has one or more meshes that define its shape.
 * * Each mesh has either its own unique geometry, or shares a geometry with other meshes.
 *
 * ## Geometry Batching and Instancing
 *
 * PerformanceModel uses geometry batching to render unique geometries, combining them
 * into a single set of VBOs that it renders in one draw call. The VBOs also contain additional per-vertex attribute arrays to
 * feed rendering state (visibility, color, effects etc) for each unique geometry's mesh into the vertex shader.
 *
 * PerformanceModel uses geometry instancing to render shared geometries. For each shared geometry, PerformanceModel combines per-instance
 * rendering state in the same set of instanced attribute arrays, to render all instances of each shared geometry in one
 * draw call. Because batching duplicates the rendering state for each vertex, instancing is much more efficient in terms of
 * memory and GPU bandwidth usage.
 *
 * ## Static Transforms
 *
 * Transforms within a PerformanceModel are static, ie. they cannot be dynamically
 * translated, rotated and scaled the way {@link Node}s and {@link Mesh}es can.
 *
 * ## GPU-Resident Geometry
 *
 * For low memory footprint, PerformanceModel stores its geometries in GPU only. GPU-resident geometry is
 * not readable by JavaScript.
 *
 * ## Picking
 *
 * PerformanceModel supports picking of entire {@link Entity}s, but does not yet support picking of 3D positions on their surfaces.
 *
 * ## Examples
 *
 * * [PerformanceModel using geometry batching](http://xeolabs.com/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_batching)
 * * [PerformanceModel using geometry instancing](http://xeolabs.com/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_instancing)
 *
 * ## User Guide
 *
 * * [High Performance Models](https://github.com/xeolabs/xeokit-sdk/wiki/High-Performance_Models.html)
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
     * @param {Boolean} [cfg.ghosted=false] Indicates if the PerformanceModel is initially ghosted.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the PerformanceModel is initially highlighted.
     * @param {Boolean} [cfg.selected=false] Indicates if the PerformanceModel is initially selected.
     * @param {Boolean} [cfg.edges=false] Indicates if the PerformanceModel's edges are initially emphasized.
     * @param {Number[]} [cfg.colorize=[1.0,1.0,1.0]] PerformanceModel's initial RGB colorize color, multiplies by the rendered fragment colors.
     * @param {Number} [cfg.opacity=1.0] PerformanceModel's initial opacity factor, multiplies by the rendered fragment alpha.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._aabb = math.collapseAABB3();
        this._layers = []; // For GL state efficiency when drawing, InstancingLayers are in first part, BatchingLayers are in second
        this._instancingLayers = {}; // InstancingLayer for each geometry - can build many of these concurrently
        this._currentBatchingLayer = null; // Current BatchingLayer - can only build one of these at a time due to its use of global geometry buffers
        this._buffer = getBatchingBuffer(); // Each PerformanceModel gets it's own batching buffer - allows multiple PerformanceModels to load concurrently

        this._meshes = {};
        this._nodes = [];

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
        this.numGhostedLayerPortions = 0;

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

        this.visible = cfg.visible;
        this.culled = cfg.culled;
        this.pickable = cfg.pickable;
        this.clippable = cfg.clippable;
        this.collidable = cfg.collidable;
        this.castsShadow = cfg.castsShadow;
        this.receivesShadow = cfg.receivesShadow;
        this.ghosted = cfg.ghosted;
        this.highlighted = cfg.highlighted;
        this.selected = cfg.selected;
        this.edges = cfg.edges;
        this.colorize = cfg.colorize;
        this.opacity = cfg.opacity;

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
        math.inverseMat4(this._worldMatrix, this._worldNormalMatrix);
        math.transposeMat4(this._worldNormalMatrix);

        this._isModel = cfg.isModel;
        if (this._isModel) {
            this.scene._registerModel(this);
        }
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
     * Creates a reusable geometry within this PerformanceModel.
     *
     * We can then supply the geometry ID to {@link PerformanceModel#createMesh} when we want to create meshes that instance the geometry.
     *
     * Note that positions, normals and indices are all required in geometry data.
     *
     * @param {*} cfg Geometry properties.
     * @param {String|Number} cfg.id Mandatory ID for the geometry, to refer to with {@link PerformanceModel#createMesh}.
     * @param {String} [cfg.primitive="triangles"] The primitive type. Accepted values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
     * @param {Number[]} cfg.positions Flat array of positions.
     * @param {Number[]} cfg.normals Flat array of normal vectors.
     * @param {Number[]} cfg.indices Array of triangle indices.
     * @param {Number[]} cfg.edgeIndices Array of edge line indices.
     */
    createGeometry(cfg) {
        if (!instancedArraysSupported) {
            this.error("WebGL instanced arrays not supported"); // TODO: Gracefully use batching?
            return;
        }
        var geometryId = cfg.id;
        if (geometryId === undefined || geometryId === null) {
            this.error("Config missing: id");
            return;
        }
        if (this._instancingLayers[geometryId]) {
            this.error("Geometry already created: " + geometryId);
            return;
        }
        var instancingLayer = new InstancingLayer(this, cfg);
        this._layers.unshift(instancingLayer); // Instancing layers are rendered before batching layers
        this._instancingLayers[geometryId] = instancingLayer;
        this.numGeometries++;
    }

    /**
     * Creates a mesh within this PerformanceModel.
     *
     * A mesh has a geometry, given either as the ID of a shared geometry created with {@link PerformanceModel#createGeometry}, or as
     * geometr data arrays to create a unique geometry belong to the mesh.
     *
     * When you provide a geometry ID, then the PerformanceModelMesh will instance the shared geometry for the mesh.
     *
     * When you provide arrays, then PerformanceModel will combine the geometry in a batch with the other non-shared unique geometries in the model.
     *
     * Note that positions, normals and indices are all required in geometry data.
     *
     * @param {object} cfg Object properties.
     * @param {String} cfg.id Mandatory ID for the new mesh. Must not clash with any existing components within the {@link Scene}.
     * @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link PerformanceModel#createGeometry:method"}}createMesh(){{/crossLink}}. Overrides all other geometry parameters given to this method.
     * @param {String} [cfg.primitive="triangles"]  Geometry primitive type. Ignored when geometryId is given. Accepted values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
     * @param {Number[]} [cfg.positions] Flat array of geometry positions. Ignored when geometryId is given.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Ignored when geometryId is given.
     * @param {Number[]} [cfg.indices] Array of triangle indices. Ignored when geometryId is given.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Ignored when geometryId is given.
     * @param {Number[]} [cfg.position=[0,0,0]] Local 3D position. of the mesh
     * @param {Number[]} [cfg.scale=[1,1,1]] Scale of the mesh.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Rotation of the mesh as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] Mesh modelling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Number[]} [cfg.color=[1,1,1]] RGB color in range ````[0..1, 0..`, 0..1]````.
     * @param {Number} [cfg.opacity=1] Opacity in range ````[0..1]````.
     */
    createMesh(cfg) {

        var id = cfg.id;

        if (this.scene.components[id]) {
            this.error("Scene already has a Component with this ID: " + id + " - will assign random ID");
            id = math.createUUID();
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
        var aabb = math.collapseAABB3();

        var matrix;

        if (cfg.matrix) {
            matrix = cfg.matrix;
        } else {
            const scale = cfg.scale || defaultScale;
            const position = cfg.position || defaultPosition;
            const rotation = cfg.rotation || defaultRotation;
            math.eulerToQuaternion(rotation, "XYZ", defaultQuaternion);
            matrix = math.composeMat4(position, defaultQuaternion, scale, tempMat4);
        }

        matrix = math.mulMat4(this._worldMatrix, matrix, tempMat4b);

        const color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : [255, 255, 255];
        const opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;

        if (opacity < 255) {
            this.numTransparentLayerPortions++;
        }

        var mesh = new PerformanceMesh(this, id);

        var pickId = mesh.pickId;

        const a = pickId >> 24 & 0xFF;
        const b = pickId >> 16 & 0xFF;
        const g = pickId >> 8 & 0xFF;
        const r = pickId & 0xFF;

        const pickColor = new Uint8Array([r, g, b, a]); // Quantized pick color

        if (instancing) {
            var instancingLayer = this._instancingLayers[geometryId];
            layer = instancingLayer;
            portionId = instancingLayer.createPortion(flags, color, opacity, matrix, aabb, pickColor);
            math.expandAABB3(this._aabb, aabb);

        } else {

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

            if (this._currentBatchingLayer) {
                if (!this._currentBatchingLayer.canCreatePortion(cfg.positions.length)) {
                    this._currentBatchingLayer.finalize();
                    this._currentBatchingLayer = null;
                }
            }

            if (!this._currentBatchingLayer) {
                this._currentBatchingLayer = new BatchingLayer(this, {primitive: "triangles", buffer: this._buffer});
                this._layers.push(this._currentBatchingLayer); // For efficient GL state sorting, instancing layers rendered before batching layers
            }

            layer = this._currentBatchingLayer;
            if (!edgeIndices && indices) {
                edgeIndices = buildEdgeIndices(positions, indices, null, 10);
            }

            portionId = this._currentBatchingLayer.createPortion(positions, normals, indices, edgeIndices, flags, color, opacity, matrix, aabb, pickColor);
            math.expandAABB3(this._aabb, aabb);
            this.numGeometries++;
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
     * @param {Boolean} [cfg.isObject] Set ````true```` if the {@link Entity} represents an object, in which case it will be registered by {@link Entity#id} in {@link Scene#objects} and can also have a corresponding {@link MetaObject} with matching {@link MetaObject#id}, registered by that ID in {@link MetaScene#metaObjects}.
     * @param {Boolean} [cfg.visible=true] Indicates if the Entity is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the Entity is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the Entity is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the Entity is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the Entity is initially included in boundary calculations.
     * @param {Boolean} [cfg.castsShadow=true] Indicates if the Entity initially casts shadows.
     * @param {Boolean} [cfg.receivesShadow=true]  Indicates if the Entity initially receives shadows.
     * @param {Boolean} [cfg.ghosted=false] Indicates if the Entity is initially ghosted. Ghosted appearance is configured by {@link PerformanceModel#ghostMaterial}.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the Entity is initially highlighted. Highlighted appearance is configured by {@link PerformanceModel#highlightMaterial}.
     * @param {Boolean} [cfg.selected=false] Indicates if the Entity is initially selected. Selected appearance is configured by {@link PerformanceModel#selectedMaterial}.
     * @param {Boolean} [cfg.edges=false] Indicates if the Entity's edges are initially emphasized. Edges appearance is configured by {@link PerformanceModel#edgeMaterial}.
     * @returns {Entity}
     */
    createEntity(cfg) {
        // Validate or generate Entity ID
        var id = cfg.id;
        if (id === undefined) {
            id = math.createUUID();
        } else if (this.scene.components[id]) {
            this.error("Scene already has a Component with this ID: " + id + " - will assign random ID");
            id = math.createUUID();
        }
        // Collect PerformanceModelNode's PerformanceModelMeshes
        var meshIds = cfg.meshIds;
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
        if (this._clippable && cfg.clippable !== false) {
            flags = flags | RENDER_FLAGS.CLIPPABLE;
        }
        if (this._collidable && cfg.collidable !== false) {
            flags = flags | RENDER_FLAGS.COLLIDABLE;
        }
        if (this._edges && cfg.edges !== false) {
            flags = flags | RENDER_FLAGS.EDGES;
        }
        if (this._ghosted && cfg.ghosted !== false) {
            flags = flags | RENDER_FLAGS.GHOSTED;
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

        var node = new PerformanceNode(this, cfg.isObject, id, meshes, flags, aabb); // Internally sets PerformanceModelMesh#parent to this PerformanceModelNode
        this._nodes.push(node);
        return node;
    }

    /**
     * Finalizes this PerformanceModel.
     *
     * Internally, this builds any geometry batches or instanced arrays that are currently under construction.
     *
     * Once finalized, you can't add anything more to this PerformanceModel.
     */
    finalize() {
        if (this._currentBatchingLayer) {
            this._currentBatchingLayer.finalize();
            this._currentBatchingLayer = null;
        }
        if (this._buffer) {
            putBatchingBuffer(this._buffer);
            this._buffer = null;
        }
        for (const geometryId in this._instancingLayers) {
            if (this._instancingLayers.hasOwnProperty(geometryId)) {
                this._instancingLayers[geometryId].finalize();
            }
        }
        for (var i = 0, len = this._nodes.length; i < len; i++) {
            this._nodes[i]._finalize();
        }
        this.glRedraw();
        this.scene._aabbDirty = true;
        //console.log("[PerformanceModel] finalize() - num nodes = " + this._nodes.length + ", num geometries = " + this.numGeometries);
    }

    /** @private */
    compile() {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].compileShaders();
        }
        this.glRedraw();
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
     * Sets if this PerformanceModel is visible.
     *
     * The PerformanceModel is only rendered when {@link PerformanceModel#visible} is ````true```` and {@link PerformanceModel#culled} is ````false````.
     **
     * @type {Boolean}
     */
    set visible(visible) {
        visible = visible !== false;
        this._visible = visible;
        for (var i = 0, len = this._nodes.length; i < len; i++) {
            this._nodes[i].visible = visible;
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
     * Sets if all {@link Entity}s in this PerformanceModel are ghosted.
     *
     * @type {Boolean}
     */
    set ghosted(ghosted) {
        ghosted = !!ghosted;
        this._ghosted = ghosted;
        for (var i = 0, len = this._nodes.length; i < len; i++) {
            this._nodes[i].ghosted = ghosted;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this PerformanceModel are ghosted.
     *
     * @type {Boolean}
     */
    get ghosted() {
        return (this.numGhostedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this PerformanceModel are highlighted.
     *
     * @type {Boolean}
     */
    set highlighted(highlighted) {
        highlighted = !!highlighted;
        this._highlighted = highlighted;
        for (var i = 0, len = this._nodes.length; i < len; i++) {
            this._nodes[i].highlighted = highlighted;
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
        for (var i = 0, len = this._nodes.length; i < len; i++) {
            this._nodes[i].selected = selected;
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
        for (var i = 0, len = this._nodes.length; i < len; i++) {
            this._nodes[i].edges = edges;
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
        this._culled = culled; // Whole PerformanceModel is culled
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
        for (var i = 0, len = this._nodes.length; i < len; i++) {
            this._nodes[i].clippable = clippable;
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
        for (var i = 0, len = this._nodes.length; i < len; i++) {
            this._nodes[i].collidable = collidable;
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
        for (var i = 0, len = this._nodes.length; i < len; i++) {
            this._nodes[i].pickable = pickable;
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
    set colorize(rgb) { // TODO

    }

    /**
     * Gets the RGB colorize color for this PerformanceModel.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    get colorize() {  // TODO
        return new Float32Array[1, 1, 1, 1];
    }

    /**
     * Sets the opacity factor for this PerformanceModel.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity) { // TODO

    }

    /**
     * Gets this PerformanceModel's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() { // TODO

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

        // Unlike Mesh, rendering modes are less mutually exclusive because a PerformanceModel contains multiple PerformanceModelMesh
        // objects, which can have a mixture of rendering states.

        // TODO: can we optimize to avoid tests for ghosted objects from also being
        // highlighted in shader etc?

        renderFlags.reset();

        if (this.numVisibleLayerPortions === 0) {
            return;
        }

        if (this.numGhostedLayerPortions > 0) {
            const ghostMaterial = this.scene.ghostMaterial._state;
            if (ghostMaterial.fill) {
                if (ghostMaterial.fillAlpha < 1.0) {
                    renderFlags.ghostedFillTransparent = true;
                } else {
                    renderFlags.ghostedFillOpaque = true;
                }
            }
            if (ghostMaterial.edges) {
                if (ghostMaterial.edgeAlpha < 1.0) {
                    renderFlags.ghostedFillTransparent = true;
                } else {
                    renderFlags.ghostedFillOpaque = true;
                }
            }
        }

        if (this.numEdgesLayerPortions > 0) {
            const edgeMaterial = this.scene.edgeMaterial._state;
            if (edgeMaterial.alpha < 1.0) {
                renderFlags.normalEdgesTransparent = true;
            } else {
                renderFlags.normalEdgesOpaque = true;
            }
        }

        if (this.numGhostedLayerPortions < this.numVisibleLayerPortions &&
            this.numHighlightedLayerPortions < this.numVisibleLayerPortions &&
            this.numSelectedLayerPortions < this.numVisibleLayerPortions &&
            this.numTransparentLayerPortions < this.numVisibleLayerPortions) {
            renderFlags.normalFillOpaque = true;
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
     * Configures the appearance of ghosted {@link Entity}s within this PerformanceModel.
     *
     * This is the {@link Scene#ghostMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get ghostMaterial() {
        return this.scene.ghostMaterial;
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
     * @type EdgeMaterial
     */
    get edgeMaterial() {
        return this.scene.edgeMaterial;
    }

    /** @private */
    drawNormalFillOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawNormalFillOpaque(frameCtx);
        }
    }

    /** @private */
    drawNormalEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawNormalEdgesOpaque(frameCtx);
        }
    }

    /** @private */
    drawNormalFillTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawNormalFillTransparent(frameCtx);
        }
    }

    /** @private */
    drawNormalEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawNormalEdgesTransparent(frameCtx);
        }
    }

    /** @private */
    drawGhostedFillOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawGhostedFillOpaque(frameCtx);
        }
    }

    /** @private */
    drawGhostedEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawGhostedEdgesOpaque(frameCtx);
        }
    }

    /** @private */
    drawGhostedFillTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawGhostedFillTransparent(frameCtx);
        }
    }

    /** @private */
    drawGhostedEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawGhostedEdgesTransparent(frameCtx);
        }
    }

    /** @private */
    drawHighlightedFillOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawHighlightedFillOpaque(frameCtx);
        }
    }

    /** @private */
    drawHighlightedEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawHighlightedEdgesOpaque(frameCtx);
        }
    }

    /** @private */
    drawHighlightedFillTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawHighlightedFillTransparent(frameCtx);
        }
    }

    /** @private */
    drawHighlightedEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawHighlightedEdgesTransparent(frameCtx);
        }
    }

    /** @private */
    drawSelectedFillOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawSelectedFillOpaque(frameCtx);
        }
    }

    /** @private */
    drawSelectedEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawSelectedEdgesOpaque(frameCtx);
        }
    }

    /** @private */
    drawSelectedFillTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawSelectedFillTransparent(frameCtx);
        }
    }

    /** @private */
    drawSelectedEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawSelectedEdgesTransparent(frameCtx);
        }
    }

    /** @private
     */
    isSurfacePickable() {
        return false;
    }

    /** @private */
    drawPickMesh(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawPickMesh(frameCtx);
        }
    }

    /** @private */
    _findPickedObject(color) {
        // TODO: map color back to an object
    }

    //------------------------------------------------------------------------------------------------------------------
    // Component members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Destroys this PerformanceModel.
     */
    destroy() {
        super.destroy();
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].destroy();
        }
        for (var i = 0, len = this._nodes.length; i < len; i++) {
            this._nodes[i]._destroy();
        }
        this.scene._aabbDirty = true;
        if (this._isModel) {
            this.scene._deregisterModel(this);
        }
    }
}

export {PerformanceModel};