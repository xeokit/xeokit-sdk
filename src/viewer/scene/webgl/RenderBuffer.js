import {Canvas2Image} from "../libs/canvas2image.js";

/**
 * @desc Represents a WebGL render buffer.
 * @private
 */
class RenderBuffer {

    constructor(canvas, gl, options) {
        options = options || {};
        this.gl = gl;
        this.allocated = false;
        this.canvas = canvas;
        this.buffer = null;
        this.bound = false;
        this.size = options.size;
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

    bind() {
        this._touch();
        if (this.bound) {
            return;
        }
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffer.framebuf);
        this.bound = true;
    }

    _touch() {

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
                gl.deleteTexture(this.buffer.texture);
                gl.deleteFramebuffer(this.buffer.framebuf);
                gl.deleteRenderbuffer(this.buffer.renderbuf);
            }
        }

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        const renderbuf = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuf);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

        const framebuf = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuf);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuf);

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
            texture: texture,
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

    read(pickX, pickY) {
        const x = pickX;
        const y = this.gl.drawingBufferHeight - pickY;
        const pix = new Uint8Array(4);
        const gl = this.gl;
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
        return pix;
    }

    readImage(params) {

        const gl = this.gl;
        const imageDataCache = this._getImageDataCache();
        const pixelData = imageDataCache.pixelData;
        const canvas = imageDataCache.canvas;
        const imageData = imageDataCache.imageData;
        const context = imageDataCache.context;

        gl.readPixels(0, 0, this.buffer.width, this.buffer.height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);

        imageData.data.set(pixelData);
        context.putImageData(imageData, 0, 0);

        const imageWidth = params.width || canvas.width;
        const imageHeight = params.height || canvas.height;
        const format = params.format || "jpeg";
        const flipy = true; // Account for WebGL texture flipping

        let image;

        switch (format) {
            case "jpeg":
                image = Canvas2Image.saveAsJPEG(canvas, true, imageWidth, imageHeight, flipy);
                break;
            case "png":
                image = Canvas2Image.saveAsPNG(canvas, true, imageWidth, imageHeight, flipy);
                break;
            case "bmp":
                image = Canvas2Image.saveAsBMP(canvas, true, imageWidth, imageHeight, flipy);
                break;
            default:
                console.error("Unsupported image format: '" + format + "' - supported types are 'jpeg', 'bmp' and 'png' - defaulting to 'jpeg'");
                image = Canvas2Image.saveAsJPEG(canvas, true, imageWidth, imageHeight, flipy);
        }

        return image.src;
    }

    _getImageDataCache() {

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
            canvas.width = bufferWidth;
            canvas.height = bufferHeight;

            const context = canvas.getContext('2d');
            const imageData = context.createImageData(bufferWidth, bufferHeight);

            imageDataCache = {
                pixelData: new Uint8Array(bufferWidth * bufferHeight * 4),
                canvas: canvas,
                context: context,
                imageData: imageData,
                width: bufferWidth,
                height: bufferHeight
            };

            this._imageDataCache = imageDataCache;
        }

        return imageDataCache;
    }

    unbind() {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.bound = false;
    }

    getTexture() {
        const self = this;
        return this._texture || (this._texture = {
            renderBuffer: this,
            bind: function (unit) {
                if (self.buffer && self.buffer.texture) {
                    self.gl.activeTexture(self.gl["TEXTURE" + unit]);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.buffer.texture);
                    return true;
                }
                return false;
            },
            unbind: function (unit) {
                if (self.buffer && self.buffer.texture) {
                    self.gl.activeTexture(self.gl["TEXTURE" + unit]);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, null);
                }
            }
        });
    }

    destroy() {
        if (this.allocated) {
            const gl = this.gl;
            gl.deleteTexture(this.buffer.texture);
            gl.deleteFramebuffer(this.buffer.framebuf);
            gl.deleteRenderbuffer(this.buffer.renderbuf);
            this.allocated = false;
            this.buffer = null;
            this.bound = false;
        }
        this._imageDataCache = null;
        this._texture = null;
    }
}

export {RenderBuffer};