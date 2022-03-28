import {Component} from "../Component.js";
import {math} from "../math/math.js";
import {buildEdgeIndices} from '../math/buildEdgeIndices.js';
import {WEBGL_INFO} from '../webglInfo.js';
import {PerformanceMesh} from './lib/PerformanceMesh.js';
import {PerformanceNode} from './lib/PerformanceNode.js';
import {getScratchMemory, putScratchMemory} from "./lib/ScratchMemory.js";
import {prepareMeshGeometry, TrianglesDataTextureLayer} from './lib/layers/trianglesDataTexture/TrianglesDataTextureLayer.js';
import {TrianglesInstancingLayer} from './lib/layers/trianglesInstancing/TrianglesInstancingLayer.js';

import {ENTITY_FLAGS} from './lib/ENTITY_FLAGS.js';
import {utils} from "../utils.js";
import {RenderFlags} from "../webgl/RenderFlags.js";
import {worldToRTCPositions} from "../math/rtcCoords.js";

import { LodCullingManager } from "./lib/layers/trianglesDataTexture/LodCullingManager.js"

const instancedArraysSupported = WEBGL_INFO.SUPPORTED_EXTENSIONS["ANGLE_instanced_arrays"];

const tempVec3a = math.vec3();
const tempMat4 = math.mat4();

const defaultScale = math.vec3([1, 1, 1]);
const defaultPosition = math.vec3([0, 0, 0]);
const defaultRotation = math.vec3([0, 0, 0]);
const defaultQuaternion = math.identityQuaternion();

