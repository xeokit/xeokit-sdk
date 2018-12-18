/**
 The container for all 3D graphical objects and state in a xeokit scene.

 ## Usage

 * [Creating a Scene](#creating-a-scene)
 * [Creating and accessing components](#creating-and-accessing-components)
 * [Controlling the camera](#controlling-the-camera)
 * [Taking snapshots](#taking-snapshots)
 * [Lighting](#lighting)
 * [Clipping](#clipping)
 * [Picking](#picking)
 * [Querying and tracking boundaries](#querying-and-tracking-boundaries)
 * [Controlling the viewport](#controlling-the-viewport)
 * [Controlling rendering](#controlling-rendering)
 * [Gamma correction](#gamma-correction)

 ### Creating a Scene

 Creating a Scene with its own default canvas:

 ````javascript
 var scene = new xeokit.Scene();
 ````

 Creating a Scene with an existing canvas.

 ````javascript
 var scene2 = new xeokit.Scene({
    canvas: "myCanvas"
 });

 var scene3 = new xeokit.Scene({
    canvas: document.getElementById("myCanvas");
 });
 ````

 ### Creating and accessing components

 As a brief introduction to creating Scene components, we'll create a {@link Mesh} that has a
 {@link TeapotGeometry} and a {@link PhongMaterial}:

 <a href="../../examples/#geometry_primitives_teapot"><img src="../../assets/images/screenshots/Scene/teapot.png"></img></a>

 ````javascript
 var teapotMesh = new xeokit.Mesh(scene, {
    id: "myMesh",                               // <<---------- ID automatically generated if not provided
    geometry: new xeokit.TeapotGeometry(scene),
    material: new xeokit.PhongMaterial(scene, {
        id: "myMaterial",
        diffuse: [0.2, 0.2, 1.0]
    })
 });
 ````

 Creating a {@link Mesh} within the default Scene (xeokit will automatically create the default Scene if it does not yet exist):
 ````javascript
 var teapotMesh = new xeokit.Mesh({
    id: "myMesh",
    geometry: new xeokit.TeapotGeometry(),
    material: new xeokit.PhongMaterial({
        id: "myMaterial",
        diffuse: [0.2, 0.2, 1.0]
    })
 });

 teapotMesh.scene.camera.eye = [45, 45, 45];
 ````

 The default Scene can be got from either the Mesh or the xeokit namespace:

 ````javascript
 scene = teapotMesh.scene;
 scene = xeokit.getDefaultScene();
 ````

 You can also make any Scene instance the default scene, so that components will belong to that Scene when you don't explicitly
 specify a Scene for them:

 ````javascript
 var scene = new xeokit.Scene({ ... };
 xeokit.setDefaultScene( scene );
 ````

 Find components by ID in their Scene's {@link Scene/components} map:

 ````javascript
 var teapotMesh = scene.components["myMesh"];
 teapotMesh.visible = false;

 var teapotMaterial = scene.components["myMaterial"];
 teapotMaterial.diffuse = [1,0,0]; // Change to red
 ````

 A Scene also has a map of component instances for each {@link Component} subtype:

 ````javascript
 var meshes = scene.types["Mesh"];
 var teapotMesh = meshes["myMesh"];
 teapotMesh.ghosted = true;

 var phongMaterials = scene.types["PhongMaterial"];
 var teapotMaterial = phongMaterials["myMaterial"];
 teapotMaterial.diffuse = [0,1,0]; // Change to green
 ````

 See {@link Object}, {@link Group} and {@link Model}
 for how to create and access more sophisticated content.

 ### Controlling the camera

 Use the Scene's {@link Camera} to control the current viewpoint and projection:

 ````javascript
 var camera = myScene.camera;

 camera.eye = [-10,0,0];
 camera.look = [-10,0,0];
 camera.up = [0,1,0];

 camera.projection = "perspective";
 camera.perspective.fov = 45;
 //...
 ````

 ### Managing the canvas, taking snapshots

 The Scene's {@link Canvas} component provides various conveniences relevant to the WebGL canvas, such
 as getting getting snapshots, firing resize events etc:

 ````javascript
 var canvas = scene.canvas;

 canvas.on("boundary", function(boundary) {
    //...
 });

 var imageData = canvas.getSnapshot({
    width: 500,
    height: 500,
    format: "png"
 });
 ````

 ### Lighting

 The Scene's {@link Lights} component manages lighting:

 ````javascript
 var lights = scene.lights;
 lights[1].color = [0.9, 0.9, 0.9];
 //...
 ````

 ### Clipping

 The Scene's {@link Clips} component manages clipping planes for custom cross-sections:

 ````javascript
 var clips = scene.clips;
 clips.clips = [
 new xeokit.Clip({  // Clip plane on negative diagonal
        pos: [1.0, 1.0, 1.0],
        dir: [-1.0, -1.0, -1.0],
        active: true
    }),
 new xeokit.Clip({ // Clip plane on positive diagonal
        pos: [-1.0, -1.0, -1.0],
        dir: [1.0, 1.0, 1.0],
        active: true
    }),
 //...
 ];
 ````

 ### Picking

 Use the Scene's {@link Scene/pick:method"}}Scene#pick(){{/crossLink}} method to pick and raycast meshes.

 For example, to pick a point on the surface of the closest mesh at the given canvas coordinates:

 ````javascript
 var hit = scene.pick({
     pickSurface: true,
     canvasPos: [23, 131]
 });

 if (hit) { // Picked a Mesh

      var mesh = hit.mesh;

      var primitive = hit.primitive; // Type of primitive that was picked, usually "triangles"
      var primIndex = hit.primIndex; // Position of triangle's first index in the picked Mesh's Geometry's indices array
      var indices = hit.indices; // UInt32Array containing the triangle's vertex indices
      var localPos = hit.localPos; // Float32Array containing the picked Local-space position on the triangle
      var worldPos = hit.worldPos; // Float32Array containing the picked World-space position on the triangle
      var viewPos = hit.viewPos; // Float32Array containing the picked View-space position on the triangle
      var bary = hit.bary; // Float32Array containing the picked barycentric position within the triangle
      var normal = hit.normal; // Float32Array containing the interpolated normal vector at the picked position on the triangle
      var uv = hit.uv; // Float32Array containing the interpolated UV coordinates at the picked position on the triangle
 }
 ````

 #### Pick masking

 We can use the {@link Scene/pick:method"}}Scene#pick(){{/crossLink}} method's ````includeMeshes```` and ````excludeMeshes````
 options to mask which Meshes we attempt to pick.

 This is useful for picking <em>through</em> things, to pick only the Meshes of interest.

 To pick only Meshes ````"gearbox#77.0"```` and ````"gearbox#79.0"````, picking through any other Meshes that are
 in the way, as if they weren't there:

 ````javascript
 var hit = scene.pick({
     canvasPos: [23, 131],
     includeMeshes: ["gearbox#77.0", "gearbox#79.0"]
 });

 if (hit) {
      // Mesh will always be either "gearbox#77.0" or "gearbox#79.0"
      var mesh = hit.mesh;
 }
 ````

 To pick any pickable Mesh, except for ````"gearbox#77.0"```` and ````"gearbox#79.0"````, picking through those
 Meshes if they happen to be in the way:

 ````javascript
 var hit = scene.pick({
     canvasPos: [23, 131],
     excludeMeshes: ["gearbox#77.0", "gearbox#79.0"]
 });

 if (hit) {
      // Mesh will never be "gearbox#77.0" or "gearbox#79.0"
      var mesh = hit.mesh;
 }
 ````

 See {@link Scene/pick:method"}}Scene#pick(){{/crossLink}} for more info on picking.

 ### Querying and tracking boundaries

 Getting a Scene's World-space axis-aligned boundary (AABB):

 ````javascript
 var aabb = scene.aabb; // [xmin, ymin, zmin, xmax, ymax, zmax]
 ````

 Subscribing to updates to the AABB, which occur whenever {@link Meshes} are transformed, their
 {@link Geometry"}}Geometries{{/crossLink}} have been updated, or the {@link Camera} has moved:

 ````javascript
 scene.on("boundary", function() {
     var aabb = scene.aabb;
 });
 ````

 Getting the AABB of the {@link Object"}}Objects{{/crossLink}} with the given IDs:

 ````JavaScript
 scene.getAABB(); // Gets collective boundary of all Mesh Objects in the scene
 scene.getAABB("saw"); // Gets boundary of an Object
 scene.getAABB(["saw", "gearbox"]); // Gets collective boundary of two Objects
 ````

 See {@link Scene/getAABB:method"}}Scene#getAABB(){{/crossLink}} and {@link Object} for more info on querying and tracking boundaries.

 ### Managing the viewport

 The Scene's {@link Viewport} component manages the WebGL viewport:

 ````javascript
 var viewport = scene.viewport
 viewport.boundary = [0, 0, 500, 400];;
 ````

 ### Controlling rendering

 You can configure a Scene to perform multiple "passes" (renders) per frame. This is useful when we want to render the
 scene to multiple viewports, such as for stereo effects.

 In the example, below, we'll configure the Scene to render twice on each frame, each time to different viewport. We'll do this
 with a callback that intercepts the Scene before each render and sets its {@link Viewport} to a
 different portion of the canvas. By default, the Scene will clear the canvas only before the first render, allowing the
 two views to be shown on the canvas at the same time.

 ````Javascript
 // Load a glTF model
 var model = new xeokit.GLTFModel({
    src: "models/gltf/GearboxAssy/glTF-MaterialsCommon/GearboxAssy.gltf"
 });

 var scene = model.scene;
 var viewport = scene.viewport;

 // Configure Scene to render twice for each frame
 scene.passes = 2; // Default is 1
 scene.clearEachPass = false; // Default is false

 // Render to a separate viewport on each render

 var viewport = scene.viewport;
 viewport.autoBoundary = false;

 scene.on("rendering", function (e) {
     switch (e.pass) {
         case 0:
             viewport.boundary = [0, 0, 200, 200]; // xmin, ymin, width, height
             break;

         case 1:
             viewport.boundary = [200, 0, 200, 200];
             break;
     }
 });

 // We can also intercept the Scene after each render,
 // (though we're not using this for anything here)
 scene.on("rendered", function (e) {
     switch (e.pass) {
         case 0:
             break;

         case 1:
             break;
     }
 });
 ````

 ### Gamma correction

 Within its shaders, xeokit performs shading calculations in linear space.

 By default, the Scene expects color textures (eg. {@link PhongMaterial/diffuseMap:property"}}PhongMaterial#diffuseMap{{/crossLink}},
 {@link MetallicMaterial/baseColorMap:property"}}MetallicMaterial#baseColorMap{{/crossLink}} and {@link SpecularMaterial/diffuseMap:property"}}SphericalMaterial#diffuseMap{{/crossLink}}) to
 be in pre-multipled gamma space, so will convert those to linear space before they are used in shaders. Other textures are
 always expected to be in linear space.

 By default, the Scene will also gamma-correct its rendered output.

 You can configure the Scene to expect all those color textures to be linear space, so that it does not gamma-correct them:

 ````javascript
 scene.gammaInput = false;
 ````

 You would still need to gamma-correct the output, though, if it's going straight to the canvas, so normally we would
 leave that enabled:

 ````javascript
 scene.gammaOutput = true;
 ````

 See {@link Texture} for more information on texture encoding and gamma.

 @class Scene
 @module xeokit
 @submodule scene
 @constructor
 @param [cfg] Scene parameters
 @param [cfg.id] {String} Optional ID, unique among all Scenes in xeokit, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Scene.
 @param [cfg.canvasId] {String} ID of existing HTML5 canvas in the DOM - creates a full-page canvas automatically if this is omitted
 @param [cfg.webgl2=true] {Boolean} Set this false when we **don't** want to use WebGL 2 for our Scene; the Scene will fall
 back on WebGL 1 if not available. This property will be deprecated when WebGL 2 is supported everywhere.
 @param [cfg.components] {Array(Object)} JSON array containing parameters for {@link Component"}}Component{{/crossLink}} subtypes to immediately create within the Scene.
 @param [cfg.ticksPerRender=1] {Number} The number of {@link Scene/tick:event} that happen between each render or this Scene.
 @param [cfg.passes=1] {Number} The number of times this Scene renders per frame.
 @param [cfg.clearEachPass=false] {Boolean} When doing multiple passes per frame, specifies whether to clear the
 canvas before each pass (true) or just before the first pass (false).
 @param [cfg.transparent=false] {Boolean} Whether or not the canvas is transparent.
 @param [cfg.backgroundColor] {Float32Array} RGBA color for canvas background, when canvas is not transparent. Overridden by backgroundImage.
 @param [cfg.backgroundImage] {String} URL of an image to show as the canvas background, when canvas is not transparent. Overrides backgroundImage.
 @param [cfg.gammaInput=false] {Boolean} When true, expects that all textures and colors are premultiplied gamma.
 @param [cfg.gammaOutput=true] {Boolean} Whether or not to render with pre-multiplied gama.
 @param [cfg.gammaFactor=2.2] {Number} The gamma factor to use when rendering with pre-multiplied gamma.
 @extends Component
 */

