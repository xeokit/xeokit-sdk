import {core} from '../core.js';
import {utils} from '../utils.js';
import {math} from '../math/math.js';
import {Component} from '../Component.js';
import {Canvas} from '../canvas/Canvas.js';
import {Renderer} from '../webgl/Renderer.js';
import {Input} from '../input/Input.js';
import {Viewport} from '../viewport/Viewport.js';
import {Camera} from '../camera/Camera.js';
import {DirLight} from '../lights/DirLight.js';
import {AmbientLight} from '../lights/AmbientLight.js';
import {ReadableGeometry} from "../geometry/ReadableGeometry.js";
import {buildBoxGeometry} from '../geometry/builders/buildBoxGeometry.js';
import {PhongMaterial} from '../materials/PhongMaterial.js';
import {EmphasisMaterial} from '../materials/EmphasisMaterial.js';
import {EdgeMaterial} from '../materials/EdgeMaterial.js';
import {Metrics} from "../metriqs/Metriqs.js";
import {SAO} from "../postfx/SAO.js";
import {CrossSections} from "../postfx/CrossSections.js";
import {PointsMaterial} from "../materials/PointsMaterial.js";
import {LinesMaterial} from "../materials/LinesMaterial.js";
import {SectionCaps} from '../sectionCaps/SectionCaps.js';

// Enables runtime check for redundant calls to object state update methods, eg. Scene#_objectVisibilityUpdated
const ASSERT_OBJECT_STATE_UPDATE = false;

// Cached vars to avoid garbage collection

