import {Component} from "../../Component.js";
import {math} from "../../math/math.js";
import {DataTextureSceneModelMesh} from './lib/DataTextureSceneModelMesh.js';
import {DataTextureSceneModelNode} from './lib/DataTextureSceneModelNode.js';
import {TrianglesDataTextureLayer} from './lib/layers/trianglesDataTexture/TrianglesDataTextureLayer.js';

import {ENTITY_FLAGS} from './lib/ENTITY_FLAGS.js';
import {utils} from "../../utils.js";
import {RenderFlags} from "../../webgl/RenderFlags.js";

import {buildEdgeIndices} from "../../math/buildEdgeIndices";
import {rebucketPositions} from "./lib/layers/trianglesDataTexture/rebucketPositions";
import {uniquifyPositions} from "./lib/layers/trianglesDataTexture/calculateUniquePositions";
import {quantizePositions} from "./lib/compression";
import {VFCManager} from "../../vfc/VFCManager";

const tempVec3a = math.vec3();
const tempMat4 = math.mat4();

const defaultScale = math.vec3([1, 1, 1]);
const defaultPosition = math.vec3([0, 0, 0]);
const defaultRotation = math.vec3([0, 0, 0]);
const defaultQuaternion = math.identityQuaternion();

/**
 * @desc A high-performance data-texture-based model representation for efficient rendering and low memory usage.
 *
 * Data textures offer a highly efficient method for storing model representations on the GPU. They are much more efficient than the standard vertex buffer object (VBO)
 * technique used in almost every other graphics library.
 *
 * By using data textures to store geometry and materials, a xeokit shader can randomly access data from anywhere within the texture. In contrast, with VBOs, shaders
 * can only access the primitive they are currently rendering. This allows shaders to fetch contextual information about the primitive being rendered, enabling implementation of many useful algorithms on the GPU, such as LoD, visibility culling, and more.
 *
 * Data textures also allow us to use a lot of "pointer indirection" within the textures, combining and reusing duplicate geometry elements and materials. This dramatically
 * minimizes the GPU memory footprint with large models.
 *
 * # Examples
 *
 * * [DataTextureSceneModel using geometry batching](/examples/#sceneRepresentation_DataTextureSceneModel_batching)
 * * [DataTextureSceneModel using geometry batching and RTC coordinates](/examples/#sceneRepresentation_DataTextureSceneModel_batching_origin)
 * * [DataTextureSceneModel using geometry instancing](/examples/#sceneRepresentation_DataTextureSceneModel_instancing)
 * * [DataTextureSceneModel using geometry instancing and RTC coordinates](/examples/#sceneRepresentation_DataTextureSceneModel_instancing_origin)
 *
 * <br>
 *
 * It should be noted that while the terms "batching" and "instancing" are used in the DataTextureSceneModel API, their usage is primarily superficial. They are
 * employed to ensure the (mostly) seamless implementation of the {@link SceneModel} interface, which is also implemented by {@link VBOSceneModel}. However, internally, the
 * DataTextureSceneModel adopts its own pointer-based reuse strategy to handle both geometry modes, as previously mentioned.
 *
 * # Overview
 *
 * While xeokit's standard [scene graph](https://github.com/xeokit/xeokit-sdk/wiki/Scene-Graphs) is great for gizmos and medium-sized models, it doesn't scale up to millions of objects in terms of memory and rendering efficiency.
 *
 * For huge models, we have the ````DataTextureSceneModel```` representation, which is optimized to pack large amounts of geometry into memory and render it efficiently using WebGL.
 *
 * ````DataTextureSceneModel```` is the default model representation loaded by  (at least) {@link GLTFLoaderPlugin}, {@link XKTLoaderPlugin} and  {@link WebIFCLoaderPlugin}.
 *
 * In this tutorial you'll learn how to use ````DataTextureSceneModel```` to create high-detail content programmatically. Ordinarily you'd be learning about ````DataTextureSceneModel```` if you were writing your own model loader plugins.
 *
 * # Contents
 *
 * - [DataTextureSceneModel](#DataTextureSceneModel)
 * - [GPU-Resident Geometry](#gpu-resident-geometry)
 * - [Picking](#picking)
 * - [Example 1: Geometry Instancing](#example-1--geometry-instancing)
 * - [Finalizing a DataTextureSceneModel](#finalizing-a-DataTextureSceneModel)
 * - [Finding Entities](#finding-entities)
 * - [Example 2: Geometry Batching](#example-2--geometry-batching)
 * - [Classifying with Metadata](#classifying-with-metadata)
 * - [Querying Metadata](#querying-metadata)
 * - [Metadata Structure](#metadata-structure)
 * - [RTC Coordinates](#rtc-coordinates-for-double-precision)
 *   - [Example 3: RTC Coordinates with Geometry Instancing](#example-2--rtc-coordinates-with-geometry-instancing)
 *   - [Example 4: RTC Coordinates with Geometry Batching](#example-2--rtc-coordinates-with-geometry-batching)
 *
 * ## DataTextureSceneModel
 *
 * ````DataTextureSceneModel```` uses two rendering techniques internally:
 *
 * 1. ***Geometry batching*** for unique geometries, combining those into a single WebGL geometry buffer, to render in one draw call, and
 * 2. ***geometry instancing*** for geometries that are shared by multiple meshes, rendering all instances of each shared geometry in one draw call.
 *
 * <br>
 * These techniques come with certain limitations:
 *
 * * Non-realistic rendering - while scene graphs can use xeokit's full set of material workflows, ````DataTextureSceneModel```` uses simple Lambertian shading without textures.
 * * Static transforms - transforms within a ````DataTextureSceneModel```` are static and cannot be dynamically translated, rotated and scaled the way {@link Node}s and {@link Mesh}es in scene graphs can.
 * * Immutable model representation - while scene graph {@link Node}s and
 * {@link Mesh}es can be dynamically plugged together, ````DataTextureSceneModel```` is immutable,
 * since it packs its geometries into textures.
 *
 * ````DataTextureSceneModel````'s API allows us to exploit batching and instancing, while exposing its elements as
 * abstract {@link Entity} types.
 *
 * {@link Entity} is the abstract base class for
 * the various xeokit components that represent models, objects, or anonymous visible elements. An Entity has a unique ID and can be
 * individually shown, hidden, selected, highlighted, ghosted, culled, picked and clipped, and has its own World-space boundary.
 *
 * * A ````DataTextureSceneModel```` is an {@link Entity} that represents a model.
 * * A ````DataTextureSceneModel```` represents each of its objects with an {@link Entity}.
 * * Each {@link Entity} has one or more meshes that define its shape.
 * * Each mesh has either its own unique geometry, or shares a geometry with other meshes.
 *
 * ## GPU-Resident Geometry
 *
 * For a low memory footprint, ````DataTextureSceneModel```` stores its geometries in GPU memory only, compressed (quantized) as integers. Unfortunately, GPU-resident geometry is
 * not readable by JavaScript.
 *
 *
 * ## Example 1: Geometry Instancing
 *
 * In the example below, we'll use a ````DataTextureSceneModel````
 * to build a simple table model using geometry instancing.
 *
 * We'll start by adding a reusable box-shaped geometry to our ````DataTextureSceneModel````.
 *
 * Then, for each object in our model we'll add an {@link Entity}
 * that has a mesh that instances our box geometry, transforming and coloring the instance.
 *
 * [![](http://xeokit.io/img/docs/sceneGraph.png)](/examples/#sceneRepresentation_DataTextureSceneModel_instancing)
 *
 * [[Run this example](/examples/#sceneRepresentation_DataTextureSceneModel_instancing)]
 *
 * ````javascript
 * import {Viewer, DataTextureSceneModel} from "xeokit-sdk.es.js";
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
 * // Build a DataTextureSceneModel representing a table
 * // with four legs, using geometry instancing
 *
 * const dataTextureSceneModel = new DataTextureSceneModel(viewer.scene, {
 *     id: "table",
 *     isModel: true, // <--- Registers DataTextureSceneModel in viewer.scene.models
 *     position: [0, 0, 0],
 *     scale: [1, 1, 1],
 *     rotation: [0, 0, 0]
 * });
 *
 * // Create a reusable geometry within the DataTextureSceneModel
 * // We'll instance this geometry by five meshes
 *
 * dataTextureSceneModel.createGeometry({
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
 * dataTextureSceneModel.createMesh({
 *     id: "redLegMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3],
 *     origin: cfg.origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     id: "redLeg",
 *     meshIds: ["redLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Green table leg
 *
 * dataTextureSceneModel.createMesh({
 *     id: "greenLegMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3],
 *     origin: cfg.origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     id: "greenLeg",
 *     meshIds: ["greenLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Blue table leg
 *
 * dataTextureSceneModel.createMesh({
 *     id: "blueLegMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0],
 *     origin: cfg.origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     id: "blueLeg",
 *     meshIds: ["blueLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Yellow table leg
 *
 * dataTextureSceneModel.createMesh({
 *      id: "yellowLegMesh",
 *      geometryId: "myBoxGeometry",
 *      position: [-4, -6, 4],
 *      scale: [1, 3, 1],
 *      rotation: [0, 0, 0],
 *      color: [1.0, 1.0, 0.0],
 *     origin: cfg.origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     id: "yellowLeg",
 *     meshIds: ["yellowLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Purple table top
 *
 * dataTextureSceneModel.createMesh({
 *     id: "purpleTableTopMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0],
 *     origin: cfg.origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     id: "purpleTableTop",
 *     meshIds: ["purpleTableTopMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *  ````
 *
 * ## Finalizing a DataTextureSceneModel
 *
 * Before we can view and interact with our ````DataTextureSceneModel````, we need to **finalize** it. Internally, this causes the ````DataTextureSceneModel```` to
 * build the data textures that support our geometries and materials.
 *
 * Once finalized, we can't add anything more to our ````DataTextureSceneModel````.
 *
 * ```` javascript
 * dataTextureSceneModel.finalize();
 * ````
 *
 * ## Finding Entities
 *
 * As mentioned earlier, {@link Entity} is
 * the abstract base class for components that represent models, objects, or just
 * anonymous visible elements.
 *
 * Since we created configured our ````DataTextureSceneModel```` with ````isModel: true````,
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
 * Let's once more use a ````DataTextureSceneModel````
 * to build the simple table model, this time using geometry batching.
 *
 *  [![](http://xeokit.io/img/docs/sceneGraph.png)](/examples/#sceneRepresentation_DataTextureSceneModel_batching)
 *
 * * [[Run this example](/examples/#sceneRepresentation_DataTextureSceneModel_batching)]
 *
 * ````javascript
 * import {Viewer, DataTextureSceneModel} from "xeokit-sdk.es.js";
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
 * // Create a DataTextureSceneModel representing a table with four legs, using geometry batching
 * const dataTextureSceneModel = new DataTextureSceneModel(viewer.scene, {
 *     id: "table",
 *     isModel: true,  // <--- Registers DataTextureSceneModel in viewer.scene.models
 *     position: [0, 0, 0],
 *     scale: [1, 1, 1],
 *     rotation: [0, 0, 0]
 * });
 *
 * // Red table leg
 *
 * dataTextureSceneModel.createMesh({
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
 *     color: [1, 0.3, 0.3],
 *     origin: cfg.origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     id: "redLeg",
 *     meshIds: ["redLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Green table leg
 *
 * dataTextureSceneModel.createMesh({
 *     id: "greenLegMesh",
 *     primitive: "triangles",
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3],
 *     origin: cfg.origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     id: "greenLeg",
 *     meshIds: ["greenLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Blue table leg
 *
 * dataTextureSceneModel.createMesh({
 *     id: "blueLegMesh",
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0],
 *     origin: cfg.origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     id: "blueLeg",
 *     meshIds: ["blueLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Yellow table leg object
 *
 * dataTextureSceneModel.createMesh({
 *     id: "yellowLegMesh",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [-4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 1.0, 0.0],
 *     origin: cfg.origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     id: "yellowLeg",
 *     meshIds: ["yellowLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Purple table top
 *
 * dataTextureSceneModel.createMesh({
 *     id: "purpleTableTopMesh",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0],
 *     origin: cfg.origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     id: "purpleTableTop",
 *     meshIds: ["purpleTableTopMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Finalize the DataTextureSceneModel.
 *
 * dataTextureSceneModel.finalize();
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
 * In the previous examples, we used ````DataTextureSceneModel```` to build
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
 * components from the metadata, such as the tree view demonstrated in [this demo](/examples/#BIMOffline_glTF_OTCConferenceCenter).
 *
 * This hierarchy allows us to express the hierarchical structure of a model while representing it in
 * various ways in the 3D scene (such as with ````DataTextureSceneModel````, which
 * has a non-hierarchical scene representation).
 *
 * Note also that a {@link MetaObject} does not need to have a corresponding
 * {@link Entity} and vice-versa.
 *
 * # RTC Coordinates for Double Precision
 *
 * ````DataTextureSceneModel```` can emulate 64-bit precision on GPUs using relative-to-center (RTC) coordinates.
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
 * To use RTC with ````DataTextureSceneModel```` geometry instancing, we specify an RTC center for the geometry via its ````origin```` parameter. Then ````DataTextureSceneModel```` assumes that all meshes that instance that geometry are within the same RTC coordinate system, ie. the meshes ````position```` and ````rotation```` properties are assumed to be relative to the geometry's ````origin````.
 *
 * For simplicity, our example's meshes all instance the same geometry. Therefore, our example model has only one RTC center.
 *
 * Note that the axis-aligned World-space boundary (AABB) of our model is ````[ -6, -9, -6, 1000000006, -2.5, 1000000006]````.
 *
 * [![](http://xeokit.io/img/docs/sceneGraph.png)](/examples/#sceneRepresentation_DataTextureSceneModel_batching)
 *
 * * [[Run this example](/examples/#sceneRepresentation_DataTextureSceneModel_instancing_origin)]
 *
 * ````javascript
 * const origin = [100000000, 0, 100000000];
 *
 * dataTextureSceneModel.createGeometry({
 *     id: "box",
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 * });
 *
 * dataTextureSceneModel.createMesh({
 *     id: "leg1",
 *     geometryId: "box",
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3],
 *     origin: origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg1"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
 *     id: "leg2",
 *     geometryId: "box",
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3],
 *     origin: origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg2"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
 *     id: "leg3",
 *     geometryId: "box",
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0],
 *     origin: origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg3"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
 *     id: "leg4",
 *     geometryId: "box",
 *     position: [-4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 1.0, 0.0],
 *     origin: origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg4"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
 *     id: "top",
 *     geometryId: "box",
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0],
 *     origin: origin
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["top"],
 *     isObject: true
 * });
 * ````
 *
 * ## RTC Coordinates with Geometry Batching
 *
 * To use RTC with ````DataTextureSceneModel```` geometry batching, we specify an RTC center (````origin````) for each mesh. For performance, we try to have as many meshes share the same value for ````origin```` as possible. Each mesh's ````positions````, ````position```` and ````rotation```` properties are assumed to be relative to ````origin````.
 *
 * For simplicity, the meshes in our example all share the same RTC center.
 *
 * The axis-aligned World-space boundary (AABB) of our model is ````[ -6, -9, -6, 1000000006, -2.5, 1000000006]````.
 *
 * [![](http://xeokit.io/img/docs/sceneGraph.png)](/examples/#sceneRepresentation_DataTextureSceneModel_batching)
 *
 * * [[Run this example](/examples/#sceneRepresentation_DataTextureSceneModel_batching_origin)]
 *
 * ````javascript
 * const origin = [100000000, 0, 100000000];
 *
 * dataTextureSceneModel.createMesh({
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
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg1"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
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
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg2"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
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
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg3"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
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
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg4"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
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
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["top"],
 *     isObject: true
 * });
 * ````
 *
 * ## Positioning at World-space coordinates
 *
 * To position a DataTextureSceneModel at given double-precision World coordinates, we can
 * configure the ````origin```` of the DataTextureSceneModel itself. The ````origin```` is a double-precision
 * 3D World-space position at which the DataTextureSceneModel will be located.
 *
 * Note that ````position```` is a single-precision offset relative to ````origin````.
 *
 * ````javascript
 * const origin = [100000000, 0, 100000000];
 *
 * const dataTextureSceneModel = new DataTextureSceneModel(viewer.scene, {
 *     id: "table",
 *     isModel: true,
 *     origin: origin, // Everything in this DataTextureSceneModel is relative to this RTC center
 *     position: [0, 0, 0],
 *     scale: [1, 1, 1],
 *     rotation: [0, 0, 0]
 * });
 *
 * dataTextureSceneModel.createGeometry({
 *     id: "box",
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 * });
 *
 * dataTextureSceneModel.createMesh({
 *     id: "leg1",
 *     geometryId: "box",
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3]
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg1"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
 *     id: "leg2",
 *     geometryId: "box",
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3]
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg2"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
 *     id: "leg3",
 *     geometryId: "box",
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0]
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg3"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
 *     id: "leg4",
 *     geometryId: "box",
 *     position: [-4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 1.0, 0.0]
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["leg4"],
 *     isObject: true
 * });
 *
 * dataTextureSceneModel.createMesh({
 *     id: "top",
 *     geometryId: "box",
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0]
 * });
 *
 * dataTextureSceneModel.createEntity({
 *     meshIds: ["top"],
 *     isObject: true
 * });
 * ````
 *
 * @implements {Drawable}
 * @implements {Entity}
 * @implements {SceneModel}
 */
