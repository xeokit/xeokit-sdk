import {VBORenderer} from "../../../VBORenderer.js";

/**
 * @private
 */


export class VBOSceneModelLineBatchingRenderer extends VBORenderer {
    _draw(drawCfg) {
        const {gl} = this._scene.canvas;

        const {
            state,
            frameCtx,
            incrementDrawState
        } = drawCfg;

        gl.drawElements(gl.LINES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);

        if (incrementDrawState) {
            frameCtx.drawElements++;
        }
    }
}