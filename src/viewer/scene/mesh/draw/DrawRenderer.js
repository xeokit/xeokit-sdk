/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {MeshRenderer} from "../MeshRenderer.js";
import {Map} from "../../utils/Map.js";
import {DrawShaderSource} from "./DrawShaderSource.js";
import {LambertShaderSource} from "./LambertShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {stats} from '../../stats.js';
import {WEBGL_INFO} from '../../webglInfo.js';
import {math} from "../../math/math.js";
import {getPlaneRTCPos} from "../../math/rtcCoords.js";

const tempVec3a = math.vec3();

const ids = new Map({});

/**
 * @private
 */
const DrawRenderer = function (hash, mesh) {
    this.id = ids.addItem({});
    this._hash = hash;
    this._scene = mesh.scene;
    this._useCount = 0;
    if (mesh._material._state.type === "LambertMaterial")
        this._programSetup = LambertShaderSource(mesh);
    else
        this._shaderSource = new DrawShaderSource(mesh);
    this._allocate(mesh);
};

const drawRenderers = {};

DrawRenderer.get = function (mesh) {
    const scene = mesh.scene;
    const hash = [
        scene.canvas.canvas.id,
        scene.gammaOutput ? "go" : "",
        scene._lightsState.getHash(),
        scene._sectionPlanesState.getHash(),
        mesh._geometry._state.hash,
        mesh._material._state.hash,
        mesh._state.drawHash
    ].join(";");
    let renderer = drawRenderers[hash];
    if (!renderer) {
        renderer = new DrawRenderer(hash, mesh);
        if (renderer.errors) {
            console.log(renderer.errors.join("\n"));
            return null;
        }
        drawRenderers[hash] = renderer;
        stats.memory.programs++;
    }
    renderer._useCount++;
    return renderer;
};

DrawRenderer.prototype.put = function () {
    if (--this._useCount === 0) {
        ids.removeItem(this.id);
        if (this._program) {
            this._program.destroy();
        }
        delete drawRenderers[this._hash];
        stats.memory.programs--;
    }
};

DrawRenderer.prototype.webglContextRestored = function () {
    this._program = null;
};

