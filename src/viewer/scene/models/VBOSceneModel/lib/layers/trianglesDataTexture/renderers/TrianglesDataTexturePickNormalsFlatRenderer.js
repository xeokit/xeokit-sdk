import {Program} from "../../../../../../webgl/Program.js";
import {createRTCViewMat, getPlaneRTCPos} from "../../../../../../math/rtcCoords.js";
import {math} from "../../../../../../math/math.js";
import {WEBGL_INFO} from "../../../../../../webglInfo.js";

const tempVec3a = math.vec3();

/**
 * @private
 */
class TrianglesDataTexturePickNormalsFlatRenderer {

    constructor(scene) {
        this._scene = scene;
        this._hash = this._getHash();
        this._allocate();
    }

    getValid() {
        return this._hash === this._getHash();
    };

    _getHash() {
        return this._scene._sectionPlanesState.getHash();
    }

    drawLayer(frameCtx, dataTextureLayer, renderPass) {
        const model = dataTextureLayer.model;
        const scene = model.scene;
        const camera = scene.camera;
        const gl = scene.canvas.gl;
        const state = dataTextureLayer._state;
        const origin = dataTextureLayer._state.origin;

        if (!this._program) {
            this._allocate(dataTextureLayer);
        }

        if (frameCtx.lastProgramId !== this._program.id) {
            frameCtx.lastProgramId = this._program.id;
            this._bindProgram();
        }

        var rr = this._program.bindTexture(
            this._uTexturePerObjectIdPositionsDecodeMatrix, 
            {
                bind: function (unit) {
                    gl.activeTexture(gl["TEXTURE" + unit]);
                    gl.bindTexture(gl.TEXTURE_2D, state.texturePerObjectIdPositionsDecodeMatrix);
                    return true;
                },
                unbind: function (unit) {
                    gl.activeTexture(gl["TEXTURE" + unit]);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
            },
            1
        ); // chipmunk

        var rr2 = this._program.bindTexture(
            this._uTexturePerVertexIdCoordinates, 
            {
                bind: function (unit) {
                    gl.activeTexture(gl["TEXTURE" + unit]);
                    gl.bindTexture(gl.TEXTURE_2D, state.texturePerVertexIdCoordinates);
                    return true;
                },
                unbind: function (unit) {
                    gl.activeTexture(gl["TEXTURE" + unit]);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
            },
            2
        ); // chipmunk

        var rr3 = this._program.bindTexture(
            this._uTexturePerObjectIdColorsAndFlags,
            {
                bind: function (unit) {
                    gl.activeTexture(gl["TEXTURE" + unit]);
                    gl.bindTexture(gl.TEXTURE_2D, state.texturePerObjectIdColorsAndFlags);
                    return true;
                },
                unbind: function (unit) {
                    gl.activeTexture(gl["TEXTURE" + unit]);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
            },
            3
        ); // chipmunk

        gl.uniform1i(this._uRenderPass, renderPass);
        gl.uniform1i(this._uPickInvisible, frameCtx.pickInvisible);

        gl.uniformMatrix4fv(this._uWorldMatrix, false, model.worldMatrix);

        const pickViewMatrix = frameCtx.pickViewMatrix || camera.viewMatrix;
        const viewMatrix = origin ? createRTCViewMat(pickViewMatrix, origin) : pickViewMatrix;

        gl.uniformMatrix4fv(this._uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(this._uProjMatrix, false, frameCtx.pickProjMatrix);

        if (scene.logarithmicDepthBufferEnabled) {
            const logDepthBufFC = 2.0 / (Math.log(camera.project.far + 1.0) / Math.LN2);  // TODO: Far should be from projection matrix?
            gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
        }

        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const baseIndex = dataTextureLayer.layerIndex * numSectionPlanes;
            const renderFlags = model.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
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

        //=============================================================
        // TODO: Use drawElements count and offset to draw only one entity
        //=============================================================

        if (state.numIndices8Bits > 0) {
            var rr4 = this._program.bindTexture(
                this._uTexturePerPolygonIdPortionIds, 
                {
                    bind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, state.texturePerPolygonIdPortionIds8Bits);
                        return true;
                    },
                    unbind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                    }
                },
                4
            ); // chipmunk
    
            var rr5 = this._program.bindTexture(
                this._uTexturePerPolygonIdIndices, 
                {
                    bind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, state.texturePerPolygonIdIndices8Bits);
                        return true;
                    },
                    unbind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                    }
                },
                5
            ); // chipmunk

