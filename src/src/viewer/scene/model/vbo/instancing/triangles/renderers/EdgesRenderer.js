import {TrianglesInstancingRenderer} from "./TrianglesInstancingRenderer.js";

/**
 * @private
 */


export class EdgesRenderer extends TrianglesInstancingRenderer {
    constructor(scene, withSAO) {
        super(scene, withSAO, {instancing: true, edges: true});
    }
}