export class DataTextureSceneModel extends Component {

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     * @param {Boolean} [cfg.isModel] Specify ````true```` if this DataTextureSceneModel represents a model, in which case the DataTextureSceneModel will be registered by {@link DataTextureSceneModel#id} in {@link Scene#models} and may also have a corresponding {@link MetaModel} with matching {@link MetaModel#id}, registered by that ID in {@link MetaScene#metaModels}.
     * @param {Number[]} [cfg.origin=[0,0,0]] World-space double-precision 3D origin.
     * @param {Number[]} [cfg.position=[0,0,0]] Local, single-precision 3D position, relative to the origin parameter.
     * @param {Number[]} [cfg.scale=[1,1,1]] Local scale.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] Local modelling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [cfg.visible=true] Indicates if the DataTextureSceneModel is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the DataTextureSceneModel is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the DataTextureSceneModel is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the DataTextureSceneModel is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the DataTextureSceneModel is initially included in boundary calculations.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the DataTextureSceneModel is initially xrayed.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the DataTextureSceneModel is initially highlighted.
     * @param {Boolean} [cfg.selected=false] Indicates if the DataTextureSceneModel is initially selected.
     * @param {Boolean} [cfg.edges=false] Indicates if the DataTextureSceneModel's edges are initially emphasized.
     * @param {Number[]} [cfg.colorize=[1.0,1.0,1.0]] DataTextureSceneModel's initial RGB colorize color, multiplies by the rendered fragment colors.
     * @param {Number} [cfg.opacity=1.0] DataTextureSceneModel's initial opacity factor, multiplies by the rendered fragment alpha.
     * @param {Number} [cfg.backfaces=false] When we set this ````true````, then we force rendering of backfaces for this DataTextureSceneModel. When
     * we leave this ````false````, then we allow the Viewer to decide when to render backfaces. In that case, the
     * Viewer will hide backfaces on watertight meshes, show backfaces on open meshes, and always show backfaces on meshes when we slice them open with {@link SectionPlane}s.
     * @param {Boolean} [cfg.saoEnabled=true] Indicates if Scalable Ambient Obscurance (SAO) will apply to this DataTextureSceneModel. SAO is configured by the Scene's {@link SAO} component.
     * @param {Number} [cfg.edgeThreshold=10] When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {Boolean} [cfg.enableViewFrustumCulling=false] When true, will enable view frustum culling for the objects within this DataTextureSceneModel.
     * @param {Boolean} [cfg.disableVertexWelding] Disable vertex welding when loading geometry into the GPU. Default is ```false```.
     * @param {Boolean} [cfg.disableIndexRebucketing] Disable index rebucketing when loading geometry into the GPU. Default is ```false```.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        if (!(this.scene.canvas.gl instanceof WebGL2RenderingContext)) {
            throw "DataTextureSceneModel requires webgl2";
        }

