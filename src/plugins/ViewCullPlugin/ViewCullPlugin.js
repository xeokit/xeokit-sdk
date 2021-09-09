import {Plugin} from "../../viewer/Plugin.js";
import {math} from "../../viewer/scene/math/math.js";
import {Frustum, frustumIntersectsAABB3, setFrustum} from "../../viewer/scene/math/Frustum.js";
import {getObjectCullStates} from "../lib/culling/ObjectCullStates.js";

const MAX_KD_TREE_DEPTH = 8; // Increase if greater precision needed

const kdTreeDimLength = new Float32Array(3);

/**
 * {@link Viewer} plugin that performs view frustum culling to accelerate rendering performance.
 *
 * For each {@link Entity} that represents an object, ````ViewCullPlugin```` will automatically
 * set {@link Entity#culled}````false```` whenever it falls outside our field of view.
 *
 * When culled, an ````Entity```` is not processed by xeokit's renderer.
 *
 * Internally, ````ViewCullPlugin```` organizes {@link Entity}s in
 * a [bounding volume hierarchy](https://en.wikipedia.org/wiki/Bounding_volume_hierarchy), implemented as
 * a [kd-tree](https://en.wikipedia.org/wiki/K-d_tree).
 *
 * On each {@link Scene} "tick" event, ````ViewCullPlugin```` searches the kd-tree using a frustum generated from
 * the {@link Camera}, marking each ````Entity```` **culled** if it falls outside the frustum.
 *
 * Use ````ViewCullPlugin```` by simply adding it to your ````Viewer````:
 *
 * ````javascript
 * const viewer = new Viewer({
 *    canvasId: "myCanvas",
 *    transparent: true
 * });
 *
 * const viewCullPlugin = new ViewCullPlugin(viewer, {
 *    maxTreeDepth: 20
 * });
 *
 * const xktLoader = new XKTLoaderPlugin(viewer);
 *
 * const model = xktLoader.load({
 *      id: "myModel",
 *      src: "./models/xkt/OTCConferenceCenter.xkt"
 * });
 * ````
 */
class ViewCullPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="ViewCull"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Number} [cfg.maxTreeDepth=8] Maximum depth of the kd-tree.
     */
    constructor(viewer, cfg = {}) {

        super("ViewCull", viewer);

        this._objectCullStates = getObjectCullStates(viewer.scene); // Combines updates from multiple culling systems for its Scene's Entities

        this._maxTreeDepth = cfg.maxTreeDepth || MAX_KD_TREE_DEPTH;
        this._modelInfos = {};
        this._frustum = new Frustum();
        this._kdRoot = null;

        this._frustumDirty = false;
        this._kdTreeDirty = false;

        this._onViewMatrix = viewer.scene.camera.on("viewMatrix", () => {
            this._frustumDirty = true;
        });

        this._onProjMatrix = viewer.scene.camera.on("projMatMatrix", () => {
            this._frustumDirty = true;
        });

        this._onModelLoaded = viewer.scene.on("modelLoaded", (modelId) => {
            const model = this.viewer.scene.models[modelId];
            if (model) {
                this._addModel(model);
            }
        });

        this._onSceneTick = viewer.scene.on("tick", () => {
            this._doCull();
        });
    }

    /**
     * Sets whether view culling is enabled.
     *
     * @param {Boolean} enabled Whether to enable view culling.
     */
    set enabled(enabled) {
        this._enabled = enabled;
    }

    /**
     * Gets whether view culling is enabled.
     *
     * @retutns {Boolean} Whether view culling is enabled.
     */
    get enabled() {
        return this._enabled;
    }

    _addModel(model) {
        const modelInfo = {
            model: model,
            onDestroyed: model.on("destroyed", () => {
                this._removeModel(model);
            })
        };
        this._modelInfos[model.id] = modelInfo;
        this._kdTreeDirty = true;
    }

    _removeModel(model) {
        const modelInfo = this._modelInfos[model.id];
        if (modelInfo) {
            modelInfo.model.off(modelInfo.onDestroyed);
            delete this._modelInfos[model.id];
            this._kdTreeDirty = true;
        }
    }

    _doCull() {
        const cullDirty = (this._frustumDirty || this._kdTreeDirty);
        if (this._frustumDirty) {
            this._buildFrustum();
        }
        if (this._kdTreeDirty) {
            this._buildKDTree();
        }
        if (cullDirty) {
            const kdNode = this._kdRoot;
            if (kdNode) {
                this._visitKDNode(kdNode);
            }
        }
    }

    _buildFrustum() {
        const camera = this.viewer.scene.camera;
        setFrustum(this._frustum, camera.viewMatrix, camera.projMatrix);
        this._frustumDirty = false;
    }

    _buildKDTree() {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const depth = 0;
        if (this._kdRoot) {
            // TODO: uncull all objects with respect to this frustum culling plugin?

        }
        this._kdRoot = {
            aabb: scene.getAABB(),
            intersection: Frustum.INTERSECT
        };
        for (let objectIdx = 0, len = this._objectCullStates.numObjects; objectIdx < len; objectIdx++) {
            const entity = this._objectCullStates.objects[objectIdx];
            this._insertEntityIntoKDTree(this._kdRoot, entity, objectIdx, depth + 1);
        }
        this._kdTreeDirty = false;
    }

    _insertEntityIntoKDTree(kdNode, entity, objectIdx, depth) {

        const entityAABB = entity.aabb;

        if (depth >= this._maxTreeDepth) {
            kdNode.objects = kdNode.objects || [];
            kdNode.objects.push(objectIdx);
            math.expandAABB3(kdNode.aabb, entityAABB);
            return;
        }

        if (kdNode.left) {
            if (math.containsAABB3(kdNode.left.aabb, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.left, entity, objectIdx, depth + 1);
                return;
            }
        }

        if (kdNode.right) {
            if (math.containsAABB3(kdNode.right.aabb, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.right, entity, objectIdx, depth + 1);
                return;
            }
        }

        const nodeAABB = kdNode.aabb;

        kdTreeDimLength[0] = nodeAABB[3] - nodeAABB[0];
        kdTreeDimLength[1] = nodeAABB[4] - nodeAABB[1];
        kdTreeDimLength[2] = nodeAABB[5] - nodeAABB[2];

        let dim = 0;

        if (kdTreeDimLength[1] > kdTreeDimLength[dim]) {
            dim = 1;
        }

        if (kdTreeDimLength[2] > kdTreeDimLength[dim]) {
            dim = 2;
        }

        if (!kdNode.left) {
            const aabbLeft = nodeAABB.slice();
            aabbLeft[dim + 3] = ((nodeAABB[dim] + nodeAABB[dim + 3]) / 2.0);
            kdNode.left = {
                aabb: aabbLeft,
                intersection: Frustum.INTERSECT
            };
            if (math.containsAABB3(aabbLeft, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.left, entity, objectIdx, depth + 1);
                return;
            }
        }

        if (!kdNode.right) {
            const aabbRight = nodeAABB.slice();
            aabbRight[dim] = ((nodeAABB[dim] + nodeAABB[dim + 3]) / 2.0);
            kdNode.right = {
                aabb: aabbRight,
                intersection: Frustum.INTERSECT
            };
            if (math.containsAABB3(aabbRight, entityAABB)) {
                this._insertEntityIntoKDTree(kdNode.right, entity, objectIdx, depth + 1);
                return;
            }
        }

        kdNode.objects = kdNode.objects || [];
        kdNode.objects.push(objectIdx);

        math.expandAABB3(kdNode.aabb, entityAABB);
    }

    _visitKDNode(kdNode, intersects = Frustum.INTERSECT) {
        if (intersects !== Frustum.INTERSECT && kdNode.intersects === intersects) {
            return;
        }
        if (intersects === Frustum.INTERSECT) {
            intersects = frustumIntersectsAABB3(this._frustum, kdNode.aabb);
            kdNode.intersects = intersects;
        }
        const culled = (intersects === Frustum.OUTSIDE);
        const objects = kdNode.objects;
        if (objects && objects.length > 0) {
            for (let i = 0, len = objects.length; i < len; i++) {
                const objectIdx = objects[i];
                this._objectCullStates.setObjectViewCulled(objectIdx, culled);
            }
        }
        if (kdNode.left) {
            this._visitKDNode(kdNode.left, intersects);
        }
        if (kdNode.right) {
            this._visitKDNode(kdNode.right, intersects);
        }
    }

    /**
     * @private
     */
    send(name, value) {
    }

    /**
     * Destroys this ViewCullPlugin.
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

    _clear() {
        for (let modelId in this._modelInfos) {
            const modelInfo = this._modelInfos[modelId];
            modelInfo.model.off(modelInfo.onDestroyed);
        }
        this._modelInfos = {};
        this._kdRoot = null;
        this._kdTreeDirty = true;
    }
}

export {ViewCullPlugin}