/**
 * @desc A high-performance model representation for efficient rendering and low memory usage.
 *
 * # Examples
 *
 * * [DataTexturePeformanceModel using geometry batching](http://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_batching)
 * * [DataTexturePeformanceModel using geometry batching and RTC coordinates](http://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_batching_origin)
 * * [DataTexturePeformanceModel using geometry instancing](http://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_instancing)
 * * [DataTexturePeformanceModel using geometry instancing and RTC coordinates](http://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_instancing_origin)
 *
 * # Overview
 *
 * While xeokit's standard [scene graph](https://github.com/xeokit/xeokit-sdk/wiki/Scene-Graphs) is great for gizmos and medium-sized models, it doesn't scale up to millions of objects in terms of memory and rendering efficiency.
 *
 * For huge models, we have the ````DataTexturePeformanceModel```` representation, which is optimized to pack large amounts of geometry into memory and render it efficiently using WebGL.
 *
 * ````DataTexturePeformanceModel```` is the default model representation loaded by  (at least) {@link GLTFLoaderPlugin}, {@link XKTLoaderPlugin} and  {@link WebIFCLoaderPlugin}.
 *
 * In this tutorial you'll learn how to use ````DataTexturePeformanceModel```` to create high-detail content programmatically. Ordinarily you'd be learning about ````DataTexturePeformanceModel```` if you were writing your own model loader plugins.
 *
 * # Contents
 *
 * - [DataTexturePeformanceModel](#DataTexturePeformanceModel)
 * - [GPU-Resident Geometry](#gpu-resident-geometry)
 * - [Picking](#picking)
 * - [Example 1: Geometry Instancing](#example-1--geometry-instancing)
 * - [Finalizing a DataTexturePeformanceModel](#finalizing-a-DataTexturePeformanceModel)
 * - [Finding Entities](#finding-entities)
 * - [Example 2: Geometry Batching](#example-2--geometry-batching)
 * - [Classifying with Metadata](#classifying-with-metadata)
 * - [Querying Metadata](#querying-metadata)
 * - [Metadata Structure](#metadata-structure)
 * - [RTC Coordinates](#rtc-coordinates-for-double-precision)
 *   - [Example 3: RTC Coordinates with Geometry Instancing](#example-2--rtc-coordinates-with-geometry-instancing)
 *   - [Example 4: RTC Coordinates with Geometry Batching](#example-2--rtc-coordinates-with-geometry-batching)
 *
 * ## DataTexturePeformanceModel
 *
 * ````DataTexturePeformanceModel```` uses two rendering techniques internally:
 *
 * 1. ***Geometry batching*** for unique geometries, combining those into a single WebGL geometry buffer, to render in one draw call, and
 * 2. ***geometry instancing*** for geometries that are shared by multiple meshes, rendering all instances of each shared geometry in one draw call.
 *
 * <br>
 * These techniques come with certain limitations:
 *
 * * Non-realistic rendering - while scene graphs can use xeokit's full set of material workflows, ````DataTexturePeformanceModel```` uses simple Lambertian shading without textures.
 * * Static transforms - transforms within a ````DataTexturePeformanceModel```` are static and cannot be dynamically translated, rotated and scaled the way {@link Node}s and {@link Mesh}es in scene graphs can.
 * * Immutable model representation - while scene graph {@link Node}s and
 * {@link Mesh}es can be dynamically plugged together, ````DataTexturePeformanceModel```` is immutable,
 * since it packs its geometries into buffers and instanced arrays.
 *
 * ````DataTexturePeformanceModel````'s API allows us to exploit batching and instancing, while exposing its elements as
 * abstract {@link Entity} types.
 *
 * {@link Entity} is the abstract base class for
 * the various xeokit components that represent models, objects, or anonymous visible elements. An Entity has a unique ID and can be
 * individually shown, hidden, selected, highlighted, ghosted, culled, picked and clipped, and has its own World-space boundary.
 *
 * * A ````DataTexturePeformanceModel```` is an {@link Entity} that represents a model.
 * * A ````DataTexturePeformanceModel```` represents each of its objects with an {@link Entity}.
 * * Each {@link Entity} has one or more meshes that define its shape.
 * * Each mesh has either its own unique geometry, or shares a geometry with other meshes.
 *
 * ## GPU-Resident Geometry
 *
 * For a low memory footprint, ````DataTexturePeformanceModel```` stores its geometries in GPU memory only, compressed (quantized) as integers. Unfortunately, GPU-resident geometry is
 * not readable by JavaScript.
 *
 *
 * ## Example 1: Geometry Instancing
 *
 * In the example below, we'll use a ````DataTexturePeformanceModel````
 * to build a simple table model using geometry instancing.
 *
 * We'll start by adding a reusable box-shaped geometry to our ````DataTexturePeformanceModel````.
 *
 * Then, for each object in our model we'll add an {@link Entity}
 * that has a mesh that instances our box geometry, transforming and coloring the instance.
 *
 * [![](http://xeokit.io/img/docs/sceneGraph.png)](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_instancing)
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_instancing)]
 *
 * ````javascript
 * import {Viewer, DataTexturePeformanceModel} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.scene.camera.eye = [-21.80, 4.01, 6.56];
 * viewer.scene.camera.look = [0, -5.75, 0];
 * viewer.scene.camera.up = [0.37, 0.91, -0.11];
 *
 * // Build a DataTexturePeformanceModel representing a table
 * // with four legs, using geometry instancing
 *
 * const DataTexturePeformanceModel = new DataTexturePeformanceModel(viewer.scene, {
 *     id: "table",
 *     isModel: true, // <--- Registers DataTexturePeformanceModel in viewer.scene.models
 *     position: [0, 0, 0],
 *     scale: [1, 1, 1],
 *     rotation: [0, 0, 0]
 * });
 *
 * // Create a reusable geometry within the DataTexturePeformanceModel
 * // We'll instance this geometry by five meshes
 *
 * DataTexturePeformanceModel.createGeometry({
 *
 *     id: "myBoxGeometry",
 *
 *     // The primitive type - allowed values are "points", "lines" and "triangles".
 *     // See the OpenGL/WebGL specification docs
 *     // for how the coordinate arrays are supposed to be laid out.
 *     primitive: "triangles",
 *
 *     // The vertices - eight for our cube, each
 *     // one spanning three array elements for X,Y and Z
 *     positions: [
 *          1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, // v0-v1-v2-v3 front
 *          1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, // v0-v3-v4-v1 right
 *          1, 1, 1, 1, 1, -1, -1, 1, -1, -1, 1, 1, // v0-v1-v6-v1 top
 *          -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, // v1-v6-v7-v2 left
 *          -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, // v7-v4-v3-v2 bottom
 *          1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1 // v4-v7-v6-v1 back
 *     ],
 *
 *     // Normal vectors, one for each vertex
 *     normals: [
 *         0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, // v0-v1-v2-v3 front
 *         1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, // v0-v3-v4-v5 right
 *         0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, // v0-v5-v6-v1 top
 *         -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, // v1-v6-v7-v2 left
 *         0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, // v7-v4-v3-v2 bottom
 *         0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1 // v4-v7-v6-v5 back
 *     ],
 *
 *     // Indices - these organise the positions and and normals
 *     // into geometric primitives in accordance with the "primitive" parameter,
 *     // in this case a set of three indices for each triangle.
 *     //
 *     // Note that each triangle is specified in counter-clockwise winding order.
 *     //
 *     indices: [
 *         0, 1, 2, 0, 2, 3, // front
 *         4, 5, 6, 4, 6, 7, // right
 *         8, 9, 10, 8, 10, 11, // top
 *         12, 13, 14, 12, 14, 15, // left
 *         16, 17, 18, 16, 18, 19, // bottom
 *         20, 21, 22, 20, 22, 23
 *     ]
 * });
 *
 * // Red table leg
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "redLegMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     id: "redLeg",
 *     meshIds: ["redLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Green table leg
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "greenLegMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     id: "greenLeg",
 *     meshIds: ["greenLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Blue table leg
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "blueLegMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     id: "blueLeg",
 *     meshIds: ["blueLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Yellow table leg
 *
 * DataTexturePeformanceModel.createMesh({
 *      id: "yellowLegMesh",
 *      geometryId: "myBoxGeometry",
 *      position: [-4, -6, 4],
 *      scale: [1, 3, 1],
 *      rotation: [0, 0, 0],
 *      color: [1.0, 1.0, 0.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     id: "yellowLeg",
 *     meshIds: ["yellowLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Purple table top
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "purpleTableTopMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     id: "purpleTableTop",
 *     meshIds: ["purpleTableTopMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *  ````
 *
 * ## Finalizing a DataTexturePeformanceModel
 *
 * Before we can view and interact with our ````DataTexturePeformanceModel````, we need to **finalize** it. Internally, this causes the ````DataTexturePeformanceModel```` to build the
 * vertex buffer objects (VBOs) that support our geometry instances. When using geometry batching (see next example),
 * this causes ````DataTexturePeformanceModel```` to build the VBOs that combine the batched geometries. Note that you can do both instancing and
 * batching within the same ````DataTexturePeformanceModel````.
 *
 * Once finalized, we can't add anything more to our ````DataTexturePeformanceModel````.
 *
 * ```` javascript
 * DataTexturePeformanceModel.finalize();
 * ````
 *
 * ## Finding Entities
 *
 * As mentioned earlier, {@link Entity} is
 * the abstract base class for components that represent models, objects, or just
 * anonymous visible elements.
 *
 * Since we created configured our ````DataTexturePeformanceModel```` with ````isModel: true````,
 * we're able to find it as an Entity by ID in ````viewer.scene.models````. Likewise, since
 * we configured each of its Entities with ````isObject: true````, we're able to
 * find them in  ````viewer.scene.objects````.
 *
 *
 * ````javascript
 * // Get the whole table model Entity
 * const table = viewer.scene.models["table"];
 *
 *  // Get some leg object Entities
 * const redLeg = viewer.scene.objects["redLeg"];
 * const greenLeg = viewer.scene.objects["greenLeg"];
 * const blueLeg = viewer.scene.objects["blueLeg"];
 * ````
 *
 * ## Example 2: Geometry Batching
 *
 * Let's once more use a ````DataTexturePeformanceModel````
 * to build the simple table model, this time exploiting geometry batching.
 *
 *  [![](http://xeokit.io/img/docs/sceneGraph.png)](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_batching)
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_batching)]
 *
 * ````javascript
 * import {Viewer, DataTexturePeformanceModel} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.scene.camera.eye = [-21.80, 4.01, 6.56];
 * viewer.scene.camera.look = [0, -5.75, 0];
 * viewer.scene.camera.up = [0.37, 0.91, -0.11];
 *
 * // Create a DataTexturePeformanceModel representing a table with four legs, using geometry batching
 * const DataTexturePeformanceModel = new DataTexturePeformanceModel(viewer.scene, {
 *     id: "table",
 *     isModel: true,  // <--- Registers DataTexturePeformanceModel in viewer.scene.models
 *     position: [0, 0, 0],
 *     scale: [1, 1, 1],
 *     rotation: [0, 0, 0]
 * });
 *
 * // Red table leg
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "redLegMesh",
 *
 *     // Geometry arrays are same as for the earlier batching example
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     id: "redLeg",
 *     meshIds: ["redLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Green table leg
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "greenLegMesh",
 *     primitive: "triangles",
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     id: "greenLeg",
 *     meshIds: ["greenLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Blue table leg
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "blueLegMesh",
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     id: "blueLeg",
 *     meshIds: ["blueLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Yellow table leg object
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "yellowLegMesh",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [-4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 1.0, 0.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     id: "yellowLeg",
 *     meshIds: ["yellowLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Purple table top
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "purpleTableTopMesh",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     id: "purpleTableTop",
 *     meshIds: ["purpleTableTopMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Finalize the DataTexturePeformanceModel.
 *
 * DataTexturePeformanceModel.finalize();
 *
 * // Find BigModelNodes by their model and object IDs
 *
 * // Get the whole table model
 * const table = viewer.scene.models["table"];
 *
 * // Get some leg objects
 * const redLeg = viewer.scene.objects["redLeg"];
 * const greenLeg = viewer.scene.objects["greenLeg"];
 * const blueLeg = viewer.scene.objects["blueLeg"];
 * ````
 *
 * ## Classifying with Metadata
 *
 * In the previous examples, we used ````DataTexturePeformanceModel```` to build
 * two versions of the same table model, to demonstrate geometry batching and geometry instancing.
 *
 * We'll now classify our {@link Entity}s with metadata. This metadata
 * will work the same for both our examples, since they create the exact same structure of {@link Entity}s
 * to represent their models and objects. The abstract Entity type is, after all, intended to provide an abstract interface through which differently-implemented scene content can be accessed uniformly.
 *
 * To create the metadata, we'll create a {@link MetaModel} for our model,
 * with a {@link MetaObject} for each of it's objects. The MetaModel and MetaObjects
 * get the same IDs as the {@link Entity}s that represent their model and objects within our scene.
 *
 * ```` javascript
 * const furnitureMetaModel = viewer.metaScene.createMetaModel("furniture", {         // Creates a MetaModel in the MetaScene
 *
 *      "projectId": "myTableProject",
 *      "revisionId": "V1.0",
 *
 *      "metaObjects": [
 *          {                               // Creates a MetaObject in the MetaModel
 *              "id": "table",
 *              "name": "Table",            // Same ID as an object Entity
 *              "type": "furniture",        // Arbitrary type, could be IFC type
 *              "properties": {             // Arbitrary properties, could be IfcPropertySet
 *                  "cost": "200"
 *              }
 *          },
 *          {
 *              "id": "redLeg",
 *              "name": "Red table Leg",
 *              "type": "leg",
 *              "parent": "table",           // References first MetaObject as parent
 *              "properties": {
 *                  "material": "wood"
 *              }
 *          },
 *          {
 *              "id": "greenLeg",           // Node with corresponding id does not need to exist
 *              "name": "Green table leg",  // and MetaObject does not need to exist for Node with an id
 *              "type": "leg",
 *              "parent": "table",
 *              "properties": {
 *                  "material": "wood"
 *              }
 *          },
 *          {
 *              "id": "blueLeg",
 *              "name": "Blue table leg",
 *              "type": "leg",
 *              "parent": "table",
 *              "properties": {
 *                  "material": "wood"
 *              }
 *          },
 *          {
 *              "id": "yellowLeg",
 *              "name": "Yellow table leg",
 *              "type": "leg",
 *              "parent": "table",
 *              "properties": {
 *                  "material": "wood"
 *              }
 *          },
 *          {
 *              "id": "tableTop",
 *              "name": "Purple table top",
 *              "type": "surface",
 *              "parent": "table",
 *              "properties": {
 *                  "material": "formica",
 *                  "width": "60",
 *                  "depth": "60",
 *                  "thickness": "5"
 *              }
 *          }
 *      ]
 *  });
 * ````
 *
 * ## Querying Metadata
 *
 * Having created and classified our model (either the instancing or batching example), we can now find the {@link MetaModel}
 * and {@link MetaObject}s using the IDs of their
 * corresponding {@link Entity}s.
 *
 * ````JavaScript
 * const furnitureMetaModel = scene.metaScene.metaModels["furniture"];
 *
 * const redLegMetaObject = scene.metaScene.metaObjects["redLeg"];
 * ````
 *
 * In the snippet below, we'll log metadata on each {@link Entity} we click on:
 *
 * ````JavaScript
 * viewer.scene.input.on("mouseclicked", function (coords) {
 *
 *      const hit = viewer.scene.pick({
 *          canvasPos: coords
 *      });
 *
 *      if (hit) {
 *          const entity = hit.entity;
 *          const metaObject = viewer.metaScene.metaObjects[entity.id];
 *          if (metaObject) {
 *              console.log(JSON.stringify(metaObject.getJSON(), null, "\t"));
 *          }
 *      }
 *  });
 * ````
 *
 * ## Metadata Structure
 *
 * The {@link MetaModel}
 * organizes its {@link MetaObject}s in
 * a tree that describes their structural composition:
 *
 * ````JavaScript
 * // Get metadata on the root object
 * const tableMetaObject = furnitureMetaModel.rootMetaObject;
 *
 * // Get metadata on the leg objects
 * const redLegMetaObject = tableMetaObject.children[0];
 * const greenLegMetaObject = tableMetaObject.children[1];
 * const blueLegMetaObject = tableMetaObject.children[2];
 * const yellowLegMetaObject = tableMetaObject.children[3];
 * ````
 *
 * Given an {@link Entity}, we can find the object or model of which it is a part, or the objects that comprise it. We can also generate UI
 * components from the metadata, such as the tree view demonstrated in [this demo](https://xeokit.github.io/xeokit-sdk/examples/#BIMOffline_glTF_OTCConferenceCenter).
 *
 * This hierarchy allows us to express the hierarchical structure of a model while representing it in
 * various ways in the 3D scene (such as with ````DataTexturePeformanceModel````, which
 * has a non-hierarchical scene representation).
 *
 * Note also that a {@link MetaObject} does not need to have a corresponding
 * {@link Entity} and vice-versa.
 *
 * # RTC Coordinates for Double Precision
 *
 * ````DataTexturePeformanceModel```` can emulate 64-bit precision on GPUs using relative-to-center (RTC) coordinates.
 *
 * Consider a model that contains many small objects, but with such large spatial extents that 32 bits of GPU precision (accurate to ~7 digits) will not be sufficient to render all of the the objects without jittering.
 *
 * To prevent jittering, we could spatially subdivide the objects into "tiles". Each tile would have a center position, and the positions of the objects within the tile would be relative to that center ("RTC coordinates").
 *
 * While the center positions of the tiles would be 64-bit values, the object positions only need to be 32-bit.
 *
 * Internally, when rendering an object with RTC coordinates, xeokit first temporarily translates the camera viewing matrix by the object's tile's RTC center, on the CPU, using 64-bit math.
 *
 * Then xeokit loads the viewing matrix into its WebGL shaders, where math happens at 32-bit precision. Within the shaders, the matrix is effectively down-cast to 32-bit precision, and the object's 32-bit vertex positions are transformed by the matrix.
 *
 * We see no jittering, because with RTC a detectable loss of GPU accuracy only starts happening to objects as they become very distant from the camera viewpoint, at which point they are too small to be discernible anyway.
 *
 * ## RTC Coordinates with Geometry Instancing
 *
 * To use RTC with ````DataTexturePeformanceModel```` geometry instancing, we specify an RTC center for the geometry via its ````origin```` parameter. Then ````DataTexturePeformanceModel```` assumes that all meshes that instance that geometry are within the same RTC coordinate system, ie. the meshes ````position```` and ````rotation```` properties are assumed to be relative to the geometry's ````origin````.
 *
 * For simplicity, our example's meshes all instance the same geometry. Therefore, our example model has only one RTC center.
 *
 * Note that the axis-aligned World-space boundary (AABB) of our model is ````[ -6, -9, -6, 1000000006, -2.5, 1000000006]````.
 *
 * [![](http://xeokit.io/img/docs/sceneGraph.png)](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_batching)
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_instancing_origin)]
 *
 * ````javascript
 * const origin = [100000000, 0, 100000000];
 *
 * DataTexturePeformanceModel.createGeometry({
 *     id: "box",
 *     origin: origin, // This geometry's positions, and the transforms of all meshes that instance the geometry, are relative to the RTC center
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg1",
 *     geometryId: "box",
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg1"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg2",
 *     geometryId: "box",
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg2"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg3",
 *     geometryId: "box",
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg3"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg4",
 *     geometryId: "box",
 *     position: [-4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 1.0, 0.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg4"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "top",
 *     geometryId: "box",
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["top"],
 *     isObject: true
 * });
 * ````
 *
 * ## RTC Coordinates with Geometry Batching
 *
 * To use RTC with ````DataTexturePeformanceModel```` geometry batching, we specify an RTC center (````origin````) for each mesh. For performance, we try to have as many meshes share the same value for ````origin```` as possible. Each mesh's ````positions````, ````position```` and ````rotation```` properties are assumed to be relative to ````origin````.
 *
 * For simplicity, the meshes in our example all share the same RTC center.
 *
 * The axis-aligned World-space boundary (AABB) of our model is ````[ -6, -9, -6, 1000000006, -2.5, 1000000006]````.
 *
 * [![](http://xeokit.io/img/docs/sceneGraph.png)](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_batching)
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_PerformanceModel_batching_origin)]
 *
 * ````javascript
 * const origin = [100000000, 0, 100000000];
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg1",
 *     origin: origin, // This mesh's positions and transforms are relative to the RTC center
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg1"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg2",
 *     origin: origin, // This mesh's positions and transforms are relative to the RTC center
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg2"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg3",
 *     origin: origin, // This mesh's positions and transforms are relative to the RTC center
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg3"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg4",
 *     origin: origin, // This mesh's positions and transforms are relative to the RTC center
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [-4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 1.0, 0.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg4"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "top",
 *     origin: origin, // This mesh's positions and transforms are relative to the RTC center
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["top"],
 *     isObject: true
 * });
 * ````
 *
 * ## Positioning at World-space coordinates
 *
 * To position a DataTexturePeformanceModel at given double-precision World coordinates, we can
 * configure the ````origin```` of the DataTexturePeformanceModel itself. The ````origin```` is a double-precision
 * 3D World-space position at which the DataTexturePeformanceModel will be located.
 *
 * Note that ````position```` is a single-precision offset relative to ````origin````.
 *
 * ````javascript
 * const origin = [100000000, 0, 100000000];
 *
 * const DataTexturePeformanceModel = new DataTexturePeformanceModel(viewer.scene, {
 *     id: "table",
 *     isModel: true,
 *     origin: origin, // Everything in this DataTexturePeformanceModel is relative to this RTC center
 *     position: [0, 0, 0],
 *     scale: [1, 1, 1],
 *     rotation: [0, 0, 0]
 * });
 *
 * DataTexturePeformanceModel.createGeometry({
 *     id: "box",
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg1",
 *     geometryId: "box",
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg1"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg2",
 *     geometryId: "box",
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg2"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg3",
 *     geometryId: "box",
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg3"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "leg4",
 *     geometryId: "box",
 *     position: [-4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 1.0, 0.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["leg4"],
 *     isObject: true
 * });
 *
 * DataTexturePeformanceModel.createMesh({
 *     id: "top",
 *     geometryId: "box",
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0]
 * });
 *
 * DataTexturePeformanceModel.createEntity({
 *     meshIds: ["top"],
 *     isObject: true
 * });
 * ````
 *
 * @implements {Drawable}
 * @implements {Entity}
 */
