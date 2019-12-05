import {PostProcess} from "./PostProcess.js";
import {PostProcessStage} from "./PostProcessStage.js";

/**
 * The post-processing effects pipeline.
 */
class PostProcesses {

    /**
     * @private
     * @param scene
     */
    constructor(scene) {

        this.scene = scene;

        this.postProcessPipelineOpaque = [];
        this.postProcessPipelineTransparent = [];
        this.postProcessPipelineFinal = [];

        this._postProcessTypes = {};
        this._postProcesses = {};
        this.framebuffers = {};

        this.mainFramebuffer = null;
        this.mainFramebufferParams = null;
        this.blitPostprocessType = null;
        this.blitPostprocess = null;

        this.postProcessInitialized = false;
    }

    /**
     * Initialize the post-processing effects pipeline.
     */
    init() {

        if (this.postProcessInitialized) {
            return;
        }

        this.mainFramebuffer = this.createFramebuffer("__MAIN", this.mainFramebufferParams);

        this.blitPostprocessType = this.createPostProcessType("__BLIT",
            `precision highp float;
             varying vec2 vUV;
             uniform sampler2D uTexture;
             void main() {
                gl_FragColor = texture2D(uTexture, vUV);
             }`);

        this.blitPostprocess = new PostProcessStage(this, {
            type: "__BLIT",
            textures: {
                uTexture: {
                    framebuffer: "__MAIN",
                    target: "color"
                }
            }
        });

        this.postProcessInitialized = true;
    }

    /**
     * @private
     */
    createFramebuffer(id, cfg={}) {
        if (this.framebuffers[id]) {
            this.framebuffers[id].destroy();
        }

        // TODO
        cfg.canvas = this._canvas;
        const frameBuffer = new Framebuffer(cfg);
        this.framebuffers[id] = frameBuffer;
        return frameBuffer;
    }

    /**
     * @private
     */
    destroyFramebuffer(id) {
        if (this.framebuffers[id]) {
            this.framebuffers[id].destroy();
        }
        delete this.framebuffers[id];
    }

    /**
     * @private
     */
    createPostProcessType(type, fragmentSrc, options) {
        const postProcess = new PostProcess(this, fragmentSrc, options);
        this._postProcessTypes[type] = postProcess;
        return postProcess;
    }

    enable () {
        if (!this.enabled) {
            this.enabled = true;
            this.parse(this.currentConfig);
        }
    }

    disable () {
        if (this.enabled) {
            this.destroyPipeline();
            this.enabled = false;
        }
    }

    parse (cfg) {
       
        this.destroyPipeline();

        this.currentConfig = cfg;

        if (!this.enabled) {
            return;
        }

        var pipeline = [];

        for (var i = 0, len = cfg.length; i < len; ++i) {
            var stage = cfg[i];
            var effect = this.effects[stage.effect];
            if (effect) {
                pipeline.push(stage.effect);
                this.effects[stage.effect].configure(stage);
            } else {
                this.error("Unknown postprocess effect: ", stage.effect);
            }
        }
        
        this.createPipeline(pipeline);
    };

    destroyPipeline() {
        // this.scene.postProcessOpaque(null);
        // this.scene.postProcessFinal(null);
    };

    updateProjection() {
        for (var effect in this.effects) {
            if (this.effects[effect].updateProjection) {
                this.effects[effect].updateProjection();
            }
        }
    };

    updateCanvas() {
        for (var effect in this.effects) {
            if (this.effects[effect].updateCanvas) {
                this.effects[effect].updateCanvas();
            }
        }
    };
    
    createPipeline(effects) {

        var ctx = {

            opaquePipeline: [],
            transparentPipeline: [],
            finalPipeline: [],
            pipelineFramebuffers: {
                opaque: {
                    read: "__MAIN",
                    write: "__XEOKIT_COLOR1"
                },
                transparent: {
                    read: "__MAIN",
                    write: "__XEOKIT_COLOR1"
                },
                final: {
                    read: "__MAIN",
                    write: "__XEOKIT_COLOR1"
                }
            },

            getIOFramebuffers: function(pipeline) {
                var fbs = this.pipelineFramebuffers[pipeline];
                var current = {
                    read: fbs.read,
                    write: fbs.write
                };
                if (fbs.write === "__XEOKIT_COLOR1") {
                    fbs.read = "__XEOKIT_COLOR1";
                    fbs.write = "__XEOKIT_COLOR2";
                } else {
                    fbs.read = "__XEOKIT_COLOR2";
                    fbs.write = "__XEOKIT_COLOR1";
                }
                return current;
            }
        };

        var finalStage;
        var textures;
        var readFromMain;
        var i, len;

        for (i = 0, len = effects.length; i < len; ++i) {
            var effect = this.effects[effects[i]];
            if (effect) {
                effect.addStage(ctx);
            } else {
                this.error("Unknown effect: " + effects[i]);
            }
        }

        if (ctx.opaquePipeline.length === 0 && ctx.transparentPipeline.length === 0 && ctx.finalPipeline.length === 0) {
            return;
        }

        if (!this.framebuffersInitialized) {
            this.scene.createFramebuffer("__XEOKIT_COLOR1", {
                depthAttachment: false
            });

            this.scene.createFramebuffer("__XEOKIT_COLOR2", {
                depthAttachment: false
            });

            this.framebuffersInitialized = true;
        }

        if (ctx.opaquePipeline.length > 0) {
            finalStage = ctx.opaquePipeline[ctx.opaquePipeline.length - 1];
            textures = finalStage.textures;
            readFromMain = false;
            for (var sampler in textures) {
                if (textures[sampler].framebuffer === "__MAIN") {
                    readFromMain = true;
                    break;
                }
            }

            if (readFromMain) {
                ctx.opaquePipeline.push({
                    type: "blit",
                    id: "blitOpaqueToMain",
                    textures: {
                        uColorBuffer: {
                            framebuffer: finalStage.framebuffer,
                            target: "color",
                        }
                    },
                    framebuffer: "__MAIN"
                });
            } else {
                finalStage.framebuffer = "__MAIN";
            }
            this.scene.postProcessOpaque(ctx.opaquePipeline);
        }

        if (ctx.finalPipeline.length > 0) {
            finalStage = ctx.finalPipeline[ctx.finalPipeline.length - 1];
            finalStage.framebuffer = false;
        } else {
            ctx.finalPipeline.push({
                type: "blit",
                id: "blitToScreen",
                textures: {
                    uColorBuffer: {
                        framebuffer: "__MAIN",
                        target: "color",
                    }
                },
                framebuffer: false
            });
        }
        this.finalize(ctx.finalPipeline);
    }

    /**
     * Finalize the post-processing effects pipeline.
     * 
     * @param cfg
     */
    finalize(cfg = []) {

        if (cfg.length > 0) {
            this.init();
        }

        for (let i = 0, len = this.postProcessPipelineFinal.length; i < len; ++i) {
            const postProcess = this.postProcessPipelineFinal[i];
            delete this._postProcesses[postProcess.id];
            postProcess.destroy();
        }

        this.postProcessPipelineFinal.length = 0;

        for (let i = 0, len = cfg.length; i < len; ++i) {
            const stage = cfg[i];
            const id = stage.id;

            this._postProcesses[id] = new PostProcessStage(this, stage);
            this.postProcessPipelineFinal.push(this._postProcesses[id]);
        }

        this.imageDirty = true;
    }
}

export {PostProcesses};