import {Program} from "./../Program.js";
import {ArrayBuf} from "./../ArrayBuf.js";
import {math} from "../../math/math.js";
import {WEBGL_INFO} from "../../webglInfo.js";

const tempVec2 = math.vec2();

/**
 * SAO implementation inspired from previous SAO work in THREE.js by ludobaka / ludobaka.github.io and bhouston
 * @private
 */
class SAOOcclusionRenderer {

    constructor(scene) {

        this._scene = scene;

        this._numSamples = null;

        // The program

        this._program = null;
        this._programError = false;

        // Variable locations

        this._aPosition = null;
        this._aUV = null;

        this._uDepthTexture = "uDepthTexture";

        this._uCameraNear = null;
        this._uCameraFar = null;
        this._uCameraProjectionMatrix = null;
        this._uCameraInverseProjectionMatrix = null;

        this._uScale = null;
        this._uIntensity = null;
        this._uBias = null;
        this._uKernelRadius = null;
        this._uMinResolution = null;
        this._uRandomSeed = null;

        // VBOs

        this._uvBuf = null;
        this._positionsBuf = null;
        this._indicesBuf = null;
    }

    render(depthRenderBuffer) {

        this._build();

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
        const sao = scene.sao;
        const viewportWidth = gl.drawingBufferWidth;
        const viewportHeight = gl.drawingBufferHeight;
        const projectState = scene.camera.project._state;
        const near = projectState.near;
        const far = projectState.far;
        const projectionMatrix = projectState.matrix;
        const inverseProjectionMatrix = this._getInverseProjectMat();
        const randomSeed = Math.random();
        const perspective = (scene.camera.projection === "perspective");

        tempVec2[0] = viewportWidth;
        tempVec2[1] = viewportHeight;

        gl.getExtension("OES_standard_derivatives");

        gl.viewport(0, 0, viewportWidth, viewportHeight);
        gl.clearColor(0, 0, 0, 1);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.frontFace(gl.CCW);
        gl.clear(gl.COLOR_BUFFER_BIT);

        program.bind();

        gl.uniform1f(this._uCameraNear, near);
        gl.uniform1f(this._uCameraFar, far);

        gl.uniformMatrix4fv(this._uCameraProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(this._uCameraInverseProjectionMatrix, false, inverseProjectionMatrix);

        gl.uniform1i(this._uPerspective, perspective);

        gl.uniform1f(this._uScale, sao.scale * (far / 5));
        gl.uniform1f(this._uIntensity, sao.intensity);
        gl.uniform1f(this._uBias, sao.bias);
        gl.uniform1f(this._uKernelRadius, sao.kernelRadius);
        gl.uniform1f(this._uMinResolution, sao.minResolution);
        gl.uniform2fv(this._uViewport, tempVec2);
        gl.uniform1f(this._uRandomSeed, randomSeed);

        const depthTexture = WEBGL_INFO.SUPPORTED_EXTENSIONS["WEBGL_depth_texture"]
            ? depthRenderBuffer.getDepthTexture()
            : depthRenderBuffer.getTexture();

        program.bindTexture(this._uDepthTexture, depthTexture, 0);

        this._aUV.bindArrayBuffer(this._uvBuf);
        this._aPosition.bindArrayBuffer(this._positionsBuf);
        this._indicesBuf.bind();

        gl.drawElements(gl.TRIANGLES, this._indicesBuf.numItems, this._indicesBuf.itemType, 0);
    }

    _build() {

        let dirty = false;

        const sao = this._scene.sao;

        if (sao.numSamples !== this._numSamples) {
            this._numSamples = Math.floor(sao.numSamples);
            dirty = true;
        }

        if (!dirty) {
            return;
        }

        const gl = this._scene.canvas.gl;

        if (this._program) {
            this._program.destroy();
            this._program = null;
        }

        this._program = new Program(gl, {

            vertex: [`precision highp float;
                    precision highp int;
                    
                    attribute vec3 aPosition;
                    attribute vec2 aUV;            
                    
                    varying vec2 vUV;
                    
                    void main () {
                        gl_Position = vec4(aPosition, 1.0);
                        vUV = aUV;
                    }`],

            fragment: [
                `#extension GL_OES_standard_derivatives : require              
                precision highp float;
                precision highp int;           
                
                #define NORMAL_TEXTURE 0
                #define PI 3.14159265359
                #define PI2 6.28318530718
                #define EPSILON 1e-6
                #define NUM_SAMPLES ${this._numSamples}
                #define NUM_RINGS 4              
            
                varying vec2        vUV;
            
                uniform sampler2D   uDepthTexture;
               
                uniform float       uCameraNear;
                uniform float       uCameraFar;
                uniform mat4        uProjectMatrix;
                uniform mat4        uInverseProjectMatrix;
                
                uniform bool        uPerspective;

                uniform float       uScale;
                uniform float       uIntensity;
                uniform float       uBias;
                uniform float       uKernelRadius;
                uniform float       uMinResolution;
                uniform vec2        uViewport;
                uniform float       uRandomSeed;

                float pow2( const in float x ) { return x*x; }
                
                highp float rand( const in vec2 uv ) {
                    const highp float a = 12.9898, b = 78.233, c = 43758.5453;
                    highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
                    return fract(sin(sn) * c);
                }

                vec3 packNormalToRGB( const in vec3 normal ) {
                    return normalize( normal ) * 0.5 + 0.5;
                }

                vec3 unpackRGBToNormal( const in vec3 rgb ) {
                    return 2.0 * rgb.xyz - 1.0;
                }

                const float packUpscale = 256. / 255.;
                const float unpackDownScale = 255. / 256.; 

                const vec3 packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );
                const vec4 unPackFactors = unpackDownScale / vec4( packFactors, 1. );   

                const float shiftRights = 1. / 256.;

                vec4 packFloatToRGBA( const in float v ) {
                    vec4 r = vec4( fract( v * packFactors ), v );
                    r.yzw -= r.xyz * shiftRights; 
                    return r * packUpscale;
                }

                float unpackRGBAToFloat( const in vec4 v ) {                   
                    return dot( floor( v * 255.0 + 0.5 ) / 255.0, unPackFactors );
                }
                
                float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
                    return ( near * far ) / ( ( far - near ) * invClipZ - far );
                }

                float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
                    return linearClipZ * ( near - far ) - near;
                }
                
                float getDepth( const in vec2 screenPosition ) {`
                + (WEBGL_INFO.SUPPORTED_EXTENSIONS["WEBGL_depth_texture"] ? `return texture2D(uDepthTexture, screenPosition).r;` : `return unpackRGBAToFloat(texture2D( uDepthTexture, screenPosition));`) +
                `}

                float getViewZ( const in float depth ) {
                     if (uPerspective) {
                         return perspectiveDepthToViewZ( depth, uCameraNear, uCameraFar );
                     } else {
                        return orthographicDepthToViewZ( depth, uCameraNear, uCameraFar );
                     }
                }

                vec3 getViewPos( const in vec2 screenPos, const in float depth, const in float viewZ ) {
                	float clipW = uProjectMatrix[2][3] * viewZ + uProjectMatrix[3][3];
                	vec4 clipPosition = vec4( ( vec3( screenPos, depth ) - 0.5 ) * 2.0, 1.0 );
                	clipPosition *= clipW; 
                	return ( uInverseProjectMatrix * clipPosition ).xyz;
                }

                vec3 getViewNormal( const in vec3 viewPosition, const in vec2 screenPos ) {               
                    return normalize( cross( dFdx( viewPosition ), dFdy( viewPosition ) ) );
                }

                float scaleDividedByCameraFar;
                float minResolutionMultipliedByCameraFar;

                float getOcclusion( const in vec3 centerViewPosition, const in vec3 centerViewNormal, const in vec3 sampleViewPosition ) {
                	vec3 viewDelta = sampleViewPosition - centerViewPosition;
                	float viewDistance = length( viewDelta );
                	float scaledScreenDistance = scaleDividedByCameraFar * viewDistance;
                	return max(0.0, (dot(centerViewNormal, viewDelta) - minResolutionMultipliedByCameraFar) / scaledScreenDistance - uBias) / (1.0 + pow2( scaledScreenDistance ) );
                }

                const float ANGLE_STEP = PI2 * float( NUM_RINGS ) / float( NUM_SAMPLES );
                const float INV_NUM_SAMPLES = 1.0 / float( NUM_SAMPLES );

                float getAmbientOcclusion( const in vec3 centerViewPosition ) {
            
                	scaleDividedByCameraFar = uScale / uCameraFar;
                	minResolutionMultipliedByCameraFar = uMinResolution * uCameraFar;
                	vec3 centerViewNormal = getViewNormal( centerViewPosition, vUV );

                	float angle = rand( vUV + uRandomSeed ) * PI2;
                	vec2 radius = vec2( uKernelRadius * INV_NUM_SAMPLES ) / uViewport;
                	vec2 radiusStep = radius;

                	float occlusionSum = 0.0;
                	float weightSum = 0.0;

                	for( int i = 0; i < NUM_SAMPLES; i ++ ) {
                		vec2 sampleUv = vUV + vec2( cos( angle ), sin( angle ) ) * radius;
                		radius += radiusStep;
                		angle += ANGLE_STEP;

                		float sampleDepth = getDepth( sampleUv );
                		if( sampleDepth >= ( 1.0 - EPSILON ) ) {
                			continue;
                		}

                		float sampleViewZ = getViewZ( sampleDepth );
                		vec3 sampleViewPosition = getViewPos( sampleUv, sampleDepth, sampleViewZ );
                		occlusionSum += getOcclusion( centerViewPosition, centerViewNormal, sampleViewPosition );
                		weightSum += 1.0;
                	}

                	if( weightSum == 0.0 ) discard;

                	return occlusionSum * ( uIntensity / weightSum );
                }

                void main() {
                
                	float centerDepth = getDepth( vUV );
                	
                	if( centerDepth >= ( 1.0 - EPSILON ) ) {
                		discard;
                	}

                	float centerViewZ = getViewZ( centerDepth );
                	vec3 viewPosition = getViewPos( vUV, centerDepth, centerViewZ );

                	float ambientOcclusion = getAmbientOcclusion( viewPosition );
                
                	gl_FragColor = packFloatToRGBA(  1.0- ambientOcclusion );
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

        this._uCameraNear = this._program.getLocation("uCameraNear");
        this._uCameraFar = this._program.getLocation("uCameraFar");

        this._uCameraProjectionMatrix = this._program.getLocation("uProjectMatrix");
        this._uCameraInverseProjectionMatrix = this._program.getLocation("uInverseProjectMatrix");

        this._uPerspective = this._program.getLocation("uPerspective");

        this._uScale = this._program.getLocation("uScale");
        this._uIntensity = this._program.getLocation("uIntensity");
        this._uBias = this._program.getLocation("uBias");
        this._uKernelRadius = this._program.getLocation("uKernelRadius");
        this._uMinResolution = this._program.getLocation("uMinResolution");
        this._uViewport = this._program.getLocation("uViewport");
        this._uRandomSeed = this._program.getLocation("uRandomSeed");

        this._aPosition = this._program.getAttribute("aPosition");
        this._aUV = this._program.getAttribute("aUV");

        this._dirty = false;
    }

    destroy() {
        if (this._program) {
            this._program.destroy();
            this._program = null;
        }
    }
}

export {SAOOcclusionRenderer};