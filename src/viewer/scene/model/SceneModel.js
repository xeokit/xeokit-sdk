import {Component} from "../Component.js";
import {math} from "../math/math.js";
import {buildEdgeIndices} from '../math/buildEdgeIndices.js';
import {SceneModelMesh} from './SceneModelMesh.js';
import {getScratchMemory, putScratchMemory} from "./vbo/ScratchMemory.js";
import {TrianglesBatchingLayer} from './vbo/trianglesBatching/TrianglesBatchingLayer.js';
import {TrianglesInstancingLayer} from './vbo/trianglesInstancing/TrianglesInstancingLayer.js';
import {LinesBatchingLayer} from './vbo/linesBatching/LinesBatchingLayer.js';
import {LinesInstancingLayer} from './vbo/linesInstancing/LinesInstancingLayer.js';
import {PointsBatchingLayer} from './vbo/pointsBatching/PointsBatchingLayer.js';
import {PointsInstancingLayer} from './vbo/pointsInstancing/PointsInstancingLayer.js';
import {ENTITY_FLAGS} from './ENTITY_FLAGS.js';
import {RenderFlags} from "../webgl/RenderFlags.js";
import {worldToRTCPositions} from "../math/rtcCoords.js";
import {SceneModelTextureSet} from "./SceneModelTextureSet.js";
import {SceneModelTexture} from "./SceneModelTexture.js";
import {Texture2D} from "../webgl/Texture2D.js";
import {utils} from "../utils.js";
import {getKTX2TextureTranscoder} from "../utils/textureTranscoders/KTX2TextureTranscoder/KTX2TextureTranscoder.js";
import {
    ClampToEdgeWrapping,
    LinearEncoding,
    LinearFilter,
    LinearMipmapLinearFilter,
    LinearMipMapNearestFilter,
    MirroredRepeatWrapping,
    NearestFilter,
    NearestMipMapLinearFilter,
    NearestMipMapNearestFilter,
    RepeatWrapping,
    sRGBEncoding
} from "../constants/constants.js";
import {createPositionsDecodeMatrix, quantizePositions} from "./compression.js";
import {uniquifyPositions} from "./dtx/triangles/calculateUniquePositions";
import {rebucketPositions} from "./dtx/triangles/rebucketPositions";
import {TrianglesDataTextureLayer} from "./dtx/triangles/TrianglesDataTextureLayer";
import {SceneModelEntity} from "./SceneModelEntity";
import {geometryCompressionUtils} from "../math/geometryCompressionUtils";


const tempVec3a = math.vec3();
const tempMat4 = math.mat4();

const DEFAULT_SCALE = math.vec3([1, 1, 1]);
const DEFAULT_POSITION = math.vec3([0, 0, 0]);
const DEFAULT_ROTATION = math.vec3([0, 0, 0]);
const DEFAULT_QUATERNION = math.identityQuaternion();

const DEFAULT_COLOR_TEXTURE_ID = "defaultColorTexture";
const DEFAULT_METAL_ROUGH_TEXTURE_ID = "defaultMetalRoughTexture";
const DEFAULT_NORMALS_TEXTURE_ID = "defaultNormalsTexture";
const DEFAULT_EMISSIVE_TEXTURE_ID = "defaultEmissiveTexture";
const DEFAULT_OCCLUSION_TEXTURE_ID = "defaultOcclusionTexture";
const DEFAULT_TEXTURE_SET_ID = "defaultTextureSet";

const VBO_INSTANCED = 0;
const VBO_BATCHED = 1;
const DTX = 2;

/**
 * @desc A high-performance model representation for efficient rendering and low memory usage.
 *
 * # Examples
 *
 * Internally, SceneModel uses a combination of several different techniques to render and represent
 * the different parts of a typical model. Each of these examples is designed to "unit test" one of these
 * techniques, in isolation. If some bug occurs in SceneModel, we use these tests to debug, but they also
 * serve to demonstrate how to use the capabilities of SceneModel programmatically.
 *
 * TODO
 *
 * # Overview
 *
 * While xeokit's standard [scene graph](https://github.com/xeokit/xeokit-sdk/wiki/Scene-Graphs) is great for gizmos and medium-sized models, it doesn't scale up to millions of objects in terms of memory and rendering efficiency.
 *
 * For huge models, we have the ````SceneModel```` representation, which is optimized to pack large amounts of geometry into memory and render it efficiently using WebGL.
 *
 * ````SceneModel```` is the default model representation loaded by  (at least) {@link GLTFLoaderPlugin}, {@link XKTLoaderPlugin} and  {@link WebIFCLoaderPlugin}.
 *
 * In this tutorial you'll learn how to use ````SceneModel```` to create high-detail content programmatically. Ordinarily you'd be learning about ````SceneModel```` if you were writing your own model loader plugins.
 *
 * # Contents
 *
 * - [SceneModel](#DataTextureSceneModel)
 * - [GPU-Resident Geometry](#gpu-resident-geometry)
 * - [Picking](#picking)
 * - [Example 1: Geometry Instancing](#example-1--geometry-instancing)
 * - [Finalizing a SceneModel](#finalizing-a-DataTextureSceneModel)
 * - [Finding Entities](#finding-entities)
 * - [Example 2: Geometry Batching](#example-2--geometry-batching)
 * - [Classifying with Metadata](#classifying-with-metadata)
 * - [Querying Metadata](#querying-metadata)
 * - [Metadata Structure](#metadata-structure)
 * - [RTC Coordinates](#rtc-coordinates-for-double-precision)
 *   - [Example 3: RTC Coordinates with Geometry Instancing](#example-2--rtc-coordinates-with-geometry-instancing)
 *   - [Example 4: RTC Coordinates with Geometry Batching](#example-2--rtc-coordinates-with-geometry-batching)
 *
 * ## SceneModel
 *
 * ````SceneModel```` uses two rendering techniques internally:
 *
 * 1. ***Geometry batching*** for unique geometries, combining those into a single WebGL geometry buffer, to render in one draw call, and
 * 2. ***geometry instancing*** for geometries that are shared by multiple meshes, rendering all instances of each shared geometry in one draw call.
 *
 * <br>
 * These techniques come with certain limitations:
 *
 * * Non-realistic rendering - while scene graphs can use xeokit's full set of material workflows, ````SceneModel```` uses simple Lambertian shading without textures.
 * * Static transforms - transforms within a ````SceneModel```` are static and cannot be dynamically translated, rotated and scaled the way {@link Node}s and {@link Mesh}es in scene graphs can.
 * * Immutable model representation - while scene graph {@link Node}s and
 * {@link Mesh}es can be dynamically plugged together, ````SceneModel```` is immutable,
 * since it packs its geometries into buffers and instanced arrays.
 *
 * ````SceneModel````'s API allows us to exploit batching and instancing, while exposing its elements as
 * abstract {@link Entity} types.
 *
 * {@link Entity} is the abstract base class for
 * the various xeokit components that represent models, objects, or anonymous visible elements. An Entity has a unique ID and can be
 * individually shown, hidden, selected, highlighted, ghosted, culled, picked and clipped, and has its own World-space boundary.
 *
 * * A ````SceneModel```` is an {@link Entity} that represents a model.
 * * A ````SceneModel```` represents each of its objects with an {@link Entity}.
 * * Each {@link Entity} has one or more meshes that define its shape.
 * * Each mesh has either its own unique geometry, or shares a geometry with other meshes.
 *
 * ## GPU-Resident Geometry
 *
 * For a low memory footprint, ````SceneModel```` stores its geometries in GPU memory only, compressed (quantized) as integers. Unfortunately, GPU-resident geometry is
 * not readable by JavaScript.
 *
 *
 * ## Example 1: Geometry Instancing
 *
 * In the example below, we'll use a ````SceneModel````
 * to build a simple table model using geometry instancing.
 *
 * We'll start by adding a reusable box-shaped geometry to our ````SceneModel````.
 *
 * Then, for each object in our model we'll add an {@link Entity}
 * that has a mesh that instances our box geometry, transforming and coloring the instance.
 *
 * [![](http://xeokit.io/img/docs/sceneGraph.png)](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_SceneModel_instancing)
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_SceneModel_instancing)]
 *
 * ````javascript
 * import {Viewer, SceneModel} from "xeokit-sdk.es.js";
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
 * // Build a SceneModel representing a table
 * // with four legs, using geometry instancing
 *
 * const sceneModel = new SceneModel(viewer.scene, {
 *     id: "table",
 *     isModel: true, // <--- Registers SceneModel in viewer.scene.models
 *     position: [0, 0, 0],
 *     scale: [1, 1, 1],
 *     rotation: [0, 0, 0]
 * });
 *
 * // Create a reusable geometry within the SceneModel
 * // We'll instance this geometry by five meshes
 *
 * sceneModel.createGeometry({
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
 * sceneModel.createMesh({
 *     id: "redLegMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3]
 * });
 *
 * sceneModel.createEntity({
 *     id: "redLeg",
 *     meshIds: ["redLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Green table leg
 *
 * sceneModel.createMesh({
 *     id: "greenLegMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3]
 * });
 *
 * sceneModel.createEntity({
 *     id: "greenLeg",
 *     meshIds: ["greenLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Blue table leg
 *
 * sceneModel.createMesh({
 *     id: "blueLegMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0]
 * });
 *
 * sceneModel.createEntity({
 *     id: "blueLeg",
 *     meshIds: ["blueLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Yellow table leg
 *
 * sceneModel.createMesh({
 *      id: "yellowLegMesh",
 *      geometryId: "myBoxGeometry",
 *      position: [-4, -6, 4],
 *      scale: [1, 3, 1],
 *      rotation: [0, 0, 0],
 *      color: [1.0, 1.0, 0.0]
 * });
 *
 * sceneModel.createEntity({
 *     id: "yellowLeg",
 *     meshIds: ["yellowLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Purple table top
 *
 * sceneModel.createMesh({
 *     id: "purpleTableTopMesh",
 *     geometryId: "myBoxGeometry",
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0]
 * });
 *
 * sceneModel.createEntity({
 *     id: "purpleTableTop",
 *     meshIds: ["purpleTableTopMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *  ````
 *
 * ## Finalizing a SceneModel
 *
 * Before we can view and interact with our ````SceneModel````, we need to **finalize** it. Internally, this causes the ````SceneModel```` to build the
 * vertex buffer objects (VBOs) that support our geometry instances. When using geometry batching (see next example),
 * this causes ````SceneModel```` to build the VBOs that combine the batched geometries. Note that you can do both instancing and
 * batching within the same ````SceneModel````.
 *
 * Once finalized, we can't add anything more to our ````SceneModel````.
 *
 * ```` javascript
 * SceneModel.finalize();
 * ````
 *
 * ## Finding Entities
 *
 * As mentioned earlier, {@link Entity} is
 * the abstract base class for components that represent models, objects, or just
 * anonymous visible elements.
 *
 * Since we created configured our ````SceneModel```` with ````isModel: true````,
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
 * Let's once more use a ````SceneModel````
 * to build the simple table model, this time exploiting geometry batching.
 *
 *  [![](http://xeokit.io/img/docs/sceneGraph.png)](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_SceneModel_batching)
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_SceneModel_batching)]
 *
 * ````javascript
 * import {Viewer, SceneModel} from "xeokit-sdk.es.js";
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
 * // Create a SceneModel representing a table with four legs, using geometry batching
 * const sceneModel = new SceneModel(viewer.scene, {
 *     id: "table",
 *     isModel: true,  // <--- Registers SceneModel in viewer.scene.models
 *     position: [0, 0, 0],
 *     scale: [1, 1, 1],
 *     rotation: [0, 0, 0]
 * });
 *
 * // Red table leg
 *
 * sceneModel.createMesh({
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
 * sceneModel.createEntity({
 *     id: "redLeg",
 *     meshIds: ["redLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Green table leg
 *
 * sceneModel.createMesh({
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
 * sceneModel.createEntity({
 *     id: "greenLeg",
 *     meshIds: ["greenLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Blue table leg
 *
 * sceneModel.createMesh({
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
 * sceneModel.createEntity({
 *     id: "blueLeg",
 *     meshIds: ["blueLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Yellow table leg object
 *
 * sceneModel.createMesh({
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
 * sceneModel.createEntity({
 *     id: "yellowLeg",
 *     meshIds: ["yellowLegMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Purple table top
 *
 * sceneModel.createMesh({
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
 * sceneModel.createEntity({
 *     id: "purpleTableTop",
 *     meshIds: ["purpleTableTopMesh"],
 *     isObject: true // <---- Registers Entity by ID on viewer.scene.objects
 * });
 *
 * // Finalize the SceneModel.
 *
 * SceneModel.finalize();
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
 * In the previous examples, we used ````SceneModel```` to build
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
 * various ways in the 3D scene (such as with ````SceneModel````, which
 * has a non-hierarchical scene representation).
 *
 * Note also that a {@link MetaObject} does not need to have a corresponding
 * {@link Entity} and vice-versa.
 *
 * # RTC Coordinates for Double Precision
 *
 * ````SceneModel```` can emulate 64-bit precision on GPUs using relative-to-center (RTC) coordinates.
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
 * To use RTC with ````SceneModel```` geometry instancing, we specify an RTC center for the geometry via its ````origin```` parameter. Then ````SceneModel```` assumes that all meshes that instance that geometry are within the same RTC coordinate system, ie. the meshes ````position```` and ````rotation```` properties are assumed to be relative to the geometry's ````origin````.
 *
 * For simplicity, our example's meshes all instance the same geometry. Therefore, our example model has only one RTC center.
 *
 * Note that the axis-aligned World-space boundary (AABB) of our model is ````[ -6, -9, -6, 1000000006, -2.5, 1000000006]````.
 *
 * [![](http://xeokit.io/img/docs/sceneGraph.png)](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_SceneModel_batching)
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_SceneModel_instancing_origin)]
 *
 * ````javascript
 * const origin = [100000000, 0, 100000000];
 *
 * sceneModel.createGeometry({
 *     id: "box",
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 * });
 *
 * sceneModel.createMesh({
 *     id: "leg1",
 *     geometryId: "box",
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3],
 *     origin: origin
 * });
 *
 * sceneModel.createEntity({
 *     meshIds: ["leg1"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
 *     id: "leg2",
 *     geometryId: "box",
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3],
 *     origin: origin
 * });
 *
 * sceneModel.createEntity({
 *     meshIds: ["leg2"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
 *     id: "leg3",
 *     geometryId: "box",
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0],
 *     origin: origin
 * });
 *
 * sceneModel.createEntity({
 *     meshIds: ["leg3"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
 *     id: "leg4",
 *     geometryId: "box",
 *     position: [-4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 1.0, 0.0],
 *     origin: origin
 * });
 *
 * sceneModel.createEntity({
 *     meshIds: ["leg4"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
 *     id: "top",
 *     geometryId: "box",
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0],
 *     origin: origin
 * });
 *
 * sceneModel.createEntity({
 *     meshIds: ["top"],
 *     isObject: true
 * });
 * ````
 *
 * ## RTC Coordinates with Geometry Batching
 *
 * To use RTC with ````SceneModel```` geometry batching, we specify an RTC center (````origin````) for each mesh. For performance, we try to have as many meshes share the same value for ````origin```` as possible. Each mesh's ````positions````, ````position```` and ````rotation```` properties are assumed to be relative to ````origin````.
 *
 * For simplicity, the meshes in our example all share the same RTC center.
 *
 * The axis-aligned World-space boundary (AABB) of our model is ````[ -6, -9, -6, 1000000006, -2.5, 1000000006]````.
 *
 * [![](http://xeokit.io/img/docs/sceneGraph.png)](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_SceneModel_batching)
 *
 * * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/#sceneRepresentation_SceneModel_batching_origin)]
 *
 * ````javascript
 * const origin = [100000000, 0, 100000000];
 *
 * sceneModel.createMesh({
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
 * sceneModel.createEntity({
 *     meshIds: ["leg1"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
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
 * sceneModel.createEntity({
 *     meshIds: ["leg2"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
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
 * sceneModel.createEntity({
 *     meshIds: ["leg3"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
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
 * sceneModel.createEntity({
 *     meshIds: ["leg4"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
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
 * sceneModel.createEntity({
 *     meshIds: ["top"],
 *     isObject: true
 * });
 * ````
 *
 * ## Positioning at World-space coordinates
 *
 * To position a SceneModel at given double-precision World coordinates, we can
 * configure the ````origin```` of the SceneModel itself. The ````origin```` is a double-precision
 * 3D World-space position at which the SceneModel will be located.
 *
 * Note that ````position```` is a single-precision offset relative to ````origin````.
 *
 * ````javascript
 * const origin = [100000000, 0, 100000000];
 *
 * const sceneModel = new SceneModel(viewer.scene, {
 *     id: "table",
 *     isModel: true,
 *     origin: origin, // Everything in this SceneModel is relative to this RTC center
 *     position: [0, 0, 0],
 *     scale: [1, 1, 1],
 *     rotation: [0, 0, 0]
 * });
 *
 * sceneModel.createGeometry({
 *     id: "box",
 *     primitive: "triangles",
 *     positions: [ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ... ],
 *     normals: [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, ... ],
 *     indices: [ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, ... ],
 * });
 *
 * sceneModel.createMesh({
 *     id: "leg1",
 *     geometryId: "box",
 *     position: [-4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1, 0.3, 0.3]
 * });
 *
 * sceneModel.createEntity({
 *     meshIds: ["leg1"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
 *     id: "leg2",
 *     geometryId: "box",
 *     position: [4, -6, -4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 1.0, 0.3]
 * });
 *
 * sceneModel.createEntity({
 *     meshIds: ["leg2"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
 *     id: "leg3",
 *     geometryId: "box",
 *     position: [4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [0.3, 0.3, 1.0]
 * });
 *
 * sceneModel.createEntity({
 *     meshIds: ["leg3"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
 *     id: "leg4",
 *     geometryId: "box",
 *     position: [-4, -6, 4],
 *     scale: [1, 3, 1],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 1.0, 0.0]
 * });
 *
 * sceneModel.createEntity({
 *     meshIds: ["leg4"],
 *     isObject: true
 * });
 *
 * sceneModel.createMesh({
 *     id: "top",
 *     geometryId: "box",
 *     position: [0, -3, 0],
 *     scale: [6, 0.5, 6],
 *     rotation: [0, 0, 0],
 *     color: [1.0, 0.3, 1.0]
 * });
 *
 * sceneModel.createEntity({
 *     meshIds: ["top"],
 *     isObject: true
 * });
 * ````
 *
 * # Textures
 *
 * ## Loading KTX2 Texture Files into a SceneModel
 *
 * A {@link SceneModel} that is configured with a {@link KTX2TextureTranscoder} will
 * allow us to load textures into it from KTX2 buffers or files.
 *
 * In the example below, we'll create a {@link Viewer}, containing a {@link SceneModel} configured with a
 * {@link KTX2TextureTranscoder}. We'll then programmatically create a simple object within the SceneModel, consisting of
 * a single mesh with a texture loaded from a KTX2 file, which our SceneModel internally transcodes, using
 * its {@link KTX2TextureTranscoder}. Note how we configure our {@link KTX2TextureTranscoder} with a path to the Basis Universal
 * transcoder WASM module.
 *
 * ````javascript
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.scene.camera.eye = [-21.80, 4.01, 6.56];
 * viewer.scene.camera.look = [0, -5.75, 0];
 * viewer.scene.camera.up = [0.37, 0.91, -0.11];
 *
 * const textureTranscoder = new KTX2TextureTranscoder({
 *     viewer,
 *     transcoderPath: "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk/dist/basis/" // <------ Path to BasisU transcoder module
 * });
 *
 * const sceneModel = new SceneModel(viewer.scene, {
 *      id: "myModel",
 *      textureTranscoder // <<-------------------- Configure model with our transcoder
 *  });
 *
 * sceneModel.createTexture({
 *      id: "myColorTexture",
 *      src: "../assets/textures/compressed/sample_uastc_zstd.ktx2" // <<----- KTX2 texture asset
 * });
 *
 * sceneModel.createTexture({
 *      id: "myMetallicRoughnessTexture",
 *      src: "../assets/textures/alpha/crosshatchAlphaMap.jpg" // <<----- JPEG texture asset
 * });
 *
 * sceneModel.createTextureSet({
 *      id: "myTextureSet",
 *      colorTextureId: "myColorTexture",
 *      metallicRoughnessTextureId: "myMetallicRoughnessTexture"
 *  });
 *
 * sceneModel.createMesh({
 *      id: "myMesh",
 *      textureSetId: "myTextureSet",
 *      primitive: "triangles",
 *      positions: [1, 1, 1, ...],
 *      normals: [0, 0, 1, 0, ...],
 *      uv: [1, 0, 0, ...],
 *      indices: [0, 1, 2, ...],
 *  });
 *
 * sceneModel.createEntity({
 *      id: "myEntity",
 *      meshIds: ["myMesh"]
 *  });
 *
 * sceneModel.finalize();
 * ````
 *
 * ## Loading KTX2 Textures from ArrayBuffers into a SceneModel
 *
 * A SceneModel that is configured with a {@link KTX2TextureTranscoder} will allow us to load textures into
 * it from KTX2 ArrayBuffers.
 *
 * In the example below, we'll create a {@link Viewer}, containing a {@link SceneModel} configured with a
 * {@link KTX2TextureTranscoder}. We'll then programmatically create a simple object within the SceneModel, consisting of
 * a single mesh with a texture loaded from a KTX2 ArrayBuffer, which our SceneModel internally transcodes, using
 * its {@link KTX2TextureTranscoder}.
 *
 * ````javascript
 * const viewer = new Viewer({
 *     canvasId: "myCanvas",
 *     transparent: true
 * });
 *
 * viewer.scene.camera.eye = [-21.80, 4.01, 6.56];
 * viewer.scene.camera.look = [0, -5.75, 0];
 * viewer.scene.camera.up = [0.37, 0.91, -0.11];
 *
 * const textureTranscoder = new KTX2TextureTranscoder({
 *     viewer,
 *     transcoderPath: "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk/dist/basis/" // <------ Path to BasisU transcoder module
 * });
 *
 * const sceneModel = new SceneModel(viewer.scene, {
 *      id: "myModel",
 *      textureTranscoder // <<-------------------- Configure model with our transcoder
 * });
 *
 * utils.loadArraybuffer("../assets/textures/compressed/sample_uastc_zstd.ktx2",(arrayBuffer) => {
 *
 *     sceneModel.createTexture({
 *         id: "myColorTexture",
 *         buffers: [arrayBuffer] // <<----- KTX2 texture asset
 *     });
 *
 *     sceneModel.createTexture({
 *         id: "myMetallicRoughnessTexture",
 *         src: "../assets/textures/alpha/crosshatchAlphaMap.jpg" // <<----- JPEG texture asset
 *     });
 *
 *     sceneModel.createTextureSet({
 *        id: "myTextureSet",
 *        colorTextureId: "myColorTexture",
 *        metallicRoughnessTextureId: "myMetallicRoughnessTexture"
 *     });
 *
 *     sceneModel.createMesh({
 *          id: "myMesh",
 *          textureSetId: "myTextureSet",
 *          primitive: "triangles",
 *          positions: [1, 1, 1, ...],
 *          normals: [0, 0, 1, 0, ...],
 *          uv: [1, 0, 0, ...],
 *          indices: [0, 1, 2, ...],
 *     });
 *
 *     sceneModel.createEntity({
 *         id: "myEntity",
 *         meshIds: ["myMesh"]
 *     });
 *
 *     sceneModel.finalize();
 * });
 * ````
 *
 * @implements {Entity}
 */
