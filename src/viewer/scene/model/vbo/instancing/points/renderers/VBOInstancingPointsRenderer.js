import {VBORenderer} from "./../../../VBORenderer.js";

/**
 * @private
 */
export class VBOInstancingPointsRenderer extends VBORenderer {
    constructor(scene, withSAO) {
        super(scene, withSAO, {instancing: true});
    }

    _draw(drawCfg) {
        const {gl} = this._scene.canvas;

        const {
            state,
            frameCtx,
            incrementDrawState,
        } = drawCfg;

        gl.drawArraysInstanced(gl.POINTS, 0, state.positionsBuf.numItems, state.numInstances);

        if (incrementDrawState) {
            frameCtx.drawArrays++;
        }
    }
}
