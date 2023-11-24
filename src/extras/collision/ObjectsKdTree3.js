import {math} from "../../viewer/scene/math/math.js";

const MAX_KD_TREE_DEPTH = 15; // Increase if greater precision needed
const kdTreeDimLength = new Float32Array(3);

/**
 * Automatically indexes a {@link Viewer}'s {@link Entity}s in a 3D k-d tree
 * to support fast collision detection with 3D World-space axis-aligned boundaries (AABBs) and frustums.
 *
 * See {@link MarqueePicker} for usage example.
 *
 * An ObjectsKdTree3 is configured with a Viewer, and will then automatically
 * keep itself populated with k-d nodes that contain the Viewer's Entitys.
 *
 * We can then traverse the k-d nodes, starting at {@link ObjectsKdTree3#root}, to find
 * the contained Entities.
 */
export class ObjectsKdTree3 {

    /**
     * Creates an ObjectsKdTree3.
     *
     * @param {*} cfg Configuration
     * @param {Viewer} cfg.viewer The Viewer that provides the {@link Entity}s in this ObjectsKdTree3.
     * @param {number} [cfg.maxTreeDepth=15] Optional maximum depth for the k-d tree.
     */
    constructor(cfg) {

        if (!cfg) {
            throw "Parameter expected: cfg";
        }

        if (!cfg.viewer) {
            throw "Parameter expected: cfg.viewer";
        }

        this.viewer = cfg.viewer;

        this._maxTreeDepth = cfg.maxTreeDepth || MAX_KD_TREE_DEPTH;
        this._root = null;
        this._needsRebuild = true;

        this._onModelLoaded = this.viewer.scene.on("modelLoaded", (modelId) => {
            this._needsRebuild = true;
        });

        this._onModelUnloaded = this.viewer.scene.on("modelUnloaded", (modelId) => {
            this._needsRebuild = true;
        });
    }

    /**
     * Gets the root ObjectsKdTree3 node.
     *
     * Each time this accessor is accessed, it will lazy-rebuild the ObjectsKdTree3
     * if {@link Entity}s have been created or removed in the {@link Viewer} since the last time it was accessed.
     */
    get root() {
        if (this._needsRebuild) {
            this._rebuild();
        }
        return this._root;
    }

    _rebuild() {
        const viewer = this.viewer;
        const scene = viewer.scene;
        const depth = 0;
        this._root = {
            aabb: scene.getAABB()
        };
        for (let objectId in scene.objects) {
            const entity = scene.objects[objectId];
            this._insertEntity(this._root, entity, depth + 1);
        }
        this._needsRebuild = false;
    }

    _insertEntity(node, entity, depth) {

        const entityAABB = entity.aabb;

        if (depth >= this._maxTreeDepth) {
            node.entities = node.entities || [];
            node.entities.push(entity);
            return;
        }
        if (node.left) {
            if (math.containsAABB3(node.left.aabb, entityAABB)) {
                this._insertEntity(node.left, entity, depth + 1);
                return;
            }
        }
        if (node.right) {
            if (math.containsAABB3(node.right.aabb, entityAABB)) {
                this._insertEntity(node.right, entity, depth + 1);
                return;
            }
        }
        const nodeAABB = node.aabb;
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
        if (!node.left) {
            const aabbLeft = nodeAABB.slice();
            aabbLeft[dim + 3] = ((nodeAABB[dim] + nodeAABB[dim + 3]) / 2.0);
            node.left = {
                aabb: aabbLeft
            };
            if (math.containsAABB3(aabbLeft, entityAABB)) {
                this._insertEntity(node.left, entity, depth + 1);
                return;
            }
        }
        if (!node.right) {
            const aabbRight = nodeAABB.slice();
            aabbRight[dim] = ((nodeAABB[dim] + nodeAABB[dim + 3]) / 2.0);
            node.right = {
                aabb: aabbRight
            };
            if (math.containsAABB3(aabbRight, entityAABB)) {
                this._insertEntity(node.right, entity, depth + 1);
                return;
            }
        }
        node.entities = node.entities || [];
        node.entities.push(entity);
    }

    /**
     * Destroys this ObjectsKdTree3.
     *
     * Does not destroy the {@link Viewer} given to the constructor of the ObjectsKdTree3.
     */
    destroy() {
        const scene = this.viewer.scene;
        scene.off(this._onModelLoaded);
        scene.off(this._onModelUnloaded);
        this._root = null;
        this._needsRebuild = true;
    }
}
