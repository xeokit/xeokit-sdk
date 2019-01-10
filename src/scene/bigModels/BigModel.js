import {Component} from "./../Component.js";
import {math} from "../math/math.js";
import {buildEdgeIndices} from '../math/buildEdgeIndices.js';
import {WEBGL_INFO} from './../webglInfo.js';

import {BigModelMesh} from './BigModelMesh.js';
import {BigModelNode} from './BigModelNode.js';
import {getBatchingBuffer, putBatchingBuffer} from "./batching/batchingBuffer.js";
import {BatchingLayer} from './batching/batchingLayer.js';
import {InstancingLayer} from './instancing/instancingLayer.js';
import {RENDER_FLAGS} from './renderFlags.js';

const instancedArraysSupported = WEBGL_INFO.SUPPORTED_EXTENSIONS["ANGLE_instanced_arrays"];

var tempColor = new Uint8Array(3);
var tempMat4 = math.mat4();

/**
 @desc Represents a high-detail engineering model.

 * Like the rest of xeokit, is compatible with WebGL version 1.
 * Used for high-detail engineering visualizations containing millions of objects.
 * Represents each of its objects with a {@link BigModelMesh}, which is a lightweight alternative to {@link Node}.
 * Renders flat-shaded, without textures. Each object has simply a color and an opacity to describe its surface appearance.
 * Objects can be individually visible, clippable, collidable, ghosted, highlighted, selected, edge-enhanced etc.
 * The transforms of a BigModel and its BigModelObjects are static, ie. they cannot be dynamically translated, rotated and scaled.
 * For a low memory footprint, does not retain geometry data in CPU memory. Keeps geometry only in GPU memory (which cannot be read).
 * Rendered using a combination of WebGL instancing and geometry batching. Instances objects that share geometries, while batching objects that have unique geometries.
 * Uses the {@link Scene}'s {@link Scene/ghostMaterial}, {@link Scene/highlightMaterial},
 {@link Scene/selectedMaterial} and {@link Scene/edgeMaterial} to define appearance when emphasised.

 ## Examples

 * [BigModel with objects having unique geometries](../../examples/#models_BigModel_batching)
 * [BigModel with objects reusing the same geometries](../../examples/#models_BigModel_instancing)

 ## Usage

 xeokit renders BigModels using a combination of [geometry batching]() and WebGL [hardware instancing]().

 For objects that share geometries, xeokit batches their geometries into uber-vertex buffers, which enables those objects
 to be rendered collectively with a single draw call. For objects that do share geometries, xeokit uses instancing to render
 each of those geometry's objects with a single draw call.

 The BigModel API gives you the ability to select which technique to apply for each object, as described below. Its BigGLTFModel
 subclass, which loads glTF, will automatically determine which technique to apply for each object, by tracking the amount of
 reuse of geometries within the glTF.

 ### Creating objects with unique geometries

 To create objects that each have their own unique geometry, specify the geometry as you create those objects:

 ````javascript
 var bigModel = new xeokit.BigModel();

 // Create a red box object

 var object1 = bigModel.createMesh({
     id: "myObject1",
     primitive: "triangles",
     positions: [2, 2, 2, -2, 2, 2, -2, -2, ... ],
     normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, ... ],
     indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, ... ],
     color: [1, 0, 0],
     matrix: xeokit.math.translationMat4c(-7, 0, 0)
 });

 // Create a green box object

 var object2 = bigModel.createMesh({
     id: "myObject2",
     primitive: "triangles",
     positions: [2, 2, 2, -2, 2, 2, -2, -2, ... ],
     normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, ... ],
     indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, ... ],
     color: [0, 1, 0],
     matrix: xeokit.math.translationMat4c(0, 0, 0)
 });
 ````

 ### Creating objects with shared geometries

 To create multiple objects that share the same geometry, create the geometry first then reference it by ID within each of those objects:

 ```` javascript

 // Create a box-shaped geometry

 bigModel.createGeometry({
     id: "myGeometry",
     primitive: "triangles",
     positions: [2, 2, 2, -2, 2, 2, -2, -2, ... ],
     normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, ... ],
     indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, ... ],
 });

 // Create a blue object that instances the geometry

 var object3 = bigModel.createMesh({
     id: "myObject3",
     geometryId: "mGeometry",
     color: [0, 0, 1],
     matrix: xeokit.math.translationMat4c(-7, -7, 0)
 });

 // Create a yellow object that instances the geometry

 var object4 = bigModel.createMesh({
     id: "myObject4",
     geometryId: "mGeometry",
     color: [1, 1, 0],
     matrix: xeokit.math.translationMat4c(0, -7, 0)
 });
 ````

 ### Finalizing

 Once we've created all our objects, we need to finalize the BigModel before it will render. Once finalized, we can no longer
 create objects within it.

 ```` javascript
 bigModel.finalize();
 ````

 ### Finding objects

 @implements {Drawable}
 @implements {Entity}
 */
