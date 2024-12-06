import {Viewer} from "../../viewer";

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
    constructor(cfg: {
        viewer: Viewer;
        maxTreeDepth?: number;
    });

    /**
     * Gets the root ObjectsKdTree3 node.
     *
     * Each time this accessor is accessed, it will lazy-rebuild the ObjectsKdTree3
     * if {@link Entity}s have been created or removed in the {@link Viewer} since the last time it was accessed.
     */
    get root(): any;

    /**
     * Destroys this ObjectsKdTree3.
     *
     * Does not destroy the {@link Viewer} given to the constructor of the ObjectsKdTree3.
     */
    destroy(): void
}
