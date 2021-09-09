import {Program} from "./../Program.js";
import {ArrayBuf} from "./../ArrayBuf.js";
import {math} from "../../math/math.js";
import {WEBGL_INFO} from "../../webglInfo.js";

const blurStdDev = 4;
const blurDepthCutoff = 0.01;
const KERNEL_RADIUS = 16;

const sampleOffsetsVert = new Float32Array(createSampleOffsets(KERNEL_RADIUS + 1, [0, 1]));
const sampleOffsetsHor = new Float32Array(createSampleOffsets(KERNEL_RADIUS + 1, [1, 0]));
const sampleWeights = new Float32Array(createSampleWeights(KERNEL_RADIUS + 1, blurStdDev));

const tempVec2a = new Float32Array(2);

/**
 * SAO implementation inspired from previous SAO work in THREE.js by ludobaka / ludobaka.github.io and bhouston
 * @private
 */
class SAODepthLimitedBlurRenderer {

    constructor(scene) {

        this._scene = scene;

        // The program

        this._program = null;
        this._programError = false;

        // Variable locations

        this._aPosition = null;
        this._aUV = null;

        this._uDepthTexture = "uDepthTexture";
        this._uOcclusionTexture = "uOcclusionTexture";

        this._uViewport = null;
        this._uCameraNear = null;
        this._uCameraFar = null;
        this._uCameraProjectionMatrix = null;
        this._uCameraInverseProjectionMatrix = null;

        this._uScale = null;
        this._uIntensity = null;
        this._uBias = null;
        this._uKernelRadius = null;
        this._uMinResolution = null;

        // VBOs

        this._uvBuf = null;
        this._positionsBuf = null;
        this._indicesBuf = null;

        this.init();
    }

    init() {

        // Create program & VBOs, locate attributes and uniforms

        const gl = this._scene.canvas.gl;

        this._program = new Program(gl, {

            vertex: [
                `precision highp float;
                precision highp int;
                    
                attribute vec3 aPosition;
                attribute vec2 aUV;
                uniform vec2 uViewport;
                varying vec2 vUV;
                varying vec2 vInvSize;
                void main () {
                    vUV = aUV;
                    vInvSize = 1.0 / uViewport;
                    gl_Position = vec4(aPosition, 1.0);
                }`],

            fragment: [
                `precision highp float;
                precision highp int;
                    
                #define PI 3.14159265359
                #define PI2 6.28318530718
                #define EPSILON 1e-6

                #define KERNEL_RADIUS ${KERNEL_RADIUS}

                varying vec2        vUV;
                varying vec2        vInvSize;
            
                uniform sampler2D   uDepthTexture;
                uniform sampler2D   uOcclusionTexture;              
               
                uniform float       uCameraNear;
                uniform float       uCameraFar;               
                uniform float       uDepthCutoff;

                uniform vec2        uSampleOffsets[ KERNEL_RADIUS + 1 ];
                uniform float       uSampleWeights[ KERNEL_RADIUS + 1 ];

                const float         unpackDownscale = 255. / 256.; 

                const vec3          packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );
                const vec4          unpackFactors = unpackDownscale / vec4( packFactors, 1. );   

                const float packUpscale = 256. / 255.;
       
                const float shiftRights = 1. / 256.;
                
                float unpackRGBAToFloat( const in vec4 v ) {
                    return dot( floor( v * 255.0 + 0.5 ) / 255.0, unpackFactors );
                }               

                vec4 packFloatToRGBA( const in float v ) {
                    vec4 r = vec4( fract( v * packFactors ), v );
                    r.yzw -= r.xyz * shiftRights; 
                    return r * packUpscale;
                }

                float viewZToOrthographicDepth( const in float viewZ) {
                    return ( viewZ + uCameraNear ) / ( uCameraNear - uCameraFar );
                }
              
                float orthographicDepthToViewZ( const in float linearClipZ) {
                    return linearClipZ * ( uCameraNear - uCameraFar ) - uCameraNear;
                }

                float viewZToPerspectiveDepth( const in float viewZ) {
                    return (( uCameraNear + viewZ ) * uCameraFar ) / (( uCameraFar - uCameraNear ) * viewZ );
                }
                
                float perspectiveDepthToViewZ( const in float invClipZ) {
                    return ( uCameraNear * uCameraFar ) / ( ( uCameraFar - uCameraNear ) * invClipZ - uCameraFar );
                }

                float getDepth( const in vec2 screenPosition ) {`
                + (WEBGL_INFO.SUPPORTED_EXTENSIONS["WEBGL_depth_texture"] ? `return texture2D(uDepthTexture, screenPosition).r;` : `return unpackRGBAToFloat(texture2D( uDepthTexture, screenPosition));`) +
                `}

                float getViewZ( const in float depth ) {
                     return perspectiveDepthToViewZ( depth );
                }

                void main() {
                
                    float depth = getDepth( vUV );
                    if( depth >= ( 1.0 - EPSILON ) ) {
                        discard;
                    }

                    float centerViewZ = -getViewZ( depth );
                    bool rBreak = false;
                    bool lBreak = false;

                    float weightSum = uSampleWeights[0];
                    float occlusionSum = unpackRGBAToFloat(texture2D( uOcclusionTexture, vUV )) * weightSum;

                    for( int i = 1; i <= KERNEL_RADIUS; i ++ ) {

                        float sampleWeight = uSampleWeights[i];
                        vec2 sampleUVOffset = uSampleOffsets[i] * vInvSize;

                        vec2 sampleUV = vUV + sampleUVOffset;
                        float viewZ = -getViewZ( getDepth( sampleUV ) );

                        if( abs( viewZ - centerViewZ ) > uDepthCutoff ) {
                            rBreak = true;
                        }

                        if( ! rBreak ) {
                            occlusionSum += unpackRGBAToFloat(texture2D( uOcclusionTexture, sampleUV )) * sampleWeight;
                            weightSum += sampleWeight;
                        }

                        sampleUV = vUV - sampleUVOffset;
                        viewZ = -getViewZ( getDepth( sampleUV ) );

                        if( abs( viewZ - centerViewZ ) > uDepthCutoff ) {
                            lBreak = true;
                        }

                        if( ! lBreak ) {
                            occlusionSum += unpackRGBAToFloat(texture2D( uOcclusionTexture, sampleUV )) * sampleWeight;
                            weightSum += sampleWeight;
                        }
                    }

                    gl_FragColor = packFloatToRGBA(occlusionSum / weightSum);
                }`]
        });

        if (this._program.errors) {
            console.error(this._program.errors.join("\n"));
            this._programError = true;
            return;
        }

        const uv = new Float32Array([1, 1, 0, 1, 0, 0, 1, 0]);
        const positions = new Float32Array([1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0]);
        const indices = new Uint8Array([0, 1, 2, 0, 2, 3]);

        this._positionsBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, positions, positions.length, 3, gl.STATIC_DRAW);
        this._uvBuf = new ArrayBuf(gl, gl.ARRAY_BUFFER, uv, uv.length, 2, gl.STATIC_DRAW);
        this._indicesBuf = new ArrayBuf(gl, gl.ELEMENT_ARRAY_BUFFER, indices, indices.length, 1, gl.STATIC_DRAW);