import {core} from '../core.js';
import {utils} from '../utils.js';
import {math} from '../math/math.js';
import {stats} from '../stats.js';
import {Component} from '../Component.js';
import {Canvas} from '../canvas/Canvas.js';
import {Renderer} from '../webgl/Renderer.js';
import {Input} from '../input/Input.js';
import {Viewport} from '../viewport/Viewport.js';
import {Camera} from '../camera/Camera.js';
import {DirLight} from '../lighting/DirLight.js';
import {BoxGeometry} from '../geometry/BoxGeometry.js';
import {PhongMaterial} from '../materials/PhongMaterial.js';
import {EmphasisMaterial} from '../materials/EmphasisMaterial.js';
import {EdgeMaterial} from '../materials/EdgeMaterial.js';
import {OutlineMaterial} from '../materials/OutlineMaterial.js';

// Cached vars to avoid garbage collection

function getMeshIDMap(scene, meshIds) {
    const map = {};
    let meshId;
    let mesh;
    for (let i = 0, len = meshIds.length; i < len; i++) {
        meshId = meshIds[i];
        mesh = scene.meshes[meshId];
        if (!mesh) {
            scene.warn("pick(): Mesh not found: " + meshId);
            continue;
        }
        map[meshId] = true;
    }
    return map;
}

/**
 * Fired whenever a debug message is logged on a component within this Scene.
 * @event log
 * @param {String} value The debug message
 */

/**
 * Fired whenever an error is logged on a component within this Scene.
 * @event error
 * @param {String} value The error message
 */

/**
 * Fired whenever a warning is logged on a component within this Scene.
 * @event warn
 * @param {String} value The warning message
 */
class Scene extends Component {

    /**
     JavaScript class name for this Component.

     For example: "AmbientLight", "MetallicMaterial" etc.

     @property type
     @type String
     @final
     */
    get type() {
        return "Scene";
    }

