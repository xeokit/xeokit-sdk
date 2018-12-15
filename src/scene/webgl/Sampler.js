/**
 A **Sampler** is a low-level component that represents a WebGL Sampler.

 @class Sampler
 @module xeokit
 @submodule webgl
 @constructor
 @param gl {WebGLRenderingContext} The WebGL rendering context.
 */
class Sampler {

    constructor(gl, location) {
        this.bindTexture = function (texture, unit) {
            if (texture.bind(unit)) {
                gl.uniform1i(location, unit);
                return true;
            }
            return false;
        };
    }
}

export {Sampler};