            gl.drawArrays(gl.TRIANGLES, 0, state.numIndices8Bits);
        }

        if (state.numIndices16Bits > 0) {
            var rr4 = this._program.bindTexture(
                this._uTexturePerPolygonIdPortionIds, 
                {
                    bind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, state.texturePerPolygonIdPortionIds16Bits);
                        return true;
                    },
                    unbind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                    }
                },
                4
            ); // chipmunk
    
            var rr5 = this._program.bindTexture(
                this._uTexturePerPolygonIdIndices, 
                {
                    bind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, state.texturePerPolygonIdIndices16Bits);
                        return true;
                    },
                    unbind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                    }
                },
                5
            ); // chipmunk

            gl.drawArrays(gl.TRIANGLES, 0, state.numIndices16Bits);
        }

        if (state.numIndices32Bits > 0) {
            var rr4 = this._program.bindTexture(
                this._uTexturePerPolygonIdPortionIds, 
                {
                    bind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, state.texturePerPolygonIdPortionIds32Bits);
                        return true;
                    },
                    unbind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                    }
                },
                4
            ); // chipmunk
    
            var rr5 = this._program.bindTexture(
                this._uTexturePerPolygonIdIndices, 
                {
                    bind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, state.texturePerPolygonIdIndices32Bits);
                        return true;
                    },
                    unbind: function (unit) {
                        gl.activeTexture(gl["TEXTURE" + unit]);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                    }
                },
                5
            ); // chipmunk

            gl.drawArrays(gl.TRIANGLES, 0, state.numIndices32Bits);
        }


        frameCtx.drawElements++;
    }

    _allocate() {

        const scene = this._scene;
        const gl = scene.canvas.gl;

        this._program = new Program(gl, this._buildShader());

        if (this._program.errors) {
            this.errors = this._program.errors;
            return;
        }

        const program = this._program;

        this._uRenderPass = program.getLocation("renderPass");
        this._uPickInvisible = program.getLocation("pickInvisible");
        this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
        this._uWorldMatrix = program.getLocation("worldMatrix");
        this._uViewMatrix = program.getLocation("viewMatrix");
        this._uProjMatrix = program.getLocation("projMatrix");
        this._uSectionPlanes = [];

        for (let i = 0, len = scene._sectionPlanesState.sectionPlanes.length; i < len; i++) {
            this._uSectionPlanes.push({
                active: program.getLocation("sectionPlaneActive" + i),
                pos: program.getLocation("sectionPlanePos" + i),
                dir: program.getLocation("sectionPlaneDir" + i)
            });
        }

        this._aPackedVertexId = program.getAttribute("packedVertexId");


        if (scene.logarithmicDepthBufferEnabled) {
            this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
        }

        this._uTexturePerObjectIdPositionsDecodeMatrix = "uTexturePerObjectIdPositionsDecodeMatrix"; // chipmunk
        this._uTexturePerObjectIdColorsAndFlags = "uTexturePerObjectIdColorsAndFlags"; // chipmunk
        this._uTexturePerVertexIdCoordinates = "uTexturePerVertexIdCoordinates"; // chipmunk
        this._uTexturePerPolygonIdNormals = "uTexturePerPolygonIdNormals"; // chipmunk
        this._uTexturePerPolygonIdIndices = "uTexturePerPolygonIdIndices"; // chipmunk
        this._uTexturePerPolygonIdPortionIds = "uTexturePerPolygonIdPortionIds"; // chipmunk
    }

    _bindProgram() {
        this._program.bind();
    }

    _buildShader() {
        return {
            vertex: this._buildVertexShader(),
            fragment: this._buildFragmentShader()
        };
    }

    _buildVertexShader() {
        const scene = this._scene;
        const clipping = scene._sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push("#version 300 es");
        src.push("// Triangles dataTexture pick flat normals vertex shader");

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

        src.push("in uvec3 packedVertexId;");

        if (scene.entityOffsetsEnabled) {
            src.push("in vec3 offset;");
        }

        src.push("uniform bool pickInvisible;");
        src.push("uniform mat4 worldMatrix;");
        src.push("uniform mat4 viewMatrix;");
        src.push("uniform mat4 projMatrix;");
        // src.push("uniform sampler2D uOcclusionTexture;"); // chipmunk
        src.push("uniform sampler2D uTexturePerObjectIdPositionsDecodeMatrix;"); // chipmunk
        src.push("uniform usampler2D uTexturePerObjectIdColorsAndFlags;"); // chipmunk
        src.push("uniform usampler2D uTexturePerVertexIdCoordinates;"); // chipmunk
        src.push("uniform usampler2D uTexturePerPolygonIdIndices;"); // chipmunk
        src.push("uniform isampler2D uTexturePerPolygonIdNormals;"); // chipmunk
        src.push("uniform usampler2D uTexturePerPolygonIdPortionIds;"); // chipmunk

        if (scene.logarithmicDepthBufferEnabled) {
            src.push("uniform float logDepthBufFC;");
            src.push("out float vFragDepth;");
            src.push("bool isPerspectiveMatrix(mat4 m) {");
            src.push("    return (m[2][3] == - 1.0);");
            src.push("}");
            src.push("out float isPerspective;");
        }
        src.push("out vec4 vWorldPosition;");
        if (clipping) {
            src.push("out int vFlags2;");
        }
        src.push("void main(void) {");

        // constants
        // src.push("int objectIndex = int(packedVertexId.g) & 1023;");
        src.push("int polygonIndex = gl_VertexID / 3;")

        src.push("int h_normal_index = polygonIndex & 1023;")
        src.push("int v_normal_index = polygonIndex >> 10;")

        // get packed object-id
        src.push("int h_packed_object_id_index = ((polygonIndex >> 3) / 2) & 1023;")
        src.push("int v_packed_object_id_index = ((polygonIndex >> 3) / 2) >> 10;")

        src.push("ivec3 packedObjectId = ivec3(texelFetch(uTexturePerPolygonIdPortionIds, ivec2(h_packed_object_id_index, v_packed_object_id_index), 0).rgb);");

        src.push("int objectIndex;")
        src.push("if (((polygonIndex >> 3) % 2) == 0) {")
        src.push("  objectIndex = (packedObjectId.r << 4) + (packedObjectId.g >> 4);")
        src.push("} else {") 
        src.push("  objectIndex = ((packedObjectId.g & 15) << 8) + packedObjectId.b;")
        src.push("}")

        // get vertex base
        src.push("ivec4 packedVertexBase = ivec4(texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(4, objectIndex), 0));"); // chipmunk

        src.push("int h_index = polygonIndex & 1023;")
        src.push("int v_index = polygonIndex >> 10;")

        src.push("ivec3 vertexIndices = ivec3(texelFetch(uTexturePerPolygonIdIndices, ivec2(h_index, v_index), 0));");
        src.push("ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;")
        
        src.push("ivec3 indexPositionH = uniqueVertexIndexes & 1023;")
        src.push("ivec3 indexPositionV = uniqueVertexIndexes >> 10;")

        src.push("mat4 positionsDecodeMatrix = mat4 (texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(0, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(1, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(2, objectIndex), 0), texelFetch (uTexturePerObjectIdPositionsDecodeMatrix, ivec2(3, objectIndex), 0));")

        // get flags & flags2
        src.push("uvec4 flags = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(2, objectIndex), 0);"); // chipmunk
        src.push("uvec4 flags2 = texelFetch (uTexturePerObjectIdColorsAndFlags, ivec2(3, objectIndex), 0);"); // chipmunk
        
        // get position
        src.push("vec3 position1 = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.r, indexPositionV.r), 0));")
        src.push("vec3 position2 = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.g, indexPositionV.g), 0));")
        src.push("vec3 position3 = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.b, indexPositionV.b), 0));")

        // get normal
        src.push("vec3 normal = normalize(cross(position3 - position1, position2 - position1));");

        src.push("int vertexNumber = gl_VertexID % 3;");
        src.push("vec3 position;");
        src.push("if (vertexNumber == 0) position = position1;");
        src.push("else if (vertexNumber == 1) position = position2;");
        src.push("else position = position3;");

        // flags.w = NOT_RENDERED | PICK
        // renderPass = PICK
        src.push(`if (int(flags.w) != renderPass) {`);
        src.push("      gl_Position = vec4(0.0, 0.0, 0.0, 0.0);"); // Cull vertex
        src.push("  } else {");
        src.push("      vec4 worldPosition = worldMatrix * (positionsDecodeMatrix * vec4(position, 1.0)); ");
        if (scene.entityOffsetsEnabled) {
            src.push("      worldPosition.xyz = worldPosition.xyz + offset;");
        }
        src.push("      vec4 viewPosition  = viewMatrix * worldPosition; ");
        src.push("      vWorldPosition = worldPosition;");
        if (clipping) {
            src.push("      vFlags2 = flags2.r;");
        }
        src.push("vec4 clipPos = projMatrix * viewPosition;");
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("vFragDepth = 1.0 + clipPos.w;");
            src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
        }
        src.push("gl_Position = clipPos;");
        src.push("  }");
        src.push("}");
        return src;
    }

    _buildFragmentShader() {
        const scene = this._scene;
        const sectionPlanesState = scene._sectionPlanesState;
        const clipping = sectionPlanesState.sectionPlanes.length > 0;
        const src = [];
        src.push ('#version 300 es');
        src.push("// Triangles dataTexture pick flat normals fragment shader");
        src.push("#extension GL_OES_standard_derivatives : enable");
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("#extension GL_EXT_frag_depth : enable");
        }
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
        src.push("in vec4 vWorldPosition;");
        if (clipping) {
            src.push("in int vFlags2;");
            for (var i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
                src.push("uniform bool sectionPlaneActive" + i + ";");
                src.push("uniform vec3 sectionPlanePos" + i + ";");
                src.push("uniform vec3 sectionPlaneDir" + i + ";");
            }
        }
        src.push("out vec4 outNormal;");
        src.push("void main(void) {");
        if (clipping) {
            src.push("  bool clippable = vFlags2 > 0;");
            src.push("  if (clippable) {");
            src.push("      float dist = 0.0;");
            for (var i = 0; i < sectionPlanesState.sectionPlanes.length; i++) {
                src.push("      if (sectionPlaneActive" + i + ") {");
                src.push("          dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
                src.push("      }");
            }
            src.push("      if (dist > 0.0) { discard; }");
            src.push("  }");
        }
        if (scene.logarithmicDepthBufferEnabled) {
            src.push("    gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
        }
        src.push("  vec3 xTangent = dFdx( vWorldPosition.xyz );");
        src.push("  vec3 yTangent = dFdy( vWorldPosition.xyz );");
        src.push("  vec3 worldNormal = normalize( cross( xTangent, yTangent ) );");
        src.push("  outNormal = vec4((worldNormal * 0.5) + 0.5, 1.0);");
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

export {TrianglesDataTexturePickNormalsFlatRenderer};