export class SceneModel extends Component {

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     * @param {Boolean} [cfg.isModel] Specify ````true```` if this SceneModel represents a model, in which case the SceneModel will be registered by {@link SceneModel#id} in {@link Scene#models} and may also have a corresponding {@link MetaModel} with matching {@link MetaModel#id}, registered by that ID in {@link MetaScene#metaModels}.
     * @param {Number[]} [cfg.origin=[0,0,0]] World-space double-precision 3D origin.
     * @param {Number[]} [cfg.position=[0,0,0]] Local, single-precision 3D position, relative to the origin parameter.
     * @param {Number[]} [cfg.scale=[1,1,1]] Local scale.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1] Local modelling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Boolean} [cfg.visible=true] Indicates if the SceneModel is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the SceneModel is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the SceneModel is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the SceneModel is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the SceneModel is initially included in boundary calculations.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the SceneModel is initially xrayed.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the SceneModel is initially highlighted.
     * @param {Boolean} [cfg.selected=false] Indicates if the SceneModel is initially selected.
     * @param {Boolean} [cfg.edges=false] Indicates if the SceneModel's edges are initially emphasized.
     * @param {Number[]} [cfg.colorize=[1.0,1.0,1.0]] SceneModel's initial RGB colorize color, multiplies by the rendered fragment colors.
     * @param {Number} [cfg.opacity=1.0] SceneModel's initial opacity factor, multiplies by the rendered fragment alpha.
     * @param {Number} [cfg.backfaces=false] When we set this ````true````, then we force rendering of backfaces for this SceneModel. When
     * we leave this ````false````, then we allow the Viewer to decide when to render backfaces. In that case, the
     * Viewer will hide backfaces on watertight meshes, show backfaces on open meshes, and always show backfaces on meshes when we slice them open with {@link SectionPlane}s.
     * @param {Boolean} [cfg.saoEnabled=true] Indicates if Scalable Ambient Obscurance (SAO) will apply to this SceneModel. SAO is configured by the Scene's {@link SAO} component.
     * @param {Boolean} [cfg.pbrEnabled=true] Indicates if physically-based rendering (PBR) will apply to the SceneModel when {@link Scene#pbrEnabled} is ````true````.
     * @param {Boolean} [cfg.colorTextureEnabled=true] Indicates if base color textures will be rendered for the SceneModel when {@link Scene#colorTextureEnabled} is ````true````.
     * @param {Number} [cfg.edgeThreshold=10] When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {Number} [cfg.maxGeometryBatchSize=50000000] Maximum geometry batch size, as number of vertices. This is optionally supplied
     * to limit the size of the batched geometry arrays that SceneModel internally creates for batched geometries.
     * A lower value means less heap allocation/de-allocation while creating/loading batched geometries, but more draw calls and
     * slower rendering speed. A high value means larger heap allocation/de-allocation while creating/loading, but less draw calls
     * and faster rendering speed. It's recommended to keep this somewhere roughly between ````50000```` and ````50000000```.
     * @param {TextureTranscoder} [cfg.textureTranscoder] Transcoder that will be used internally by {@link SceneModel#createTexture}
     * to convert transcoded texture data. Only required when we'll be providing transcoded data
     * to {@link SceneModel#createTexture}. We assume that all transcoded texture data added to a  ````SceneModel````
     * will then in a format supported by this transcoder.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        console.log("Creating SceneModel");

        this._dtxEnabled = this.scene.dtx.enabled && !!cfg.dtxEnabled;

        this._enableVertexWelding = true;
        this._enableIndexBucketing = true;

        this._vboBatchingLayerScratchMemory = getScratchMemory();
        this._textureTranscoder = cfg.textureTranscoder || getKTX2TextureTranscoder(this.scene.viewer);

        this._maxGeometryBatchSize = cfg.maxGeometryBatchSize;

        this._aabb = math.collapseAABB3();
        this._aabbDirty = false;

        this._quantizationRanges = {};

        this._vboInstancingLayers = {};
        this._vboBatchingLayers = {};
        this._dtxLayers = {};

        this._layerList = []; // For GL state efficiency when drawing, InstancingLayers are in first part, BatchingLayers are in second
        this._entityList = [];

        this._geometries = {};
        this._dtxBuckets = {}; // Geometries with optimizations used for data texture representation
        this._textures = {};
        this._textureSets = {};
        this._meshes = {};
        this._entities = {};

        this._scheduledMeshes = {}
        this._scheduledEntities = [];

        /** @private **/
        this.renderFlags = new RenderFlags();

        /**
         * @private
         */
        this.numGeometries = 0; // Number of geometries created with createGeometry()

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

        this.numEntities = 0;
        this._numTriangles = 0;
        this._numLines = 0;
        this._numPoints = 0;

        this._edgeThreshold = cfg.edgeThreshold || 10;

        // Build static matrix

        this._origin = math.vec3(cfg.origin || [0, 0, 0]);
        this._position = math.vec3(cfg.position || [0, 0, 0]);
        this._rotation = math.vec3(cfg.rotation || [0, 0, 0]);
        this._quaternion = math.vec4(cfg.quaternion || [0, 0, 0, 1]);
        if (cfg.rotation) {
            math.eulerToQuaternion(this._rotation, "XYZ", this._quaternion);
        }
        this._scale = math.vec3(cfg.scale || [1, 1, 1]);
        this._sceneModelMatrix = math.mat4();
        math.composeMat4(this._position, this._quaternion, this._scale, this._sceneModelMatrix);
        this._worldNormalMatrix = math.mat4();
        math.inverseMat4(this._sceneModelMatrix, this._worldNormalMatrix);
        math.transposeMat4(this._worldNormalMatrix);

        if (cfg.matrix || cfg.position || cfg.rotation || cfg.scale || cfg.quaternion) {
            this._viewMatrix = math.mat4();
            this._viewNormalMatrix = math.mat4();
            this._viewMatrixDirty = true;
            this._sceneModelMatrixNonIdentity = true;
        }

        this._opacity = 1.0;
        this._colorize = [1, 1, 1];

        this._saoEnabled = (cfg.saoEnabled !== false);
        this._pbrEnabled = (cfg.pbrEnabled !== false);
        this._colorTextureEnabled = (cfg.colorTextureEnabled !== false);

        this._isModel = cfg.isModel;
        if (this._isModel) {
            this.scene._registerModel(this);
        }

        this._onCameraViewMatrix = this.scene.camera.on("matrix", () => {
            this._viewMatrixDirty = true;
        });

        if (this.scene.vfc.enabled) {
            this._vfcManager = this.scene.vfc.getVFCManager(this);
        }

        this._createDefaultTextureSet();

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
    }

    _createDefaultTextureSet() {
        // Every SceneModelMesh gets at least the default TextureSet,
        // which contains empty default textures filled with color
        const defaultColorTexture = new SceneModelTexture({
            id: DEFAULT_COLOR_TEXTURE_ID,
            texture: new Texture2D({
                gl: this.scene.canvas.gl,
                preloadColor: [1, 1, 1, 1] // [r, g, b, a]})
            })
        });
        const defaultMetalRoughTexture = new SceneModelTexture({
            id: DEFAULT_METAL_ROUGH_TEXTURE_ID,
            texture: new Texture2D({
                gl: this.scene.canvas.gl,
                preloadColor: [0, 1, 1, 1] // [unused, roughness, metalness, unused]
            })
        });
        const defaultNormalsTexture = new SceneModelTexture({
            id: DEFAULT_NORMALS_TEXTURE_ID,
            texture: new Texture2D({
                gl: this.scene.canvas.gl,
                preloadColor: [0, 0, 0, 0] // [x, y, z, unused] - these must be zeros
            })
        });
        const defaultEmissiveTexture = new SceneModelTexture({
            id: DEFAULT_EMISSIVE_TEXTURE_ID,
            texture: new Texture2D({
                gl: this.scene.canvas.gl,
                preloadColor: [0, 0, 0, 1] // [x, y, z, unused]
            })
        });
        const defaultOcclusionTexture = new SceneModelTexture({
            id: DEFAULT_OCCLUSION_TEXTURE_ID,
            texture: new Texture2D({
                gl: this.scene.canvas.gl,
                preloadColor: [1, 1, 1, 1] // [x, y, z, unused]
            })
        });
        this._textures[DEFAULT_COLOR_TEXTURE_ID] = defaultColorTexture;
        this._textures[DEFAULT_METAL_ROUGH_TEXTURE_ID] = defaultMetalRoughTexture;
        this._textures[DEFAULT_NORMALS_TEXTURE_ID] = defaultNormalsTexture;
        this._textures[DEFAULT_EMISSIVE_TEXTURE_ID] = defaultEmissiveTexture;
        this._textures[DEFAULT_OCCLUSION_TEXTURE_ID] = defaultOcclusionTexture;
        this._textureSets[DEFAULT_TEXTURE_SET_ID] = new SceneModelTextureSet({
            id: DEFAULT_TEXTURE_SET_ID,
            model: this,
            colorTexture: defaultColorTexture,
            metallicRoughnessTexture: defaultMetalRoughTexture,
            normalsTexture: defaultNormalsTexture,
            emissiveTexture: defaultEmissiveTexture,
            occlusionTexture: defaultOcclusionTexture
        });
    }

    //------------------------------------------------------------------------------------------------------------------
    // SceneModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that this Component is a SceneModel.
     * @type {Boolean}
     */
    get isPerformanceModel() {
        return true;
    }

    /**
     * Returns the {@link Entity}s in this SceneModel.
     * @returns {*|{}}
     */
    get objects() {
        return this._entities;
    }

    /**
     * Gets the 3D World-space origin for this SceneModel.
     *
     * Each mesh origin, if supplied, is relative to this origin.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Float64Array}
     */
    get origin() {
        return this._origin;
    }

    /**
     * Gets the SceneModel's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get position() {
        return this._position;
    }

    /**
     * Gets the SceneModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
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
     * Gets the SceneModel's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     */
    get scale() {
        return this._scale;
    }

    /**
     * Gets the SceneModel's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     */
    get matrix() {
        return this._sceneModelMatrix;
    }

    /**
     * Gets the SceneModel's World matrix.
     *
     * @property worldMatrix
     * @type {Number[]}
     */
    get worldMatrix() {
        return this._sceneModelMatrix;
    }

    /**
     * Gets the SceneModel's World normal matrix.
     *
     * @type {Number[]}
     */
    get worldNormalMatrix() {
        return this._worldNormalMatrix;
    }

    /**
     * Called by private renderers in ./lib, returns the view matrix with which to
     * render this SceneModel. The view matrix is the concatenation of the
     * Camera view matrix with the Performance model's world (modeling) matrix.
     *
     * @private
     */
    get viewMatrix() {
        if (!this._viewMatrix) {
            return this.scene.camera.viewMatrix;
        }
        if (this._viewMatrixDirty) {
            math.mulMat4(this.scene.camera.viewMatrix, this._sceneModelMatrix, this._viewMatrix);
            math.inverseMat4(this._viewMatrix, this._viewNormalMatrix);
            math.transposeMat4(this._viewNormalMatrix);
            this._viewMatrixDirty = false;
        }
        return this._viewMatrix;
    }

    /**
     * Called by private renderers in ./lib, returns the view normal matrix with which to render this SceneModel.
     *
     * @private
     */
    get viewNormalMatrix() {
        if (!this._viewNormalMatrix) {
            return this.scene.camera.viewNormalMatrix;
        }
        if (this._viewMatrixDirty) {
            math.mulMat4(this.scene.camera.viewMatrix, this._sceneModelMatrix, this._viewMatrix);
            math.inverseMat4(this._viewMatrix, this._viewNormalMatrix);
            math.transposeMat4(this._viewNormalMatrix);
            this._viewMatrixDirty = false;
        }
        return this._viewNormalMatrix;
    }

    /**
     * Sets if backfaces are rendered for this SceneModel.
     *
     * Default is ````false````.
     *
     * @type {Boolean}
     */
    get backfaces() {
        return this._backfaces;
    }

    /**
     * Sets if backfaces are rendered for this SceneModel.
     *
     * Default is ````false````.
     *
     * When we set this ````true````, then backfaces are always rendered for this SceneModel.
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
     * Gets the list of {@link Entity}s within this SceneModel.
     *
     * @returns {Entity[]}
     */
    get entityList() {
        return this._entityList;
    }

    /**
     * Returns true to indicate that SceneModel is an {@link Entity}.
     * @type {Boolean}
     */
    get isEntity() {
        return true;
    }

    /**
     * Returns ````true```` if this SceneModel represents a model.
     *
     * When ````true```` the SceneModel will be registered by {@link SceneModel#id} in
     * {@link Scene#models} and may also have a {@link MetaObject} with matching {@link MetaObject#id}.
     *
     * @type {Boolean}
     */
    get isModel() {
        return this._isModel;
    }

    //------------------------------------------------------------------------------------------------------------------
    // SceneModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns ````false```` to indicate that SceneModel never represents an object.
     *
     * @type {Boolean}
     */
    get isObject() {
        return false;
    }

    /**
     * Gets the SceneModel's World-space 3D axis-aligned bounding box.
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
     * The approximate number of triangle primitives in this SceneModel.
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
     * The approximate number of line primitives in this SceneModel.
     *
     * @type {Number}
     */
    get numLines() {
        return this._numLines;
    }

    /**
     * The approximate number of point primitives in this SceneModel.
     *
     * @type {Number}
     */
    get numPoints() {
        return this._numPoints;
    }

    /**
     * Gets if any {@link Entity}s in this SceneModel are visible.
     *
     * The SceneModel is only rendered when {@link SceneModel#visible} is ````true```` and {@link SceneModel#culled} is ````false````.
     *
     * @type {Boolean}
     */
    get visible() {
        return (this.numVisibleLayerPortions > 0);
    }

    /**
     * Sets if this SceneModel is visible.
     *
     * The SceneModel is only rendered when {@link SceneModel#visible} is ````true```` and {@link SceneModel#culled} is ````false````.
     **
     * @type {Boolean}
     */
    set visible(visible) {
        visible = visible !== false;
        this._visible = visible;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].visible = visible;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this SceneModel are xrayed.
     *
     * @type {Boolean}
     */
    get xrayed() {
        return (this.numXRayedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this SceneModel are xrayed.
     *
     * @type {Boolean}
     */
    set xrayed(xrayed) {
        xrayed = !!xrayed;
        this._xrayed = xrayed;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].xrayed = xrayed;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this SceneModel are highlighted.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return (this.numHighlightedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this SceneModel are highlighted.
     *
     * @type {Boolean}
     */
    set highlighted(highlighted) {
        highlighted = !!highlighted;
        this._highlighted = highlighted;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].highlighted = highlighted;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this SceneModel are selected.
     *
     * @type {Boolean}
     */
    get selected() {
        return (this.numSelectedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this SceneModel are selected.
     *
     * @type {Boolean}
     */
    set selected(selected) {
        selected = !!selected;
        this._selected = selected;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].selected = selected;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this SceneModel have edges emphasised.
     *
     * @type {Boolean}
     */
    get edges() {
        return (this.numEdgesLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this SceneModel have edges emphasised.
     *
     * @type {Boolean}
     */
    set edges(edges) {
        edges = !!edges;
        this._edges = edges;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].edges = edges;
        }
        this.glRedraw();
    }

    /**
     * Gets if this SceneModel is culled from view.
     *
     * The SceneModel is only rendered when {@link SceneModel#visible} is true and {@link SceneModel#culled} is false.
     *
     * @type {Boolean}
     */
    get culled() {
        return this._culled;
    }

    /**
     * Sets if this SceneModel is culled from view.
     *
     * The SceneModel is only rendered when {@link SceneModel#visible} is true and {@link SceneModel#culled} is false.
     *
     * @type {Boolean}
     */
    set culled(culled) {
        culled = !!culled;
        this._culled = culled;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].culled = culled;
        }
        this.glRedraw();
    }

    /**
     * Gets if {@link Entity}s in this SceneModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._clippable;
    }

    /**
     * Sets if {@link Entity}s in this SceneModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    set clippable(clippable) {
        clippable = clippable !== false;
        this._clippable = clippable;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].clippable = clippable;
        }
        this.glRedraw();
    }

    /**
     * Gets if this SceneModel is collidable.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._collidable;
    }

    /**
     * Sets if {@link Entity}s in this SceneModel are collidable.
     *
     * @type {Boolean}
     */
    set collidable(collidable) {
        collidable = collidable !== false;
        this._collidable = collidable;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].collidable = collidable;
        }
    }

    /**
     * Gets if this SceneModel is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    get pickable() {
        return (this.numPickableLayerPortions > 0);
    }

    /**
     * Sets if {@link Entity}s in this SceneModel are pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    set pickable(pickable) {
        pickable = pickable !== false;
        this._pickable = pickable;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].pickable = pickable;
        }
    }

    /**
     * Gets the RGB colorize color for this SceneModel.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    get colorize() {
        return this._colorize;
    }

    /**
     * Sets the RGB colorize color for this SceneModel.
     *
     * Multiplies by rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    set colorize(colorize) {
        this._colorize = colorize;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].colorize = colorize;
        }
    }

    /**
     * Gets this SceneModel's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        return this._opacity;
    }

    /**
     * Sets the opacity factor for this SceneModel.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity) {
        this._opacity = opacity;
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i].opacity = opacity;
        }
    }

    /**
     * Gets if this SceneModel casts a shadow.
     *
     * @type {Boolean}
     */
    get castsShadow() {
        return this._castsShadow;
    }

    /**
     * Sets if this SceneModel casts a shadow.
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
     * Sets if this SceneModel can have shadow cast upon it.
     *
     * @type {Boolean}
     */
    get receivesShadow() {
        return this._receivesShadow;
    }

    /**
     * Sets if this SceneModel can have shadow cast upon it.
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
     * Gets if Scalable Ambient Obscurance (SAO) will apply to this SceneModel.
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
     * Gets if physically-based rendering (PBR) is enabled for this SceneModel.
     *
     * Only works when {@link Scene#pbrEnabled} is also true.
     *
     * @type {Boolean}
     */
    get pbrEnabled() {
        return this._pbrEnabled;
    }

    /**
     * Gets if color textures are enabled for this SceneModel.
     *
     * Only works when {@link Scene#colorTextureEnabled} is also true.
     *
     * @type {Boolean}
     */
    get colorTextureEnabled() {
        return this._colorTextureEnabled;
    }

    /**
     * Returns true to indicate that SceneModel is implements {@link Drawable}.
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
     * Configures the appearance of xrayed {@link Entity}s within this SceneModel.
     *
     * This is the {@link Scene#xrayMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get xrayMaterial() {
        return this.scene.xrayMaterial;
    }

    /**
     * Configures the appearance of highlighted {@link Entity}s within this SceneModel.
     *
     * This is the {@link Scene#highlightMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get highlightMaterial() {
        return this.scene.highlightMaterial;
    }

    /**
     * Configures the appearance of selected {@link Entity}s within this SceneModel.
     *
     * This is the {@link Scene#selectedMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get selectedMaterial() {
        return this.scene.selectedMaterial;
    }

    /**
     * Configures the appearance of edges of {@link Entity}s within this SceneModel.
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
     * ray-pick on this SceneModel.
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
     *
     * @param cfg
     */
    createQuantizationRange(cfg) {
        if (cfg.id === undefined || cfg.id === null) {
            this.error("[createQuantizationRange] Config missing: id");
            return;
        }
        if (cfg.aabb) {
            this.error("[createQuantizationRange] Config missing: aabb");
            return;
        }
        if (this._quantizationRanges[cfg.id]) {
            this.error("[createQuantizationRange] QuantizationRange already created: " + cfg.id);
            return;
        }
        this._quantizationRanges[cfg.id] = {
            id: cfg.id,
            aabb: cfg.aabb,
            matrix: createPositionsDecodeMatrix(cfg.aabb, math.mat4())
        }
    }

    /**
     * Creates a reusable geometry within this SceneModel.
     *
     * We can then supply the geometry ID to {@link SceneModel#createMesh} when we want to create meshes that
     * instance the geometry.
     *
     * @param {*} cfg Geometry properties.
     * @param {String|Number} cfg.id Mandatory ID for the geometry, to refer to with {@link SceneModel#createMesh}.
     * @param {String} cfg.primitive The primitive type. Accepted values are 'points', 'lines', 'triangles', 'solid' and 'surface'.
     * @param {Number[]} [cfg.positions] Flat array of uncompressed 3D vertex positions positions. Required for all primitive types. Overridden by ````positionsCompressed````.
     * @param {Number[]} [cfg.positionsCompressed] Flat array of quantized 3D vertex positions. Overrides ````positions````, and must be accompanied by ````positionsDecodeMatrix````.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positionsCompressed````. Must be accompanied by ````positionsCompressed````.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Only used with "triangles", "solid" and "surface" primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.normalsCompressed] Flat array of oct-encoded normal vectors. Overrides ````normals````. Only used with "triangles", "solid" and "surface" primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.colors] Flat array of uncompressed RGBA vertex colors, as float values in range ````[0..1]````. Ignored when ````geometryId```` is given. Overridden by ````color```` and ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of compressed RGBA vertex colors, as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given. Overrides ````colors```` and is overridden by ````color````.
     * @param {Number[]} [cfg.uv] Flat array of uncompressed vertex UV coordinates. Only used with "triangles", "solid" and "surface" primitives. Required for textured rendering.
     * @param {Number[]} [cfg.uvCompressed] Flat array of compressed vertex UV coordinates. Only used with "triangles", "solid" and "surface" primitives. Overrides ````uv````. Must be accompanied by ````uvDecodeMatrix````. Only used with "triangles", "solid" and "surface" primitives. Required for textured rendering.
     * @param {Number[]} [cfg.uvDecodeMatrix] A 3x3 matrix for decompressing ````uvCompressed````.
     * @param {Number[]} [cfg.indices] Array of primitive connectivity indices. Not required for `points` primitives.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Used only with 'triangles', 'solid' and 'surface' primitives. Automatically generated internally if not supplied, using the optional ````edgeThreshold```` given to the ````SceneModel```` constructor.
     */
    createGeometry(cfg) {
        if (cfg.id === undefined || cfg.id === null) {
            this.error("[createGeometry] Config missing: id");
            return;
        }
        if (this._geometries[cfg.id]) {
            this.error("[createGeometry] Geometry already created: " + cfg.id);
            return;
        }
        if (cfg.primitive === undefined || cfg.primitive === null) {
            cfg.primitive = "triangles";
        }
        if (cfg.primitive !== "points" && cfg.primitive !== "lines" && cfg.primitive !== "triangles" && cfg.primitive !== "solid" && cfg.primitive !== "surface") {
            this.error(`[createGeometry] Unsupported value for 'primitive': '${primitive}' - supported values are 'points', 'lines', 'triangles', 'solid' and 'surface'. Defaulting to 'triangles'.`);
            return;
        }
        if (!cfg.positions && !cfg.positionsCompressed) {
            this.error("[createGeometry] Param expected: `positions` or `positionsCompressed'");
            return null;
        }
        if (cfg.positionsCompressed && !cfg.positionsDecodeMatrix && !cfg.positionsDecodeBoundary) {
            this.error("[createGeometry] Param expected: `positionsDecodeMatrix` or 'positionsDecodeBoundary' (required for `positionsCompressed')");
            return null;
        }
        if (cfg.positionsDecodeMatrix && cfg.positionsDecodeBoundary) {
            this.error("[createGeometry] Only one of these params expected: `positionsDecodeMatrix` or 'positionsDecodeBoundary' (required for `positionsCompressed')");
            return null;
        }
        if (cfg.uvCompressed && !cfg.uvDecodeMatrix) {
            this.error("[createGeometry] Param expected: `uvDecodeMatrix` (required for `uvCompressed')");
            return null;
        }
        if (!cfg.indices && cfg.primitive !== "points") {
            this.error(`[createGeometry] Param expected: indices (required for '${cfg.primitive}' primitive type)`);
            return null;
        }
        if (cfg.positionsDecodeBoundary) {
            cfg.positionsDecodeMatrix = createPositionsDecodeMatrix(cfg.positionsDecodeBoundary, math.mat4());
        }
        if (cfg.positions) {
            const aabb = math.collapseAABB3();
            cfg.positionsDecodeMatrix = math.mat4();
            math.expandAABB3Points3(aabb, cfg.positions);
            cfg.positionsCompressed = quantizePositions(cfg.positions, aabb, cfg.positionsDecodeMatrix);
        } else {
            cfg.positionsDecodeMatrix = new Float64Array(cfg.positionsDecodeMatrix);
            cfg.positionsCompressed = new Uint16Array(cfg.positionsCompressed);
        }
        if (cfg.colorsCompressed && cfg.colorsCompressed.length > 0) {
            cfg.colorsCompressed = new Uint8Array(cfg.colorsCompressed);
        } else if (cfg.colors && cfg.colors.length > 0) {
            const colors = cfg.colors;
            const colorsCompressed = new Uint8Array(colors.length);
            for (let i = 0, len = colors.length; i < len; i++) {
                colorsCompressed[i] = colors[i] * 255;
            }
            cfg.colorsCompressed = colorsCompressed;
        }
        if (!cfg.edgeIndices && (cfg.primitive === "triangles" || cfg.primitive === "solid" || cfg.primitive === "surface")) {
            if (cfg.positions) {
                cfg.edgeIndices = buildEdgeIndices(cfg.positions, cfg.indices, null, 5.0);
            } else {
                cfg.edgeIndices = buildEdgeIndices(cfg.positionsCompressed, cfg.indices, cfg.positionsDecodeMatrix, 2.0);
            }
        }
        if (cfg.uv) {
            const bounds = geometryCompressionUtils.getUVBounds(cfg.uv);
            const result = geometryCompressionUtils.compressUVs(cfg.uv, bounds.min, bounds.max);
            cfg.uvCompressed = result.quantized;
            cfg.uvDecodeMatrix = result.decodeMatrix;
        } else if (cfg.uvCompressed) {
            cfg.uvCompressed = new Uint16Array(cfg.uvCompressed);
            cfg.uvDecodeMatrix = new Float64Array(cfg.uvDecodeMatrix);
        }
        if (cfg.normals) { // HACK
            cfg.normals = null;
        }
        this._geometries [cfg.id] = cfg;
        this._numTriangles += (cfg.indices ? Math.round(cfg.indices.length / 3) : 0);
        this.numGeometries++;
    }

    /**
     * Creates a texture within this SceneModel.
     *
     * We can then supply the texture ID to {@link SceneModel#createTextureSet} when we want to create texture sets that use the texture.
     *
     * @param {*} cfg Texture properties.
     * @param {String|Number} cfg.id Mandatory ID for the texture, to refer to with {@link SceneModel#createTextureSet}.
     * @param {String} [cfg.src] Image file for the texture. Assumed to be transcoded if not having a recognized image file
     * extension (jpg, jpeg, png etc.). If transcoded, then assumes ````SceneModel```` is configured with a {@link TextureTranscoder}.
     * @param {ArrayBuffer[]} [cfg.buffers] Transcoded texture data. Assumes ````SceneModel```` is
     * configured with a {@link TextureTranscoder}. This parameter is given as an array of buffers so we can potentially support multi-image textures, such as cube maps.
     * @param {HTMLImageElement} [cfg.image] HTML Image object to load into this texture. Overrides ````src```` and ````buffers````. Never transcoded.
     * @param {Number} [cfg.minFilter=LinearMipmapLinearFilter] How the texture is sampled when a texel covers less than one pixel.
     * Supported values are {@link LinearMipmapLinearFilter}, {@link LinearMipMapNearestFilter}, {@link NearestMipMapNearestFilter}, {@link NearestMipMapLinearFilter} and {@link LinearMipMapLinearFilter}.
     * @param {Number} [cfg.magFilter=LinearFilter] How the texture is sampled when a texel covers more than one pixel. Supported values are {@link LinearFilter} and {@link NearestFilter}.
     * @param {Number} [cfg.wrapS=RepeatWrapping] Wrap parameter for texture coordinate *S*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}.
     * @param {Number} [cfg.wrapT=RepeatWrapping] Wrap parameter for texture coordinate *T*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}..
     * @param {Number} [cfg.wrapR=RepeatWrapping] Wrap parameter for texture coordinate *R*. Supported values are {@link ClampToEdgeWrapping}, {@link MirroredRepeatWrapping} and {@link RepeatWrapping}.
     * @param {Boolean} [cfg.flipY=false] Flips this Texture's source data along its vertical axis when ````true````.
     * @param  {Number} [cfg.encoding=LinearEncoding] Encoding format. Supported values are {@link LinearEncoding} and {@link sRGBEncoding}.
     */
    createTexture(cfg) {
        const textureId = cfg.id;
        if (textureId === undefined || textureId === null) {
            this.error("[createTexture] Config missing: id");
            return;
        }
        if (this._textures[textureId]) {
            this.error("[createTexture] Texture already created: " + textureId);
            return;
        }
        if (!cfg.src && !cfg.image && !cfg.buffers) {
            this.error("[createTexture] Param expected: `src`, `image' or 'buffers'");
            return null;
        }
        let minFilter = cfg.minFilter || LinearMipmapLinearFilter;
        if (minFilter !== LinearFilter &&
            minFilter !== LinearMipMapNearestFilter &&
            minFilter !== LinearMipmapLinearFilter &&
            minFilter !== NearestMipMapLinearFilter &&
            minFilter !== NearestMipMapNearestFilter) {
            this.error(`[createTexture] Unsupported value for 'minFilter' - 
            supported values are LinearFilter, LinearMipMapNearestFilter, NearestMipMapNearestFilter, 
            NearestMipMapLinearFilter and LinearMipmapLinearFilter. Defaulting to LinearMipmapLinearFilter.`);
            minFilter = LinearMipmapLinearFilter;
        }
        let magFilter = cfg.magFilter || LinearFilter;
        if (magFilter !== LinearFilter && magFilter !== NearestFilter) {
            this.error(`[createTexture] Unsupported value for 'magFilter' - supported values are LinearFilter and NearestFilter. Defaulting to LinearFilter.`);
            magFilter = LinearFilter;
        }
        let wrapS = cfg.wrapS || RepeatWrapping;
        if (wrapS !== ClampToEdgeWrapping && wrapS !== MirroredRepeatWrapping && wrapS !== RepeatWrapping) {
            this.error(`[createTexture] Unsupported value for 'wrapS' - supported values are ClampToEdgeWrapping, MirroredRepeatWrapping and RepeatWrapping. Defaulting to RepeatWrapping.`);
            wrapS = RepeatWrapping;
        }
        let wrapT = cfg.wrapT || RepeatWrapping;
        if (wrapT !== ClampToEdgeWrapping && wrapT !== MirroredRepeatWrapping && wrapT !== RepeatWrapping) {
            this.error(`[createTexture] Unsupported value for 'wrapT' - supported values are ClampToEdgeWrapping, MirroredRepeatWrapping and RepeatWrapping. Defaulting to RepeatWrapping.`);
            wrapT = RepeatWrapping;
        }
        let wrapR = cfg.wrapR || RepeatWrapping;
        if (wrapR !== ClampToEdgeWrapping && wrapR !== MirroredRepeatWrapping && wrapR !== RepeatWrapping) {
            this.error(`[createTexture] Unsupported value for 'wrapR' - supported values are ClampToEdgeWrapping, MirroredRepeatWrapping and RepeatWrapping. Defaulting to RepeatWrapping.`);
            wrapR = RepeatWrapping;
        }
        let encoding = cfg.encoding || LinearEncoding;
        if (encoding !== LinearEncoding && encoding !== sRGBEncoding) {
            this.error("[createTexture] Unsupported value for 'encoding' - supported values are LinearEncoding and sRGBEncoding. Defaulting to LinearEncoding.");
            encoding = LinearEncoding;
        }
        const texture = new Texture2D({
            gl: this.scene.canvas.gl,
            minFilter,
            magFilter,
            wrapS,
            wrapT,
            wrapR,
            // flipY: cfg.flipY,
            encoding
        });
        if (cfg.preloadColor) {
            texture.setPreloadColor(cfg.preloadColor);
        }
        if (cfg.image) { // Ignore transcoder for Images
            const image = cfg.image;
            image.crossOrigin = "Anonymous";
            texture.setImage(image, {minFilter, magFilter, wrapS, wrapT, wrapR, flipY: cfg.flipY, encoding});
        } else if (cfg.src) {
            const ext = cfg.src.split('.').pop();
            switch (ext) { // Don't transcode recognized image file types
                case "jpeg":
                case "jpg":
                case "png":
                case "gif":
                    const image = new Image();
                    image.onload = () => {
                        texture.setImage(image, {
                            minFilter,
                            magFilter,
                            wrapS,
                            wrapT,
                            wrapR,
                            flipY: cfg.flipY,
                            encoding
                        });
                        this.glRedraw();
                    };
                    image.src = cfg.src; // URL or Base64 string
                    break;
                default: // Assume other file types need transcoding
                    if (!this._textureTranscoder) {
                        this.error(`[createTexture] Can't create texture from 'src' - SceneModel needs to be configured with a TextureTranscoder for this file type ('${ext}')`);
                    } else {
                        utils.loadArraybuffer(cfg.src, (arrayBuffer) => {
                                if (!arrayBuffer.byteLength) {
                                    this.error(`[createTexture] Can't create texture from 'src': file data is zero length`);
                                    return;
                                }
                                this._textureTranscoder.transcode([arrayBuffer], texture).then(() => {
                                    this.glRedraw();
                                });
                            },
                            function (errMsg) {
                                this.error(`[createTexture] Can't create texture from 'src': ${errMsg}`);
                            });
                    }
                    break;
            }
        } else if (cfg.buffers) { // Buffers implicitly require transcoding
            if (!this._textureTranscoder) {
                this.error(`[createTexture] Can't create texture from 'buffers' - SceneModel needs to be configured with a TextureTranscoder for this option`);
            } else {
                this._textureTranscoder.transcode(cfg.buffers, texture).then(() => {
                    this.glRedraw();
                });
            }
        }
        this._textures[textureId] = new SceneModelTexture({id: textureId, texture});
    }

    /**
     * Creates a texture set within this SceneModel.
     *
     * A texture set is a collection of textures that can be shared among meshes. We can then supply the texture set
     * ID to {@link SceneModel#createMesh} when we want to create meshes that use the texture set.
     *
     * The textures can work as a texture atlas, where each mesh can have geometry UVs that index
     * a different part of the textures. This allows us to minimize the number of textures in our models, which
     * means faster rendering.
     *
     * @param {*} cfg Texture set properties.
     * @param {String|Number} cfg.id Mandatory ID for the texture set, to refer to with {@link SceneModel#createMesh}.
     * @param {*} [cfg.colorTextureId] ID of *RGBA* base color texture, with color in *RGB* and alpha in *A*.
     * @param {*} [cfg.metallicRoughnessTextureId] ID of *RGBA* metal-roughness texture, with the metallic factor in *R*, and roughness factor in *G*.
     * @param {*} [cfg.normalsTextureId] ID of *RGBA* normal map texture, with normal map vectors in *RGB*.
     * @param {*} [cfg.emissiveTextureId] ID of *RGBA* emissive map texture, with emissive color in *RGB*.
     * @param {*} [cfg.occlusionTextureId] ID of *RGBA* occlusion map texture, with occlusion factor in *R*.
     */
    createTextureSet(cfg) {
        const textureSetId = cfg.id;
        if (textureSetId === undefined || textureSetId === null) {
            this.error("[createTextureSet] Config missing: id");
            return;
        }
        if (this._textureSets[textureSetId]) {
            this.error(`[createTextureSet] Texture set already created: ${textureSetId}`);
            return;
        }
        let colorTexture;
        if (cfg.colorTextureId !== undefined && cfg.colorTextureId !== null) {
            colorTexture = this._textures[cfg.colorTextureId];
            if (!colorTexture) {
                this.error(`[createTextureSet] Texture not found: ${cfg.colorTextureId} - ensure that you create it first with createTexture()`);
                return;
            }
        } else {
            colorTexture = this._textures[DEFAULT_COLOR_TEXTURE_ID];
        }
        let metallicRoughnessTexture;
        if (cfg.metallicRoughnessTextureId !== undefined && cfg.metallicRoughnessTextureId !== null) {
            metallicRoughnessTexture = this._textures[cfg.metallicRoughnessTextureId];
            if (!metallicRoughnessTexture) {
                this.error(`[createTextureSet] Texture not found: ${cfg.metallicRoughnessTextureId} - ensure that you create it first with createTexture()`);
                return;
            }
        } else {
            metallicRoughnessTexture = this._textures[DEFAULT_METAL_ROUGH_TEXTURE_ID];
        }
        let normalsTexture;
        if (cfg.normalsTextureId !== undefined && cfg.normalsTextureId !== null) {
            normalsTexture = this._textures[cfg.normalsTextureId];
            if (!normalsTexture) {
                this.error(`[createTextureSet] Texture not found: ${cfg.normalsTextureId} - ensure that you create it first with createTexture()`);
                return;
            }
        } else {
            normalsTexture = this._textures[DEFAULT_NORMALS_TEXTURE_ID];
        }
        let emissiveTexture;
        if (cfg.emissiveTextureId !== undefined && cfg.emissiveTextureId !== null) {
            emissiveTexture = this._textures[cfg.emissiveTextureId];
            if (!emissiveTexture) {
                this.error(`[createTextureSet] Texture not found: ${cfg.emissiveTextureId} - ensure that you create it first with createTexture()`);
                return;
            }
        } else {
            emissiveTexture = this._textures[DEFAULT_EMISSIVE_TEXTURE_ID];
        }
        let occlusionTexture;
        if (cfg.occlusionTextureId !== undefined && cfg.occlusionTextureId !== null) {
            occlusionTexture = this._textures[cfg.occlusionTextureId];
            if (!occlusionTexture) {
                this.error(`[createTextureSet] Texture not found: ${cfg.occlusionTextureId} - ensure that you create it first with createTexture()`);
                return;
            }
        } else {
            occlusionTexture = this._textures[DEFAULT_OCCLUSION_TEXTURE_ID];
        }
        const textureSet = new SceneModelTextureSet({
            id: textureSetId,
            model: this,
            colorTexture,
            metallicRoughnessTexture,
            normalsTexture,
            emissiveTexture,
            occlusionTexture
        });
        this._textureSets[textureSetId] = textureSet;
    }

    /**
     * Creates a mesh within this SceneModel.
     *
     * A mesh can either define its own geometry or share it with other meshes. To define own geometry, provide the
     * various geometry arrays to this method. To share a geometry, provide the ID of a geometry created earlier
     * with {@link SceneModel#createGeometry}.
     *
     * Internally, SceneModel will batch all unique mesh geometries into the same arrays, which improves
     * rendering performance.
     *
     * If you accompany the arrays with an  ````origin````, then ````createMesh()```` will assume
     * that the ````positions```` are in relative-to-center (RTC) coordinates, with ````origin```` being the origin of their
     * RTC coordinate system.
     *
     * @param {object} cfg Object properties.
     * @param {String} cfg.id Mandatory ID for the new mesh. Must not clash with any existing components within the {@link Scene}.
     * @param {String|Number} [cfg.textureSetId] ID of a texture set previously created with {@link SceneModel#createTextureSet"}.
     * @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link SceneModel#createGeometry"}. Overrides all other geometry parameters given to this method.
     * @param {String} cfg.primitive The primitive type. Accepted values are 'points', 'lines', 'triangles', 'solid' and 'surface'.
     * @param {Number[]} [cfg.positions] Flat array of uncompressed 3D vertex positions positions. Required for all primitive types. Overridden by ````positionsCompressed````.
     * @param {Number[]} [cfg.positionsCompressed] Flat array of quantized 3D vertex positions. Overrides ````positions````, and must be accompanied by ````positionsDecodeMatrix````.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positionsCompressed````. Must be accompanied by ````positionsCompressed````.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Only used with "triangles", "solid" and "surface" primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.normalsCompressed] Flat array of oct-encoded normal vectors. Overrides ````normals````. Only used with "triangles", "solid" and "surface" primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.colors] Flat array of uncompressed RGBA vertex colors, as float values in range ````[0..1]````. Ignored when ````geometryId```` is given. Overridden by ````color```` and ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of compressed RGBA vertex colors, as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given. Overrides ````colors```` and is overridden by ````color````.
     * @param {Number[]} [cfg.uv] Flat array of uncompressed vertex UV coordinates. Only used with "triangles", "solid" and "surface" primitives. Required for textured rendering.
     * @param {Number[]} [cfg.uvCompressed] Flat array of compressed vertex UV coordinates. Only used with "triangles", "solid" and "surface" primitives. Overrides ````uv````. Must be accompanied by ````uvDecodeMatrix````. Only used with "triangles", "solid" and "surface" primitives. Required for textured rendering.
     * @param {Number[]} [cfg.uvDecodeMatrix] A 3x3 matrix for decompressing ````uvCompressed````.
     * @param {Number[]} [cfg.indices] Array of primitive connectivity indices. Not required for `points` primitives.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Used only with 'triangles', 'solid' and 'surface' primitives. Automatically generated internally if not supplied, using the optional ````edgeThreshold```` given to the ````SceneModel```` constructor.
     * @param {Number[]} [cfg.origin] Optional geometry origin, relative to {@link SceneModel#origin}. When this is given, then ````positions```` are assumed to be relative to this.
     * @param {Number[]} [cfg.position=[0,0,0]] Local 3D position of the mesh.
     * @param {Number[]} [cfg.scale=[1,1,1]] Scale of the mesh.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Rotation of the mesh as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Mesh modelling transform matrix. Overrides the ````position````, ````scale```` and ````rotation```` parameters.
     * @param {Number[]} [cfg.color=[1,1,1]] RGB color in range ````[0..1, 0..1, 0..1]````. Overridden by texture set ````colorTexture````. Overrides ````colors```` and ````colorsCompressed````.
     * @param {Number} [cfg.opacity=1] Opacity in range ````[0..1]````. Overridden by texture set ````colorTexture````.
     * @param {Number} [cfg.metallic=0] Metallic factor in range ````[0..1]````. Overridden by texture set ````metallicRoughnessTexture````.
     * @param {Number} [cfg.roughness=1] Roughness factor in range ````[0..1]````. Overridden by texture set ````metallicRoughnessTexture````.
     */
    createMesh(cfg) {

        if (cfg.id === undefined || cfg.id === null) {
            this.error("[createMesh] SceneModel.createMesh() config missing: id");
            return;
        }

        if (this._scheduledMeshes[cfg.id]) {
            this.error(`[createMesh] SceneModel already has a mesh with this ID: ${cfg.id}`);
            return;
        }

        const instancing = (cfg.geometryId !== undefined);
        const batching = !instancing;

        cfg.sceneModelMatrix = this._sceneModelMatrixNonIdentity ? this._sceneModelMatrix : null;

        if (batching) {

            // Batched geometry

            const useDTX = !!this._dtxEnabled; // Data textures - disabled by default for now

            if (cfg.primitive === undefined || cfg.primitive === null) {
                cfg.primitive = "triangles";
            }
            if (cfg.primitive !== "points" && cfg.primitive !== "lines" && cfg.primitive !== "triangles" && cfg.primitive !== "solid" && cfg.primitive !== "surface") {
                this.error(`Unsupported value for 'primitive': '${primitive}'  ('geometryId' is absent) - supported values are 'points', 'lines', 'triangles', 'solid' and 'surface'.`);
                return;
            }
            if (!cfg.positions && !cfg.positionsCompressed) {
                this.error("Param expected: 'positions' or 'positionsCompressed'  ('geometryId' is absent)");
                return null;
            }
            if (cfg.positions && (cfg.positionsDecodeMatrix || cfg.positionsDecodeBoundary)) {
                this.error("Illegal params: 'positions' not expected with 'positionsDecodeMatrix'/'positionsDecodeBoundary' ('geometryId' is absent)");
                return null;
            }
            if (cfg.positionsCompressed && !cfg.positionsDecodeMatrix && !cfg.positionsDecodeBoundary) {
                this.error("Param expected: 'positionsCompressed' should be accompanied by 'positionsDecodeMatrix'/'positionsDecodeBoundary' ('geometryId' is absent)");
                return null;
            }
            if (cfg.uvCompressed && !cfg.uvDecodeMatrix) {
                this.error("Param expected: 'uvCompressed' should be accompanied by `uvDecodeMatrix` ('geometryId' is absent)");
                return null;
            }
            if (!cfg.indices && cfg.primitive !== "points") {
                this.error(`Param expected: indices (required for '${cfg.primitive}' primitive type)`);
                return null;
            }
            if ((cfg.matrix || cfg.position || cfg.rotation || cfg.scale) && (cfg.positionsCompressed || cfg.positionsDecodeBoundary)) {
                this.error("Unexpected params: 'matrix', 'rotation', 'scale', 'position' not allowed with 'positionsCompressed'");
                return null;
            }
            cfg.origin = cfg.origin ? math.addVec3(this._origin, cfg.origin, tempVec3a) : this._origin;

            // Matrix

            if (cfg.matrix) {
                cfg.meshMatrix = cfg.matrix;
            } else {
                const scale = cfg.scale || DEFAULT_SCALE;
                const position = cfg.position || DEFAULT_POSITION;
                const rotation = cfg.rotation || DEFAULT_ROTATION;
                math.eulerToQuaternion(rotation, "XYZ", DEFAULT_QUATERNION);
                cfg.meshMatrix = math.composeMat4(position, DEFAULT_QUATERNION, scale, tempMat4);
            }
            if (cfg.positionsDecodeBoundary) {
                cfg.positionsDecodeMatrix = createPositionsDecodeMatrix(cfg.positionsDecodeBoundary, math.mat4());
            }
            if (useDTX) {

                // DTX

                cfg.type = DTX;

                // NPR

                cfg.color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : [255, 255, 255];
                cfg.opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;

                if (cfg.positions) {
                    const rtcCenter = math.vec3();
                    const rtcPositions = [];
                    const rtcNeeded = worldToRTCPositions(cfg.positions, rtcPositions, rtcCenter);
                    if (rtcNeeded) {

                        // RTC

                        cfg.positions = rtcPositions;
                        cfg.origin = math.addVec3(cfg.origin, rtcCenter, rtcCenter);
                    }
                }

                if (cfg.positions) {
                    const aabb = math.collapseAABB3();
                    cfg.positionsDecodeMatrix = math.mat4();
                    math.expandAABB3Points3(aabb, cfg.positions);
                    cfg.positionsCompressed = quantizePositions(cfg.positions, aabb, cfg.positionsDecodeMatrix)
                }

                if (!cfg.edgeIndices && (cfg.primitive === "triangles" || cfg.primitive === "solid" || cfg.primitive === "surface")) {
                    if (cfg.positions) {
                        cfg.edgeIndices = buildEdgeIndices(cfg.positions, cfg.indices, null, 2.0);
                    } else {
                        cfg.edgeIndices = buildEdgeIndices(cfg.positionsCompressed, cfg.indices, cfg.positionsDecodeMatrix, 2.0);
                    }
                }

                cfg.buckets = createDTXBuckets(cfg,
                    this.scene.dtx.vertexWeldingEnabled && this._enableVertexWelding,
                    this.scene.dtx.indexBucketingEnabled && this._enableIndexBucketing);

            } else {

                // VBO

                cfg.type = VBO_BATCHED;

                // PBR

                cfg.color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : [255, 255, 255];
                cfg.opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;
                cfg.metallic = (cfg.metallic !== undefined && cfg.metallic !== null) ? Math.floor(cfg.metallic * 255) : 0;
                cfg.roughness = (cfg.roughness !== undefined && cfg.roughness !== null) ? Math.floor(cfg.roughness * 255) : 255;

                // Matrix

                if (cfg.matrix) {
                    cfg.meshMatrix = cfg.matrix;
                } else {
                    const scale = cfg.scale || DEFAULT_SCALE;
                    const position = cfg.position || DEFAULT_POSITION;
                    const rotation = cfg.rotation || DEFAULT_ROTATION;
                    math.eulerToQuaternion(rotation, "XYZ", DEFAULT_QUATERNION);
                    cfg.meshMatrix = math.composeMat4(position, DEFAULT_QUATERNION, scale, math.mat4());
                }

                // Geometry

                if (cfg.positions) {

                    const rtcCenter = math.vec3();
                    const rtcPositions = [];
                    const rtcNeeded = worldToRTCPositions(cfg.positions, rtcPositions, rtcCenter);
                    if (rtcNeeded) {

                        // RTC

                        cfg.positions = rtcPositions;
                        cfg.origin = math.addVec3(cfg.origin, rtcCenter, rtcCenter);
                    }
                }

                if (!cfg.edgeIndices && (cfg.primitive === "triangles" || cfg.primitive === "solid" || cfg.primitive === "surface")) {
                    if (cfg.positions) {
                        cfg.edgeIndices = buildEdgeIndices(cfg.positions, cfg.indices, null, 2.0);
                    } else {
                        cfg.edgeIndices = buildEdgeIndices(cfg.positionsCompressed, cfg.indices, cfg.positionsDecodeMatrix, 2.0);
                    }
                }

                // if (cfg.normals) { // HACK
                //     cfg.normals = null;
                // }

                // Texture

               // cfg.textureSetId = cfg.textureSetId || DEFAULT_TEXTURE_SET_ID;
                if (cfg.textureSetId) {
                    cfg.textureSet = this._textureSets[cfg.textureSetId];
                    if (!cfg.textureSet) {
                        this.error(`[createMesh] Texture set not found: ${cfg.textureSetId} - ensure that you create it first with createTextureSet()`);
                        return;
                    }
                }
            }

        } else {

            // Reused geometry

            if (cfg.positions || cfg.positionsCompressed || cfg.indices || cfg.edgeIndices || cfg.normals || cfg.normalsCompressed || cfg.uv || cfg.uvCompressed || cfg.positionsDecodeMatrix) {
                this.error(`Mesh geometry parameters not expected when instancing a geometry (not expected: positions, positionsCompressed, indices, edgeIndices, normals, normalsCompressed, uv, uvCompressed, positionsDecodeMatrix)`);
                return;
            }

            cfg.geometry = this._geometries[cfg.geometryId];
            if (!cfg.geometry) {
                this.error(`[createMesh] Geometry not found: ${cfg.geometryId} - ensure that you create it first with createGeometry()`);
                return;
            }

            cfg.origin = cfg.origin ? math.addVec3(this._origin, cfg.origin, tempVec3a) : this._origin;
            cfg.positionsDecodeMatrix = cfg.geometry.positionsDecodeMatrix;

            // Matrix

            if (cfg.matrix) {
                cfg.meshMatrix = cfg.matrix;
            } else {
                const scale = cfg.scale || DEFAULT_SCALE;
                const position = cfg.position || DEFAULT_POSITION;
                const rotation = cfg.rotation || DEFAULT_ROTATION;
                math.eulerToQuaternion(rotation, "XYZ", DEFAULT_QUATERNION);
                cfg.meshMatrix = math.composeMat4(position, DEFAULT_QUATERNION, scale, math.mat4());
            }

            const useDTX = !!this._dtxEnabled; // Data textures - disabled by default for now

            if (useDTX) {

                // DTX

                cfg.type = DTX;

                // NPR

                cfg.color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : [255, 255, 255];
                cfg.opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;

                // Buckets

                let buckets = this._dtxBuckets[cfg.geometryId];
                if (!buckets) {
                    buckets = createDTXBuckets(cfg.geometry,
                        this.scene.dtx.vertexWeldingEnabled && this._enableVertexWelding,
                        this.scene.dtx.indexBucketingEnabled && this._enableIndexBucketing);
                    this._dtxBuckets[cfg.geometryId] = buckets;
                }
                cfg.buckets = buckets;

            } else {

                // VBO

                cfg.type = VBO_INSTANCED;

                // PBR

                cfg.color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : [255, 255, 255];
                cfg.opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;
                cfg.metallic = (cfg.metallic !== undefined && cfg.metallic !== null) ? Math.floor(cfg.metallic * 255) : 0;
                cfg.roughness = (cfg.roughness !== undefined && cfg.roughness !== null) ? Math.floor(cfg.roughness * 255) : 255;

                // Texture

             //   cfg.textureSetId = cfg.textureSetId || DEFAULT_TEXTURE_SET_ID;
                if (cfg.textureSetId) {
                    cfg.textureSet = this._textureSets[cfg.textureSetId];
                    // if (!cfg.textureSet) {
                    //     this.error(`[createMesh] Texture set not found: ${cfg.textureSetId} - ensure that you create it first with createTextureSet()`);
                    //     return;
                    // }
                }

                // OBB

                createGeometryOBB(cfg.geometry)
            }
        }

        cfg.numPrimitives = this._getNumPrimitives(cfg);


        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // For VCF cull
        //  cfg.aabb = cfg.worldAABB; /// Hack for VBOInstancing layer
        //////////////////////////////////////////////////////////////////////////////////////////////////////////

        if (this._vfcManager && !this._vfcManager.finalized) {
            // if (cfg.color) {
            //     cfg.color = cfg.color.slice ();
            // }
            // if (cfg.positionsDecodeMatrix) {
            //     cfg.positionsDecodeMatrix = cfg.positionsDecodeMatrix.slice ();
            // }
            this._vfcManager.addMesh(cfg);
        } else {
            cfg.meshMatrix = cfg.meshMatrix.slice();
            this._createMesh(cfg);
        }
    }

    _createMesh(cfg) {

        const mesh = new SceneModelMesh(this, cfg.id, cfg.color, cfg.opacity);

        mesh.pickId = this.scene._renderer.getPickID(mesh);

        const pickId = mesh.pickId;
        const a = pickId >> 24 & 0xFF;
        const b = pickId >> 16 & 0xFF;
        const g = pickId >> 8 & 0xFF;
        const r = pickId & 0xFF;

        cfg.pickColor = new Uint8Array([r, g, b, a]); // Quantized pick color
        cfg.worldAABB = math.collapseAABB3();

        cfg.aabb = cfg.worldAABB; /// Hack for VBOInstancing layer
        // cfg.opacity = 255;
        //cfg.sceneModelMatrix = math.identityMat4()
        // cfg.meshMatrix = math.identityMat4();
        if (cfg.color) {
            cfg.color = cfg.color.slice();
        }
        if (cfg.positionsDecodeMatrix) {
            cfg.positionsDecodeMatrix = cfg.positionsDecodeMatrix.slice();
        }
        cfg.solid = (cfg.primitive === "solid");
        mesh.origin = cfg.origin;
        switch (cfg.type) {
            case DTX:
                cfg.meshMatrix = cfg.meshMatrix.slice();
                //cfg.meshMatrix = null;
                mesh.layer = this._getDTXLayer(cfg);
                mesh.portionId = mesh.layer.createPortion(cfg);
                break;
            case VBO_BATCHED:
                // cfg.meshMatrix = cfg.meshMatrix.slice();
                // cfg.sceneModelMatrix = cfg.sceneModelMatrix.slice();
                mesh.layer = this._getVBOBatchingLayer(cfg);
                mesh.portionId = mesh.layer.createPortion(cfg);
                break;
            case VBO_INSTANCED:
                mesh.layer = this._getVBOInstancingLayer(cfg);
                mesh.portionId = mesh.layer.createPortion(cfg);
                break;
        }
        mesh.aabb = cfg.worldAABB;
        mesh.numPrimitives = cfg.numPrimitives;
        math.expandAABB3(this._aabb, mesh.aabb);
        this._meshes[cfg.id] = mesh;
    }

    _getNumPrimitives(cfg) {
        let countIndices = 0;
        const primitive = cfg.geometry ? cfg.geometry.primitive : cfg.primitive;
        switch (primitive) {
            case "triangles":
            case "solid":
            case "surface":
                switch (cfg.type) {
                    case DTX:
                        for (let i = 0, len = cfg.buckets.length; i < len; i++) {
                            countIndices += cfg.buckets[i].indices.length;
                        }
                        break;
                    case VBO_BATCHED:
                        countIndices += cfg.indices.length;
                        break;
                    case VBO_INSTANCED:
                        countIndices += cfg.geometry.indices.length;
                        break;
                }
                return Math.round(countIndices / 3);
            case "points":
                switch (cfg.type) {
                    case DTX:
                        for (let i = 0, len = cfg.buckets.length; i < len; i++) {
                            countIndices += cfg.buckets[i].positionsCompressed.length;
                        }
                        break;
                    case VBO_BATCHED:
                        countIndices += cfg.positions ? cfg.positions.length : cfg.positionsCompressed.length;
                        break;
                    case VBO_INSTANCED:
                        countIndices += cfg.positions ? cfg.positions.length : cfg.positionsCompressed.length;
                        break;
                }
                return Math.round(countIndices);
            case "lines":
            case "line-strip":
                switch (cfg.type) {
                    case DTX:
                        for (let i = 0, len = cfg.buckets.length; i < len; i++) {
                            countIndices += cfg.buckets[i].indices.length;
                        }
                        break;
                    case VBO_BATCHED:
                        countIndices += cfg.indices.length;
                        break;
                    case VBO_INSTANCED:
                        countIndices += cfg.geometry.indices.length;
                        break;
                }
                return Math.round(countIndices / 2);
        }
        return 0;
    }

    _getDTXLayer(cfg) {
        const origin = cfg.origin;
        const layerId = `${origin[0]}.${origin[1]}.${origin[2]}`;
        let dtxLayer = this._dtxLayers[layerId];
        if (dtxLayer) {
            if (!dtxLayer.canCreatePortion(cfg)) {
                dtxLayer.finalize();
                delete this._dtxLayers[layerId];
                dtxLayer = null;
            } else {
                return dtxLayer;
            }
        }
        dtxLayer = new TrianglesDataTextureLayer(this, {layerIndex: 0, origin}); // layerIndex is set in #finalize()
        this._dtxLayers[layerId] = dtxLayer;
        this._layerList.push(dtxLayer);
        return dtxLayer;
    }

    _getVBOBatchingLayer(cfg) {
        const model = this;
        const origin = cfg.origin;
        const positionsDecodeHash = cfg.positionsDecodeMatrix || cfg.positionsDecodeBoundary ?
            this._createHashStringFromMatrix(cfg.positionsDecodeMatrix || cfg.positionsDecodeBoundary)
            : "-";
        const textureSetId = cfg.textureSetId || "";
        const layerId = `${origin[0]}.${origin[1]}.${origin[2]}.${cfg.primitive}.${positionsDecodeHash}.${textureSetId}`;
        let vboBatchingLayer = this._vboBatchingLayers[layerId];
        if (vboBatchingLayer) {
            return vboBatchingLayer;
        }
        let textureSet = cfg.textureSet;
        while (!vboBatchingLayer) {
            switch (cfg.primitive) {
                case "triangles":
                    vboBatchingLayer = new TrianglesBatchingLayer({
                        model,
                        textureSet,
                        layerIndex: 0, // This is set in #finalize()
                        scratchMemory: this._vboBatchingLayerScratchMemory,
                        positionsDecodeMatrix: cfg.positionsDecodeMatrix,  // Can be undefined
                        uvDecodeMatrix: cfg.uvDecodeMatrix, // Can be undefined
                        origin,
                        maxGeometryBatchSize: this._maxGeometryBatchSize,
                        solid: (cfg.primitive === "solid"),
                        autoNormals: true
                    });
                    break;
                case "solid":
                    vboBatchingLayer = new TrianglesBatchingLayer({
                        model,
                        textureSet,
                        layerIndex: 0, // This is set in #finalize()
                        scratchMemory: this._vboBatchingLayerScratchMemory,
                        positionsDecodeMatrix: cfg.positionsDecodeMatrix,  // Can be undefined
                        uvDecodeMatrix: cfg.uvDecodeMatrix, // Can be undefined
                        origin,
                        maxGeometryBatchSize: this._maxGeometryBatchSize,
                        solid: (cfg.primitive === "solid"),
                        autoNormals: true
                    });
                    break;
                case "surface":
                    vboBatchingLayer = new TrianglesBatchingLayer({
                        model,
                        textureSet,
                        layerIndex: 0, // This is set in #finalize()
                        scratchMemory: this._vboBatchingLayerScratchMemory,
                        positionsDecodeMatrix: cfg.positionsDecodeMatrix,  // Can be undefined
                        uvDecodeMatrix: cfg.uvDecodeMatrix, // Can be undefined
                        origin,
                        maxGeometryBatchSize: this._maxGeometryBatchSize,
                        solid: (cfg.primitive === "solid"),
                        autoNormals: true
                    });
                    break;
                case "lines":
                    vboBatchingLayer = new LinesBatchingLayer({
                        model,
                        layerIndex: 0, // This is set in #finalize()
                        scratchMemory: this._vboBatchingLayerScratchMemory,
                        positionsDecodeMatrix: cfg.positionsDecodeMatrix,  // Can be undefined
                        uvDecodeMatrix: cfg.uvDecodeMatrix, // Can be undefined
                        origin,
                        maxGeometryBatchSize: this._maxGeometryBatchSize
                    });
                    break;
                case "points":
                    vboBatchingLayer = new PointsBatchingLayer({
                        model,
                        layerIndex: 0, // This is set in #finalize()
                        scratchMemory: this._vboBatchingLayerScratchMemory,
                        positionsDecodeMatrix: cfg.positionsDecodeMatrix,  // Can be undefined
                        uvDecodeMatrix: cfg.uvDecodeMatrix, // Can be undefined
                        origin,
                        maxGeometryBatchSize: this._maxGeometryBatchSize
                    });
                    break;
            }
            const lenPositions = cfg.positionsCompressed ? cfg.positionsCompressed.length : cfg.positions.length;
            const canCreatePortion = (cfg.primitive === "points")
                ? vboBatchingLayer.canCreatePortion(lenPositions)
                : vboBatchingLayer.canCreatePortion(lenPositions, cfg.indices.length);
            if (!canCreatePortion) {
                vboBatchingLayer.finalize();
                delete this._vboBatchingLayers[layerId];
                vboBatchingLayer = null;

            }
        }
        this._vboBatchingLayers[layerId] = vboBatchingLayer;
        this._layerList.push(vboBatchingLayer);
        return vboBatchingLayer;
    }

    _createHashStringFromMatrix(matrix) {
        const matrixString = matrix.join('');
        let hash = 0;
        for (let i = 0; i < matrixString.length; i++) {
            const char = matrixString.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0; // Convert to 32-bit integer
        }
        const hashString = (hash >>> 0).toString(16);
        return hashString;
    }

    _getVBOInstancingLayer(cfg) {
        const model = this;
        const origin = cfg.origin;
        const textureSetId = cfg.textureSetId;
        const geometryId = cfg.geometryId;
        const layerId = `${origin[0]}.${origin[1]}.${origin[2]}.${textureSetId}.${geometryId}`;
        let vboInstancingLayer = this._vboInstancingLayers[layerId];
        if (vboInstancingLayer) {
            return vboInstancingLayer;
        }
        let textureSet = cfg.textureSet;
        const geometry = cfg.geometry;
        while (!vboInstancingLayer) {
            switch (geometry.primitive) {
                case "triangles":
                    vboInstancingLayer = new TrianglesInstancingLayer({
                        model,
                        textureSet,
                        geometry,
                        origin,
                        layerIndex: 0,
                        solid: false
                    });
                    break;
                case "solid":
                    vboInstancingLayer = new TrianglesInstancingLayer({
                        model,
                        textureSet,
                        geometry,
                        origin,
                        layerIndex: 0,
                        solid: true
                    });
                    break;
                case "surface":
                    vboInstancingLayer = new TrianglesInstancingLayer({
                        model,
                        textureSet,
                        geometry,
                        origin,
                        layerIndex: 0,
                        solid: false
                    });
                    break;
                case "lines":
                    vboInstancingLayer = new LinesInstancingLayer({
                        model,
                        textureSet,
                        geometry,
                        origin,
                        layerIndex: 0
                    });
                    break;
                case "points":
                    vboInstancingLayer = new PointsInstancingLayer({
                        model,
                        textureSet,
                        geometry,
                        origin,
                        layerIndex: 0
                    });
                    break;
            }
            // const lenPositions = geometry.positionsCompressed.length;
            // if (!vboInstancingLayer.canCreatePortion(lenPositions, geometry.indices.length)) { // FIXME: indices should be optional
            //     vboInstancingLayer.finalize();
            //     delete this._vboInstancingLayers[layerId];
            //     vboInstancingLayer = null;
            // }
        }
        this._vboInstancingLayers[layerId] = vboInstancingLayer;
        this._layerList.push(vboInstancingLayer);
        return vboInstancingLayer;
    }

//
//     temp() {
//
//         if (instancing && !this._geometries[cfg.geometryId]) {
//             this.error(`[createMesh] Geometry not found: ${cfg.geometryId} - ensure that you create it first with createGeometry()`);
//             return;
//         }
//
//         // RTC origin
//
//         const meshOrigin = (cfg.origin) ? math.addVec3(this._origin, cfg.origin, tempVec3a) : this._origin;
//
//         // Textures
//
//         if (vboMesh) {
//             const textureSetId = cfg.textureSetId || DEFAULT_TEXTURE_SET_ID;
//             if (textureSetId) {
//                 if (!this._textureSets[textureSetId]) {
//                     this.error(`[createMesh] Texture set not found: ${textureSetId} - ensure that you create it first with createTextureSet()`);
//                     return;
//                 }
//             }
//         }
//
//
//         let portionId;
//
//
//         const mesh = new SceneModelMesh(this, id, color, opacity);
//
//         const pickId = mesh.pickId;
//
//         const a = pickId >> 24 & 0xFF;
//         const b = pickId >> 16 & 0xFF;
//         const g = pickId >> 8 & 0xFF;
//         const r = pickId & 0xFF;
//
//         const pickColor = new Uint8Array([r, g, b, a]); // Quantized pick color
//
//         const aabb = math.collapseAABB3();
//
//         let layer;
//
//         if (instancing) {
//
//             if (this._vfcManager && !this._vfcManager.finalized) {
//                 this._vfcManager.addMesh(cfg); // To be created in #finalize()
//                 return;
//             }
//
//             let meshMatrix;
//             let sceneModelMatrix = this._sceneModelMatrixNonIdentity ? this._sceneModelMatrix : null;
//
//             if (cfg.matrix) {
//                 meshMatrix = cfg.matrix;
//             } else {
//                 const scale = cfg.scale || DEFAULT_SCALE;
//                 const position = cfg.position || DEFAULT_POSITION;
//                 const rotation = cfg.rotation || DEFAULT_ROTATION;
//                 math.eulerToQuaternion(rotation, "XYZ", DEFAULT_QUATERNION);
//                 meshMatrix = math.composeMat4(position, DEFAULT_QUATERNION, scale, tempMat4);
//             }
//
//             const cfgOrigin = cfg.origin || cfg.rtcCenter;
//             const origin = (cfgOrigin) ? math.addVec3(this._origin, cfgOrigin, tempVec3a) : this._origin;
//
//             const instancingLayer = this._getVBOInstancingLayer(origin, textureSetId, cfg.geometryId);
//
//             layer = instancingLayer;
//
//             portionId = instancingLayer.createPortion({
//                 color: color,
//                 metallic: metallic,
//                 roughness: roughness,
//                 opacity: opacity,
//                 meshMatrix: meshMatrix,
//                 sceneModelMatrix: sceneModelMatrix,
//                 aabb: aabb,
//                 pickColor: pickColor
//             });
//
//             math.expandAABB3(this._aabb, aabb);
//
//             const numTriangles = Math.round(instancingLayer.numIndices / 3);
//             this._numTriangles += numTriangles;
//             mesh.numTriangles = numTriangles;
//
//             mesh.origin = origin;
//
//         } else { // Batching
//
//
//             let needNewBatchingLayers = false;
//
//             if (!this._lastOrigin) {
//                 needNewBatchingLayers = true;
//                 this._lastOrigin = math.vec3(origin);
//             } else {
//                 if (!math.compareVec3(this._lastOrigin, origin)) {
//                     needNewBatchingLayers = true;
//                     this._lastOrigin.set(origin);
//                 }
//             }
//             if (cfg.positionsDecodeMatrix) {
//                 if (!this._lastPositionsDecodeMatrix) {
//                     needNewBatchingLayers = true;
//                     this._lastPositionsDecodeMatrix = math.mat4(cfg.positionsDecodeMatrix);
//
//                 } else {
//                     if (!math.compareMat4(this._lastPositionsDecodeMatrix, cfg.positionsDecodeMatrix)) {
//                         needNewBatchingLayers = true;
//                         this._lastPositionsDecodeMatrix.set(cfg.positionsDecodeMatrix)
//                     }
//                 }
//             }
//             if (cfg.uvDecodeMatrix) {
//                 if (!this._lastUVDecodeMatrix) {
//                     needNewBatchingLayers = true;
//                     this._lastUVDecodeMatrix = math.mat4(cfg.uvDecodeMatrix);
//
//                 } else {
//                     if (!math.compareMat4(this._lastUVDecodeMatrix, cfg.uvDecodeMatrix)) {
//                         needNewBatchingLayers = true;
//                         this._lastUVDecodeMatrix.set(cfg.uvDecodeMatrix)
//                     }
//                 }
//             }
//             if (cfg.textureSetId) {
//                 if (this._lastTextureSetId !== cfg.textureSetId) {
//                     needNewBatchingLayers = true;
//                     this._lastTextureSetId = cfg.textureSetId;
//                 }
//             }
//             if (needNewBatchingLayers) {
//                 for (let primitiveId in this._vboBatchingLayers) {
//                     if (this._vboBatchingLayers.hasOwnProperty(primitiveId)) {
//                         this._vboBatchingLayers[primitiveId].finalize();
//                     }
//                 }
//                 this._vboBatchingLayers = {};
//             }
//
//             const normalsProvided = (!!cfg.normals && cfg.normals.length > 0);
//             if (primitive === "triangles" || primitive === "solid" || primitive === "surface") {
//                 if (this._lastNormals !== null && normalsProvided !== this._lastNormals) {
//                     for (let primitiveId in this._vboBatchingLayers) {
//                         if (this._vboBatchingLayers[primitiveId]) {
//                             this._vboBatchingLayers[primitiveId].finalize();
//                             delete this._vboBatchingLayers[primitiveId];
//                         }
//                     }
//                 }
//                 this._lastNormals = normalsProvided;
//             }
//
//             const sceneModelMatrix = this._sceneModelMatrixNonIdentity ? this._sceneModelMatrix : null;
//             let meshMatrix;
//
//             if (!cfg.positionsDecodeMatrix) {
//                 if (cfg.matrix) {
//                     meshMatrix = cfg.matrix;
//                 } else {
//                     const scale = cfg.scale || DEFAULT_SCALE;
//                     const position = cfg.position || DEFAULT_POSITION;
//                     const rotation = cfg.rotation || DEFAULT_ROTATION;
//                     math.eulerToQuaternion(rotation, "XYZ", DEFAULT_QUATERNION);
//                     meshMatrix = math.composeMat4(position, DEFAULT_QUATERNION, scale, tempMat4);
//                 }
//             }
//
//             const textureSet = textureSetId ? this._textureSets[textureSetId] : null;
//
//             const primitiveId = `${primitive}-\
// ${cfg.normals && cfg.normals.length > 0 ? 1 : 0}-${cfg.normalsCompressed && cfg.normalsCompressed.length > 0 ? 1 : 0}-\
// ${cfg.colors && cfg.colors.length > 0 ? 1 : 0}-${cfg.colorsCompressed && cfg.colorsCompressed.length > 0 ? 1 : 0}-\
// ${cfg.uv && cfg.uv.length > 0 ? 1 : 0}-${cfg.uvCompressed && cfg.uvCompressed.length > 0 ? 1 : 0}`;
//
//             layer = this._vboBatchingLayers[primitiveId];
//
//             const lenPositions = (positions || cfg.positionsCompressed).length;
//
//             switch (primitive) {
//                 case "triangles":
//                 case "solid":
//                 case "surface":
//                     if (layer) {
//                         if (!layer.canCreatePortion(lenPositions, indices.length)) {
//                             layer.finalize();
//                             delete this._vboBatchingLayers[primitiveId];
//                             layer = null;
//                         }
//                     }
//                     if (!layer) {
//                         layer = new TrianglesBatchingLayer({
//                             model: this,
//                             textureSet: textureSet,
//                             layerIndex: 0, // This is set in #finalize()
//                             scratchMemory: this._vboBatchingLayerScratchMemory,
//                             positionsDecodeMatrix: cfg.positionsDecodeMatrix,  // Can be undefined
//                             uvDecodeMatrix: cfg.uvDecodeMatrix, // Can be undefined
//                             origin,
//                             maxGeometryBatchSize: this._maxGeometryBatchSize,
//                             solid: (primitive === "solid"),
//                             autoNormals: (!normalsProvided)
//                         });
//                         this._layerList.push(layer);
//                         this._vboBatchingLayers[primitiveId] = layer;
//                     }
//                     if (!edgeIndices) {
//                         edgeIndices = buildEdgeIndices(positions || cfg.positionsCompressed, indices, null, this._edgeThreshold);
//                     }
//                     portionId = layer.createPortion({
//                         positions: positions,
//                         positionsCompressed: cfg.positionsCompressed,
//                         normals: cfg.normals,
//                         normalsCompressed: cfg.normalsCompressed,
//                         colors: cfg.colors,
//                         colorsCompressed: cfg.colorsCompressed,
//                         uv: cfg.uv,
//                         uvCompressed: cfg.uvCompressed,
//                         indices: indices,
//                         edgeIndices: edgeIndices,
//                         color: color,
//                         opacity: opacity,
//                         metallic: metallic,
//                         roughness: roughness,
//                         meshMatrix: meshMatrix,
//                         sceneModelMatrix: sceneModelMatrix,
//                         worldAABB: aabb,
//                         pickColor: pickColor
//                     });
//                     const numTriangles = Math.round(indices.length / 3);
//                     this._numTriangles += numTriangles;
//                     mesh.numTriangles = numTriangles;
//                     break;
//
//                 case "lines":
//                     if (layer) {
//                         if (!layer.canCreatePortion(lenPositions, indices.length)) {
//                             layer.finalize();
//                             delete this._vboBatchingLayers[primitiveId];
//                             layer = null;
//                         }
//                     }
//                     if (!layer) {
//                         layer = new LinesBatchingLayer({
//                             model: this,
//                             layerIndex: 0, // This is set in #finalize()
//                             scratchMemory: this._vboBatchingLayerScratchMemory,
//                             positionsDecodeMatrix: cfg.positionsDecodeMatrix,  // Can be undefined
//                             origin,
//                             maxGeometryBatchSize: this._maxGeometryBatchSize
//                         });
//                         this._layerList.push(layer);
//                         this._vboBatchingLayers[primitiveId] = layer;
//                     }
//                     portionId = layer.createPortion({
//                         positions: positions,
//                         positionsCompressed: cfg.positionsCompressed,
//                         indices: indices,
//                         colors: cfg.colors,
//                         colorsCompressed: cfg.colorsCompressed,
//                         color: color,
//                         opacity: opacity,
//                         meshMatrix: meshMatrix,
//                         sceneModelMatrix: sceneModelMatrix,
//                         worldAABB: aabb,
//                         pickColor: pickColor
//                     });
//                     this._numLines += Math.round(indices.length / 2);
//                     break;
//
//                 case "points":
//                     if (layer) {
//                         if (!layer.canCreatePortion(lenPositions)) {
//                             layer.finalize();
//                             delete this._vboBatchingLayers[primitiveId];
//                             layer = null;
//                         }
//                     }
//                     if (!layer) {
//                         layer = new PointsBatchingLayer({
//                             model: this,
//                             layerIndex: 0, // This is set in #finalize()
//                             scratchMemory: this._vboBatchingLayerScratchMemory,
//                             positionsDecodeMatrix: cfg.positionsDecodeMatrix,  // Can be undefined
//                             origin,
//                             maxGeometryBatchSize: this._maxGeometryBatchSize
//                         });
//                         this._layerList.push(layer);
//                         this._vboBatchingLayers[primitiveId] = layer;
//                     }
//                     portionId = layer.createPortion({
//                         positions: positions,
//                         positionsCompressed: cfg.positionsCompressed,
//                         colors: cfg.colors,
//                         colorsCompressed: cfg.colorsCompressed,
//                         color: color,
//                         opacity: opacity,
//                         meshMatrix: meshMatrix,
//                         sceneModelMatrix: sceneModelMatrix,
//                         worldAABB: aabb,
//                         pickColor: pickColor
//                     });
//                     this._numPoints += Math.round(lenPositions / 3);
//                     break;
//             }
//
//             math.expandAABB3(this._aabb, aabb);
//             this.numGeometries++;
//             mesh.origin = origin;
//         }
//
//         mesh.parent = null; // Will be set within SceneModel constructor
//         mesh.layer = layer;
//         mesh.portionId = portionId;
//         mesh.aabb = aabb;
//
//         this._meshes[id] = mesh;
//     }


    /**
     * Creates an {@link Entity} within this SceneModel, giving it one or more meshes previously created with {@link SceneModel#createMesh}.
     *
     * A mesh can only belong to one {@link Entity}, so you'll get an error if you try to reuse a mesh among multiple {@link Entity}s.
     *
     * @param {Object} cfg Entity configuration.
     * @param {String} cfg.id Optional ID for the new Entity. Must not clash with any existing components within the {@link Scene}.
     * @param {String[]} cfg.meshIds IDs of one or more meshes created previously with {@link SceneModel@createMesh}.

     * @param {Boolean} [cfg.isObject] Set ````true```` if the {@link Entity} represents an object, in which case it will be registered by {@link Entity#id} in {@link Scene#objects} and can also have a corresponding {@link MetaObject} with matching {@link MetaObject#id}, registered by that ID in {@link MetaScene#metaObjects}.
     * @param {Boolean} [cfg.visible=true] Indicates if the Entity is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the Entity is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the Entity is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the Entity is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the Entity is initially included in boundary calculations.
     * @param {Boolean} [cfg.castsShadow=true] Indicates if the Entity initially casts shadows.
     * @param {Boolean} [cfg.receivesShadow=true]  Indicates if the Entity initially receives shadows.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the Entity is initially xrayed. XRayed appearance is configured by {@link SceneModel#xrayMaterial}.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the Entity is initially highlighted. Highlighted appearance is configured by {@link SceneModel#highlightMaterial}.
     * @param {Boolean} [cfg.selected=false] Indicates if the Entity is initially selected. Selected appearance is configured by {@link SceneModel#selectedMaterial}.
     * @param {Boolean} [cfg.edges=false] Indicates if the Entity's edges are initially emphasized. Edges appearance is configured by {@link SceneModel#edgeMaterial}.
     * @param {Boolean} [cfg.lodCullable=true] Indicates if the Entity can be LoD culled. LoD culling isconfigured by {@link LOD}.
     * @returns {Entity}
     */
    createEntity(cfg) {
        if (cfg.id === undefined) {
            cfg.id = math.createUUID();
        } else if (this.scene.components[cfg.id]) {
            this.error(`Scene already has a Component with this ID: ${cfg.id} - will assign random ID`);
            cfg.id = math.createUUID();
        }
        if (cfg.meshIds === undefined) {
            this.error("Config missing: meshIds");
            return;
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
        cfg.flags = flags;
        if (this._vfcManager && !this._vfcManager.finalized) {
            for (let i = 0, len = cfg.meshIds.length; i < len; i++) {
                const meshId = cfg.meshIds[i];
                if (this._scheduledMeshes[meshId]) {
                    this.error(`[createEntity] Mesh not found: ${meshId}`);
                    return;
                }
            }
            this._vfcManager.addEntity(cfg);
        } else {
            this._createEntity(cfg);
        }
    }

    _createEntity(cfg) {
        let meshes = [];
        const aabb = math.collapseAABB3();
        for (let i = 0, len = cfg.meshIds.length; i < len; i++) {
            const meshId = cfg.meshIds[i];
            const mesh = this._meshes[meshId];
            if (!mesh) {
                this.error(`Mesh with this ID not found: "${meshId}" - ignoring this mesh`);
                continue;
            }
            if (mesh.parent) {
                this.error(`Mesh with ID "${meshId}" already belongs to object with ID "${mesh.parent.id}" - ignoring this mesh`);
                continue;
            }
            math.expandAABB3(aabb, mesh.aabb);
            meshes.push(mesh);
        }
        const lodCullable = true;
        const entity = new SceneModelEntity(
            this,
            cfg.isObject,
            cfg.id,
            meshes,
            cfg.flags,
            aabb,
            lodCullable); // Internally sets SceneModelEntity#parent to this SceneModel
        this._entityList.push(entity);
        this._entities[cfg.id] = entity;
        this.numEntities++;
    }

    /**
     * Finalizes this SceneModel.
     *
     * Immediately creates the SceneModel's {@link Entity}s within the {@link Scene}.
     *
     * Once finalized, you can't add anything more to this SceneModel.
     */
    finalize() {

        if (this.destroyed) {
            return;
        }
        if (this._vfcManager) {
            this._vfcManager.finalize(() => {// Makes deferred calls to #_createEntity() and #_createMesh()
            });
        }
        for (const layerId in this._dtxLayers) {
            if (this._dtxLayers.hasOwnProperty(layerId)) {
                this._dtxLayers[layerId].finalize();
            }
        }
        for (const layerId in this._vboInstancingLayers) {
            if (this._vboInstancingLayers.hasOwnProperty(layerId)) {
                this._vboInstancingLayers[layerId].finalize();
            }
        }
        for (let layerId in this._vboBatchingLayers) {
            if (this._vboBatchingLayers.hasOwnProperty(layerId)) {
                this._vboBatchingLayers[layerId].finalize();
            }
        }
        this._vboBatchingLayers = {};
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            const node = this._entityList[i];
            node._finalize();
        }
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            const node = this._entityList[i];
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

        if (this.scene.lod.enabled) {
            this._lodManager = this.scene.lod.getLODManager(this);
        }
    }

    _rebuildAABB() {
        math.collapseAABB3(this._aabb);
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            const node = this._entityList[i];
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
    setPickMatrices(pickViewMatrix, pickProjMatrix) {
        if (this._numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            const layer = this._layerList[layerIndex];
            if (layer.setPickMatrices) {
                layer.setPickMatrices(pickViewMatrix, pickProjMatrix);
            }
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
     * Called by SceneModelMesh.drawPickDepths()
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
     * Called by SceneModelMesh.drawPickNormals()
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

    /**
     * @private
     * @param frameCtx
     */
    drawSnapInitDepthBuf(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            const layer = this._layerList[layerIndex];
            if (layer.drawSnapInitDepthBuf) {
                layer.drawSnapInitDepthBuf(renderFlags, frameCtx);
            }
        }
    }

    /**
     * @private
     * @param frameCtx
     */
    drawSnapDepths(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            const layer = this._layerList[layerIndex];
            if (layer.drawSnapDepths) {
                layer.drawSnapDepths(renderFlags, frameCtx);
            }
        }
    }

    /**
     * Destroys this SceneModel.
     */
    destroy() {
        for (let layerId in this._vboBatchingLayers) {
            if (this._vboBatchingLayers.hasOwnProperty(layerId)) {
                this._vboBatchingLayers[layerId].destroy();
            }
        }
        this._vboBatchingLayers = {};
        this.scene.camera.off(this._onCameraViewMatrix);
        for (let i = 0, len = this._layerList.length; i < len; i++) {
            this._layerList[i].destroy();
        }
        for (let i = 0, len = this._entityList.length; i < len; i++) {
            this._entityList[i]._destroy();
        }
        Object.entries(this._geometries).forEach(([key, geometry]) => {
            geometry.destroy();
        });
        this._geometries = {};
        this._textures = {};
        this._textureSets = {};
        this._meshes = {};
        this._entities = {};
        this.scene._aabbDirty = true;
        if (this._isModel) {
            this.scene._deregisterModel(this);
        }
        putScratchMemory();
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
 * The function returns the same provided input `geometry`, enrichened with the additional key `.preparedBukets`.
 *
 * @param {object} geometry The mesh information containing `.positions`, `.indices`, `.edgeIndices` arrays.
 *
 * @param enableVertexWelding
 * @param enableIndexBucketing
 * @returns {object} The mesh information enrichened with `.buckets` key.
 */
function createDTXBuckets(geometry, enableVertexWelding, enableIndexBucketing) {
    let uniquePositionsCompressed, uniqueIndices, uniqueEdgeIndices;
    if (enableVertexWelding) {
        [
            uniquePositionsCompressed,
            uniqueIndices,
            uniqueEdgeIndices,
        ] = uniquifyPositions({
            positionsCompressed: geometry.positionsCompressed,
            indices: geometry.indices,
            edgeIndices: geometry.edgeIndices
        });
    } else {
        uniquePositionsCompressed = geometry.positionsCompressed;
        uniqueIndices = geometry.indices;
        uniqueEdgeIndices = geometry.edgeIndices;
    }
    let buckets;
    if (enableIndexBucketing) {
        let numUniquePositions = uniquePositionsCompressed.length / 3;
        buckets = rebucketPositions(
            {
                positionsCompressed: uniquePositionsCompressed,
                indices: uniqueIndices,
                edgeIndices: uniqueEdgeIndices,
            },
            (numUniquePositions > (1 << 16)) ? 16 : 8,
            // true
        );
    } else {
        buckets = [{
            positionsCompressed: uniquePositionsCompressed,
            indices: uniqueIndices,
            edgeIndices: uniqueEdgeIndices,
        }];
    }
    return buckets;
}

/**
 *
 * @param geometry
 */
function createGeometryOBB(geometry) {
    geometry.obb = math.OBB3();
    if (geometry.positionsCompressed && geometry.positionsCompressed.length > 0) {
        const localAABB = math.collapseAABB3();
        math.expandAABB3Points3(localAABB, geometry.positionsCompressed);
        geometryCompressionUtils.decompressAABB(localAABB, geometry.positionsDecodeMatrix);
        math.AABB3ToOBB3(localAABB, geometry.obb);
    } else if (geometry.positions && geometry.positions.length > 0) {
        const localAABB = math.collapseAABB3();
        math.expandAABB3Points3(localAABB, geometry.positions);
        math.AABB3ToOBB3(localAABB, geometry.obb);
    }
}