        /**
         * Enable welding vertices when loading geometry into the ```TrianglesDataTextureLayer```.
         *
         * The welding is applied per-geometry.
         *
         * @type {Boolean}
         */
        this._enableVertexWelding = !cfg.disableVertexWelding;

        /**
         * Enable demotion of index bitness then loading geometry into the ```TrianglesDataTextureLayer```.
         *
         * The rebucketing is applied per-geometry.
         *
         * @type {Boolean}
         */
        this._enableIndexRebucketing = !cfg.disableIndexRebucketing;

        if (this.scene.vfc.enabled) {
            this._vfcManager = new VFCManager(this.scene, this);
        }

        this._aabb = math.collapseAABB3();
        this._aabbDirty = false;
        this._currentLayers = {};
        this._layers = {};

        /**
         * @type {Array<TrianglesDataTextureLayer>}
         */
        this._layerList = [];

        /**
         * @type {Array<DataTextureSceneModelNode>}
         */
        this._nodeList = [];

        this._instancingGeometries = {};

        this._preparedInstancingGeometries = {};

        /**
         * @type {Map<string, DataTextureSceneModelMesh>}
         */
        this._meshes = {};

        /**
         * @type {Map<string, DataTextureSceneModelNode>}
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

        this._pbrEnabled = false;

        this._isModel = cfg.isModel;
        if (this._isModel) {
            this.scene._registerModel(this);
        }

        this._onCameraViewMatrix = this.scene.camera.on("matrix", () => {
            this._viewMatrixDirty = true;
        });
    }

    //------------------------------------------------------------------------------------------------------------------
    // DataTextureSceneModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that this Component is a DataTextureSceneModel.
     * @type {Boolean}
     */
    get isPerformanceModel() {
        return true;
    }

