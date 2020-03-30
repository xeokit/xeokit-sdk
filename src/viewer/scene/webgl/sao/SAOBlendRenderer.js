import {Program} from "./../Program.js";
import {ArrayBuf} from "./../ArrayBuf.js";

/**
 * SAO implementation inspired from previous SAO work in THREE.js by ludobaka / ludobaka.github.io and bhouston
 * @private
 */
class SAOBlendRenderer {

    constructor(scene) {

        this._scene = scene;

        // The program

        this._program = null;
        this._programError = false;

        // Variable locations

        this._uColorTexture = "uColorTexture";
        this._uOcclusionTexture = "uOcclusionTexture";
        this._aPosition = null;
        this._aUV = null;

        // VBOs

        this._uvBuf = null;
        this._positionsBuf = null;
        this._indicesBuf = null;

        this.init();
    }

    init() {

        const gl = this._scene.canvas.gl;

        this._program = new Program(gl, {

            vertex: [`#ifdef GL_FRAGMENT_PRECISION_HIGH
                    precision highp float;
                    precision highp int;
                    #else
                    precision mediump float;
                    precision mediump int;
                    #endif
                    
                    attribute   vec3 aPosition;
                    attribute   vec2 aUV;
            
                    varying     vec2 vUV;
            
                    void main () {
                       gl_Position = vec4(aPosition, 1.0);
                       vUV = aUV;
                    }`],

            fragment: [`#ifdef GL_FRAGMENT_PRECISION_HIGH
                    precision highp float;
                    precision highp int;
                    #else
                    precision mediump float;
                    precision mediump int;
                    #endif
                    
                    
                    const float packUpscale = 256. / 255.;
                    const float unpackDownScale = 255. / 256.; 

                    const vec3 packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );
                    const vec4 unPackFactors = unpackDownScale / vec4( packFactors, 1. );   

                    const float shiftRights = 1. / 256.;

                    vec4 packDepthToRGBA( const in float v ) {
                        vec4 r = vec4( fract( v * packFactors ), v );
                        r.yzw -= r.xyz * shiftRights; 
                        return r * packUpscale;
                    }
                
                    varying vec2        vUV;
                    
                    uniform sampler2D   uColorTexture;
                    uniform sampler2D   uOcclusionTexture;
                    
                    uniform float       uOcclusionScale;
                    uniform float       uOcclusionCutoff;
                    
                    float unpackRGBAToDepth( const in vec4 v ) {
                        return dot( v, unPackFactors );
                    }
                    
                    void main() {
                        vec4 color      = texture2D(uColorTexture, vUV);
                        float ambient   = smoothstep(uOcclusionCutoff, 1.0, unpackRGBAToDepth(texture2D(uOcclusionTexture, vUV))) * uOcclusionScale;
                        gl_FragColor    = vec4(color.rgb * (ambient), color.a);
                    }`]
        });

        if (this._program.errors) {
            console.error(this._program.errors.join("\n"));
            this._programError = true;
            return;
        }

        const positions = new Float32Array([1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0]);
        const uv = new Float32Array([1, 1, 0, 1, 0, 0, 1, 0]);
        const indices = new Uint8Array([0, 1, 2, 0, 2, 3]);

        this._positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, positions, positions.length, 3, gl.STATIC_DRAW);
        this._uvBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, uv, uv.length, 2, gl.STATIC_DRAW);
        this._indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, indices, indices.length, 1, gl.STATIC_DRAW);

        this._uColorTexture = "uColorTexture";
        this._uOcclusionTexture = "uOcclusionTexture";
        this._aPosition = this._program.getAttribute("aPosition");
        this._aUV = this._program.getAttribute("aUV");
        this._uOcclusionScale = this._program.getLocation("uOcclusionScale");
        this._uOcclusionCutoff = this._program.getLocation("uOcclusionCutoff");
    }

    render(colorTexture, occlusionTexture) {

        if (this._programError) {
            return;
        }

        const gl = this._scene.canvas.gl;
        const program = this._program;
        const viewportWidth = gl.drawingBufferWidth;
        const viewportHeight = gl.drawingBufferHeight;

        gl.viewport(0, 0, viewportWidth, viewportHeight);
        gl.clearColor(0, 0, 0, 1);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.frontFace(gl.CCW);
        gl.clear(gl.COLOR_BUFFER_BIT);

        program.bind();

        program.bindTexture(this._uColorTexture, colorTexture, 0);
        program.bindTexture(this._uOcclusionTexture, occlusionTexture, 2);

        gl.uniform1f(this._uOcclusionScale, 1.0);
        gl.uniform1f(this._uOcclusionCutoff, 0.01);

        this._aUV.bindArrayBuffer(this._uvBuf);
        this._aPosition.bindArrayBuffer(this._positionsBuf);
        this._indicesBuf.bind();

        gl.drawElements(gl.TRIANGLES, this._indicesBuf.numItems, this._indicesBuf.itemType, 0);
    }

    destroy() {
        this._program.destroy();
    }
}

export {SAOBlendRenderer};