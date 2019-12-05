import {Program} from "../webgl/Program.js";

const quadVSSource = `
    attribute vec2 aPosition;
    varying vec2 vUV;
    void main() {
        vUV = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }`;

const quadPositions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

class PostProcess {

    constructor(postProcesses, fragmentSrc, options = {}) {

        this.postProcesses = postProcesses;
        this.scene = postProcesses.scene;

        this.gl = this.scene.canvas.gl;

        this.uniformIndices = {};
        this.uniformHandles = [];
        this.uniformValues = [];

        this.textureIndices = {};
        this.samplerNames = [];
        this.textures = [];

        this.positionBuffer = new ArrayBuffer(this.gl, this.gl.ARRAY_BUFFER, quadPositions, quadPositions.length, 2, this.gl.STATIC_DRAW);
        this.program = new Program(this.gl, {vertex: [quadVSSource], fragment: [fragmentSrc]});
        this.positionsAttribute = this.program.getAttribute("aPosition");

        this.uniformCount = 0;
        this.textureCount = 0;

        this.clear = !!options.clear;
    }

    setUniform(name, value) {
        let index = this.uniformIndices[name];
        if (index === undefined) {
            index = this.uniformIndices[name] = this.uniformCount++;
            this.uniformHandles.push(this.program.getUniform(name));
        }
        this.uniformValues[index] = value;
    }

    setTexture(name, texture) {
        let index = this.textureIndices[name];
        if (index === undefined) {
            index = this.textureIndices[name] = this.textureCount++;
            this.samplerNames.push(name);
        }
        this.textures[index] = texture;
    }

    draw(frameCtx) {
        if (frameCtx.VAO) {
            frameCtx.VAO.bindVertexArrayOES(null);
        }

        this.program.bind();
        this.positionsAttribute.bindArrayBuffer(this.positionBuffer);

        for (let i = 0; i < this.uniformCount; ++i) {
            this.uniformHandles[i].setValue(this.uniformValues[i]);
        }

        for (let i = 0; i < this.textureCount; ++i) {
            this.program.bindTexture(this.samplerNames[i], this.textures[i], i);
        }

        if (this.clear) {
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clearDepth(1);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        }

//        this.gl.CheckFramebufferStatus(this.positionBuffer);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    destroy() {
        this.positionBuffer.destroy();
        this.positionBuffer = null;
        this.program.destroy();
        this.program = null;
    }
}

export {PostProcess};