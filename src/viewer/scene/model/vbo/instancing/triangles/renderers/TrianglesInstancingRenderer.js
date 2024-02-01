import {VBORenderer} from "./../../../VBORenderer.js";

/**
 * @private
 */
export class TrianglesInstancingRenderer extends VBORenderer {
    constructor(scene, withSAO, {edges = false} = {}) {
        super(scene, withSAO, {instancing: true, edges});
    }

    _draw(drawCfg) {
        const {gl} = this._scene.canvas;

        const {
            state,
            frameCtx,
            incrementDrawState,
        } = drawCfg;

        if (this._edges) {
            gl.drawElementsInstanced(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0, state.numInstances);
        } else {
            gl.drawElementsInstanced(gl.TRIANGLES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);
            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        }
    }
}