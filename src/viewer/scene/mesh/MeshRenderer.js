export function MeshRenderer(programSetup, mesh) {
    return {
        vertex:   buildVertex(programSetup, mesh),
        fragment: buildFragment(programSetup, mesh)
    };
}

function buildVertex(programSetup, mesh) {
    const scene = mesh.scene;
    const clipping = scene._sectionPlanesState.getNumAllocatedSectionPlanes() > 0;
    const quantizedGeometry = !!mesh._geometry._state.compressGeometry;
    const billboard = mesh._state.billboard;
    const isBillboard = (! programSetup.dontBillboardAnything) && ((billboard === "spherical") || (billboard === "cylindrical"));
    const stationary = mesh._state.stationary;
    const getLogDepth = (! programSetup.dontGetLogDepth) && scene.logarithmicDepthBufferEnabled;
    const src = [];
    src.push("#version 300 es");
    src.push("// " + programSetup.programName + " vertex shader");
    src.push("in vec3 position;");
    src.push("uniform mat4 modelMatrix;");
    src.push("uniform mat4 viewMatrix;");
    src.push("uniform mat4 projMatrix;");
    src.push("uniform vec3 offset;");
    src.push("uniform vec3 scale;");
    if (quantizedGeometry) {
        src.push("uniform mat4 positionsDecodeMatrix;");
    }
    if (getLogDepth) {
        src.push("uniform float logDepthBufFC;");
        src.push("out float vFragDepth;");
        src.push("bool isPerspectiveMatrix(mat4 m) {");
        src.push("    return (m[2][3] == - 1.0);");
        src.push("}");
        src.push("out float isPerspective;");
    }
    if (clipping) {
        src.push("out vec4 vWorldPosition;");
    }
    if (isBillboard) {
        src.push("void billboard(inout mat4 mat) {");
        src.push("   mat[0][0] = scale[0];");
        src.push("   mat[0][1] = 0.0;");
        src.push("   mat[0][2] = 0.0;");
        if (billboard === "spherical") {
            src.push("   mat[1][0] = 0.0;");
            src.push("   mat[1][1] = scale[1];");
            src.push("   mat[1][2] = 0.0;");
        }
        src.push("   mat[2][0] = 0.0;");
        src.push("   mat[2][1] = 0.0;");
        src.push("   mat[2][2] =1.0;");
        src.push("}");
    }
    programSetup.appendVertexDefinitions && programSetup.appendVertexDefinitions(src);
    src.push("void main(void) {");
    src.push("vec4 localPosition = vec4(position, 1.0); ");
    if (quantizedGeometry) {
        src.push("localPosition = positionsDecodeMatrix * localPosition;");
    }
    if (programSetup.dontBillboardAnything) {
        src.push("vec4 worldPosition = modelMatrix * localPosition;");
        src.push("worldPosition.xyz = worldPosition.xyz + offset;");
        src.push("vec4 viewPosition = viewMatrix * worldPosition;");
    } else {
        src.push("mat4 viewMatrix2 = viewMatrix;");
        src.push("mat4 modelMatrix2 = modelMatrix;");
        if (stationary) {
            src.push("viewMatrix2[3][0] = viewMatrix2[3][1] = viewMatrix2[3][2] = 0.0;");
        } else if (programSetup.meshStateBackground) {
            src.push("viewMatrix2[3] = vec4(0.0, 0.0, 0.0 ,1.0);");
        }
        if (isBillboard) {
            src.push("mat4 modelViewMatrix = viewMatrix2 * modelMatrix2;");
            src.push("billboard(modelMatrix2);");
            src.push("billboard(viewMatrix2);");
        }
        src.push("vec4 worldPosition = modelMatrix2 * localPosition;");
        src.push("worldPosition.xyz = worldPosition.xyz + offset;");
        if (isBillboard) {
            src.push("billboard(modelViewMatrix);");
            src.push("vec4 viewPosition = modelViewMatrix * localPosition;");
        } else {
            src.push("vec4 viewPosition = viewMatrix2 * worldPosition;");
        }
    }
    programSetup.appendVertexOutputs && programSetup.appendVertexOutputs(src);
    if (clipping) {
        src.push("vWorldPosition = worldPosition;");
    }
    src.push("vec4 clipPos = projMatrix * viewPosition;");
    if (getLogDepth) {
        src.push("vFragDepth = 1.0 + clipPos.w;");
        src.push("isPerspective = float (isPerspectiveMatrix(projMatrix));");
    }
    src.push("gl_Position = " + (programSetup.transformClipPos ? programSetup.transformClipPos("clipPos") : "clipPos") + ";");
    src.push("}");
    return src;
};

function buildFragment(programSetup, mesh) {
    const scene = mesh.scene;
    const numAllocatedSectionPlanes = scene._sectionPlanesState.getNumAllocatedSectionPlanes();
    const clipping = numAllocatedSectionPlanes > 0;
    const getLogDepth = (! programSetup.dontGetLogDepth) && scene.logarithmicDepthBufferEnabled;
    const src = [];
    src.push("#version 300 es");
    src.push("// " + programSetup.programName + " fragment shader");
    src.push("#ifdef GL_FRAGMENT_PRECISION_HIGH");
    src.push("precision highp float;");
    src.push("precision highp int;");
    src.push("#else");
    src.push("precision mediump float;");
    src.push("precision mediump int;");
    src.push("#endif");
    if (getLogDepth) {
        src.push("in float isPerspective;");
        src.push("uniform float logDepthBufFC;");
        src.push("in float vFragDepth;");
    }
    if (clipping) {
        src.push("in vec4 vWorldPosition;");
        src.push("uniform bool clippable;");
        for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
            src.push("uniform bool sectionPlaneActive" + i + ";");
            src.push("uniform vec3 sectionPlanePos" + i + ";");
            src.push("uniform vec3 sectionPlaneDir" + i + ";");
        }
    }
    programSetup.appendFragmentDefinitions(src);
    src.push("void main(void) {");
    if (clipping) {
        src.push("if (clippable) {");
        src.push("  float dist = 0.0;");
        for (let i = 0, len = numAllocatedSectionPlanes; i < len; i++) {
            src.push("if (sectionPlaneActive" + i + ") {");
            src.push("   dist += clamp(dot(-sectionPlaneDir" + i + ".xyz, vWorldPosition.xyz - sectionPlanePos" + i + ".xyz), 0.0, 1000.0);");
            src.push("}");
        }
        src.push("  if (dist > 0.0) { discard; }");
        src.push("}");
    }
    programSetup.appendFragmentOutputs(src, "vWorldPosition", "gl_FragCoord");
    if (getLogDepth) {
        src.push("gl_FragDepth = isPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;");
    }
    src.push("}");
    return src;
};
