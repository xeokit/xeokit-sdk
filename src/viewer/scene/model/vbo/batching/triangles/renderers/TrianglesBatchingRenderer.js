import {VBORenderer} from "./../../../VBORenderer.js";

/**
 * @private
 */
export class TrianglesBatchingRenderer extends VBORenderer {

    constructor(scene, withSAO, {edges = false, useAlphaCutoff = false, colorUniform = false} = {}) {
        super(scene, withSAO, {instancing: false, edges, useAlphaCutoff, colorUniform});
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
            gl.drawElements(gl.TRIANGLES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);

            if (incrementDrawState) {
                frameCtx.drawElements++;
            }
        }
    }
}