class DataTexturePeformanceModel extends Component {

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     * @param {Boolean} [cfg.isModel] Specify ````true```` if this DataTexturePeformanceModel represents a model, in which case the DataTexturePeformanceModel will be registered by {@link DataTexturePeformanceModel#id} in {@link Scene#models} and may also have a corresponding {@link MetaModel} with matching {@link MetaModel#id}, registered by that ID in {@link MetaScene#metaModels}.
     * @param {Number[]} [cfg.origin=[0,0,0]] World-space double-precision 3D origin.
     * @param {Number[]} [cfg.position=[0,0,0]] Local, single-precision 3D position, relative to the origin parameter.
     * @param {Number[]} [cfg.scale=[1,1,1]] Local scale.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] Local modelling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [cfg.visible=true] Indicates if the DataTexturePeformanceModel is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the DataTexturePeformanceModel is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the DataTexturePeformanceModel is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the DataTexturePeformanceModel is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the DataTexturePeformanceModel is initially included in boundary calculations.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the DataTexturePeformanceModel is initially xrayed.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the DataTexturePeformanceModel is initially highlighted.
     * @param {Boolean} [cfg.selected=false] Indicates if the DataTexturePeformanceModel is initially selected.
     * @param {Boolean} [cfg.edges=false] Indicates if the DataTexturePeformanceModel's edges are initially emphasized.
     * @param {Number[]} [cfg.colorize=[1.0,1.0,1.0]] DataTexturePeformanceModel's initial RGB colorize color, multiplies by the rendered fragment colors.
     * @param {Number} [cfg.opacity=1.0] DataTexturePeformanceModel's initial opacity factor, multiplies by the rendered fragment alpha.
     * @param {Number} [cfg.backfaces=false] When we set this ````true````, then we force rendering of backfaces for this DataTexturePeformanceModel. When
     * we leave this ````false````, then we allow the Viewer to decide when to render backfaces. In that case, the
     * Viewer will hide backfaces on watertight meshes, show backfaces on open meshes, and always show backfaces on meshes when we slice them open with {@link SectionPlane}s.
     * @param {Boolean} [cfg.saoEnabled=true] Indicates if Scalable Ambient Obscurance (SAO) will apply to this DataTexturePeformanceModel. SAO is configured by the Scene's {@link SAO} component.
     * @param {Boolean} [cfg.pbrEnabled=false] Indicates if physically-based rendering (PBR) will apply to the DataTexturePeformanceModel. Only works when {@link Scene#pbrEnabled} is also ````true````.
     * @param {Number} [cfg.edgeThreshold=10] When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     */
    constructor(owner, cfg = {}) {
        super(owner, cfg);

        if (!(this.scene.canvas.gl instanceof WebGL2RenderingContext)) {
            throw "Using a DataTexturePerformanceModel requires the usage of webgl2";
        }

        this._targetLodFps = cfg.targetLodFps;
        this._aabb = math.collapseAABB3();
        this._aabbDirty = false;

        /**
         * @type {Array<TrianglesDataTextureLayer>}
         */
        this._layerList = [];

        /**
         * @type {Array<PerformanceNode>}
         */
        this._nodeList = [];

        /**
         * @type {TrianglesDataTextureLayer}
         */
        this._currentDataTextureLayer = null;

        this._instancingGeometries = {};

        this._preparedInstancingGeometries = {};

        this._scratchMemory = getScratchMemory();

        /**
         * @type {Map<string, PerformanceMesh>}
         */
        this._meshes = {};
        
        /**
         * @type {Map<string, PerformanceNode>}
         */
        this._nodes = {};

        /**
         * @type {RenderFlags}
         * @private
         */
        this.renderFlags = new RenderFlags();

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
        this.numClippableLayerPortions = 0;

        /**
         * @private
         */
        this.numCulledLayerPortions = 0;

        /** @private */
        this.numEntities = 0;

        /** @private */
        this._numTriangles = 0;

        this._edgeThreshold = cfg.edgeThreshold || 10;

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

        this._origin = math.vec3(cfg.origin || [0, 0, 0]);
        this._position = math.vec3(cfg.position || [0, 0, 0]);
        this._rotation = math.vec3(cfg.rotation || [0, 0, 0]);
        this._quaternion = math.vec4(cfg.quaternion || [0, 0, 0, 1]);
        if (cfg.rotation) {
            math.eulerToQuaternion(this._rotation, "XYZ", this._quaternion);
        }
        this._scale = math.vec3(cfg.scale || [1, 1, 1]);
        this._worldMatrix = math.mat4();
        math.composeMat4(this._position, this._quaternion, this._scale, this._worldMatrix);
        this._worldNormalMatrix = math.mat4();
        math.inverseMat4(this._worldMatrix, this._worldNormalMatrix);
        math.transposeMat4(this._worldNormalMatrix);

        if (cfg.matrix || cfg.position || cfg.rotation || cfg.scale || cfg.quaternion) {
            this._viewMatrix = math.mat4();
            this._viewNormalMatrix = math.mat4();
            this._viewMatrixDirty = true;
            this._worldMatrixNonIdentity = true;
        }

        this._opacity = 1.0;
        this._colorize = [1, 1, 1];

        this._saoEnabled = (cfg.saoEnabled !== false);

        this._pbrEnabled = (!!cfg.pbrEnabled);

        this._isModel = cfg.isModel;
        if (this._isModel) {
            this.scene._registerModel(this);
        }

        this._onCameraViewMatrix = this.scene.camera.on("matrix", () => {
            this._viewMatrixDirty = true;
        });
    }

    //------------------------------------------------------------------------------------------------------------------
    // DataTexturePeformanceModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that this Component is a DataTexturePeformanceModel.
     * @type {Boolean}
     */
    get isPerformanceModel() {
        return true;
    }

    /**
     * Returns the {@link Entity}s in this DataTexturePeformanceModel.
     * @returns {*|{}}
     */
    get objects() {
        return this._nodes;
    }

    /**
     * Gets the 3D World-space origin for this DataTexturePeformanceModel.
     *
     * Each geometry or mesh origin, if supplied, is relative to this origin.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Float64Array}
     * @abstract
     */
    get origin() {
        return this._origin;
    }

    /**
     * Gets the DataTexturePeformanceModel's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get position() {
        return this._position;
    }

    /**
     * Gets the DataTexturePeformanceModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
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
     * Gets the DataTexturePeformanceModel's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     */
    get scale() {
        return this._scale;
    }

    /**
     * Gets the DataTexturePeformanceModel's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     */
    get matrix() {
        return this._worldMatrix;
    }

    /**
     * Gets the DataTexturePeformanceModel's World matrix.
     *
     * @property worldMatrix
     * @type {Number[]}
     */
    get worldMatrix() {
        return this._worldMatrix;
    }

    /**
     * Gets the DataTexturePeformanceModel's World normal matrix.
     *
     * @type {Number[]}
     */
    get worldNormalMatrix() {
        return this._worldNormalMatrix;
    }

    /**
     * Called by private renderers in ./lib, returns the view matrix with which to
     * render this DataTexturePeformanceModel. The view matrix is the concatenation of the
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
     * Called by private renderers in ./lib, returns the view normal matrix with which to render this DataTexturePeformanceModel.
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
     * Sets if backfaces are rendered for this DataTexturePeformanceModel.
     *
     * Default is ````false````.
     *
     * @type {Boolean}
     */
    get backfaces() {
        return this._backfaces;
    }

    /**
     * Sets if backfaces are rendered for this DataTexturePeformanceModel.
     *
     * Default is ````false````.
     *
     * When we set this ````true````, then backfaces are always rendered for this DataTexturePeformanceModel.
     *
     * When we set this ````false````, then we allow the Viewer to decide whether to render backfaces. In this case,
     * the Viewer will:
     *
     *  * hide backfaces on watertight meshes,
     *  * show backfaces on open meshes, and
     *  * always show backfaces on meshes when we slice them open with {@link SectionPlane}s.
     *
     * @type {Boolean}
     */
    set backfaces(backfaces) {
        backfaces = !!backfaces;
        this._backfaces = backfaces;
        this.glRedraw();
    }

    /**
     * Gets the list of {@link Entity}s within this DataTexturePeformanceModel.
     *
     * @returns {Entity[]}
     */
    get entityList() {
        return this._nodeList;
    }

    /**
     * Returns true to indicate that DataTexturePeformanceModel is an {@link Entity}.
     * @type {Boolean}
     */
    get isEntity() {
        return true;
    }

    /**
     * Returns ````true```` if this DataTexturePeformanceModel represents a model.
     *
     * When ````true```` the DataTexturePeformanceModel will be registered by {@link DataTexturePeformanceModel#id} in
     * {@link Scene#models} and may also have a {@link MetaObject} with matching {@link MetaObject#id}.
     *
     * @type {Boolean}
     */
    get isModel() {
        return this._isModel;
    }

    //------------------------------------------------------------------------------------------------------------------
    // DataTexturePeformanceModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns ````false```` to indicate that DataTexturePeformanceModel never represents an object.
     *
     * @type {Boolean}
     */
    get isObject() {
        return false;
    }

    /**
     * Gets the DataTexturePeformanceModel's World-space 3D axis-aligned bounding box.
     *
     * Represented by a six-element Float64Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Number[]}
     */
    get aabb() {
        if (this._aabbDirty) {
            this._rebuildAABB();
        }
        return this._aabb;
    }

    /**
     * The approximate number of triangle primitives in this DataTexturePeformanceModel.
     *
     * @type {Number}
     */
    get numTriangles() {
        return this._numTriangles;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Entity members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * The approximate number of line primitives in this DataTexturePeformanceModel.
     *
     * @type {Number}
     */
    get numLines() {
        return 0;
    }

    /**
     * The approximate number of point primitives in this DataTexturePeformanceModel.
     *
     * @type {Number}
     */
    get numPoints() {
        return 0;
    }

    /**
     * Gets if any {@link Entity}s in this DataTexturePeformanceModel are visible.
     *
     * The DataTexturePeformanceModel is only rendered when {@link DataTexturePeformanceModel#visible} is ````true```` and {@link DataTexturePeformanceModel#culled} is ````false````.
     *
     * @type {Boolean}
     */
    get visible() {
        return (this.numVisibleLayerPortions > 0);
    }

    /**
     * Sets if this DataTexturePeformanceModel is visible.
     *
     * The DataTexturePeformanceModel is only rendered when {@link DataTexturePeformanceModel#visible} is ````true```` and {@link DataTexturePeformanceModel#culled} is ````false````.
     **
     * @type {Boolean}
     */
    set visible(visible) {
        visible = visible !== false;
        this._visible = visible;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].visible = visible;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this DataTexturePeformanceModel are xrayed.
     *
     * @type {Boolean}
     */
    get xrayed() {
        return (this.numXRayedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this DataTexturePeformanceModel are xrayed.
     *
     * @type {Boolean}
     */
    set xrayed(xrayed) {
        xrayed = !!xrayed;
        this._xrayed = xrayed;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].xrayed = xrayed;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this DataTexturePeformanceModel are highlighted.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return (this.numHighlightedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this DataTexturePeformanceModel are highlighted.
     *
     * @type {Boolean}
     */
    set highlighted(highlighted) {
        highlighted = !!highlighted;
        this._highlighted = highlighted;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].highlighted = highlighted;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this DataTexturePeformanceModel are selected.
     *
     * @type {Boolean}
     */
    get selected() {
        return (this.numSelectedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this DataTexturePeformanceModel are selected.
     *
     * @type {Boolean}
     */
    set selected(selected) {
        selected = !!selected;
        this._selected = selected;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].selected = selected;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this DataTexturePeformanceModel have edges emphasised.
     *
     * @type {Boolean}
     */
    get edges() {
        return (this.numEdgesLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this DataTexturePeformanceModel have edges emphasised.
     *
     * @type {Boolean}
     */
    set edges(edges) {
        edges = !!edges;
        this._edges = edges;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].edges = edges;
        }
        this.glRedraw();
    }

    /**
     * Gets if this DataTexturePeformanceModel is culled from view.
     *
     * The DataTexturePeformanceModel is only rendered when {@link DataTexturePeformanceModel#visible} is true and {@link DataTexturePeformanceModel#culled} is false.
     *
     * @type {Boolean}
     */
    get culled() {
        return this._culled;
    }

    /**
     * Sets if this DataTexturePeformanceModel is culled from view.
     *
     * The DataTexturePeformanceModel is only rendered when {@link DataTexturePeformanceModel#visible} is true and {@link DataTexturePeformanceModel#culled} is false.
     *
     * @type {Boolean}
     */
    set culled(culled) {
        culled = !!culled;
        this._culled = culled;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].culled = culled;
        }
        this.glRedraw();
    }

    /**
     * Gets if {@link Entity}s in this DataTexturePeformanceModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._clippable;
    }

    /**
     * Sets if {@link Entity}s in this DataTexturePeformanceModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    set clippable(clippable) {
        clippable = clippable !== false;
        this._clippable = clippable;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].clippable = clippable;
        }
        this.glRedraw();
    }

    /**
     * Gets if this DataTexturePeformanceModel is collidable.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._collidable;
    }

    /**
     * Sets if {@link Entity}s in this DataTexturePeformanceModel are collidable.
     *
     * @type {Boolean}
     */
    set collidable(collidable) {
        collidable = collidable !== false;
        this._collidable = collidable;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].collidable = collidable;
        }
    }

    /**
     * Gets if this DataTexturePeformanceModel is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    get pickable() {
        return (this.numPickableLayerPortions > 0);
    }

    /**
     * Sets if {@link Entity}s in this DataTexturePeformanceModel are pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    set pickable(pickable) {
        pickable = pickable !== false;
        this._pickable = pickable;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].pickable = pickable;
        }
    }

    /**
     * Gets the RGB colorize color for this DataTexturePeformanceModel.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    get colorize() {
        return this._colorize;
    }

    /**
     * Sets the RGB colorize color for this DataTexturePeformanceModel.
     *
     * Multiplies by rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    set colorize(colorize) {
        this._colorize = colorize;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].colorize = colorize;
        }
    }

    /**
     * Gets this DataTexturePeformanceModel's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        return this._opacity;
    }

    /**
     * Sets the opacity factor for this DataTexturePeformanceModel.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity) {
        this._opacity = opacity;
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            this._nodeList[i].opacity = opacity;
        }
    }

    /**
     * Gets if this DataTexturePeformanceModel casts a shadow.
     *
     * @type {Boolean}
     */
    get castsShadow() {
        return this._castsShadow;
    }

    /**
     * Sets if this DataTexturePeformanceModel casts a shadow.
     *
     * @type {Boolean}
     */
    set castsShadow(castsShadow) {
        castsShadow = (castsShadow !== false);
        if (castsShadow !== this._castsShadow) {
            this._castsShadow = castsShadow;
            this.glRedraw();
        }
    }

    /**
     * Sets if this DataTexturePeformanceModel can have shadow cast upon it.
     *
     * @type {Boolean}
     */
    get receivesShadow() {
        return this._receivesShadow;
    }

    /**
     * Sets if this DataTexturePeformanceModel can have shadow cast upon it.
     *
     * @type {Boolean}
     */
    set receivesShadow(receivesShadow) {
        receivesShadow = (receivesShadow !== false);
        if (receivesShadow !== this._receivesShadow) {
            this._receivesShadow = receivesShadow;
            this.glRedraw();
        }
    }

    /**
     * Gets if Scalable Ambient Obscurance (SAO) will apply to this DataTexturePeformanceModel.
     *
     * SAO is configured by the Scene's {@link SAO} component.
     *
     *  Only works when {@link SAO#enabled} is also true.
     *
     * @type {Boolean}
     */
    get saoEnabled() {
        return this._saoEnabled;
    }

    /**
     * Gets if physically-based rendering (PBR) is enabled for this DataTexturePeformanceModel.
     *
     * Only works when {@link Scene#pbrEnabled} is also true.
     *
     * @type {Boolean}
     */
    get pbrEnabled() {
        return this._pbrEnabled;
    }

    /**
     * Returns true to indicate that DataTexturePeformanceModel is implements {@link Drawable}.
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

    /**
     * Configures the appearance of xrayed {@link Entity}s within this DataTexturePeformanceModel.
     *
     * This is the {@link Scene#xrayMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get xrayMaterial() {
        return this.scene.xrayMaterial;
    }

    /**
     * Configures the appearance of highlighted {@link Entity}s within this DataTexturePeformanceModel.
     *
     * This is the {@link Scene#highlightMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get highlightMaterial() {
        return this.scene.highlightMaterial;
    }

    /**
     * Configures the appearance of selected {@link Entity}s within this DataTexturePeformanceModel.
     *
     * This is the {@link Scene#selectedMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get selectedMaterial() {
        return this.scene.selectedMaterial;
    }

    /**
     * Configures the appearance of edges of {@link Entity}s within this DataTexturePeformanceModel.
     *
     * This is the {@link Scene#edgeMaterial}.
     *
     * @type {EdgeMaterial}
     */
    get edgeMaterial() {
        return this.scene.edgeMaterial;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Drawable members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Called by private renderers in ./lib, returns the picking view matrix with which to
     * ray-pick on this DataTexturePeformanceModel.
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
     * Creates a reusable geometry within this DataTexturePeformanceModel.
     *
     * We can then supply the geometry ID to {@link DataTexturePeformanceModel#createMesh} when we want to create meshes that instance the geometry.
     *
     * If provide a  ````positionsDecodeMatrix```` , then ````createGeometry()```` will assume
     * that the ````positions```` and ````normals```` arrays are compressed. When compressed, ````positions```` will be
     * quantized and in World-space, and ````normals```` will be oct-encoded and in World-space.
     *
     * Note that ````positions````, ````normals```` and ````indices```` are all required together.
     *
     * @param {*} cfg Geometry properties.
     * @param {String|Number} cfg.id Mandatory ID for the geometry, to refer to with {@link DataTexturePeformanceModel#createMesh}.
     * @param {String} cfg.primitive The primitive type. Accepted values are 'points', 'lines', 'triangles', 'solid' and 'surface'.
     * @param {Number[]} cfg.positions Flat array of positions.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Only used with 'triangles' primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.colors] Flat array of RGBA vertex colors as float values in range ````[0..1]````. Ignored when ````geometryId```` is given, overidden by ````color```` and ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of RGBA vertex colors as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given, overrides ````colors```` and is overriden by ````color````.
     * @param {Number[]} [cfg.indices] Array of indices. Not required for `points` primitives.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Used only for Required for 'triangles' primitives. These are automatically generated internally if not supplied, using the ````edgeThreshold```` given to the ````DataTexturePeformanceModel```` constructor.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positions````.
     * @param {Number[]} [cfg.origin] Optional geometry origin, relative to {@link DataTexturePeformanceModel#origin}. When this is given, then every mesh created with {@link DataTexturePeformanceModel#createMesh} that uses this geometry will
     * be transformed relative to this origin.
     */
    createGeometry(cfg) {
        const geometryId = cfg.id;

        if (geometryId === undefined || geometryId === null) {
            this.error("Config missing: id");
            return;
        }
        if (geometryId in this._instancingGeometries) {
            this.error("Geometry already created: " + geometryId);
            return;
        }

        const primitive = cfg.primitive;

        if (primitive === undefined || primitive === null) {
            this.error("Config missing: primitive");
            return;
        }

        const cfgOrigin = cfg.origin || cfg.rtcCenter;
        const origin = (cfgOrigin) ? math.addVec3(this._origin, cfgOrigin, tempVec3a) : this._origin;

        switch (primitive) {
            case "triangles":
            case "solid":
            case "surface":

                this._instancingGeometries [cfg.id] = utils.apply(
                    {
                        origin,
                        layerIndex: 0,
                        solid: primitive !== "surface"
                    },
                    cfg
                );
                this._numTriangles += (cfg.indices ? Math.round(cfg.indices.length / 3) : 0);
                break;
            case "lines":
                throw "Not supported at the moment";
                break;
            case "points":
                throw "Not supported at the moment";
                break;
        }

        this.numGeometries++;
    }

    /**
     * Creates a mesh within this DataTexturePeformanceModel.
     *
     * A mesh can either share geometry with other meshes, or have its own unique geometry.
     *
     * To share a geometry with other meshes, provide the ID of a geometry created earlier
     * with {@link DataTexturePeformanceModel#createGeometry}.
     *
     * To create unique geometry for the mesh, provide geometry data arrays.
     *
     * Internally, DataTexturePeformanceModel will batch all unique mesh geometries into the same arrays, which improves
     * rendering performance.
     *
     * If you accompany the arrays with a  ````positionsDecodeMatrix```` , then ````createMesh()```` will assume
     * that the ````positions```` and ````normals```` arrays are compressed. When compressed, ````positions```` will be
     * quantized and in World-space, and ````normals```` will be oct-encoded and in World-space.
     *
     * If you accompany the arrays with an  ````origin````, then ````createMesh()```` will assume
     * that the ````positions```` are in relative-to-center (RTC) coordinates, with ````origin```` being the origin of their
     * RTC coordinate system.
     *
     * When providing either ````positionsDecodeMatrix```` or ````origin````, ````createMesh()```` will start a new
     * batch each time either of those two parameters change since the last call. Therefore, to combine arrays into the
     * minimum number of batches, it's best for performance to create your shared meshes in runs that have the same value
     * for ````positionsDecodeMatrix```` and ````origin````.
     *
     * Note that ````positions````, ````normals```` and ````indices```` are all required together.
     *
     * @param {object} cfg Object properties.
     * @param {String} cfg.id Mandatory ID for the new mesh. Must not clash with any existing components within the {@link Scene}.
     * @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link DataTexturePeformanceModel#createGeometry:method"}}createMesh(){{/crossLink}}. Overrides all other geometry parameters given to this method.
     * @param {String} [cfg.primitive="triangles"]  Geometry primitive type. Ignored when ````geometryId```` is given. Accepted values are 'points', 'lines' and 'triangles'.
     * @param {Number[]} [cfg.positions] Flat array of vertex positions. Ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.colors] Flat array of RGB vertex colors as float values in range ````[0..1]````. Ignored when ````geometryId```` is given, overriden by ````color```` and ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of RGB vertex colors as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given, overrides ````colors```` and is overriden by ````color````.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Only used with 'triangles' primitives. When no normals are given, the mesh will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positions````.
     * @param {Number[]} [cfg.origin] Optional geometry origin, relative to {@link DataTexturePeformanceModel#origin}. When this is given, then ````positions```` are assumed to be relative to this.
     * @param {Number[]} [cfg.indices] Array of triangle indices. Ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. If ````geometryId```` is not given, edge line indices are
     * automatically generated internally if not given, using the ````edgeThreshold```` given to the ````DataTexturePeformanceModel````
     * constructor. This parameter is ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.position=[0,0,0]] Local 3D position. of the mesh
     * @param {Number[]} [cfg.scale=[1,1,1]] Scale of the mesh.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Rotation of the mesh as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Mesh modelling transform matrix. Overrides the ````position````, ````scale```` and ````rotation```` parameters.
     * @param {Number[]} [cfg.color=[1,1,1]] RGB color in range ````[0..1, 0..`, 0..1]````. Overrides ````colors```` and ````colorsCompressed````.
     * @param {Number} [cfg.opacity=1] Opacity in range ````[0..1]````.
     */
    createMesh(cfg) {

        let id = cfg.id;
        if (id === undefined || id === null) {
            this.error("Config missing: id");
            return;
        }
        if (this._meshes[id]) {
            this.error("DataTexturePeformanceModel already has a Mesh with this ID: " + id + "");
            return;
        }

        const geometryId = cfg.geometryId;
        const instancing = (geometryId !== undefined);

        let geometryCfg = null;

        if (instancing) {
            geometryCfg = this._instancingGeometries[geometryId];
        } else {
            geometryCfg = cfg;
        }

        /**
         * This will be the prepared mesh geometry, with index rebucketting applied.
         */
        let preparedGeometryCfg = null;

        if (!instancing || !(geometryId in this._preparedInstancingGeometries))
        {
            let primitive = geometryCfg.primitive || "triangles";

            if (primitive !== "triangles" && primitive !== "solid" && primitive !== "surface") {
                this.error(`Unsupported value for 'primitive': '${primitive}' - supported values are 'triangles', 'solid' and 'surface'. Defaulting to 'triangles'.`);
                primitive = "triangles";
            }

            let positions = geometryCfg.positions;

            if (!positions) {
                this.error("Config missing: positions (no meshIds provided, so expecting geometry arrays instead)");
                return null;
            }

            let indices = geometryCfg.indices;
            let edgeIndices = geometryCfg.edgeIndices;

            if (!geometryCfg.indices && primitive === "triangles") {
                this.error("Config missing for triangles primitive: indices (no meshIds provided, so expecting geometry arrays instead)");
                return null;
            }

            if (!edgeIndices) {
                edgeIndices = buildEdgeIndices(positions, indices, null, this._edgeThreshold);
            }

            geometryCfg.edgeIndices = edgeIndices;

            preparedGeometryCfg = prepareMeshGeometry (geometryCfg);

            if (instancing) {
                this._preparedInstancingGeometries[geometryId] = preparedGeometryCfg;
            }
        } else {
            preparedGeometryCfg = this._preparedInstancingGeometries[geometryId];
        }
        
        let layer = this._currentDataTextureLayer;

        if (null !== layer && !layer.canCreatePortion(preparedGeometryCfg, instancing ? geometryId : null))
        {
            layer.finalize();
            delete this._currentDataTextureLayer;;
            layer = null;
        }

        if (!layer)
        {
            layer = new TrianglesDataTextureLayer(this, {
                layerIndex: 0, // This is set in #finalize()
                scratchMemory: this._scratchMemory,

                // chipmunk
                // positionsDecodeMatrix: cfg.positionsDecodeMatrix,  // Can be undefined

                // chipmunk: allow to have different origins per-mesh
                origin: cfg.origin,

                // chipmunk: TODO, encode as a property for each object in the per-object texture, and if needed adjust the vertices clockwise sense in the shader
                solid: true,
            });
            this._layerList.push(layer);
            this._currentDataTextureLayer = layer;
        }

        let portionId;

        const color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : [255, 255, 255];
        const opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;
        const metallic = (cfg.metallic !== undefined && cfg.metallic !== null) ? Math.floor(cfg.metallic * 255) : 0;
        const roughness = (cfg.roughness !== undefined && cfg.roughness !== null) ? Math.floor(cfg.roughness * 255) : 255;

        const mesh = new PerformanceMesh(this, id, color, opacity);

        const pickId = mesh.pickId;

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

            portionId = layer.createPortion(
                preparedGeometryCfg,
                {
                    geometryId: geometryId,
                    color: color,
                    metallic: metallic,
                    roughness: roughness,
                    opacity: opacity,
                    meshMatrix: meshMatrix,
                    worldMatrix: worldMatrix,
                    aabb: aabb,
                    pickColor: pickColor
                }
            );

            math.expandAABB3(this._aabb, aabb);

            this._numTriangles += preparedGeometryCfg.indices.length / 3;
            mesh.numTriangles = preparedGeometryCfg.indices.length / 3;

            mesh.origin = preparedGeometryCfg.origin;
        } else { // Batching
            let origin = null;

            if (!cfg.positionsDecodeMatrix) { // TODO: Assumes we never quantize double-precision coordinates
                const rtcCenter = math.vec3();
                const rtcPositions = [];
                const rtcNeeded = worldToRTCPositions(positions, rtcPositions, rtcCenter);
                if (rtcNeeded) {
                    positions = rtcPositions;
                    origin = math.addVec3(this._origin, rtcCenter, rtcCenter);
                }
            }

            const cfgOrigin = cfg.origin || cfg.rtcCenter;
            if (cfgOrigin) {
                if (!origin) {
                    origin = cfgOrigin;
                } else {
                    origin = math.addVec3(this._origin, cfgOrigin, tempVec3a);
                }
            } else {
                origin = this._origin;
            }

            // TODO: treat the possibility of different origins

            const worldMatrix = this._worldMatrixNonIdentity ? this._worldMatrix : null;
            let meshMatrix;

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

            let primitive = cfg.primitive || "triangles";

            switch (primitive) {

                case "triangles":
                case "solid":
                case "surface":                    
                    portionId = layer.createPortion(utils.apply (
                        {
                            origin: origin,
                            color: color,
                            metallic: metallic,
                            roughness: roughness,
                            colors: cfg.colors,
                            colorsCompressed: cfg.colorsCompressed,
                            opacity: opacity,
                            meshMatrix: meshMatrix,
                            worldMatrix: worldMatrix,
                            aabb: aabb,
                            pickColor: pickColor
                        },
                        preparedGeometryCfg
                    ));

                    const numTriangles = Math.round(preparedGeometryCfg.indices.length / 3);

                    this._numTriangles += numTriangles;

                    mesh.numTriangles = numTriangles;
                    break;
                case "lines":
                    throw "Not supported at the moment";
                    break;
                case "points":
                    throw "Not supported at the moment";
                    break;
            }

            math.expandAABB3(this._aabb, aabb);

            this.numGeometries++;

            mesh.origin = origin;
        }
        
        mesh.parent = null; // Will be set within PerformanceModelNode constructor
        mesh._layer = layer;
        mesh._portionId = portionId;
        mesh.aabb = aabb;

        this._meshes[id] = mesh;
    }

    /**
     * Creates an {@link Entity} within this DataTexturePeformanceModel, giving it one or more meshes previously created with {@link DataTexturePeformanceModel#createMesh}.
     *
     * A mesh can only belong to one {@link Entity}, so you'll get an error if you try to reuse a mesh among multiple {@link Entity}s.
     *
     * @param {Object} cfg Entity configuration.
     * @param {String} cfg.id Optional ID for the new Entity. Must not clash with any existing components within the {@link Scene}.
     * @param {String[]} cfg.meshIds IDs of one or more meshes created previously with {@link DataTexturePeformanceModel@createMesh}.

     * @param {Boolean} [cfg.isObject] Set ````true```` if the {@link Entity} represents an object, in which case it will be registered by {@link Entity#id} in {@link Scene#objects} and can also have a corresponding {@link MetaObject} with matching {@link MetaObject#id}, registered by that ID in {@link MetaScene#metaObjects}.
     * @param {Boolean} [cfg.visible=true] Indicates if the Entity is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the Entity is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the Entity is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the Entity is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the Entity is initially included in boundary calculations.
     * @param {Boolean} [cfg.castsShadow=true] Indicates if the Entity initially casts shadows.
     * @param {Boolean} [cfg.receivesShadow=true]  Indicates if the Entity initially receives shadows.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the Entity is initially xrayed. XRayed appearance is configured by {@link DataTexturePeformanceModel#xrayMaterial}.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the Entity is initially highlighted. Highlighted appearance is configured by {@link DataTexturePeformanceModel#highlightMaterial}.
     * @param {Boolean} [cfg.selected=false] Indicates if the Entity is initially selected. Selected appearance is configured by {@link DataTexturePeformanceModel#selectedMaterial}.
     * @param {Boolean} [cfg.edges=false] Indicates if the Entity's edges are initially emphasized. Edges appearance is configured by {@link DataTexturePeformanceModel#edgeMaterial}.
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
        let meshes = [];
        for (let i = 0, len = meshIds.length; i < len; i++) {
            const meshId = meshIds[i];
            const mesh = this._meshes[meshId];
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
        let flags = 0;
        if (this._visible && cfg.visible !== false) {
            flags = flags | ENTITY_FLAGS.VISIBLE;
        }
        if (this._pickable && cfg.pickable !== false) {
            flags = flags | ENTITY_FLAGS.PICKABLE;
        }
        if (this._culled && cfg.culled !== false) {
            flags = flags | ENTITY_FLAGS.CULLED;
        }
        if (this._clippable && cfg.clippable !== false) {
            flags = flags | ENTITY_FLAGS.CLIPPABLE;
        }
        if (this._collidable && cfg.collidable !== false) {
            flags = flags | ENTITY_FLAGS.COLLIDABLE;
        }
        if (this._edges && cfg.edges !== false) {
            flags = flags | ENTITY_FLAGS.EDGES;
        }
        if (this._xrayed && cfg.xrayed !== false) {
            flags = flags | ENTITY_FLAGS.XRAYED;
        }
        if (this._highlighted && cfg.highlighted !== false) {
            flags = flags | ENTITY_FLAGS.HIGHLIGHTED;
        }
        if (this._selected && cfg.selected !== false) {
            flags = flags | ENTITY_FLAGS.SELECTED;
        }

        // Create PerformanceModelNode AABB
        let aabb;
        if (meshes.length === 1) {
            aabb = meshes[0].aabb;
        } else {
            aabb = math.collapseAABB3();
            for (let i = 0, len = meshes.length; i < len; i++) {
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
     * Finalizes this DataTexturePeformanceModel.
     *
     * Immediately creates the DataTexturePeformanceModel's {@link Entity}s within the {@link Scene}.
     *
     * Once finalized, you can't add anything more to this DataTexturePeformanceModel.
     */
    finalize() {

        if (this.destroyed) {
            return;
        }

        if (this._currentDataTextureLayer) {
            this._currentDataTextureLayer.finalize ();
        }

        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            const node = this._nodeList[i];
            node._finalize();
        }

        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            const node = this._nodeList[i];
            node._finalize2();
        }


        // Sort layers to reduce WebGL shader switching when rendering them

        this._layerList.sort((a, b) => {
            if (a.sortId < b.sortId) {
                return -1;
            }
            if (a.sortId > b.sortId) {
                return 1;
            }
            return 0;
        });

        for (let i = 0, len = this._layerList.length; i < len; i++) {
            const layer = this._layerList[i];
            layer.layerIndex = i;
        }

        this.glRedraw();

        this.scene._aabbDirty = true;

        this._instancingGeometries = {};
        this._preparedInstancingGeometries = {};

        if (this._targetLodFps) {
            this.lodCullingManager = new LodCullingManager (
                this,
                [ 2000, 600, 150, 80, 20 ],
                this._targetLodFps
            );
        }
    }

    _rebuildAABB() {
        math.collapseAABB3(this._aabb);
        for (let i = 0, len = this._nodeList.length; i < len; i++) {
            const node = this._nodeList[i];
            math.expandAABB3(this._aabb, node.aabb);
        }
        this._aabbDirty = false;
    }

    /** @private */
    stateSortCompare(drawable1, drawable2) {
    }

    /** @private */
    rebuildRenderFlags() {
        this.renderFlags.reset();
        this._updateRenderFlagsVisibleLayers();
        if (this.renderFlags.numLayers > 0 && this.renderFlags.numVisibleLayers === 0) {
            this.renderFlags.culled = true;
            return;
        }
        this._updateRenderFlags();
    }

    /**
     * @private
     */
    _updateRenderFlagsVisibleLayers() {
        const renderFlags = this.renderFlags;
        renderFlags.numLayers = this._layerList.length;
        renderFlags.numVisibleLayers = 0;
        for (let layerIndex = 0, len = this._layerList.length; layerIndex < len; layerIndex++) {
            const layer = this._layerList[layerIndex];
            const layerVisible = this._getActiveSectionPlanesForLayer(layer);
            if (layerVisible) {
                renderFlags.visibleLayers[renderFlags.numVisibleLayers++] = layerIndex;
            }
        }
    }

    /**
     * This will start a "set-flags transaction" in all Layers of this Model.
     */
    beginDeferredFlagsInAllLayers ()
    {
        for (let i = 0, len = this._layerList.length; i < len; i++)
        {
            const layer = this._layerList[i];

            layer.beginDeferredFlags ();
        }
    }
    
    /**
     * This will commit any previously started "set-flags transaction" in all
     * Layers of this Model.
     */
    commitDeferredFlagsInAllLayers ()
    {
        for (let i = 0, len = this._layerList.length; i < len; i++)
        {
            const layer = this._layerList[i];

            layer.commitDeferredFlags ();
        }
    }

    /** @private */
    _getActiveSectionPlanesForLayer(layer) {

        const renderFlags = this.renderFlags;
        const sectionPlanes = this.scene._sectionPlanesState.sectionPlanes;
        const numSectionPlanes = sectionPlanes.length;
        const baseIndex = layer.layerIndex * numSectionPlanes;

        if (numSectionPlanes > 0) {
            for (let i = 0; i < numSectionPlanes; i++) {

                const sectionPlane = sectionPlanes[i];

                if (!sectionPlane.active) {
                    renderFlags.sectionPlanesActivePerLayer[baseIndex + i] = false;

                } else {
                    renderFlags.sectionPlanesActivePerLayer[baseIndex + i] = true;
                    renderFlags.sectioned = true;
                }
            }
        }

        return true;
    }

    /** @private */
    _updateRenderFlags() {

        if (this.numVisibleLayerPortions === 0) {
            return;
        }

        if (this.numCulledLayerPortions === this.numPortions) {
            return;
        }

        const renderFlags = this.renderFlags;

        renderFlags.colorOpaque = (this.numTransparentLayerPortions < this.numPortions);

        if (this.numTransparentLayerPortions > 0) {
            renderFlags.colorTransparent = true;
        }

        if (this.numXRayedLayerPortions > 0) {
            const xrayMaterial = this.scene.xrayMaterial._state;
            if (xrayMaterial.fill) {
                if (xrayMaterial.fillAlpha < 1.0) {
                    renderFlags.xrayedSilhouetteTransparent = true;
                } else {
                    renderFlags.xrayedSilhouetteOpaque = true;
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
                renderFlags.edgesOpaque = (this.numTransparentLayerPortions < this.numPortions);
                if (this.numTransparentLayerPortions > 0) {
                    renderFlags.edgesTransparent = true;
                }
            }
        }

        if (this.numSelectedLayerPortions > 0) {
            const selectedMaterial = this.scene.selectedMaterial._state;
            if (selectedMaterial.fill) {
                if (selectedMaterial.fillAlpha < 1.0) {
                    renderFlags.selectedSilhouetteTransparent = true;
                } else {
                    renderFlags.selectedSilhouetteOpaque = true;
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
                    renderFlags.highlightedSilhouetteTransparent = true;
                } else {
                    renderFlags.highlightedSilhouetteOpaque = true;
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

    // -------------- RENDERING ---------------------------------------------------------------------------------------

    /** @private */
    drawColorOpaque(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawColorOpaque(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawColorTransparent(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawColorTransparent(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawDepth(frameCtx) { // Dedicated to SAO because it skips transparent objects
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawDepth(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawNormals(frameCtx) { // Dedicated to SAO because it skips transparent objects
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawNormals(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawSilhouetteXRayed(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawSilhouetteXRayed(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawSilhouetteHighlighted(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawSilhouetteHighlighted(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawSilhouetteSelected(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawSilhouetteSelected(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawEdgesColorOpaque(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawEdgesColorOpaque(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawEdgesColorTransparent(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawEdgesColorTransparent(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawEdgesXRayed(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawEdgesXRayed(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawEdgesHighlighted(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawEdgesHighlighted(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawEdgesSelected(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawEdgesSelected(renderFlags, frameCtx);
        }
    }

    /**
     * @private
     */
    drawOcclusion(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawOcclusion(renderFlags, frameCtx);
        }
    }

    /**
     * @private
     */
    drawShadow(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawShadow(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawPickMesh(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawPickMesh(renderFlags, frameCtx);
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
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawPickDepths(renderFlags, frameCtx);
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
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].drawPickNormals(renderFlags, frameCtx);
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Component members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Destroys this DataTexturePeformanceModel.
     */
    destroy() {
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
        putScratchMemory();
        super.destroy();
    }
}

export {DataTexturePeformanceModel};