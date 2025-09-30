import {VBORenderer} from "./../../../VBORenderer.js";

/**
 * @private
 */
export class VBOInstancingLinesRenderer extends VBORenderer {
    constructor(scene, withSAO, {colorUniform = false, incrementDrawState = false} = {}) {
        super(scene, withSAO, {instancing: true, colorUniform, incrementDrawState});
    }

    _draw(drawCfg) {
        const {gl} = this._scene.canvas;

        const {
            state,
            frameCtx,
            incrementDrawState,
        } = drawCfg;

        gl.drawElementsInstanced(gl.LINES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0, state.numInstances);

        if (incrementDrawState) {
            frameCtx.drawElements++;
        }
    }
}