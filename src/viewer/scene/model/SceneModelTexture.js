/**
 * @private
 */
export class SceneModelTexture {

    constructor(cfg) {
        this.id = cfg.id;
        this.texture = cfg.texture;
    }

    destroy() {
        if (this.texture) {
            this.texture.destroy();
            this.texture = null;
        }
    }
}
