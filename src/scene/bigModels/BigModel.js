import {Component} from "./../Component.js";
import {Mesh} from "../mesh/Mesh.js";
import {math} from "../math/math.js";
import {WEBGL_INFO} from './../webglInfo.js';

import {BigModelMesh} from './bigModelMesh.js';
import {BigModelObject} from './bigModelObject.js';
import {getBatchingBuffer, putBatchingBuffer} from "./batching/batchingBuffer.js";
import {BatchingLayer} from './batching/batchingLayer.js';
import {InstancingLayer} from './instancing/instancingLayer.js';
import {RENDER_FLAGS} from './renderFlags.js';

const instancedArraysSupported = WEBGL_INFO.SUPPORTED_EXTENSIONS["ANGLE_instanced_arrays"];

var tempColor = new Uint8Array(3);
var tempMat4 = math.mat4();

/**
 A **BigModel** is a lightweight representation used for huge engineering models, in which the quantity of objects
 is more important than a realistic appearance or the ability to dynamically translate them.

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

 TODO


 @class BigModel
 @module xeokit
 @submodule models
 @constructor
 @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
 @param {*} [cfg] Configs
 @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param {String:Object} [cfg.meta] Optional map of user-defined metadata.
 @param [cfg.objectId] {String} Optional entity classification when using within a semantic data model. See the {@link Node} documentation for usage.
 @param [cfg.parent] {Object} The parent.
 @param [cfg.position=[0,0,0]] {Float32Array} Local 3D position.
 @param [cfg.scale=[1,1,1]] {Float32Array} Local scale.
 @param [cfg.rotation=[0,0,0]] {Float32Array} Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
 @param [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] {Float32Array} Local modelling transform matrix. Overrides the position, scale and rotation parameters.
 @param [cfg.visible=true] {Boolean}        Indicates if visible.
 @param [cfg.culled=false] {Boolean}        Indicates if culled from view.
 @param [cfg.pickable=true] {Boolean}       Indicates if pickable.
 @param [cfg.clippable=true] {Boolean}      Indicates if clippable.
 @param [cfg.collidable=true] {Boolean}     Indicates if included in boundary calculations.
 @param [cfg.castShadow=true] {Boolean}     Indicates if casting shadows.
 @param [cfg.receiveShadow=true] {Boolean}  Indicates if receiving shadows.
 @param [cfg.outlined=false] {Boolean}      Indicates if outline is rendered.
 @param [cfg.ghosted=false] {Boolean}       Indicates if rendered as ghosted.
 @param [cfg.highlighted=false] {Boolean}   Indicates if rendered as highlighted.
 @param [cfg.selected=false] {Boolean}      Indicates if rendered as selected.
 @param [cfg.edges=false] {Boolean}         Indicates if edges are emphasized.
 @param [cfg.aabbVisible=false] {Boolean}   Indicates if the BigModel's axis-aligned World-space bounding box is visible.
 @param [cfg.colorize=[1.0,1.0,1.0]] {Float32Array}  RGB colorize color, multiplies by the rendered fragment colors.
 @param [cfg.opacity=1.0] {Number} Opacity factor, multiplies by the rendered fragment alpha.

 @extends Component
 */