    /**
     * Returns the {@link Entity}s in this DataTextureSceneModel.
     * @returns {*|{}}
     */
    get objects() {
        return this._nodes;
    }

    /**
     * Gets the 3D World-space origin for this DataTextureSceneModel.
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
     * Gets the DataTextureSceneModel's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get position() {
        return this._position;
    }

    /**
     * Gets the DataTextureSceneModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
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
     * Gets the DataTextureSceneModel's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     */
    get scale() {
        return this._scale;
    }

    /**
     * Gets the DataTextureSceneModel's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     */
    get matrix() {
        return this._worldMatrix;
    }

    /**
     * Gets the DataTextureSceneModel's World matrix.
     *
     * @property worldMatrix
     * @type {Number[]}
     */
    get worldMatrix() {
        return this._worldMatrix;
    }

    /**
     * Gets the DataTextureSceneModel's World normal matrix.
     *
     * @type {Number[]}
     */
    get worldNormalMatrix() {
        return this._worldNormalMatrix;
    }

    /**
     * Called by private renderers in ./lib, returns the view matrix with which to
     * render this DataTextureSceneModel. The view matrix is the concatenation of the
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
     * Called by private renderers in ./lib, returns the view normal matrix with which to render this DataTextureSceneModel.
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
     * Sets if backfaces are rendered for this DataTextureSceneModel.
     *
     * Default is ````false````.
     *
     * @type {Boolean}
     */
    get backfaces() {
        return this._backfaces;
    }

    /**
     * Sets if backfaces are rendered for this DataTextureSceneModel.
     *
     * Default is ````false````.
     *
     * When we set this ````true````, then backfaces are always rendered for this DataTextureSceneModel.
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
     * Gets the list of {@link Entity}s within this DataTextureSceneModel.
     *
     * @returns {Entity[]}
     */
    get entityList() {
        return this._nodeList;
    }

    /**
     * Returns true to indicate that DataTextureSceneModel is an {@link Entity}.
     * @type {Boolean}
     */
    get isEntity() {
        return true;
    }