    init(cfg) {

        super.init(cfg);

        const self = this;

        const transparent = !!cfg.transparent;

        /**
         The number of models currently loading.

         @property loading
         @final
         @type {Number}
         */
        this.loading = 0;

        /**
         The epoch time (in milliseconds since 1970) when this Scene was instantiated.

         @property timeCreated
         @final
         @type {Number}
         */
        this.startTime = (new Date()).getTime();

        /**
         {@link Model}s in this Scene, mapped to their IDs.

         @property models
         @final
         @type {String:xeokit.Model}
         */
        this.models = {};

        /**
         {@link Object"}}Objects{{/crossLink}} in this Scene that have GUIDs, mapped to their GUIDs.

         Each Object is registered in this map when its {@link Object/guid} is
         assigned a value.

         @property guidObjects
         @final
         @type {{String:Object}}
         */
        this.guidObjects = {};

        /**
         For each entity type, a map of IDs to {@link Object"}}Objects{{/crossLink}} of that entity type.

         Each Object is registered in this map when its {@link Object/entityType} is
         assigned a value.

         @property entityTypes
         @final
         @type {String:{String:xeokit.Component}}
         */
        this.entityTypes = {};

        /**
         {@link Object"}}Objects{{/crossLink}} in this Scene that have entity types, mapped to their IDs.

         Each Object is registered in this map when its {@link Object/entityType} is
         assigned a value.

         @property entities
         @final
         @type {{String:Object}}
         */
        this.entities = {};

        /**
         Visible entity {@link Object"}}Objects{{/crossLink}} within this Scene, mapped to their IDs.

         Each Object is registered in this map when its {@link Object/visible} property is true and its
         {@link Object/entityType} is assigned a value.

         @property visibleEntities
         @final
         @type {{String:Object}}
         */
        this.visibleEntities = {};

        /**
         Ghosted entity {@link Object"}}Objects{{/crossLink}} within this Scene, mapped to their IDs.

         Each Object is registered in this map when its {@link Object/ghosted} property is true and its
         {@link Object/entityType} is assigned a value.

         @property ghostedEntities
         @final
         @type {{String:Object}}
         */
        this.ghostedEntities = {};

        /**
         Highlighted entity {@link Object"}}Objects{{/crossLink}} within this Scene, mapped to their IDs.

         Each Object is registered in this map when its {@link Object/highlighted} property is true and its
         {@link Object/entityType} is assigned a value.

         @property highlightedEntities
         @final
         @type {{String:Object}}
         */
        this.highlightedEntities = {};

        /**
         Selected entity {@link Object"}}Objects{{/crossLink}} within this Scene, mapped to their IDs.

         Each Object is registered in this map when its {@link Object/selected} property is true and its
         {@link Object/entityType} is assigned a value.

         @property selectedEntities
         @final
         @type {{String:Object}}
         */
        this.selectedEntities = {};

        // Cached ID arrays, lazy-rebuilt as needed when stale after map updates

        /**
         Lazy-regenerated ID lists.
         */
        this._objectGUIDs = null;
        this._entityIds = null;
        this._visibleEntityIds = null;
        this._ghostedEntityIds = null;
        this._highlightedEntityIds = null;
        this._selectedEntityIds = null;

        this._collidables = {}; // Components that contribute to the Scene AABB
        this._compilables = {}; // Components that require shader compilation

        this._needRecompile = false;

        /**
         For each {@link Component} type, a map of
         IDs to {@link Component} instances of that type.

         @property types
         @final
         @type {String:{String:xeokit.Component}}
         */
        this.types = {};


        /**
         The {@link Component"}}Component{{/crossLink}} within this Scene, mapped to their IDs.

         @property components
         @final
         @type {String:xeokit.Component}
         */
        this.components = {};

        /**
         The {@link Clip"}}Clip{{/crossLink}} components in this Scene, mapped to their IDs.

         @property clips
         @final
         @type {{String:Clip}}
         */
        this.clips = {};

        /**
         The {@link PointLight}, {@link DirLight},
         {@link SpotLight} and {@link AmbientLight} components in this Scene, mapped to their IDs.

         @property lights
         @final
         @type {{String:Object}}
         */
        this.lights = {};

        /**
         The {@link LightMap} components in this Scene, mapped to their IDs.

         @property lightMaps
         @final
         @type {{String:LightMap}}
         */
        this.lightMaps = {};

        /**
         The {@link ReflectionMap} components in this Scene, mapped to their IDs.

         @property reflectionMaps
         @final
         @type {{String:ReflectionMap}}
         */
        this.reflectionMaps = {};

        /**
         Manages the HTML5 canvas for this Scene.
         @final
         @property canvas
         @type {Canvas}
         */
        this.canvas = new Canvas(this, {
            dontClear: true, // Never destroy this component with Scene#clear();
            canvas: cfg.canvas, // Can be canvas ID, canvas element, or null
            transparent: transparent,
            backgroundColor: cfg.backgroundColor,
            backgroundImage: cfg.backgroundImage,
            webgl2: cfg.webgl2 !== false,
            contextAttr: cfg.contextAttr || {},
            simulateWebGLContextLost: cfg.simulateWebGLContextLost
        });

        // Redraw as canvas resized
        this.canvas.on("boundary", function () {
            self.glRedraw();
        });

        this.canvas.on("webglContextFailed", function () {
            alert("xeokit failed to find WebGL!");
        });

        this._renderer = new Renderer(this, {
            transparent: transparent
        });

        this._clipsState = new (function () {

            this.clips = [];

            let hash = null;

            this.getHash = function () {
                if (hash) {
                    return hash;
                }
                const clips = this.clips;
                if (clips.length === 0) {
                    return this.hash = ";";
                }
                let clip;
                const hashParts = [];
                for (let i = 0, len = clips.length; i < len; i++) {
                    clip = clips[i];
                    hashParts.push("cp");
                }
                hashParts.push(";");
                hash = hashParts.join("");
                return hash;
            };

            this.addClip = function (clip) {
                this.clips.push(clip);
                hash = null;
            };

            this.removeClip = function (clip) {
                for (let i = 0, len = this.clips.length; i < len; i++) {
                    if (this.clips[i].id === clip.id) {
                        this.clips.splice(i, 1);
                        hash = null;
                        return;
                    }
                }
            };
        })();

        this._lightsState = new (function () {

            const DEFAULT_AMBIENT = math.vec3([0, 0, 0]);
            const ambientColor = math.vec3();

            this.lights = [];
            this.reflectionMaps = [];
            this.lightMaps = [];

            let hash = null;
            let ambientLight = null;

            this.getHash = function () {
                if (hash) {
                    return hash;
                }
                const hashParts = [];
                const lights = this.lights;
                let light;
                for (let i = 0, len = lights.length; i < len; i++) {
                    light = lights[i];
                    hashParts.push("/");
                    hashParts.push(light.type);
                    hashParts.push((light.space === "world") ? "w" : "v");
                    if (light.castShadow) {
                        hashParts.push("sh");
                    }
                }
                if (this.lightMaps.length > 0) {
                    hashParts.push("/lm");
                }
                if (this.reflectionMaps.length > 0) {
                    hashParts.push("/rm");
                }
                hashParts.push(";");
                hash = hashParts.join("");
                return hash;
            };

            this.addLight = function (state) {
                this.lights.push(state);
                ambientLight = null;
                hash = null;
            };

            this.removeLight = function (state) {
                for (let i = 0, len = this.lights.length; i < len; i++) {
                    const light = this.lights[i];
                    if (light.id === state.id) {
                        this.lights.splice(i, 1);
                        if (ambientLight && ambientLight.id === state.id) {
                            ambientLight = null;
                        }
                        hash = null;
                        return;
                    }
                }
            };

            this.addReflectionMap = function (state) {
                this.reflectionMaps.push(state);
                hash = null;
            };

            this.removeReflectionMap = function (state) {
                for (let i = 0, len = this.reflectionMaps.length; i < len; i++) {
                    if (this.reflectionMaps[i].id === state.id) {
                        this.reflectionMaps.splice(i, 1);
                        hash = null;
                        return;
                    }
                }
            };

            this.addLightMap = function (state) {
                this.lightMaps.push(state);
                hash = null;
            };

            this.removeLightMap = function (state) {
                for (let i = 0, len = this.lightMaps.length; i < len; i++) {
                    if (this.lightMaps[i].id === state.id) {
                        this.lightMaps.splice(i, 1);
                        hash = null;
                        return;
                    }
                }
            };

            this.getAmbientColor = function () {
                if (!ambientLight) {
                    for (let i = 0, len = this.lights.length; i < len; i++) {
                        const light = this.lights[i];
                        if (light.type === "ambient") {
                            ambientLight = light;
                            break;
                        }
                    }
                }
                if (ambientLight) {
                    const color = ambientLight.color;
                    const intensity = ambientLight.intensity;
                    ambientColor[0] = color[0] * intensity;
                    ambientColor[1] = color[1] * intensity;
                    ambientColor[2] = color[2] * intensity;
                    return ambientColor;
                } else {
                    return DEFAULT_AMBIENT;
                }
            };

        })();

        /**
         Publishes input events that occur on this Scene's canvas.

         @final
         @property input
         @type {Input}
         @final
         */
        this.input = new Input(this, {
            dontClear: true, // Never destroy this component with Scene#clear();
            element: this.canvas.canvas
        });

        // Register Scene on xeokit
        // Do this BEFORE we add components below
        core._addScene(this);

        this._initDefaults();

        // Global components

        this._viewport = new Viewport(this, {
            id: "default.viewport",
            autoBoundary: true,
            dontClear: true // Never destroy this component with Scene#clear();
        });

        this._camera = new Camera(this, {
            id: "default.camera",
            dontClear: true // Never destroy this component with Scene#clear();
        });

        // Default lights

        new DirLight(this, {
            dir: [0.8, -0.6, -0.8],
            color: [1.0, 1.0, 1.0],
            intensity: 1.0,
            space: "view"
        });

        new DirLight(this, {
            dir: [-0.8, -0.4, -0.4],
            color: [1.0, 1.0, 1.0],
            intensity: 1.0,
            space: "view"
        });

        new DirLight(this, {
            dir: [0.2, -0.8, 0.8],
            color: [0.6, 0.6, 0.6],
            intensity: 1.0,
            space: "view"
        });

        // Plug global components into renderer

        const viewport = this._viewport;
        const renderer = this._renderer;
        const camera = this._camera;

        camera.on("dirty", function () {
            renderer.imageDirty();
        });

        this.ticksPerRender = cfg.ticksPerRender;
        this.passes = cfg.passes;
        this.clearEachPass = cfg.clearEachPass;
        this.gammaInput = cfg.gammaInput;
        this.gammaOutput = cfg.gammaOutput;
        this.gammaFactor = cfg.gammaFactor;
    }