class BigModel extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "BigModel";
    }

    /**
     * @private
     */
    get isModel() {
        return true;
    }

    /**
     * @private
     */
    get isDrawable() {
        return true;
    }

    constructor(owner, cfg={}) {

        super(owner, cfg);

        this._aabb = math.collapseAABB3();
        this._layers = []; // For GL state efficiency when drawing, InstancingLayers are in first part, BatchingLayers are in second
        this._instancingLayers = {}; // InstancingLayer for each geometry - can build many of these concurrently
        this._currentBatchingLayer = null; // Current BatchingLayer - can only build one of these at a time due to its use of global geometry buffers
        this._objectIds = [];
        this._buffer = getBatchingBuffer(); // Each BigModel gets it's own batching buffer - allows multiple BigModels to load concurrently


        /**
         All contained {@link BigModelMesh"}}BigModelMesh{{/crossLink}} instances, mapped to their IDs.

         @property meshes
         @final
         @type {{String:BigModelMesh}}
         */
        this.meshes = {};

        /**
         All contained {@link BigModelObject"}}BigModelObject{{/crossLink}} instances, mapped to their IDs.

         @property objects
         @final
         @type {{String:BigModelObject}}
         */
        this.objects = {};

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
        this.castShadow = cfg.castShadow;
        this.receiveShadow = cfg.receiveShadow;
        this.outlined = cfg.outlined;
        this.ghosted = cfg.ghosted;
        this.highlighted = cfg.highlighted;
        this.selected = cfg.selected;
        this.edges = cfg.edges;
        this.aabbVisible = cfg.aabbVisible;
        this.layer = cfg.layer;
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
    }

    /**
     Translation offsets.

     @property position
     @default [0,0,0]
     @type {Float32Array}
     @final
     */
    get position() {
        return this._position;
    }

    /**
     Rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.

     @property rotation
     @default [0,0,0]
     @type {Float32Array}
     @final
     */
    get rotation() {
        return this._rotation;
    }

    /**
     Rotation quaternion.

     @property quaternion
     @default [0,0,0, 1]
     @type {Float32Array}
     @final
     */
    get quaternion() {
        return this._quaternion;
    }

    /**
     Scale factors.

     @property scale
     @default [1,1,1]
     @type {Float32Array}
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
     * @type {Float32Array}
     * @final
     */
    get matrix() {
        return this._worldMatrix;
    }

    /**
     * World matrix. Same as the Modeling matrix.
     *
     * @property worldMatrix
     * @type {Float32Array}
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
     * @type {Float32Array}
     * @final
     */
    get worldNormalMatrix() {
        return this._worldNormalMatrix;
    }

    static getGeometryBytesUsed(positions, colors, indices, normals) {
        // var bytes = 0;
        // bytes += positions.length * 2;
        // if (colors != null) {
        //     bytes += colors.length;
        // }
        // //bytes += positions.length * 8;
        // if (indices.length < 65536 && useSmallIndicesIfPossible) {
        //     bytes += indices.length * 2;
        // } else {
        //     bytes += indices.length * 4;
        // }
        // bytes += normals.length;
        // return bytes;
    }

    /**
     Creates a reusable geometry within this BigModel.

     We can then call {@link BigModel/createMesh:method"}}createMesh(){{/crossLink}} with the
     ID of the geometry to create a {@link BigModelMesh} within this BigModel that instances it.

     @method createGeometry
     @param {*} cfg Geometry properties.
     @param {String|Number} cfg.id ID for the geometry, to refer to with {@link BigModel/createMesh:method"}}createMesh(){{/crossLink}}
     @param [cfg.primitive="triangles"] {String} The primitive type. Accepted values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
     @param {Array} cfg.positions Flat array of positions.
     @param {Array} cfg.normals Flat array of normal vectors.
     @param {Array} cfg.indices Array of triangle indices.
     @param {Array} cfg.edgeIndices Array of edge line indices.
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
     with {@link BigModel/createGeometry:method"}}createGeometry(){{/crossLink}}.

     When you provide arrays, then that geometry will be used solely by the BigModelObject, which will be rendered
     using geometry batching.

     When you provide a geometry ID, then the BigModelMesh will instance that geometry, and will be
     rendered using WebGL instancing.

     @method createMesh
     @param {*} cfg Object properties.
     @param {String} cfg.id ID for the new object. Must not clash with any existing components within the {@link Scene}.
     @param {String} [cfg.parentId] ID if the parent object, if any. Must resolve to a {@link BigModelMesh} that has already been created within this BigModel.
     @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link BigModel/createGeometry:method"}}createMesh(){{/crossLink}}. Overrides all other geometry parameters given to this method.
     @param [cfg.primitive="triangles"] {String} Geometry primitive type. Ignored when geometryId is given. Accepted values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
     @param {Array} [cfg.positions] Flat array of geometry positions. Ignored when geometryId is given.
     @param {Array} [cfg.normals] Flat array of normal vectors. Ignored when geometryId is given.
     @param {Array} [cfg.indices] Array of triangle indices. Ignored when geometryId is given.
     @param {Array} [cfg.edgeIndices] Array of edge line indices. Ignored when geometryId is given.
     @param {Array} [cfg.matrix] Modeling matrix.

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
                edgeIndices = math.buildEdgeIndices(positions, indices, null, 10, false);
            }
            portionId = this._currentBatchingLayer.createPortion(positions, normals, indices, edgeIndices, flags, color, matrix, aabb, pickColor);
            math.expandAABB3(this._aabb, aabb);
            this.numGeometries++;
        }

        mesh.object = null; // Will be set within BigModelObject constructor
        mesh._layer = layer;
        mesh._portionId = portionId;
        mesh.aabb = aabb;

        this.meshes[id] = mesh;


        // console.log("mesh " + id + " = " + aabb);

        return mesh;
    }

    /**
     Creates a {@link BigModelObject} within this BigModel, giving it one or
     more meshes previously created with {@link BigModel/createMesh"}}createMesh(){{/crossLink}}.

     A mesh can only belong to one BigModelObject, so you'll get an error if you try to reuse a mesh among
     multiple BigModelObjects.

     @param cfg
     @returns {BigModelObject}
     */
    createObject(cfg) {
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
            mesh = this.meshes[meshId];
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
        if (this._visible && cfg.visible !== false) { // Apply flags fom xeokit.Object base class
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
        var object = new BigModelObject(this, cfg.objectId, id, meshes, flags, aabb); // Internally sets BigModelMesh#object to this BigModelObject
        this.objects[id] = object;
        this._objectIds.push(id);
        this.numObjects++;
        return object;
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
        for (var id in this.objects) {
            if (this.objects.hasOwnProperty(id)) {
                this.objects[id]._finalize();
            }
        }
        this.glRedraw();
        this.scene._boundaryDirty = true;
        console.log("[BigModel] finalize() - numObjects = " + this.numObjects + ", numGeometries = " + this.numGeometries);
    }

    /**
     Gets the IDs of objects within this BigModel.

     @method getObjectIds
     @returns {Array}
     */
    getObjectIDs() {
        return this._objectIds;
    }

    /**
     World-space 3D axis-aligned bounding box (AABB) enclosing the objects within this BigModel.

     Represented by a six-element Float32Array containing the min/max extents of the
     axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.

     @property aabb
     @final
     @type {Float32Array}
     */
    get aabb() {
        return this._aabb;
    }

    /**
     Indicates if objects in this BigModel are visible.

     Only rendered when {@link BigModel/visible} is true and
     {@link BigModel/culled} is false.

     @property visible
     @default true
     @type Boolean
     */
    set visible(visible) {
        visible = visible !== false;
        this._visible = visible;
        for (var i = 0, len = this._objectIds.length; i < len; i++) {
            this.objects[this._objectIds[i]].visible = visible;
        }
        this.glRedraw();
    }

    get visible() {
        return (this.numVisibleObjects > 0);
    }

    /**
     Indicates if objects in this BigModel are highlighted.

     Highlighted appearance for the entire BigModel is configured by the {@link Scene/highlightMaterial:property"}}Scene highlightMaterial{{/crossLink}}.

     @property highlighted
     @default false
     @type Boolean
     */
    set highlighted(highlighted) {
        highlighted = !!highlighted;
        this._highlighted = highlighted;
        for (var i = 0, len = this._objectIds.length; i < len; i++) {
            this.objects[this._objectIds[i]].highlighted = highlighted;
        }
        this.glRedraw();
    }

    get highlighted() {
        return (this.numHighlightedObjects > 0);
    }

    /**
     Indicates if objects in this BigModel are selected.

     Selected appearance for the entire BigModel is configured by the {@link Scene/selectedMaterial:property"}}Scene selectedMaterial{{/crossLink}}.

     @property selected
     @default false
     @type Boolean
     */
    set selected(selected) {
        selected = !!selected;
        this._selected = selected;
        for (var i = 0, len = this._objectIds.length; i < len; i++) {
            this.objects[this._objectIds[i]].selected = selected;
        }
        this.glRedraw();
    }

    get selected() {
        return (this.numSelectedObjects > 0);
    }

    /**
     Indicates if objects in this BigModel are ghosted.

     Ghosted appearance for the entire BigModel is configured by the {@link Scene/ghostMaterial:property"}}Scene ghostMaterial{{/crossLink}}.

     @property ghosted
     @default false
     @type Boolean
     */
    set ghosted(ghosted) {
        ghosted = !!ghosted;
        this._ghosted = ghosted;
        for (var i = 0, len = this._objectIds.length; i < len; i++) {
            this.objects[this._objectIds[i]].ghosted = ghosted;
        }
        this.glRedraw();
    }

    get ghosted() {
        return (this.numGhostedObjects > 0);
    }

    /**
     Indicates if objects in BigModel are shown with emphasized edges.

     Edges appearance for the entire BigModel is configured by the {@link Scene/edgeMaterial:property"}}Scene edgeMaterial{{/crossLink}}.

     @property edges
     @default false
     @type Boolean
     */
    set edges(edges) {
        edges = !!edges;
        this._edges = edges;
        for (var i = 0, len = this._objectIds.length; i < len; i++) {
            this.objects[this._objectIds[i]].edges = edges;
        }
        this.glRedraw();
    }

    get edges() {
        return (this.numEdgesObjects > 0);
    }

    /**
     Indicates if this BigModel is culled from view.

     The BigModel is only rendered when {@link BigModel/visible} is true and
     {@link BigModel/culled} is false.

     @property culled
     @default false
     @type Boolean
     */
    set culled(culled) {
        culled = !!culled;
        this._culled = culled; // Whole BigModel is culled
        this.glRedraw();
    }

    get culled() {
        return this._culled;
    }

    /**
     Indicates if this BigModel is clippable.

     Clipping is done by the {@link Scene}'s {@link Clips} component.

     @property clippable
     @default true
     @type Boolean
     */
    set clippable(clippable) {
        clippable = clippable !== false;
        this._clippable = clippable;
        for (var i = 0, len = this._objectIds.length; i < len; i++) {
            this.objects[this._objectIds[i]].clippable = clippable;
        }
        this.glRedraw();
    }

    get clippable() {
        return this._clippable;
    }

    /**
     Indicates if this BigModel is included in the {@link Scene/aabb:property"}}Scene aabb{{/crossLink}}.

     @property collidable
     @default true
     @type Boolean
     */
    set collidable(collidable) {
        collidable = collidable !== false;
        this._collidable = collidable;
        for (var i = 0, len = this._objectIds.length; i < len; i++) {
            this.objects[this._objectIds[i]].collidable = collidable;
        }
    }

    get collidable() {
        return this._collidable;
    }

    /**
     Whether or not to allow picking on this BigModel.

     Picking is done via calls to {@link Scene/pick:method"}}Scene#pick(){{/crossLink}}.

     @property pickable
     @default true
     @type Boolean
     */
    set pickable(pickable) {
        pickable = pickable !== false;
        this._pickable = pickable;
        for (var i = 0, len = this._objectIds.length; i < len; i++) {
            this.objects[this._objectIds[i]].pickable = pickable;
        }
    }

    get pickable() {
        return this._pickable;
    }

    /**
     Defines the appearance of edges of objects within this BigModel.

     This is the {@link Scene/edgeMaterial:property"}}Scene edgeMaterial{{/crossLink}}.

     @property edgeMaterial
     @type EdgeMaterial
     */
    get edgeMaterial() {
        return this.scene.edgeMaterial;
    }

    /**
     Defines the appearance of ghosted objects within this BigModel.

     This is the {@link Scene/ghostMaterial:property"}}Scene ghostMaterial{{/crossLink}}.

     @property ghostMaterial
     @type EmphasisMaterial
     */
    get ghostMaterial() {
        return this.scene.ghostMaterial;
    }

    /**
     Defines the appearance of highlighted objects within this BigModel.

     This is the {@link Scene/highlightMaterial:property"}}Scene highlightMaterial{{/crossLink}}.

     @property highlightMaterial
     @type EmphasisMaterial
     */
    get highlightMaterial() {
        return this.scene.highlightMaterial;
    }

    /**
     Defines the appearance of selected objects within this BigModel.

     This is the {@link Scene/selectedMaterial:property"}}Scene selectedMaterial{{/crossLink}}.

     @property selectedMaterial
     @type EmphasisMaterial
     */
    get selectedMaterial() {
        return this.scene.selectedMaterial;
    }

    compile() {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].compileShaders();
        }
        this.glRedraw();
    }

    /**
     * Called by the renderer to check if this drawable should be included in it's state-sorted drawables list.
     * @private
     * @returns {boolean}
     */
    get isStateSortable() { // BigModel contains essentially a uniform rendering state, so doesn't need state sorting
        return false;
    }

    /**
     *  Called by xeokit, when about to render this BigModel Drawable, to get flags indicating what rendering effects to apply for it.
     *
     * @method getRenderFlags
     * @param {RenderFlags} renderFlags Returns the rendering flags.
     */
    getRenderFlags(renderFlags) {

        // Unlike xeokit.Mesh, rendering modes are less mutually exclusive
        // because a BigModel contains multiple BigModelMesh objects, which
        // can have a mixture of rendering states.

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

    //-- NORMAL --------------------------------------------------------------------------------------------------------

    drawNormalFillOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawNormalFillOpaque(frameCtx);
        }
    }

    drawNormalEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawNormalEdgesOpaque(frameCtx);
        }
    }

    drawNormalFillTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawNormalFillTransparent(frameCtx);
        }
    }

    drawNormalEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawNormalEdgesTransparent(frameCtx);
        }
    }

    //-- GHOSTED -------------------------------------------------------------------------------------------------------

    drawGhostedFillOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawGhostedFillOpaque(frameCtx);
        }
    }

    drawGhostedEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawGhostedEdgesOpaque(frameCtx);
        }
    }

    drawGhostedFillTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawGhostedFillTransparent(frameCtx);
        }
    }

    drawGhostedEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawGhostedEdgesTransparent(frameCtx);
        }
    }

    //-- HIGHLIGHTED ---------------------------------------------------------------------------------------------------

    drawHighlightedFillOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawHighlightedFillOpaque(frameCtx);
        }
    }

    drawHighlightedEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawHighlightedEdgesOpaque(frameCtx);
        }
    }

    drawHighlightedFillTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawHighlightedFillTransparent(frameCtx);
        }
    }

    drawHighlightedEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawHighlightedEdgesTransparent(frameCtx);
        }
    }

    //-- SELECTED ------------------------------------------------------------------------------------------------------

    drawSelectedFillOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawSelectedFillOpaque(frameCtx);
        }
    }

    drawSelectedEdgesOpaque(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawSelectedEdgesOpaque(frameCtx);
        }
    }

    drawSelectedFillTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawSelectedFillTransparent(frameCtx);
        }
    }

    drawSelectedEdgesTransparent(frameCtx) {
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawSelectedEdgesTransparent(frameCtx);
        }
    }

    //------------------------------------------------------------------------------------------------------------------

    drawOutline(frameCtx) {
    }

    drawShadow(frameCtx) {
    }

    drawPickMesh(frameCtx) {
        if (this.numVisibleObjects === 0) {
            return;
        }
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].drawPickMesh(frameCtx);
        }
    }

    _findPickedObject(color) {
        // TODO: map color back to an object
    }

    destroy() {
        super.destroy();
        for (var i = 0, len = this._layers.length; i < len; i++) {
            this._layers[i].destroy();
        }
        for (var i = 0, len = this._objectIds.length; i < len; i++) {
            this.objects[this._objectIds[i]]._destroy();
        }
        this.scene._boundaryDirty = true;
    }
}

export {BigModel};