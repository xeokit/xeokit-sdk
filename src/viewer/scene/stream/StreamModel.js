import {Component} from "../Component.js";
import {math} from "../math/math.js";
import {buildEdgeIndices} from '../math/buildEdgeIndices.js';
import {StreamMesh} from './StreamMesh.js';
import {ENTITY_FLAGS} from './ENTITY_FLAGS.js';
import {RenderFlags} from "../webgl/RenderFlags.js";
import {worldToRTCPositions} from "../math/rtcCoords.js";
import {createPositionsDecodeMatrix, quantizePositions} from "./compression.js";
import {StreamEntity} from "./StreamEntity.js";
import {geometryCompressionUtils} from "../math/geometryCompressionUtils.js";
import {StreamLayer} from "./StreamLayer";

const tempVec3a = math.vec3();
const tempMat4 = math.mat4();

const DEFAULT_SCALE = math.vec3([1, 1, 1]);
const DEFAULT_POSITION = math.vec3([0, 0, 0]);
const DEFAULT_ROTATION = math.vec3([0, 0, 0]);
const DEFAULT_QUATERNION = math.identityQuaternion();
const DEFAULT_MATRIX = math.identityMat4();

const defaultCompressedColor = new Uint8Array([255, 255, 255]);

/**
 * @desc A high-performance model representation for efficient rendering and low memory usage.
 *
 */
export class StreamModel extends Component {