    _initDefaults() {

        // Call this Scene's property accessors to lazy-init their properties

        let dummy; // Keeps Codacy happy

        dummy = this.geometry;
        dummy = this.material;
        dummy = this.ghostMaterial;
        dummy = this.outlineMaterial;
    }

    _addComponent(component) {
        if (component.id) { // Manual ID
            if (this.components[component.id]) {
                this.error("Component " + utils.inQuotes(component.id) + " already exists in Scene - ignoring ID, will randomly-generate instead");
                component.id = null;
            }
        }
        if (!component.id) { // Auto ID
            if (window.nextID === undefined) {
                window.nextID = 0;
            }
            //component.id = math.createUUID();
            component.id = "_" + window.nextID++;
            while (this.components[component.id]) {
                component.id = math.createUUID();
            }
        }
        this.components[component.id] = component;

        // Register for class type
        const type = component.type;
        let types = this.types[component.type];
        if (!types) {
            types = this.types[type] = {};
        }
        types[component.id] = component;

        if (component.compile) {
            this._compilables[component.id] = component;
        }
        if (component.isDrawable) {
            this._renderer.addDrawable(component.id, component);
            this._collidables[component.id] = component;
        }
        if (component.isModel) {
            this.models[component.id] = component;
        }
    }

    _removeComponent(component) {
        var id = component.id;
        var type = component.type;
        delete this.components[id];
        // Unregister for types
        const types = this.types[type];
        if (types) {
            delete types[id];
            if (utils.isEmptyObject(types)) {
                delete this.types[type];
            }
        }
        if (component.compile) {
            delete this._compilables[component.id];
        }
        if (component.isDrawable) {
            this._renderer.removeDrawable(component.id);
            delete this._collidables[component.id];
        }
        if (component.isModel) {
            delete this.models[component.id];
        }
    }

    // Methods below are called by various component types to register themselves on their
    // Scene. Violates Hollywood Principle, where we could just filter on type in _addComponent,
    // but this is faster than checking the type of each component in such a filter.

    _clipCreated(clip) {
        this.clips[clip.id] = clip;
        this.scene._clipsState.addClip(clip._state);
        this._needRecompile = true;
    }

    _lightCreated(light) {
        this.lights[light.id] = light;
        this.scene._lightsState.addLight(light._state);
        this._needRecompile = true;
    }

    _lightMapCreated(lightMap) {
        this.lightMaps[lightMap.id] = lightMap;
        this.scene._lightsState.addLightMap(lightMap._state);
        this._needRecompile = true;
    }

    _reflectionMapCreated(reflectionMap) {
        this.reflectionMaps[reflectionMap.id] = reflectionMap;
        this.scene._lightsState.addReflectionMap(reflectionMap._state);
        this._needRecompile = true;
    }

    _modelCreated(model) {
        this.models[model.id] = model;
        stats.components.models++;
    }

    _clipDestroyed(clip) {
        delete this.clips[clip.id];
        this.scene._clipsState.removeClip(clip._state);
        this._needRecompile = true;
    }

    _lightDestroyed(light) {
        delete this.lights[light.id];
        this.scene._lightsState.removeLight(light._state);
        this._needRecompile = true;
    }

    _lightMapDestroyed(lightMap) {
        delete this.lightMaps[lightMap.id];
        this.scene._lightsState.removeLightMap(lightMap._state);
        this._needRecompile = true;
    }

    _reflectionMapDestroyed(reflectionMap) {
        delete this.reflectionMaps[reflectionMap.id];
        this.scene._lightsState.removeReflectionMap(reflectionMap._state);
        this._needRecompile = true;
    }

    _entityTypeAssigned(component, newEntityType) {
        this.entities[component.id] = component;
        let componentsOfType = this.entityTypes[newEntityType];
        if (!componentsOfType) {
            componentsOfType = {};
            this.entityTypes[newEntityType] = componentsOfType;
        }
        componentsOfType[component.id] = component;
        this._entityIds = null; // Lazy regenerate
        this._entityTypeIds = null; // Lazy regenerate
    }

    _entityTypeRemoved(component, oldEntityType) {
        delete this.entities[component.id];
        const componentsOfType = this.entityTypes[oldEntityType];
        if (componentsOfType) {
            delete componentsOfType[component.id];
        }
        this._entityIds = null; // Lazy regenerate
        this._entityTypeIds = null; // Lazy regenerate
    }

    _entityVisibilityUpdated(component, visible) {
        if (visible) {
            this.visibleEntities[component.id] = component;
        } else {
            delete this.visibleEntities[component.id];
        }
        this._visibleEntityIds = null; // Lazy regenerate
    }

    _entityGhostedUpdated(component, ghosted) {
        if (ghosted) {
            this.ghostedEntities[component.id] = component;
        } else {
            delete this.ghostedEntities[component.id];
        }
        this._ghostedEntityIds = null; // Lazy regenerate
    }

    _entityHighlightedUpdated(component, highlighted) {
        if (highlighted) {
            this.highlightedEntities[component.id] = component;
        } else {
            delete this.highlightedEntities[component.id];
        }
        this._highlightedEntityIds = null; // Lazy regenerate
    }

    _entitySelectedUpdated(component, selected) {
        if (selected) {
            this.selectedEntities[component.id] = component;
        } else {
            delete this.selectedEntities[component.id];
        }
        this._selectedEntityIds = null; // Lazy regenerate
    }

    _webglContextLost() {
        //  this.loading++;
        this.canvas.spinner.processes++;
        for (const id in this.components) {
            if (this.components.hasOwnProperty(id)) {
                const component = this.components[id];
                if (component._webglContextLost) {
                    component._webglContextLost();
                }
            }
        }
        this._renderer.webglContextLost();
    }

    _webglContextRestored() {
        const gl = this.canvas.gl;
        for (const id in this.components) {
            if (this.components.hasOwnProperty(id)) {
                const component = this.components[id];
                if (component._webglContextRestored) {
                    component._webglContextRestored(gl);
                }
            }
        }
        this._renderer.webglContextRestored(gl);
        //this.loading--;
        this.canvas.spinner.processes--;
    }

    /**
     * Renders a single frame of this Scene.
     *
     * The Scene will periodically render itself after any updates, but you can call this method to force a render
     * if required. This method is typically used when we want to synchronously take a snapshot of the canvas and
     * need everything rendered right at that moment.
     *
     * @method render
     * @param {Boolean} [forceRender=false] Forces a render when true, otherwise only renders if something has changed in this Scene
     * since the last render.
     */
    render(forceRender) {

        const renderEvent = {
            sceneId: null,
            pass: 0
        };


        if (this._needRecompile) {
            this._recompile();
            this._needRecompile = false;
        }

        if (this.loading > 0 || this.canvas.spinner.processes > 0) {
            this.canvas.canvas.style.opacity = 0.0;
            return;
        }

        let opacity = Number.parseFloat(this.canvas.canvas.style.opacity);
        if (opacity < 1.0) {
            opacity += 0.1;
            this.canvas.canvas.style.opacity = opacity;
        }

        renderEvent.sceneId = this.id;

        const passes = this._passes;
        const clearEachPass = this._clearEachPass;
        let pass;
        let clear;

        for (pass = 0; pass < passes; pass++) {

            renderEvent.pass = pass;

            /**
             * Fired when about to render a frame for a Scene.
             *
             * @event rendering
             * @param {String} sceneID The ID of this Scene.
             * @param {Number} pass Index of the pass we are about to render (see {@link Scene/passes}).
             */
            this.fire("rendering", renderEvent, true);

            clear = clearEachPass || (pass === 0);

            this._renderer.render({pass: pass, clear: clear, force: forceRender});

            /**
             * Fired when we have just rendered a frame for a Scene.
             *
             * @event rendering
             * @param {String} sceneID The ID of this Scene.
             * @param {Number} pass Index of the pass we rendered (see {@link Scene/passes}).
             */
            this.fire("rendered", renderEvent, true);
        }

        this._saveAmbientColor();
    }

