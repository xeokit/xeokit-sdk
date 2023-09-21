import {Component} from "../Component";
import {VFCManager} from "./VFCManager";

/**
 * Manages view frustum culling (VFC) for {@link SceneModel} implementations.
 */
export class VFC extends Component {

    /** @private */
    constructor(scene, cfg = {}) {
        super(scene, cfg);
        this._scene = scene;
        this._vfcManagers = {};
        this._vfcManagerList = [];
        this.enabled = cfg.enabled;
        this._init();
    }

    _init() {
        this._scene.on("rendering", () => { // Apply VFC-culling before rendering the scene
            for (let i = 0, len = this._vfcManagerList.length; i < len; i++) {
                this._vfcManagerList[i].applyViewFrustumCulling();
            }
        });
    }

    /**
     * Sets whether view frustum culling (VFC) is enabled for the {@link Scene}.
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
     * Gets whether view frustum culling (VFC) is enabled for the {@link Scene}.
     *
     * Default value is ````false````.
     *
     * @type {Boolean}
     */
    get enabled() {
        return this._enabled;
    }

    /**
     * Called within SceneModel constructors
     * @private
     */
    getVFCManager(sceneModel) {
        const vfcManager = new VFCManager(this.scene, sceneModel);
        this._vfcManagers[vfcManager.id] = vfcManager;
        this._vfcManagerList = Object.values(this._vfcManagers);
        return vfcManager;
    }

    /**
     * Called within SceneModel destructors
     * @private
     */
    putVFCManager(vfcManager) {
        delete this._vfcManagers[vfcManager.id];
        this._vfcManagerList = Object.values(this._vfcManagers);
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
