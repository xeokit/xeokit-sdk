class PostProcessStage {

    /**
     *
     * @param scene
     * @param cfg
     */
    constructor(scene, cfg = {}) {

        this.id = cfg.id;
        this.scene = scene;
        this.postProcess = display._postProcessTypes[cfg.type];
        this.uniforms = cfg.uniforms;
        this.framebuffer = null;

        if (cfg.framebuffer) {
            this.framebuffer = display.framebuffers[cfg.framebuffer];
        }

        this.textures = {};

        for (var sampler in cfg.textures) {
            var texture = cfg.textures[sampler];
            var framebufferId = texture.framebuffer;
            var target = texture.target;
            var data = texture.data;
            var gl = this.scene.canvas.gl;
            var framebuffer;

            if (framebufferId) {
                framebuffer = display.framebuffers[framebufferId];

                if (!framebuffer) {
                    console.error("Framebuffer not found: " + framebufferId);
                    continue;
                }

                if (target === "color") {
                    this.textures[sampler] = framebuffer.getColorTarget(texture.attachment || 0);
                } else if (target === "depth") {
                    this.textures[sampler] = framebuffer.getDepthTarget();
                } else {
                    console.error("Invalid target: " + target);
                    continue;
                }

            } else if (data) {

                // Values input as typed array

                var tex = gl.createTexture();
                var format = texture.format !== undefined ? gl[texture.format] : gl.RGBA;
                var type = texture.type !== undefined ? gl[texture.type] : gl.UNSIGNED_BYTE;
                var minFilter = texture.minFilter !== undefined ? gl[texture.minFilter] : gl.NEAREST;
                var magFilter = texture.magFilter !== undefined ? gl[texture.magFilter] : gl.NEAREST;
                var wrapS = texture.wrapS !== undefined ? gl[texture.wrapS] : gl.CLAMP_TO_EDGE;
                var wrapT = texture.wrapT !== undefined ? gl[texture.wrapT] : gl.CLAMP_TO_EDGE;

                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, format, texture.width, texture.height, 0, format, type, data);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);

                const canvas = scene.canvas;

                this.textures[sampler] = {
                    texture: tex,
                    gl: gl,
                    bind: (unit) => {
                        if (this.texture) {
                            canvas.gl.activeTexture(canvas.gl.TEXTURE0 + unit);
                            canvas.gl.bindTexture(canvas.gl.TEXTURE_2D, this.texture);
                            return true;
                        }
                        return false;
                    },
                    unbind: (unit) => {
                        if (this.texture) {
                            canvas.gl.activeTexture(canvas.gl.TEXTURE0 + unit);
                            canvas.gl.bindTexture(canvas.gl.TEXTURE_2D, null);
                        }
                    },
                    destroy: () => {
                        if (this.texture) {
                            canvas.gl.deleteTexture(this.texture);
                            this.texture = null;
                        }
                    }
                };

                gl.bindTexture(gl.TEXTURE_2D, null);
            }
        }
    }

    setUniform(name, value) {
        this.uniforms[name] = value;
        this.display.imageDirty = true;
    }

    draw(frameCtx) {
        for (var uniform in this.uniforms) {
            this.postProcess.setUniform(uniform, this.uniforms[uniform]);
        }

        for (var texture in this.textures) {
            this.postProcess.setTexture(texture, this.textures[texture]);
        }

        this.postProcess.draw(frameCtx);
    }

    destroy() {
        for (var texture in this.textures) {
            if (typeof this.textures[texture].destroy === "function") {
                this.textures[texture].destroy();
            }
            this.textures[texture] = null;
        }
    }
}

export {PostProcessStage};