    _recompile() {
        for (const id in this._compilables) {
            if (this._compilables.hasOwnProperty(id)) {
                this._compilables[id].compile();
            }
        }
    }

    _saveAmbientColor() {
        const canvas = this.canvas;
        if (!canvas.transparent && !canvas.backgroundImage && !canvas.backgroundColor) {
            const ambientColor = this._lightsState.getAmbientColor();
            if (!this._lastAmbientColor ||
                this._lastAmbientColor[0] !== ambientColor[0] ||
                this._lastAmbientColor[1] !== ambientColor[1] ||
                this._lastAmbientColor[2] !== ambientColor[2] ||
                this._lastAmbientColor[3] !== ambientColor[3]) {
                canvas.backgroundColor = ambientColor;
                if (!this._lastAmbientColor) {
                    this._lastAmbientColor = math.vec4([0, 0, 0, 1]);
                }
                this._lastAmbientColor.set(ambientColor);
            }
        } else {
            this._lastAmbientColor = null;
        }
    }

    /**
     Convenience array of entity type IDs in {@link Scene/entityTypes}.
     @property entityTypeIds
     @final
     @type {Array of String}
     */
    get objectGUIDs() {
        if (!this._objectGUIDs) {
            this._objectGUIDs = Object.keys(this.guidObjects);
        }
        return this._objectGUIDs;
    }

    /**
     Convenience array of entity type IDs in {@link Scene/entityTypes}.
     @property entityTypeIds
     @final
     @type {Array of String}
     */
    get entityTypeIds() {
        if (!this._entityTypeIds) {
            this._entityTypeIds = Object.keys(this.entityTypes);
        }
        return this._entityTypeIds;
    }

    /**
     Convenience array of IDs in {@link Scene/entities}.
     @property entityIds
     @final
     @type {Array of String}
     */
    get entityIds() {
        if (!this._entityIds) {
            this._entityIds = Object.keys(this.entities);
        }
        return this._entityIds;
    }

    /**
     Convenience array of IDs in {@link Scene/visibleEntities}.
     @property visibleEntityIds
     @final
     @type {Array of String}
     */
    get visibleEntityIds() {
        if (!this._visibleEntityIds) {
            this._visibleEntityIds = Object.keys(this.visibleEntities);
        }
        return this._visibleEntityIds;
    }

    /**
     Convenience array of IDs in {@link Scene/ghostedEntities}.
     @property ghostedEntityIds
     @final
     @type {Array of String}
     */
    get ghostedEntityIds() {
        if (!this._ghostedEntityIds) {
            this._ghostedEntityIds = Object.keys(this.ghostedEntities);
        }
        return this._ghostedEntityIds;
    }

    /**
     Convenience array of IDs in {@link Scene/highlightedEntities}.
     @property highlightedEntityIds
     @final
     @type {Array of String}
     */
    get highlightedEntityIds() {
        if (!this._highlightedEntityIds) {
            this._highlightedEntityIds = Object.keys(this.highlightedEntities);
        }
        return this._highlightedEntityIds;
    }

    /**
     Convenience array of IDs in {@link Scene/selectedEntities}.
     @property selectedEntityIds
     @final
     @type {Array of String}
     */
    get selectedEntityIds() {
        if (!this._selectedEntityIds) {
            this._selectedEntityIds = Object.keys(this.selectedEntities);
        }
        return this._selectedEntityIds;
    }

    /**
     The number of {@link Scene/tick} that happen between each render or this Scene.

     @property ticksPerRender
     @default 1
     @type Number
     */
    set ticksPerRender(value) {
        if (value === undefined || value === null) {
            value = 1;
        } else if (!utils.isNumeric(value) || value <= 0) {
            this.error("Unsupported value for 'ticksPerRender': '" + value +
                "' - should be an integer greater than zero.");
            value = 1;
        }
        if (value === this._ticksPerRender) {
            return;
        }
        this._ticksPerRender = value;
    }

    get ticksPerRender() {
        return this._ticksPerRender;
    }

    /**
     The number of times this Scene renders per frame.

     @property passes
     @default 1
     @type Number
     */
    set passes(value) {
        if (value === undefined || value === null) {
            value = 1;
        } else if (!utils.isNumeric(value) || value <= 0) {
            this.error("Unsupported value for 'passes': '" + value +
                "' - should be an integer greater than zero.");
            value = 1;
        }
        if (value === this._passes) {
            return;
        }
        this._passes = value;
        this.glRedraw();
    }

    get passes() {
        return this._passes;
    }

    /**
     When doing multiple passes per frame, specifies whether to clear the
     canvas before each pass (true) or just before the first pass (false).

     @property clearEachPass
     @default false
     @type Boolean
     */
    set clearEachPass(value) {
        value = !!value;
        if (value === this._clearEachPass) {
            return;
        }
        this._clearEachPass = value;
        this.glRedraw();
    }

    get clearEachPass() {
        return this._clearEachPass;
    }

    /**
     When true, expects all textures and colors are premultiplied gamma.

     @property gammaInput
     @default false
     @type Boolean
     */
    set gammaInput(value) {
        value = value !== false;
        if (value === this._renderer.gammaInput) {
            return;
        }
        this._renderer.gammaInput = value;
        this._needRecompile = true;
    }

    get gammaInput() {
        return this._renderer.gammaInput;
    }

    /**
     Whether or not to render pixels with pre-multiplied gama.

     @property gammaOutput
     @default true
     @type Boolean
     */
    set gammaOutput(value) {
        value = value !== false;
        if (value === this._renderer.gammaOutput) {
            return;
        }
        this._renderer.gammaOutput = value;
        this._needRecompile = true;
    }

    get gammaOutput() {
        return this._renderer.gammaOutput;
    }

    /**
     The gamma factor to use when {@link Scene/property:gammaOutput} is set true.

     @property gammaOutput
     @default 1.0
     @type Number
     */
    set gammaFactor(value) {
        value = (value === undefined || value === null) ? 2.2 : value;
        if (value === this._renderer.gammaFactor) {
            return;
        }
        this._renderer.gammaFactor = value;
        this.glRedraw();
    }

    get gammaFactor() {
        return this._renderer.gammaFactor;
    }

    /**
     The default geometry for this Scene, which is a {@link BoxGeometry"}}BoxGeometry{{/crossLink}}.

     This {@link BoxGeometry"}}BoxGeometry{{/crossLink}} has an {@link Component/id:property"}}id{{/crossLink}} equal to "default.geometry".

     {@link Mesh"}}Meshes{{/crossLink}} in this Scene are attached to this
     {@link Geometry"}}Geometry{{/crossLink}} by default.
     @property geometry
     @final
     @type BoxGeometry
     */
    get geometry() {
        return this.components["default.geometry"] ||
            new BoxGeometry(this, {
                id: "default.geometry",
                dontClear: true
            });
    }

    /**
     The default drawing material for this Scene, which is a {@link PhongMaterial"}}PhongMaterial{{/crossLink}}.

     This {@link PhongMaterial"}}PhongMaterial{{/crossLink}} has
     an {@link Component/id:property"}}id{{/crossLink}} equal to "default.material", with all
     other properties initialised to their default values.

     {@link Mesh"}}Meshes{{/crossLink}} in this Scene are attached to this
     {@link PhongMaterial"}}PhongMaterial{{/crossLink}} by default.
     @property material
     @final
     @type PhongMaterial
     */
    get material() {
        return this.components["default.material"] || new PhongMaterial(this, {
            id: "default.material",
            emissive: [0.4, 0.4, 0.4], // Visible by default on geometry without normals
            dontClear: true
        });
    }

    /**
     The Scene's default {@link EmphasisMaterial"}}EmphasisMaterial{{/crossLink}} for the appearance of {@link Meshes"}}Meshes{{/crossLink}} when they are ghosted.

     This {@link EmphasisMaterial"}}EmphasisMaterial{{/crossLink}} has
     an {@link Component/id:property"}}id{{/crossLink}} equal to "default.ghostMaterial", with all
     other properties initialised to their default values.

     {@link Mesh"}}Meshes{{/crossLink}} in this Scene are attached to this
     {@link EmphasisMaterial"}}EmphasisMaterial{{/crossLink}} by default.
     @property ghostMaterial
     @final
     @type EmphasisMaterial
     */
    get ghostMaterial() {
        return this.components["default.ghostMaterial"] || new EmphasisMaterial(this, {
            id: "default.ghostMaterial",
            preset: "sepia",
            dontClear: true
        });
    }

