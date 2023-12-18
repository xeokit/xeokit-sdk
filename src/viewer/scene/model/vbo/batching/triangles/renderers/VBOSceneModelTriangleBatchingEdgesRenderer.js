/**
 * @private
 */
export class VBOSceneModelTriangleBatchingEdgesRenderer extends VBOBatchingTrianglesRenderer {
    constructor(scene, withSAO) {
        super(scene, withSAO, {instancing: false, edges: true});
    }
}