DrawRenderer.prototype.drawMesh = function (frameCtx, mesh) {

    if (!this._program) {
        this._allocate(mesh);
    }

    const maxTextureUnits = WEBGL_INFO.MAX_TEXTURE_UNITS;
    const scene = mesh.scene;
    const material = mesh._material;
    const gl = scene.canvas.gl;
    const program = this._program;
    const meshState = mesh._state;
    const materialState = mesh._material._state;
    const geometryState = mesh._geometry._state;
    const camera = scene.camera;
    const origin = mesh.origin;
    const background = meshState.background;

    if (frameCtx.lastProgramId !== this._program.id) {
        frameCtx.lastProgramId = this._program.id;
        if (background) {
            gl.depthFunc(gl.LEQUAL);
        }
        this._bindProgram(frameCtx);
    }

    gl.uniformMatrix4fv(this._uViewMatrix, false, origin ? frameCtx.getRTCViewMatrix(meshState.originHash, origin) : camera.viewMatrix);
    gl.uniformMatrix4fv(this._uViewNormalMatrix, false, camera.viewNormalMatrix);

    if (meshState.clippable) {
        const numAllocatedSectionPlanes = scene._sectionPlanesState.getNumAllocatedSectionPlanes();
        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numAllocatedSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const renderFlags = mesh.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numAllocatedSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    if (sectionPlaneIndex < numSectionPlanes) {
                        const active = renderFlags.sectionPlanesActivePerLayer[sectionPlaneIndex];
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
                    } else {
                        gl.uniform1i(sectionPlaneUniforms.active, 0);
                    }
                }
            }
        }
    }

    if (materialState.id !== this._lastMaterialId) {

        frameCtx.textureUnit = this._baseTextureUnit;

        const backfaces = materialState.backfaces;
        if (frameCtx.backfaces !== backfaces) {
            if (backfaces) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }
            frameCtx.backfaces = backfaces;
        }

        const frontface = materialState.frontface;
        if (frameCtx.frontface !== frontface) {
            if (frontface) {
                gl.frontFace(gl.CCW);
            } else {
                gl.frontFace(gl.CW);
            }
            frameCtx.frontface = frontface;
        }

        if (frameCtx.lineWidth !== materialState.lineWidth) {
            gl.lineWidth(materialState.lineWidth);
            frameCtx.lineWidth = materialState.lineWidth;
        }

        if (this._uPointSize) {
            gl.uniform1f(this._uPointSize, materialState.pointSize);
        }

        this._binders.forEach(b => b(frameCtx, material));

        this._lastMaterialId = materialState.id;
    }

    gl.uniformMatrix4fv(this._uModelMatrix, gl.FALSE, mesh.worldMatrix);
    if (this._uModelNormalMatrix) {
        gl.uniformMatrix4fv(this._uModelNormalMatrix, gl.FALSE, mesh.worldNormalMatrix);
    }

    if (this._uClippable) {
        gl.uniform1i(this._uClippable, meshState.clippable);
    }

    if (this._uColorize) {
        const colorize = meshState.colorize;
        const lastColorize = this._lastColorize;
        if (lastColorize[0] !== colorize[0] ||
            lastColorize[1] !== colorize[1] ||
            lastColorize[2] !== colorize[2] ||
            lastColorize[3] !== colorize[3]) {
            gl.uniform4fv(this._uColorize, colorize);
            lastColorize[0] = colorize[0];
            lastColorize[1] = colorize[1];
            lastColorize[2] = colorize[2];
            lastColorize[3] = colorize[3];
        }
    }

    gl.uniform3fv(this._uOffset, meshState.offset);
    gl.uniform3fv(this._uScale, mesh.scale);

    // Bind VBOs

    if (geometryState.id !== this._lastGeometryId) {
        if (this._uPositionsDecodeMatrix) {
            gl.uniformMatrix4fv(this._uPositionsDecodeMatrix, false, geometryState.positionsDecodeMatrix);
        }
        if (this._uUVDecodeMatrix) {
            gl.uniformMatrix3fv(this._uUVDecodeMatrix, false, geometryState.uvDecodeMatrix);
        }
        if (this._aPosition) {
            this._aPosition.bindArrayBuffer(geometryState.positionsBuf);
            frameCtx.bindArray++;
        }
        if (this._aNormal) {
            this._aNormal.bindArrayBuffer(geometryState.normalsBuf);
            frameCtx.bindArray++;
        }
        if (this._aUV) {
            this._aUV.bindArrayBuffer(geometryState.uvBuf);
            frameCtx.bindArray++;
        }
        if (this._aColor) {
            this._aColor.bindArrayBuffer(geometryState.colorsBuf);
            frameCtx.bindArray++;
        }
        if (geometryState.indicesBuf) {
            geometryState.indicesBuf.bind();
            frameCtx.bindArray++;
        }
        this._lastGeometryId = geometryState.id;
    }

    // Draw (indices bound in prev step)

    if (geometryState.indicesBuf) {
        gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
        frameCtx.drawElements++;
    } else if (geometryState.positionsBuf) {
        gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
        frameCtx.drawArrays++;
    }

    if (background) {
        gl.depthFunc(gl.LESS);
    }
};

