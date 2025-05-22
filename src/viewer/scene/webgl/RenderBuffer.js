/**
 * @desc Represents a WebGL render buffer.
 * @private
 */
class RenderBuffer {

    constructor(canvas, gl, colorFormats, hasDepthTexture) {
        /** @type {WebGL2RenderingContext} */
        this.gl = gl;
        this.allocated = false;
        this.canvas = canvas;
        this.buffer = null;
        this.bound = false;
        this._colorFormats = colorFormats;
        this._hasDepthTexture = hasDepthTexture;
    }

    setSize(size) {
        this.size = size;
    }

    bind() {
        const width  = this.size[0];
        const height = this.size[1];

        if (this.buffer && ((this.buffer.width !== width) || (this.buffer.height !== height))) {
            this.buffer.cleanup();
            this.buffer = null;
        }

        if (! this.buffer) {
            this._allocateBuffer(width, height);
            this.bound = false;
        }

        if (! this.bound) {
            const gl = this.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.buffer.framebuf);
            this.bound = true;
        }
    }

    _allocateBuffer(width, height) {
        const internalformats = this._colorFormats || [];

        const gl = this.gl;

        const createTexture = () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return tex;
        };

        const colorTextures = ((internalformats.length > 0) ? internalformats : [ null ]).map(internalformat => {
            const tex = createTexture();
            if (internalformat) {
                gl.texStorage2D(gl.TEXTURE_2D, 1, internalformat, width, height);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            }
            return tex;
        });

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

        const depthTexture = this._hasDepthTexture && createTexture();
        if (depthTexture) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, width, height, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
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
            cleanup: () => {
                colorTextures.forEach(texture => gl.deleteTexture(texture));
                depthTexture && gl.deleteTexture(depthTexture);
                gl.deleteFramebuffer(framebuf);
                gl.deleteRenderbuffer(renderbuf);
            },
            framebuf: framebuf,
            width: width,
            height: height
        };

        this.colorTextures = colorTextures.map(tex => ({
            bind: function(unit) {
                gl.activeTexture(gl["TEXTURE" + unit]);
                gl.bindTexture(gl.TEXTURE_2D, tex);
                return true;
            }
        }));

        this.depthTexture = depthTexture && {
            bind: function(unit) {
                gl.activeTexture(gl["TEXTURE" + unit]);
                gl.bindTexture(gl.TEXTURE_2D, depthTexture);
                return true;
            }
        };
    }

    read(pickX, pickY, glFormat = null, glType = null, arrayType = Uint8Array, arrayMultiplier = 4, colorBufferIndex = 0) {
        const pix = new arrayType(arrayMultiplier);
        const gl = this.gl;
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + colorBufferIndex);
        gl.readPixels(pickX, this.buffer.height - pickY - 1, 1, 1, glFormat || gl.RGBA, glType || gl.UNSIGNED_BYTE, pix, 0);
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
        const width  = this.buffer.width;
        const height = this.buffer.height;
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
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
        const width  = this.buffer.width;
        const height = this.buffer.height;
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

    destroy() {
        if (this.allocated) {
            this.buffer.cleanup();
            this.allocated = false;
            this.buffer = null;
            this.bound = false;
        }
        this._imageDataCache = null;
        this.colorTextures = null;
        this.depthTexture = null;
    }
}

export {RenderBuffer};
