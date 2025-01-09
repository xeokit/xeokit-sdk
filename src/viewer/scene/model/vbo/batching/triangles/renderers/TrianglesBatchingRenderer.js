import {VBORenderer} from "./../../../VBORenderer.js";

/**
 * @private
 */
export class TrianglesBatchingRenderer extends VBORenderer {

    constructor(scene, withSAO, {edges = false, useAlphaCutoff = false} = {}) {
        super(scene, withSAO, {instancing: false, edges, useAlphaCutoff});
    }

    _draw(drawCfg) {
        const {gl} = this._scene.canvas;

        const {
            state,
            frameCtx,
            incrementDrawState
        } = drawCfg;

        if (this._edges) {
            if (state.edgeIndicesBuf) {
                gl.drawElements(gl.LINES, state.edgeIndicesBuf.numItems, state.edgeIndicesBuf.itemType, 0);
            }
        } else {
            const count = frameCtx.pickElementsCount || state.indicesBuf.numItems;
            const offset = frameCtx.pickElementsOffset ? frameCtx.pickElementsOffset * state.indicesBuf.itemByteSize : 0;
            gl.drawElements(gl.TRIANGLES, count, state.indicesBuf.itemType, offset);

            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        }
    }
}