    /**
     * Returns ````true```` if this DataTextureSceneModel represents a model.
     *
     * When ````true```` the DataTextureSceneModel will be registered by {@link DataTextureSceneModel#id} in
     * {@link Scene#models} and may also have a {@link MetaObject} with matching {@link MetaObject#id}.
     *
     * @type {Boolean}
     */
    get isModel() {
        return this._isModel;
    }

    //------------------------------------------------------------------------------------------------------------------
    // DataTextureSceneModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns ````false```` to indicate that DataTextureSceneModel never represents an object.
     *
     * @type {Boolean}
     */
    get isObject() {
        return false;
    }

    /**
     * Gets the DataTextureSceneModel's World-space 3D axis-aligned bounding box.
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
     * The approximate number of triangle primitives in this DataTextureSceneModel.
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
     * The approximate number of line primitives in this DataTextureSceneModel.
     *
     * @type {Number}
     */
    get numLines() {
        return 0;
    }

    /**
     * The approximate number of point primitives in this DataTextureSceneModel.
     *
     * @type {Number}
     */
    get numPoints() {
        return 0;
    }

    /**
     * Gets if any {@link Entity}s in this DataTextureSceneModel are visible.
     *
     * The DataTextureSceneModel is only rendered when {@link DataTextureSceneModel#visible} is ````true```` and {@link DataTextureSceneModel#culled} is ````false````.
     *
     * @type {Boolean}
     */
    get visible() {
        return (this.numVisibleLayerPortions > 0);
    }

