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
import {DirLight} from '../lights/DirLight.js';
import {ReadableGeometry} from "../geometry/ReadableGeometry.js";
import {buildBoxGeometry} from '../geometry/builders/buildBoxGeometry.js';
import {PhongMaterial} from '../materials/PhongMaterial.js';
import {EmphasisMaterial} from '../materials/EmphasisMaterial.js';
import {EdgeMaterial} from '../materials/EdgeMaterial.js';

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

/**
 * @desc Contains the components that comprise a 3D scene.
 *
 * * A {@link Viewer} has a single Scene, which it provides in {@link Viewer#scene}.
 * * Plugins like {@link AxisGizmoPlugin} and {@link PlanViewPlugin} also have their own private Scenes.
 *
 * ## Getting a Viewer's Scene
 *
 * ````javascript
 * var scene = myViewer.scene;
 * ````
 *
 * ## Creating and accessing Scene components
 *
 * As a brief introduction to creating Scene components, we'll create a {@link Mesh} that has a
 * {@link BuildTorusGeometry} and a {@link PhongMaterial}:
 *
 * ````javascript
 * var teapotMesh = new Mesh(scene, {
 *     id: "myMesh",                               // <<---------- ID automatically generated if not provided
 *     geometry: new TorusGeometry(scene),
 *     material: new PhongMaterial(scene, {
 *         id: "myMaterial",
 *         diffuse: [0.2, 0.2, 1.0]
 *     })
 * });
 *
 * teapotMesh.scene.camera.eye = [45, 45, 45];
 * ````
 *
 * Find components by ID in their Scene's {@link Scene#components} map:
 *
 * ````javascript
 * var teapotMesh = scene.components["myMesh"];
 * teapotMesh.visible = false;
 *
 * var teapotMaterial = scene.components["myMaterial"];
 * teapotMaterial.diffuse = [1,0,0]; // Change to red
 * ````
 *
 * A Scene also has a map of component instances for each {@link Component} subtype:
 *
 * ````javascript
 * var meshes = scene.types["Mesh"];
 * var teapotMesh = meshes["myMesh"];
 * teapotMesh.ghosted = true;
 *
 * var phongMaterials = scene.types["PhongMaterial"];
 * var teapotMaterial = phongMaterials["myMaterial"];
 * teapotMaterial.diffuse = [0,1,0]; // Change to green
 * ````
 *
 * See {@link Node}, {@link Node} and {@link Model} for how to create and access more sophisticated content.
 *
 * ## Controlling the camera
 *
 * Use the Scene's {@link Camera} to control the current viewpoint and projection:
 *
 * ````javascript
 * var camera = myScene.camera;
 *
 * camera.eye = [-10,0,0];
 * camera.look = [-10,0,0];
 * camera.up = [0,1,0];
 *
 * camera.projection = "perspective";
 * camera.perspective.fov = 45;
 * //...
 * ````
 *
 * ## Managing the canvas, taking snapshots
 *
 * The Scene's {@link Canvas} component provides various conveniences relevant to the WebGL canvas, such
 * as getting getting snapshots, firing resize events etc:
 *
 * ````javascript
 * var canvas = scene.canvas;
 *
 * canvas.on("boundary", function(boundary) {
 *     //...
 * });
 *
 * var imageData = canvas.getSnapshot({
 *     width: 500,
 *     height: 500,
 *     format: "png"
 * });
 * ````
 *
 * ## Picking
 *
 * Use {@link Scene#pick} to pick and raycast meshes.
 *
 * For example, to pick a point on the surface of the closest mesh at the given canvas coordinates:
 *
 * ````javascript
 * var hit = scene.pick({
 *      pickSurface: true,
 *      canvasPos: [23, 131]
 * });
 *
 * if (hit) { // Picked a Mesh
 *
 *     var mesh = hit.mesh;
 *
 *     var primitive = hit.primitive; // Type of primitive that was picked, usually "triangles"
 *     var primIndex = hit.primIndex; // Position of triangle's first index in the picked Mesh's Geometry's indices array
 *     var indices = hit.indices; // UInt32Array containing the triangle's vertex indices
 *     var localPos = hit.localPos; // Float32Array containing the picked Local-space position on the triangle
 *     var worldPos = hit.worldPos; // Float32Array containing the picked World-space position on the triangle
 *     var viewPos = hit.viewPos; // Float32Array containing the picked View-space position on the triangle
 *     var bary = hit.bary; // Float32Array containing the picked barycentric position within the triangle
 *     var normal = hit.normal; // Float32Array containing the interpolated normal vector at the picked position on the triangle
 *     var uv = hit.uv; // Float32Array containing the interpolated UV coordinates at the picked position on the triangle
 * }
 * ````
 *
 * ## Pick masking
 *
 * We can use {@link Scene#pick}'s ````includeMeshes```` and ````excludeMeshes````  options to mask which {@link Mesh}es we attempt to pick.
 *
 * This is useful for picking <em>through</em> things, to pick only the Meshes of interest.
 *
 * To pick only Meshes ````"gearbox#77.0"```` and ````"gearbox#79.0"````, picking through any other Meshes that are
 * in the way, as if they weren't there:
 *
 * ````javascript
 * var hit = scene.pick({
 *      canvasPos: [23, 131],
 *      includeMeshes: ["gearbox#77.0", "gearbox#79.0"]
 * });
 *
 * if (hit) {
 *       // Mesh will always be either "gearbox#77.0" or "gearbox#79.0"
 *       var mesh = hit.mesh;
 * }
 * ````
 *
 * To pick any pickable Mesh, except for ````"gearbox#77.0"```` and ````"gearbox#79.0"````, picking through those
 * Meshes if they happen to be in the way:
 *
 * ````javascript
 * var hit = scene.pick({
 *      canvasPos: [23, 131],
 *      excludeMeshes: ["gearbox#77.0", "gearbox#79.0"]
 * });
 *
 * if (hit) {
 *       // Mesh will never be "gearbox#77.0" or "gearbox#79.0"
 *       var mesh = hit.mesh;
 * }
 * ````
 *
 * See {@link Scene#pick} for more info on picking.
 *
 * ## Querying and tracking boundaries
 *
 * Getting a Scene's World-space axis-aligned boundary (AABB):
 *
 * ````javascript
 * var aabb = scene.aabb; // [xmin, ymin, zmin, xmax, ymax, zmax]
 * ````
 *
 * Subscribing to updates to the AABB, which occur whenever {@link Mesh}es are transformed, their
 * {@link ReadableGeometry}s have been updated, or the {@link Camera} has moved:
 *
 * ````javascript
 * scene.on("boundary", function() {
 *      var aabb = scene.aabb;
 * });
 * ````
 *
 * Getting the AABB of the {@link Node}s with the given IDs:
 *
 * ````JavaScript
 * scene.getAABB(); // Gets collective boundary of all Mesh Objects in the scene
 * scene.getAABB("saw"); // Gets boundary of an Object
 * scene.getAABB(["saw", "gearbox"]); // Gets collective boundary of two Objects
 * ````
 *
 * See {@link Scene#getAABB} and {@link Node} for more info on querying and tracking boundaries.
 *
 * ## Managing the viewport
 *
 * The Scene's {@link Viewport} component manages the WebGL viewport:
 *
 * ````javascript
 * var viewport = scene.viewport
 * viewport.boundary = [0, 0, 500, 400];;
 * ````
 *
 * ## Controlling rendering
 *
 * You can configure a Scene to perform multiple "passes" (renders) per frame. This is useful when we want to render the
 * scene to multiple viewports, such as for stereo effects.
 *
 * In the example, below, we'll configure the Scene to render twice on each frame, each time to different viewport. We'll do this
 * with a callback that intercepts the Scene before each render and sets its {@link Viewport} to a
 * different portion of the canvas. By default, the Scene will clear the canvas only before the first render, allowing the
 * two views to be shown on the canvas at the same time.
 *
 * ````Javascript
 * // Load a glTF model
 * var model = new GLTFModel({
 *     src: "models/gltf/GearboxAssy/glTF-MaterialsCommon/GearboxAssy.gltf"
 * });
 *
 * var scene = model.scene;
 * var viewport = scene.viewport;
 *
 * // Configure Scene to render twice for each frame
 * scene.passes = 2; // Default is 1
 * scene.clearEachPass = false; // Default is false
 *
 * // Render to a separate viewport on each render
 *
 * var viewport = scene.viewport;
 * viewport.autoBoundary = false;
 *
 * scene.on("rendering", function (e) {
 *      switch (e.pass) {
 *          case 0:
 *              viewport.boundary = [0, 0, 200, 200]; // xmin, ymin, width, height
 *              break;
 *
 *          case 1:
 *              viewport.boundary = [200, 0, 200, 200];
 *              break;
 *      }
 * });
 *
 * // We can also intercept the Scene after each render,
 * // (though we're not using this for anything here)
 * scene.on("rendered", function (e) {
 *      switch (e.pass) {
 *          case 0:
 *              break;
 *
 *          case 1:
 *              break;
 *      }
 * });
 * ````
 *
 * ## Gamma correction
 *
 * Within its shaders, xeokit performs shading calculations in linear space.
 *
 * By default, the Scene expects color textures (eg. {@link PhongMaterial#diffuseMap},
 * {@link MetallicMaterial#baseColorMap} and {@link SpecularMaterial#diffuseMap}) to
 * be in pre-multipled gamma space, so will convert those to linear space before they are used in shaders. Other textures are
 * always expected to be in linear space.
 *
 * By default, the Scene will also gamma-correct its rendered output.
 *
 * You can configure the Scene to expect all those color textures to be linear space, so that it does not gamma-correct them:
 *
 * ````javascript
 * scene.gammaInput = false;
 * ````
 *
 * You would still need to gamma-correct the output, though, if it's going straight to the canvas, so normally we would
 * leave that enabled:
 *
 * ````javascript
 * scene.gammaOutput = true;
 * ````
 *
 * See {@link Texture} for more information on texture encoding and gamma.
 *
 * @class Scene
 */