class BigModel extends Component {

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     * @param {Boolean} [cfg.isModel] Specify ````true```` if this BigModel represents a model, in which case the BigModel will be registered by {@link BigModel#id} in {@link Scene#models} and may also have a corresponding {@link MetaModel} with matching {@link MetaModel#id}, registered by that ID in {@link MetaScene#metaModels}.
     * @param {Number[]} [cfg.position=[0,0,0]] Local 3D position.
     * @param {Number[]} [cfg.scale=[1,1,1]] Local scale.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] Local modelling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [cfg.visible=true] Indicates if the BigModel is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the BigModel is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the BigModel is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the BigModel is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the BigModel is initially included in boundary calculations.
     * @param {Boolean} [cfg.ghosted=false] Indicates if the BigModel is initially ghosted.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the BigModel is initially highlighted.
     * @param {Boolean} [cfg.selected=false] Indicates if the BigModel is initially selected.
     * @param {Boolean} [cfg.edges=false] Indicates if the BigModel's edges are initially emphasized.
     * @param {Number[]} [cfg.colorize=[1.0,1.0,1.0]] BigModel's initial RGB colorize color, multiplies by the rendered fragment colors.
     * @param {Number} [cfg.opacity=1.0] BigModel's initial opacity factor, multiplies by the rendered fragment alpha.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._aabb = math.collapseAABB3();
        this._layers = []; // For GL state efficiency when drawing, InstancingLayers are in first part, BatchingLayers are in second
        this._instancingLayers = {}; // InstancingLayer for each geometry - can build many of these concurrently
        this._currentBatchingLayer = null; // Current BatchingLayer - can only build one of these at a time due to its use of global geometry buffers
        this._buffer = getBatchingBuffer(); // Each BigModel gets it's own batching buffer - allows multiple BigModels to load concurrently

        this._meshes = {};
        this._nodes = [];

        this.numGeometries = 0; // Number of instance-able geometries created with createGeometry()

        // These counts are used to avoid unnecessary render passes
        this.numObjects = 0;
        this.numVisibleObjects = 0;
        this.numTransparentObjects = 0;
        this.numGhostedObjects = 0;
        this.numHighlightedObjects = 0;
        this.numSelectedObjects = 0;
        this.numEdgesObjects = 0;

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
    // BigModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that this Component is a BigModel.
     * @type {Boolean}
     */
    get isBigModel() {
        return true;
    }

    /**
     Translation offsets.

     @property position
     @default [0,0,0]
     @type {Number[]}
     @final
     */
    get position() {
        return this._position;
    }

    /**
     Rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.

     @property rotation
     @default [0,0,0]
     @type {Number[]}
     @final
     */
    get rotation() {
        return this._rotation;
    }

    /**
     Rotation quaternion.

     @property quaternion
     @default [0,0,0, 1]
     @type {Number[]}
     @final
     */
    get quaternion() {
        return this._quaternion;
    }

    /**
     Scale factors.

     @property scale
     @default [1,1,1]
     @type {Number[]}
     @final
     */
    get scale() {
        return this._scale;
    }

    /**
     * Modeling matrix. Same as the World matrix.
     *
     * @property matrix
     * @default [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
     * @type {Number[]}
     * @final
     */
    get matrix() {
        return this._worldMatrix;
    }

    /**
     * World matrix. Same as the Modeling matrix.
     *
     * @property worldMatrix
     * @type {Number[]}
     * @final
     */
    get worldMatrix() {
        return this._worldMatrix;
    }

    /**
     * World normal matrix.
     *
     * @property worldNormalMatrix
     * @default [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
     * @type {Number[]}
     * @final
     */
    get worldNormalMatrix() {
        return this._worldNormalMatrix;
    }

