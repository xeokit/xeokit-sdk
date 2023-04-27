import {Component} from "../../Component.js";
import {math} from "../../math/math.js";
import {buildEdgeIndices} from '../../math/buildEdgeIndices.js';
import {WEBGL_INFO} from '../../webglInfo.js';
import {VBOSceneModelMesh} from './lib/VBOSceneModelMesh.js';
import {VBOSceneModelNode} from './lib/VBOSceneModelNode.js';
import {prepareMeshGeometry, TrianglesDataTextureLayer} from './lib/layers/trianglesDataTexture/TrianglesDataTextureLayer.js';

import {ENTITY_FLAGS} from './lib/ENTITY_FLAGS.js';
import {utils} from "../../utils.js";
import {RenderFlags} from "../../webgl/RenderFlags.js";
import {worldToRTCPositions} from "../../math/rtcCoords.js";

import { LodCullingManager } from "./lib/layers/trianglesDataTexture/LodCullingManager.js";
import { ViewFrustumCullingManager } from "./lib/layers/trianglesDataTexture/ViewFrustumCullingManager.js";

const instancedArraysSupported = WEBGL_INFO.SUPPORTED_EXTENSIONS["ANGLE_instanced_arrays"];

const tempVec3a = math.vec3();
const tempMat4 = math.mat4();

const defaultScale = math.vec3([1, 1, 1]);
const defaultPosition = math.vec3([0, 0, 0]);
const defaultRotation = math.vec3([0, 0, 0]);
const defaultQuaternion = math.identityQuaternion();

/**
 * @desc A high-performance data-texture-based model representation for efficient rendering and low memory usage.
 *
 *
 * @implements {Drawable}
 * @implements {Entity}
 */
