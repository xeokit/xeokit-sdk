import {Plugin} from "../../viewer/Plugin.js";
import {math} from "../../viewer/scene/math/math.js";
import {getObjectCullStates} from "../lib/culling/ObjectCullStates.js";

/**
 * {@link Viewer} plugin that performs visibility culling to accelerate rendering of its {@link Scene}.
 *
 * ## Overview
 *
 *
 * ## Usage

 */
class DetailCullPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="DetailCull"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Boolean} [cfg.enabled=true]
     * @param {Number} [cfg.delay=150]
     * @param {Number} [cfg.cullSmallerThan=0]
     * @param {Number} [cfg.cullMoreTrianglesThan=0]
     * @param {String[]} [cfg.cullTypes]
     * @param {String[]} [cfg.dontCullTypes]
     */
    constructor(viewer, cfg = {}) {

        super("DetailCull", viewer);

        this._objectCullStates = getObjectCullStates(viewer.scene); // Combines updates from multiple culling systems for its Scene's Entities
        
        this._modelInfos = {};
        
        this._enabled = true;
        this._delay = cfg.delay || 150; // Milliseconds

        this._cullSmallerThan = 409;
        this._cullMoreTrianglesThan = 14;

        this._cullTypes = {};
        this._dontCullTypes = {};

        this._cullSet = [];
        this._cullSetLen = 0;
        this._cullSetDirty = true;

        let timer = this._delay;

        this._onModelLoaded = viewer.scene.on("modelLoaded", (modelId) => {
            const model = this.viewer.scene.models[modelId];
            if (model) {
                this._addModel(model);
            }
        });

        this._onViewMatrix = viewer.scene.camera.on("viewMatrix", () => {
            timer = this._delay;
            if (this._enabled && !this._culling) {
                this._setObjectsCulled(true);
            }
        });

        this._onProjMatrix = viewer.scene.camera.on("projMatMatrix", () => {
            timer = this._delay;
            if (this._enabled && !this._culling) {
                this._setObjectsCulled(true);
            }
        });

        this._onSceneTick = viewer.scene.on("tick", (tickEvent) => {
            if (!this._culling) {
                return;
            }
            timer -= tickEvent.deltaTime;
            if (timer <= 0) {
                if (this._culling) {
                    this._setObjectsCulled(false);
                }
            }
        });

        this.enabled = cfg.enabled;
        this.delay = cfg.delay;
        this.cullSmallerThan = cfg.cullSmallerThan;
        this.cullMoreTrianglesThan = cfg.cullMoreTrianglesThan;
        this.cullTypes = cfg.cullTypes;
        this.dontCullTypes = cfg.dontCullTypes;
    }

    _addModel(model) {
        const modelInfo = {
            model: model,
            onDestroyed: model.on("destroyed", () => {
                this._removeModel(model);
            })
        };
        this._modelInfos[model.id] = modelInfo;
        this._cullSetDirty = true;
    }

    _removeModel(model) {
        const modelInfo = this._modelInfos[model.id];
        if (modelInfo) {
            modelInfo.model.off(modelInfo.onDestroyed);
            delete this._modelInfos[model.id];
            this._cullSetDirty = true;
        }
    }

    /**
     * Sets whether detail culling is enabled.
     *
     * @param {Boolean} enabled Whether to enable detail culling.
     */
    set enabled(enabled) {
        this._enabled = enabled;
        this._cullSetDirty = true;
    }

    /**
     * Gets whether detail culling is enabled.
     *
     * @retutns {Boolean} Whether detail culling is enabled.
     */
    get enabled() {
        return this._enabled;
    }


    /**
     * Sets the milliseconds delay after the {@link Camera} stops moving before detail culling starts.
     *
     * Default is ````150```` milliseconds.
     *
     * @param {Boolean} delay The delay in milliseconds.
     */
    set delay(delay) {
        this._delay = (delay === undefined || delay === null) ? 150 : delay;
        this._cullSetDirty = true;
    }

    /**
     * Gets the milliseconds delay after the {@link Camera} stops moving before detail culling starts.
     *
     * Default is ````150```` milliseconds.
     *
     * @returns {Boolean} The delay in milliseconds.
     */
    get delay() {
        return this._delay;
    }

    /**
     * Sets the minimum object size for detail culling.
     *
     * @param {Number} value The minimum object size for detail culling.
     */
    set cullSmallerThan(value) {
        this._cullSmallerThan = (value !== undefined && value !== null) ? value : 0;
        this._cullSetDirty = true;
    }

    /**
     * Gets the minimum object size for detail culling.
     *
     * @returns {Number} The minimum object size for detail culling.
     */
    get cullSmallerThan() {
        return this._cullSmallerThan;
    }

    /**
     * Sets the maximum number of triangles for detail culling.
     *
     * @param {Number} value The minimum object size for detail culling.
     */
    set cullMoreTrianglesThan(value) {
        this._cullMoreTrianglesThan = (value !== undefined && value !== null) ? value : 0;
        this._cullSetDirty = true;
    }

    /**
     * Gets the minimum object size for detail culling.
     *
     * @returns {Number} The minimum object size for detail culling.
     */
    get cullMoreTrianglesThan() {
        return this._cullMoreTrianglesThan;
    }

    /**
     * Sets which object types to cull.
     *
     * @param {String[]} cullTypes List of types to cull.
     */
    set cullTypes(cullTypes) {
        this._cullTypes = cullTypes || [];
        this._cullTypesMap = {};
        this._cullTypes.map((type => {
            this._cullTypesMap[type] = true;
        }));
        this._cullSetDirty = true;
    }

    /**
     * Gets which object types to cull.
     *
     * @return {String[]} cullTypes List of types to cull.
     */
    get cullTypes() {
        return this._culltypes;
    }

    /**
     * Sets which object types to **not** cull.
     *
     * @param {Boolean} dontCullTypes List of types to not cull.
     */
    set dontCullTypes(dontCullTypes) {
        this._dontCullTypes = dontCullTypes || [];
        this._dontCullTypesMap = {};
        this._dontCullTypes.map((type => {
            this._dontCullTypesMap[type] = true;
        }));
        this._cullSetDirty = true;
    }

    /**
     * Gets which object types to **not** cull.
     *
     * @return {Boolean} List of types to not cull.
     */
    get dontCullTypes() {
        return this._dontCullTypes;
    }

    _setObjectsCulled(culled) {
        if (this._cullSetDirty) {
            this._buildCullObjects();
        }
        for (let i = 0, len = this._cullSet.length; i < len; i++) {
            const objectIdx = this._cullSet[i];
            this._objectCullStates.setObjectDetailCulled(objectIdx, culled);
        }
        this._culling = culled;
    }

    _buildCullObjects() {
        for (let i = 0; i < this._cullSetLen; i++) {
            const objectIdx = this._cullSet[i];
            const culled = false;
            this._objectCullStates.setObjectViewCulled(objectIdx, culled);
        }
        this._cullSetLen = 0;
        const cullMoreTrianglesThanEnabled = (this._cullMoreTrianglesThan !== 0);
        const cullSmallerThanEnabled  = (this._cullSmallerThan !== 0);
        for (let objectIdx = 0, len = this._objectCullStates.numObjects; objectIdx < len; objectIdx++) {
            const entity = this._objectCullStates.objects[objectIdx];
            const entityNumTriangles = entity.numTriangles;
            const entitySize = math.getAABB3Diag(entity.aabb);
            const needCull = (((!cullMoreTrianglesThanEnabled) || (this._cullMoreTrianglesThan <= entityNumTriangles)) && ((!cullSmallerThanEnabled) || (entitySize <= this._cullSmallerThan)));
            if (needCull) {
                this._cullSet[this._cullSetLen++] = objectIdx;
            }
        }
        this._cullSetDirty = false;
    }

    _clear() {
        for (let modelId in this._modelInfos) {
            const modelInfo = this._modelInfos[modelId];
            modelInfo.model.off(modelInfo.onDestroyed);
        }
        for (let i = 0; i < this._cullSetLen; i++) {
            const objectIdx = this._cullSet[i];
            const culled = false;
            this._objectCullStates.setObjectDetailCulled(objectIdx, culled);
        }
        this._modelInfos = {};
        this._cullSet = [];
        this._cullSetLen = 0;
    }

    /**
     * @private
     */
    send(name, value) {
    }

    /**
     * Destroys this DetailCullPlugin.
     */
    destroy() {

        super.destroy();

        this._clear();

        const scene = this.viewer.scene;
        const camera = scene.camera;

        scene.off(this._onModelLoaded);
        scene.off(this._onSceneTick);
        camera.off(this._onViewMatrix);
        camera.off(this._onProjMatrix);
    }
}

export {DetailCullPlugin}