    /**
     * Sets if this DataTextureSceneModel is visible.
     *
     * The DataTextureSceneModel is only rendered when {@link DataTextureSceneModel#visible} is ````true```` and {@link DataTextureSceneModel#culled} is ````false````.
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
     * Gets if any {@link Entity}s in this DataTextureSceneModel are xrayed.
     *
     * @type {Boolean}
     */
    get xrayed() {
        return (this.numXRayedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this DataTextureSceneModel are xrayed.
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
     * Gets if any {@link Entity}s in this DataTextureSceneModel are highlighted.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return (this.numHighlightedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this DataTextureSceneModel are highlighted.
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
     * Gets if any {@link Entity}s in this DataTextureSceneModel are selected.
     *
     * @type {Boolean}
     */
    get selected() {
        return (this.numSelectedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this DataTextureSceneModel are selected.
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
     * Gets if any {@link Entity}s in this DataTextureSceneModel have edges emphasised.
     *
     * @type {Boolean}
     */
    get edges() {
        return (this.numEdgesLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this DataTextureSceneModel have edges emphasised.
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
     * Gets if this DataTextureSceneModel is culled from view.
     *
     * The DataTextureSceneModel is only rendered when {@link DataTextureSceneModel#visible} is true and {@link DataTextureSceneModel#culled} is false.
     *
     * @type {Boolean}
     */
    get culled() {
        return this._culled;
    }

    /**
     * Sets if this DataTextureSceneModel is culled from view.
     *
     * The DataTextureSceneModel is only rendered when {@link DataTextureSceneModel#visible} is true and {@link DataTextureSceneModel#culled} is false.
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
     * Gets if {@link Entity}s in this DataTextureSceneModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._clippable;
    }

    /**
     * Sets if {@link Entity}s in this DataTextureSceneModel are clippable.
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
     * Gets if this DataTextureSceneModel is collidable.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._collidable;
    }

    /**
     * Sets if {@link Entity}s in this DataTextureSceneModel are collidable.
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
     * Gets if this DataTextureSceneModel is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    get pickable() {
        return (this.numPickableLayerPortions > 0);
    }

    /**
     * Sets if {@link Entity}s in this DataTextureSceneModel are pickable.
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
     * Gets the RGB colorize color for this DataTextureSceneModel.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    get colorize() {
        return this._colorize;
    }

    /**
     * Sets the RGB colorize color for this DataTextureSceneModel.
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
     * Gets this DataTextureSceneModel's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        return this._opacity;
    }

    /**
     * Sets the opacity factor for this DataTextureSceneModel.
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
     * Gets if this DataTextureSceneModel casts a shadow.
     *
     * @type {Boolean}
     */
    get castsShadow() {
        return this._castsShadow;
    }

    /**
     * Sets if this DataTextureSceneModel casts a shadow.
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
     * Sets if this DataTextureSceneModel can have shadow cast upon it.
     *
     * @type {Boolean}
     */
    get receivesShadow() {
        return this._receivesShadow;
    }

    /**
     * Sets if this DataTextureSceneModel can have shadow cast upon it.
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
     * Gets if Scalable Ambient Obscurance (SAO) will apply to this DataTextureSceneModel.
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
     * Gets if physically-based rendering (PBR) is enabled for this DataTextureSceneModel.
     *
     * This will always be ````false````.
     *
     * @type {Boolean}
     */
    get pbrEnabled() {
        return this._pbrEnabled;
    }

    /**
     * Returns true to indicate that DataTextureSceneModel is implements {@link Drawable}.
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
     * Configures the appearance of xrayed {@link Entity}s within this DataTextureSceneModel.
     *
     * This is the {@link Scene#xrayMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get xrayMaterial() {
        return this.scene.xrayMaterial;
    }

    /**
     * Configures the appearance of highlighted {@link Entity}s within this DataTextureSceneModel.
     *
     * This is the {@link Scene#highlightMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get highlightMaterial() {
        return this.scene.highlightMaterial;
    }

    /**
     * Configures the appearance of selected {@link Entity}s within this DataTextureSceneModel.
     *
     * This is the {@link Scene#selectedMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get selectedMaterial() {
        return this.scene.selectedMaterial;
    }

    /**
     * Configures the appearance of edges of {@link Entity}s within this DataTextureSceneModel.
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
     * ray-pick on this DataTextureSceneModel.
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
     * Creates a reusable geometry within this DataTextureSceneModel.
     *
     * We can then supply the geometry ID to {@link DataTextureSceneModel#createMesh} when we want to create meshes that instance the geometry.
     *
     * @param {*} cfg Geometry properties.
     * @param {String|Number} cfg.id Mandatory ID for the geometry, to refer to with {@link DataTextureSceneModel#createMesh}.
     * @param {String} [cfg.primitive="triangles"]  Geometry primitive type. Ignored when ````geometryId```` is given. Accepted values are 'points', 'lines' and 'triangles'.
     * @param {Number[]} [cfg.positions] Flat array of vertex positions. Alternative to ````positionsCompressed````.
     * @param {Number[]} [cfg.positionsCompressed] Flat array of compressed vertex positions. Requires ````positionsDecodeMatrix````. Alternative to ````positions````.
     * @param {Number[]} [cfg.colors] Flat array of RGB vertex colors as float values in range ````[0..1]````. Overriden by ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of RGB vertex colors as unsigned short integers in range ````[0..255]````. Overrides ````colors````.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positions````.
     * @param {Number[]} [cfg.origin] Optional geometry origin, relative to {@link DataTextureSceneModel#origin}. When this is given,
     * then ````positions```` or ````positionsCompressed```` are assumed to be relative to this.
     * @param {Number[]} [cfg.indices] Array of primitive connectivity indices. Not required for "points" primitives.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Not required for "points" and "lines" primitives. Otherwise, auto-generated when omitted.
     */
    createGeometry(cfg) {
        const geometryId = cfg.id;
        if (geometryId === undefined || geometryId === null) {
            this.error("Config missing: id");
            return;
        }
        if (geometryId in this._preparedInstancingGeometries) {
            this.error("Geometry already created: " + geometryId);
            return;
        }
        const primitive = cfg.primitive;
        if (primitive === undefined || primitive === null) {
            cfg.primitive = "triangles";
        }
        if (!cfg.positionsCompressed && !cfg.positions) {
            this.error("Config missing: positionsCompressed or positions");
            return;
        }
        if (cfg.positionsCompressed && cfg.positions) {
            this.error("Only one of these expected: positionsCompressed or positions");
            return;
        }
        if (cfg.primitive !== "points" && !cfg.indices) {
            this.error(`Config missing: indices - required with ${cfg.primitive} primitives`);
            return;
        }
        if (cfg.positionsCompressed) {
            if (!cfg.positionsDecodeMatrix) {
                this.error(`Config missing: positionsDecodeMatrix`);
                return;
            }
        } else { // Compress
            const aabb = math.collapseAABB3();
            cfg.positionsDecodeMatrix = math.mat4();
            math.expandAABB3Points3(aabb, cfg.positions);
            cfg.positionsCompressed = quantizePositions(cfg.positions, aabb, cfg.positionsDecodeMatrix)
        }
        switch (primitive) {
            case "triangles":
            case "solid":
            case "surface":
                if (!cfg.indices) {
                    this.error(`Config missing: indices - required for primitive type "${primitive}"`);
                    return;
                }
                const geometryCfg = utils.apply({layerIndex: 0}, cfg);
                if (!geometryCfg.edgeIndices) {
                    geometryCfg.edgeIndices = buildEdgeIndices(cfg.positionsCompressed, cfg.indices, null, 5.0);
                }
                this._instancingGeometries [cfg.id] = geometryCfg;
                this._numTriangles += cfg.indices.length / 3;
                const preparedGeometryCfg = prepareMeshGeometry(geometryCfg, this._enableVertexWelding, this._enableIndexRebucketing);
                this._preparedInstancingGeometries[geometryId] = preparedGeometryCfg;
                break;
            case "lines":
            case "points":
                this.error(`Primitive type not supported: "${primitive}"`);
        }
        this.numGeometries++;
    }

    /**
     * Creates a mesh within this DataTextureSceneModel.
     *
     * @param {object} cfg Object properties.
     * @param {String} cfg.id Mandatory ID for the new mesh. Must not clash with any existing components within the {@link Scene}.
     * @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link DataTextureSceneModel#createGeometry:method"}}createMesh(){{/crossLink}}. Overrides all other geometry parameters given to this method.
     * @param {String} [cfg.primitive="triangles"]  Geometry primitive type. Ignored when ````geometryId```` is given. Accepted values are 'points', 'lines' and 'triangles'.
     * @param {Number[]} [cfg.positions] Flat array of vertex positions. Ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.colors] Flat array of RGB vertex colors as float values in range ````[0..1]````. Ignored when ````geometryId```` is given, overriden by ````color```` and ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of RGB vertex colors as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given, overrides ````colors```` and is overriden by ````color````.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positions````.
     * @param {Number[]} [cfg.origin] Optional geometry origin, relative to {@link DataTextureSceneModel#origin}. When this is given, then ````positions```` are assumed to be relative to this.
     * @param {Number[]} [cfg.indices] Array of triangle indices. Ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. If ````geometryId```` is not given, edge line indices are
     * automatically generated internally if not given, using the ````edgeThreshold```` given to the ````DataTextureSceneModel````
     * constructor. This parameter is ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.position=[0,0,0]] Local 3D position. of the mesh
     * @param {Number[]} [cfg.scale=[1,1,1]] Scale of the mesh.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Rotation of the mesh as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Mesh modelling transform matrix. Overrides the ````position````, ````scale```` and ````rotation```` parameters.
     * @param {Number[]} [cfg.color=[1,1,1]] RGB color in range ````[0..1, 0..`, 0..1]````. Overrides ````colors```` and ````colorsCompressed````.
     * @param {Number} [cfg.opacity=1] Opacity in range ````[0..1]````.
     */
    createMesh(cfg) {
        const id = cfg.id;
        if (id === undefined || id === null) {
            this.error("Config missing: id");
            return;
        }
        if (this._meshes[id]) {
            this.error(`DataTextureSceneModel already has a Mesh with this ID: ${id}`);
            return;
        }
        let geometryId = cfg.geometryId;
        let preparedGeometryCfg;
        if (geometryId !== null && geometryId !== undefined) {
            preparedGeometryCfg = this._preparedInstancingGeometries[geometryId];
            if (!preparedGeometryCfg) {
                this.error(`Geometry not found: ${geometryId}`);
                return;
            }
        } else {
            if (cfg.primitive === undefined || cfg.primitive === null) {
                cfg.primitive = "triangles";
            }
            if (!cfg.positionsCompressed && !cfg.positions) {
                this.error("Config missing: positionsCompressed or positions");
                return;
            }
            if (cfg.primitive !== "points" && !cfg.indices) {
                this.error(`Config missing: indices - required with ${cfg.primitive} primitives`);
                return;
            }
            if (cfg.positionsCompressed && !cfg.positionsDecodeMatrix) {
                this.error("Config missing: positionsDecodeMatrix - required with positionsCompressed");
                return;
            }
            geometryId = math.createUUID();
            this.createGeometry({
                id: geometryId,
                primitive: cfg.primitive,
                positions: cfg.positions,
                positionsCompressed: cfg.positionsCompressed,
                positionsDecodeMatrix: cfg.positionsDecodeMatrix,
                indices: cfg.indices
            });
            preparedGeometryCfg = this._preparedInstancingGeometries[geometryId];
            cfg.geometryId = geometryId;
        }
        const origin = (cfg.origin) ? math.addVec3(this._origin, cfg.origin, tempVec3a) : this._origin;
        cfg.color = cfg.color ? cfg.color.slice() : [255, 255, 255];
        if (this._vfcManager && !this._vfcManager.finalized) {
            this._vfcManager.addMesh(cfg); // To be created in #finalize()
            return;
        }
        let layer = this._getLayer(origin, preparedGeometryCfg);
        const color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : [255, 255, 255];
        const opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;
        const metallic = (cfg.metallic !== undefined && cfg.metallic !== null) ? Math.floor(cfg.metallic * 255) : 0;
        const roughness = (cfg.roughness !== undefined && cfg.roughness !== null) ? Math.floor(cfg.roughness * 255) : 255;
        const mesh = new DataTextureSceneModelMesh(this, id, color, opacity);
        const pickId = mesh.pickId;
        const a = pickId >> 24 & 0xFF;
        const b = pickId >> 16 & 0xFF;
        const g = pickId >> 8 & 0xFF;
        const r = pickId & 0xFF;
        const pickColor = new Uint8Array([r, g, b, a]); // Quantized pick color
        const aabb = math.collapseAABB3();
        preparedGeometryCfg.solid = preparedGeometryCfg.primitive === "solid";
        let meshMatrix;
        const worldMatrix = this._worldMatrixNonIdentity ? this._worldMatrix : null;
        if (cfg.matrix) {
            meshMatrix = cfg.matrix;
        } else {
            const scale = cfg.scale || defaultScale;
            const position = cfg.position || defaultPosition;
            const rotation = cfg.rotation || defaultRotation;
            math.eulerToQuaternion(rotation, "XYZ", defaultQuaternion);
            meshMatrix = math.composeMat4(position, defaultQuaternion, scale, math.mat4());
        }
        const portionId = layer.createPortion(preparedGeometryCfg, {
            origin,
            geometryId,
            color,
            metallic,
            roughness,
            opacity,
            meshMatrix,
            worldMatrix,
            aabb,
            pickColor
        });
        math.expandAABB3(this._aabb, aabb);
        this._numTriangles += preparedGeometryCfg.indices.length / 3;
        mesh.numTriangles = preparedGeometryCfg.indices.length / 3;
        this.numGeometries++;
        mesh.origin = origin;
        // noinspection JSConstantReassignment
        mesh.parent = null; // Will be set within PerformanceModelNode constructor
        mesh._layer = layer;
        mesh._portionId = portionId;
        // noinspection JSConstantReassignment
        mesh.aabb = aabb;
        this._meshes[id] = mesh;
    }

    _getLayer(origin, preparedGeometryCfg) {
        const layerId = `${origin[0]}.${origin[1]}.${origin[2]}`;
        let layer = this._currentLayers[layerId];
        if (layer) {
            if (!layer.canCreatePortion(preparedGeometryCfg, null)) {
                layer.finalize();
                delete this._currentLayers[layerId];
                layer = null;
            } else {
                return layer;
            }
        }
        layer = new TrianglesDataTextureLayer(this, {layerIndex: 0, origin}); // layerIndex is set in #finalize()
        this._currentLayers[layerId] = layer;
        this._layers[layerId] = layer;
        this._layerList.push(layer);
        return layer;
    }

    /**
     * Creates an {@link Entity} within this DataTextureSceneModel, giving it one or more meshes previously created with {@link DataTextureSceneModel#createMesh}.
     *
     * A mesh can only belong to one {@link Entity}, so you'll get an error if you try to reuse a mesh among multiple {@link Entity}s.
     *
     * @param {Object} cfg Entity configuration.
     * @param {String} cfg.id Optional ID for the new Entity. Must not clash with any existing components within the {@link Scene}.
     * @param {String[]} cfg.meshIds IDs of one or more meshes created previously with {@link DataTextureSceneModel@createMesh}.
     * @param {Boolean} [cfg.isObject] Set ````true```` if the {@link Entity} represents an object, in which case it will be registered by {@link Entity#id} in {@link Scene#objects} and can also have a corresponding {@link MetaObject} with matching {@link MetaObject#id}, registered by that ID in {@link MetaScene#metaObjects}.
     * @param {Boolean} [cfg.visible=true] Indicates if the Entity is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the Entity is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the Entity is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the Entity is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the Entity is initially included in boundary calculations.
     * @param {Boolean} [cfg.castsShadow=true] Indicates if the Entity initially casts shadows.
     * @param {Boolean} [cfg.receivesShadow=true]  Indicates if the Entity initially receives shadows.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the Entity is initially xrayed. XRayed appearance is configured by {@link DataTextureSceneModel#xrayMaterial}.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the Entity is initially highlighted. Highlighted appearance is configured by {@link DataTextureSceneModel#highlightMaterial}.
     * @param {Boolean} [cfg.selected=false] Indicates if the Entity is initially selected. Selected appearance is configured by {@link DataTextureSceneModel#selectedMaterial}.
     * @param {Boolean} [cfg.edges=false] Indicates if the Entity's edges are initially emphasized. Edges appearance is configured by {@link DataTextureSceneModel#edgeMaterial}.
     * @returns {Entity}
     */
    createEntity(cfg) {
        let id = cfg.id;
        if (id === undefined) {
            id = math.createUUID();
        } else if (this.scene.components[id]) {
            this.error("Scene already has a Component with this ID: " + id + " - will assign random ID to new Entity");
            id = math.createUUID();
        }
        const meshIds = cfg.meshIds;
        if (meshIds === undefined) {
            this.error("Config missing: meshIds");
            return;
        }
        if (this._vfcManager && !this._vfcManager.finalized) {
            this._vfcManager.addEntity(cfg); // NB: Meshes won't exist yet
            return;
        }
        let meshes = [];
        for (let i = 0, len = meshIds.length; i < len; i++) {
            const meshId = meshIds[i];
            const mesh = this._meshes[meshId];
            if (!mesh) {
                this.error(`Mesh with this ID not found: "${meshId}" - ignoring this mesh`);
                continue;
            }
            if (mesh.parent) {
                this.error(`Mesh with ID "${meshId}" already belongs to object with ID "${mesh.parent.id}" - ignoring this mesh`);
                continue;
            }
            meshes.push(mesh);
        }
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
        let aabb;
        if (meshes.length === 1) {
            aabb = meshes[0].aabb;
        } else {
            aabb = math.collapseAABB3();
            for (let i = 0, len = meshes.length; i < len; i++) {
                math.expandAABB3(aabb, meshes[i].aabb);
            }
        }
        const node = new DataTextureSceneModelNode(this, cfg.isObject, id, meshes, flags, aabb);
        this._nodeList.push(node);
        this._nodes[id] = node;
        this.numEntities++;
        return node; // Entity
    }

    /**
     * Finalizes this DataTextureSceneModel.
     *
     * Immediately creates the DataTextureSceneModel's {@link Entity}s within the {@link Scene}.
     *
     * Once finalized, you can't add anything more to this DataTextureSceneModel.
     */
    finalize() {
        if (this.destroyed) {
            return;
        }
        if (this._vfcManager) {
            this._vfcManager.finalize(()=> {// Makes deferred calls to #createEntity() and #createMesh()
            });
        }
        for (let layerId in this._currentLayers) {
            this._currentLayers[layerId].finalize();
            delete this._currentLayers[layerId];
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
        if (this.scene.lod.enabled) {
            this._lodManager = this.scene.lod.getLODManager(this);
        }
        for (let i = 0, len = this._layerList.length; i < len; i++) {
            const layer = this._layerList[i];
            layer.attachToRenderingEvent();
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
     * @private
     */
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

    /** @private */
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

    /** @private */
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
    setPickMatrices(pickViewMatrix, pickProjMatrix) {
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this._layerList[layerIndex].setPickMatrices(pickViewMatrix, pickProjMatrix);
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
     * Called by DataTextureSceneModelMesh.drawPickDepths()
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
     * Called by DataTextureSceneModelMesh.drawPickNormals()
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

    drawSnapInitDepthBuf(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            const layer = this._layerList[layerIndex];
            layer.drawSnapInitDepthBuf(renderFlags, frameCtx);
        }
    }

    drawSnapDepths(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            const layer = this._layerList[layerIndex];
            layer.drawSnapDepths(renderFlags, frameCtx);
        }
    }

    //------------------------------------------------------------------------------------------------------------------
    // Component members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Destroys this DataTextureSceneModel.
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
        if (this._vfcManager) {
            this.scene.vfc.putVFCManager(this._vfcManager);
        }
        if (this._lodManager) {
            this.scene.lod.putLODManager(this._lodManager);
        }
        super.destroy();
    }
}

/**
 * This function applies two steps to the provided mesh geometry data:
 *
 * - 1st, it reduces its `.positions` to unique positions, thus removing duplicate vertices. It will adjust the `.indices` and `.edgeIndices` array accordingly to the unique `.positions`.
 *
 * - 2nd, it tries to do an optimization called `index rebucketting`
 *
 *   _Rebucketting minimizes the amount of RAM usage for a given mesh geometry by trying do demote its needed index bitness._
 *
 *   - _for 32 bit indices, will try to demote them to 16 bit indices_
 *   - _for 16 bit indices, will try to demote them to 8 bits indices_
 *   - _8 bits indices are kept as-is_
 *
 *   The fact that 32/16/8 bits are needed for indices, depends on the number of maximumm indexable vertices within the mesh geometry: this is, the number of vertices in the mesh geometry.
 *
 * The function returns the same provided input `geometryCfg`, enrichened with the additional key `.preparedBukets`.
 *
 * @param {object} geometryCfg The mesh information containing `.positions`, `.indices`, `.edgeIndices` arrays.
 *
 * @param enableVertexWelding
 * @param enableIndexRebucketing
 * @returns {object} The mesh information enrichened with `.preparedBuckets` key.
 */
function prepareMeshGeometry(geometryCfg, enableVertexWelding, enableIndexRebucketing) {
    let uniquePositions, uniqueIndices, uniqueEdgeIndices;
    if (enableVertexWelding) {
        [
            uniquePositions,
            uniqueIndices,
            uniqueEdgeIndices,
        ] = uniquifyPositions({
            positionsCompressed: geometryCfg.positionsCompressed,
            indices: geometryCfg.indices,
            edgeIndices: geometryCfg.edgeIndices
        });
    } else {
        uniquePositions = geometryCfg.positionsCompressed;
        uniqueIndices = geometryCfg.indices;
        uniqueEdgeIndices = geometryCfg.edgeIndices;
    }
    let buckets;
    if (enableIndexRebucketing) {
        let numUniquePositions = uniquePositions.length / 3;
        buckets = rebucketPositions(
            {
                positions: uniquePositions,
                indices: uniqueIndices,
                edgeIndices: uniqueEdgeIndices,
            },
            (numUniquePositions > (1 << 16)) ? 16 : 8,
            // true
        );
    } else {
        buckets = [{
            positions: uniquePositions,
            indices: uniqueIndices,
            edgeIndices: uniqueEdgeIndices,
        }];
    }

    geometryCfg.preparedBuckets = buckets;

    return geometryCfg;
}
