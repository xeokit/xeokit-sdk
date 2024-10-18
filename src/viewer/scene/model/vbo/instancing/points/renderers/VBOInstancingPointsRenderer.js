import {VBORenderer} from "./../../../VBORenderer.js";

/**
 * @private
 */
export class VBOInstancingPointsRenderer extends VBORenderer {
    constructor(scene, withSAO, {hashPointsMaterial = false, colorUniform = false, incrementDrawState = false} = {}) {
        super(scene, withSAO, {instancing: true, hashPointsMaterial, colorUniform, incrementDrawState});
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
