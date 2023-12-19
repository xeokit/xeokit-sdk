import {VBOSceneModelTriangleInstancingRenderer} from "./VBOSceneModelTriangleInstancingRenderer";

/**
 * @private
 */


export class VBOSceneModelTriangleInstancingEdgesRenderer extends VBOSceneModelTriangleInstancingRenderer {
    constructor(scene, withSAO) {
        super(scene, withSAO, {instancing: true, edges: true});
    }
}
