/**
 Fired when this Mesh is picked via a call to {@link Scene/pick:method"}}Scene#pick(){{/crossLink}}.

 The event parameters will be the hit result returned by the {@link Scene/pick:method"}}Scene#pick(){{/crossLink}} method.
 @event picked
 */
import {math} from '../math/math.js';
import {createRTCViewMat} from '../math/rtcCoords.js';
import {Component} from '../Component.js';
import {RenderState} from '../webgl/RenderState.js';
import {createProgramVariablesState} from '../webgl/WebGLRenderer.js';
import {DrawShaderSource} from "./draw/DrawShaderSource.js";
import {LambertShaderSource} from "./draw/LambertShaderSource.js";
import {EmphasisShaderSource} from "./emphasis/EmphasisShaderSource.js";
import {PickMeshShaderSource} from "./pick/PickMeshShaderSource.js";
import {PickTriangleShaderSource} from "./pick/PickTriangleShaderSource.js";
import {OcclusionShaderSource} from "./occlusion/OcclusionShaderSource.js";
import {ShadowShaderSource} from "./shadow/ShadowShaderSource.js";

import {geometryCompressionUtils} from '../math/geometryCompressionUtils.js';
import {RenderFlags} from "../webgl/RenderFlags.js";
import {stats} from '../stats.js';
import {Map} from "../utils/Map.js";

const obb = math.OBB3();
const angleAxis = math.vec4();
const q1 = math.vec4();
const q2 = math.vec4();
const xAxis = math.vec3([1, 0, 0]);
const yAxis = math.vec3([0, 1, 0]);
const zAxis = math.vec3([0, 0, 1]);

const veca = math.vec3(3);
const vecb = math.vec3(3);

const identityMat = math.identityMat4();

const ids = new Map({});
const renderersCache = { };

/**
 * @desc An {@link Entity} that is a drawable element, with a {@link Geometry} and a {@link Material}, that can be
 * connected into a scene graph using {@link Node}s.
 *
 * ## Usage
 *
 * The example below is the same as the one given for {@link Node}, since the two classes work together.  In this example,
 * we'll create a scene graph in which a root {@link Node} represents a group and the Meshes are leaves.
 *
 * Since {@link Node} implements {@link Entity}, we can designate the root {@link Node} as a model, causing it to be registered by its
 * ID in {@link Scene#models}.
 *
 * Since Mesh also implements {@link Entity}, we can designate the leaf Meshes as objects, causing them to
 * be registered by their IDs in {@link Scene#objects}.
 *
 * We can then find those {@link Entity} types in {@link Scene#models} and {@link Scene#objects}.
 *
 * We can also update properties of our object-Meshes via calls to {@link Scene#setObjectsHighlighted} etc.
 *
 * [[Run this example](https://xeokit.github.io/xeokit-sdk/examples/scenegraph/#sceneGraph)]
 *
 * ````javascript
 * import {Viewer, Mesh, Node, PhongMaterial, buildBoxGeometry, ReadableGeometry} from "xeokit-sdk.es.js";
 *
 * const viewer = new Viewer({
 *     canvasId: "myCanvas"
 * });
 *
 * viewer.scene.camera.eye = [-21.80, 4.01, 6.56];
 * viewer.scene.camera.look = [0, -5.75, 0];
 * viewer.scene.camera.up = [0.37, 0.91, -0.11];
 *
 * const boxGeometry = new ReadableGeometry(viewer.scene, buildBoxGeometry({
 *      xSize: 1,
 *      ySize: 1,
 *      zSize: 1
 * }));
 *
 * new Node(viewer.scene, {
 *      id: "table",
 *      isModel: true, // <---------- Node represents a model, so is registered by ID in viewer.scene.models
 *      rotation: [0, 50, 0],
 *      position: [0, 0, 0],
 *      scale: [1, 1, 1],
 *
 *      children: [
 *
 *          new Mesh(viewer.scene, { // Red table leg
 *              id: "redLeg",
 *              isObject: true, // <------ Node represents an object, so is registered by ID in viewer.scene.objects
 *              position: [-4, -6, -4],
 *              scale: [1, 3, 1],
 *              rotation: [0, 0, 0],
 *              material: new PhongMaterial(viewer.scene, {
 *                  diffuse: [1, 0.3, 0.3]
 *              }),
 *              geometry: boxGeometry
 *          }),
 *
 *          new Mesh(viewer.scene, { // Green table leg
 *              id: "greenLeg",
 *              isObject: true, // <------ Node represents an object, so is registered by ID in viewer.scene.objects
 *              position: [4, -6, -4],
 *              scale: [1, 3, 1],
 *              rotation: [0, 0, 0],
 *              material: new PhongMaterial(viewer.scene, {
 *                  diffuse: [0.3, 1.0, 0.3]
 *              }),
 *              geometry: boxGeometry
 *          }),
 *
 *          new Mesh(viewer.scene, {// Blue table leg
 *              id: "blueLeg",
 *              isObject: true, // <------ Node represents an object, so is registered by ID in viewer.scene.objects
 *              position: [4, -6, 4],
 *              scale: [1, 3, 1],
 *              rotation: [0, 0, 0],
 *              material: new PhongMaterial(viewer.scene, {
 *                  diffuse: [0.3, 0.3, 1.0]
 *              }),
 *              geometry: boxGeometry
 *          }),
 *
 *          new Mesh(viewer.scene, {  // Yellow table leg
 *              id: "yellowLeg",
 *              isObject: true, // <------ Node represents an object, so is registered by ID in viewer.scene.objects
 *              position: [-4, -6, 4],
 *              scale: [1, 3, 1],
 *              rotation: [0, 0, 0],
 *              material: new PhongMaterial(viewer.scene, {
 *                   diffuse: [1.0, 1.0, 0.0]
 *              }),
 *              geometry: boxGeometry
 *          }),
 *
 *          new Mesh(viewer.scene, { // Purple table top
 *              id: "tableTop",
 *              isObject: true, // <------ Node represents an object, so is registered by ID in viewer.scene.objects
 *              position: [0, -3, 0],
 *              scale: [6, 0.5, 6],
 *              rotation: [0, 0, 0],
 *              material: new PhongMaterial(viewer.scene, {
 *                  diffuse: [1.0, 0.3, 1.0]
 *              }),
 *              geometry: boxGeometry
 *          })
 *      ]
 *  });
 *
 * // Find Nodes and Meshes by their IDs
 *
 * var table = viewer.scene.models["table"];                // Since table Node has isModel == true
 *
 * var redLeg = viewer.scene.objects["redLeg"];             // Since the Meshes have isObject == true
 * var greenLeg = viewer.scene.objects["greenLeg"];
 * var blueLeg = viewer.scene.objects["blueLeg"];
 *
 * // Highlight one of the table leg Meshes
 *
 * viewer.scene.setObjectsHighlighted(["redLeg"], true);    // Since the Meshes have isObject == true
 *
 * // Periodically update transforms on our Nodes and Meshes
 *
 * viewer.scene.on("tick", function () {
 *
 *       // Rotate legs
 *       redLeg.rotateY(0.5);
 *       greenLeg.rotateY(0.5);
 *       blueLeg.rotateY(0.5);
 *
 *       // Rotate table
 *       table.rotateY(0.5);
 *       table.rotateX(0.3);
 *   });
 * ````
 *
 * ## Metadata
 *
 * As mentioned, we can also associate {@link MetaModel}s and {@link MetaObject}s with our {@link Node}s and Meshes,
 * within a {@link MetaScene}. See {@link MetaScene} for an example.
 *
 * @implements {Entity}
 * @implements {Drawable}
 */
export class Mesh extends Component {