    /**
     * @constructor
     *
     */
    constructor(owner, cfg = {}) {

        super(owner, cfg);

        this._maxGeometryBatchSize = cfg.maxGeometryBatchSize;

        this._aabb = math.collapseAABB3();
        this._aabbDirty = true;

        this._quantizationRanges = {};
        this._streamLayers = {};
        this._streamMeshList = [];

        this.streamLayerList = []; // For GL state efficiency when drawing, InstancingLayers are in first part, BatchingLayers are in second
        this._streamEntityList = [];

        this._geometries = {};
        this._dtxBuckets = {}; // Geometries with optimizations used for data texture representation
        this._meshes = {};
        this._entities = {};

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
        this._conjugateQuaternion = math.vec4(cfg.quaternion || [0, 0, 0, 1]);

        if (cfg.rotation) {
            math.eulerToQuaternion(this._rotation, "XYZ", this._quaternion);
        }
        this._scale = math.vec3(cfg.scale || [1, 1, 1]);

        this._worldRotationMatrix = math.mat4();
        this._worldRotationMatrixConjugate = math.mat4();
        this._matrix = math.mat4();
        this._matrixDirty = true;

        this._rebuildMatrices();

        this._worldNormalMatrix = math.mat4();
        math.inverseMat4(this._matrix, this._worldNormalMatrix);
        math.transposeMat4(this._worldNormalMatrix);

        if (cfg.matrix || cfg.position || cfg.rotation || cfg.scale || cfg.quaternion) {
            this._viewMatrix = math.mat4();
            this._viewNormalMatrix = math.mat4();
            this._viewMatrixDirty = true;
            this._matrixNonIdentity = true;
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

    //------------------------------------------------------------------------------------------------------------------
    // StreamModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns true to indicate that this Component is a StreamModel.
     * @type {Boolean}
     */
    get isPerformanceModel() {
        return true;
    }

    /**
     * Returns the {@link Entity}s in this StreamModel.
     * @returns {*|{}}
     */
    get objects() {
        return this._entities;
    }

    /**
     * Gets the 3D World-space origin for this StreamModel.
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
     * Sets the StreamModel's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    set position(value) {
        this._position.set(value || [0, 0, 0]);
        this._setWorldMatrixDirty();
        this._setWorldAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the StreamModel's local translation.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get position() {
        return this._position;
    }

    /**
     * Sets the StreamModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    set rotation(value) {
        this._rotation.set(value || [0, 0, 0]);
        math.eulerToQuaternion(this._rotation, "XYZ", this._quaternion);
        this._setWorldMatrixDirty();
        this._setWorldAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the StreamModel's local rotation, as Euler angles given in degrees, for each of the X, Y and Z axis.
     *
     * Default value is ````[0,0,0]````.
     *
     * @type {Number[]}
     */
    get rotation() {
        return this._rotation;
    }

    /**
     * Sets the StreamModel's local rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {Number[]}
     */
    set quaternion(value) {
        this._quaternion.set(value || [0, 0, 0, 1]);
        math.quaternionToEuler(this._quaternion, "XYZ", this._rotation);
        this._setWorldMatrixDirty();
        this._setWorldAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the StreamModel's local rotation quaternion.
     *
     * Default value is ````[0,0,0,1]````.
     *
     * @type {Number[]}
     */
    get quaternion() {
        return this._quaternion;
    }

    /**
     * Sets the StreamModel's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     * @deprecated
     */
    set scale(value) {
        // NOP - deprecated
    }

    /**
     * Gets the StreamModel's local scale.
     *
     * Default value is ````[1,1,1]````.
     *
     * @type {Number[]}
     * @deprecated
     */
    get scale() {
        return this._scale;
    }

    /**
     * Sets the StreamModel's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     */
    set matrix(value) {
        this._matrix.set(value || DEFAULT_MATRIX);

        math.quaternionToRotationMat4(this._quaternion, this._worldRotationMatrix);
        math.conjugateQuaternion(this._quaternion, this._conjugateQuaternion);
        math.quaternionToRotationMat4(this._quaternion, this._worldRotationMatrixConjugate);
        this._matrix.set(this._worldRotationMatrix);
        math.translateMat4v(this._position, this._matrix);

        this._matrixDirty = false;
        this._setWorldMatrixDirty();
        this._setWorldAABBDirty();
        this.glRedraw();
    }

    /**
     * Gets the StreamModel's local modeling transform matrix.
     *
     * Default value is ````[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]````.
     *
     * @type {Number[]}
     */
    get matrix() {
        if (this._matrixDirty) {
            this._rebuildMatrices();
        }
        return this._matrix;
    }

    /**
     * Gets the StreamModel's local modeling rotation transform matrix.
     *
     * @type {Number[]}
     */
    get rotationMatrix() {
        if (this._matrixDirty) {
            this._rebuildMatrices();
        }
        return this._worldRotationMatrix;
    }

    _rebuildMatrices() {
        if (this._matrixDirty) {
            math.quaternionToRotationMat4(this._quaternion, this._worldRotationMatrix);
            math.conjugateQuaternion(this._quaternion, this._conjugateQuaternion);
            math.quaternionToRotationMat4(this._quaternion, this._worldRotationMatrixConjugate);
            this._matrix.set(this._worldRotationMatrix);
            math.translateMat4v(this._position, this._matrix);
            this._matrixDirty = false;
        }
    }

    /**
     * Gets the conjugate of the StreamModel's local modeling rotation transform matrix.
     *
     * @type {Number[]}
     */
    get rotationMatrixConjugate() {
        if (this._matrixDirty) {
            this._rebuildMatrices();
        }
        return this._worldRotationMatrixConjugate;
    }

    _setWorldMatrixDirty() {
        this._matrixDirty = true;
    }

    _setLocalAABBDirty() {
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i]._setLocalAABBDirty(); // Entities need to rebuild their Local AABBs from their Mesh's local AABBs
        }
    }

    _setWorldAABBDirty() {
        this._aabbDirty = true;
        this.scene._aabbDirty = true;
        this._matrixDirty = true;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i]._setWorldAABBDirty(); // Entities need to retransform their World AABBs by StreamModel's worldMatrix
        }
    }

    /**
     * Gets the StreamModel's World matrix.
     *
     * @property worldMatrix
     * @type {Number[]}
     */
    get worldMatrix() {
        return this.matrix;
    }

    /**
     * Gets the StreamModel's World normal matrix.
     *
     * @type {Number[]}
     */
    get worldNormalMatrix() {
        return this._worldNormalMatrix;
    }

    /**
     * Called by private renderers in ./lib, returns the view matrix with which to
     * render this StreamModel. The view matrix is the concatenation of the
     * Camera view matrix with the Performance model's world (modeling) matrix.
     *
     * @private
     */
    get viewMatrix() {
        if (!this._viewMatrix) {
            return this.scene.camera.viewMatrix;
        }
        if (this._matrixDirty) {
            this._rebuildMatrices();
            this._viewMatrixDirty = true;
        }
        if (this._viewMatrixDirty) {
            math.mulMat4(this.scene.camera.viewMatrix, this._matrix, this._viewMatrix);
            math.inverseMat4(this._viewMatrix, this._viewNormalMatrix);
            math.transposeMat4(this._viewNormalMatrix);
            this._viewMatrixDirty = false;
        }
        return this._viewMatrix;
    }

    /**
     * Called by private renderers in ./lib, returns the view normal matrix with which to render this StreamModel.
     *
     * @private
     */
    get viewNormalMatrix() {
        if (!this._viewNormalMatrix) {
            return this.scene.camera.viewNormalMatrix;
        }
        if (this._matrixDirty) {
            this._rebuildMatrices();
            this._viewMatrixDirty = true;
        }
        if (this._viewMatrixDirty) {
            math.mulMat4(this.scene.camera.viewMatrix, this._matrix, this._viewMatrix);
            math.inverseMat4(this._viewMatrix, this._viewNormalMatrix);
            math.transposeMat4(this._viewNormalMatrix);
            this._viewMatrixDirty = false;
        }
        math.inverseMat4(this._viewMatrix, this._viewNormalMatrix);
        math.transposeMat4(this._viewNormalMatrix);
        return this._viewNormalMatrix;
    }

    /**
     * Sets if backfaces are rendered for this StreamModel.
     *
     * Default is ````false````.
     *
     * @type {Boolean}
     */
    get backfaces() {
        return this._backfaces;
    }

    /**
     * Sets if backfaces are rendered for this StreamModel.
     *
     * Default is ````false````.
     *
     * When we set this ````true````, then backfaces are always rendered for this StreamModel.
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
     * Gets the list of {@link Entity}s within this StreamModel.
     *
     * @returns {Entity[]}
     */
    get streamEntityList() {
        return this._streamEntityList;
    }

    /**
     * Returns true to indicate that StreamModel is an {@link Entity}.
     * @type {Boolean}
     */
    get isEntity() {
        return true;
    }

    /**
     * Returns ````true```` if this StreamModel represents a model.
     *
     * When ````true```` the StreamModel will be registered by {@link StreamModel#id} in
     * {@link Scene#models} and may also have a {@link MetaObject} with matching {@link MetaObject#id}.
     *
     * @type {Boolean}
     */
    get isModel() {
        return this._isModel;
    }

    //------------------------------------------------------------------------------------------------------------------
    // StreamModel members
    //------------------------------------------------------------------------------------------------------------------

    /**
     * Returns ````false```` to indicate that StreamModel never represents an object.
     *
     * @type {Boolean}
     */
    get isObject() {
        return false;
    }

    /**
     * Gets the StreamModel's World-space 3D axis-aligned bounding box.
     *
     * Represented by a six-element Float64Array containing the min/max extents of the
     * axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
     *
     * @type {Number[]}
     */
    get aabb() {
        if (this._aabbDirty) {
            math.collapseAABB3(this._aabb);
            for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
                math.expandAABB3(this._aabb, this._streamEntityList[i].aabb);
            }
            this._aabbDirty = false;
        }
        return this._aabb;
    }

    /**
     * The approximate number of triangle primitives in this StreamModel.
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
     * The approximate number of line primitives in this StreamModel.
     *
     * @type {Number}
     */
    get numLines() {
        return this._numLines;
    }

    /**
     * The approximate number of point primitives in this StreamModel.
     *
     * @type {Number}
     */
    get numPoints() {
        return this._numPoints;
    }

    /**
     * Gets if any {@link Entity}s in this StreamModel are visible.
     *
     * The StreamModel is only rendered when {@link StreamModel#visible} is ````true```` and {@link StreamModel#culled} is ````false````.
     *
     * @type {Boolean}
     */
    get visible() {
        return (this.numVisibleLayerPortions > 0);
    }

    /**
     * Sets if this StreamModel is visible.
     *
     * The StreamModel is only rendered when {@link StreamModel#visible} is ````true```` and {@link StreamModel#culled} is ````false````.
     **
     * @type {Boolean}
     */
    set visible(visible) {
        visible = visible !== false;
        this._visible = visible;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].visible = visible;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this StreamModel are xrayed.
     *
     * @type {Boolean}
     */
    get xrayed() {
        return (this.numXRayedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this StreamModel are xrayed.
     *
     * @type {Boolean}
     */
    set xrayed(xrayed) {
        xrayed = !!xrayed;
        this._xrayed = xrayed;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].xrayed = xrayed;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this StreamModel are highlighted.
     *
     * @type {Boolean}
     */
    get highlighted() {
        return (this.numHighlightedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this StreamModel are highlighted.
     *
     * @type {Boolean}
     */
    set highlighted(highlighted) {
        highlighted = !!highlighted;
        this._highlighted = highlighted;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].highlighted = highlighted;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this StreamModel are selected.
     *
     * @type {Boolean}
     */
    get selected() {
        return (this.numSelectedLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this StreamModel are selected.
     *
     * @type {Boolean}
     */
    set selected(selected) {
        selected = !!selected;
        this._selected = selected;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].selected = selected;
        }
        this.glRedraw();
    }

    /**
     * Gets if any {@link Entity}s in this StreamModel have edges emphasised.
     *
     * @type {Boolean}
     */
    get edges() {
        return (this.numEdgesLayerPortions > 0);
    }

    /**
     * Sets if all {@link Entity}s in this StreamModel have edges emphasised.
     *
     * @type {Boolean}
     */
    set edges(edges) {
        edges = !!edges;
        this._edges = edges;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].edges = edges;
        }
        this.glRedraw();
    }

    /**
     * Gets if this StreamModel is culled from view.
     *
     * The StreamModel is only rendered when {@link StreamModel#visible} is true and {@link StreamModel#culled} is false.
     *
     * @type {Boolean}
     */
    get culled() {
        return this._culled;
    }

    /**
     * Sets if this StreamModel is culled from view.
     *
     * The StreamModel is only rendered when {@link StreamModel#visible} is true and {@link StreamModel#culled} is false.
     *
     * @type {Boolean}
     */
    set culled(culled) {
        culled = !!culled;
        this._culled = culled;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].culled = culled;
        }
        this.glRedraw();
    }

    /**
     * Gets if {@link Entity}s in this StreamModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    get clippable() {
        return this._clippable;
    }

    /**
     * Sets if {@link Entity}s in this StreamModel are clippable.
     *
     * Clipping is done by the {@link SectionPlane}s in {@link Scene#sectionPlanes}.
     *
     * @type {Boolean}
     */
    set clippable(clippable) {
        clippable = clippable !== false;
        this._clippable = clippable;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].clippable = clippable;
        }
        this.glRedraw();
    }

    /**
     * Gets if this StreamModel is collidable.
     *
     * @type {Boolean}
     */
    get collidable() {
        return this._collidable;
    }

    /**
     * Sets if {@link Entity}s in this StreamModel are collidable.
     *
     * @type {Boolean}
     */
    set collidable(collidable) {
        collidable = collidable !== false;
        this._collidable = collidable;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].collidable = collidable;
        }
    }

    /**
     * Gets if this StreamModel is pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    get pickable() {
        return (this.numPickableLayerPortions > 0);
    }

    /**
     * Sets if {@link Entity}s in this StreamModel are pickable.
     *
     * Picking is done via calls to {@link Scene#pick}.
     *
     * @type {Boolean}
     */
    set pickable(pickable) {
        pickable = pickable !== false;
        this._pickable = pickable;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].pickable = pickable;
        }
    }

    /**
     * Gets the RGB colorize color for this StreamModel.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    get colorize() {
        return this._colorize;
    }

    /**
     * Sets the RGB colorize color for this StreamModel.
     *
     * Multiplies by rendered fragment colors.
     *
     * Each element of the color is in range ````[0..1]````.
     *
     * @type {Number[]}
     */
    set colorize(colorize) {
        this._colorize = colorize;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].colorize = colorize;
        }
    }

    /**
     * Gets this StreamModel's opacity factor.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    get opacity() {
        return this._opacity;
    }

    /**
     * Sets the opacity factor for this StreamModel.
     *
     * This is a factor in range ````[0..1]```` which multiplies by the rendered fragment alphas.
     *
     * @type {Number}
     */
    set opacity(opacity) {
        this._opacity = opacity;
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i].opacity = opacity;
        }
    }

    /**
     * Gets if this StreamModel casts a shadow.
     *
     * @type {Boolean}
     */
    get castsShadow() {
        return this._castsShadow;
    }

    /**
     * Sets if this StreamModel casts a shadow.
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
     * Sets if this StreamModel can have shadow cast upon it.
     *
     * @type {Boolean}
     */
    get receivesShadow() {
        return this._receivesShadow;
    }

    /**
     * Sets if this StreamModel can have shadow cast upon it.
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
     * Gets if Scalable Ambient Obscurance (SAO) will apply to this StreamModel.
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
     * Gets if physically-based rendering (PBR) is enabled for this StreamModel.
     *
     * Only works when {@link Scene#pbrEnabled} is also true.
     *
     * @type {Boolean}
     */
    get pbrEnabled() {
        return this._pbrEnabled;
    }

    /**
     * Gets if color textures are enabled for this StreamModel.
     *
     * Only works when {@link Scene#colorTextureEnabled} is also true.
     *
     * @type {Boolean}
     */
    get colorTextureEnabled() {
        return this._colorTextureEnabled;
    }

    /**
     * Returns true to indicate that StreamModel is implements {@link Drawable}.
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
     * Configures the appearance of xrayed {@link Entity}s within this StreamModel.
     *
     * This is the {@link Scene#xrayMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get xrayMaterial() {
        return this.scene.xrayMaterial;
    }

    /**
     * Configures the appearance of highlighted {@link Entity}s within this StreamModel.
     *
     * This is the {@link Scene#highlightMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get highlightMaterial() {
        return this.scene.highlightMaterial;
    }

    /**
     * Configures the appearance of selected {@link Entity}s within this StreamModel.
     *
     * This is the {@link Scene#selectedMaterial}.
     *
     * @type {EmphasisMaterial}
     */
    get selectedMaterial() {
        return this.scene.selectedMaterial;
    }

    /**
     * Configures the appearance of edges of {@link Entity}s within this StreamModel.
     *
     * This is the {@link Scene#edgeMaterial}.
     *
     * @type {EdgeMaterial}
     */
    get edgeMaterial() {
        return this.scene.edgeMaterial;
    }

    /**
     * Called by private renderers in ./lib, returns the picking view matrix with which to
     * ray-pick on this StreamModel.
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
     * Creates a reusable geometry within this StreamModel.
     *
     * We can then supply the geometry ID to {@link StreamModel#createMesh} when we want to create meshes that
     * instance the geometry.
     *
     * @param {*} cfg Geometry properties.
     * @param {String|Number} cfg.id Mandatory ID for the geometry, to refer to with {@link StreamModel#createMesh}.
     * @param {String} cfg.primitive The primitive type. Accepted values are 'points', 'lines', 'triangles', 'solid' and 'surface'.
     * @param {Number[]} [cfg.positions] Flat array of uncompressed 3D vertex positions positions. Required for all primitive types. Overridden by ````positionsCompressed````.
     * @param {Number[]} [cfg.positionsCompressed] Flat array of quantized 3D vertex positions. Overrides ````positions````, and must be accompanied by ````positionsDecodeMatrix````.
     * @param {Number[]} [cfg.positionsDecodeMatrix] A 4x4 matrix for decompressing ````positionsCompressed````. Must be accompanied by ````positionsCompressed````.
     * @param {Number[]} [cfg.normals] Flat array of normal vectors. Only used with "triangles", "solid" and "surface" primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.normalsCompressed] Flat array of oct-encoded normal vectors. Overrides ````normals````. Only used with "triangles", "solid" and "surface" primitives. When no normals are given, the geometry will be flat shaded using auto-generated face-aligned normals.
     * @param {Number[]} [cfg.colors] Flat array of uncompressed RGBA vertex colors, as float values in range ````[0..1]````. Ignored when ````geometryId```` is given. Overridden by ````color```` and ````colorsCompressed````.
     * @param {Number[]} [cfg.colorsCompressed] Flat array of compressed RGBA vertex colors, as unsigned short integers in range ````[0..255]````. Ignored when ````geometryId```` is given. Overrides ````colors```` and is overridden by ````color````.
     * @param {Number[]} [cfg.indices] Array of primitive connectivity indices. Not required for `points` primitives.
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Used only with 'triangles', 'solid' and 'surface' primitives. Automatically generated internally if not supplied, using the optional ````edgeThreshold```` given to the ````StreamModel```` constructor.
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
            this.error(`[createGeometry] Unsupported value for 'primitive': '${cfg.primitive}' - supported values are 'points', 'lines', 'triangles', 'solid' and 'surface'. Defaulting to 'triangles'.`);
            return;
        }
        if (!cfg.positions && !cfg.positionsCompressed && !cfg.buckets) {
            this.error("[createGeometry] Param expected: `positions`,  `positionsCompressed' or 'buckets");
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
        if (!cfg.buckets && !cfg.indices && cfg.primitive !== "points") {
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
        if (!cfg.buckets && !cfg.edgeIndices && (cfg.primitive === "triangles" || cfg.primitive === "solid" || cfg.primitive === "surface")) {
            if (cfg.positions) {
                cfg.edgeIndices = buildEdgeIndices(cfg.positions, cfg.indices, null, 5.0);
            } else {
                cfg.edgeIndices = buildEdgeIndices(cfg.positionsCompressed, cfg.indices, cfg.positionsDecodeMatrix, 2.0);
            }
        }
        if (cfg.buckets) {
            this._dtxBuckets[cfg.id] = cfg.buckets;
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
     * Creates a mesh within this StreamModel.
     *
     * A mesh can either define its own geometry or share it with other meshes. To define own geometry, provide the
     * various geometry arrays to this method. To share a geometry, provide the ID of a geometry created earlier
     * with {@link StreamModel#createGeometry}.
     *
     * Internally, StreamModel will batch all unique mesh geometries into the same arrays, which improves
     * rendering performance.
     *
     * If you accompany the arrays with an  ````origin````, then ````createMesh()```` will assume
     * that the ````positions```` are in relative-to-center (RTC) coordinates, with ````origin```` being the origin of their
     * RTC coordinate system.
     *
     * @param {object} cfg Object properties.
     * @param {String} cfg.id Mandatory ID for the new mesh. Must not clash with any existing components within the {@link Scene}.
     * @param {String|Number} [cfg.geometryId] ID of a geometry to instance, previously created with {@link StreamModel#createGeometry"}. Overrides all other geometry parameters given to this method.
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
     * @param {Number[]} [cfg.edgeIndices] Array of edge line indices. Used only with 'triangles', 'solid' and 'surface' primitives. Automatically generated internally if not supplied, using the optional ````edgeThreshold```` given to the ````StreamModel```` constructor.
     * @param {Number[]} [cfg.origin] Optional geometry origin, relative to {@link StreamModel#origin}. When this is given, then ````positions```` are assumed to be relative to this.
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
            this.error("[createMesh] StreamModel.createMesh() config missing: id");
            return;
        }

        if (this._scheduledMeshes[cfg.id]) {
            this.error(`[createMesh] StreamModel already has a mesh with this ID: ${cfg.id}`);
            return;
        }

        const instancing = (cfg.geometryId !== undefined);
        const batching = !instancing;

        if (batching) {

            // Batched geometry

            if (cfg.primitive === undefined || cfg.primitive === null) {
                cfg.primitive = "triangles";
            }
            if (cfg.primitive !== "triangles" && cfg.primitive !== "solid" && cfg.primitive !== "surface") {
                this.error(`Unsupported value for 'primitive': '${primitive}'  ('geometryId' is absent) - supported values are 'triangles', 'solid' and 'surface'.`);
                return;
            }
            if (!cfg.positions && !cfg.positionsCompressed && !cfg.buckets) {
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
            if ((cfg.matrix || cfg.position || cfg.rotation || cfg.scale) && (cfg.positionsCompressed || cfg.positionsDecodeBoundary)) {
                this.error("Unexpected params: 'matrix', 'rotation', 'scale', 'position' not allowed with 'positionsCompressed'");
                return null;
            }

            cfg.origin = cfg.origin ? math.addVec3(this._origin, cfg.origin, math.vec3()) : this._origin;

            // MATRIX - optional for batching

            if (cfg.matrix) {
                cfg.meshMatrix = cfg.matrix;
            } else if (cfg.scale || cfg.rotation || cfg.position) {
                const scale = cfg.scale || DEFAULT_SCALE;
                const position = cfg.position || DEFAULT_POSITION;
                const rotation = cfg.rotation || DEFAULT_ROTATION;
                math.eulerToQuaternion(rotation, "XYZ", DEFAULT_QUATERNION);
                cfg.meshMatrix = math.composeMat4(position, DEFAULT_QUATERNION, scale, math.mat4());
            }

            if (cfg.positionsDecodeBoundary) {
                cfg.positionsDecodeMatrix = createPositionsDecodeMatrix(cfg.positionsDecodeBoundary, math.mat4());
            }

            // NPR

            cfg.color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : defaultCompressedColor;
            cfg.opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;

            // RTC

            if (cfg.positions) {
                const rtcCenter = math.vec3();
                const rtcPositions = [];
                const rtcNeeded = worldToRTCPositions(cfg.positions, rtcPositions, rtcCenter);
                if (rtcNeeded) {
                    cfg.positions = rtcPositions;
                    cfg.origin = math.addVec3(cfg.origin, rtcCenter, rtcCenter);
                }
            }

            // COMPRESSION

            if (cfg.positions) {
                const aabb = math.collapseAABB3();
                cfg.positionsDecodeMatrix = math.mat4();
                math.expandAABB3Points3(aabb, cfg.positions);
                cfg.positionsCompressed = quantizePositions(cfg.positions, aabb, cfg.positionsDecodeMatrix)
            }

            // EDGES

            if (!cfg.buckets && !cfg.edgeIndices && (cfg.primitive === "triangles" || cfg.primitive === "solid" || cfg.primitive === "surface")) {
                if (cfg.positions) { // Faster
                    cfg.edgeIndices = buildEdgeIndices(cfg.positions, cfg.indices, null, 2.0);
                } else {
                    cfg.edgeIndices = buildEdgeIndices(cfg.positionsCompressed, cfg.indices, cfg.positionsDecodeMatrix, 2.0);
                }
            }

            // BUCKETING

            if (!cfg.buckets) {
                cfg.buckets = createDTXBuckets(cfg, this._enableVertexWelding && this._enableIndexBucketing);
            }

        } else {

            // INSTANCING

            if (cfg.positions || cfg.positionsCompressed || cfg.indices || cfg.edgeIndices || cfg.normals || cfg.normalsCompressed || cfg.uv || cfg.uvCompressed || cfg.positionsDecodeMatrix) {
                this.error(`Mesh geometry parameters not expected when instancing a geometry (not expected: positions, positionsCompressed, indices, edgeIndices, normals, normalsCompressed, uv, uvCompressed, positionsDecodeMatrix)`);
                return;
            }

            cfg.geometry = this._geometries[cfg.geometryId];
            if (!cfg.geometry) {
                this.error(`[createMesh] Geometry not found: ${cfg.geometryId} - ensure that you create it first with createGeometry()`);
                return;
            }

            cfg.origin = cfg.origin ? math.addVec3(this._origin, cfg.origin, math.vec3()) : this._origin;
            cfg.positionsDecodeMatrix = cfg.geometry.positionsDecodeMatrix;

            // MATRIX - always have a matrix for instancing

            if (cfg.matrix) {
                cfg.meshMatrix = cfg.matrix.slice();
            } else {
                const scale = cfg.scale || DEFAULT_SCALE;
                const position = cfg.position || DEFAULT_POSITION;
                const rotation = cfg.rotation || DEFAULT_ROTATION;
                math.eulerToQuaternion(rotation, "XYZ", DEFAULT_QUATERNION);
                cfg.meshMatrix = math.composeMat4(position, DEFAULT_QUATERNION, scale, math.mat4());
            }

            // NPR

            cfg.color = (cfg.color) ? new Uint8Array([Math.floor(cfg.color[0] * 255), Math.floor(cfg.color[1] * 255), Math.floor(cfg.color[2] * 255)]) : defaultCompressedColor;
            cfg.opacity = (cfg.opacity !== undefined && cfg.opacity !== null) ? Math.floor(cfg.opacity * 255) : 255;

            // OBB - used for fast AABB calculation

            createGeometryOBB(cfg.geometry)
        }

        cfg.numPrimitives = this._getNumPrimitives(cfg);

        const streamMesh = new StreamMesh(this, cfg.id, cfg.color, cfg.opacity);

        streamMesh.pickId = this.scene._renderer.getPickID(streamMesh);

        const pickId = streamMesh.pickId;
        const a = pickId >> 24 & 0xFF;
        const b = pickId >> 16 & 0xFF;
        const g = pickId >> 8 & 0xFF;
        const r = pickId & 0xFF;

        cfg.pickColor = new Uint8Array([r, g, b, a]); // Quantized pick color
        cfg.worldAABB = math.collapseAABB3();
        cfg.aabb = cfg.worldAABB; /// Hack for VBOInstancing layer
        cfg.solid = (cfg.primitive === "solid");
        streamMesh.origin = math.vec3(cfg.origin);
        streamMesh.streamLayer = this._getStreamLayer(cfg);
        streamMesh.portionId = streamMesh.streamLayer.createPortion(cfg);
        streamMesh.aabb = cfg.worldAABB;
        streamMesh.numPrimitives = cfg.numPrimitives;
        math.expandAABB3(this._aabb, streamMesh.aabb);
        this._meshes[cfg.id] = streamMesh;
        this._streamMeshList.push(streamMesh);
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
                        const geometry = cfg.geometry;
                        countIndices += geometry.positions ? geometry.positions.length : geometry.positionsCompressed.length;
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

    _getStreamLayer(cfg) {
        const origin = cfg.origin;
        const layerId = `${Math.round(origin[0])}.${Math.round(origin[1])}.${Math.round(origin[2])}`;
        let streamLayer = this._streamLayers[layerId];
        if (streamLayer) {
            if (!streamLayer.canCreatePortion(cfg)) {
                delete this._streamLayers[layerId];
                streamLayer = null;
            } else {
                return streamLayer;
            }
        }
        streamLayer = new StreamLayer(this, {layerIndex: 0, origin}); // layerIndex is set in #finalize()
        this._streamLayers[layerId] = streamLayer;
        this.streamLayerList.push(streamLayer);
        return streamLayer;
    }

    /**
     * Creates an {@link Entity} within this StreamModel, giving it one or more meshes previously created with {@link StreamModel#createMesh}.
     *
     * A mesh can only belong to one {@link Entity}, so you'll get an error if you try to reuse a mesh among multiple {@link Entity}s.
     *
     * @param {Object} cfg Entity configuration.
     * @param {String} cfg.id Optional ID for the new Entity. Must not clash with any existing components within the {@link Scene}.
     * @param {String[]} cfg.meshIds IDs of one or more meshes created previously with {@link StreamModel@createMesh}.
     * @param {Boolean} [cfg.isObject] Set ````true```` if the {@link Entity} represents an object, in which case it will be registered by {@link Entity#id} in {@link Scene#objects} and can also have a corresponding {@link MetaObject} with matching {@link MetaObject#id}, registered by that ID in {@link MetaScene#metaObjects}.
     * @param {Boolean} [cfg.visible=true] Indicates if the Entity is initially visible.
     * @param {Boolean} [cfg.culled=false] Indicates if the Entity is initially culled from view.
     * @param {Boolean} [cfg.pickable=true] Indicates if the Entity is initially pickable.
     * @param {Boolean} [cfg.clippable=true] Indicates if the Entity is initially clippable.
     * @param {Boolean} [cfg.collidable=true] Indicates if the Entity is initially included in boundary calculations.
     * @param {Boolean} [cfg.castsShadow=true] Indicates if the Entity initially casts shadows.
     * @param {Boolean} [cfg.receivesShadow=true]  Indicates if the Entity initially receives shadows.
     * @param {Boolean} [cfg.xrayed=false] Indicates if the Entity is initially xrayed. XRayed appearance is configured by {@link StreamModel#xrayMaterial}.
     * @param {Boolean} [cfg.highlighted=false] Indicates if the Entity is initially highlighted. Highlighted appearance is configured by {@link StreamModel#highlightMaterial}.
     * @param {Boolean} [cfg.selected=false] Indicates if the Entity is initially selected. Selected appearance is configured by {@link StreamModel#selectedMaterial}.
     * @param {Boolean} [cfg.edges=false] Indicates if the Entity's edges are initially emphasized. Edges appearance is configured by {@link StreamModel#edgeMaterial}.
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
        this._createEntity(cfg);
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
        const entity = new StreamEntity(
            this,
            cfg.isObject,
            cfg.id,
            meshes,
            cfg.flags,
            aabb,
            lodCullable); // Internally sets StreamEntity#parent to this StreamModel
        this._streamEntityList.push(entity);
        this._entities[cfg.id] = entity;
        this.numEntities++;
    }

    destroyEntity(entityId) {

    }
    
    /** @private */
    stateSortCompare(drawable1, drawable2) {
    return 0;
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
        renderFlags.numLayers = this.streamLayerList.length;
        renderFlags.numVisibleLayers = 0;
        for (let layerIndex = 0, len = this.streamLayerList.length; layerIndex < len; layerIndex++) {
            const streamLayer = this.streamLayerList[layerIndex];
            const layerVisible = this._getActiveSectionPlanesForLayer(streamLayer);
            if (layerVisible) {
                renderFlags.visibleLayers[renderFlags.numVisibleLayers++] = layerIndex;
            }
        }
    }

    _getActiveSectionPlanesForLayer(streamLayer) {
        const renderFlags = this.renderFlags;
        const sectionPlanes = this.scene._sectionPlanesState.sectionPlanes;
        const numSectionPlanes = sectionPlanes.length;
        const baseIndex = streamLayer.layerIndex * numSectionPlanes;
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
            this.streamLayerList[layerIndex].drawColorOpaque(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawColorTransparent(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawColorTransparent(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawDepth(frameCtx) { // Dedicated to SAO because it skips transparent objects
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawDepth(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawNormals(frameCtx) { // Dedicated to SAO because it skips transparent objects
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawNormals(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawSilhouetteXRayed(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawSilhouetteXRayed(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawSilhouetteHighlighted(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawSilhouetteHighlighted(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawSilhouetteSelected(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawSilhouetteSelected(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawEdgesColorOpaque(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawEdgesColorOpaque(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawEdgesColorTransparent(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawEdgesColorTransparent(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawEdgesXRayed(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawEdgesXRayed(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawEdgesHighlighted(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawEdgesHighlighted(renderFlags, frameCtx);
        }
    }

    /** @private */
    drawEdgesSelected(frameCtx) {
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawEdgesSelected(renderFlags, frameCtx);
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
            this.streamLayerList[layerIndex].drawOcclusion(renderFlags, frameCtx);
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
            this.streamLayerList[layerIndex].drawShadow(renderFlags, frameCtx);
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
            const streamLayer = this.streamLayerList[layerIndex];
            if (streamLayer.setPickMatrices) {
                streamLayer.setPickMatrices(pickViewMatrix, pickProjMatrix);
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
            this.streamLayerList[layerIndex].drawPickMesh(renderFlags, frameCtx);
        }
    }

    /**
     * Called by StreamMesh.drawPickDepths()
     * @private
     */
    drawPickDepths(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawPickDepths(renderFlags, frameCtx);
        }
    }

    /**
     * Called by StreamMesh.drawPickNormals()
     * @private
     */
    drawPickNormals(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            this.streamLayerList[layerIndex].drawPickNormals(renderFlags, frameCtx);
        }
    }

    /**
     * @private
     */
    drawSnapInitDepthBuf(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            const streamLayer = this.streamLayerList[layerIndex];
            if (streamLayer.drawSnapInitDepthBuf) {
                frameCtx.snapPickOrigin = [0, 0, 0];
                frameCtx.snapPickCoordinateScale = [1, 1, 1];
                frameCtx.snapPickLayerNumber++;
                streamLayer.drawSnapInitDepthBuf(renderFlags, frameCtx);
                frameCtx.snapPickLayerParams[frameCtx.snapPickLayerNumber] = {
                    origin: frameCtx.snapPickOrigin.slice(),
                    coordinateScale: frameCtx.snapPickCoordinateScale.slice(),
                };
            }
        }
    }

    /**
     * @private
     */
    drawSnapDepths(frameCtx) {
        if (this.numVisibleLayerPortions === 0) {
            return;
        }
        const renderFlags = this.renderFlags;
        for (let i = 0, len = renderFlags.visibleLayers.length; i < len; i++) {
            const layerIndex = renderFlags.visibleLayers[i];
            const streamLayer = this.streamLayerList[layerIndex];
            if (streamLayer.drawSnapDepths) {
                frameCtx.snapPickOrigin = [0, 0, 0];
                frameCtx.snapPickCoordinateScale = [1, 1, 1];
                frameCtx.snapPickLayerNumber++;
                streamLayer.drawSnapDepths(renderFlags, frameCtx);
                frameCtx.snapPickLayerParams[frameCtx.snapPickLayerNumber] = {
                    origin: frameCtx.snapPickOrigin.slice(),
                    coordinateScale: frameCtx.snapPickCoordinateScale.slice(),
                };
            }
        }
    }

    /**
     * Destroys this StreamModel.
     */
    destroy() {
        this._layers = {};
        this.scene.camera.off(this._onCameraViewMatrix);
        for (let i = 0, len = this.streamLayerList.length; i < len; i++) {
            this.streamLayerList[i].destroy();
        }
        this.streamLayerList = [];
        for (let i = 0, len = this._streamEntityList.length; i < len; i++) {
            this._streamEntityList[i]._destroy();
        }
        this._geometries = {};
        this._meshes = {};
        this._entities = {};
        this.scene._aabbDirty = true;
        super.destroy();
    }
}

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