    /**
     The Scene's default {@link EmphasisMaterial"}}EmphasisMaterial{{/crossLink}} for the appearance of {@link Meshes"}}Meshes{{/crossLink}} when they are highlighted.

     This {@link HighlightMaterial"}}HighlightMaterial{{/crossLink}} has
     an {@link Component/id:property"}}id{{/crossLink}} equal to "default.highlightMaterial", with all
     other properties initialised to their default values.

     {@link Mesh"}}Meshes{{/crossLink}} in this Scene are attached to this
     {@link HighlightMaterial"}}HighlightMaterial{{/crossLink}} by default.
     @property highlightMaterial
     @final
     @type HighlightMaterial
     */
    get highlightMaterial() {
        return this.components["default.highlightMaterial"] || new EmphasisMaterial(this, {
            id: "default.highlightMaterial",
            preset: "yellowHighlight",
            dontClear: true
        });
    }

    /**
     The Scene's default {@link EmphasisMaterial"}}EmphasisMaterial{{/crossLink}} for the appearance of {@link Meshes"}}Meshes{{/crossLink}} when they are selected.

     This {@link SelectedMaterial"}}SelectedMaterial{{/crossLink}} has
     an {@link Component/id:property"}}id{{/crossLink}} equal to "default.selectedMaterial", with all
     other properties initialised to their default values.

     {@link Mesh"}}Meshes{{/crossLink}} in this Scene are attached to this
     {@link SelectedMaterial"}}SelectedMaterial{{/crossLink}} by default.
     @property selectedMaterial
     @final
     @type SelectedMaterial
     */
    get selectedMaterial() {
        return this.components["default.selectedMaterial"] || new EmphasisMaterial(this, {
            id: "default.selectedMaterial",
            preset: "greenSelected",
            dontClear: true
        });
    }

    /**
     The Scene's default {@link EdgeMaterial"}}EmphasisMaterial{{/crossLink}} for the appearance of {@link Meshes"}}Meshes{{/crossLink}} when edges are emphasized.

     This {@link EdgeMaterial"}}EdgeMaterial{{/crossLink}} has
     an {@link Component/id:property"}}id{{/crossLink}} equal to "default.edgeMaterial", with all
     other properties initialised to their default values.

     {@link Mesh"}}Meshes{{/crossLink}} in this Scene are attached to this
     {@link EdgeMaterial"}}EdgeMaterial{{/crossLink}} by default.
     @property edgeMaterial
     @final
     @type EdgeMaterial
     */
    get edgeMaterial() {
        return this.components["default.edgeMaterial"] || new EdgeMaterial(this, {
            id: "default.edgeMaterial",
            preset: "default",
            edgeColor: [0.0, 0.0, 0.0],
            edgeAlpha: 1.0,
            edgeWidth: 1,
            dontClear: true
        });
    }

    /**
     The Scene's default {@link OutlineMaterial"}}OutlineMaterial{{/crossLink}} for the appearance of {@link Meshes"}}Meshes{{/crossLink}} when they are outlined.

     This {@link OutlineMaterial"}}OutlineMaterial{{/crossLink}} has
     an {@link Component/id:property"}}id{{/crossLink}} equal to "default.outlineMaterial", with all
     other properties initialised to their default values.

     {@link Mesh"}}Meshes{{/crossLink}} in this Scene are attached to this
     {@link OutlineMaterial"}}OutlineMaterial{{/crossLink}} by default.
     @property outlineMaterial
     @final
     @type OutlineMaterial
     */
    get outlineMaterial() {
        return this.components["default.outlineMaterial"] || new OutlineMaterial(this, {
            id: "default.outlineMaterial",
            dontClear: true
        });
    }

    /**
     The {@link Viewport} belonging to this Scene.

     @property viewport
     @final
     @type Viewport
     */
    get viewport() {
        return this._viewport;
    }

    /**
     The {@link Camera} belonging to this Scene.

     @property camera
     @final
     @type Camera
     */
    get camera() {
        return this._camera;
    }

    /**
     World-space 3D center of this Scene.

     @property center
     @final
     @type {Float32Array}
     */
    get center() {
        if (this._aabbDirty || !this._center) {
            if (!this._center || !this._center) {
                this._center = math.vec3();
            }
            const aabb = this.aabb;
            this._center[0] = (aabb[0] + aabb[3]) / 2;
            this._center[1] = (aabb[1] + aabb[4]) / 2;
            this._center[2] = (aabb[2] + aabb[5]) / 2;
        }
        return this._center;
    }

    /**
     World-space axis-aligned 3D boundary (AABB) of this Scene.

     The AABB is represented by a six-element Float32Array containing the min/max extents of the
     axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.

     @property aabb
     @final
     @type {Float32Array}
     */
    get aabb() {
        if (this._aabbDirty) {
            if (!this._aabb) {
                this._aabb = math.AABB3();
            }
            let xmin = math.MAX_DOUBLE;
            let ymin = math.MAX_DOUBLE;
            let zmin = math.MAX_DOUBLE;
            let xmax = -math.MAX_DOUBLE;
            let ymax = -math.MAX_DOUBLE;
            let zmax = -math.MAX_DOUBLE;
            let aabb;
            const collidables = this._collidables;
            let collidable;
            for (const collidableId in collidables) {
                if (collidables.hasOwnProperty(collidableId)) {
                    collidable = collidables[collidableId];
                    if (collidable.collidable === false) {
                        continue;
                    }
                    aabb = collidable.aabb;
                    if (aabb[0] < xmin) {
                        xmin = aabb[0];
                    }
                    if (aabb[1] < ymin) {
                        ymin = aabb[1];
                    }
                    if (aabb[2] < zmin) {
                        zmin = aabb[2];
                    }
                    if (aabb[3] > xmax) {
                        xmax = aabb[3];
                    }
                    if (aabb[4] > ymax) {
                        ymax = aabb[4];
                    }
                    if (aabb[5] > zmax) {
                        zmax = aabb[5];
                    }
                }
            }
            this._aabb[0] = xmin;
            this._aabb[1] = ymin;
            this._aabb[2] = zmin;
            this._aabb[3] = xmax;
            this._aabb[4] = ymax;
            this._aabb[5] = zmax;
            this._aabbDirty = false;
        }
        return this._aabb;
    }

    _setBoundaryDirty() {
        //if (!this._aabbDirty) {
        this._aabbDirty = true;
        this.fire("boundary");
        // }
    }