DrawRenderer.prototype._allocate = function (mesh) {
    const scene = mesh.scene;
    const gl = scene.canvas.gl;
    const material = mesh._material;
    const lightsState = scene._lightsState;
    const sectionPlanesState = scene._sectionPlanesState;
    const materialState = mesh._material._state;

    if (this._programSetup) {
        this._program = new Program(gl, MeshRenderer(this._programSetup, mesh));
    } else {
        this._program = new Program(gl, this._shaderSource);
    }
    if (this._program.errors) {
        this.errors = this._program.errors;
        return;
    }
    const program = this._program;
    this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
    this._uUVDecodeMatrix = program.getLocation("uvDecodeMatrix");
    this._uModelMatrix = program.getLocation("modelMatrix");
    this._uModelNormalMatrix = program.getLocation("modelNormalMatrix");
    this._uViewMatrix = program.getLocation("viewMatrix");
    this._uViewNormalMatrix = program.getLocation("viewNormalMatrix");
    this._uProjMatrix = program.getLocation("projMatrix");
    this._uGammaFactor = program.getLocation("gammaFactor");
    this._uLightAmbient = [];
    this._uLightColor = [];
    this._uLightDir = [];
    this._uLightPos = [];
    this._uLightAttenuation = [];
    this._uShadowViewMatrix = [];
    this._uShadowProjMatrix = [];

    if (scene.logarithmicDepthBufferEnabled) {
        this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
    }

    const lights = lightsState.lights;
    let light;

    for (var i = 0, len = lights.length; i < len; i++) {
        light = lights[i];
        switch (light.type) {

            case "ambient":
                this._uLightAmbient[i] = program.getLocation("lightAmbient");
                break;

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

        if (light.castsShadow) {
            this._uShadowViewMatrix[i] = program.getLocation("shadowViewMatrix" + i);
            this._uShadowProjMatrix[i] = program.getLocation("shadowProjMatrix" + i);
        }
    }

    if (lightsState.lightMaps.length > 0) {
        this._uLightMap = "lightMap";
    }

    if (lightsState.reflectionMaps.length > 0) {
        this._uReflectionMap = "reflectionMap";
    }

    this._uSectionPlanes = [];
    for (let i = 0, len = sectionPlanesState.getNumAllocatedSectionPlanes(); i < len; i++) {
        this._uSectionPlanes.push({
            active: program.getLocation("sectionPlaneActive" + i),
            pos: program.getLocation("sectionPlanePos" + i),
            dir: program.getLocation("sectionPlaneDir" + i)
        });
    }

    this._uPointSize = program.getLocation("pointSize");

    this._binders = [ ];

    const setupUniformBind = (uniformName, bind) => {
        const uLoc = program.getLocation(uniformName);
        if (uLoc) {
            this._binders.push((frameCtx, mtl) => bind(uLoc, mtl));
        }
    };

    const setupTextureBind = (mapUniformName, matrixUniformName, getMap) => {
        if (getMap(material)) {
            const uMapMatrix = program.getLocation(matrixUniformName);
            this._binders.push((frameCtx, mtl) => {
                const map = getMap(mtl);
                if (map._state.texture) {
                    program.bindTexture(mapUniformName, map._state.texture, frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % WEBGL_INFO.MAX_TEXTURE_UNITS;
                    frameCtx.bindTexture++;
                    if (uMapMatrix) {
                        gl.uniformMatrix4fv(uMapMatrix, false, map._state.matrix);
                    }
                }
            });
        }
    };

    switch (materialState.type) {
        case "LambertMaterial":
            setupUniformBind("materialColor",    (loc, mtl) => gl.uniform4f(loc, mtl._state.color[0], mtl._state.color[1], mtl._state.color[2], mtl._state.alpha));
            setupUniformBind("materialEmissive", (loc, mtl) => gl.uniform3fv(loc, mtl._state.emissive));
            break;

        case "PhongMaterial":
            setupUniformBind("materialAmbient",         (loc, mtl) => gl.uniform3fv(loc, mtl._state.ambient));
            setupUniformBind("materialDiffuse",         (loc, mtl) => gl.uniform3fv(loc, mtl._state.diffuse));
            setupUniformBind("materialSpecular",        (loc, mtl) => gl.uniform3fv(loc, mtl._state.specular));
            setupUniformBind("materialEmissive",        (loc, mtl) => gl.uniform3fv(loc, mtl._state.emissive));
            setupUniformBind("materialShininess",       (loc, mtl) => gl.uniform1f (loc, mtl._state.shininess));
            setupUniformBind("materialAlphaModeCutoff", (loc, mtl) => gl.uniform4f (loc, 1.0 * mtl._state.alpha, mtl._state.alphaMode === 1 ? 1.0 : 0.0, mtl._state.alphaCutoff, 0.0));

            setupTextureBind("ambientMap",      "ambientMapMatrix",      mtl => mtl._ambientMap);
            setupTextureBind("diffuseMap",      "diffuseMapMatrix",      mtl => mtl._diffuseMap);
            setupTextureBind("specularMap",     "specularMapMatrix",     mtl => mtl._specularMap);
            setupTextureBind("emissiveMap",     "emissiveMapMatrix",     mtl => mtl._emissiveMap);
            setupTextureBind("alphaMap",        "alphaMapMatrix",        mtl => mtl._alphaMap);
            setupTextureBind("normalMap",       "normalMapMatrix",       mtl => mtl._normalMap);
            setupTextureBind("occlusionMap",    "occlusionMapMatrix",    mtl => mtl._occlusionMap);

            const setupFresnelBind = (edgeBiasName, centerBiasName, edgeColorName, centerColorName, powerName, getMaterialFresnel) => {
                if (getMaterialFresnel(material)) {
                    setupUniformBind(edgeBiasName,    (loc, mtl) => gl.uniform1f (loc, getMaterialFresnel(mtl).edgeBias));
                    setupUniformBind(centerBiasName,  (loc, mtl) => gl.uniform1f (loc, getMaterialFresnel(mtl).centerBias));
                    setupUniformBind(edgeColorName,   (loc, mtl) => gl.uniform3fv(loc, getMaterialFresnel(mtl).edgeColor));
                    setupUniformBind(centerColorName, (loc, mtl) => gl.uniform3fv(loc, getMaterialFresnel(mtl).centerColor));
                    setupUniformBind(powerName,       (loc, mtl) => gl.uniform1f (loc, getMaterialFresnel(mtl).power));
                }
            };

            setupFresnelBind(
                "diffuseFresnelEdgeBias",
                "diffuseFresnelCenterBias",
                "diffuseFresnelEdgeColor",
                "diffuseFresnelCenterColor",
                "diffuseFresnelPower",
                mtl => mtl._diffuseFresnel);

            setupFresnelBind(
                "specularFresnelEdgeBias",
                "specularFresnelCenterBias",
                "specularFresnelEdgeColor",
                "specularFresnelCenterColor",
                "specularFresnelPower",
                mtl => mtl._specularFresnel);

            setupFresnelBind(
                "alphaFresnelEdgeBias",
                "alphaFresnelCenterBias",
                "alphaFresnelEdgeColor",
                "alphaFresnelCenterColor",
                "alphaFresnelPower",
                mtl => mtl._alphaFresnel);

            setupFresnelBind(
                "emissiveFresnelEdgeBias",
                "emissiveFresnelCenterBias",
                "emissiveFresnelEdgeColor",
                "emissiveFresnelCenterColor",
                "emissiveFresnelPower",
                mtl => mtl._emissiveFresnel);

            break;

        case "MetallicMaterial":
            setupUniformBind("materialBaseColor",       (loc, mtl) => gl.uniform3fv(loc, mtl._state.baseColor));
            setupUniformBind("materialMetallic",        (loc, mtl) => gl.uniform1f (loc, mtl._state.metallic));
            setupUniformBind("materialRoughness",       (loc, mtl) => gl.uniform1f (loc, mtl._state.roughness));
            setupUniformBind("materialSpecularF0",      (loc, mtl) => gl.uniform1f (loc, mtl._state.specularF0));
            setupUniformBind("materialEmissive",        (loc, mtl) => gl.uniform3fv(loc, mtl._state.emissive));
            setupUniformBind("materialAlphaModeCutoff", (loc, mtl) => gl.uniform4f (loc, 1.0 * mtl._state.alpha, mtl._state.alphaMode === 1 ? 1.0 : 0.0, mtl._state.alphaCutoff, 0.0));

            setupTextureBind("baseColorMap",         "baseColorMapMatrix",         mtl => mtl._baseColorMap);
            setupTextureBind("metallicMap",          "metallicMapMatrix",          mtl => mtl._metallicMap);
            setupTextureBind("roughnessMap",         "roughnessMapMatrix",         mtl => mtl._roughnessMap);
            setupTextureBind("metallicRoughnessMap", "metallicRoughnessMapMatrix", mtl => mtl._metallicRoughnessMap);
            setupTextureBind("emissiveMap",          "emissiveMapMatrix",          mtl => mtl._emissiveMap);
            setupTextureBind("occlusionMap",         "occlusionMapMatrix",         mtl => mtl._occlusionMap);
            setupTextureBind("alphaMap",             "alphaMapMatrix",             mtl => mtl._alphaMap);
            setupTextureBind("normalMap",            "normalMapMatrix",            mtl => mtl._normalMap);

            break;

        case "SpecularMaterial":
            setupUniformBind("materialDiffuse",         (loc, mtl) => gl.uniform3fv(loc, mtl._state.diffuse));
            setupUniformBind("materialSpecular",        (loc, mtl) => gl.uniform3fv(loc, mtl._state.specular));
            setupUniformBind("materialGlossiness",      (loc, mtl) => gl.uniform1f (loc, mtl._state.glossiness));
            setupUniformBind("materialEmissive",        (loc, mtl) => gl.uniform3fv(loc, mtl._state.emissive));
            setupUniformBind("materialAlphaModeCutoff", (loc, mtl) => gl.uniform4f (loc, 1.0 * mtl._state.alpha, mtl._state.alphaMode === 1 ? 1.0 : 0.0, mtl._state.alphaCutoff, 0.0));

            setupTextureBind("diffuseMap",                    "diffuseMapMatrix",                    mtl => mtl._diffuseMap);
            setupTextureBind("specularMap",                   "specularMapMatrix",                   mtl => mtl._specularMap);
            setupTextureBind("glossinessMap",                 "glossinessMapMatrix",                 mtl => mtl._glossinessMap);
            setupTextureBind("materialSpecularGlossinessMap", "materialSpecularGlossinessMapMatrix", mtl => mtl._specularGlossinessMap);
            setupTextureBind("emissiveMap",                   "emissiveMapMatrix",                   mtl => mtl._emissiveMap);
            setupTextureBind("occlusionMap",                  "occlusionMapMatrix",                  mtl => mtl._occlusionMap);
            setupTextureBind("alphaMap",                      "alphaMapMatrix",                      mtl => mtl._alphaMap);
            setupTextureBind("normalMap",                     "normalMapMatrix",                     mtl => mtl._normalMap);

            break;
    }

    this._aPosition = program.getAttribute("position");
    this._aNormal = program.getAttribute("normal");
    this._aUV = program.getAttribute("uv");
    this._aColor = program.getAttribute("color");

    this._uClippable = program.getLocation("clippable");
    this._uColorize = program.getLocation("colorize");
    this._uOffset = program.getLocation("offset");
    this._uScale = program.getLocation("scale");

    this._lastMaterialId = null;
    this._lastVertexBufsId = null;
    this._lastGeometryId = null;

    this._lastColorize = new Float32Array(4);

    this._baseTextureUnit = 0;

};

DrawRenderer.prototype._bindProgram = function (frameCtx) {

    const maxTextureUnits = WEBGL_INFO.MAX_TEXTURE_UNITS;
    const scene = this._scene;
    const gl = scene.canvas.gl;
    const lightsState = scene._lightsState;
    const project = scene.camera.project;
    let light;

    const program = this._program;

    program.bind();

    frameCtx.useProgram++;
    frameCtx.textureUnit = 0;

    this._lastMaterialId = null;
    this._lastVertexBufsId = null;
    this._lastGeometryId = null;

    this._lastColorize[0] = -1;
    this._lastColorize[1] = -1;
    this._lastColorize[2] = -1;
    this._lastColorize[3] = -1;

    gl.uniformMatrix4fv(this._uProjMatrix, false, project.matrix);

    if (scene.logarithmicDepthBufferEnabled) {
        const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
        gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
    }

    for (var i = 0, len = lightsState.lights.length; i < len; i++) {

        light = lightsState.lights[i];

        if (this._uLightAmbient[i]) {
            gl.uniform4f(this._uLightAmbient[i], light.color[0], light.color[1], light.color[2], light.intensity);

        } else {

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

            if (light.castsShadow) {
                if (this._uShadowViewMatrix[i]) {
                    gl.uniformMatrix4fv(this._uShadowViewMatrix[i], false, light.getShadowViewMatrix());
                }
                if (this._uShadowProjMatrix[i]) {
                    gl.uniformMatrix4fv(this._uShadowProjMatrix[i], false, light.getShadowProjMatrix());
                }
                const shadowRenderBuf = light.getShadowRenderBuf();
                if (shadowRenderBuf) {
                    program.bindTexture("shadowMap" + i, shadowRenderBuf.getTexture(), frameCtx.textureUnit);
                    frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
                    frameCtx.bindTexture++;
                }
            }
        }
    }

    if (lightsState.lightMaps.length > 0 && lightsState.lightMaps[0].texture && this._uLightMap) {
        program.bindTexture(this._uLightMap, lightsState.lightMaps[0].texture, frameCtx.textureUnit);
        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
        frameCtx.bindTexture++;
    }

    if (lightsState.reflectionMaps.length > 0 && lightsState.reflectionMaps[0].texture && this._uReflectionMap) {
        program.bindTexture(this._uReflectionMap, lightsState.reflectionMaps[0].texture, frameCtx.textureUnit);
        frameCtx.textureUnit = (frameCtx.textureUnit + 1) % maxTextureUnits;
        frameCtx.bindTexture++;
    }

    if (this._uGammaFactor) {
        gl.uniform1f(this._uGammaFactor, scene.gammaFactor);
    }

    this._baseTextureUnit = frameCtx.textureUnit;
};

export {DrawRenderer};