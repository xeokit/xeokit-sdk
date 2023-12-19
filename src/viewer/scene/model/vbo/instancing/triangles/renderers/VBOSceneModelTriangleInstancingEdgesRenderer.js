import {VBOSceneModelTriangleInstancingRenderer} from "./VBOSceneModelTriangleInstancingRenderer.js";

/**
 * @private
 */


export class VBOSceneModelTriangleInstancingEdgesRenderer extends VBOSceneModelTriangleInstancingRenderer {
    constructor(scene, withSAO) {
        super(scene, withSAO, {instancing: true, edges: true});
    }
}