    /**
     Attempts to pick an {@link Mesh"}}Mesh{{/crossLink}} in this Scene.

     Ignores {@link Mesh"}}Meshes{{/crossLink}} with {@link Mesh/pickable:property"}}pickable{{/crossLink}}
     set *false*.

     When a {@link Mesh} is picked, fires a "pick" event on the {@link Mesh}
     with the pick result as parameters.

     Picking the {@link Mesh} at the given canvas coordinates:

     ````javascript
     var pickResult = scene.pick({
              canvasPos: [23, 131]
           });

     if (pickResult) { // Picked a Mesh
              var mesh = pickResult.mesh;
          }
     ````

     **Usage:**

     Picking, with a ray cast through the canvas, hits a {@link Mesh}:

     ````javascript
     var pickResult = scene.pick({
              pickSurface: true,
              canvasPos: [23, 131]
           });

     if (pickResult) { // Picked a Mesh

              var mesh = pickResult.mesh;

              // These properties are only on the pick result when we do a ray-pick:

              var primitive = pickResult.primitive; // Type of primitive that was picked, usually "triangles"
              var primIndex = pickResult.primIndex; // Position of triangle's first index in the picked Mesh's Geometry's indices array
              var indices = pickResult.indices; // UInt32Array containing the triangle's vertex indices
              var localPos = pickResult.localPos; // Float32Array containing the picked Local-space position on the triangle
              var worldPos = pickResult.worldPos; // Float32Array containing the picked World-space position on the triangle
              var viewPos = pickResult.viewPos; // Float32Array containing the picked View-space position on the triangle
              var bary = pickResult.bary; // Float32Array containing the picked barycentric position within the triangle
              var normal = pickResult.normal; // Float32Array containing the interpolated normal vector at the picked position on the triangle
              var uv = pickResult.uv; // Float32Array containing the interpolated UV coordinates at the picked position on the triangle
          }
     ````

     Picking the {@link Mesh} that intersects an arbitrarily-aligned World-space ray:

     ````javascript
     var pickResult = scene.pick({
              pickSurface: true,   // Picking with arbitrarily-positioned ray
              origin: [0,0,-5],    // Ray origin
              direction: [0,0,1]   // Ray direction
          });

     if (pickResult) { // Picked a Mesh with the ray

              var mesh = pickResult.mesh;

              var primitive = pickResult.primitive; // Type of primitive that was picked, usually "triangles"
              var primIndex = pickResult.primIndex; // Position of triangle's first index in the picked Mesh's Geometry's indices array
              var indices = pickResult.indices; // UInt32Array containing the triangle's vertex indices
              var localPos = pickResult.localPos; // Float32Array containing the picked Local-space position on the triangle
              var worldPos = pickResult.worldPos; // Float32Array containing the picked World-space position on the triangle
              var viewPos = pickResult.viewPos; // Float32Array containing the picked View-space position on the triangle
              var bary = pickResult.bary; // Float32Array containing the picked barycentric position within the triangle
              var normal = pickResult.normal; // Float32Array containing the interpolated normal vector at the picked position on the triangle
              var uv = pickResult.uv; // Float32Array containing the interpolated UV coordinates at the picked position on the triangle
              var origin = pickResult.origin; // Float32Array containing the World-space ray origin
              var direction = pickResult.direction; // Float32Array containing the World-space ray direction
          }
     ````
     @method pick

     @param {*} params Picking parameters.
     @param {Boolean} [params.pickSurface=false] Whether to find the picked position on the surface of the Mesh.
     @param {Float32Array} [params.canvasPos] Canvas-space coordinates. When ray-picking, this will override the
     **origin** and ** direction** parameters and will cause the ray to be fired through the canvas at this position,
     directly along the negative View-space Z-axis.
     @param {Float32Array} [params.origin] World-space ray origin when ray-picking. Ignored when canvasPos given.
     @param {Float32Array} [params.direction] World-space ray direction when ray-picking. Also indicates the length of the ray. Ignored when canvasPos given.
     @param {Array} [params.includeMeshes] IDs of {@link Mesh"}}Meshes{{/crossLink}} to restrict picking to. When given, ignores {@link Mesh"}}Meshes{{/crossLink}} whose IDs are not in this list.
     @param {Array} [params.excludeMeshes] IDs of {@link Mesh"}}Meshes{{/crossLink}} to ignore. When given, will pick *through* these {@link Mesh"}}Meshes{{/crossLink}}, as if they were not there.
     @param {PickResult} [pickResult] Holds the results of the pick attempt. Will use the Scene's singleton PickResult if you don't supply your own.
     @returns {PickResult} Holds results of the pick attempt, returned when an {@link Mesh} is picked, else null. See method comments for description.
     */
    pick(params, pickResult) {

        if (this.canvas.boundary[2] === 0 || this.canvas.boundary[3] === 0) {
            this.error("Picking not allowed while canvas has zero width or height");
            return null;
        }

        params = params || {};

        params.pickSurface = params.pickSurface || params.rayPick; // Backwards compatibility

        if (!params.canvasPos && (!params.origin || !params.direction)) {
            this.warn("picking without canvasPos or ray origin and direction");
        }

        const includeMeshes = params.includeMeshes || params.include; // Backwards compat
        if (includeMeshes) {
            params.includeMeshIds = getMeshIDMap(this, includeMeshes);
        }

        const excludeMeshes = params.excludeMeshes || params.exclude; // Backwards compat
        if (excludeMeshes) {
            params.excludeMeshIds = getMeshIDMap(this, excludeMeshes);
        }

        if (pickResult = this._renderer.pick(params, pickResult)) {
            utils.apply(params, pickResult);
            pickResult.object = pickResult.mesh; // Backwards compat
            if (params.pickSurface) {
                pickResult.mesh.getPickResult(pickResult);
            }
            pickResult.mesh.fire("picked", pickResult); // TODO: BigModelMesh doeosn;t fire events...
            return pickResult;
        }
    }

    /**
     Returns the collective axis-aligned bounding box of the {@link Object"}}Objects{{/crossLink}}, specified by their IDs, GUIDs and/or entity types.

     When no arguments are given, returns the total boundary of all objects in the scene.

     Only {@link Mesh"}}Meshes{{/crossLink}} with {@link Mesh/collidable:property"}}collidable{{/crossLink}}
     set ````true```` are included in the boundary.

     ## Usage

     ````JavaScript
     scene.getAABB(); // Gets collective boundary of all objects in the scene
     scene.getAABB("saw"); // Gets collective boundary of all objects in saw model
     scene.getAABB(["saw", "gearbox"]); // Gets collective boundary of all objects in saw and gearbox models
     scene.getAABB("saw#0.1"); // Get boundary of an object in the saw model
     scene.getAABB(["saw#0.1", "saw#0.2"]); // Get collective boundary of two objects in saw model
     scene.getAABB(["saw#0.1", "surface", "support"]); // Get collective boundary an object, and all objects of the given two entity classes.
     ````

     @method getAABB
     @param {String|String[]} target {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @returns {[Number, Number, Number, Number, Number, Number]} An axis-aligned World-space bounding box, given as elements ````[xmin, ymin, zmin, xmax, ymax, zmax]````.
     */
    getAABB(target) {
        if (target === undefined) {
            return this.aabb;
        }
        if (utils.isString(target)) {
            const component = this.components[target];
            if (component && component.aabb) { // A Component subclass with an AABB
                return component.aabb;
            }
            target = [target]; // Must be an entity type
        }
        if (target.length === 0) {
            return this.aabb;
        }
        let xmin = 100000;
        let ymin = 100000;
        let zmin = 100000;
        let xmax = -100000;
        let ymax = -100000;
        let zmax = -100000;
        let valid;
        this.withComponents(target, object => {
                const aabb = object.aabb;
                if (aabb[0] < xmin) {
                    xmin = aabb[0];
                }
                if (aabb[1] < ymin) {
                    ymin = aabb[1];
                }
                if (aabb[2] < zmin) {
                    zmin = aabb[2];
                }
                if (aabb[3] > xmax) {
                    xmax = aabb[3];
                }
                if (aabb[4] > ymax) {
                    ymax = aabb[4];
                }
                if (aabb[5] > zmax) {
                    zmax = aabb[5];
                }
                valid = true;
            }
        );
        if (valid) {
            const aabb2 = math.AABB3();
            aabb2[0] = xmin;
            aabb2[1] = ymin;
            aabb2[2] = zmin;
            aabb2[3] = xmax;
            aabb2[4] = ymax;
            aabb2[5] = zmax;
            return aabb2;
        } else {
            return this.aabb; // Scene AABB
        }
    }

    /**
     Resets this Scene to its default state.

     References to any components in this Scene will become invalid.

     @method clear
     */
    clear() {
        var component;
        for (const id in this.components) {
            if (this.components.hasOwnProperty(id)) {
                // Each component fires "destroyed" as it is destroyed,
                // which this Scene handles by removing the component
                component = this.components[id];
                if (!component._dontClear) { // Don't destroy components like xeokit.Camera, xeokit.Input, xeokit.Viewport etc.
                    component.destroy();
                }
            }
        }
    }

    /**
     Convenience method that destroys all light sources.

     Removes all {@link AmbientLight"}}AmbientLights{{/crossLink}}, {@link PointLight"}}PointLights{{/crossLink}},
     {@link DirLight"}}DirLights{{/crossLink}} and {@link SpotLight"}}SpotLights{{/crossLink}}.

     @method clearLights
     */
    clearLights() {
        const ids = Object.keys(this.lights);
        for (let i = 0, len = ids.length; i < len; i++) {
            this.lights[ids[i]].destroy();
        }
    }

    /**
     Convenience method that destroys all {@link Clip"}}Clips{{/crossLink}}.

     @method clearClips
     */
    clearClips() {
        const ids = Object.keys(this.clips);
        for (let i = 0, len = ids.length; i < len; i++) {
            this.clips[ids[i]].destroy();
        }
    }