function getEntityIDMap(scene, entityIds) {
    const map = {};
    let entityId;
    let entity;
    for (let i = 0, len = entityIds.length; i < len; i++) {
        entityId = entityIds[i];
        entity = scene.components[entityId];
        if (!entity) {
            scene.warn("pick(): Component not found: " + entityId);
            continue;
        }
        if (!entity.isEntity) {
            scene.warn("pick(): Component is not an Entity: " + entityId);
            continue;
        }
        map[entityId] = true;
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
 * * Plugins like {@link AxisGizmoPlugin} also have their own private Scenes.
 * * Each Scene has a corresponding {@link MetaScene}, which the Viewer provides in {@link Viewer#metaScene}.
 *
 * ## Getting a Viewer's Scene
 *
 * ````javascript
 * var scene = viewer.scene;
 * ````
 *
 * ## Creating and accessing Scene components
 *
 * As a brief introduction to creating Scene components, we'll create a {@link Mesh} that has a
 * {@link buildTorusGeometry} and a {@link PhongMaterial}:
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
 * teapotMesh.xrayed = true;
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
 * ## Managing the canvas
 *
 * The Scene's {@link Canvas} component provides various conveniences relevant to the WebGL canvas, such
 * as firing resize events etc:
 *
 * ````javascript
 * var canvas = scene.canvas;
 *
 * canvas.on("boundary", function(boundary) {
 *     //...
 * });
 * ````
 *
 * ## Picking
 *
 * Use {@link Scene#pick} to pick and raycast entites.
 *
 * For example, to pick a point on the surface of the closest entity at the given canvas coordinates:
 *
 * ````javascript
 * var pickResult = scene.pick({
 *      pickSurface: true,
 *      canvasPos: [23, 131]
 * });
 *
 * if (pickResult) { // Picked an entity
 *
 *     var entity = pickResult.entity;
 *
 *     var primitive = pickResult.primitive; // Type of primitive that was picked, usually "triangles"
 *     var primIndex = pickResult.primIndex; // Position of triangle's first index in the picked Mesh's Geometry's indices array
 *     var indices = pickResult.indices; // UInt32Array containing the triangle's vertex indices
 *     var localPos = pickResult.localPos; // Float64Array containing the picked Local-space position on the triangle
 *     var worldPos = pickResult.worldPos; // Float64Array containing the picked World-space position on the triangle
 *     var viewPos = pickResult.viewPos; // Float64Array containing the picked View-space position on the triangle
 *     var bary = pickResult.bary; // Float64Array containing the picked barycentric position within the triangle
 *     var normal = pickResult.normal; // Float64Array containing the interpolated normal vector at the picked position on the triangle
 *     var uv = pickResult.uv; // Float64Array containing the interpolated UV coordinates at the picked position on the triangle
 * }
 * ````
 *
 * ## Pick masking
 *
 * We can use {@link Scene#pick}'s ````includeEntities```` and ````excludeEntities````  options to mask which {@link Mesh}es we attempt to pick.
 *
 * This is useful for picking through things, to pick only the Entities of interest.
 *
 * To pick only Entities ````"gearbox#77.0"```` and ````"gearbox#79.0"````, picking through any other Entities that are
 * in the way, as if they weren't there:
 *
 * ````javascript
 * var pickResult = scene.pick({
 *      canvasPos: [23, 131],
 *      includeEntities: ["gearbox#77.0", "gearbox#79.0"]
 * });
 *
 * if (pickResult) {
 *       // Entity will always be either "gearbox#77.0" or "gearbox#79.0"
 *       var entity = pickResult.entity;
 * }
 * ````
 *
 * To pick any pickable Entity, except for ````"gearbox#77.0"```` and ````"gearbox#79.0"````, picking through those
 * Entities if they happen to be in the way:
 *
 * ````javascript
 * var pickResult = scene.pick({
 *      canvasPos: [23, 131],
 *      excludeEntities: ["gearbox#77.0", "gearbox#79.0"]
 * });
 *
 * if (pickResult) {
 *       // Entity will never be "gearbox#77.0" or "gearbox#79.0"
 *       var entity = pickResult.entity;
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
 * Subscribing to updates to the AABB, which occur whenever {@link Entity}s are transformed, their
 * {@link ReadableGeometry}s have been updated, or the {@link Camera} has moved:
 *
 * ````javascript
 * scene.on("boundary", function() {
 *      var aabb = scene.aabb;
 * });
 * ````
 *
 * Getting the AABB of the {@link Entity}s with the given IDs:
 *
 * ````JavaScript
 * scene.getAABB(); // Gets collective boundary of all Entities in the scene
 * scene.getAABB("saw"); // Gets boundary of an Object
 * scene.getAABB(["saw", "gearbox"]); // Gets collective boundary of two Objects
 * ````
 *
 * See {@link Scene#getAABB} and {@link Entity} for more info on querying and tracking boundaries.
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
     * @private
     * @constructor
     * @param {Viewer} viewer The Viewer this Scene belongs to.
     * @param {Object} cfg Scene configuration.
     * @param {String} [cfg.canvasId]  ID of an existing HTML canvas for the {@link Scene#canvas} - either this or canvasElement is mandatory. When both values are given, the element reference is always preferred to the ID.
     * @param {HTMLCanvasElement} [cfg.canvasElement] Reference of an existing HTML canvas for the {@link Scene#canvas} - either this or canvasId is mandatory. When both values are given, the element reference is always preferred to the ID.
     * @param {HTMLElement} [cfg.keyboardEventsElement] Optional reference to HTML element on which key events should be handled. Defaults to the HTML Document.
     * @param {number} [cfg.numCachedSectionPlanes=0] Enhances the efficiency of SectionPlane creation by proactively allocating Viewer resources for a specified quantity
     * of SectionPlanes. Introducing this parameter streamlines the initial creation speed of SectionPlanes, particularly up to the designated quantity. This parameter internally
     * configures renderer logic for the specified number of SectionPlanes, eliminating the need for setting up logic with each SectionPlane creation and thereby enhancing
     * responsiveness. It is important to consider that each SectionPlane imposes rendering performance, so it is recommended to set this value to a quantity that aligns with
     * your expected usage.
     * @throws {String} Throws an exception when  canvasId or canvasElement are missing or they aren't pointing to a valid HTMLCanvasElement.
     */
    constructor(viewer, cfg = {}) {

        super(null, cfg);
        const canvas = cfg.canvasElement || document.querySelector(`#${cfg.canvasId}`);

        if (!(canvas instanceof HTMLCanvasElement)) {
            throw "Mandatory config expected: valid canvasId or canvasElement";
        }

        /**
         * @type {{[key: string]: {wrapperFunc: Function, tickSubId: string}}}
         */
        this._tickifiedFunctions = {};

        const transparent = (!!cfg.transparent);
        const alphaDepthMask = (!!cfg.alphaDepthMask);

        this._aabbDirty = true;

        this._readableGeometry = !!cfg.readableGeometryEnabled;

        /**
         * The {@link Viewer} this Scene belongs to.
         * @type {Viewer}
         */
        this.viewer = viewer;

        /** Decremented each frame, triggers occlusion test for occludable {@link Marker}s when zero.
         * @private
         * @type {number}
         */
        this.occlusionTestCountdown = 0;

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
         * Map of {@link Entity}s that represent models.
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
        this._numObjects = 0;

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
        this._numVisibleObjects = 0;

        /**
         * Map of currently xrayed {@link Entity}s that represent objects.
         *
         * An Entity represents an object if {@link Entity#isObject} is ````true````, and is xrayed when {@link Entity#xrayed} is true.
         *
         * Each {@link Entity} is mapped here by {@link Entity#id}.
         *
         * @property xrayedObjects
         * @final
         * @type {{String:Object}}
         */
        this.xrayedObjects = {};
        this._numXRayedObjects = 0;

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
        this._numHighlightedObjects = 0;

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
        this._numSelectedObjects = 0;

        /**
         * Map of currently colorized {@link Entity}s that represent objects.
         *
         * An Entity represents an object if {@link Entity#isObject} is ````true````.
         *
         * Each {@link Entity} is mapped here by {@link Entity#id}.
         *
         * @property colorizedObjects
         * @final
         * @type {{String:Object}}
         */
        this.colorizedObjects = {};
        this._numColorizedObjects = 0;

        /**
         * Map of {@link Entity}s that represent objects whose opacity was updated.
         *
         * An Entity represents an object if {@link Entity#isObject} is ````true````.
         *
         * Each {@link Entity} is mapped here by {@link Entity#id}.
         *
         * @property opacityObjects
         * @final
         * @type {{String:Object}}
         */
        this.opacityObjects = {};
        this._numOpacityObjects = 0;

        /**
         * Map of {@link Entity}s that represent objects whose {@link Entity#offset}s were updated.
         *
         * An Entity represents an object if {@link Entity#isObject} is ````true````.
         *
         * Each {@link Entity} is mapped here by {@link Entity#id}.
         *
         * @property offsetObjects
         * @final
         * @type {{String:Object}}
         */
        this.offsetObjects = {};
        this._numOffsetObjects = 0;

        // Cached ID arrays, lazy-rebuilt as needed when stale after map updates

        /**
         Lazy-regenerated ID lists.
         */
        this._modelIds = null;
        this._objectIds = null;
        this._visibleObjectIds = null;
        this._xrayedObjectIds = null;
        this._highlightedObjectIds = null;
        this._selectedObjectIds = null;
        this._colorizedObjectIds = null;
        this._opacityObjectIds = null;
        this._offsetObjectIds = null;

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
         * The {@link SectionPlane}s in this Scene, each mapped to its {@link SectionPlane#id}.
         *
         * @type {{String:SectionPlane}}
         */
        this.sectionPlanes = {};

        /**
         * The {@link Light}s in this Scene, each mapped to its {@link Light#id}.
         *
         * @type {{String:Light}}
         */
        this.lights = {};

        /**
         * The {@link LightMap}s in this Scene, each mapped to its {@link LightMap#id}.
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
         * The {@link Bitmap}s in this Scene, each mapped to its {@link Bitmap#id}.
         *
         * @type {{String:Bitmap}}
         */
        this.bitmaps = {};

        /**
         * The {@link LineSet}s in this Scene, each mapped to its {@link LineSet#id}.
         *
         * @type {{String:LineSet}}
         */
        this.lineSets = {};

        /**
         * The real world offset for this Scene
         *
         * @type {Number[]}
         */
        this.realWorldOffset = cfg.realWorldOffset || new Float64Array([0, 0, 0]);

        /**
         * Manages the HTML5 canvas for this Scene.
         *
         * @type {Canvas}
         */
        this.canvas = new Canvas(this, {
            dontClear: true, // Never destroy this component with Scene#clear();
            canvas: canvas,
            spinnerElementId: cfg.spinnerElementId,
            transparent: transparent,
            webgl2: cfg.webgl2 !== false,
            contextAttr: cfg.contextAttr || {},
            backgroundColor: cfg.backgroundColor,
            backgroundColorFromAmbientLight: cfg.backgroundColorFromAmbientLight,
            premultipliedAlpha: cfg.premultipliedAlpha
        });

        this.canvas.on("boundary", () => {
            this.glRedraw();
        });

        this.canvas.on("webglContextFailed", () => {
            alert("xeokit failed to find WebGL!");
        });

        this._renderer = new Renderer(this, {
            transparent: transparent,
            alphaDepthMask: alphaDepthMask
        });

        this._sectionPlanesState = new (function () {

            this.sectionPlanes = [];

            this.clippingCaps = false;

            this._numCachedSectionPlanes = 0;

            let hash = null;

            this.getHash = function () {
                if (hash) {
                    return hash;
                }
                const numAllocatedSectionPlanes = this.getNumAllocatedSectionPlanes();
                const sectionPlanes = this.sectionPlanes;
                if (numAllocatedSectionPlanes === 0) {
                    return this.hash = ";";
                }
                let sectionPlane;

                const hashParts = [];
                for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
                    sectionPlane = sectionPlanes[i];
                    hashParts.push("cp");
                }
                hashParts.push(";");
                hash = hashParts.join("");
                return hash;
            };

            this.addSectionPlane = function (sectionPlane) {
                this.sectionPlanes.push(sectionPlane);
                hash = null;
            };

            this.removeSectionPlane = function (sectionPlane) {
                for (let i = 0, len = this.sectionPlanes.length; i < len; i++) {
                    if (this.sectionPlanes[i].id === sectionPlane.id) {
                        this.sectionPlanes.splice(i, 1);
                        hash = null;
                        return;
                    }
                }
            };

            this.setNumCachedSectionPlanes = function (numCachedSectionPlanes) {
                this._numCachedSectionPlanes = numCachedSectionPlanes;
                hash = null;
            }

            this.getNumCachedSectionPlanes = function () {
                return this._numCachedSectionPlanes;
            }

            this.getNumAllocatedSectionPlanes = function () {
                const num = this.sectionPlanes.length;
                return (num > this._numCachedSectionPlanes) ? num : this._numCachedSectionPlanes;
            };
        })();

        this._sectionPlanesState.setNumCachedSectionPlanes(cfg.numCachedSectionPlanes || 0);

        this._lightsState = new (function () {

            const DEFAULT_AMBIENT = math.vec4([0, 0, 0, 0]);
            const ambientColorIntensity = math.vec4();

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

            this.getAmbientColorAndIntensity = function () {
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
                    ambientColorIntensity[0] = color[0];
                    ambientColorIntensity[1] = color[1];
                    ambientColorIntensity[2] = color[2];
                    ambientColorIntensity[3] = intensity
                    return ambientColorIntensity;
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
            element: this.canvas.canvas,
            keyboardEventsElement: cfg.keyboardEventsElement
        });

        /**
         * Configures this Scene's units of measurement and coordinate mapping between Real-space and World-space 3D coordinate systems.
         *
         * @property metrics
         * @type {Metrics}
         * @final
         */
        this.metrics = new Metrics(this, {
            units: cfg.units,
            scale: cfg.scale,
            origin: cfg.origin
        });

        /** Configures Scalable Ambient Obscurance (SAO) for this Scene.
         * @type {SAO}
         * @final
         */
        this.sao = new SAO(this, {
            enabled: cfg.saoEnabled
        });

        /** Configures Cross Sections for this Scene.
         * @type {CrossSections}
         * @final
         */
        this.crossSections = new CrossSections(this, {

        });

        this.ticksPerRender = cfg.ticksPerRender;
        this.ticksPerOcclusionTest = cfg.ticksPerOcclusionTest;
        this.passes = cfg.passes;
        this.clearEachPass = cfg.clearEachPass;
        this.gammaInput = cfg.gammaInput;
        this.gammaOutput = cfg.gammaOutput;
        this.gammaFactor = cfg.gammaFactor;

        this._entityOffsetsEnabled = !!cfg.entityOffsetsEnabled;
        this._logarithmicDepthBufferEnabled = !!cfg.logarithmicDepthBufferEnabled;

        this._dtxEnabled = (cfg.dtxEnabled !== false);
        this._pbrEnabled = !!cfg.pbrEnabled;
        this._colorTextureEnabled = (cfg.colorTextureEnabled !== false);
        this._dtxEnabled = !!cfg.dtxEnabled;
        this._markerZOffset = cfg.markerZOffset;

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

        this._sectionCaps = new SectionCaps(this);

        // Default lights

        new AmbientLight(this, {
            color: [1.0, 1.0, 1.0],
            intensity: 0.7
        });

        new DirLight(this, {
            dir: [0.8, -.5, -0.5],
            color: [0.67, 0.67, 1.0],
            intensity: 0.7,
            space: "world"
        });

        new DirLight(this, {
            dir: [-0.8, -1.0, 0.5],
            color: [1, 1, .9],
            intensity: 0.9,
            space: "world"
        });

        this._camera.on("dirty", () => {
            this._renderer.imageDirty();
        });
    }

    _initDefaults() {

        // Call this Scene's property accessors to lazy-init their properties

        let dummy; // Keeps Codacy happy

        dummy = this.geometry;
        dummy = this.material;
        dummy = this.xrayMaterial;
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
            component.id = "__" + window.nextID++;
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

    _capMaterialUpdated(entityId, modelId) {
        this._sectionCaps._onCapMaterialUpdated(entityId, modelId);
    }

    _sectionPlaneCreated(sectionPlane) {
        this.sectionPlanes[sectionPlane.id] = sectionPlane;
        this.scene._sectionPlanesState.addSectionPlane(sectionPlane._state);
        this.scene.fire("sectionPlaneCreated", sectionPlane, true /* Don't retain event */);
        this._needRecompile = true;
    }

    _bitmapCreated(bitmap) {
        this.bitmaps[bitmap.id] = bitmap;
        this.scene.fire("bitmapCreated", bitmap, true /* Don't retain event */);
    }

    _lineSetCreated(lineSet) {
        this.lineSets[lineSet.id] = lineSet;
        this.scene.fire("lineSetCreated", lineSet, true /* Don't retain event */);
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

    _sectionPlaneDestroyed(sectionPlane) {
        delete this.sectionPlanes[sectionPlane.id];
        this.scene._sectionPlanesState.removeSectionPlane(sectionPlane._state);
        this.scene.fire("sectionPlaneDestroyed", sectionPlane, true /* Don't retain event */);
        this._needRecompile = true;
    }

    _bitmapDestroyed(bitmap) {
        delete this.bitmaps[bitmap.id];
        this.scene.fire("bitmapDestroyed", bitmap, true /* Don't retain event */);
    }

    _lineSetDestroyed(lineSet) {
        delete this.lineSets[lineSet.id];
        this.scene.fire("lineSetDestroyed", lineSet, true /* Don't retain event */);
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
        const modelId = entity.id;
        delete this.models[modelId];
        this._modelIds = null; // Lazy regenerate
        this.fire("modelUnloaded", modelId);
    }

    _registerObject(entity) {
        this.objects[entity.id] = entity;
        this._numObjects++;
        this._objectIds = null; // Lazy regenerate
    }

    _deregisterObject(entity) {
        delete this.objects[entity.id];
        this._numObjects--;
        this._objectIds = null; // Lazy regenerate
    }

    _objectVisibilityUpdated(entity, notify = true) {
        if (entity.visible) {
            if (ASSERT_OBJECT_STATE_UPDATE && this.visibleObjects[entity.id]) {
                console.error("Redundant object visibility update (visible=true)");
                return;
            }
            this.visibleObjects[entity.id] = entity;
            this._numVisibleObjects++;
        } else {
            if (ASSERT_OBJECT_STATE_UPDATE && (!this.visibleObjects[entity.id])) {
                console.error("Redundant object visibility update (visible=false)");
                return;
            }
            delete this.visibleObjects[entity.id];
            this._numVisibleObjects--;
        }
        this._visibleObjectIds = null; // Lazy regenerate
        if (notify) {
            this.fire("objectVisibility", entity, true);
        }
    }

    _deRegisterVisibleObject(entity) {
        delete this.visibleObjects[entity.id];
        this._numVisibleObjects--;
        this._visibleObjectIds = null; // Lazy regenerate
    }

    _objectXRayedUpdated(entity, notify = true) {
        if (entity.xrayed) {
            if (ASSERT_OBJECT_STATE_UPDATE && this.xrayedObjects[entity.id]) {
                console.error("Redundant object xray update (xrayed=true)");
                return;
            }
            this.xrayedObjects[entity.id] = entity;
            this._numXRayedObjects++;
        } else {
            if (ASSERT_OBJECT_STATE_UPDATE && (!this.xrayedObjects[entity.id])) {
                console.error("Redundant object xray update (xrayed=false)");
                return;
            }
            delete this.xrayedObjects[entity.id];
            this._numXRayedObjects--;
        }
        this._xrayedObjectIds = null; // Lazy regenerate
        if (notify) {
            this.fire("objectXRayed", entity, true);
        }
    }

    _deRegisterXRayedObject(entity) {
        delete this.xrayedObjects[entity.id];
        this._numXRayedObjects--;
        this._xrayedObjectIds = null; // Lazy regenerate
    }

    _objectHighlightedUpdated(entity) {
        if (entity.highlighted) {
            if (ASSERT_OBJECT_STATE_UPDATE && this.highlightedObjects[entity.id]) {
                console.error("Redundant object highlight update (highlighted=true)");
                return;
            }
            this.highlightedObjects[entity.id] = entity;
            this._numHighlightedObjects++;
        } else {
            if (ASSERT_OBJECT_STATE_UPDATE && (!this.highlightedObjects[entity.id])) {
                console.error("Redundant object highlight update (highlighted=false)");
                return;
            }
            delete this.highlightedObjects[entity.id];
            this._numHighlightedObjects--;
        }
        this._highlightedObjectIds = null; // Lazy regenerate
    }

    _deRegisterHighlightedObject(entity) {
        delete this.highlightedObjects[entity.id];
        this._numHighlightedObjects--;
        this._highlightedObjectIds = null; // Lazy regenerate
    }

    _objectSelectedUpdated(entity, notify = true) {
        if (entity.selected) {
            if (ASSERT_OBJECT_STATE_UPDATE && this.selectedObjects[entity.id]) {
                console.error("Redundant object select update (selected=true)");
                return;
            }
            this.selectedObjects[entity.id] = entity;
            this._numSelectedObjects++;
        } else {
            if (ASSERT_OBJECT_STATE_UPDATE && (!this.selectedObjects[entity.id])) {
                console.error("Redundant object select update (selected=false)");
                return;
            }
            delete this.selectedObjects[entity.id];
            this._numSelectedObjects--;
        }
        this._selectedObjectIds = null; // Lazy regenerate
        if (notify) {
            this.fire("objectSelected", entity, true);
        }
    }

    _deRegisterSelectedObject(entity) {
        delete this.selectedObjects[entity.id];
        this._numSelectedObjects--;
        this._selectedObjectIds = null; // Lazy regenerate
    }


    _objectColorizeUpdated(entity, colorized) {
        if (colorized) {
            this.colorizedObjects[entity.id] = entity;
            this._numColorizedObjects++;
        } else {
            delete this.colorizedObjects[entity.id];
            this._numColorizedObjects--;
        }
        this._colorizedObjectIds = null; // Lazy regenerate
    }

    _deRegisterColorizedObject(entity) {
        delete this.colorizedObjects[entity.id];
        this._numColorizedObjects--;
        this._colorizedObjectIds = null; // Lazy regenerate
    }

    _objectOpacityUpdated(entity, opacityUpdated) {
        if (opacityUpdated) {
            this.opacityObjects[entity.id] = entity;
            this._numOpacityObjects++;
        } else {
            delete this.opacityObjects[entity.id];
            this._numOpacityObjects--;
        }
        this._opacityObjectIds = null; // Lazy regenerate
    }

    _deRegisterOpacityObject(entity) {
        delete this.opacityObjects[entity.id];
        this._numOpacityObjects--;
        this._opacityObjectIds = null; // Lazy regenerate
    }

    _objectOffsetUpdated(entity, offset) {
        if (!offset || offset[0] === 0 && offset[1] === 0 && offset[2] === 0) {
            this.offsetObjects[entity.id] = entity;
            this._numOffsetObjects++;
        } else {
            delete this.offsetObjects[entity.id];
            this._numOffsetObjects--;
        }
        this._offsetObjectIds = null; // Lazy regenerate
    }

    _deRegisterOffsetObject(entity) {
        delete this.offsetObjects[entity.id];
        this._numOffsetObjects--;
        this._offsetObjectIds = null; // Lazy regenerate
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
     * Returns the capabilities of this Scene.
     *
     * @private
     * @returns {{astcSupported: boolean, etc1Supported: boolean, pvrtcSupported: boolean, etc2Supported: boolean, dxtSupported: boolean, bptcSupported: boolean}}
     */
    get capabilities() {
        return this._renderer.capabilities;
    }

    /**
     * Whether {@link Entity#offset} is enabled.
     *
     * This is set via the {@link Viewer} constructor and is ````false```` by default.
     *
     * @returns {Boolean} True if {@link Entity#offset} is enabled.
     */
    get entityOffsetsEnabled() {
        return this._entityOffsetsEnabled;
    }

    /**
     * Whether geometry is readable.
     *
     * This is set via the {@link Viewer} constructor and is ````false```` by default.
     *
     * The ````readableGeometryEnabled```` option for ````Scene#pick```` only works if this is set ````true````.
     *
     * Note that when ````true````, this configuration will increase the amount of browser memory used by the Viewer.
     *
     * @returns {Boolean} True if geometry is readable.
     */
    get readableGeometryEnabled() {
        return this._readableGeometry;
    }

    /**
     * Whether precision surface picking is enabled.
     * @deprecated
     * @returns {*|boolean}
     */
    get pickSurfacePrecisionEnabled() {
        return this._readableGeometry;
    }

    /**
     * Whether logarithmic depth buffer is enabled.
     *
     * This is set via the {@link Viewer} constructor and is ````false```` by default.
     *
     * @returns {Boolean} True if logarithmic depth buffer is enabled.
     */
    get logarithmicDepthBufferEnabled() {
        return this._logarithmicDepthBufferEnabled;
    }

    /**
     * Sets the number of {@link SectionPlane}s for which this Scene pre-caches resources.
     *
     * This property enhances the efficiency of SectionPlane creation by proactively allocating and caching Viewer resources for a specified quantity
     * of SectionPlanes. Introducing this parameter streamlines the initial creation speed of SectionPlanes, particularly up to the designated quantity. This parameter internally
     * configures renderer logic for the specified number of SectionPlanes, eliminating the need for setting up logic with each SectionPlane creation and thereby enhancing
     * responsiveness. It is important to consider that each SectionPlane impacts rendering performance, so it is recommended to set this value to a quantity that aligns with
     * your expected usage.
     *
     * Default is ````0````.
     */
    set numCachedSectionPlanes(numCachedSectionPlanes) {
        numCachedSectionPlanes = numCachedSectionPlanes || 0;
        if (this._sectionPlanesState.getNumCachedSectionPlanes() !== numCachedSectionPlanes) {
            this._sectionPlanesState.setNumCachedSectionPlanes(numCachedSectionPlanes);
            this._needRecompile = true;
            this.glRedraw();
        }
    }

    /**
     * Gets the number of {@link SectionPlane}s for which this Scene pre-caches resources.
     *
     * This property enhances the efficiency of SectionPlane creation by proactively allocating and caching Viewer resources for a specified quantity
     * of SectionPlanes. Introducing this parameter streamlines the initial creation speed of SectionPlanes, particularly up to the designated quantity. This parameter internally
     * configures renderer logic for the specified number of SectionPlanes, eliminating the need for setting up logic with each SectionPlane creation and thereby enhancing
     * responsiveness. It is important to consider that each SectionPlane impacts rendering performance, so it is recommended to set this value to a quantity that aligns with
     * your expected usage.
     *
     * Default is ````0````.
     *
     * @returns {number} The number of {@link SectionPlane}s for which this Scene pre-caches resources.
     */
    get numCachedSectionPlanes() {
        return this._sectionPlanesState.getNumCachedSectionPlanes();
    }

    /**
     * Sets whether physically-based rendering is enabled.
     *
     * Default is ````false````.
     */
    set pbrEnabled(pbrEnabled) {
        this._pbrEnabled = !!pbrEnabled;
        this.glRedraw();
    }

    /**
     * Gets whether physically-based rendering is enabled.
     *
     * Default is ````false````.
     *
     * @returns {Boolean} True if quality rendering is enabled.
     */
    get pbrEnabled() {
        return this._pbrEnabled;
    }

    /**
     * Sets whether data texture scene representation (DTX) is enabled for the {@link Scene}.
     *
     * Even when enabled, DTX will only work if supported.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    set dtxEnabled(value) {
        value = !!value;
        if (this._dtxEnabled === value) {
            return;
        }
        this._dtxEnabled = value;
    }

    /**
     * Gets whether data texture-based scene representation (DTX) is enabled for the {@link Scene}.
     *
     * Even when enabled, DTX will only apply if supported.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    get dtxEnabled() {
        return this._dtxEnabled;
    }

    /**
     * Sets whether basic color texture rendering is enabled.
     *
     * Default is ````true````.
     *
     * @returns {Boolean} True if basic color texture rendering is enabled.
     */
    set colorTextureEnabled(colorTextureEnabled) {
        this._colorTextureEnabled = !!colorTextureEnabled;
        this.glRedraw();
    }

    /**
     * Gets whether basic color texture rendering is enabled.
     *
     * Default is ````true````.
     *
     * @returns {Boolean} True if basic color texture rendering is enabled.
     */
    get colorTextureEnabled() {
        return this._colorTextureEnabled;
    }

    /**
     * Gets the Z value of offset for Marker's OcclusionTester.
     * The closest the value is to 0.000 the more precise OcclusionTester will be, but at the same time the less
     * precise it will behave for Markers that are located exactly on the Surface.
     *
     * Default is ````-0.001````.
     *
     * @returns {Number} Z offset for Marker
     */
    get markerZOffset() {
        if (this._markerZOffset == null) {
            return -0.001;
        }
        return this._markerZOffset;
    }

    /**
     * Performs an occlusion test on all {@link Marker}s in this {@link Scene}.
     *
     * Sets each {@link Marker#visible} ````true```` if the Marker is currently not occluded by any opaque {@link Entity}s
     * in the Scene, or ````false```` if an Entity is occluding it.
     */
    doOcclusionTest() {
        if (this._needRecompile) {
            this._recompile();
            this._needRecompile = false;
        }
        this._renderer.doOcclusionTest();
    }

    /**
     * Renders a single frame of this Scene.
     *
     * The Scene will periodically render itself after any updates, but you can call this method to force a render
     * if required.
     *
     * @param {Boolean} [forceRender=false] Forces a render when true, otherwise only renders if something has changed in this Scene
     * since the last render.
     */
    render(forceRender) {

        if (forceRender) {
            core.runTasks();
        }

        const renderEvent = {
            sceneId: null,
            pass: 0
        };

        if (this._needRecompile) {
            this._recompile();
            this._renderer.imageDirty();
            this._needRecompile = false;
        }

        if (!forceRender && !this._renderer.needsRender()) {
            return;
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


    /**
     * @private
     */
    compile() {
        if (this._needRecompile) {
            this._recompile();
            this._renderer.imageDirty();
            this._needRecompile = false;
        }
    }

    _recompile() {
        for (const id in this._compilables) {
            if (this._compilables.hasOwnProperty(id)) {
                this._compilables[id].compile();
            }
        }
        this._renderer.shadowsDirty();
        this.fire("compile", this, true);
    }

    _saveAmbientColor() {
        const canvas = this.canvas;
        if (!canvas.transparent && !canvas.backgroundImage && !canvas.backgroundColor) {
            const ambientColorIntensity = this._lightsState.getAmbientColorAndIntensity();
            if (!this._lastAmbientColor ||
                this._lastAmbientColor[0] !== ambientColorIntensity[0] ||
                this._lastAmbientColor[1] !== ambientColorIntensity[1] ||
                this._lastAmbientColor[2] !== ambientColorIntensity[2] ||
                this._lastAmbientColor[3] !== ambientColorIntensity[3]) {
                canvas.backgroundColor = ambientColorIntensity;
                if (!this._lastAmbientColor) {
                    this._lastAmbientColor = math.vec4([0, 0, 0, 1]);
                }
                this._lastAmbientColor.set(ambientColorIntensity);
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
     * Gets the number of {@link Entity}s in {@link Scene#objects}.
     *
     * @type {Number}
     */
    get numObjects() {
        return this._numObjects;
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
     * Gets the number of {@link Entity}s in {@link Scene#visibleObjects}.
     *
     * @type {Number}
     */
    get numVisibleObjects() {
        return this._numVisibleObjects;
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
     * Gets the number of {@link Entity}s in {@link Scene#xrayedObjects}.
     *
     * @type {Number}
     */
    get numXRayedObjects() {
        return this._numXRayedObjects;
    }

    /**
     * Gets the IDs of the {@link Entity}s in {@link Scene#xrayedObjects}.
     *
     * @type {String[]}
     */
    get xrayedObjectIds() {
        if (!this._xrayedObjectIds) {
            this._xrayedObjectIds = Object.keys(this.xrayedObjects);
        }
        return this._xrayedObjectIds;
    }

    /**
     * Gets the number of {@link Entity}s in {@link Scene#highlightedObjects}.
     *
     * @type {Number}
     */
    get numHighlightedObjects() {
        return this._numHighlightedObjects;
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
     * Gets the number of {@link Entity}s in {@link Scene#selectedObjects}.
     *
     * @type {Number}
     */
    get numSelectedObjects() {
        return this._numSelectedObjects;
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
     * Gets the number of {@link Entity}s in {@link Scene#colorizedObjects}.
     *
     * @type {Number}
     */
    get numColorizedObjects() {
        return this._numColorizedObjects;
    }

    /**
     * Gets the IDs of the {@link Entity}s in {@link Scene#colorizedObjects}.
     *
     * @type {String[]}
     */
    get colorizedObjectIds() {
        if (!this._colorizedObjectIds) {
            this._colorizedObjectIds = Object.keys(this.colorizedObjects);
        }
        return this._colorizedObjectIds;
    }

    /**
     * Gets the IDs of the {@link Entity}s in {@link Scene#opacityObjects}.
     *
     * @type {String[]}
     */
    get opacityObjectIds() {
        if (!this._opacityObjectIds) {
            this._opacityObjectIds = Object.keys(this.opacityObjects);
        }
        return this._opacityObjectIds;
    }

    /**
     * Gets the IDs of the {@link Entity}s in {@link Scene#offsetObjects}.
     *
     * @type {String[]}
     */
    get offsetObjectIds() {
        if (!this._offsetObjectIds) {
            this._offsetObjectIds = Object.keys(this.offsetObjects);
        }
        return this._offsetObjectIds;
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
     * Sets the number of "ticks" that happen between occlusion testing for {@link Marker}s.
     *
     * Default value is ````20````.
     *
     * @type {Number}
     */
    set ticksPerOcclusionTest(value) {
        if (value === undefined || value === null) {
            value = 20;
        } else if (!utils.isNumeric(value) || value <= 0) {
            this.error("Unsupported value for 'ticksPerOcclusionTest': '" + value +
                "' - should be an integer greater than zero.");
            value = 20;
        }
        if (value === this._ticksPerOcclusionTest) {
            return;
        }
        this._ticksPerOcclusionTest = value;
    }

    /**
     * Gets the number of "ticks" that happen between each render of this Scene.
     *
     * Default value is ````1````.
     *
     * @type {Number}
     */
    get ticksPerOcclusionTest() {
        return this._ticksPerOcclusionTest;
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
        this.glRedraw();
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
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    set gammaOutput(value) {
        value = !!value;
        if (value === this._renderer.gammaOutput) {
            return;
        }
        this._renderer.gammaOutput = value;
        this._needRecompile = true;
        this.glRedraw();
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
     * Default value is ````2.2````.
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
     * Default value is ````2.2````.
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
     * Gets the default xraying {@link EmphasisMaterial} for this Scene.
     *
     * Has {@link EmphasisMaterial#id} set to "default.xrayMaterial".
     *
     * {@link Mesh}s in this Scene have {@link Mesh#xrayMaterial} set to this {@link EmphasisMaterial} by default.
     *
     * {@link Mesh}s are xrayed while {@link Mesh#xrayed} is ````true````.
     *
     * @type {EmphasisMaterial}
     */
    get xrayMaterial() {
        return this.components["default.xrayMaterial"] || new EmphasisMaterial(this, {
            id: "default.xrayMaterial",
            fill: true,
            fillColor: [0.970588207244873, 0.7965892553329468, 0.6660899519920349],
            fillAlpha: 0.4,
            edges: true,
            edgeColor: [0.529411792755127, 0.4577854573726654, 0.4100345969200134],
            edgeAlpha: 1.0,
            edgeWidth: 1,
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
            fill: true,
            fillColor: [1.0, 1.0, 0.0],
            fillAlpha: 0.5,
            edges: true,
            edgeColor: [1.0, 1.0, 1.0],
            edgeAlpha: 1.0,
            edgeWidth: 1,
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
            fill: true,
            fillColor: [0.0, 1.0, 0.0],
            fillAlpha: 0.5,
            edges: true,
            edgeColor: [1.0, 1.0, 1.0],
            edgeAlpha: 1.0,
            edgeWidth: 1,
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
            fill: true,
            fillColor: [0.4, 0.4, 0.4],
            fillAlpha: 0.2,
            edges: true,
            edgeColor: [0.0, 0.0, 0.0],
            edgeAlpha: 1.0,
            edgeWidth: 1,
            dontClear: true
        });
    }

    /**
     * Gets the {@link PointsMaterial} for this Scene.
     *
     * @type {PointsMaterial}
     */
    get pointsMaterial() {
        return this.components["default.pointsMaterial"] || new PointsMaterial(this, {
            id: "default.pointsMaterial",
            fill: true,
            fillColor: [0.4, 0.4, 0.4],
            fillAlpha: 0.2,
            edges: true,
            edgeColor: [0.2, 0.2, 0.2],
            edgeAlpha: 0.5,
            edgeWidth: 1,
            dontClear: true
        });
    }

    /**
     * Gets the {@link LinesMaterial} for this Scene.
     *
     * @type {LinesMaterial}
     */
    get linesMaterial() {
        return this.components["default.linesMaterial"] || new LinesMaterial(this, {
            id: "default.linesMaterial",
            fill: true,
            fillColor: [0.4, 0.4, 0.4],
            fillAlpha: 0.2,
            edges: true,
            edgeColor: [0.2, 0.2, 0.2],
            edgeAlpha: 0.5,
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
            const aabb = this.aabb;
            if (!this._center) {
                this._center = math.vec3();
            }
            this._center[0] = (aabb[0] + aabb[3]) / 2;
            this._center[1] = (aabb[1] + aabb[4]) / 2;
            this._center[2] = (aabb[2] + aabb[5]) / 2;
        }
        return this._center;
    }

    /**
     * Gets the World-space axis-aligned 3D boundary (AABB) of this Scene.
     *
     * The AABB is represented by a six-element Float64Array containing the min/max extents of the axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * When the Scene has no content, will be ````[-100,-100,-100,100,100,100]````.
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
            let xmax = math.MIN_DOUBLE;
            let ymax = math.MIN_DOUBLE;
            let zmax = math.MIN_DOUBLE;
            let aabb;
            const collidables = this._collidables;
            let collidable;
            let valid = false;
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
                    valid = true;
                }
            }
            if (!valid) {
                xmin = -100;
                ymin = -100;
                zmin = -100;
                xmax = 100;
                ymax = 100;
                zmax = 100;
            }
            this._aabb[0] = xmin;
            this._aabb[1] = ymin;
            this._aabb[2] = zmin;
            this._aabb[3] = xmax;
            this._aabb[4] = ymax;
            this._aabb[5] = zmax;
            this._aabbDirty = false;
            this._center = null;
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
     * Attempts to pick an {@link Entity} in this Scene.
     *
     * Ignores {@link Entity}s with {@link Entity#pickable} set ````false````.
     *
     * When an {@link Entity} is picked, fires a "pick" event on the {@link Entity} with the pick result as parameters.
     *
     * Picking the {@link Entity} at the given canvas coordinates:

     * ````javascript
     * var pickResult = scene.pick({
     *          canvasPos: [23, 131]
     *       });
     *
     * if (pickResult) { // Picked an Entity
     *         var entity = pickResult.entity;
     *     }
     * ````
     *
     * Picking, with a ray cast through the canvas, hits an {@link Entity}:
     *
     * ````javascript
     * var pickResult = scene.pick({
     *         pickSurface: true,
     *         canvasPos: [23, 131]
     *      });
     *
     * if (pickResult) { // Picked an Entity
     *
     *     var entity = pickResult.entity;
     *
     *     if (pickResult.primitive === "triangle") {
     *
     *         // Picked a triangle on the entity surface
     *
     *         var primIndex = pickResult.primIndex; // Position of triangle's first index in the picked Entity's Geometry's indices array
     *         var indices = pickResult.indices; // UInt32Array containing the triangle's vertex indices
     *         var localPos = pickResult.localPos; // Float64Array containing the picked Local-space position on the triangle
     *         var worldPos = pickResult.worldPos; // Float64Array containing the picked World-space position on the triangle
     *         var viewPos = pickResult.viewPos; // Float64Array containing the picked View-space position on the triangle
     *         var bary = pickResult.bary; // Float64Array containing the picked barycentric position within the triangle
     *         var worldNormal = pickResult.worldNormal; // Float64Array containing the interpolated World-space normal vector at the picked position on the triangle
     *         var uv = pickResult.uv; // Float64Array containing the interpolated UV coordinates at the picked position on the triangle
     *
     *     } else if (pickResult.worldPos && pickResult.worldNormal) {
     *
     *         // Picked a point and normal on the entity surface
     *
     *         var worldPos = pickResult.worldPos; // Float64Array containing the picked World-space position on the Entity surface
     *         var worldNormal = pickResult.worldNormal; // Float64Array containing the picked World-space normal vector on the Entity Surface
     *     }
     * }
     * ````
     *
     * Picking the {@link Entity} that intersects an arbitrarily-aligned World-space ray:
     *
     * ````javascript
     * var pickResult = scene.pick({
     *       pickSurface: true,   // Picking with arbitrarily-positioned ray
     *       origin: [0,0,-5],    // Ray origin
     *       direction: [0,0,1]   // Ray direction
     * });
     *
     * if (pickResult) { // Picked an Entity with the ray
     *
     *       var entity = pickResult.entity;
     *
     *       if (pickResult.primitive == "triangle") {
     *
     *          // Picked a triangle on the entity surface
     *
     *           var primitive = pickResult.primitive; // Type of primitive that was picked, usually "triangles"
     *           var primIndex = pickResult.primIndex; // Position of triangle's first index in the picked Entity's Geometry's indices array
     *           var indices = pickResult.indices; // UInt32Array containing the triangle's vertex indices
     *           var localPos = pickResult.localPos; // Float64Array containing the picked Local-space position on the triangle
     *           var worldPos = pickResult.worldPos; // Float64Array containing the picked World-space position on the triangle
     *           var viewPos = pickResult.viewPos; // Float64Array containing the picked View-space position on the triangle
     *           var bary = pickResult.bary; // Float64Array containing the picked barycentric position within the triangle
     *           var worldNormal = pickResult.worldNormal; // Float64Array containing the interpolated World-space normal vector at the picked position on the triangle
     *           var uv = pickResult.uv; // Float64Array containing the interpolated UV coordinates at the picked position on the triangle
     *           var origin = pickResult.origin; // Float64Array containing the World-space ray origin
     *           var direction = pickResult.direction; // Float64Array containing the World-space ray direction
     *
     *     } else if (pickResult.worldPos && pickResult.worldNormal) {
     *
     *         // Picked a point and normal on the entity surface
     *
     *         var worldPos = pickResult.worldPos; // Float64Array containing the picked World-space position on the Entity surface
     *         var worldNormal = pickResult.worldNormal; // Float64Array containing the picked World-space normal vector on the Entity Surface
     *     }
     * }
     *  ````
     *
     * @param {*} params Picking parameters.
     * @param {Boolean} [params.pickSurface=false] Whether to find the picked position on the surface of the Entity.
     * @param {Boolean} [params.pickSurfacePrecision=false] When picking an Entity surface position, indicates whether or not we want full-precision {@link PickResult#worldPos}. Only works when {@link Scene#readableGeometryEnabled} is ````true````. If pick succeeds, the returned {@link PickResult} will have {@link PickResult#precision} set ````true````, to indicate that it contains full-precision surface pick results.
     * @param {Boolean} [params.pickSurfaceNormal=false] Whether to find the picked normal on the surface of the Entity. Only works if ````pickSurface```` is given.
     * @param {Number[]} [params.canvasPos] Canvas-space coordinates. When ray-picking, this will override the **origin** and ** direction** parameters and will cause the ray to be fired through the canvas at this position, directly along the negative View-space Z-axis.
     * @param {Number[]} [params.origin] World-space ray origin when ray-picking. Ignored when canvasPos given.
     * @param {Number[]} [params.direction] World-space ray direction when ray-picking. Also indicates the length of the ray. Ignored when canvasPos given.
     * @param {Number[]} [params.matrix] 4x4 transformation matrix to define the World-space ray origin and direction, as an alternative to ````origin```` and ````direction````.
     * @param {Number} [params.snapRadius=30] The snap radius, in canvas pixels.
     * @param {boolean} [params.snapToVertex=true] Whether to snap to vertex. Only works when `canvasPos` given.
     * @param {boolean} [params.snapToEdge=true] Whether to snap to edge. Only works when `canvasPos` given.
     * @param {PickResult} [pickResult] Holds the results of the pick attempt. Will use the Scene's singleton PickResult if you don't supply your own.
     * @returns {PickResult} Holds results of the pick attempt, returned when an {@link Entity} is picked, else null. See method comments for description.
     */
    pick(params, pickResult) {

        if (this.canvas.boundary[2] === 0 || this.canvas.boundary[3] === 0) {
            this.error("Picking not allowed while canvas has zero width or height");
            return null;
        }

        params = params || {};

        params.pickSurface = params.pickSurface || params.rayPick; // Backwards compatibility

        if (!params.canvasPos && !params.matrix && (!params.origin || !params.direction)) {
            this.warn("picking without canvasPos, matrix, or ray origin and direction");
        }

        const includeEntities = params.includeEntities || params.include; // Backwards compat
        if (includeEntities) {
            params.includeEntityIds = getEntityIDMap(this, includeEntities);
        }

        const excludeEntities = params.excludeEntities || params.exclude; // Backwards compat
        if (excludeEntities) {
            params.excludeEntityIds = getEntityIDMap(this, excludeEntities);
        }

        if (this._needRecompile) {
            this._recompile();
            this._renderer.imageDirty();
            this._needRecompile = false;
        }

        if (params.snapToEdge || params.snapToVertex) {
            pickResult = this._renderer.snapPick(params, pickResult);
        } else {
            pickResult = this._renderer.pick(params, pickResult);
        }

        if (pickResult) {
            if (pickResult.entity && pickResult.entity.fire) {
                pickResult.entity.fire("picked", pickResult); // TODO: SceneModelEntity doesn't fire events
            }
        }

        return pickResult;
    }

    /**
     * @param {Object} params Picking parameters.
     * @param {Number[]} params.canvasPos Canvas-space coordinates.
     * @param {Number} [params.snapRadius=30] The snap radius, in canvas pixels
     * @param {boolean} [params.snapToVertex=true] Whether to snap to vertex.
     * @param {boolean} [params.snapToEdge=true] Whether to snap to edge.
     * @deprecated
     */
    snapPick(params) {
        if (undefined === this._warnSnapPickDeprecated) {
            this._warnSnapPickDeprecated = true;
            this.warn("Scene.snapPick() is deprecated since v2.4.2 - use Scene.pick() instead")
        }
        if (!params.canvasPos) {
            this.error("Scene.snapPick() canvasPos parameter expected");
            return;
        }
        return this._renderer.snapPick(params);
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
     * Destroys all {@link SectionPlane}s in this Scene.
     */
    clearSectionPlanes() {
        const ids = Object.keys(this.sectionPlanes);
        for (let i = 0, len = ids.length; i < len; i++) {
            this.sectionPlanes[ids[i]].destroy();
        }
    }

    /**
     * Destroys all {@link Line}s in this Scene.
     */
    clearBitmaps() {
        const ids = Object.keys(this.bitmaps);
        for (let i = 0, len = ids.length; i < len; i++) {
            this.bitmaps[ids[i]].destroy();
        }
    }


    /**
     * Destroys all {@link Line}s in this Scene.
     */
    clearLines() {
        const ids = Object.keys(this.lineSets);
        for (let i = 0, len = ids.length; i < len; i++) {
            this.lineSets[ids[i]].destroy();
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
        let xmin = math.MAX_DOUBLE;
        let ymin = math.MAX_DOUBLE;
        let zmin = math.MAX_DOUBLE;
        let xmax = math.MIN_DOUBLE;
        let ymax = math.MIN_DOUBLE;
        let zmax = math.MIN_DOUBLE;
        let valid;
        this.withObjects(ids, entity => {
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
     * @param {Boolean} visible Whether or not to set visible.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsVisible(ids, visible) {
        return this.withObjects(ids, entity => {
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
     * @param {Boolean} collidable Whether or not to set collidable.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsCollidable(ids, collidable) {
        return this.withObjects(ids, entity => {
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
        return this.withObjects(ids, entity => {
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
     * @param {Boolean} selected Whether or not to select.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsSelected(ids, selected) {
        return this.withObjects(ids, entity => {
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
        return this.withObjects(ids, entity => {
            const changed = (entity.highlighted !== highlighted);
            entity.highlighted = highlighted;
            return changed;
        });
    }

    /**
     * Batch-updates {@link Entity#xrayed} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Boolean} xrayed Whether or not to xray.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsXRayed(ids, xrayed) {
        return this.withObjects(ids, entity => {
            const changed = (entity.xrayed !== xrayed);
            entity.xrayed = xrayed;
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
        return this.withObjects(ids, entity => {
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
        return this.withObjects(ids, entity => {
            entity.colorize = colorize;
        });
    }

    /**
     * Batch-updates {@link Entity#opacity} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Number} [opacity=1.0] Opacity factor, multiplied by the rendered pixel alphas.
     * @returns {Boolean} True if any {@link Entity}s changed opacity, else false if all updates were redundant and not applied.
     */
    setObjectsOpacity(ids, opacity) {
        return this.withObjects(ids, entity => {
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
     * @param {Boolean} pickable Whether or not to set pickable.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    setObjectsPickable(ids, pickable) {
        return this.withObjects(ids, entity => {
            const changed = (entity.pickable !== pickable);
            entity.pickable = pickable;
            return changed;
        });
    }

    /**
     * Batch-updates {@link Entity#offset} on {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Number[]} [offset] 3D offset vector.
     */
    setObjectsOffset(ids, offset) {
        this.withObjects(ids, entity => {
            entity.offset = offset;
        });
    }

    /**
     * Iterates with a callback over {@link Entity}s that represent objects.
     *
     * An {@link Entity} represents an object when {@link Entity#isObject} is ````true````.
     *
     * @param {String[]} ids Array of {@link Entity#id} values.
     * @param {Function} callback Callback to execute on eacn {@link Entity}.
     * @returns {Boolean} True if any {@link Entity}s were updated, else false if all updates were redundant and not applied.
     */
    withObjects(ids, callback) {
        if (utils.isString(ids)) {
            ids = [ids];
        }
        let changed = false;
        for (let i = 0, len = ids.length; i < len; i++) {
            const id = ids[i];
            let entity = this.objects[id];
            if (entity) {
                changed = callback(entity) || changed;
            } else {
                const modelIds = this.modelIds;
                for (let i = 0, len = modelIds.length; i < len; i++) {
                    const modelId = modelIds[i];
                    const globalObjectId = math.globalizeObjectId(modelId, id);
                    entity = this.objects[globalObjectId];
                    if (entity) {
                        changed = callback(entity) || changed;
                    }
                }
            }
        }
        return changed;
    }

    /**
     * This method will "tickify" the provided `cb` function.
     *
     * This means, the function will be wrapped so:
     *
     * - it runs time-aligned to scene ticks
     * - it runs maximum once per scene-tick
     *
     * @param {Function} cb The function to tickify
     * @returns {Function}
     */
    tickify(cb) {
        const cbString = cb.toString();

        /**
         * Check if the function is already tickified, and if so return the cached one.
         */
        if (cbString in this._tickifiedFunctions) {
            return this._tickifiedFunctions[cbString].wrapperFunc;
        }

        let alreadyRun = 0;
        let needToRun = 0;

        let lastArgs;

        /**
         * The provided `cb` function is replaced with a "set-dirty" function
         *
         * @type {Function}
         */
        const wrapperFunc = function (...args) {
            lastArgs = args;
            needToRun++;
        };

        /**
         * An each scene tick, if the "dirty-flag" is set, run the `cb` function.
         *
         * This will make it run time-aligned to the scene tick.
         */
        const tickSubId = this.on("tick", () => {
            const tmp = needToRun;
            if (tmp > alreadyRun) {
                alreadyRun = tmp;
                cb(...lastArgs);
            }
        });

        /**
         * And, store the list of subscribers.
         */
        this._tickifiedFunctions[cbString] = {tickSubId, wrapperFunc};

        return wrapperFunc;
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

        //destroy section caps separately because it's not a component
        this._sectionCaps.destroy();

        this.canvas.gl = null;

        // Memory leak prevention
        this.components = null;
        this.models = null;
        this.objects = null;
        this.visibleObjects = null;
        this.xrayedObjects = null;
        this.highlightedObjects = null;
        this.selectedObjects = null;
        this.colorizedObjects = null;
        this.opacityObjects = null;
        this.sectionPlanes = null;
        this.lights = null;
        this.lightMaps = null;
        this.reflectionMaps = null;
        this._objectIds = null;
        this._visibleObjectIds = null;
        this._xrayedObjectIds = null;
        this._highlightedObjectIds = null;
        this._selectedObjectIds = null;
        this._colorizedObjectIds = null;
        this._sectionCaps = null;
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
