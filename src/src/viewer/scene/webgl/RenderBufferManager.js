import {RenderBuffer} from "./RenderBuffer.js";

/**
 * @private
 */
class RenderBufferManager {

    constructor(scene) {
        this.scene = scene;
        this._renderBuffersBasic = {};
        this._renderBuffersScaled = {};
    }

    getRenderBuffer(id, options) {
        const renderBuffers = (this.scene.canvas.resolutionScale === 1.0) ? this._renderBuffersBasic : this._renderBuffersScaled;
        let renderBuffer = renderBuffers[id];
        if (!renderBuffer) {
            renderBuffer = new RenderBuffer(this.scene.canvas.canvas, this.scene.canvas.gl, options);
            renderBuffers[id] = renderBuffer;
        }
        return renderBuffer;
    }

    destroy() {
        for (let id in this._renderBuffersBasic) {
            this._renderBuffersBasic[id].destroy();
        }
        for (let id in this._renderBuffersScaled) {
            this._renderBuffersScaled[id].destroy();
        }
    }
}

export {RenderBufferManager};