    /**
     * @constructor
     * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
     * @param {*} [cfg] Configs
     * @param {String} [cfg.id] Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     * @param {String} [cfg.originalSystemId] ID of the corresponding object within the originating system, if any.
     * @param {Boolean} [cfg.isModel] Specify ````true```` if this Mesh represents a model, in which case the Mesh will be registered by {@link Mesh#id} in {@link Scene#models} and may also have a corresponding {@link MetaModel} with matching {@link MetaModel#id}, registered by that ID in {@link MetaScene#metaModels}.
     * @param {Boolean} [cfg.isObject] Specify ````true```` if this Mesh represents an object, in which case the Mesh will be registered by {@link Mesh#id} in {@link Scene#objects} and may also have a corresponding {@link MetaObject} with matching {@link MetaObject#id}, registered by that ID in {@link MetaScene#metaObjects}.
     * @param {Node} [cfg.parent] The parent Node.
     * @param {Number[]} [cfg.origin] World-space origin for this Mesh. When this is given, then ````matrix````, ````position```` and ````geometry```` are all assumed to be relative to this center.
     * @param {Number[]} [cfg.rtcCenter] Deprecated - renamed to ````origin````.
     * @param {Number[]} [cfg.position=[0,0,0]] 3D position of this Mesh, relative to ````origin````.
     * @param {Number[]} [cfg.scale=[1,1,1]] Local scale.
     * @param {Number[]} [cfg.rotation=[0,0,0]] Local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     * @param {Number[]} [cfg.matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]] Local modelling transform matrix. Overrides the position, scale and rotation parameters.
     * @param {Number[]} [cfg.offset=[0,0,0]] World-space 3D translation offset. Translates the Mesh in World space, after modelling transforms.
     * @param {Boolean} [cfg.occluder=true] Indicates if the Mesh is able to occlude {@link Marker}s.
     * @param {Boolean} [cfg.visible=true] Indicates if the Mesh is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the Mesh is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the Mesh is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the Mesh is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the Mesh is initially included in boundary calculations.
     * @param {Boolean} [cfg.castsShadow=true] Indicates if the Mesh initially casts shadows.
     * @param {Boolean} [cfg.receivesShadow=true]  Indicates if the Mesh initially receives shadows.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the Mesh is initially xrayed.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the Mesh is initially highlighted.
     * @param {Boolean} [cfg.selected=false] Indicates if the Mesh is initially selected.
     * @param {Boolean} [cfg.edges=false] Indicates if the Mesh's edges are initially emphasized.
     * @param {Boolean} [cfg.background=false] Indicates if the Mesh should act as background, e.g., it can be used for a skybox.
     * @param {Number[]} [cfg.colorize=[1.0,1.0,1.0]] Mesh's initial RGB colorize color, multiplies by the rendered fragment colors.
     * @param {Number} [cfg.opacity=1.0] Mesh's initial opacity factor, multiplies by the rendered fragment alpha.
     * @param {String} [cfg.billboard="none"] Mesh's billboarding behaviour. Options are "none" for no billboarding, "spherical" to always directly face {@link Camera.eye}, rotating both vertically and horizontally, or "cylindrical" to face the {@link Camera#eye} while rotating only about its vertically axis (use that mode for things like trees on a landscape).
     * @param {Geometry} [cfg.geometry] {@link Geometry} to define the shape of this Mesh. Inherits {@link Scene#geometry} by default.
     * @param {Material} [cfg.material] {@link Material} to define the normal rendered appearance for this Mesh. Inherits {@link Scene#material} by default.
     * @param {EmphasisMaterial} [cfg.xrayMaterial] {@link EmphasisMaterial} to define the xrayed appearance for this Mesh. Inherits {@link Scene#xrayMaterial} by default.
     * @param {EmphasisMaterial} [cfg.highlightMaterial] {@link EmphasisMaterial} to define the xrayed appearance for this Mesh. Inherits {@link Scene#highlightMaterial} by default.
     * @param {EmphasisMaterial} [cfg.selectedMaterial] {@link EmphasisMaterial} to define the selected appearance for this Mesh. Inherits {@link Scene#selectedMaterial} by default.
     * @param {EmphasisMaterial} [cfg.edgeMaterial] {@link EdgeMaterial} to define the appearance of enhanced edges for this Mesh. Inherits {@link Scene#edgeMaterial} by default.
     * @param {Number} [cfg.renderOrder=0] Specifies the rendering order for this mESH. This is used to control the order in which
     * mESHES are drawn when they have transparent objects, to give control over the order in which those objects are blended within the transparent
     * render pass.
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this.renderOrder = cfg.renderOrder || 0;

        /**
         * ID of the corresponding object within the originating system, if any.
         *
         * @type {String}
         * @abstract
         */
        this.originalSystemId = (cfg.originalSystemId || this.id);

        /** @private **/
        this.renderFlags = new RenderFlags();

        this._state = new RenderState({ // NOTE: Renderer gets modeling and normal matrices from Mesh#matrix and Mesh.#normalWorldMatrix
            visible: true,
            culled: false,
            pickable: null,
            clippable: null,
            collidable: null,
            occluder: (cfg.occluder !== false),
            castsShadow: null,
            receivesShadow: null,
            xrayed: false,
            highlighted: false,
            selected: false,
            edges: false,
            stationary: !!cfg.stationary,
            background: !!cfg.background,
            billboard: this._checkBillboard(cfg.billboard),
            layer: null,
            colorize: null,
            pickID: this.scene._renderer.getPickID(this),
            drawHash: "",
            pickOcclusionHash: "",
            offset: math.vec3(),
            origin: null,
            originHash: null,
            isUI: cfg.isUI
        });

        const material = cfg.material ? this._checkComponent2(["PhongMaterial", "MetallicMaterial", "SpecularMaterial", "LambertMaterial"], cfg.material) : this.scene.material;

        const mesh = this;

        const wrapRenderer = (getProgramSetup) => {
            let instance = null;
            const ensureInstance = () => {
                if (! instance) {
                    const programVariablesState = createProgramVariablesState();
                    const createAttribute = programVariablesState.programVariables.createAttribute;
                    const geometryState = mesh._geometry._state;
                    const attributes = {
                        position:  createAttribute("vec3", "position"),
                        color:     geometryState.colorsBuf && createAttribute("vec4", "color"),
                        pickColor: createAttribute("vec4", "pickColor"),
                        uv:        geometryState.uvBuf && createAttribute("vec2", "uv"),
                        normal:    (geometryState.autoVertexNormals || geometryState.normalsBuf) && [ "triangles", "triangle-strip", "triangle-fan" ].includes(geometryState.primitiveName) && createAttribute("vec3", "normal")
                    };

                    const lazyShaderVariable = function(name) {
                        const variable = {
                            toString: () => {
                                variable.needed = true;
                                return name;
                            }
                        };
                        return variable;
                    };
                    const worldNormal = attributes.normal && lazyShaderVariable("worldNormal");
                    const viewNormal  = worldNormal && lazyShaderVariable("viewNormal");
                    const decodedUv = attributes.uv && lazyShaderVariable("decodedUv");

                    const programSetup = getProgramSetup(
                        programVariablesState.programVariables,
                        {
                            attributes: {
                                position:  {
                                    world: "worldPosition",
                                    view:  "viewPosition"
                                },
                                color:     attributes.color,
                                pickColor: attributes.pickColor,
                                uv:        decodedUv,
                                normal:    attributes.normal && {
                                    world: worldNormal,
                                    view:  viewNormal
                                }
                            },
                            viewMatrix: "viewMatrix2"
                        });
                    const hash = [
                        programSetup.programName,
                        mesh.scene.canvas.canvas.id,
                        mesh.scene._sectionPlanesState.getHash(),
                        mesh._geometry._state.hash
                    ].concat(programSetup.getHash()).join(";");
                    if (! (hash in renderersCache)) {
                        const renderer = instantiateMeshRenderer(mesh, attributes, { decodedUv: decodedUv, worldNormal: worldNormal, viewNormal: viewNormal }, programSetup, programVariablesState);
                        if (renderer.errors) {
                            console.log(renderer.errors.join("\n"));
                            return;
                        }
                        const id = ids.addItem({});
                        renderersCache[hash] = {
                            drawMesh: renderer.drawMesh,
                            id: id,
                            useCount: 0,
                            delete: () => {
                                ids.removeItem(id);
                                renderer.destroy();
                                delete renderersCache[hash];
                                stats.memory.programs--;
                            }
                        };
                        stats.memory.programs++;
                    }
                    instance = renderersCache[hash];
                    instance.useCount++;
                }
            };
            return {
                get:      ensureInstance,
                getId:    () => instance.id,
                put:      () => { if (instance) { if (--instance.useCount === 0) { instance.delete(); } instance = null; } },
                drawMesh: (frameCtx, mesh, material) => {
                    ensureInstance();
                    instance && instance.drawMesh(frameCtx, mesh, material);
                }
            };
        };

        const scene = mesh.scene;
        const emphasisShaderSourceMaker = isFill => (vars, geo) => EmphasisShaderSource(mesh._state.hash, vars, geo, scene, isFill);
        this._renderers = {
            _drawRenderer:          wrapRenderer((vars, geo) => ((material.type === "LambertMaterial")
                                                                 ? LambertShaderSource(mesh._state.drawHash, vars, geo, material, scene)
                                                                 : DrawShaderSource   (mesh._state.drawHash, vars, geo, material, scene))),
            _shadowRenderer:        wrapRenderer((vars) => ShadowShaderSource(mesh._state.hash, vars)),
            _emphasisEdgesRenderer: wrapRenderer(emphasisShaderSourceMaker(false)),
            _emphasisFillRenderer:  wrapRenderer(emphasisShaderSourceMaker(true)),
            _pickMeshRenderer:      wrapRenderer((vars) => PickMeshShaderSource(mesh._state.hash, vars)),
            _pickTriangleRenderer:  wrapRenderer((vars, geo) => PickTriangleShaderSource(mesh._state.hash, vars, geo)),
            _occlusionRenderer:     wrapRenderer((vars) => OcclusionShaderSource(mesh._state.pickOcclusionHash, vars))
        };

        this._geometry = cfg.geometry ? this._checkComponent2(["ReadableGeometry", "VBOGeometry"], cfg.geometry) : this.scene.geometry;
        this._material = material;
        this._xrayMaterial = cfg.xrayMaterial ? this._checkComponent("EmphasisMaterial", cfg.xrayMaterial) : this.scene.xrayMaterial;
        this._highlightMaterial = cfg.highlightMaterial ? this._checkComponent("EmphasisMaterial", cfg.highlightMaterial) : this.scene.highlightMaterial;
        this._selectedMaterial = cfg.selectedMaterial ? this._checkComponent("EmphasisMaterial", cfg.selectedMaterial) : this.scene.selectedMaterial;
        this._edgeMaterial = cfg.edgeMaterial ? this._checkComponent("EdgeMaterial", cfg.edgeMaterial) : this.scene.edgeMaterial;

        this._parentNode = null;

        this._aabb = null;
        this._aabbDirty = true;

        this._numTriangles = (this._geometry ? this._geometry.numTriangles : 0);

        this.scene._aabbDirty = true;

        this._scale = math.vec3();
        this._quaternion = math.identityQuaternion();
        this._rotation = math.vec3();
        this._position = math.vec3();

        this._worldMatrix = math.identityMat4();
        this._worldNormalMatrix = math.identityMat4();

        this._localMatrixDirty = true;
        this._worldMatrixDirty = true;
        this._worldNormalMatrixDirty = true;

