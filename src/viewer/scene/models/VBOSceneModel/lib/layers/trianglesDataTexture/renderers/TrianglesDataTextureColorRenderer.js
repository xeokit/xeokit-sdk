import {Program} from "../../../../../webgl/Program.js";
import {math} from "../../../../../math/math.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../../math/rtcCoords.js";
import {WEBGL_INFO} from "../../../../../webglInfo.js";

const tempVec4 = math.vec4();
const tempVec3a = math.vec3();

/**
 * @private
 */
class TrianglesDataTextureColorRenderer {

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
        return [scene._lightsState.getHash(), scene._sectionPlanesState.getHash(), (this._withSAO ? "sao" : "nosao")].join(";");
    }

    drawLayer(frameCtx, dataTextureLayer, renderPass) {
        const scene = this._scene;
        const camera = scene.camera;
        const model = dataTextureLayer.model;
        const gl = scene.canvas.gl;
        const state = dataTextureLayer._state;
        const textureState = state.textureState;
        const origin = dataTextureLayer._state.origin;

        if (!this._program) {
            this._allocate();
            if (this.errors) {
                return;
            }
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram(frameCtx, state);
        }
        
        textureState.bindCommonTextures (
            this._program,
            this._uTexturePerObjectIdPositionsDecodeMatrix, 
            this._uTexturePerVertexIdCoordinates, 
            this._uTexturePerObjectIdColorsAndFlags, 
            this._uTextureCameraMatrices, 
            this._uTextureModelMatrices,
            this._uTexturePerObjectIdOffsets
        );

        gl.uniform1i(this._uRenderPass, renderPass);

        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = dataTextureLayer.layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    const active = renderFlags.sectionPlanesActivePerLayer[baseIndex + sectionPlaneIndex];
                    gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                    if (active) {
                        const sectionPlane = sectionPlanes[sectionPlaneIndex];
                        if (origin) {
                            const rtcSectionPlanePos = getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, origin, tempVec3a);
                            gl.uniform3fv(sectionPlaneUniforms.pos, rtcSectionPlanePos);
                        } else {
                            gl.uniform3fv(sectionPlaneUniforms.pos, sectionPlane.pos);
                        }
                        gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                    }
                }
            }
        }

        if (state.numIndices8Bits > 0)
        {
            textureState.bindTriangleIndicesTextures(
                this._program,
                this._uTexturePerPolygonIdPortionIds, 
                this._uTexturePerPolygonIdIndices, 
                8 // 8 bits indices
            );

            gl.drawArrays(gl.TRIANGLES, 0, state.numIndices8Bits);
        }

        if (state.numIndices16Bits > 0)
        {
            textureState.bindTriangleIndicesTextures(
                this._program,
                this._uTexturePerPolygonIdPortionIds, 
                this._uTexturePerPolygonIdIndices, 
                16 // 16 bits indices
            );

            gl.drawArrays(gl.TRIANGLES, 0, state.numIndices16Bits);
        }
        
        if (state.numIndices32Bits > 0)
        {
            textureState.bindTriangleIndicesTextures(
                this._program,
                this._uTexturePerPolygonIdPortionIds, 
                this._uTexturePerPolygonIdIndices, 
                32 // 32 bits indices
            );

            gl.drawArrays(gl.TRIANGLES, 0, state.numIndices32Bits);
        }

        frameCtx.drawElements++;
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

        this._uSectionPlanes = [];

        for (let i = 0, len = scene._sectionPlanesState.sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }
        
        if (this._withSAO) {
            this._uOcclusionTexture = "uOcclusionTexture";
            this._uSAOParams = program.getLocation("uSAOParams");
        }

        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }

        this._uTexturePerObjectIdPositionsDecodeMatrix = "uTexturePerObjectIdPositionsDecodeMatrix"; // chipmunk
        this._uTexturePerObjectIdColorsAndFlags = "uTexturePerObjectIdColorsAndFlags"; // chipmunk
        this._uTexturePerVertexIdCoordinates = "uTexturePerVertexIdCoordinates"; // chipmunk
        this._uTexturePerPolygonIdNormals = "uTexturePerPolygonIdNormals"; // chipmunk
        this._uTexturePerPolygonIdIndices = "uTexturePerPolygonIdIndices"; // chipmunk
        this._uTexturePerPolygonIdPortionIds = "uTexturePerPolygonIdPortionIds"; // chipmunk
        this._uTextureCameraMatrices = "uTextureCameraMatrices"; // chipmunk
        this._uTextureModelMatrices = "uTextureModelMatrices"; // chipmunk
        this._uTexturePerObjectIdOffsets = "uTexturePerObjectIdOffsets"; // chipmunk
    }

    _bindProgram(frameCtx) {

        const scene = this._scene;
        const gl = scene.canvas.gl;
        const program = this._program;
        const lights = scene._lightsState.lights;
        const project = scene.camera.project;

        program.bind();

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
                this._program.bindTexture(this._uOcclusionTexture, frameCtx.occlusionTexture, 0);
            }
        }

        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
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
        let light;
        const src = [];
        src.push("#version 300 es");
        src.push("// Triangles dataTexture draw vertex shader");

        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("precision highp usampler2D;");
        src.push("precision highp isampler2D;");
        src.push("precision highp sampler2D;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("precision mediump usampler2D;");
        src.push("precision mediump isampler2D;");
        src.push("precision mediump sampler2D;");
        src.push("#endif");

        src.push("uniform int renderPass;");

        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }

        // src.push("uniform sampler2D uOcclusionTexture;"); // chipmunk

        src.push("uniform mediump sampler2D uTexturePerObjectIdPositionsDecodeMatrix;"); // chipmunk
        src.push("uniform lowp usampler2D uTexturePerObjectIdColorsAndFlags;"); // chipmunk
        src.push("uniform highp sampler2D uTexturePerObjectIdOffsets;"); // chipmunk
        src.push("uniform mediump usampler2D uTexturePerVertexIdCoordinates;"); // chipmunk
        src.push("uniform highp usampler2D uTexturePerPolygonIdIndices;"); // chipmunk
        src.push("uniform mediump usampler2D uTexturePerPolygonIdPortionIds;"); // chipmunk
        src.push("uniform highp sampler2D uTextureCameraMatrices;"); // chipmunk
        src.push("uniform highp sampler2D uTextureModelMatrices;"); // chipmunk

        src.push("vec3 positions[3];")

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("bool isPerspectiveMatrix(mat4 m) {");
            src.push("    return (m[2][3] == - 1.0);");
            src.push("}");
            src.push("out float isPerspective;");
        }

        src.push("uniform vec4 lightAmbient;");

        for (let i = 0, len = lightsState.lights.length; i < len; i++) {
            light = lightsState.lights[i];
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
        
        if (clipping) {
            src.push("out vec4 vWorldPosition;");
            src.push("out int vFlags2;");
        }
        
        src.push("out vec4 vColor;");

        src.push("void main(void) {");

        // camera matrices
        src.push ("mat4 viewMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 0), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 0), 0));");
        src.push ("mat4 viewNormalMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 1), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 1), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 1), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 1), 0));");
        src.push ("mat4 projMatrix = mat4 (texelFetch (uTextureCameraMatrices, ivec2(0, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(1, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(2, 2), 0), texelFetch (uTextureCameraMatrices, ivec2(3, 2), 0));");

        // model matrices
        src.push ("mat4 worldMatrix = mat4 (texelFetch (uTextureModelMatrices, ivec2(0, 0), 0), texelFetch (uTextureModelMatrices, ivec2(1, 0), 0), texelFetch (uTextureModelMatrices, ivec2(2, 0), 0), texelFetch (uTextureModelMatrices, ivec2(3, 0), 0));");
        src.push ("mat4 worldNormalMatrix = mat4 (texelFetch (uTextureModelMatrices, ivec2(0, 1), 0), texelFetch (uTextureModelMatrices, ivec2(1, 1), 0), texelFetch (uTextureModelMatrices, ivec2(2, 1), 0), texelFetch (uTextureModelMatrices, ivec2(3, 1), 0));");
        
        // constants
        src.push("int polygonIndex = gl_VertexID / 3;")

        // get packed object-id
        src.push("int h_packed_object_id_index = (polygonIndex >> 3) & 1023;")
        src.push("int v_packed_object_id_index = (polygonIndex >> 3) >> 10;")

        src.push("int objectIndex = int(texelFetch(uTexturePerPolygonIdPortionIds, ivec2(h_packed_object_id_index, v_packed_object_id_index), 0).r);");

        // get flags & flags2
        src.push("uvec4 flags = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(2, objectIndex), 0);"); // chipmunk
        src.push("uvec4 flags2 = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(3, objectIndex), 0);"); // chipmunk
        
        // flags.x = NOT_RENDERED | COLOR_OPAQUE | COLOR_TRANSPARENT
        // renderPass = COLOR_OPAQUE

        src.push(`if (int(flags.x) != renderPass) {`);
        src.push("   gl_Position = vec4(3.0, 3.0, 3.0, 1.0);"); // Cull vertex
        src.push("   return;"); // Cull vertex
        src.push("} else {");

        // get vertex base
        src.push("ivec4 packedVertexBase = ivec4(texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(4, objectIndex), 0));");

        src.push("ivec4 packedIndexBaseOffset = ivec4(texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(5, objectIndex), 0));");

        src.push("int indexBaseOffset = (packedIndexBaseOffset.r << 24) + (packedIndexBaseOffset.g << 16) + (packedIndexBaseOffset.b << 8) + packedIndexBaseOffset.a;");

        src.push("int h_index = (polygonIndex - indexBaseOffset) & 1023;")
        src.push("int v_index = (polygonIndex - indexBaseOffset) >> 10;")

        src.push("ivec3 vertexIndices = ivec3(texelFetch(uTexturePerPolygonIdIndices, ivec2(h_index, v_index), 0));");
        src.push("ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;")
        
        src.push("ivec3 indexPositionH = uniqueVertexIndexes & 1023;")
        src.push("ivec3 indexPositionV = uniqueVertexIndexes >> 10;")

        src.push("mat4 positionsDecodeMatrix = mat4 (texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(0, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(1, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(2, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(3, objectIndex), 0));")
        src.push("mat4 entityMatrix = mat4 (texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(4, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(5, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(6, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(7, objectIndex), 0));")

        src.push("positionsDecodeMatrix = entityMatrix * positionsDecodeMatrix;")
        
        // get position
        src.push("positions[0] = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.r, indexPositionV.r), 0));")
        src.push("positions[1] = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.g, indexPositionV.g), 0));")
        src.push("positions[2] = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.b, indexPositionV.b), 0));")

        // get color
        src.push("uvec4 color = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(0, objectIndex), 0);"); // chipmunk
        
        // get normal
        src.push("vec3 normal = -normalize(cross(positions[2] - positions[0], positions[1] - positions[0]));");

        src.push("vec3 position = positions[gl_VertexID % 3];");
        
        src.push("vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0)); ");

        // get XYZ offset
        src.push("vec3 offset = texelFetch (uTexturePerObjectIdOffsets, ivec2(0, objectIndex), 0).rgb;");

        src.push("worldPosition.xyz = worldPosition.xyz + offset;");

        src.push("vec4 viewPosition = viewMatrix * worldPosition; ");

        src.push("mat4 entityNormalMatrix = mat4 (texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(8, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(9, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(10, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(11, objectIndex), 0));")

        src.push("vec4 worldNormal =  worldNormalMatrix * (vec4(normal, 1) * entityNormalMatrix); ");

        src.push("worldNormalMatrix = entityNormalMatrix * worldNormalMatrix;")


        src.push("vec3 viewNormal = normalize((viewNormalMatrix * worldNormal).xyz);");

        src.push("vec3 reflectedColor = vec3(0.0, 0.0, 0.0);");
        src.push("vec3 viewLightDir = vec3(0.0, 0.0, -1.0);");

        src.push("float lambertian = 1.0;");
        for (let i = 0, len = lightsState.lights.length; i < len; i++) {
            light = lightsState.lights[i];
            if (light.type === "ambient") {
                continue;
            }
            if (light.type === "dir") {
                if (light.space === "view") {
                    src.push("viewLightDir = normalize(lightDir" + i + ");");
                } else {
                    src.push("viewLightDir = normalize((viewMatrix * vec4(lightDir" + i + ", 0.0)).xyz);");
                }
            } else if (light.type === "point") {
                if (light.space === "view") {
                    src.push("viewLightDir = -normalize(lightPos" + i + " - viewPosition.xyz);");
                } else {
                    src.push("viewLightDir = -normalize((viewMatrix * vec4(lightPos" + i + ", 0.0)).xyz);");
                }
            } else if (light.type === "spot") {
                if (light.space === "view") {
                    src.push("viewLightDir = normalize(lightDir" + i + ");");
                } else {
                    src.push("viewLightDir = normalize((viewMatrix * vec4(lightDir" + i + ", 0.0)).xyz);");
                }
            } else {
                continue;
            }
            src.push("lambertian = max(dot(-viewNormal, viewLightDir), 0.0);");
            src.push("reflectedColor += lambertian * (lightColor" + i + ".rgb * lightColor" + i + ".a);");
        }

        src.push("vec3 rgb = vec3(color.rgb) / 255.0;");
        src.push("vColor =  vec4((lightAmbient.rgb * lightAmbient.a * rgb) + (reflectedColor * rgb), float(color.a) / 255.0);");

        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        if (clipping) {
            src.push("vWorldPosition = worldPosition;");
            src.push("vFlags2 = flags2.r;");
        }
        src.push("gl_Position = clipPos;");
        src.push("}");

        src.push("}");

        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push ('#version 300 es');
        src.push("// Triangles dataTexture draw fragment shader");
        src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
        src.push("precision highp float;");
        src.push("precision highp int;");
        src.push("#else");
        src.push("precision mediump float;");
        src.push("precision mediump int;");
        src.push("#endif");

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("in float isPerspective;");
            src.push("uniform float logDepthBufFC;");
            src.push("in float vFragDepth;");
        }

        if (this._withSAO) {
            src.push("uniform sampler2D uOcclusionTexture;");
            src.push("uniform vec4      uSAOParams;");

            src.push("const float       packUpscale = 256. / 255.;");
            src.push("const float       unpackDownScale = 255. / 256.;");
            src.push("const vec3        packFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );");
            src.push("const vec4        unPackFactors = unpackDownScale / vec4( packFactors, 1. );");

            src.push("float unpackRGBToFloat( const in vec4 v ) {");
            src.push("    return dot( v, unPackFactors );");
            src.push("}");
        }
        if (clipping) {
            src.push("in vec4 vWorldPosition;");
            src.push("in int vFlags2;");
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("in vec4 vColor;");
        src.push("out vec4 outColor;");
        src.push("void main(void) {");

        if (clipping) {
            src.push("  bool clippable = vFlags2 > 0;");
            src.push("  if (clippable) {");
            src.push("  float dist = 0.0;");
            for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
                src.push("if (sectionPlaneActive" + i + ") {");
                src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("}");
            }
                src.push("  if (dist > 0.0) { ");
                src.push("      discard;")
                src.push("  }");
            src.push("}");
        }

        if (scene.logarithmicDepthBufferEnabled) {
            // src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
            src.push("    gl_FragDepth = log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }

        if (this._withSAO) {
            // Doing SAO blend in the main solid fill draw shader just so that edge lines can be drawn over the top
            // Would be more efficient to defer this, then render lines later, using same depth buffer for Z-reject
            src.push("   float viewportWidth     = uSAOParams[0];");
            src.push("   float viewportHeight    = uSAOParams[1];");
            src.push("   float blendCutoff       = uSAOParams[2];");
            src.push("   float blendFactor       = uSAOParams[3];");
            src.push("   vec2 uv                 = vec2(gl_FragCoord.x / viewportWidth, gl_FragCoord.y / viewportHeight);");
            src.push("   float ambient           = smoothstep(blendCutoff, 1.0, unpackRGBToFloat(texture2D(uOcclusionTexture, uv))) * blendFactor;");
            src.push("   outColor            = vec4(vColor.rgb * ambient, 1.0);");
        } else {
            src.push("   outColor            = vColor;");
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

export {TrianglesDataTextureColorRenderer};