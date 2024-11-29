import {math} from "../../../math/index.js";
import {isPerspectiveMatrix} from "../../layer/Layer.js";
const tempVec3 = math.vec3();

export const makeDTXRenderingAttributes = function(scene, primitive, subGeometry) {
    const gl = scene.canvas.gl;
    const lazyShaderVariable = function(name) {
        const variable = {
            toString: () => {
                variable.needed = true;
                return name;
            }
        };
        return variable;
    };

    const params = {
        colorA:             lazyShaderVariable("colorA"),
        pickColorA:         lazyShaderVariable("pickColor"),
        uvA:                null,
        metallicRoughnessA: null,
        viewMatrix:         "viewMatrix",
        viewNormal:         lazyShaderVariable("viewNormal"),
        worldNormal:        null,
        worldPosition:      "worldPosition",
        getFlag:            renderPassFlag => `int(flags[${renderPassFlag}])`,
        fragViewMatrix:     null
    };

    const isTriangle = ! subGeometry;

    return {
        isVBO: false,
        signature: "DTX",

        parameters: params,

        getClippable: () => "float(flags2.r)",

        appendVertexDefinitions: (src) => {
            src.push("uniform mat4 sceneModelMatrix;");
            src.push("uniform mat4 viewMatrix;");
            src.push("uniform mat4 projMatrix;");

            src.push("uniform highp   sampler2D  uObjectPerObjectPositionsDecodeMatrix;");
            src.push("uniform highp   sampler2D  uTexturePerObjectMatrix;");
            src.push("uniform lowp    usampler2D uObjectPerObjectColorsAndFlags;");
            src.push("uniform mediump usampler2D uTexturePerVertexIdCoordinates;");
            src.push("uniform highp   usampler2D uTexturePerPrimitiveIdIndices;");
            src.push("uniform mediump usampler2D uTexturePerPrimitiveIdPortionIds;");
            if (isTriangle) {
                src.push("uniform vec3 uCameraEyeRtc;");
            }
        },

        appendVertexData: (src, afterFlagsColorLines) => {
            // constants
            src.push("int primitiveIndex = gl_VertexID / " + (isTriangle ? 3 : 2) + ";");

            // get packed object-id
            src.push("int h_packed_object_id_index = (primitiveIndex >> 3) & 4095;");
            src.push("int v_packed_object_id_index = (primitiveIndex >> 3) >> 12;");

            src.push("int objectIndex = int(texelFetch(uTexturePerPrimitiveIdPortionIds, ivec2(h_packed_object_id_index, v_packed_object_id_index), 0).r);");
            src.push("ivec2 objectIndexCoords = ivec2(objectIndex % 512, objectIndex / 512);");

            // get flags & flags2
            src.push("uvec4 flags = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+2, objectIndexCoords.y), 0);");
            src.push("uvec4 flags2 = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+3, objectIndexCoords.y), 0);");

            if (params.colorA.needed) {
                src.push(`vec4 ${params.colorA} = vec4(texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+0, objectIndexCoords.y), 0)) / 255.0;`);
            }

            afterFlagsColorLines.forEach(line => src.push(line));

            src.push("mat4 objectInstanceMatrix = mat4 (texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uTexturePerObjectMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));");
            src.push("mat4 objectDecodeAndInstanceMatrix = objectInstanceMatrix * mat4 (texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+0, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+1, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+2, objectIndexCoords.y), 0), texelFetch (uObjectPerObjectPositionsDecodeMatrix, ivec2(objectIndexCoords.x*4+3, objectIndexCoords.y), 0));");

            src.push("ivec4 packedVertexBase = ivec4(texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+4, objectIndexCoords.y), 0));");
            src.push("ivec4 packedIndexBaseOffset = ivec4(texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+" + (isTriangle ? 5 : 6) + ", objectIndexCoords.y), 0));");
            src.push("int indexBaseOffset = (packedIndexBaseOffset.r << 24) + (packedIndexBaseOffset.g << 16) + (packedIndexBaseOffset.b << 8) + packedIndexBaseOffset.a;");

            src.push("int h_index = (primitiveIndex - indexBaseOffset) & 4095;");
            src.push("int v_index = (primitiveIndex - indexBaseOffset) >> 12;");

            src.push("ivec3 vertexIndices = ivec3(texelFetch(uTexturePerPrimitiveIdIndices, ivec2(h_index, v_index), 0));");
            src.push("ivec3 uniqueVertexIndexes = vertexIndices + (packedVertexBase.r << 24) + (packedVertexBase.g << 16) + (packedVertexBase.b << 8) + packedVertexBase.a;");

            if (isTriangle) {
                src.push("ivec3 indexPositionH = uniqueVertexIndexes & 4095;");
                src.push("ivec3 indexPositionV = uniqueVertexIndexes >> 12;");
                src.push("uint solid = texelFetch (uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+7, objectIndexCoords.y), 0).r;");
                src.push("vec3 positions[] = vec3[](");
                src.push("  vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.r, indexPositionV.r), 0)),");
                src.push("  vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.g, indexPositionV.g), 0)),");
                src.push("  vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH.b, indexPositionV.b), 0)));");
                src.push("vec3 normal = normalize(cross(positions[2] - positions[0], positions[1] - positions[0]));");
                src.push("vec3 position = positions[gl_VertexID % 3];");
                if (params.viewNormal.needed) {
                    src.push("vec3 viewNormal = -normalize((transpose(inverse(viewMatrix*objectDecodeAndInstanceMatrix)) * vec4(normal,1)).xyz);");
                }
                // when the geometry is not solid, if needed, flip the triangle winding
                src.push("if (solid != 1u) {");
                src.push(`  if (${isPerspectiveMatrix("projMatrix")}) {`);
                src.push("      vec3 uCameraEyeRtcInQuantizedSpace = (inverse(sceneModelMatrix * objectDecodeAndInstanceMatrix) * vec4(uCameraEyeRtc, 1)).xyz;");
                src.push("      if (dot(position.xyz - uCameraEyeRtcInQuantizedSpace, normal) < 0.0) {");
                src.push("          position = positions[2 - (gl_VertexID % 3)];");
                if (params.viewNormal.needed) {
                    src.push("          viewNormal = -viewNormal;");
                }
                src.push("      }");
                src.push("  } else {");
                if (!params.viewNormal.needed) {
                    src.push("      vec3 viewNormal = -normalize((transpose(inverse(viewMatrix*objectDecodeAndInstanceMatrix)) * vec4(normal,1)).xyz);");
                }
                src.push("      if (viewNormal.z < 0.0) {");
                src.push("          position = positions[2 - (gl_VertexID % 3)];");
                if (params.viewNormal.needed) {
                    src.push("          viewNormal = -viewNormal;");
                }
                src.push("      }");
                src.push("  }");
                src.push("}");
            } else {
                src.push("int indexPositionH = uniqueVertexIndexes[gl_VertexID % 2] & 4095;");
                src.push("int indexPositionV = uniqueVertexIndexes[gl_VertexID % 2] >> 12;");
                src.push("vec3 position = vec3(texelFetch(uTexturePerVertexIdCoordinates, ivec2(indexPositionH, indexPositionV), 0));");
            }

            if (params.pickColorA.needed) {
                // TODO: Normalize color "/ 255.0"?
                src.push("vec4 pickColor = vec4(texelFetch(uObjectPerObjectColorsAndFlags, ivec2(objectIndexCoords.x*8+1, objectIndexCoords.y), 0));");
            }

            src.push("vec4 worldPosition = sceneModelMatrix * (objectDecodeAndInstanceMatrix * vec4(position, 1.0));");
        },

        appendFragmentDefinitions: (src) => { },

        makeDrawCall: function(program) {
            const uSceneModelMatrix = program.getLocation("sceneModelMatrix");
            const uViewMatrix = program.getLocation("viewMatrix");
            const uProjMatrix = program.getLocation("projMatrix");
            const uCameraEyeRtc = isTriangle && program.getLocation("uCameraEyeRtc");

            const uTexturePerObjectPositionsDecodeMatrix = "uObjectPerObjectPositionsDecodeMatrix";
            const uTexturePerVertexIdCoordinates = "uTexturePerVertexIdCoordinates";
            const uTexturePerObjectColorsAndFlags = "uObjectPerObjectColorsAndFlags";
            const uTexturePerObjectMatrix = "uTexturePerObjectMatrix";
            const uTexturePerPrimitiveIdPortionIds = "uTexturePerPrimitiveIdPortionIds";
            const uTexturePerPrimitiveIdIndices = "uTexturePerPrimitiveIdIndices";

            return function(frameCtx, layer, sceneModelMat, viewMatrix, projMatrix, rtcOrigin, eye) {
                gl.uniformMatrix4fv(uSceneModelMatrix, false, sceneModelMat);
                gl.uniformMatrix4fv(uViewMatrix,       false, viewMatrix);
                gl.uniformMatrix4fv(uProjMatrix,       false, projMatrix);
                if (isTriangle) {
                    gl.uniform3fv(uCameraEyeRtc, math.subVec3(eye, rtcOrigin, tempVec3));
                }

                (subGeometry ? layer.drawEdges : layer.drawTriangles)(
                    program,
                    uTexturePerObjectPositionsDecodeMatrix,
                    uTexturePerVertexIdCoordinates,
                    uTexturePerObjectColorsAndFlags,
                    uTexturePerObjectMatrix,
                    uTexturePerPrimitiveIdPortionIds,
                    uTexturePerPrimitiveIdIndices,
                    subGeometry ? (subGeometry.vertices ? gl.POINTS : gl.LINES) : gl.TRIANGLES);
            };
        }
    };
};
