/**
 * @desc Represents a WebGL render buffer.
 * @private
 */
class RenderBuffer {

    constructor(canvas, gl, options) {
        options = options || {};
        /** @type {WebGL2RenderingContext} */
        this.gl = gl;
        this.allocated = false;
        this.canvas = canvas;
        this.buffer = null;
        this.bound = false;
        this.size = options.size;
        this._hasDepthTexture = !!options.depthTexture;
    }

    setSize(size) {
        this.size = size;
    }

    webglContextRestored(gl) {
        this.gl = gl;
        this.buffer = null;
        this.allocated = false;
        this.bound = false;
    }

    bind(...internalformats) {
        this._touch(...internalformats);
        if (this.bound) {
            return;
        }
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffer.framebuf);
        this.bound = true;
    }

    /**
     * Create and specify a WebGL texture image.
     *
     * @param { number } width 
     * @param { number } height 
     * @param { GLenum } [internalformat=null] 
     *
     * @returns { WebGLTexture }
     */
    createTexture(width, height, internalformat = null) {
        const gl = this.gl;

        const colorTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, colorTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        if (internalformat) {
            gl.texStorage2D(gl.TEXTURE_2D, 1, internalformat, width, height);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }

        return colorTexture;
    }

    /**
     *
     * @param {number[]} [internalformats=[]]
     * @returns
     */
    _touch(...internalformats) {

        let width;
        let height;
        const gl = this.gl;

        if (this.size) {
            width = this.size[0];
            height = this.size[1];

        } else {
            width = gl.drawingBufferWidth;
            height = gl.drawingBufferHeight;
        }

        if (this.buffer) {

            if (this.buffer.width === width && this.buffer.height === height) {
                return;

            } else {
                this.buffer.textures.forEach(texture => gl.deleteTexture(texture));
                gl.deleteFramebuffer(this.buffer.framebuf);
                gl.deleteRenderbuffer(this.buffer.renderbuf);
            }
        }

        const colorTextures = [];
        if (internalformats.length > 0) {
            colorTextures.push(...internalformats.map(internalformat => this.createTexture(width, height, internalformat)));
        } else {
            colorTextures.push(this.createTexture(width, height));
        }

        let depthTexture;

        if (this._hasDepthTexture) {
            depthTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, depthTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, width, height, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
        }

        const renderbuf = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuf);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT32F, width, height);

        const framebuf = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuf);
        for (let i = 0; i < colorTextures.length; i++) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, colorTextures[i], 0);
        }
        if (internalformats.length > 0) {
            gl.drawBuffers(colorTextures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
        }

        if (this._hasDepthTexture) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
        } else {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuf);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Verify framebuffer is OK

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuf);
        if (!gl.isFramebuffer(framebuf)) {
            throw "Invalid framebuffer";
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

        switch (status) {

            case gl.FRAMEBUFFER_COMPLETE:
                break;

            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                throw "Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT";

            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                throw "Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";

            case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                throw "Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS";

            case gl.FRAMEBUFFER_UNSUPPORTED:
                throw "Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED";

            default:
                throw "Incomplete framebuffer: " + status;
        }

        this.buffer = {
            framebuf: framebuf,
            renderbuf: renderbuf,
            texture: colorTextures[0],
            textures: colorTextures,
            depthTexture: depthTexture,
            width: width,
            height: height
        };

        this.bound = false;
    }

    clear() {
        if (!this.bound) {
            throw "Render buffer not bound";
        }
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    read(pickX, pickY, glFormat = null, glType = null, arrayType = Uint8Array, arrayMultiplier = 4, colorBufferIndex = 0) {
        const x = pickX;
        const y = this.buffer.height ? (this.buffer.height - pickY - 1) : (this.gl.drawingBufferHeight - pickY);
        const pix = new arrayType(arrayMultiplier);
        const gl = this.gl;
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + colorBufferIndex);
        gl.readPixels(x, y, 1, 1, glFormat || gl.RGBA, glType || gl.UNSIGNED_BYTE, pix, 0);
        return pix;
    }

    readArray(glFormat = null, glType = null, arrayType = Uint8Array, arrayMultiplier = 4, colorBufferIndex = 0) {
        const pix = new arrayType(this.buffer.width*this.buffer.height * arrayMultiplier);
        const gl = this.gl;
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + colorBufferIndex);
        gl.readPixels(0, 0, this.buffer.width, this.buffer.height, glFormat || gl.RGBA, glType || gl.UNSIGNED_BYTE, pix, 0);
        return pix;
    }

    /**
     * Returns an HTMLCanvas containing the contents of the RenderBuffer as an image.
     *
     * - The HTMLCanvas has a CanvasRenderingContext2D.
     * - Expects the caller to draw more things on the HTMLCanvas (annotations etc).
     *
     * @returns {HTMLCanvasElement}
     */
    readImageAsCanvas() {
        const gl = this.gl;
        const imageDataCache = this._getImageDataCache();
        const pixelData = imageDataCache.pixelData;
        const canvas = imageDataCache.canvas;
        const imageData = imageDataCache.imageData;
        const context = imageDataCache.context;
        gl.readPixels(0, 0, this.buffer.width, this.buffer.height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
        const width = this.buffer.width;
        const height = this.buffer.height;
        const halfHeight = height / 2 | 0;  // the | 0 keeps the result an int
        const bytesPerRow = width * 4;
        const temp = new Uint8Array(width * 4);
        for (let y = 0; y < halfHeight; ++y) {
            const topOffset = y * bytesPerRow;
            const bottomOffset = (height - y - 1) * bytesPerRow;
            temp.set(pixelData.subarray(topOffset, topOffset + bytesPerRow));
            pixelData.copyWithin(topOffset, bottomOffset, bottomOffset + bytesPerRow);
            pixelData.set(temp, bottomOffset);
        }
        imageData.data.set(pixelData);
        context.putImageData(imageData, 0, 0);
        return canvas;
    }

    readImage(params) {
        const gl = this.gl;
        const imageDataCache = this._getImageDataCache();
        const pixelData = imageDataCache.pixelData;
        const canvas = imageDataCache.canvas;
        const imageData = imageDataCache.imageData;
        const context = imageDataCache.context;
        const { width, height } = this.buffer;
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
        imageData.data.set(pixelData);
        context.putImageData(imageData, 0, 0);

        // flip Y
        context.save();
        context.globalCompositeOperation = 'copy';
        context.scale(1, -1);
        context.drawImage(canvas, 0, -height, width, height);
        context.restore();

        let format = params.format || "png";
        if (format !== "jpeg" && format !== "png" && format !== "bmp") {
            console.error("Unsupported image format: '" + format + "' - supported types are 'jpeg', 'bmp' and 'png' - defaulting to 'png'");
            format = "png";
        }
        return canvas.toDataURL(`image/${format}`);
    }

    _getImageDataCache(type = Uint8Array, multiplier = 4) {

        const bufferWidth = this.buffer.width;
        const bufferHeight = this.buffer.height;

        let imageDataCache = this._imageDataCache;

        if (imageDataCache) {
            if (imageDataCache.width !== bufferWidth || imageDataCache.height !== bufferHeight) {
                this._imageDataCache = null;
                imageDataCache = null;
            }
        }

        if (!imageDataCache) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = bufferWidth;
            canvas.height = bufferHeight;
            imageDataCache = {
                pixelData: new type(bufferWidth * bufferHeight * multiplier),
                canvas: canvas,
                context: context,
                imageData: context.createImageData(bufferWidth, bufferHeight),
                width: bufferWidth,
                height: bufferHeight
            };

            this._imageDataCache = imageDataCache;
        }
        imageDataCache.context.resetTransform(); // Prevents strange scale-accumulation effect with html2canvas
        return imageDataCache;
    }

    unbind() {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.bound = false;
    }

    getTexture(index = 0) {
        const self = this;
        return this._texture || (this._texture = {
            renderBuffer: this,
            bind: function (unit) {
                if (self.buffer && self.buffer.textures[index]) {
                    self.gl.activeTexture(self.gl["TEXTURE" + unit]);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.buffer.textures[index]);
                    return true;
                }
                return false;
            },
            unbind: function (unit) {
                if (self.buffer && self.buffer.textures[index]) {
                    self.gl.activeTexture(self.gl["TEXTURE" + unit]);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, null);
                }
            }
        });
    }

    hasDepthTexture() {
        return this._hasDepthTexture;
    }

    getDepthTexture() {
        if (!this._hasDepthTexture) {
            return null;
        }
        const self = this;
        return this._depthTexture || (this._dethTexture = {
            renderBuffer: this,
            bind: function (unit) {
                if (self.buffer && self.buffer.depthTexture) {
                    self.gl.activeTexture(self.gl["TEXTURE" + unit]);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.buffer.depthTexture);
                    return true;
                }
                return false;
            },
            unbind: function (unit) {
                if (self.buffer && self.buffer.depthTexture) {
                    self.gl.activeTexture(self.gl["TEXTURE" + unit]);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, null);
                }
            }
        });
    }

    destroy() {
        if (this.allocated) {
            const gl = this.gl;
            this.buffer.textures.forEach(texture => gl.deleteTexture(texture));
            gl.deleteTexture(this.buffer.depthTexture);
            gl.deleteFramebuffer(this.buffer.framebuf);
            gl.deleteRenderbuffer(this.buffer.renderbuf);
            this.allocated = false;
            this.buffer = null;
            this.bound = false;
        }
        this._imageDataCache = null;
        this._texture = null;
        this._depthTexture = null;
    }
}

export {RenderBuffer};