    /**
     Creates a reusable geometry within this BigModel.

     We can then call {@link BigModel#createMesh:method"}}createMesh(){{/crossLink}} with the
     ID of the geometry to create a {@link BigModelMesh} within this BigModel that instances it.

     @method createGeometry
     @param {*} cfg Geometry properties.
     @param {String|Number} cfg.id ID for the geometry, to refer to with {@link BigModel#createMesh:method"}}createMesh(){{/crossLink}}
     @param [cfg.primitive="triangles"] {String} The primitive type. Accepted values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
     @param {Number[]} cfg.positions Flat array of positions.
     @param {Number[]} cfg.normals Flat array of normal vectors.
     @param {Number[]} cfg.indices Array of triangle indices.
     @param {Number[]} cfg.edgeIndices Array of edge line indices.
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
     Creates a {@link BigModelMesh} within this BigModel.

     You can provide either geometry data arrays or the ID of a geometry that was previously created
     with {@link BigModel#createGeometry:method"}}createGeometry(){{/crossLink}}.

     When you provide arrays, then that geometry will be used solely by the BigModelObject, which will be rendered
     using geometry batching.

     When you provide a geometry ID, then the BigModelMesh will instance that geometry, and will be
     rendered using WebGL instancing.

     @method createMesh
     @param {*} cfg Object properties.
     @param {String} cfg.id ID for the new object. Must not clash with any existing components within the {@link Scene}.
     @param {String} [cfg.parentId] ID if the parent object, if any. Must resolve to a {@link BigModelMesh} that has already been created within this BigModel.
     @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link BigModel#createGeometry:method"}}createMesh(){{/crossLink}}. Overrides all other geometry parameters given to this method.
     @param [cfg.primitive="triangles"] {String} Geometry primitive type. Ignored when geometryId is given. Accepted values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
     @param {Number[]} [cfg.positions] Flat array of geometry positions. Ignored when geometryId is given.
     @param {Number[]} [cfg.normals] Flat array of normal vectors. Ignored when geometryId is given.
     @param {Number[]} [cfg.indices] Array of triangle indices. Ignored when geometryId is given.
     @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Ignored when geometryId is given.
     @param {Number[]} [cfg.matrix] Modeling matrix.

     @returns {BigModelMesh}
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
        var matrix = cfg.matrix ? math.mulMat4(this._worldMatrix, cfg.matrix, tempMat4) : this._worldMatrix;
        var layer;
        var portionId;
        var aabb = math.collapseAABB3();

        var color = cfg.color;
        color = new Uint8Array([ // Quantize color
            color ? Math.floor(color[0] * 255) : 255,
            color ? Math.floor(color[1] * 255) : 255,
            color ? Math.floor(color[2] * 255) : 255,
            (cfg.opacity !== undefined) ? (cfg.opacity * 255) : (color ? Math.floor(color[3] * 255) : 255)
        ]);
        if (color[3] < 255) {
            this.numTransparentObjects++;
        }

        // TODO: A small hack where BigModelMesh gets it's pickId from xeokit Renderer, which gets fed into its layer portion on instantiation, meaning that we need to attach the later and portionId to mesh afterwards.

        var mesh = new BigModelMesh(this, id);
        var pickId = mesh.pickId;
        const a = pickId >> 24 & 0xFF;
        const b = pickId >> 16 & 0xFF;
        const g = pickId >> 8 & 0xFF;
        const r = pickId & 0xFF;
        const pickColor = new Uint8Array([r, g, b, a]); // Quantized color

        if (instancing) {
            var instancingLayer = this._instancingLayers[geometryId];
            layer = instancingLayer;
            portionId = instancingLayer.createPortion(flags, color, matrix, aabb, pickColor);
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
            portionId = this._currentBatchingLayer.createPortion(positions, normals, indices, edgeIndices, flags, color, matrix, aabb, pickColor);
            math.expandAABB3(this._aabb, aabb);
            this.numGeometries++;
        }

        mesh.object = null; // Will be set within BigModelObject constructor
        mesh._layer = layer;
        mesh._portionId = portionId;
        mesh.aabb = aabb;

        this._meshes[id] = mesh;

        // console.log("mesh " + id + " = " + aabb);

        return mesh;
    }

    /**
     Creates a {@link BigModelNode} within this BigModel, giving it one or
     more meshes previously created with {@link BigModel#createMesh"}}createMesh(){{/crossLink}}.

     A mesh can only belong to one BigModelObject, so you'll get an error if you try to reuse a mesh among
     multiple BigModelObjects.

     @param cfg
     @returns {BigModelNode}
     */
    createNode(cfg) {
        // Validate or generate BigModelObject ID
        var id = cfg.id;
        if (id === undefined) {
            id = math.createUUID();
        } else if (this.scene.components[id]) {
            this.error("Scene already has a Component with this ID: " + id + " - will assign random ID");
            id = math.createUUID();
        }
        // Collect BigModelObject's BigModelMeshes
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
            if (mesh.object) {
                this.error("Mesh with ID " + meshId + " already belongs to object with ID " + mesh.object.id + " - ignoring this mesh");
                continue;
            }
            meshes.push(mesh);
        }
        // Create BigModelObject flags
        var flags = 0;
        if (this._visible && cfg.visible !== false) {
            flags = flags | RENDER_FLAGS.VISIBLE;
            this.numVisibleObjects++;
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
            this.numEdgesObjects++;
        }
        if (this._ghosted && cfg.ghosted !== false) {
            flags = flags | RENDER_FLAGS.GHOSTED;
            this.numGhostedObjects++;
        }
        if (this._highlighted && cfg.highlighted !== false) {
            flags = flags | RENDER_FLAGS.HIGHLIGHTED;
            this.numHighlightedObjects++;
        }
        if (this._selected && cfg.selected !== false) {
            flags = flags | RENDER_FLAGS.SELECTED;
            this.numSelectedObjects++;
        }
        // Create BigModelObject AABB
        var aabb;
        if (meshes.length === 1) {
            aabb = meshes[0].aabb;
        } else {
            aabb = math.collapseAABB3();
            for (i = 0, len = meshes.length; i < len; i++) {
                math.expandAABB3(aabb, meshes[i].aabb);
            }
        }