class Scene extends Component {

    /**
     @private
     */
    get type() {
        return "Scene";
    }

    /**
     * @constructor
     */
    constructor(cfg = {}) {

        super(null, cfg);

        if (!cfg.canvasId) {
            throw "Mandatory config expected: canvasId";
        }

        const canvas = document.getElementById(cfg.canvasId);
        if (!canvas) {
            throw "Canvas not found: '" + cfg.canvasId + "'";
        }

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
         * Map of {@link Entity}s that represent a models.
         *
         * Each {@link Entity} is mapped here by {@link Entity#id} when {@link Entity#isModel} is ````true````.
         *
         * @property models
         * @final
         * @type {{String:Entity}}
         */
        this.models = {};

        /**
         * Map of {@link Entity}s that represents objects.
         *
         * Each {@link Entity} is mapped here by {@link Entity#id} when {@link Entity#isObject} is ````true````.
         *
         * @property objects
         * @final
         * @type {{String:Entity}}
         */
        this.objects = {};

        /**
         * Map of currently visible {@link Entity}s that represent objects.
         *
         * An Entity represents an object if {@link Entity#isObject} is ````true````, and is visible when {@link Entity#visible} is true.
         *
         * @property visibleObjects
         * @final
         * @type {{String:Object}}
         */
        this.visibleObjects = {};

        /**
         * Map of currently ghosted {@link Entity}s that represent objects.
         *
         * An Entity represents an object if {@link Entity#isObject} is ````true````, and is ghosted when {@link Entity#ghosted} is true.
         *
         * Each {@link Entity} is mapped here by {@link Entity#id}.
         *
         * @property ghostedObjects
         * @final
         * @type {{String:Object}}
         */
        this.ghostedObjects = {};

        /**
         * Map of currently highlighted {@link Entity}s that represent objects.
         *
         * An Entity represents an object if {@link Entity#isObject} is ````true```` is true, and is highlighted when {@link Entity#highlighted} is true.
         *
         * Each {@link Entity} is mapped here by {@link Entity#id}.
         *
         * @property highlightedObjects
         * @final
         * @type {{String:Object}}
         */
        this.highlightedObjects = {};

        /**
         * Map of currently selected {@link Entity}s that represent objects.
         *
         * An Entity represents an object if {@link Entity#isObject} is true, and is selected while {@link Entity#selected} is true.
         *
         * Each {@link Entity} is mapped here by {@link Entity#id}.
         *
         * @property selectedObjects
         * @final
         * @type {{String:Object}}
         */
        this.selectedObjects = {};

        // Cached ID arrays, lazy-rebuilt as needed when stale after map updates

        /**
         Lazy-regenerated ID lists.
         */
        this._modelIds = null;
        this._objectIds = null;
        this._visibleObjectIds = null;
        this._ghostedObjectIds = null;
        this._highlightedObjectIds = null;
        this._selectedObjectIds = null;

        this._collidables = {}; // Components that contribute to the Scene AABB
        this._compilables = {}; // Components that require shader compilation

        this._needRecompile = false;

        /**
         * For each {@link Component} type, a map of IDs to {@link Component} instances of that type.
         *
         * @type {{String:{String:Component}}}
         */
        this.types = {};

        /**
         * The {@link Component}s within this Scene, each mapped to its {@link Component#id}.
         *
         * *@type {{String:Component}}
         */
        this.components = {};

        /**
         * The {@link Clip}s in this Scene, each mapped to its {@link Clip#id}.
         *
         * @type {{String:Clip}}
         */
        this.clips = {};

        /**
         * The {@link Light}s in this Scene, each mapped to its {@link Light#id}.
         *
         * @type {{String:Light}}
         */
        this.lights = {};

        /**
         * The {@link LightMap}s in this Scene, each mapped to its its {@link LightMap#id}.
         *
         * @type {{String:LightMap}}
         */
        this.lightMaps = {};

        /**
         * The {@link ReflectionMap}s in this Scene, each mapped to its {@link ReflectionMap#id}.
         *
         * @type {{String:ReflectionMap}}
         */
        this.reflectionMaps = {};

        /**
         * Manages the HTML5 canvas for this Scene.
         *
         * @type {Canvas}
         */
        this.canvas = new Canvas(this, {
            dontClear: true, // Never destroy this component with Scene#clear();
            canvas: canvas,
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
                    if (light.castsShadow) {
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
         * Publishes input events that occur on this Scene's canvas.
         *
         * @property input
         * @type {Input}
         * @final
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
        dummy = this.edgeMaterial;
        dummy = this.selectedMaterial;
        dummy = this.highlightMaterial;
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

    _registerModel(entity) {
        this.models[entity.id] = entity;
        this._modelIds = null; // Lazy regenerate
    }

    _deregisterModel(entity) {
        delete this.models[entity.id];
        this._modelIds = null; // Lazy regenerate
    }

    _registerObject(entity) {
        this.objects[entity.id] = entity;
        this._objectIds = null; // Lazy regenerate
    }

    _deregisterObject(entity) {
        delete this.objects[entity.id];
        this._objectIds = null; // Lazy regenerate
    }

    _objectVisibilityUpdated(entity) {
        if (entity.visible) {
            this.visibleObjects[entity.id] = entity;
        } else {
            delete this.visibleObjects[entity.id];
        }
        this._visibleObjectIds = null; // Lazy regenerate
    }

    _objectGhostedUpdated(entity) {
        if (entity.ghosted) {
            this.ghostedObjects[entity.id] = entity;
        } else {
            delete this.ghostedObjects[entity.id];
        }
        this._ghostedObjectIds = null; // Lazy regenerate
    }

    _objectHighlightedUpdated(entity) {
        if (entity.highlighted) {
            this.highlightedObjects[entity.id] = entity;
        } else {
            delete this.highlightedObjects[entity.id];
        }
        this._highlightedObjectIds = null; // Lazy regenerate
    }

    _objectSelectedUpdated(entity) {
        if (entity.selected) {
            this.selectedObjects[entity.id] = entity;
        } else {
            delete this.selectedObjects[entity.id];
        }
        this._selectedObjectIds = null; // Lazy regenerate
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
             * @param {Number} pass Index of the pass we are about to render (see {@link Scene#passes}).
             */
            this.fire("rendering", renderEvent, true);

            clear = clearEachPass || (pass === 0);

            this._renderer.render({pass: pass, clear: clear, force: forceRender});

            /**
             * Fired when we have just rendered a frame for a Scene.
             *
             * @event rendering
             * @param {String} sceneID The ID of this Scene.
             * @param {Number} pass Index of the pass we rendered (see {@link Scene#passes}).
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
     * Gets the IDs of the {@link Entity}s in {@link Scene#models}.
     *
     * @type {String[]}
     */
    get modelIds() {
        if (!this._modelIds) {
            this._modelIds = Object.keys(this.models);
        }
        return this._modelIds;
    }

    /**
     * Gets the IDs of the {@link Entity}s in {@link Scene#objects}.
     *
     * @type {String[]}
     */
    get objectIds() {
        if (!this._objectIds) {
            this._objectIds = Object.keys(this.objects);
        }
        return this._objectIds;
    }

    /**
     * Gets the IDs of the {@link Entity}s in {@link Scene#visibleObjects}.
     *
     * @type {String[]}
     */
    get visibleObjectIds() {
        if (!this._visibleObjectIds) {
            this._visibleObjectIds = Object.keys(this.visibleObjects);
        }
        return this._visibleObjectIds;
    }

    /**
     * Gets the IDs of the {@link Entity}s in {@link Scene#ghostedObjects}.
     *
     * @type {String[]}
     */
    get ghostedObjectIds() {
        if (!this._ghostedObjectIds) {
            this._ghostedObjectIds = Object.keys(this.ghostedObjects);
        }
        return this._ghostedObjectIds;
    }

    /**
     * Gets the IDs of the {@link Entity}s in {@link Scene#highlightedObjects}.
     *
     * @type {String[]}
     */
    get highlightedObjectIds() {
        if (!this._highlightedObjectIds) {
            this._highlightedObjectIds = Object.keys(this.highlightedObjects);
        }
        return this._highlightedObjectIds;
    }

    /**
     * Gets the IDs of the {@link Entity}s in {@link Scene#selectedObjects}.
     *
     * @type {String[]}
     */
    get selectedObjectIds() {
        if (!this._selectedObjectIds) {
            this._selectedObjectIds = Object.keys(this.selectedObjects);
        }
        return this._selectedObjectIds;
    }

    /**
     * Sets the number of "ticks" that happen between each render or this Scene.
     *
     * Default value is ````1````.
     *
     * @type {Number}
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

    /**
     * Gets the number of "ticks" that happen between each render or this Scene.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    get ticksPerRender() {
        return this._ticksPerRender;
    }

    /**
     * Sets the number of times this Scene renders per frame.
     *
     * Default value is ````1````.
     *
     * @type {Number}
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

    /**
     * Gets the number of times this Scene renders per frame.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    get passes() {
        return this._passes;
    }

    /**
     * When {@link Scene#passes} is greater than ````1````, indicates whether or not to clear the canvas before each pass (````true````) or just before the first pass (````false````).
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    set clearEachPass(value) {
        value = !!value;
        if (value === this._clearEachPass) {
            return;
        }
        this._clearEachPass = value;
        this.glRedraw();
    }

    /**
     * When {@link Scene#passes} is greater than ````1````, indicates whether or not to clear the canvas before each pass (````true````) or just before the first pass (````false````).
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    get clearEachPass() {
        return this._clearEachPass;
    }

    /**
     * Sets whether or not {@link Scene} should expect all {@link Texture}s and colors to have pre-multiplied gamma.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    set gammaInput(value) {
        value = value !== false;
        if (value === this._renderer.gammaInput) {
            return;
        }
        this._renderer.gammaInput = value;
        this._needRecompile = true;
    }

    /**
     * Gets whether or not {@link Scene} should expect all {@link Texture}s and colors to have pre-multiplied gamma.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    get gammaInput() {
        return this._renderer.gammaInput;
    }

    /**
     * Sets whether or not to render pixels with pre-multiplied gama.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    set gammaOutput(value) {
        value = value !== false;
        if (value === this._renderer.gammaOutput) {
            return;
        }
        this._renderer.gammaOutput = value;
        this._needRecompile = true;
    }

    /**
     * Gets whether or not to render pixels with pre-multiplied gama.
     *
     * Default value is ````true````.
     *
     * @type {Boolean}
     */
    get gammaOutput() {
        return this._renderer.gammaOutput;
    }

    /**
     * Sets the gamma factor to use when {@link Scene#gammaOutput} is set true.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    set gammaFactor(value) {
        value = (value === undefined || value === null) ? 2.2 : value;
        if (value === this._renderer.gammaFactor) {
            return;
        }
        this._renderer.gammaFactor = value;
        this.glRedraw();
    }

    /**
     * Gets the gamma factor to use when {@link Scene#gammaOutput} is set true.
     *
     * Default value is ````1.0````.
     *
     * @type {Number}
     */
    get gammaFactor() {
        return this._renderer.gammaFactor;
    }

    /**
     * Gets the default {@link Geometry} for this Scene, which is a {@link ReadableGeometry} with a unit-sized box shape.
     *
     * Has {@link ReadableGeometry#id} set to "default.geometry".
     *
     * {@link Mesh}s in this Scene have {@link Mesh#geometry} set to this {@link ReadableGeometry} by default.
     *
     * @type {ReadableGeometry}
     */
    get geometry() {
        return this.components["default.geometry"] || buildBoxGeometry(ReadableGeometry, this, {
            id: "default.geometry",
            dontClear: true
        });
    }

    /**
     * Gets the default {@link Material} for this Scene, which is a {@link PhongMaterial}.
     *
     * Has {@link PhongMaterial#id} set to "default.material".
     *
     * {@link Mesh}s in this Scene have {@link Mesh#material} set to this {@link PhongMaterial} by default.
     *
     * @type {PhongMaterial}
     */
    get material() {
        return this.components["default.material"] || new PhongMaterial(this, {
            id: "default.material",
            emissive: [0.4, 0.4, 0.4], // Visible by default on geometry without normals
            dontClear: true
        });
    }

    /**
     * Gets the default ghosting {@link EmphasisMaterial} for this Scene.
     *
     * Has {@link EmphasisMaterial#id} set to "default.ghostMaterial".
     *
     * {@link Mesh}s in this Scene have {@link Mesh#ghostMaterial} set to this {@link EmphasisMaterial} by default.
     *
     * {@link Mesh}s are ghosted while {@link Mesh#ghosted} is ````true````.
     *
     * @type {EmphasisMaterial}
     */
    get ghostMaterial() {
        return this.components["default.ghostMaterial"] || new EmphasisMaterial(this, {
            id: "default.ghostMaterial",
            preset: "sepia",
            dontClear: true
        });
    }

    /**
     * Gets the default highlight {@link EmphasisMaterial} for this Scene.
     *
     * Has {@link EmphasisMaterial#id} set to "default.highlightMaterial".
     *
     * {@link Mesh}s in this Scene have {@link Mesh#highlightMaterial} set to this {@link EmphasisMaterial} by default.
     *
     * {@link Mesh}s are highlighted while {@link Mesh#highlighted} is ````true````.
     *
     * @type {EmphasisMaterial}
     */
    get highlightMaterial() {
        return this.components["default.highlightMaterial"] || new EmphasisMaterial(this, {
            id: "default.highlightMaterial",
            preset: "yellowHighlight",
            dontClear: true
        });
    }

    /**
     * Gets the default selection {@link EmphasisMaterial} for this Scene.
     *
     * Has {@link EmphasisMaterial#id} set to "default.selectedMaterial".
     *
     * {@link Mesh}s in this Scene have {@link Mesh#highlightMaterial} set to this {@link EmphasisMaterial} by default.
     *
     * {@link Mesh}s are highlighted while {@link Mesh#highlighted} is ````true````.
     *
     * @type {EmphasisMaterial}
     */
    get selectedMaterial() {
        return this.components["default.selectedMaterial"] || new EmphasisMaterial(this, {
            id: "default.selectedMaterial",
            preset: "greenSelected",
            dontClear: true
        });
    }

    /**
     * Gets the default {@link EdgeMaterial} for this Scene.
     *
     * Has {@link EdgeMaterial#id} set to "default.edgeMaterial".
     *
     * {@link Mesh}s in this Scene have {@link Mesh#edgeMaterial} set to this {@link EdgeMaterial} by default.
     *
     * {@link Mesh}s have their edges emphasized while {@link Mesh#edges} is ````true````.
     *
     * @type {EdgeMaterial}
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
     * Gets the {@link Viewport} for this Scene.
     *
     * @type Viewport
     */
    get viewport() {
        return this._viewport;
    }

    /**
     * Gets the {@link Camera} for this Scene.
     *
     * @type {Camera}
     */
    get camera() {
        return this._camera;
    }

    /**
     * Gets the World-space 3D center of this Scene.
     *
     *@type {Number[]}
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
     * Gets the World-space axis-aligned 3D boundary (AABB) of this Scene.
     *
     * The AABB is represented by a six-element Float32Array containing the min/max extents of the axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Number[]}
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

    _setAABBDirty() {
        //if (!this._aabbDirty) {
        this._aabbDirty = true;
        this.fire("boundary");
        // }
    }

    /**
     * Attempts to pick an {@link Mesh} in this Scene.
     *
     * Ignores {@link Mesh}es with {@link Mesh#pickable} set ````false````.
     *
     * When a {@link Mesh} is picked, fires a "pick" event on the {@link Mesh} with the pick result as parameters.
     *
     * Picking the {@link Mesh} at the given canvas coordinates:

     * ````javascript
     * var pickResult = scene.pick({
     *          canvasPos: [23, 131]
     *       });
     *
     * if (pickResult) { // Picked a Mesh
     *         var mesh = pickResult.mesh;
     *     }
     * ````
     *
     * Picking, with a ray cast through the canvas, hits a {@link Mesh}:
     *
     * ````javascript
     * var pickResult = scene.pick({
     *         pickSurface: true,
     *         canvasPos: [23, 131]
     *      });
     *
     * if (pickResult) { // Picked a Mesh
     *
     *     var mesh = pickResult.mesh;
     *
     *        // These properties are only on the pick result when we do a ray-pick:
     *
     *        var primitive = pickResult.primitive; // Type of primitive that was picked, usually "triangles"
     *        var primIndex = pickResult.primIndex; // Position of triangle's first index in the picked Mesh's Geometry's indices array
     *        var indices = pickResult.indices; // UInt32Array containing the triangle's vertex indices
     *        var localPos = pickResult.localPos; // Float32Array containing the picked Local-space position on the triangle
     *        var worldPos = pickResult.worldPos; // Float32Array containing the picked World-space position on the triangle
     *        var viewPos = pickResult.viewPos; // Float32Array containing the picked View-space position on the triangle
     *        var bary = pickResult.bary; // Float32Array containing the picked barycentric position within the triangle
     *        var normal = pickResult.normal; // Float32Array containing the interpolated normal vector at the picked position on the triangle
     *        var uv = pickResult.uv; // Float32Array containing the interpolated UV coordinates at the picked position on the triangle
     * }
     * ````
     *
     * Picking the {@link Mesh} that intersects an arbitrarily-aligned World-space ray:
     *
     * ````javascript
     * var pickResult = scene.pick({
     *       pickSurface: true,   // Picking with arbitrarily-positioned ray
     *       origin: [0,0,-5],    // Ray origin
     *       direction: [0,0,1]   // Ray direction
     * });
     *
     * if (pickResult) { // Picked a Mesh with the ray
     *
     *       var mesh = pickResult.mesh;
     *
     *       var primitive = pickResult.primitive; // Type of primitive that was picked, usually "triangles"
     *       var primIndex = pickResult.primIndex; // Position of triangle's first index in the picked Mesh's Geometry's indices array
     *       var indices = pickResult.indices; // UInt32Array containing the triangle's vertex indices
     *       var localPos = pickResult.localPos; // Float32Array containing the picked Local-space position on the triangle
     *       var worldPos = pickResult.worldPos; // Float32Array containing the picked World-space position on the triangle
     *       var viewPos = pickResult.viewPos; // Float32Array containing the picked View-space position on the triangle
     *       var bary = pickResult.bary; // Float32Array containing the picked barycentric position within the triangle
     *       var normal = pickResult.normal; // Float32Array containing the interpolated normal vector at the picked position on the triangle
     *       var uv = pickResult.uv; // Float32Array containing the interpolated UV coordinates at the picked position on the triangle
     *       var origin = pickResult.origin; // Float32Array containing the World-space ray origin
     *       var direction = pickResult.direction; // Float32Array containing the World-space ray direction
     *  }
     *  ````
     *
     * @param {*} params Picking parameters.
     * @param {Boolean} [params.pickSurface=false] Whether to find the picked position on the surface of the Mesh.
     * @param {Number[]} [params.canvasPos] Canvas-space coordinates. When ray-picking, this will override the **origin** and ** direction** parameters and will cause the ray to be fired through the canvas at this position, directly along the negative View-space Z-axis.
     * @param {Number[]} [params.origin] World-space ray origin when ray-picking. Ignored when canvasPos given.
     * @param {Number[]} [params.direction] World-space ray direction when ray-picking. Also indicates the length of the ray. Ignored when canvasPos given.
     * @param {String[]} [params.includeMeshes] IDs of {@link Mesh}es to restrict picking to. When given, ignores {@link Mesh}es whose IDs are not in this list.
     * @param {String[]} [params.excludeMeshes] IDs of {@link Mesh}es to ignore. When given, will pick *through* these {@link Mesh}es, as if they were not there.
     * @param {PickResult} [pickResult] Holds the results of the pick attempt. Will use the Scene's singleton PickResult if you don't supply your own.
     * @returns {PickResult} Holds results of the pick attempt, returned when an {@link Mesh} is picked, else null. See method comments for description.
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

        pickResult = this._renderer.pick(params, pickResult);

        if (pickResult) {
            utils.apply(params, pickResult);
            pickResult.object = pickResult.mesh; // Backwards compat
            if (params.pickSurface) {
                pickResult.mesh.getPickResult(pickResult);
            }
            pickResult.mesh.fire("picked", pickResult); // TODO: BigModelMesh doeosn't fire events...
            return pickResult;
        }
    }

    /**
     * Destroys all non-default {@link Component}s in this Scene.
     */
    clear() {
        var component;
        for (const id in this.components) {
            if (this.components.hasOwnProperty(id)) {
                component = this.components[id];
                if (!component._dontClear) { // Don't destroy components like Camera, Input, Viewport etc.
                    component.destroy();
                }
            }
        }
    }

    /**
     * Destroys all {@link Light}s in this Scene..
     */
    clearLights() {
        const ids = Object.keys(this.lights);
        for (let i = 0, len = ids.length; i < len; i++) {
            this.lights[ids[i]].destroy();
        }
    }

    /**
     * Destroys all {@link Clip}s in this Scene.
     */
    clearClips() {
        const ids = Object.keys(this.clips);
        for (let i = 0, len = ids.length; i < len; i++) {
            this.clips[ids[i]].destroy();
        }
    }

    /**
     * Gets the collective axis-aligned boundary (AABB) of a batch of {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * Each {@link Entity} on which {@link Entity#isObject} is registered by {@link Entity#id} in {@link Scene#visibleObjects}.
     *
     * Each {@link Entity} is only included in the AABB when {@link Entity#collidable} is ````true````.
     *
     * Returns the AABB of all {@link Entity}s in {@link Scene#objects} by default, or TODO
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @returns {[Number, Number, Number, Number, Number, Number]} An axis-aligned World-space bounding box, given as elements ````[xmin, ymin, zmin, xmax, ymax, zmax]````.
     */
    getAABB(ids) {
        if (ids === undefined) {
            return this.aabb;
        }
        if (utils.isString(ids)) {
            const entity = this.objects[ids];
            if (entity && entity.aabb) { // A Component subclass with an AABB
                return entity.aabb;
            }
            ids = [ids]; // Must be an entity type
        }
        if (ids.length === 0) {
            return this.aabb;
        }
        let xmin = 100000;
        let ymin = 100000;
        let zmin = 100000;
        let xmax = -100000;
        let ymax = -100000;
        let zmax = -100000;
        let valid;
        this._withEntities(ids, this.objects, entity => {
                if (entity.collidable) {
                    const aabb = entity.aabb;
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
     * Batch-updates {@link Entity#visible} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * Each {@link Entity} on which both {@link Entity#isObject} and {@link Entity#visible} are ````true```` is
     * registered by {@link Entity#id} in {@link Scene#visibleObjects}.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Boolean} visible Whether or not to cull.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsVisible(ids, visible) {
        return this._withEntities(ids, this.objects, entity => {
            const changed = (entity.visible !== visible);
            entity.visible = visible;
            return changed;
        });
    }

    /**
     * Batch-updates {@link Entity#collidable} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Boolean} collidable Whether or not to cull.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsCollidable(ids, collidable) {
        return this._withEntities(ids, this.objects, entity => {
            const changed = (entity.collidable !== collidable);
            entity.collidable = collidable;
            return changed;
        });
    }
    
    /**
     * Batch-updates {@link Entity#culled} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Boolean} culled Whether or not to cull.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsCulled(ids, culled) {
        return this._withEntities(ids, this.objects, entity => {
            const changed = (entity.culled !== culled);
            entity.culled = culled;
            return changed;
        });
    }

    /**
     * Batch-updates {@link Entity#selected} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * Each {@link Entity} on which both {@link Entity#isObject} and {@link Entity#selected} are ````true```` is
     * registered by {@link Entity#id} in {@link Scene#selectedObjects}.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Boolean} selected Whether or not to highlight.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsSelected(ids, selected) {
        return this._withEntities(ids, this.objects, entity => {
            const changed = (entity.selected !== selected);
            entity.selected = selected;
            return changed;
        });
    }

    /**
     * Batch-updates {@link Entity#highlighted} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * Each {@link Entity} on which both {@link Entity#isObject} and {@link Entity#highlighted} are ````true```` is
     * registered by {@link Entity#id} in {@link Scene#highlightedObjects}.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Boolean} highlighted Whether or not to highlight.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsHighlighted(ids, highlighted) {
        return this._withEntities(ids, this.objects, entity => {
            const changed = (entity.highlighted !== highlighted);
            entity.highlighted = highlighted;
            return changed;
        });
    }

    /**
     * Batch-updates {@link Entity#ghosted} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * Each {@link Entity} on which both {@link Entity#isObject} and {@link Entity#ghosted} are ````true```` is
     * registered by {@link Entity#id} in {@link Scene#ghostedObjects}.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Boolean} ghosted Whether or not to ghost.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsGhosted(ids, ghosted) {
        return this._withEntities(ids, this.objects, entity => {
            const changed = (entity.ghosted !== ghosted);
            entity.ghosted = ghosted;
            return changed;
        });
    }

    /**
     * Batch-updates {@link Entity#edges} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Boolean} edges Whether or not to show edges.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsEdges(ids, edges) {
        return this._withEntities(ids, this.objects, entity => {
            const changed = (entity.edges !== edges);
            entity.edges = edges;
            return changed;
        });
    }

    /**
     * Batch-updates {@link Entity#colorize} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Number[]} [colorize=(1,1,1)] RGB colorize factors, multiplied by the rendered pixel colors.
     * @returns {Boolean} True if any {@link Entity}s changed opacity, else false if all updates were redundant and not applied.
     */
    setObjectsColorized(ids, colorize) {
        return this._withEntities(ids, this.objects, entity => {
            entity.colorize = colorize;
        });
    }

    /**
     * Batch-updates {@link Entity#opacity} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Number} [opacity=1.0] RGB colorize factors, multiplied by the rendered pixel colors.
     * @returns {Boolean} True if any {@link Entity}s changed opacity, else false if all updates were redundant and not applied.
     */
    setObjectsOpacity(ids, opacity) {
        return this._withEntities(ids, this.objects, entity => {
            const changed = (entity.opacity !== opacity);
            entity.opacity = opacity;
            return changed;
        });
    }

    /**
     * Batch-updates {@link Entity#pickable} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Boolean} pickable Whether or not to enable picking.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsPickable(ids, pickable) {
        return this._withEntities(ids, this.objects, entity => {
            const changed = (entity.pickable !== pickable);
            entity.pickable = pickable;
            return changed;
        });
    }

    _withEntities(ids, entities, callback) {
        if (utils.isString(ids)) {
            ids = [ids];
        }
        let changed = false;
        for (let i = 0, len = ids.length; i < len; i++) {
            const id = ids[i];
            let entity = entities[id];
            if (entity) {
                changed = callback(entity) || changed;
            }
         //   this.warn("Entity not found: '" + id + "'");
        }
        return changed;
    }

    /**
     * Destroys this Scene.
     */
    destroy() {

        super.destroy();

        for (const id in this.components) {
            if (this.components.hasOwnProperty(id)) {
                this.components[id].destroy();
            }
        }

        this.canvas.gl = null;

        // Memory leak prevention
        this.components = null;
        this.models = null;
        this.objects = null;
        this.visibleObjects = null;
        this.ghostedObjects = null;
        this.highlightedObjects = null;
        this.selectedObjects = null;
        this.clips = null;
        this.lights = null;
        this.lightMaps = null;
        this.reflectionMaps = null;
        this._objectIds = null;
        this._visibleObjectIds = null;
        this._ghostedObjectIds = null;
        this._highlightedObjectIds = null;
        this._selectedObjectIds = null;
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
