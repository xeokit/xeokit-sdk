import {Component} from "../Component.js";
import {LODCullingManager} from "./LODCullingManager.js";

/**
 * Manages LOD culling for {@link SceneModel} implementations.
 */
export class LOD extends Component {

    /** @private */
    constructor(scene, cfg = {}) {

        super(scene, cfg);

        this._scene = scene;
        this._lodLevels = [2000, 600, 150, 80, 20];
        this._lodManagers = {};
        this._lodManagerList = [];

        this.enabled = cfg.enabled;
        this.targetFPS = cfg.targetFPS;

        this._init();
    }

    _init() {

        const MAX_NUM_TICKS = 4;
        const tickTimeArray = new Array(MAX_NUM_TICKS);

        let numTick = 0;
        let currentFPS = -1;
        let preRenderTime = Date.now();
        let deltaTime = 0;
        let sceneTick = 0;
        let lastTickCameraMoved = sceneTick;

        this._scene.on("rendering", () => { // Apply LOD-culling before rendering the scene
            if (currentFPS === -1) {
                return;
            }
            for (let i = 0, len = this._lodManagerList.length; i < len; i++) {
                this._lodManagerList[i].applyLodCulling(currentFPS);
            }
        });

        this._scene.on("rendered", () => {
            preRenderTime = Date.now();
            window.requestAnimationFrame(() => {
                numTick++;
                const newTime = Date.now();
                deltaTime = newTime - preRenderTime;
                preRenderTime = newTime;
                tickTimeArray[numTick % MAX_NUM_TICKS] = deltaTime;
                let sumTickTimes = 0;
                if (numTick > MAX_NUM_TICKS) {
                    for (let i = 0; i < MAX_NUM_TICKS; i++) {
                        sumTickTimes += tickTimeArray[i];
                    }
                    currentFPS = MAX_NUM_TICKS / sumTickTimes * 1000;
                }
            });
        });

        this._scene.camera.on("matrix", () => {
            lastTickCameraMoved = sceneTick;
        });

        this._scene.on("tick", () => {
            if ((sceneTick - lastTickCameraMoved) > 3) {
                for (let i = 0, len = this._lodManagerList.length; i < len; i++) {   // Call LOD-culling tasks
                    this._lodManagerList[i].resetLodCulling();
                }
            }
            sceneTick++;
        });
    }

    /**
     * Sets whether LOD is enabled for the {@link Scene}.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    set enabled(value) {
        value = !!value;
        if (this._enabled === value) {
            return;
        }
        this._enabled = value;
        this.glRedraw();
    }

    /**
     * Gets whether LOD is enabled for the {@link Scene}.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    get enabled() {
        return this._enabled;
    }

    /**
     * Sets the maximum area that LOD takes into account when checking for possible occlusion for each fragment.
     *
     * Default value is ````30.0````.
     *
     * @type {Number}
     */
    set targetFPS(value) {
        if (value === undefined || value === null) {
            value = 30.0;
        }
        if (this._targetFPS === value) {
            return;
        }
        this._targetFPS = value;
        this.glRedraw();
    }

    /**
     * Gets the maximum area that LOD takes into account when checking for possible occlusion for each fragment.
     *
     * Default value is ````30.0````.
     *
     * @type {Number}
     */
    get targetFPS() {
        return this._targetFPS;
    }

    /**
     * Called within SceneModel constructors
     * @private
     */
    getLODManager(sceneModel) {
        const lodManager = new LODCullingManager(this.scene, sceneModel, this._lodLevels, this._targetFPS);
        this._lodManagers[lodManager.id] = lodManager;
        this._lodManagerList = Object.values(this._lodManagers);
        return lodManager;
    }

    /**
     * Called within SceneModel destructors
     * @private
     */
    putLODManager(lodManager) {
        delete this._lodManagers[lodManager.id];
        this._lodManagerList = Object.values(this._lodManagers);
    }

    /**
     * Destroys this component.
     *
     * @private
     */
    destroy() {
        super.destroy();
    }
}