        this._program.bind();

        this._uViewport = this._program.getLocation("uViewport");

        this._uCameraNear = this._program.getLocation("uCameraNear");
        this._uCameraFar = this._program.getLocation("uCameraFar");

        this._uDepthCutoff = this._program.getLocation("uDepthCutoff");

        this._uSampleOffsets = gl.getUniformLocation(this._program.handle, "uSampleOffsets");
        this._uSampleWeights = gl.getUniformLocation(this._program.handle, "uSampleWeights");

        this._aPosition = this._program.getAttribute("aPosition");
        this._aUV = this._program.getAttribute("aUV");
    }

    render(depthRenderBuffer, occlusionRenderBuffer, direction) {

        if (this._programError) {
            return;
        }

        if (!this._getInverseProjectMat) { // HACK: scene.camera not defined until render time
            this._getInverseProjectMat = (() => {
                let projMatDirty = true;
                this._scene.camera.on("projMatrix", function () {
                    projMatDirty = true;
                });
                const inverseProjectMat = math.mat4();
                return () => {
                    if (projMatDirty) {
                        math.inverseMat4(scene.camera.projMatrix, inverseProjectMat);
                    }
                    return inverseProjectMat;
                }
            })();
        }

        const gl = this._scene.canvas.gl;
        const program = this._program;
        const scene = this._scene;
        const viewportWidth = gl.drawingBufferWidth;
        const viewportHeight = gl.drawingBufferHeight;
        const projectState = scene.camera.project._state;
        const near = projectState.near;
        const far = projectState.far;

        gl.viewport(0, 0, viewportWidth, viewportHeight);
        gl.clearColor(0, 0, 0, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.frontFace(gl.CCW);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        program.bind();

        tempVec2a[0] = viewportWidth;
        tempVec2a[1] = viewportHeight;

        gl.uniform2fv(this._uViewport, tempVec2a);
        gl.uniform1f(this._uCameraNear, near);
        gl.uniform1f(this._uCameraFar, far);

        gl.uniform1f(this._uDepthCutoff, blurDepthCutoff);

        if (direction === 0) {// Horizontal
            gl.uniform2fv(this._uSampleOffsets, sampleOffsetsHor);
        } else { // Vertical
            gl.uniform2fv(this._uSampleOffsets, sampleOffsetsVert);
        }

        gl.uniform1fv(this._uSampleWeights, sampleWeights);

        const depthTexture = WEBGL_INFO.SUPPORTED_EXTENSIONS["WEBGL_depth_texture"]
            ? depthRenderBuffer.getDepthTexture()
            : depthRenderBuffer.getTexture();

        const occlusionTexture = occlusionRenderBuffer.getTexture();

        program.bindTexture(this._uDepthTexture, depthTexture, 0);
        program.bindTexture(this._uOcclusionTexture, occlusionTexture, 1);

        this._aUV.bindArrayBuffer(this._uvBuf);
        this._aPosition.bindArrayBuffer(this._positionsBuf);
        this._indicesBuf.bind();

        gl.drawElements(gl.TRIANGLES, this._indicesBuf.numItems, this._indicesBuf.itemType, 0);
    }

    destroy() {
        this._program.destroy();
    }
}

function createSampleWeights(kernelRadius, stdDev) {
    const weights = [];
    for (let i = 0; i <= kernelRadius; i++) {
        weights.push(gaussian(i, stdDev));
    }
    return weights; // TODO: Optimize
}

function gaussian(x, stdDev) {
    return Math.exp(-(x * x) / (2.0 * (stdDev * stdDev))) / (Math.sqrt(2.0 * Math.PI) * stdDev);
}

function createSampleOffsets(kernelRadius, uvIncrement) {
    const offsets = [];
    for (let i = 0; i <= kernelRadius; i++) {
        offsets.push(uvIncrement[0] * i);
        offsets.push(uvIncrement[1] * i);
    }
    return offsets;
}

export {SAODepthLimitedBlurRenderer};