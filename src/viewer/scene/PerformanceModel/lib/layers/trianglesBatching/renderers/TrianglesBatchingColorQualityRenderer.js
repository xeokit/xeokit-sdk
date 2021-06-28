import {Program} from "../../../../../webgl/Program.js";
import {math} from "../../../../../math/math.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../../math/rtcCoords.js";
import {WEBGL_INFO} from "../../../../../webglInfo.js";

const tempVec4 = math.vec4();
const tempVec3a = math.vec3();

const TEXTURE_DECODE_FUNCS = {
    "linear": "linearToLinear",
    "sRGB": "sRGBToLinear",
    "gamma": "gammaToLinear"
};

/**
 * @private
 */
class TrianglesBatchingColorQualityRenderer {

    constructor(scene, withSAO) {
        this._scene = scene;
        this._withSAO = withSAO;
        this._hash = this._getHash();
        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        const scene = this._scene;
        return [scene.gammaOutput, scene._lightsState.getHash(), scene._sectionPlanesState.getHash(), (this._withSAO ? "sao" : "nosao")].join(";");
    }

    drawLayer(frameCtx, batchingLayer, renderPass) {

        const scene = this._scene;
        const camera = scene.camera;
        const model = batchingLayer.model;
        const gl = scene.canvas.gl;
        const state = batchingLayer._state;
        const rtcCenter = batchingLayer._state.rtcCenter;

        if (!this._program) {
            this._allocate();
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram(frameCtx);
        }

        gl.uniform1i(this._uRenderPass, renderPass);

        gl.uniformMatrix4fv(this._uViewMatrix, false, (rtcCenter) ? createRTCViewMat(camera.viewMatrix, rtcCenter) : camera.viewMatrix);
        gl.uniformMatrix4fv(this._uViewNormalMatrix, false, camera.viewNormalMatrix);

        gl.uniformMatrix4fv(this._uWorldMatrix, false, model.worldMatrix);
        gl.uniformMatrix4fv(this._uWorldNormalMatrix, false, model.worldNormalMatrix);

        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = batchingLayer.layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    const active = renderFlags.sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                    gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                    if (active) {
                        const sectionPlane = sectionPlanes[sectionPlaneIndex];
                        if (rtcCenter) {
                            const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, rtcCenter, tempVec3a);
                            gl.uniform3fv(sectionPlaneUniforms.pos, rtcSectionPlanePos);
                        } else {
                            gl.uniform3fv(sectionPlaneUniforms.pos, sectionPlane.pos);
                        }
                        gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                    }
                }
            }
        }

        gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, batchingLayer._state.positionsDecodeMatrix);

        this._aPosition.bindArrayBuffer(state.positionsBuf);

        if (this._aNormal) {
            this._aNormal.bindArrayBuffer(state.normalsBuf);
        }

        if (this._aColor) {
            this._aColor.bindArrayBuffer(state.colorsBuf);
        }

        if (this._aMetallicRoughness) {
            this._aMetallicRoughness.bindArrayBuffer(state.metallicRoughnessBuf);
        }

        if (this._aFlags) {
            this._aFlags.bindArrayBuffer(state.flagsBuf);
        }

        if (this._aFlags2) {
            this._aFlags2.bindArrayBuffer(state.flags2Buf);
        }

        if (this._aOffset) {
            this._aOffset.bindArrayBuffer(state.offsetsBuf);
        }

        state.indicesBuf.bind();

        gl.drawElements(gl.TRIANGLES, state.indicesBuf.numItems, state.indicesBuf.itemType, 0);
    }

    _allocate() {

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const lightsState = scene._lightsState;

        this._program = new Program(gl, this._buildShader());

        if (this._program.errors) {
            this.errors = this._program.errors;
            return;
        }

        const program = this._program;

        this._uRenderPass = program.getLocation("renderPass");
        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uWorldMatrix = program.getLocation("worldMatrix");
        this._uWorldNormalMatrix = program.getLocation("worldNormalMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uViewNormalMatrix = program.getLocation("viewNormalMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");

        this._uGammaFactor = program.getLocation("gammaFactor");

        this._uLightAmbient = program.getLocation("lightAmbient");
        this._uLightColor = [];
        this._uLightDir = [];
        this._uLightPos = [];
        this._uLightAttenuation = [];

        const lights = lightsState.lights;
        let light;

        for (let i = 0, len = lights.length; i < len; i++) {
            light = lights[i];
            switch (light.type) {
                case "dir":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = null;
                    this._uLightDir[i] = program.getLocation("lightDir" + i);
                    break;
                case "point":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = program.getLocation("lightPos" + i);
                    this._uLightDir[i] = null;
                    this._uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
                case "spot":
                    this._uLightColor[i] = program.getLocation("lightColor" + i);
                    this._uLightPos[i] = program.getLocation("lightPos" + i);
                    this._uLightDir[i] = program.getLocation("lightDir" + i);
                    this._uLightAttenuation[i] = program.getLocation("lightAttenuation" + i);
                    break;
            }
        }

        if (lightsState.reflectionMaps.length > 0) {
            this._uReflectionMap = "reflectionMap";
        }

        if (lightsState.lightMaps.length > 0) {
            this._uLightMap = "lightMap";
        }

        this._uSectionPlanes = [];

        for (let i = 0, len = scene._sectionPlanesState.sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        this._aPosition = program.getAttribute("position");
        this._aOffset = program.getAttribute("offset");
        this._aNormal = program.getAttribute("normal");
        this._aColor = program.getAttribute("color");
        this._aMetallicRoughness = program.getAttribute("metallicRoughness");
        this._aFlags = program.getAttribute("flags");
        this._aFlags2 = program.getAttribute("flags2");

        if (this._withSAO) {
            this._uOcclusionTexture = "uOcclusionTexture";
            this._uSAOParams = program.getLocation("uSAOParams");
        }

        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }
    }

    _bindProgram(frameCtx) {

        const maxTextureUnits = WEBGL_INFO.MAX_TEXTURE_UNITS;
        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const lightsState = scene._lightsState;
        const lights = lightsState.lights;
        const project = scene.camera.project;

        program.bind();

        gl.uniformMatrix4fv(this._uProjMatrix, false, project.matrix)

        if (this._uLightAmbient) {
            gl.uniform4fv(this._uLightAmbient, scene._lightsState.getAmbientColorAndIntensity());
        }

        for (let i = 0, len = lights.length; i < len; i++) {

            const light = lights[i];

            if (this._uLightColor[i]) {
                gl.uniform4f(this._uLightColor[i], light.color[0], light.color[1], light.color[2], light.intensity);
            }
            if (this._uLightPos[i]) {
                gl.uniform3fv(this._uLightPos[i], light.pos);
                if (this._uLightAttenuation[i]) {
                    gl.uniform1f(this._uLightAttenuation[i], light.attenuation);
                }
            }
            if (this._uLightDir[i]) {
                gl.uniform3fv(this._uLightDir[i], light.dir);
            }
        }

        if (lightsState.reflectionMaps.length > 0 && lightsState.reflectionMaps[0].texture && this._uReflectionMap) {
            program.bindTexture(this._uReflectionMap, lightsState.reflectionMaps[0].texture, frameCtx.textureUnit);
            frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
            frameCtx.bindTexture++;
        }

        if (lightsState.lightMaps.length > 0 && lightsState.lightMaps[0].texture && this._uLightMap) {
            program.bindTexture(this._uLightMap, lightsState.lightMaps[0].texture, frameCtx.textureUnit);
            frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
            frameCtx.bindTexture++;
        }

        if (this._withSAO) {
            const sao = scene.sao;
            const saoEnabled = sao.possible;
            if (saoEnabled) {
                const viewportWidth = gl.drawingBufferWidth;
                const viewportHeight = gl.drawingBufferHeight;
                tempVec4[0] = viewportWidth;
                tempVec4[1] = viewportHeight;
                tempVec4[2] = sao.blendCutoff;
                tempVec4[3] = sao.blendFactor;
                gl.uniform4fv(this._uSAOParams, tempVec4);
                this._program.bindTexture(this._uOcclusionTexture, frameCtx.occlusionTexture, frameCtx.textureUnit);
                frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                frameCtx.bindTexture++;
            }
        }

        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }

        if (this._uGammaFactor) {
            gl.uniform1f(this._uGammaFactor, scene.gammaFactor);
        }
    }

    _buildShader() {
        return {
            vertex: this._buildVertexShader(),
            fragment: this._buildFragmentShader()
        };
    }

    _buildVertexShader() {

        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const lightsState = scene._lightsState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const clippingCaps = sectionPlanesState.clippingCaps;

        const src = [];

        src.push("// Triangles batching quality draw vertex shader");

        if (scene.logarithmicDepthBufferEnabled && WEBGL_INFO.SUPPORTED_EXTENSIONS["EXT_frag_depth"]) {
            src.push("#extension GL_EXT_frag_depth : enable");
        }

        src.push("uniform int renderPass;");

        src.push("attribute vec3 position;");
        src.push("attribute vec3 normal;");
        src.push("attribute vec4 color;");
        src.push("attribute vec2 metallicRoughness;");
        src.push("attribute vec4 flags;");
        src.push("attribute vec4 flags2;");

        if (scene.entityOffsetsEnabled) {
            src.push("attribute vec3 offset;");
        }

        src.push("uniform mat4 worldMatrix;");
        src.push("uniform mat4 worldNormalMatrix;");

        src.push("uniform mat4 viewMatrix;");
        src.push("uniform mat4 projMatrix;");
        src.push("uniform mat4 viewNormalMatrix;");
        src.push("uniform mat4 positionsDecodeMatrix;");

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("uniform float logDepthBufFC;");
            if (WEBGL_INFO.SUPPORTED_EXTENSIONS["EXT_frag_depth"]) {
                src.push("varying float vFragDepth;");
            }
        }

        src.push("vec3 octDecode(vec2 oct) {");
        src.push("    vec3 v = vec3(oct.xy, 1.0 - abs(oct.x) - abs(oct.y));");
        src.push("    if (v.z < 0.0) {");
        src.push("        v.xy = (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);");
        src.push("    }");
        src.push("    return normalize(v);");
        src.push("}");

        src.push("varying vec4 vViewPosition;");
        src.push("varying vec3 vViewNormal;");
        src.push("varying vec4 vColor;");
        src.push("varying vec2 vMetallicRoughness;");

        if (lightsState.lightMaps.length > 0) {
            src.push("varying vec3 vWorldNormal;");
        }

        if (clipping) {
            src.push("varying vec4 vWorldPosition;");
            src.push("varying vec4 vFlags2;");
            if (clippingCaps) {
                src.push("varying vec4 vClipPosition;");
            }
        }

        src.push("void main(void) {");

        // flags.x = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
        // renderPass = COLOR_OPAQUE

        src.push(`if (int(flags.x) != renderPass) {`);
        src.push("   gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex

        src.push("} else {");

        src.push("vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0)); ");
        if (scene.entityOffsetsEnabled) {
            src.push("worldPosition.xyz = worldPosition.xyz + offset;");
        }
        src.push("vec4 viewPosition  = viewMatrix * worldPosition; ");
        src.push("vec4 worldNormal =  worldNormalMatrix * vec4(octDecode(normal.xy), 0.0); ");
        src.push("vec3 viewNormal = normalize((viewNormalMatrix * worldNormal).xyz);");

        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (scene.logarithmicDepthBufferEnabled) {
            if (WEBGL_INFO.SUPPORTED_EXTENSIONS["EXT_frag_depth"]) {
                src.push("vFragDepth = 1.0 + clipPos.w;");
            } else {
                src.push("clipPos.z = log2( max( 1e-6, clipPos.w + 1.0 ) ) * logDepthBufFC - 1.0;");
                src.push("clipPos.z *= clipPos.w;");
            }
        }

        if (clipping) {
            src.push("vWorldPosition = worldPosition;");
            src.push("vFlags2 = flags2;");
            if (clippingCaps) {
                src.push("vClipPosition = clipPos;");
            }
        }

        src.push("vViewPosition = viewPosition;");
        src.push("vViewNormal = viewNormal;");
        src.push("vColor = color;");
        src.push("vMetallicRoughness = metallicRoughness;");

        if (lightsState.lightMaps.length > 0) {
            src.push("vWorldNormal = worldNormal.xyz;");
        }

        src.push("gl_Position = clipPos;");
        src.push("}");

        src.push("}");
        return src;
    }

    _buildFragmentShader() {

        const scene = this._scene;
        const gammaOutput = scene.gammaOutput; // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.
        const sectionPlanesState = scene._sectionPlanesState;
        const lightsState = scene._lightsState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const clippingCaps = sectionPlanesState.clippingCaps;
        const src = [];

        src.push("// Triangles batching quality draw fragment shader");

        if (scene.logarithmicDepthBufferEnabled && WEBGL_INFO.SUPPORTED_EXTENSIONS["EXT_frag_depth"]) {
            src.push("#extension GL_EXT_frag_depth : enable");
        }

        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");

        if (scene.logarithmicDepthBufferEnabled && WEBGL_INFO.SUPPORTED_EXTENSIONS["EXT_frag_depth"]) {
            src.push("uniform float logDepthBufFC;");
            src.push("varying float vFragDepth;");
        }

        src.push("varying vec4 vViewPosition;");
        src.push("varying vec3 vViewNormal;");
        src.push("varying vec4 vColor;");
        src.push("varying vec2 vMetallicRoughness;");

        if (lightsState.lightMaps.length > 0) {
            src.push("varying vec3 vWorldNormal;");
        }

        src.push("uniform mat4 viewMatrix;");

        if (lightsState.reflectionMaps.length > 0) {
            src.push("uniform samplerCube reflectionMap;");
        }

        if (lightsState.lightMaps.length > 0) {
            src.push("uniform samplerCube lightMap;");
        }

        src.push("uniform vec4 lightAmbient;");

        for (let i = 0, len = lightsState.lights.length; i < len; i++) {
            const light = lightsState.lights[i];
            if (light.type === "ambient") {
                continue;
            }
            src.push("uniform vec4 lightColor" + i + ";");
            if (light.type === "dir") {
                src.push("uniform vec3 lightDir" + i + ";");
            }
            if (light.type === "point") {
                src.push("uniform vec3 lightPos" + i + ";");
            }
            if (light.type === "spot") {
                src.push("uniform vec3 lightPos" + i + ";");
                src.push("uniform vec3 lightDir" + i + ";");
            }
        }

        if (this._withSAO) {
            src.push("uniform sampler2D uOcclusionTexture;");
            src.push("uniform vec4      uSAOParams;");

            src.push("const float       packUpscale = 256. / 255.;");
            src.push("const float       unpackDownScale = 255. / 256.;");
            src.push("const vec3        packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );");
            src.push("const vec4        unPackFactors = unpackDownScale / vec4( packFactors, 1. );");

            src.push("float unpackRGBAToDepth( const in vec4 v ) {");
            src.push("    return dot( v, unPackFactors );");
            src.push("}");
        }

        src.push("uniform float gammaFactor;");
        src.push("vec4 linearToLinear( in vec4 value ) {");
        src.push("  return value;");
        src.push("}");
        src.push("vec4 sRGBToLinear( in vec4 value ) {");
        src.push("  return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.w );");
        src.push("}");
        src.push("vec4 gammaToLinear( in vec4 value) {");
        src.push("  return vec4( pow( value.xyz, vec3( gammaFactor ) ), value.w );");
        src.push("}");
        if (gammaOutput) {
            src.push("vec4 linearToGamma( in vec4 value, in float gammaFactor ) {");
            src.push("  return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
            src.push("}");
        }

        if (clipping) {
            src.push("varying vec4 vWorldPosition;");
            src.push("varying vec4 vFlags2;");
            if (clippingCaps) {
                src.push("varying vec4 vClipPosition;");
            }
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }

        // CONSTANT DEFINITIONS

        src.push("#define PI 3.14159265359");
        src.push("#define RECIPROCAL_PI 0.31830988618");
        src.push("#define RECIPROCAL_PI2 0.15915494");
        src.push("#define EPSILON 1e-6");

        src.push("#define saturate(a) clamp( a, 0.0, 1.0 )");

        // UTILITY DEFINITIONS

        src.push("vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {");
        src.push("   return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );");
        src.push("}");

        // STRUCTURES

        src.push("struct IncidentLight {");
        src.push("   vec3 color;");
        src.push("   vec3 direction;");
        src.push("};");

        src.push("struct ReflectedLight {");
        src.push("   vec3 diffuse;");
        src.push("   vec3 specular;");
        src.push("};");

        src.push("struct Geometry {");
        src.push("   vec3 position;");
        src.push("   vec3 viewNormal;");
        src.push("   vec3 worldNormal;");
        src.push("   vec3 viewEyeDir;");
        src.push("};");

        src.push("struct Material {");
        src.push("   vec3    diffuseColor;");
        src.push("   float   specularRoughness;");
        src.push("   vec3    specularColor;");
        src.push("   float   shine;"); // Only used for Phong
        src.push("};");

        // IRRADIANCE EVALUATION

        src.push("float GGXRoughnessToBlinnExponent(const in float ggxRoughness) {");
        src.push("   float r = ggxRoughness + 0.0001;");
        src.push("   return (2.0 / (r * r) - 2.0);");
        src.push("}");

        src.push("float getSpecularMIPLevel(const in float blinnShininessExponent, const in int maxMIPLevel) {");
        src.push("   float maxMIPLevelScalar = float( maxMIPLevel );");
        src.push("   float desiredMIPLevel = maxMIPLevelScalar - 0.79248 - 0.5 * log2( ( blinnShininessExponent * blinnShininessExponent ) + 1.0 );");
        src.push("   return clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );");
        src.push("}");

        if (lightsState.reflectionMaps.length > 0) {
            src.push("vec3 getLightProbeIndirectRadiance(const in vec3 reflectVec, const in float blinnShininessExponent, const in int maxMIPLevel) {");
            src.push("   float mipLevel = 0.5 * getSpecularMIPLevel(blinnShininessExponent, maxMIPLevel);"); //TODO: a random factor - fix this
            src.push("   vec3 envMapColor = " + TEXTURE_DECODE_FUNCS[lightsState.reflectionMaps[0].encoding] + "(textureCube(reflectionMap, reflectVec, mipLevel)).rgb;");
            src.push("  return envMapColor;");
            src.push("}");
        }

        // SPECULAR BRDF EVALUATION

        src.push("vec3 F_Schlick(const in vec3 specularColor, const in float dotLH) {");
        src.push("   float fresnel = exp2( ( -5.55473 * dotLH - 6.98316 ) * dotLH );");
        src.push("   return ( 1.0 - specularColor ) * fresnel + specularColor;");
        src.push("}");

        src.push("float G_GGX_Smith(const in float alpha, const in float dotNL, const in float dotNV) {");
        src.push("   float a2 = ( alpha * alpha );");
        src.push("   float gl = dotNL + sqrt( a2 + ( 1.0 - a2 ) * ( dotNL * dotNL ) );");
        src.push("   float gv = dotNV + sqrt( a2 + ( 1.0 - a2 ) * ( dotNV * dotNV ) );");
        src.push("   return 1.0 / ( gl * gv );");
        src.push("}");

        src.push("float G_GGX_SmithCorrelated(const in float alpha, const in float dotNL, const in float dotNV) {");
        src.push("   float a2 = ( alpha * alpha );");
        src.push("   float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * ( dotNV * dotNV ) );");
        src.push("   float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * ( dotNL * dotNL ) );");
        src.push("   return 0.5 / max( gv + gl, EPSILON );");
        src.push("}");

        src.push("float D_GGX(const in float alpha, const in float dotNH) {");
        src.push("   float a2 = ( alpha * alpha );");
        src.push("   float denom = ( dotNH * dotNH) * ( a2 - 1.0 ) + 1.0;");
        src.push("   return RECIPROCAL_PI * a2 / ( denom * denom);");
        src.push("}");

        src.push("vec3 BRDF_Specular_GGX(const in IncidentLight incidentLight, const in Geometry geometry, const in vec3 specularColor, const in float roughness) {");
        src.push("   float alpha = ( roughness * roughness );");
        src.push("   vec3 halfDir = normalize( incidentLight.direction + geometry.viewEyeDir );");
        src.push("   float dotNL = saturate( dot( geometry.viewNormal, incidentLight.direction ) );");
        src.push("   float dotNV = saturate( dot( geometry.viewNormal, geometry.viewEyeDir ) );");
        src.push("   float dotNH = saturate( dot( geometry.viewNormal, halfDir ) );");
        src.push("   float dotLH = saturate( dot( incidentLight.direction, halfDir ) );");
        src.push("   vec3  F = F_Schlick( specularColor, dotLH );");
        src.push("   float G = G_GGX_SmithCorrelated( alpha, dotNL, dotNV );");
        src.push("   float D = D_GGX( alpha, dotNH );");
        src.push("   return F * (G * D);");
        src.push("}");

        src.push("vec3 BRDF_Specular_GGX_Environment(const in Geometry geometry, const in vec3 specularColor, const in float roughness) {");
        src.push("   float dotNV = saturate(dot(geometry.viewNormal, geometry.viewEyeDir));");
        src.push("   const vec4 c0 = vec4( -1, -0.0275, -0.572,  0.022);");
        src.push("   const vec4 c1 = vec4(  1,  0.0425,   1.04, -0.04);");
        src.push("   vec4 r = roughness * c0 + c1;");
        src.push("   float a004 = min(r.x * r.x, exp2(-9.28 * dotNV)) * r.x + r.y;");
        src.push("   vec2 AB    = vec2(-1.04, 1.04) * a004 + r.zw;");
        src.push("   return specularColor * AB.x + AB.y;");
        src.push("}");

        if (lightsState.lightMaps.length > 0 || lightsState.reflectionMaps.length > 0) {

            src.push("void computePBRLightMapping(const in Geometry geometry, const in Material material, inout ReflectedLight reflectedLight) {");

            if (lightsState.lightMaps.length > 0) {
                src.push("   vec3 irradiance = " + TEXTURE_DECODE_FUNCS[lightsState.lightMaps[0].encoding] + "(textureCube(lightMap, geometry.worldNormal)).rgb;");
                src.push("   irradiance *= PI;");
                src.push("   vec3 diffuseBRDFContrib = (RECIPROCAL_PI * material.diffuseColor);");
                src.push("   reflectedLight.diffuse +=  irradiance * diffuseBRDFContrib;");
            }

            if (lightsState.reflectionMaps.length > 0) {
                src.push("   vec3 reflectVec             = reflect(geometry.viewEyeDir, geometry.viewNormal);");
                src.push("   reflectVec                  = inverseTransformDirection(reflectVec, viewMatrix);");
                src.push("   float blinnExpFromRoughness = GGXRoughnessToBlinnExponent(material.specularRoughness);");
                src.push("   vec3 radiance               = getLightProbeIndirectRadiance(reflectVec, blinnExpFromRoughness, 8);");
                src.push("   vec3 specularBRDFContrib    = BRDF_Specular_GGX_Environment(geometry, material.specularColor, material.specularRoughness);");
                src.push("   reflectedLight.specular     += radiance * specularBRDFContrib;");
            }

            src.push("}");
        }

        // MAIN LIGHTING COMPUTATION FUNCTION

        src.push("void computePBRLighting(const in IncidentLight incidentLight, const in Geometry geometry, const in Material material, inout ReflectedLight reflectedLight) {");
        src.push("   float dotNL     = saturate(dot(geometry.viewNormal, incidentLight.direction));");
        src.push("   vec3 irradiance = dotNL * incidentLight.color * PI;");
        src.push("   reflectedLight.diffuse  += irradiance * (RECIPROCAL_PI * material.diffuseColor);");
        src.push("   reflectedLight.specular += irradiance * BRDF_Specular_GGX(incidentLight, geometry, material.specularColor, material.specularRoughness);");
        src.push("}");

        src.push("void main(void) {");

        if (clipping) {
            src.push("  bool clippable = (float(vFlags2.x) > 0.0);");
            src.push("  if (clippable) {");
            src.push("  float dist = 0.0;");
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
            if (clippingCaps) {
                src.push("  if (dist > (0.002 * vClipPosition.w)) {");
                src.push("      discard;");
                src.push("  }");
                src.push("  if (dist > 0.0) { ");
                src.push("      gl_FragColor=vec4(1.0, 0.0, 0.0, 1.0);");
                if (scene.logarithmicDepthBufferEnabled && WEBGL_INFO.SUPPORTED_EXTENSIONS["EXT_frag_depth"]) {
                    src.push("  gl_FragDepthEXT = log2( vFragDepth ) * logDepthBufFC * 0.5;");
                }
                src.push("  return;");
                src.push("}");
            } else {
                src.push("  if (dist > 0.0) { ");
                src.push("      discard;")
                src.push("  }");
            }
            src.push("}");
        }

        src.push("IncidentLight  light;");
        src.push("Material       material;");
        src.push("Geometry       geometry;");
        src.push("ReflectedLight reflectedLight = ReflectedLight(vec3(0.0,0.0,0.0), vec3(0.0,0.0,0.0));");

        src.push("vec3 rgb = (vec3(float(vColor.r) / 255.0, float(vColor.g) / 255.0, float(vColor.b) / 255.0));");
        src.push("float alpha = float(vColor.a) / 255.0;");

        src.push("vec3  diffuseColor = rgb;");
        src.push("float specularF0 = 1.0;");
        src.push("float metallic = float(vMetallicRoughness.r) / 255.0;");
        src.push("float roughness = float(vMetallicRoughness.g) / 255.0;");
        src.push("float dielectricSpecular = 0.16 * specularF0 * specularF0;");

        src.push("material.diffuseColor      = diffuseColor * (1.0 - dielectricSpecular) * (1.0 - metallic);");
        src.push("material.specularRoughness = clamp(roughness, 0.04, 1.0);");
        src.push("material.specularColor     = mix(vec3(dielectricSpecular), diffuseColor, metallic);");

        src.push("geometry.position      = vViewPosition.xyz;");
        src.push("geometry.viewNormal    = -normalize(vViewNormal);");
        src.push("geometry.viewEyeDir    = normalize(vViewPosition.xyz);");

        if (lightsState.lightMaps.length > 0) {
            src.push("geometry.worldNormal   = normalize(vWorldNormal);");
        }

        if (lightsState.lightMaps.length > 0 || lightsState.reflectionMaps.length > 0) {
            src.push("computePBRLightMapping(geometry, material, reflectedLight);");
        }

        for (let i = 0, len = lightsState.lights.length; i < len; i++) {
            const light = lightsState.lights[i];
            if (light.type === "ambient") {
                continue;
            }
            if (light.type === "dir") {
                if (light.space === "view") {
                    src.push("light.direction =  normalize(lightDir" + i + ");");
                } else {
                    src.push("light.direction =  normalize((viewMatrix * vec4(lightDir" + i + ", 0.0)).xyz);");
                }
            } else if (light.type === "point") {
                if (light.space === "view") {
                    src.push("light.direction =  normalize(lightPos" + i + " - vViewPosition.xyz);");
                } else {
                    src.push("light.direction =  normalize((viewMatrix * vec4(lightPos" + i + ", 0.0)).xyz);");
                }
            } else if (light.type === "spot") {
                if (light.space === "view") {
                    src.push("light.direction =  normalize(lightDir" + i + ");");
                } else {
                    src.push("light.direction =  normalize((viewMatrix * vec4(lightDir" + i + ", 0.0)).xyz);");
                }
            } else {
                continue;
            }

            src.push("light.color =  lightColor" + i + ".rgb * lightColor" + i + ".a;"); // a is intensity

            src.push("computePBRLighting(light, geometry, material, reflectedLight);");
        }

        src.push("vec3 outgoingLight = (lightAmbient.rgb * lightAmbient.a * rgb) + (reflectedLight.diffuse) + (reflectedLight.specular);");

        src.push("vec4 fragColor;");

        if (this._withSAO) {
            // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
            // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
            src.push("   float viewportWidth     = uSAOParams[0];");
            src.push("   float viewportHeight    = uSAOParams[1];");
            src.push("   float blendCutoff       = uSAOParams[2];");
            src.push("   float blendFactor       = uSAOParams[3];");
            src.push("   vec2 uv                 = vec2(gl_FragCoord.x / viewportWidth, gl_FragCoord.y / viewportHeight);");
            src.push("   float ambient           = smoothstep(blendCutoff, 1.0, unpackRGBAToDepth(texture2D(uOcclusionTexture, uv))) * blendFactor;");
            src.push("   fragColor               = vec4(outgoingLight.rgb * ambient, alpha);");
        } else {
            src.push("   fragColor            = vec4(outgoingLight.rgb, alpha);");
        }

        if (gammaOutput) {
            src.push("fragColor = linearToGamma(fragColor, gammaFactor);");
        }

        src.push("gl_FragColor = fragColor;");

        if (scene.logarithmicDepthBufferEnabled && WEBGL_INFO.SUPPORTED_EXTENSIONS["EXT_frag_depth"]) {
            src.push("gl_FragDepthEXT = log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }

        src.push("}");
        return src;
    }

    webglContextRestored() {
        this._program = null;
    }

    destroy() {
        if (this._program) {
            this._program.destroy();
        }
        this._program = null;
    }
}

export {TrianglesBatchingColorQualityRenderer};