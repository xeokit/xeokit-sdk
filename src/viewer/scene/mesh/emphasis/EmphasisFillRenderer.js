/**
 * @author xeolabs / https://github.com/xeolabs
 */

import {Map} from "../../utils/Map.js";
import {EmphasisFillShaderSource} from "./EmphasisFillShaderSource.js";
import {Program} from "../../webgl/Program.js";
import {stats} from '../../stats.js';
import {math} from "../../math/math.js";
import {getPlaneRTCPos} from "../../math/rtcCoords.js";

const ids = new Map({});

const tempVec3a = math.vec3();

/**
 * @private
 */
const EmphasisFillRenderer = function (hash, mesh) {
    this.id = ids.addItem({});
    this._hash = hash;
    this._scene = mesh.scene;
    this._useCount = 0;
    this._shaderSource = new EmphasisFillShaderSource(mesh);
    this._allocate(mesh);
};

const xrayFillRenderers = {};

EmphasisFillRenderer.get = function (mesh) {
    const hash = [
        mesh.scene.id,
        mesh.scene.gammaOutput ? "go" : "", // Gamma input not needed
        mesh.scene._sectionPlanesState.getHash(),
        !!mesh._geometry._state.normalsBuf ? "n" : "",
        mesh._geometry._state.compressGeometry ? "cp" : "",
        mesh._state.hash
    ].join(";");
    let renderer = xrayFillRenderers[hash];
    if (!renderer) {
        renderer = new EmphasisFillRenderer(hash, mesh);
        xrayFillRenderers[hash] = renderer;
        stats.memory.programs++;
    }
    renderer._useCount++;
    return renderer;
};

EmphasisFillRenderer.prototype.put = function () {
    if (--this._useCount === 0) {
        ids.removeItem(this.id);
        if (this._program) {
            this._program.destroy();
        }
        delete xrayFillRenderers[this._hash];
        stats.memory.programs--;
    }
};

EmphasisFillRenderer.prototype.webglContextRestored = function () {
    this._program = null;
};

EmphasisFillRenderer.prototype.drawMesh = function (frameCtx, mesh, mode) {

    if (!this._program) {
        this._allocate(mesh);
    }

    const scene = this._scene;
    const camera = scene.camera;
    const gl = scene.canvas.gl;
    const materialState = mode === 0 ? mesh._xrayMaterial._state : (mode === 1 ? mesh._highlightMaterial._state : mesh._selectedMaterial._state);
    const meshState = mesh._state;
    const geometryState = mesh._geometry._state;
    const rtcCenter = mesh.rtcCenter;

    if (frameCtx.lastProgramId !== this._program.id) {
        frameCtx.lastProgramId = this._program.id;
        this._bindProgram(frameCtx);
    }

    gl.uniformMatrix4fv(this._uViewMatrix, false, rtcCenter ? frameCtx.getRTCViewMatrix(meshState.rtcCenterHash, rtcCenter) : camera.viewMatrix);
    gl.uniformMatrix4fv(this._uViewNormalMatrix, false, camera.viewNormalMatrix);

    if (meshState.clippable) {
        const numSectionPlanes = scene._sectionPlanesState.sectionPlanes.length;
        if (numSectionPlanes > 0) {
            const sectionPlanes = scene._sectionPlanesState.sectionPlanes;
            const renderFlags = mesh.renderFlags;
            for (let sectionPlaneIndex = 0; sectionPlaneIndex < numSectionPlanes; sectionPlaneIndex++) {
                const sectionPlaneUniforms = this._uSectionPlanes[sectionPlaneIndex];
                if (sectionPlaneUniforms) {
                    const active = renderFlags.sectionPlanesActivePerLayer[sectionPlaneIndex];
                    gl.uniform1i(sectionPlaneUniforms.active, active ? 1 : 0);
                    if (active) {
                        const sectionPlane = sectionPlanes[sectionPlaneIndex];
                        gl.uniform3fv(sectionPlaneUniforms.pos, rtcCenter ? getPlaneRTCPos(sectionPlane.dist, sectionPlane.dir, rtcCenter, tempVec3a) : sectionPlane.pos);
                        gl.uniform3fv(sectionPlaneUniforms.dir, sectionPlane.dir);
                    }
                }
            }
        }
    }

    if (materialState.id !== this._lastMaterialId) {
        const fillColor = materialState.fillColor;
        const backfaces = materialState.backfaces;
        if (frameCtx.backfaces !== backfaces) {
            if (backfaces) {
                gl.disable(gl.CULL_FACE);
            } else {
                gl.enable(gl.CULL_FACE);
            }
            frameCtx.backfaces = backfaces;
        }
        gl.uniform4f(this._uFillColor, fillColor[0], fillColor[1], fillColor[2], materialState.fillAlpha);
        this._lastMaterialId = materialState.id;
    }

    gl.uniformMatrix4fv(this._uModelMatrix, gl.FALSE, mesh.worldMatrix);
    if (this._uModelNormalMatrix) {
        gl.uniformMatrix4fv(this._uModelNormalMatrix, gl.FALSE, mesh.worldNormalMatrix);
    }

    if (this._uClippable) {
        gl.uniform1i(this._uClippable, meshState.clippable);
    }

    gl.uniform3fv(this._uOffset, meshState.offset);

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
        if (geometryState.indicesBuf) {
            geometryState.indicesBuf.bind();
            frameCtx.bindArray++;
            // gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
            // frameCtx.drawElements++;
        } else if (geometryState.positionsBuf) {
            // gl.drawArrays(gl.TRIANGLES, 0, geometryState.positions.numItems);
            //  frameCtx.drawArrays++;
        }
        this._lastGeometryId = geometryState.id;
    }

    if (geometryState.indicesBuf) {
        gl.drawElements(geometryState.primitive, geometryState.indicesBuf.numItems, geometryState.indicesBuf.itemType, 0);
        frameCtx.drawElements++;
    } else if (geometryState.positionsBuf) {
        gl.drawArrays(gl.TRIANGLES, 0, geometryState.positionsBuf.numItems);
        frameCtx.drawArrays++;
    }
};

