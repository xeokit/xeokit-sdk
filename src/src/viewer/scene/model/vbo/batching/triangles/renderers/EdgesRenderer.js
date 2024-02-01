import {TrianglesBatchingRenderer} from "./TrianglesBatchingRenderer.js";

/**
 * @private
 */


export class EdgesRenderer extends TrianglesBatchingRenderer {
    constructor(scene) {
        super(scene, false, {instancing: false, edges: true});
    }
}