        const origin = cfg.origin || cfg.rtcCenter;
        if (origin) {
            this._state.origin = math.vec3(origin);
            this._state.originHash = origin.join();
        }

        if (cfg.matrix) {
            this.matrix = cfg.matrix;
        } else {
            this.scale = cfg.scale;
            this.position = cfg.position;
            if (cfg.quaternion) {
            } else {
                this.rotation = cfg.rotation;
            }
        }

        this._isObject = cfg.isObject;
        if (this._isObject) {
            this.scene._registerObject(this);
        }

        this._isModel = cfg.isModel;
        if (this._isModel) {
            this.scene._registerModel(this);
        }

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
        this.layer = cfg.layer;
        this.colorize = cfg.colorize;
        this.opacity = cfg.opacity;
        this.offset = cfg.offset;

        if (cfg.parentId) {
            const parentNode = this.scene.components[cfg.parentId];
            if (!parentNode) {
                this.error("Parent not found: '" + cfg.parentId + "'");
            } else if (!parentNode.isNode) {
                this.error("Parent is not a Node: '" + cfg.parentId + "'");
            } else {
                parentNode.addChild(this);
            }
            this._parentNode = parentNode;
        } else if (cfg.parent) {
            if (!cfg.parent.isNode) {
                this.error("Parent is not a Node");
            }
            cfg.parent.addChild(this);
            this._parentNode = cfg.parent;
        }