        var node = new BigModelNode(this, cfg.isObject, id, meshes, flags, aabb); // Internally sets BigModelMesh#parent to this BigModelObject
        this._nodes.push(node);
        return node;
    }

    /**
     Finalizes this BigModel.

     Internally, this builds any geometry batches or instanced arrays that are currently under construction.

     Once finalized, you can't create any more objects within this BigModel.

     @method finalize
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
        console.log("[BigModel] finalize() - num nodes = " + this._nodes.length + ", num geometries = " + this.numGeometries);
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
     * Returns true to indicate that BigModel is an {@link Entity}.
     * @type {Boolean}
     */
    get isEntity() {
        return true;
    }
    
    /**
     * Returns ````true```` if this BigModel represents a model.
     *
     * When ````true```` the BigModel will be registered by {@link BigModel#id} in
     * {@link Scene#models} and may also have a {@link MetaObject} with matching {@link MetaObject#id}.
     *
     * @type {Boolean}
     */
    get isModel() {
        return this._isModel;
    }

    /**
     * Returns ````false```` to indicate that BigModel never represents an object.
     *
     * @type {Boolean}
     */
    get isObject() {
        return false;
    }

    /**
     * Gets the BigModel's World-space 3D axis-aligned bounding box.
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
     * Sets if this BigModel is visible.
     *
     * The BigModel is only rendered when {@link BigModel#visible} is ````true```` and {@link BigModel#culled} is ````false````.
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
     * Gets if any {@link BigModelNode}s in this BigModel are visible.
     *
     * The BigModel is only rendered when {@link BigModel#visible} is ````true```` and {@link BigModel#culled} is ````false````.
     *
     * @type {Boolean}
     */
    get visible() {
        return (this.numVisibleObjects > 0);
    }

    /**
     * Sets if all {@link BigModelNode}s in this BigModel are ghosted.
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
     * Gets if any {@link BigModelNode}s in this BigModel are ghosted.
     *
     * @type {Boolean}
     */
    get ghosted() {
        return (this.numGhostedObjects > 0);
    }

    /**
     * Sets if all {@link BigModelNode}s in this BigModel are highlighted.
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
     * Gets if any {@link BigModelNode}s in this BigModel are highlighted.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return (this.numHighlightedObjects > 0);
    }

    /**
     * Sets if all {@link BigModelNode}s in this BigModel are selected.
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
     * Gets if any {@link BigModelNode}s in this BigModel are selected.
     *
     * @type {Boolean}
     */
    get selected() {
        return (this.numSelectedObjects > 0);
    }

    /**
     * Sets if all {@link BigModelNode}s in this BigModel have edges emphasised.
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
     * Gets if any {@link BigModelNode}s in this BigModel have edges emphasised.
     *
     * @type {Boolean}
     */
    get edges() {
        return (this.numEdgesObjects > 0);
    }

    /**
     * Sets if this BigModel is culled from view.
     *
     * The BigModel is only rendered when {@link BigModel#visible} is true and {@link BigModel#culled} is false.
     *
     * @type {Boolean}
     */
    set culled(culled) {
        culled = !!culled;
        this._culled = culled; // Whole BigModel is culled
        this.glRedraw();
    }

    /**
     * Gets if this BigModel is culled from view.
     *
     * The BigModel is only rendered when {@link BigModel#visible} is true and {@link BigModel#culled} is false.
     *
     * @type {Boolean}
     */
    get culled() {
        return this._culled;
    }

    /**
     * Sets if {@link BigModelNode}s in this BigModel are clippable.
     *
     * Clipping is done by the {@link Clip}s in {@link Scene#clips}.
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
     * Gets if {@link BigModelNode}s in this BigModel are clippable.
     *
     * Clipping is done by the {@link Clip}s in {@link Scene#clips}.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._clippable;
    }

    /**
     * Sets if {@link BigModelNode}s in this BigModel are collidable.
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
     * Gets if this BigModel is collidable.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._collidable;
    }

    /**
     * Sets if {@link BigModelNode}s in this BigModel are pickable.
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
     * Gets if this BigModel is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    get pickable() {
        return this._pickable;
    }

    /**
     * Sets the RGB colorize color for this BigModel.
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
     * Gets the RGB colorize color for this BigModel.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    get colorize() {  // TODO
        return new Float32Array[1, 1, 1, 1];
    }

    /**
     * Sets the opacity factor for this BigModel.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity) { // TODO

    }

    /**
     * Gets this BigModel's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() { // TODO

    }

    /**
     * Sets if this BigModel casts a shadow.
     *
     * @type {Boolean}
     */
    set castsShadow(castsShadow) { // TODO
    }

    /**
     * Gets if this BigModel casts a shadow.
     *
     * @type {Boolean}
     */
    get castsShadow() { // TODO
        return false;
    }

    /**
     * Sets if this BigModel can have shadow cast upon it.
     *
     * @type {Boolean}
     */
    set receivesShadow(receivesShadow) { // TODO
    }

    /**
     * Sets if this BigModel can have shadow cast upon it.
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
     * Returns true to indicate that BigModel is implements {@link Drawable}.
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

        // Unlike Mesh, rendering modes are less mutually exclusive because a BigModel contains multiple BigModelMesh
        // objects, which can have a mixture of rendering states.

        // TODO: can we optimize to avoid tests for ghosted objects from also being
        // highlighted in shader etc?

        renderFlags.reset();

        if (this.numVisibleObjects === 0) {
            return;
        }

        if (this.numGhostedObjects > 0) {
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

        if (this.numEdgesObjects > 0) {
            const edgeMaterial = this.scene.edgeMaterial._state;
            if (edgeMaterial.alpha < 1.0) {
                renderFlags.normalEdgesTransparent = true;
            } else {
                renderFlags.normalEdgesOpaque = true;
            }
        }

        // if (this.numGhostedObjects < this.numVisibleObjects) {
        //     renderFlags.normalFillOpaque = true;
        // }

        if (this.numTransparentObjects > 0) {
            renderFlags.normalFillTransparent = true;
        }

        renderFlags.normalFillOpaque = true;

        // if (this.numVisibleObjects > this.numGhostedObjects && this.numVisibleObjects > this.numHighlightedObjects && this.numVisibleObjects > this.numSelectedObjects) {
        //     if (this.numTransparentObjects < this.numVisibleObjects) {
        //         renderFlags.normalFillTransparent = true;
        //     }
        //
        //     {
        //         renderFlags.normalFillOpaque = true;
        //     }
        // }

        if (this.numSelectedObjects > 0) {
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

        if (this.numHighlightedObjects > 0) {
            const highlightMaterial = this.scene.highlightMaterial._state;
            if (highlightMaterial.fill) {
                if (highlightMaterial.fillAlpha < 1.0) {
                    renderFlags.highlightFillTransparent = true;
                } else {
                    renderFlags.highlightFillOpaque = true;
                }
            }
            if (highlightMaterial.edges) {
                if (highlightMaterial.edgeAlpha < 1.0) {
                    renderFlags.highlightEdgesTransparent = true;
                } else {
                    renderFlags.highlightEdgesOpaque = true;
                }
            }
        }
    }

    /**
     * Configures the appearance of ghosted objects within this BigModel.
     *
     * This is the {@link Scene#ghostMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get ghostMaterial() {
        return this.scene.ghostMaterial;
    }

    /**
     * Configures the appearance of highlighted objects within this BigModel.
     *
     * This is the {@link Scene#highlightMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get highlightMaterial() {
        return this.scene.highlightMaterial;
    }

    /**
     * Configures the appearance of selected objects within this BigModel.
     *
     * This is the {@link Scene#selectedMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get selectedMaterial() {
        return this.scene.selectedMaterial;
    }

    /**
     * Configures the appearance of edges of objects within this BigModel.
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
        if (this.numVisibleObjects === 0) {
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
     * Destroys this BigModel.
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

export {BigModel};