    /**
     Shows or hides a batch of {@link Object"}}Objects{{/crossLink}}, specified by their IDs, GUIDs and/or entity types.

     Each Object indicates its visibility status in its {@link Object/visibility} property.

     Each visible Object is registered in the {@link Scene}'s
     {@link Scene/visibleEntities} map while its {@link Object/entityType}
     is assigned a value.

     @method setVisible
     @param ids {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @param visible {Boolean} The new visibility state.
     @returns {Boolean} True if any {@link Object"}}Objects{{/crossLink}} changed visibility, else false if all updates were redundant and not applied.
     */
    setVisible(ids, visible) {
        return this.withComponents(ids, object => {
            const changed = (object.visible !== visible);
            object.visible = visible;
            return changed;
        });
    }

    /**
     Culls or unculls a batch of {@link Object"}}Objects{{/crossLink}}, specified by their IDs, GUIDs and/or entity types.

     Each Object indicates its culled status in its {@link Object/visibility} property.

     @method setVisible
     @param ids {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @param culled {Boolean} The new cull state.
     @returns {Boolean} True if any {@link Object"}}Objects{{/crossLink}} changed culled state, else false if all updates were redundant and not applied.
     */
    setCulled(ids, culled) {
        return this.withComponents(ids, object => {
            const changed = (object.culled !== culled);
            object.culled = culled;
            return changed;
        });
    }

    /**
     Selects or de-selects a batch of {@link Object"}}Objects{{/crossLink}}, specified by their IDs, GUIDs and/or entity types.

     Each Object indicates its selected status in its {@link Object/selected} property.

     Each selected Object is registered in the {@link Scene}'s
     {@link Scene/selectedEntities} map while its {@link Object/entityType}
     is assigned a value.

     @method setSelected
     @param ids {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @param selected {Boolean} Whether to select or deselect.
     @returns {Boolean} True if any {@link Object"}}Objects{{/crossLink}} changed selection state, else false if all updates were redundant and not applied.
     */
    setSelected(ids, selected) {
        return this.withComponents(ids, object => {
            const changed = (object.selected !== selected);
            object.selected = selected;
            return changed;
        });
    }

    /**
     Highlights or de-highlights a batch of {@link Object"}}Objects{{/crossLink}}, specified by their IDs, GUIDs and/or entity types.

     Each Object indicates its highlight status in its {@link Object/highlighted} property.

     Each highlighted Object is registered in the {@link Scene}'s
     {@link Scene/highlightedEntities} map while its {@link Object/entityType}
     is assigned a value.

     @method setHighlighted
     @param ids {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @param highlighted {Boolean} Whether to highlight or un-highlight.
     @returns {Boolean} True if any {@link Object"}}Objects{{/crossLink}} changed highlighted state, else false if all updates were redundant and not applied.
     */
    setHighlighted(ids, highlighted) {
        return this.withComponents(ids, object => {
            const changed = (object.highlighted !== highlighted);
            object.highlighted = highlighted;
            return changed;
        });
    }

    /**
     Ghosts or un-ghosts a batch of {@link Object"}}Objects{{/crossLink}}, specified by their IDs, GUIDs and/or entity types.

     Each Object indicates its ghosted status in its {@link Object/ghosted} property.

     Each ghosted Object is registered in the {@link Scene}'s
     {@link Scene/ghostedEntities} map when its {@link Object/entityType}
     is assigned a value.

     @method setGhosted
     @param ids {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @param ghosted {Float32Array} Whether to ghost or un-ghost.
     @returns {Boolean} True if any {@link Object"}}Objects{{/crossLink}} changed ghosted state, else false if all updates were redundant and not applied.
     */
    setGhosted(ids, ghosted) {
        return this.withComponents(ids, object => {
            const changed = (object.ghosted !== ghosted);
            object.ghosted = ghosted;
            return changed;
        });
    }

    /**
     Shows or hides wireeframe edges for batch of {@link Object"}}Objects{{/crossLink}}, specified by their IDs, GUIDs and/or entity types.

     @method setEdges
     @param ids {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @param edges {Float32Array} Whether to show or hide edges.
     @returns {Boolean} True if any {@link Object"}}Objects{{/crossLink}} changed edges state, else false if all updates were redundant and not applied.
     */
    setEdges(ids, edges) {
        return this.withComponents(ids, object => {
            const changed = (object.edges !== edges);
            object.edges = edges;
            return changed;
        });
    }

    /**
     Shows or hides an outline around a batch of {@link Object"}}Objects{{/crossLink}}, specified by their IDs, GUIDs and/or entity types.

     Each Object indicates its outlined status in its {@link Object/outlined} property.

     Each outlined Object is registered in the {@link Scene}'s
     {@link Scene/outlinedEntities} map when its {@link Object/entityType}
     is assigned a value.

     @method setOutlined
     @param ids {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @param outlined {Float32Array} Whether to show or hide the outline.
     @returns {Boolean} True if any {@link Object"}}Objects{{/crossLink}} changed outlined state, else false if all updates were redundant and not applied.
     */
    setOutlined(ids, outlined) {
        return this.withComponents(ids, object => {
            const changed = (object.outlined !== outlined);
            object.outlined = outlined;
            return changed;
        });
    }

    /**
     Colorizes a batch of {@link Object"}}Objects{{/crossLink}}, specified by their IDs, GUIDs and/or entity types.

     @method setColorize
     @param ids {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @param [colorize=(1,1,1)] Float32Array RGB colorize factors, multiplied by the rendered pixel colors.
     */
    setColorize(ids, colorize) {
        return this.withComponents(ids, object => {
            object.colorize = colorize;
        });
    }

    /**
     Updates opacities of a batch of {@link Object"}}Objects{{/crossLink}}, specified by their IDs, GUIDs and/or entity types.

     @method setOpacity
     @param ids {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @param [opacity=1] Number Opacity factor in range ````[0..1]````, multiplies by the rendered pixel alphas.
     */
    setOpacity(ids, opacity) {
        return this.withComponents(ids, object => {
            object.opacity = opacity;
        });
    }

    /**
     Sets a batch of {@link Object"}}Objects{{/crossLink}} pickable or unpickable, specified by their IDs, GUIDs and/or entity types.

     Picking is done via calls to {@link Scene/pick:method"}}Scene#pick(){{/crossLink}}.

     @method setPickable
     @param ids {Array} Array of  {@link Object} IDs, GUIDs or entity types.
     @param pickable {Float32Array} Whether to ghost or un-ghost.
     @returns {Boolean} True if any {@link Object"}}Objects{{/crossLink}} changed pickable state, else false if all updates were redundant and not applied.
     */
    setPickable(ids, pickable) {
        return this.withComponents(ids, object => {
            const changed = (object.pickable !== pickable);
            object.pickable = pickable;
            return changed;
        });
    }

    /**
     Iterates with a callback over {@link Component}s, specified by their IDs, GUIDs and/or entity types.

     @method withComponents
     @param ids {String|Array} One or more {@link Component} IDs, GUIDs or entity types.
     @param callback {Function} The callback, which takes each object as its argument.
     */
    withComponents(ids, callback) {
        if (utils.isString(ids)) {
            ids = [ids];
        }
        let changed = false;
        for (let i = 0, len = ids.length; i < len; i++) {
            const id = ids[i];
            let component = this.components[id];
            if (component) {
                changed = callback(component) || changed;
            } else {
                component = this.guidObjects[id];
                if (component) {
                    changed = callback(component) || changed;
                } else {
                    const components = this.entityTypes[id];
                    if (components) {
                        for (const componentId in components) {
                            if (components.hasOwnProperty(componentId)) {
                                changed = callback(components[componentId]) || changed;
                            }
                        }
                    }
                }
            }
        }
        return changed;
    }

    destroy() {

        super.destroy();

        for (const id in this.components) {
            if (this.components.hasOwnProperty(id)) {
                this.components[id].destroy();
            }
        }

        this.canvas.gl = null;

        // Memory leak prevention
        this.models = null;
        this.components = null;
        this.guidObjects = null;
        this.entityTypes = null;
        this.entities = null;
        this.visibleEntities = null;
        this.ghostedEntities = null;
        this.highlightedEntities = null;
        this.selectedEntities = null;
        this.clips = null;
        this.lights = null;
        this.lightMaps = null;
        this.reflectionMaps = null;
        this._objectGUIDs = null;
        this._entityIds = null;
        this._visibleEntityIds = null;
        this._ghostedEntityIds = null;
        this._highlightedEntityIds = null;
        this._selectedEntityIds = null;
        this.types = null;
        this.components = null;
        this.canvas = null;
        this._renderer = null;
        this.input = null;
        this._viewport = null;
        this._camera = null;
    }
}

export {Scene};