        this.compile();
    }

    /**
     @private
     */
    get type() {
        return "Mesh";
    }

    //------------------------------------------------------------------------------------------------------------------
    // Mesh members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that this Component is a Mesh.
     * @final
     * @type {Boolean}
     */
    get isMesh() {
        return true;
    }

    /**
     * The parent Node.
     *
     * The parent Node may also be set by passing the Mesh to the parent's {@link Node#addChild} method.
     *
     * @type {Node}
     */
    get parent() {
        return this._parentNode;
    }

    /**
     * Defines the shape of this Mesh.
     *
     * Set to {@link Scene#geometry} by default.
     *
     * @type {Geometry}
     */
    get geometry() {
        return this._geometry;
    }

    /**
     * Defines the appearance of this Mesh when rendering normally, ie. when not xrayed, highlighted or selected.
     *
     * Set to {@link Scene#material} by default.
     *
     * @type {Material}
     */
    get material() {
        return this._material;
    }

    /**
     * Gets the Mesh's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get position() {
        return this._position;
    }

    /**
     * Sets the Mesh's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    set position(value) {
        this._position.set(value || [0, 0, 0]);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the Mesh's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get rotation() {
        return this._rotation;
    }

    /**
     * Sets the Mesh's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    set rotation(value) {
        this._rotation.set(value || [0, 0, 0]);
        math.eulerToQuaternion(this._rotation, "XYZ", this._quaternion);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the Mesh's local rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {Number[]}
     */
    get quaternion() {
        return this._quaternion;
    }

    /**
     * Sets the Mesh's local rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {Number[]}
     */
    set quaternion(value) {
        this._quaternion.set(value || [0, 0, 0, 1]);
        math.quaternionToEuler(this._quaternion, "XYZ", this._rotation);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the Mesh's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     */
    get scale() {
        return this._scale;
    }

    /**
     * Sets the Mesh's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     */
    set scale(value) {
        this._scale.set(value || [1, 1, 1]);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the Mesh's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     */
    get matrix() {
        if (this._localMatrixDirty) {
            if (!this.__localMatrix) {
                this.__localMatrix = math.identityMat4();
            }
            math.composeMat4(this._position, this._quaternion, this._scale, this.__localMatrix);
            this._localMatrixDirty = false;
        }
        return this.__localMatrix;
    }

    /**
     * Sets the Mesh's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     */
    set matrix(value) {
        if (!this.__localMatrix) {
            this.__localMatrix = math.identityMat4();
        }
        this.__localMatrix.set(value || identityMat);
        math.decomposeMat4(this.__localMatrix, this._position, this._quaternion, this._scale);
        this._localMatrixDirty = false;
        this._setWorldMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the Mesh's World matrix.
     *
     * @property worldMatrix
     * @type {Number[]}
     */
    get worldMatrix() {
        if (this._worldMatrixDirty) {
            this._buildWorldMatrix();
        }
        return this._worldMatrix;
    }

    /**
     * Gets the Mesh's World normal matrix.
     *
     * @type {Number[]}
     */
    get worldNormalMatrix() {
        if (this._worldNormalMatrixDirty) {
            this._buildWorldNormalMatrix();
        }
        return this._worldNormalMatrix;
    }

    /**
     * Returns true to indicate that Mesh implements {@link Entity}.
     *
     * @returns {Boolean}
     */
    get isEntity() {
        return true;
    }

    /**
     * Returns ````true```` if this Mesh represents a model.
     *
     * When this returns ````true````, the Mesh will be registered by {@link Mesh#id} in {@link Scene#models} and
     * may also have a corresponding {@link MetaModel}.
     *
     * @type {Boolean}
     */
    get isModel() {
        return this._isModel;
    }

    /**
     * Returns ````true```` if this Mesh represents an object.
     *
     * When this returns ````true````, the Mesh will be registered by {@link Mesh#id} in {@link Scene#objects} and
     * may also have a corresponding {@link MetaObject}.
     *
     * @type {Boolean}
     */
    get isObject() {
        return this._isObject;
    }

    /**
     * Returns ````true```` if this Mesh is an UI object.
     *
     * @type {Boolean}
     */
    get isUI() {
        return this._state.isUI;
    }

    /**
     * Gets the Mesh's World-space 3D axis-aligned bounding box.
     *
     * Represented by a six-element Float64Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Number[]}
     */
    get aabb() {
        if (this._aabbDirty) {
            this._updateAABB();
        }
        return this._aabb;
    }

    /**
     * Gets the 3D origin of the Mesh's {@link Geometry}'s vertex positions.
     *
     * When this is given, then {@link Mesh#matrix}, {@link Mesh#position} and {@link Mesh#geometry} are all assumed to be relative to this center position.
     *
     * @type {Float64Array}
     */
    get origin() {
        return this._state.origin;
    }

    /**
     * Sets the 3D origin of the Mesh's {@link Geometry}'s vertex positions.
     *
     * When this is given, then {@link Mesh#matrix}, {@link Mesh#position} and {@link Mesh#geometry} are all assumed to be relative to this center position.
     *
     * @type {Float64Array}
     */
    set origin(origin) {
        if (origin) {
            if (!this._state.origin) {
                this._state.origin = math.vec3();
            }
            this._state.origin.set(origin);
            this._state.originHash = origin.join();
            this._setAABBDirty();
            this.scene._aabbDirty = true;
        } else {
            if (this._state.origin) {
                this._state.origin = null;
                this._state.originHash = null;
                this._setAABBDirty();
                this.scene._aabbDirty = true;
            }
        }
    }

    /**
     * Gets the World-space origin for this Mesh.
     *
     * Deprecated and replaced by {@link Mesh#origin}.
     *
     * @deprecated
     * @type {Float64Array}
     */
    get rtcCenter() {
        return this.origin;
    }

    /**
     * Sets the World-space origin for this Mesh.
     *
     * Deprecated and replaced by {@link Mesh#origin}.
     *
     * @deprecated
     * @type {Float64Array}
     */
    set rtcCenter(rtcCenter) {
        this.origin = rtcCenter;
    }

    /**
     * The approximate number of triangles in this Mesh.
     *
     * @type {Number}
     */
    get numTriangles() {
        return this._numTriangles;
    }

    /**
     * Gets if this Mesh is visible.
     *
     * Only rendered when {@link Mesh#visible} is ````true```` and {@link Mesh#culled} is ````false````.
     *
     * When {@link Mesh#isObject} and {@link Mesh#visible} are both ````true```` the Mesh will be
     * registered by {@link Mesh#id} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    get visible() {
        return this._state.visible;
    }

    /**
     * Sets if this Mesh is visible.
     *
     * Only rendered when {@link Mesh#visible} is ````true```` and {@link Mesh#culled} is ````false````.
     *
     * When {@link Mesh#isObject} and {@link Mesh#visible} are both ````true```` the Mesh will be
     * registered by {@link Mesh#id} in {@link Scene#visibleObjects}.
     *
     * @type {Boolean}
     */
    set visible(visible) {
        visible = visible !== false;
        this._state.visible = visible;
        if (this._isObject) {
            this.scene._objectVisibilityUpdated(this, visible);
        }
        this.glRedraw();
    }

    /**
     * Gets if this Mesh is xrayed.
     *
     * XRayed appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh#xrayMaterial}.
     *
     * When {@link Mesh#isObject} and {@link Mesh#xrayed} are both ````true``` the Mesh will be
     * registered by {@link Mesh#id} in {@link Scene#xrayedObjects}.
     *
     * @type {Boolean}
     */
    get xrayed() {
        return this._state.xrayed;
    }

    /**
     * Sets if this Mesh is xrayed.
     *
     * XRayed appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh#xrayMaterial}.
     *
     * When {@link Mesh#isObject} and {@link Mesh#xrayed} are both ````true``` the Mesh will be
     * registered by {@link Mesh#id} in {@link Scene#xrayedObjects}.
     *
     * @type {Boolean}
     */
    set xrayed(xrayed) {
        xrayed = !!xrayed;
        if (this._state.xrayed === xrayed) {
            return;
        }
        this._state.xrayed = xrayed;
        if (this._isObject) {
            this.scene._objectXRayedUpdated(this, xrayed);
        }
        this.glRedraw();
    }

    /**
     * Gets if this Mesh is highlighted.
     *
     * Highlighted appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh#highlightMaterial}.
     *
     * When {@link Mesh#isObject} and {@link Mesh#highlighted} are both ````true```` the Mesh will be
     * registered by {@link Mesh#id} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return this._state.highlighted;
    }

    /**
     * Sets if this Mesh is highlighted.
     *
     * Highlighted appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh#highlightMaterial}.
     *
     * When {@link Mesh#isObject} and {@link Mesh#highlighted} are both ````true```` the Mesh will be
     * registered by {@link Mesh#id} in {@link Scene#highlightedObjects}.
     *
     * @type {Boolean}
     */
    set highlighted(highlighted) {
        highlighted = !!highlighted;
        if (highlighted === this._state.highlighted) {
            return;
        }
        this._state.highlighted = highlighted;
        if (this._isObject) {
            this.scene._objectHighlightedUpdated(this, highlighted);
        }
        this.glRedraw();
    }

    /**
     * Gets if this Mesh is selected.
     *
     * Selected appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh#selectedMaterial}.
     *
     * When {@link Mesh#isObject} and {@link Mesh#selected} are both ````true``` the Mesh will be
     * registered by {@link Mesh#id} in {@link Scene#selectedObjects}.
     *
     * @type {Boolean}
     */
    get selected() {
        return this._state.selected;
    }

    /**
     * Sets if this Mesh is selected.
     *
     * Selected appearance is configured by the {@link EmphasisMaterial} referenced by {@link Mesh#selectedMaterial}.
     *
     * When {@link Mesh#isObject} and {@link Mesh#selected} are both ````true``` the Mesh will be
     * registered by {@link Mesh#id} in {@link Scene#selectedObjects}.
     *
     * @type {Boolean}
     */
    set selected(selected) {
        selected = !!selected;
        if (selected === this._state.selected) {
            return;
        }
        this._state.selected = selected;
        if (this._isObject) {
            this.scene._objectSelectedUpdated(this, selected);
        }
        this.glRedraw();
    }

    /**
     * Gets if this Mesh is edge-enhanced.
     *
     * Edge appearance is configured by the {@link EdgeMaterial} referenced by {@link Mesh#edgeMaterial}.
     *
     * @type {Boolean}
     */
    get edges() {
        return this._state.edges;
    }

    /**
     * Sets if this Mesh is edge-enhanced.
     *
     * Edge appearance is configured by the {@link EdgeMaterial} referenced by {@link Mesh#edgeMaterial}.
     *
     * @type {Boolean}
     */
    set edges(edges) {
        edges = !!edges;
        if (edges === this._state.edges) {
            return;
        }
        this._state.edges = edges;
        this.glRedraw();
    }

    /**
     * Gets if this Mesh is culled.
     *
     * Only rendered when {@link Mesh#visible} is ````true```` and {@link Mesh#culled} is ````false````.
     *
     * @type {Boolean}
     */
    get culled() {
        return this._state.culled;
    }

    /**
     * Sets if this Mesh is culled.
     *
     * Only rendered when {@link Mesh#visible} is ````true```` and {@link Mesh#culled} is ````false````.
     *
     * @type {Boolean}
     */
    set culled(value) {
        this._state.culled = !!value;
        this.glRedraw();
    }

    /**
     * Gets if this Mesh is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._state.clippable;
    }

    /**
     * Sets if this Mesh is clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    set clippable(value) {
        value = value !== false;
        if (this._state.clippable === value) {
            return;
        }
        this._state.clippable = value;
        this.glRedraw();
    }

    /**
     * Gets if this Mesh included in boundary calculations.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._state.collidable;
    }

    /**
     * Sets if this Mesh included in boundary calculations.
     *
     * @type {Boolean}
     */
    set collidable(value) {
        value = value !== false;
        if (value === this._state.collidable) {
            return;
        }
        this._state.collidable = value;
        this._setAABBDirty();
        this.scene._aabbDirty = true;

    }

    //------------------------------------------------------------------------------------------------------------------
    // Entity members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Gets if this Mesh is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    get pickable() {
        return this._state.pickable;
    }

    /**
     * Sets if this Mesh is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    set pickable(value) {
        value = value !== false;
        if (this._state.pickable === value) {
            return;
        }
        this._state.pickable = value;
        // No need to trigger a render;
        // state is only used when picking
    }

    /**
     * Gets if this Mesh casts shadows.
     *
     * @type {Boolean}
     */
    get castsShadow() {
        return this._state.castsShadow;
    }

    /**
     * Sets if this Mesh casts shadows.
     *
     * @type {Boolean}
     */
    set castsShadow(value) {
        value = value !== false;
        if (value === this._state.castsShadow) {
            return;
        }
        this._state.castsShadow = value;
        this.glRedraw();
    }

    /**
     * Gets if this Mesh can have shadows cast upon it.
     *
     * @type {Boolean}
     */
    get receivesShadow() {
        return this._state.receivesShadow;
    }

    /**
     * Sets if this Mesh can have shadows cast upon it.
     *
     * @type {Boolean}
     */
    set receivesShadow(value) {
        value = value !== false;
        if (value === this._state.receivesShadow) {
            return;
        }
        this._state.receivesShadow = value;
        this._state.hash = value ? "/mod/rs;" : "/mod;";
        this.fire("dirty", this); // Now need to (re)compile objectRenderers to include/exclude shadow mapping
    }

    /**
     * Gets if this Mesh can have Scalable Ambient Obscurance (SAO) applied to it.
     *
     * SAO is configured by {@link SAO}.
     *
     * @type {Boolean}
     * @abstract
     */
    get saoEnabled() {
        return false; // TODO: Support SAO on Meshes
    }

    /**
     * Gets the RGB colorize color for this Mesh.
     *
     * Multiplies by rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    get colorize() {
        return this._state.colorize;
    }

    /**
     * Sets the RGB colorize color for this Mesh.
     *
     * Multiplies by rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    set colorize(value) {
        let colorize = this._state.colorize;
        if (!colorize) {
            colorize = this._state.colorize = new Float32Array(4);
            colorize[3] = 1;
        }
        if (value) {
            colorize[0] = value[0];
            colorize[1] = value[1];
            colorize[2] = value[2];
        } else {
            colorize[0] = 1;
            colorize[1] = 1;
            colorize[2] = 1;
        }
        const colorized = (!!value);
        this.scene._objectColorizeUpdated(this, colorized);
        this.glRedraw();
    }

    /**
     * Gets the opacity factor for this Mesh.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        return this._state.colorize[3];
    }

    /**
     * Sets the opacity factor for this Mesh.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity) {
        let colorize = this._state.colorize;
        if (!colorize) {
            colorize = this._state.colorize = new Float32Array(4);
            colorize[0] = 1;
            colorize[1] = 1;
            colorize[2] = 1;
        }
        const opacityUpdated = (opacity !== null && opacity !== undefined);
        colorize[3] = opacityUpdated ? opacity : 1.0;
        this.scene._objectOpacityUpdated(this, opacityUpdated);
        this.glRedraw();
    }

    /**
     * Gets if this Mesh is transparent.
     * @returns {Boolean}
     */
    get transparent() {
        return this._material.alphaMode === 2 /* blend */ || this._state.colorize[3] < 1
    }

    /**
     * Gets the Mesh's rendering order relative to other Meshes.
     *
     * Default value is ````0````.
     *
     * This can be set on multiple transparent Meshes, to make them render in a specific order for correct alpha blending.
     *
     * @type {Number}
     */
    get layer() {
        return this._state.layer;
    }

    /**
     * Sets the Mesh's rendering order relative to other Meshes.
     *
     * Default value is ````0````.
     *
     * This can be set on multiple transparent Meshes, to make them render in a specific order for correct alpha blending.
     *
     * @type {Number}
     */
    set layer(value) {
        // TODO: Only accept rendering layer in range [0...MAX_layer]
        value = value || 0;
        value = Math.round(value);
        if (value === this._state.layer) {
            return;
        }
        this._state.layer = value;
        this._renderer.needStateSort();
    }

    /**
     * Gets if the Node's position is stationary.
     *
     * When true, will disable the effect of {@link Camera} translations for this Mesh, while still allowing it to rotate. This is useful for skyboxes.
     *
     * @type {Boolean}
     */
    get stationary() {
        return this._state.stationary;
    }

    /**
     * Gets the Node's billboarding behaviour.
     *
     * Options are:
     * * ````"none"```` -  (default) - No billboarding.
     * * ````"spherical"```` - Mesh is billboarded to face the viewpoint, rotating both vertically and horizontally.
     * * ````"cylindrical"```` - Mesh is billboarded to face the viewpoint, rotating only about its vertically axis. Use this mode for things like trees on a landscape.
     * @type {String}
     */
    get billboard() {
        return this._state.billboard;
    }

    /**
     * Gets the Mesh's 3D World-space offset.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get offset() {
        return this._state.offset;
    }

    /**
     * Sets the Mesh's 3D World-space offset.
     *
     * The offset dynamically translates the Mesh in World-space.
     *
     * Default value is ````[0, 0, 0]````.
     *
     * Provide a null or undefined value to reset to the default value.
     *
     * @type {Number[]}
     */
    set offset(value) {
        this._state.offset.set(value || [0, 0, 0]);
        this._setAABBDirty();
        this.glRedraw();
    }

    /**
     * Returns true to indicate that Mesh implements {@link Drawable}.
     * @final
     * @type {Boolean}
     */
    get isDrawable() {
        return true;
    }

    /**
     * Property with final value ````true```` to indicate that xeokit should render this Mesh in sorted order, relative to other Meshes.
     *
     * The sort order is determined by {@link Mesh#stateSortCompare}.
     *
     * Sorting is essential for rendering performance, so that xeokit is able to avoid applying runs of the same state changes to the GPU, ie. can collapse them.
     *
     * @type {Boolean}
     */
    get isStateSortable() {
        return true;
    }

    /**
     * Defines the appearance of this Mesh when xrayed.
     *
     * Mesh is xrayed when {@link Mesh#xrayed} is ````true````.
     *
     * Set to {@link Scene#xrayMaterial} by default.
     *
     * @type {EmphasisMaterial}
     */
    get xrayMaterial() {
        return this._xrayMaterial;
    }

    /**
     * Defines the appearance of this Mesh when highlighted.
     *
     * Mesh is xrayed when {@link Mesh#highlighted} is ````true````.
     *
     * Set to {@link Scene#highlightMaterial} by default.
     *
     * @type {EmphasisMaterial}
     */
    get highlightMaterial() {
        return this._highlightMaterial;
    }

    /**
     * Defines the appearance of this Mesh when selected.
     *
     * Mesh is xrayed when {@link Mesh#selected} is ````true````.
     *
     * Set to {@link Scene#selectedMaterial} by default.
     *
     * @type {EmphasisMaterial}
     */
    get selectedMaterial() {
        return this._selectedMaterial;
    }

    /**
     * Defines the appearance of this Mesh when edges are enhanced.
     *
     * Mesh is xrayed when {@link Mesh#edges} is ````true````.
     *
     * Set to {@link Scene#edgeMaterial} by default.
     *
     * @type {EdgeMaterial}
     */
    get edgeMaterial() {
        return this._edgeMaterial;
    }

    _checkBillboard(value) {
        value = value || "none";
        if (value !== "spherical" && value !== "cylindrical" && value !== "none") {
            this.error("Unsupported value for 'billboard': " + value + " - accepted values are " +
                "'spherical', 'cylindrical' and 'none' - defaulting to 'none'.");
            value = "none";
        }
        return value;
    }

    /**
     * Called by xeokit to compile shaders for this Mesh.
     * @private
     */
    compile() {
        const scene = this.scene;
        const state = this._state;
        const hash = [
            scene.canvas.canvas.id,
            scene._sectionPlanesState.getHash()
        ];
        if (state.stationary) {
            hash.push("/s");
        }
        if (state.billboard === "none") {
            hash.push("/n");
        } else if (state.billboard === "spherical") {
            hash.push("/s");
        } else if (state.billboard === "cylindrical") {
            hash.push("/c");
        }
        hash.push(";");

        const drawHash = hash.concat([
            scene.gammaOutput ? "go" : "",
            scene._lightsState.getHash(),
            state.receivesShadow ? "/rs" : ""
        ]).join("");
        if (this._state.drawHash !== drawHash) {
            this._state.drawHash = drawHash;
            this._renderers._drawRenderer.put();
            this._renderers._shadowRenderer.put();
            this._renderers._emphasisFillRenderer.put();
            this._renderers._emphasisEdgesRenderer.put();
            this._renderers._drawRenderer.get();
            // this._renderers._shadowRenderer.get();
            this._renderers._emphasisFillRenderer.get();
            this._renderers._emphasisEdgesRenderer.get();
        }
        const pickOcclusionHash = hash.join("");
        if (this._state.pickOcclusionHash !== pickOcclusionHash) {
            this._state.pickOcclusionHash = pickOcclusionHash;
            this._renderers._pickMeshRenderer.put();
            this._renderers._pickTriangleRenderer.put();
            this._renderers._pickMeshRenderer.get();
            if (this._state.occluder) {
                this._renderers._occlusionRenderer.put();
                this._renderers._occlusionRenderer.get();
            }
        }
    }

    _setLocalMatrixDirty() {
        this._localMatrixDirty = true;
        this._setWorldMatrixDirty();
    }

    _setWorldMatrixDirty() {
        this._worldMatrixDirty = true;
        this._worldNormalMatrixDirty = true;
    }

    _buildWorldMatrix() {
        const localMatrix = this.matrix;
        if (!this._parentNode) {
            for (let i = 0, len = localMatrix.length; i < len; i++) {
                this._worldMatrix[i] = localMatrix[i];
            }
        } else {
            math.mulMat4(this._parentNode.worldMatrix, localMatrix, this._worldMatrix);
        }
        this._worldMatrixDirty = false;
    }

    _buildWorldNormalMatrix() {
        if (this._worldMatrixDirty) {
            this._buildWorldMatrix();
        }
        if (!this._worldNormalMatrix) {
            this._worldNormalMatrix = math.mat4();
        }
        // Note: order of inverse and transpose doesn't matter
        math.transposeMat4(this._worldMatrix, this._worldNormalMatrix);
        math.inverseMat4(this._worldNormalMatrix);
        this._worldNormalMatrixDirty = false;
    }

    _setAABBDirty() {
        if (this.collidable) {
            for (let node = this; node; node = node._parentNode) {
                node._aabbDirty = true;
            }
        }
    }

    _updateAABB() {
        this.scene._aabbDirty = true;
        if (!this._aabb) {
            this._aabb = math.AABB3();
        }
        this._buildAABB(this.worldMatrix, this._aabb); // Mesh or VBOSceneModel
        this._aabbDirty = false;
    }

    _buildAABB(worldMatrix, aabb) {

        math.transformOBB3(worldMatrix, this._geometry.obb, obb);
        math.OBB3ToAABB3(obb, aabb);

        const offset = this._state.offset;

        aabb[0] += offset[0];
        aabb[1] += offset[1];
        aabb[2] += offset[2];
        aabb[3] += offset[0];
        aabb[4] += offset[1];
        aabb[5] += offset[2];

        if (this._state.origin) {
            const origin = this._state.origin;
            aabb[0] += origin[0];
            aabb[1] += origin[1];
            aabb[2] += origin[2];
            aabb[3] += origin[0];
            aabb[4] += origin[1];
            aabb[5] += origin[2];
        }
    }

    /**
     * Rotates the Mesh about the given local axis by the given increment.
     *
     * @param {Number[]} axis Local axis about which to rotate.
     * @param {Number} angle Angle increment in degrees.
     */
    rotate(axis, angle) {
        angleAxis[0] = axis[0];
        angleAxis[1] = axis[1];
        angleAxis[2] = axis[2];
        angleAxis[3] = angle * math.DEGTORAD;
        math.angleAxisToQuaternion(angleAxis, q1);
        math.mulQuaternions(this.quaternion, q1, q2);
        this.quaternion = q2;
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
        return this;
    }

    /**
     * Rotates the Mesh about the given World-space axis by the given increment.
     *
     * @param {Number[]} axis Local axis about which to rotate.
     * @param {Number} angle Angle increment in degrees.
     */
    rotateOnWorldAxis(axis, angle) {
        angleAxis[0] = axis[0];
        angleAxis[1] = axis[1];
        angleAxis[2] = axis[2];
        angleAxis[3] = angle * math.DEGTORAD;
        math.angleAxisToQuaternion(angleAxis, q1);
        math.mulQuaternions(q1, this.quaternion, q1);
        //this.quaternion.premultiply(q1);
        return this;
    }

    /**
     * Rotates the Mesh about the local X-axis by the given increment.
     *
     * @param {Number} angle Angle increment in degrees.
     */
    rotateX(angle) {
        return this.rotate(xAxis, angle);
    }

    /**
     * Rotates the Mesh about the local Y-axis by the given increment.
     *
     * @param {Number} angle Angle increment in degrees.
     */
    rotateY(angle) {
        return this.rotate(yAxis, angle);
    }

    /**
     * Rotates the Mesh about the local Z-axis by the given increment.
     *
     * @param {Number} angle Angle increment in degrees.
     */
    rotateZ(angle) {
        return this.rotate(zAxis, angle);
    }

    /**
     * Translates the Mesh along local space vector by the given increment.
     *
     * @param {Number[]} axis Normalized local space 3D vector along which to translate.
     * @param {Number} distance Distance to translate along  the vector.
     */
    translate(axis, distance) {
        math.vec3ApplyQuaternion(this.quaternion, axis, veca);
        math.mulVec3Scalar(veca, distance, vecb);
        math.addVec3(this.position, vecb, this.position);
        this._setLocalMatrixDirty();
        this._setAABBDirty();
        this.glRedraw();
        return this;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Drawable members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Translates the Mesh along the local X-axis by the given increment.
     *
     * @param {Number} distance Distance to translate along  the X-axis.
     */
    translateX(distance) {
        return this.translate(xAxis, distance);
    }

    /**
     * Translates the Mesh along the local Y-axis by the given increment.
     *
     * @param {Number} distance Distance to translate along  the Y-axis.
     */
    translateY(distance) {
        return this.translate(yAxis, distance);
    }

    /**
     * Translates the Mesh along the local Z-axis by the given increment.
     *
     * @param {Number} distance Distance to translate along  the Z-axis.
     */
    translateZ(distance) {
        return this.translate(zAxis, distance);
    }

    /**
     * Comparison function used by the renderer to determine the order in which xeokit should render the Mesh, relative to to other Meshes.
     *
     * xeokit requires this method because Mesh implements {@link Drawable}.
     *
     * Sorting is essential for rendering performance, so that xeokit is able to avoid needlessly applying runs of the same rendering state changes to the GPU, ie. can collapse them.
     *
     * @param {Mesh} mesh1
     * @param {Mesh} mesh2
     * @returns {number}
     */
    stateSortCompare(mesh1, mesh2) {
        return (mesh1._state.layer - mesh2._state.layer)
            || (mesh1._renderers._drawRenderer.getId() - mesh2._renderers._drawRenderer.getId()) // Program state
            || (mesh1._material._state.id - mesh2._material._state.id) // Material state
            || (mesh1._geometry._state.id - mesh2._geometry._state.id); // Geometry state
    }

    /** @private */
    rebuildRenderFlags() {
        this.renderFlags.reset();
        if (!this._getActiveSectionPlanes()) {
            this.renderFlags.culled = true;
            return;
        }
        this.renderFlags.numLayers = 1;
        this.renderFlags.numVisibleLayers = 1;
        this.renderFlags.visibleLayers[0] = 0;
        this._updateRenderFlags();
    }

    /**
     * @private
     */
    _updateRenderFlags() {

        const renderFlags = this.renderFlags;
        const state = this._state;

        if (state.xrayed) {
            const xrayMaterial = this._xrayMaterial._state;
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
        } else {
            const normalMaterial = this._material._state;
            if (normalMaterial.alpha < 1.0 || state.colorize[3] < 1.0) {
                renderFlags.colorTransparent = true;
            } else {
                renderFlags.colorOpaque = true;
            }
            if (state.edges) {
                const edgeMaterial = this._edgeMaterial._state;
                if (edgeMaterial.alpha < 1.0) {
                    renderFlags.edgesTransparent = true;
                } else {
                    renderFlags.edgesOpaque = true;
                }
            }
            if (state.selected) {
                const selectedMaterial = this._selectedMaterial._state;
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
            } else if (state.highlighted) {
                const highlightMaterial = this._highlightMaterial._state;
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
    }

    _getActiveSectionPlanes() {

        if (this._state.clippable) {

            const sectionPlanes = this.scene._sectionPlanesState.sectionPlanes;
            const numSectionPlanes = sectionPlanes.length;

            if (numSectionPlanes > 0) {
                for (let i = 0; i < numSectionPlanes; i++) {

                    const sectionPlane = sectionPlanes[i];
                    const renderFlags = this.renderFlags;

                    if (!sectionPlane.active) {
                        renderFlags.sectionPlanesActivePerLayer[i] = false;

                    } else {

                        if (this._state.origin) {

                            const intersect = math.planeAABB3Intersect(sectionPlane.dir, sectionPlane.dist, this.aabb);
                            const outside = (intersect === -1);

                            if (outside) {
                                return false;
                            }

                            const intersecting = (intersect === 0);
                            renderFlags.sectionPlanesActivePerLayer[i] = intersecting;

                        } else {
                            renderFlags.sectionPlanesActivePerLayer[i] = true;
                        }
                    }
                }
            }
        }

        return true;
    }

    // ---------------------- NORMAL RENDERING -----------------------------------

    /** @private  */
    drawColorOpaque(frameCtx) {
        this._renderers._drawRenderer.drawMesh(frameCtx, this, this._material);
    }

    /** @private  */
    drawColorTransparent(frameCtx) {
        this._renderers._drawRenderer.drawMesh(frameCtx, this, this._material);
    }

    // ---------------------- RENDERING SAO POST EFFECT TARGETS --------------

    // TODO

    // ---------------------- EMPHASIS RENDERING -----------------------------------

    /** @private  */
    drawSilhouetteXRayed(frameCtx) {
        this._renderers._emphasisFillRenderer.drawMesh(frameCtx, this, this._xrayMaterial);
    }

    /** @private  */
    drawSilhouetteHighlighted(frameCtx) {
        this._renderers._emphasisFillRenderer.drawMesh(frameCtx, this, this._highlightMaterial);
    }

    /** @private  */
    drawSilhouetteSelected(frameCtx) {
        this._renderers._emphasisFillRenderer.drawMesh(frameCtx, this, this._selectedMaterial);
    }

    // ---------------------- EDGES RENDERING -----------------------------------

    /** @private  */
    drawEdgesColorOpaque(frameCtx) {
        this._renderers._emphasisEdgesRenderer.drawMesh(frameCtx, this, this._edgeMaterial);
    }

    /** @private  */
    drawEdgesColorTransparent(frameCtx) {
        this._renderers._emphasisEdgesRenderer.drawMesh(frameCtx, this, this._edgeMaterial);
    }

    /** @private  */
    drawEdgesXRayed(frameCtx) {
        this._renderers._emphasisEdgesRenderer.drawMesh(frameCtx, this, this._xrayMaterial);
    }

    /** @private  */
    drawEdgesHighlighted(frameCtx) {
        this._renderers._emphasisEdgesRenderer.drawMesh(frameCtx, this, this._highlightMaterial);
    }

    /** @private  */
    drawEdgesSelected(frameCtx) {
        this._renderers._emphasisEdgesRenderer.drawMesh(frameCtx, this, this._selectedMaterial);
    }

    // ---------------------- OCCLUSION CULL RENDERING -----------------------------------

    /** @private  */
    drawOcclusion(frameCtx) {
        this._renderers._occlusionRenderer.drawMesh(frameCtx, this, this._material);
    }

    // ---------------------- SHADOW BUFFER RENDERING -----------------------------------

    /** @private  */
    drawShadow(frameCtx) {
        this._renderers._shadowRenderer.drawMesh(frameCtx, this, this._material);
    }

    // ---------------------- PICKING RENDERING ----------------------------------

    /** @private  */
    drawPickMesh(frameCtx) {
        this._renderers._pickMeshRenderer.drawMesh(frameCtx, this, this._material);
    }

    /** @private
     */
    canPickTriangle() {
        return this._geometry.isReadableGeometry; // VBOGeometry does not support surface picking because it has no geometry data in browser memory
    }

    /** @private  */
    drawPickTriangles(frameCtx) {
        this._renderers._pickTriangleRenderer.drawMesh(frameCtx, this, this._material);
    }

    /** @private */
    pickTriangleSurface(pickViewMatrix, pickProjMatrix, projection, pickResult) {
        pickTriangleSurface(this, pickViewMatrix, pickProjMatrix, projection, pickResult);
    }

    /** @private  */
    drawPickVertices(frameCtx) {

    }

    /**
     * @private
     * @returns {PerformanceNode}
     */
    delegatePickedEntity() {
        return this;
    }

    //------------------------------------------------------------------------------------------------------------------
    // Component members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Destroys this Mesh.
     */
    destroy() {
        super.destroy(); // xeokit.Object
        Object.values(this._renderers).forEach(r => r.put());

        this.scene._renderer.putPickID(this._state.pickID); // TODO: somehow puch this down into xeokit framework?
        if (this._isObject) {
            this.scene._deregisterObject(this);
            if (this._visible) {
                this.scene._objectVisibilityUpdated(this, false, false);
            }
            if (this._xrayed) {
                this.scene._objectXRayedUpdated(this, false, false);
            }
            if (this._selected) {
                this.scene._objectSelectedUpdated(this, false, false);
            }
            if (this._highlighted) {
                this.scene._objectHighlightedUpdated(this, false, false);
            }
            this.scene._objectColorizeUpdated(this, false);
            this.scene._objectOpacityUpdated(this, false);
            if (this.offset.some((v) => v !== 0))
                this.scene._objectOffsetUpdated(this, false);
        }
        if (this._isModel) {
            this.scene._deregisterModel(this);
        }
        this.glRedraw();
    }

}


const pickTriangleSurface = (function () {

    // Cached vars to avoid garbage collection

    const localRayOrigin = math.vec3();
    const localRayDir = math.vec3();
    const positionA = math.vec3();
    const positionB = math.vec3();
    const positionC = math.vec3();
    const triangleVertices = math.vec3();
    const position = math.vec4();
    const worldPos = math.vec3();
    const viewPos = math.vec3();
    const bary = math.vec3();
    const normalA = math.vec3();
    const normalB = math.vec3();
    const normalC = math.vec3();
    const uva = math.vec3();
    const uvb = math.vec3();
    const uvc = math.vec3();
    const tempVec4a = math.vec4();
    const tempVec4b = math.vec4();
    const tempVec4c = math.vec4();
    const tempVec3 = math.vec3();
    const tempVec3b = math.vec3();
    const tempVec3c = math.vec3();
    const tempVec3d = math.vec3();
    const tempVec3e = math.vec3();
    const tempVec3f = math.vec3();
    const tempVec3g = math.vec3();
    const tempVec3h = math.vec3();
    const tempVec3i = math.vec3();
    const tempVec3j = math.vec3();
    const tempVec3k = math.vec3();

    return function (mesh, pickViewMatrix, pickProjMatrix, projection, pickResult) {

        var primIndex = pickResult.primIndex;

        if (primIndex !== undefined && primIndex !== null && primIndex > -1) {

            const geometry = mesh.geometry._state;
            const scene = mesh.scene;
            const camera = scene.camera;
            const canvas = scene.canvas;

            if (geometry.primitiveName === "triangles") {

                // Triangle picked; this only happens when the
                // Mesh has a Geometry that has primitives of type "triangle"

                pickResult.primitive = "triangle";

                // Get the World-space positions of the triangle's vertices

                const i = primIndex; // Indicates the first triangle index in the indices array

                const indices = geometry.indices; // Indices into geometry arrays, not into shared VertexBufs
                const positions = geometry.positions;

                let ia3;
                let ib3;
                let ic3;

                if (indices) {

                    var ia = indices[i + 0];
                    var ib = indices[i + 1];
                    var ic = indices[i + 2];

                    triangleVertices[0] = ia;
                    triangleVertices[1] = ib;
                    triangleVertices[2] = ic;

                    pickResult.indices = triangleVertices;

                    ia3 = ia * 3;
                    ib3 = ib * 3;
                    ic3 = ic * 3;

                } else {

                    ia3 = i * 3;
                    ib3 = ia3 + 3;
                    ic3 = ib3 + 3;
                }

                positionA[0] = positions[ia3 + 0];
                positionA[1] = positions[ia3 + 1];
                positionA[2] = positions[ia3 + 2];

                positionB[0] = positions[ib3 + 0];
                positionB[1] = positions[ib3 + 1];
                positionB[2] = positions[ib3 + 2];

                positionC[0] = positions[ic3 + 0];
                positionC[1] = positions[ic3 + 1];
                positionC[2] = positions[ic3 + 2];

                if (geometry.compressGeometry) {

                    // Decompress vertex positions

                    const positionsDecodeMatrix = geometry.positionsDecodeMatrix;
                    if (positionsDecodeMatrix) {
                        geometryCompressionUtils.decompressPosition(positionA, positionsDecodeMatrix, positionA);
                        geometryCompressionUtils.decompressPosition(positionB, positionsDecodeMatrix, positionB);
                        geometryCompressionUtils.decompressPosition(positionC, positionsDecodeMatrix, positionC);
                    }
                }

                // Attempt to ray-pick the triangle in local space

                if (pickResult.canvasPos) {
                    math.canvasPosToLocalRay(canvas.canvas, mesh.origin ? createRTCViewMat(pickViewMatrix, mesh.origin) : pickViewMatrix, pickProjMatrix, projection, mesh.worldMatrix, pickResult.canvasPos, localRayOrigin, localRayDir);

                } else if (pickResult.origin && pickResult.direction) {
                    math.worldRayToLocalRay(mesh.worldMatrix, pickResult.origin, pickResult.direction, localRayOrigin, localRayDir);
                }

                math.normalizeVec3(localRayDir);
                math.rayPlaneIntersect(localRayOrigin, localRayDir, positionA, positionB, positionC, position);

                // Get Local-space cartesian coordinates of the ray-triangle intersection

                pickResult.localPos = position;
                pickResult.position = position;

                // Get interpolated World-space coordinates

                // Need to transform homogeneous coords

                tempVec4a[0] = position[0];
                tempVec4a[1] = position[1];
                tempVec4a[2] = position[2];
                tempVec4a[3] = 1;

                // Get World-space cartesian coordinates of the ray-triangle intersection

                math.transformVec4(mesh.worldMatrix, tempVec4a, tempVec4b);

                worldPos[0] = tempVec4b[0];
                worldPos[1] = tempVec4b[1];
                worldPos[2] = tempVec4b[2];

                if (pickResult.canvasPos && mesh.origin) {
                    worldPos[0] += mesh.origin[0];
                    worldPos[1] += mesh.origin[1];
                    worldPos[2] += mesh.origin[2];
                }

                pickResult.worldPos = worldPos;

                // Get View-space cartesian coordinates of the ray-triangle intersection

                math.transformVec4(camera.matrix, tempVec4b, tempVec4c);

                viewPos[0] = tempVec4c[0];
                viewPos[1] = tempVec4c[1];
                viewPos[2] = tempVec4c[2];

                pickResult.viewPos = viewPos;

                // Get barycentric coordinates of the ray-triangle intersection

                math.cartesianToBarycentric(position, positionA, positionB, positionC, bary);

                pickResult.bary = bary;

                // Get interpolated normal vector

                const normals = geometry.normals;

                if (normals) {

                    if (geometry.compressGeometry) {

                        // Decompress vertex normals

                        const ia2 = ia * 3;
                        const ib2 = ib * 3;
                        const ic2 = ic * 3;

                        geometryCompressionUtils.decompressNormal(normals.subarray(ia2, ia2 + 2), normalA);
                        geometryCompressionUtils.decompressNormal(normals.subarray(ib2, ib2 + 2), normalB);
                        geometryCompressionUtils.decompressNormal(normals.subarray(ic2, ic2 + 2), normalC);

                    } else {

                        normalA[0] = normals[ia3];
                        normalA[1] = normals[ia3 + 1];
                        normalA[2] = normals[ia3 + 2];

                        normalB[0] = normals[ib3];
                        normalB[1] = normals[ib3 + 1];
                        normalB[2] = normals[ib3 + 2];

                        normalC[0] = normals[ic3];
                        normalC[1] = normals[ic3 + 1];
                        normalC[2] = normals[ic3 + 2];
                    }

                    const normal = math.addVec3(math.addVec3(
                            math.mulVec3Scalar(normalA, bary[0], tempVec3),
                            math.mulVec3Scalar(normalB, bary[1], tempVec3b), tempVec3c),
                        math.mulVec3Scalar(normalC, bary[2], tempVec3d), tempVec3e);

                    pickResult.worldNormal = math.normalizeVec3(math.transformVec3(mesh.worldNormalMatrix, normal, tempVec3f));
                }

                // Get interpolated UV coordinates

                const uvs = geometry.uv;

                if (uvs) {

                    uva[0] = uvs[(ia * 2)];
                    uva[1] = uvs[(ia * 2) + 1];

                    uvb[0] = uvs[(ib * 2)];
                    uvb[1] = uvs[(ib * 2) + 1];

                    uvc[0] = uvs[(ic * 2)];
                    uvc[1] = uvs[(ic * 2) + 1];

                    if (geometry.compressGeometry) {

                        // Decompress vertex UVs

                        const uvDecodeMatrix = geometry.uvDecodeMatrix;
                        if (uvDecodeMatrix) {
                            geometryCompressionUtils.decompressUV(uva, uvDecodeMatrix, uva);
                            geometryCompressionUtils.decompressUV(uvb, uvDecodeMatrix, uvb);
                            geometryCompressionUtils.decompressUV(uvc, uvDecodeMatrix, uvc);
                        }
                    }

                    pickResult.uv = math.addVec3(
                        math.addVec3(
                            math.mulVec2Scalar(uva, bary[0], tempVec3g),
                            math.mulVec2Scalar(uvb, bary[1], tempVec3h), tempVec3i),
                        math.mulVec2Scalar(uvc, bary[2], tempVec3j), tempVec3k);
                }
            }
        }
    }
})();

const instantiateMeshRenderer = (mesh, attributes, auxVariables, programSetup, programVariablesState) => {
    const programVariables = programVariablesState.programVariables;
    const decodedUv   = auxVariables.decodedUv;
    const worldNormal = auxVariables.worldNormal;
    const viewNormal  = auxVariables.viewNormal;
    const scene = mesh.scene;
    const gl = scene.canvas.gl;
    const meshStateBackground = mesh._state.background;
    const geometryState = mesh._geometry._state;
    const quantizedGeometry = geometryState.compressGeometry;
    const isPoints = geometryState.primitiveName === "points";

    const pointSize             = programVariables.createUniform("float", "pointSize");
    const modelMatrix           = programVariables.createUniform("mat4",  "modelMatrix");
    const modelNormalMatrix     = programVariables.createUniform("mat4",  "modelNormalMatrix");
    const offset                = programVariables.createUniform("vec3",  "offset");
    const scale                 = programVariables.createUniform("vec3",  "scale");
    const positionsDecodeMatrix = programVariables.createUniform("mat4",  "positionsDecodeMatrix");
    const uvDecodeMatrix        = programVariables.createUniform("mat3",  "uvDecodeMatrix");
    const viewMatrix            = programVariables.createUniform("mat4",  "viewMatrix");
    const viewNormalMatrix      = programVariables.createUniform("mat4",  "viewNormalMatrix");
    const projMatrix            = programVariables.createUniform("mat4",  "projMatrix");

    const billboard = mesh.billboard;
    const isBillboard = (! programSetup.dontBillboardAnything) && ((billboard === "spherical") || (billboard === "cylindrical"));
    const stationary = mesh.stationary;
    const defineBillboard = isBillboard && ((name, src) => [
        `mat4 ${name}(in mat4 matIn) {`,
        "   mat4 mat = matIn;",
        `   mat[0].xyz = vec3(${scale}[0], 0.0, 0.0);`,
        ...((billboard === "spherical") ? [ `   mat[1].xyz = vec3(0.0, ${scale}[1], 0.0);` ] : [ ]),
        "   mat[2].xyz = vec3(0.0, 0.0, 1.0);",
        "   return mat;",
        "}",
    ].forEach(l => src.push(l)));

    const billboardIfApplicable = (function() {
        const billboardVert = defineBillboard && programVariables.createVertexDefinition("billboard", defineBillboard);
        return v => billboardVert ? `${billboardVert}(${v})` : v;
    })();

    const billboardIfApplicableFrag = (function() {
        const billboardFrag = defineBillboard && programVariables.createFragmentDefinition("billboard", defineBillboard);
        return v => billboardFrag ? `${billboardFrag}(${v})` : v;
    })();

    const fragmentOutputsSetup = [ ];
    if (programSetup.dontBillboardAnything) {
        fragmentOutputsSetup.push(`mat4 viewMatrix2 = ${viewMatrix};`);
    } else {
        fragmentOutputsSetup.push(`mat4 viewMatrix1 = ${viewMatrix};`);
        if (stationary) {
            fragmentOutputsSetup.push("viewMatrix1[3].xyz = vec3(0.0, 0.0, 0.0);");
        } else if (meshStateBackground) {
            fragmentOutputsSetup.push("viewMatrix1[3]     = vec4(0.0, 0.0, 0.0, 1.0);");
        }
        fragmentOutputsSetup.push(`mat4 viewMatrix2 = ${billboardIfApplicableFrag("viewMatrix1")};`);
    }

    const clipPos = "clipPos";
    const getVertexData = function() {
        const viewNormalDefinition = viewNormal && viewNormal.needed && `vec3 ${viewNormal} = normalize((${billboardIfApplicable(viewNormalMatrix)} * vec4(${worldNormal}, 0.0)).xyz);`;
        const src = [ ];
        src.push(`vec4 localPosition = vec4(${attributes.position}, 1.0);`);
        if (quantizedGeometry) {
            src.push(`localPosition = ${positionsDecodeMatrix} * localPosition;`);
        }
        src.push(`vec4 worldPosition = ${billboardIfApplicable(modelMatrix)} * localPosition;`);
        src.push(`worldPosition.xyz = worldPosition.xyz + ${offset};`);
        if (programSetup.dontBillboardAnything) {
            src.push(`vec4 viewPosition = ${viewMatrix} * worldPosition;`);
        } else {
            src.push(`mat4 viewMatrix1 = ${viewMatrix};`);
            if (stationary) {
                src.push("viewMatrix1[3].xyz = vec3(0.0, 0.0, 0.0);");
            } else if (meshStateBackground) {
                src.push("viewMatrix1[3]     = vec4(0.0, 0.0, 0.0, 1.0);");
            }
            src.push(`mat4 viewMatrix2 = ${billboardIfApplicable("viewMatrix1")};`);
            src.push(`vec4 viewPosition = ${(isBillboard
                                                 ? `${billboardIfApplicable(`viewMatrix1 * ${modelMatrix}`)} * localPosition`
                                                 : "viewMatrix2 * worldPosition")};`);
        }
        decodedUv && decodedUv.needed && src.push(`vec2 ${decodedUv} = ${quantizedGeometry ? `(${uvDecodeMatrix} * vec3(${attributes.uv}, 1.0)).xy` : attributes.uv};`);
        if (worldNormal && worldNormal.needed) {
            const localNormal = quantizedGeometry ? `${programVariables.commonLibrary.octDecode}(${attributes.normal}.xy)` : attributes.normal;
            src.push(`vec3 ${worldNormal} = (${billboardIfApplicable(modelNormalMatrix)} * vec4(${localNormal}, 0.0)).xyz;`);
        }
        viewNormalDefinition && src.push(viewNormalDefinition);
        src.push(`vec4 ${clipPos} = ${projMatrix} * viewPosition;`);
        return src;
    };

    const clippable = programVariables.createUniform("bool", "clippable");

    const [ program, errors ] = programVariablesState.buildProgram(
        gl,
        programSetup.programName,
        {
            appendFragmentOutputs:          (src, getGammaOutputExpression, gl_FragCoord, sliceColorOr) => {
                fragmentOutputsSetup.forEach(line => src.push(line));
                programSetup.appendFragmentOutputs(src, getGammaOutputExpression, gl_FragCoord, sliceColorOr);
            },
            clippableTest:                  () => clippable,
            clippingCaps:                   programSetup.clippingCaps,
            clipPos:                        meshStateBackground ? `${clipPos}.xyww` : clipPos,
            crossSections:                  scene.crossSections,
            discardPoints:                  isPoints && programSetup.discardPoints,
            getGammaFactor:                 scene.gammaOutput && (() => scene.gammaFactor),
            getLogDepth:                    (! programSetup.dontGetLogDepth) && scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
            getPointSize:                   programSetup.setupPointSize && isPoints && (() => pointSize),
            getVertexData:                  getVertexData,
            projMatrix:                     projMatrix,
            sectionPlanesState:             scene._sectionPlanesState,
            testPerspectiveForGl_FragDepth: true,
            usePickClipPos:                 programSetup.isPick,
            worldPositionAttribute:         "worldPosition"
        });

    if (errors) {
        return { errors: errors };
    } else {
        const inputSetters = program.inputSetters;

        let lastMaterialId = null;
        let lastGeometryId = null;

        return {
            destroy: () => program.destroy(),
            drawMesh: (frameCtx, mesh, material) => {
                if (programSetup.skipIfTransparent && (material.alpha < 1.0)) {
                    return;
                }

                const materialState = material._state;
                const meshState = mesh._state;
                const geometry = mesh._geometry;
                const geometryState = geometry._state;
                const viewParams = frameCtx.viewParams;
                const actsAsBackground = programSetup.canActAsBackground && meshStateBackground;

                if (frameCtx.lastProgramId !== program.id) {
                    frameCtx.lastProgramId = program.id;
                    program.bind();
                    frameCtx.useProgram++;
                    lastMaterialId = null;
                    lastGeometryId = null;
                    if (actsAsBackground) {
                        gl.depthFunc(gl.LEQUAL);
                    }
                }

                if (materialState.id !== lastMaterialId) {
                    if (frameCtx.backfaces !== materialState.backfaces) {
                        if (materialState.backfaces) {
                            gl.disable(gl.CULL_FACE);
                        } else {
                            gl.enable(gl.CULL_FACE);
                        }
                        frameCtx.backfaces = materialState.backfaces;
                    }

                    if ((! programSetup.dontSetFrontFace) && (frameCtx.frontface !== materialState.frontface)) {
                        gl.frontFace(materialState.frontface ? gl.CCW : gl.CW);
                        frameCtx.frontface = materialState.frontface;
                    }

                    if (programSetup.drawEdges && (frameCtx.lineWidth !== materialState.edgeWidth)) {
                        gl.lineWidth(materialState.edgeWidth);
                        frameCtx.lineWidth = materialState.edgeWidth;
                    }

                    if (programSetup.setsLineWidth && (frameCtx.lineWidth !== materialState.lineWidth)) {
                        gl.lineWidth(materialState.lineWidth);
                        frameCtx.lineWidth = materialState.lineWidth;
                    }

                    lastMaterialId = materialState.id;
                }

                const setUniforms = (projMat, viewMat) => {
                    const setUni = (u, v) => (u.setInputValue && u.setInputValue(v));
                    setUni(pointSize,             material.pointSize);
                    setUni(modelMatrix,           mesh.worldMatrix);
                    setUni(modelNormalMatrix,     mesh.worldNormalMatrix);
                    setUni(offset,                mesh.offset);
                    setUni(scale,                 mesh.scale);
                    setUni(positionsDecodeMatrix, geometryState.positionsDecodeMatrix);
                    setUni(uvDecodeMatrix,        geometryState.uvDecodeMatrix);
                    setUni(viewMatrix,            viewMat);
                    setUni(viewNormalMatrix,      viewParams.viewNormalMatrix);
                    setUni(projMatrix,            projMat);
                    setUni(clippable,             mesh.clippable);

                    inputSetters.setUniforms(frameCtx, {
                        material:     material,
                        meshColorize: mesh.colorize,
                        meshPickID:   mesh._state.pickID,
                        mesh:         {
                            origin:      mesh.origin,
                            renderFlags: { sectionPlanesActivePerLayer: mesh.renderFlags.sectionPlanesActivePerLayer }
                        },
                        view:         { far: viewParams.far }
                    });
                };

                const origin = (! programSetup.useShadowView) && mesh.origin;
                setUniforms(viewParams.projMatrix, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : viewParams.viewMatrix);

                const setAttributes = (triangleGeometry) => {
                    const setAttr = (a, b) => {
                        if (a && a.setInputValue && b) {
                            a.setInputValue(b);
                            frameCtx.bindArray++;
                        }
                    };
                    setAttr(attributes.position,  (triangleGeometry || geometryState).positionsBuf);
                    setAttr(attributes.color,     geometryState.colorsBuf);
                    setAttr(attributes.pickColor, triangleGeometry && triangleGeometry.pickColorsBuf);
                    setAttr(attributes.uv,        geometryState.uvBuf);
                    setAttr(attributes.normal,    geometryState.normalsBuf);
                };

                if (programSetup.trianglePick) {
                    const positionsBuf = geometry._getPickTrianglePositions();
                    if (geometryState.id !== lastGeometryId) {
                        setAttributes({ positionsBuf: positionsBuf, pickColorsBuf: geometry._getPickTriangleColors() });
                        lastGeometryId = geometryState.id;
                    }

                    gl.drawArrays(geometryState.primitive, 0, positionsBuf.numItems / 3);
                } else if (programSetup.drawEdges) {
                    const indicesBuf = ((geometryState.primitive === gl.TRIANGLES)
                                        ? geometry._getEdgeIndices()
                                        : ((geometryState.primitive === gl.LINES) && geometryState.indicesBuf));

                    if (indicesBuf) {
                        if (geometryState.id !== lastGeometryId) {
                            setAttributes();

                            indicesBuf.bind();
                            frameCtx.bindArray++;
                            lastGeometryId = geometryState.id;
                        }

                        gl.drawElements(gl.LINES, indicesBuf.numItems, indicesBuf.itemType, 0);

                        frameCtx.drawElements++;
                    }
                } else {
                    if (geometryState.id !== lastGeometryId) {
                        setAttributes();

                        if (geometryState.indicesBuf) {
                            geometryState.indicesBuf.bind();
                            frameCtx.bindArray++;
                        }
                        lastGeometryId = geometryState.id;
                    }

                    if (geometryState.indicesBuf) {
                        gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
                        frameCtx.drawElements++;
                    } else if (geometryState.positionsBuf) {
                        gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
                        frameCtx.drawArrays++;
                    }
                }

                if (actsAsBackground) {
                    gl.depthFunc(gl.LESS);
                }
            }
        };
    }
};