EmphasisFillRenderer.prototype._allocate = function (mesh) {
    const scene = mesh.scene;
    const lightsState = scene._lightsState;
    const sectionPlanesState = scene._sectionPlanesState;
    const gl = scene.canvas.gl;
    this._program = new Program(gl, this._shaderSource);
    if (this._program.errors) {
        this.errors = this._program.errors;
        return;
    }
    const program = this._program;
    this._uPositionsDecodeMatrix = program.getLocation("positionsDecodeMatrix");
    this._uModelMatrix = program.getLocation("modelMatrix");
    this._uModelNormalMatrix = program.getLocation("modelNormalMatrix");
    this._uViewMatrix = program.getLocation("viewMatrix");
    this._uViewNormalMatrix = program.getLocation("viewNormalMatrix");
    this._uProjMatrix = program.getLocation("projMatrix");
    this._uLightAmbient = [];
    this._uLightColor = [];
    this._uLightDir = [];
    this._uLightPos = [];
    this._uLightAttenuation = [];
    for (let i = 0, len = lightsState.lights.length; i < len; i++) {
        const light = lightsState.lights[i];
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
        }
    }
    this._uSectionPlanes = [];
    for (let i = 0, len = sectionPlanesState.sectionPlanes.length; i < len; i++) {
        this._uSectionPlanes.push({
            active: program.getLocation("sectionPlaneActive" + i),
            pos: program.getLocation("sectionPlanePos" + i),
            dir: program.getLocation("sectionPlaneDir" + i)
        });
    }
    this._uFillColor = program.getLocation("fillColor");
    this._aPosition = program.getAttribute("position");
    this._aNormal = program.getAttribute("normal");
    this._uClippable = program.getLocation("clippable");
    this._uGammaFactor = program.getLocation("gammaFactor");
    this._uOffset = program.getLocation("offset");
    if (scene.logarithmicDepthBufferEnabled ) {
        this._uLogDepthBufFC = program.getLocation("logDepthBufFC");
    }
    this._lastMaterialId = null;
    this._lastVertexBufsId = null;
    this._lastGeometryId = null;
};

EmphasisFillRenderer.prototype._bindProgram = function (frameCtx) {
    const scene = this._scene;
    const gl = scene.canvas.gl;
    const lightsState = scene._lightsState;
    const camera = scene.camera;
    const project = camera.project;
    const program = this._program;
    program.bind();
    frameCtx.useProgram++;
    frameCtx.textureUnit = 0;
    this._lastMaterialId = null;
    this._lastVertexBufsId = null;
    this._lastGeometryId = null;
    this._lastIndicesBufId = null;
    gl.uniformMatrix4fv(this._uViewNormalMatrix, false, camera.normalMatrix);
    gl.uniformMatrix4fv(this._uProjMatrix, false, project.matrix);
    if (scene.logarithmicDepthBufferEnabled ) {
        const logDepthBufFC = 2.0 / (Math.log(project.far + 1.0) / Math.LN2);
        gl.uniform1f(this._uLogDepthBufFC, logDepthBufFC);
    }
    for (let i = 0, len = lightsState.lights.length; i < len; i++) {
        const light = lightsState.lights[i];
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
        }
    }
    if (this._uGammaFactor) {
        gl.uniform1f(this._uGammaFactor, scene.gammaFactor);
    }
};

export {EmphasisFillRenderer};