class DataTextureSceneModel extends Component {

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
     * @param {Number} [cfg.backfaces=false] When we set this ````true````, then we force rendering of backfaces for this dataTexturePerformanceModel. When
     * we leave this ````false````, then we allow the Viewer to decide when to render backfaces. In that case, the
     * Viewer will hide backfaces on watertight meshes, show backfaces on open meshes, and always show backfaces on meshes when we slice them open with {@link SectionPlane}s.
     * @param {Boolean} [cfg.saoEnabled=true] Indicates if Scalable Ambient Obscurance (SAO) will apply to this dataTexturePerformanceModel. SAO is configured by the Scene's {@link SAO} component.
     * @param {Boolean} [cfg.pbrEnabled=false] Indicates if physically-based rendering (PBR) will apply to the dataTexturePerformanceModel. Only works when {@link Scene#pbrEnabled} is also ````true````.
     * @param {Number} [cfg.edgeThreshold=10] When xraying, highlighting, selecting or edging, this is the threshold angle between normals of adjacent triangles, below which their shared wireframe edge is not drawn.
     * @param {Boolean} [cfg.disableVertexWelding] Disable vertex welding when loading geometry into the GPU. Default is ```false```.
     * @param {Boolean} [cfg.disableIndexRebucketing] Disable index rebucketing when loading geometry into the GPU. Default is ```false```.
     */
    constructor(owner, cfg = {}) {
        super(owner, cfg);

        if (!(this.scene.canvas.gl instanceof WebGL2RenderingContext)) {
            throw "Using a DataTextureSceneModel requires the usage of webgl2";
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

        this._targetLodFps = cfg.targetLodFps;

        if (cfg.enableViewFrustumCulling) {
            /**
             * @type {ViewFrustumCullingManager}
             */
            this._vfcManager = new ViewFrustumCullingManager (this);
        }

        this._aabb = math.collapseAABB3();
        this._aabbDirty = false;

        /**
         * @type {Array<TrianglesDataTextureLayer>}
         */
        this._layerList = [];

        /**
         * @type {Array<VBOSceneModelNode>}
         */
        this._nodeList = [];

        /**
         * @type {TrianglesDataTextureLayer}
         */
        this._currentDataTextureLayer = null;

        this._instancingGeometries = {};

        this._preparedInstancingGeometries = {};

        /**
         * @type {Map<string, VBOSceneModelMesh>}
         */
        this._meshes = {};
        
        /**
         * @type {Map<string, VBOSceneModelNode>}
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
     * Only works when {@link Scene#pbrEnabled} is also true.
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
     * If provide a  ````positionsDecodeMatrix```` , then ````createGeometry()```` will assume
     * that the ````positions```` and ````normals```` arrays are compressed. When compressed, ````positions```` will be
     * quantized and in World-space, and ````normals```` will be oct-encoded and in World-space.
     *
     * Note that ````positions````, ````normals```` and ````indices```` are all required together.
     *
     * @param {*} cfg Geometry properties.
     * @param {String|Number} cfg.id Mandatory ID for the geometry, to refer to with {@link DataTextureSceneModel#createMesh}.
     * @param {String} cfg.primitive The primitive type. Accepted values are 'points', 'lines', 'triangles', 'solid' and 'surface'.
     * @param {Number[]} cfg.positions Flat array of positions.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Only used with 'triangles' primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.colors] Flat array of RGBA vertex colors as float values in range ````[0..1]````. Ignored when ````geometryId```` is given, overidden by ````color```` and ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of RGBA vertex colors as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given, overrides ````colors```` and is overriden by ````color````.
     * @param {Number[]} [cfg.indices] Array of indices. Not required for `points` primitives.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Used only for Required for 'triangles' primitives. These are automatically generated internally if not supplied, using the ````edgeThreshold```` given to the ````DataTextureSceneModel```` constructor.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positions````.
     * @param {Number[]} [cfg.origin] Optional geometry origin, relative to {@link DataTextureSceneModel#origin}. When this is given, then every mesh created with {@link DataTextureSceneModel#createMesh} that uses this geometry will
     * be transformed relative to this origin.
     */
    createGeometry(cfg) {
        if (cfg.positionsCompressed && !cfg.positions)
        {
            cfg.positions = cfg.positionsCompressed;
        }

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
     * Creates a mesh within this DataTextureSceneModel.
     *
     * A mesh can either share geometry with other meshes, or have its own unique geometry.
     *
     * To share a geometry with other meshes, provide the ID of a geometry created earlier
     * with {@link DataTextureSceneModel#createGeometry}.
     *
     * To create unique geometry for the mesh, provide geometry data arrays.
     *
     * Internally, DataTextureSceneModel will batch all unique mesh geometries into the same arrays, which improves
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
     * @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link DataTextureSceneModel#createGeometry:method"}}createMesh(){{/crossLink}}. Overrides all other geometry parameters given to this method.
     * @param {String} [cfg.primitive="triangles"]  Geometry primitive type. Ignored when ````geometryId```` is given. Accepted values are 'points', 'lines' and 'triangles'.
     * @param {Number[]} [cfg.positions] Flat array of vertex positions. Ignored when ````geometryId```` is given.
     * @param {Number[]} [cfg.colors] Flat array of RGB vertex colors as float values in range ````[0..1]````. Ignored when ````geometryId```` is given, overriden by ````color```` and ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of RGB vertex colors as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given, overrides ````colors```` and is overriden by ````color````.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Only used with 'triangles' primitives. When no normals are given, the mesh will be flat shaded using auto-generated face-aligned normals.
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
        if (cfg.positionsCompressed && !cfg.positions)
        {
            cfg.positions = cfg.positionsCompressed;
        }

        if (this._vfcManager && !this._vfcManager.finalized) {
            if (cfg.color) {
                cfg.color = cfg.color.slice ();
            }

            if (cfg.positionsDecodeMatrix) {
                cfg.positionsDecodeMatrix = cfg.positionsDecodeMatrix.slice ();
            }

            this._vfcManager.addMesh (cfg);

            return;
        }

        let id = cfg.id;
        if (id === undefined || id === null) {
            this.error("Config missing: id");
            return;
        }
        if (this._meshes[id]) {
            this.error("DataTextureSceneModel already has a Mesh with this ID: " + id + "");
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

            preparedGeometryCfg = prepareMeshGeometry (
                geometryCfg,
                this._enableVertexWelding,
                this._enableIndexRebucketing
            );

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
            delete this._currentDataTextureLayer;
            layer = null;
        }

        if (!layer)
        {
            layer = new TrianglesDataTextureLayer(this, {
                layerIndex: 0, // This is set in #finalize()

                // chipmunk
                // positionsDecodeMatrix: cfg.positionsDecodeMatrix,  // Can be undefined

                // chipmunk: allow to have different origins per-mesh
                origin: cfg.origin,
            });
            this._layerList.push(layer);
            this._currentDataTextureLayer = layer;
        }

        let portionId;

        const color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : [255, 255, 255];
        const opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;
        const metallic = (cfg.metallic !== undefined && cfg.metallic !== null) ? Math.floor(cfg.metallic * 255) : 0;
        const roughness = (cfg.roughness !== undefined && cfg.roughness !== null) ? Math.floor(cfg.roughness * 255) : 255;

        const mesh = new VBOSceneModelMesh(this, id, color, opacity);

        const pickId = mesh.pickId;

        const a = pickId >> 24 & 0xFF;
        const b = pickId >> 16 & 0xFF;
        const g = pickId >> 8 & 0xFF;
        const r = pickId & 0xFF;

        const pickColor = new Uint8Array([r, g, b, a]); // Quantized pick color

        const aabb = math.collapseAABB3();

        preparedGeometryCfg.solid = preparedGeometryCfg.primitive == "solid";

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
                    origin: cfg.origin,
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

        if (this._vfcManager && !this._vfcManager.finalized) {
            this._vfcManager.addEntity (cfg);
            return;
        }

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

        const node = new VBOSceneModelNode(this, cfg.isObject, id, meshes, flags, aabb); // Internally sets PerformanceModelMesh#parent to this PerformanceModelNode
        this._nodeList.push(node);
        this._nodes[id] = node;
        this.numEntities++;
        return node;
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

        this.beginDeferredFlagsInAllLayers ();

        if (this._vfcManager) {
            this._vfcManager.finalize (
                function () {
                    if (!this._currentDataTextureLayer) {
                        return;
                    }

                    this._currentDataTextureLayer.finalize();
                    delete this._currentDataTextureLayer;
                    this._currentDataTextureLayer = null;
                }
            );
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

        this.commitDeferredFlagsInAllLayers ();

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
     * Called by VBOSceneModelMesh.drawPickDepths()
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
     * Called by VBOSceneModelMesh.drawPickNormals()
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
        super.destroy();
    }
}

export {DataTextureSceneModel};