/**
 The xeokit namespace.

 @class xeokit
 @main xeokit
 @static
 @author xeolabs / http://xeolabs.com/
 */

import {core} from "./core.js";
import {tasks} from "./tasks.js";
import {utils as util} from "./utils.js";
import {loop} from "./loop.js";

// Low-level WebGL components

import {ArrayBuf} from "./webgl/ArrayBuf.js";
import {Attribute} from "./webgl/Attribute.js";
import {Program} from "./webgl/Program.js";
import {RenderBuffer} from "./webgl/Renderbuffer.js";
import {Sampler} from "./webgl/Sampler.js";
import {Texture2D} from "./webgl/Texture2d.js";
import {webglEnums} from "./webgl/webglEnums.js";
import {RenderState} from "./webgl/RenderState.js";
import {FrameContext} from "./webgl/FrameContext.js";

export const webgl = {
    ArrayBuf: ArrayBuf,
    Attribute: Attribute,
    Program: Program,
    RenderBuffer: RenderBuffer,
    Sampler: Sampler,
    Texture2D: Texture2D,
    RenderState: RenderState,
    FrameContext: FrameContext,
    enums: webglEnums
};

// Core framework

export {WEBGL_INFO} from "./webglInfo.js";
export {stats}  from "./stats.js";
export {math} from "./math/math.js";

export const scenes = core.scenes;
export const getDefaultScene = core.getDefaultScene;
export const setDefaultScene = core.setDefaultScene;
export const scheduleTask = tasks.scheduleTask;
export const clear = core.clear;
export const _isString = util.isString; // Deprecated
export const _apply = util.apply; // Deprecated
export const _isNumeric = util.isNumeric; // Deprecated

// Utilities

import {Map} from "./utils/Map.js";

export const utils = {
    Map: Map,
    isString: util.isString,
    apply: util.apply, // Backward compat
    isNumeric: util.isNumeric
};

// Component classes

export {Component} from "./Component.js";
export {CameraFlightAnimation} from './animation/CameraFlightAnimation.js';
export {Canvas} from "./canvas/Canvas.js";
export {Spinner} from "./canvas/Spinner.js";
export {Clip} from "./clipping/clip.js";
export {CameraControl} from "./controls/cameraControl.js";
export {Geometry} from "./geometry/Geometry.js";
export {BoxGeometry} from "./geometry/BoxGeometry.js";
export {TorusGeometry} from "./geometry/torusGeometry.js";
export {SphereGeometry} from "./geometry/sphereGeometry.js";
export {OBBGeometry} from "./geometry/obbGeometry.js";
export {AABBGeometry}  from "./geometry/AABBGeometry.js";
export {CylinderGeometry} from "./geometry/cylinderGeometry.js";
export {PlaneGeometry} from "./geometry/planeGeometry.js";
export {Input} from "./input/Input.js";
export {AmbientLight} from "./lighting/ambientLight.js";
export {DirLight} from "./lighting/DirLight.js";
export {PointLight} from "./lighting/pointLight.js";
export {SpotLight} from "./lighting/spotLight.js";
export {CubeTexture} from "./lighting/cubeTexture.js";
export {LightMap} from "./lighting/lightMap.js";
export {ReflectionMap} from "./lighting/reflectionMap.js";
export {Shadow} from "./lighting/shadow.js";
export {Model} from "./models/model.js";
export {Group} from "./objects/Group.js";
export {Mesh} from "./mesh/Mesh.js";
export {xeokitObject as Object} from "./objects/Object.js";
export {Material} from "./materials/Material.js";
export {PhongMaterial} from "./materials/PhongMaterial.js";
export {LambertMaterial} from "./materials/lambertMaterial.js";
export {SpecularMaterial} from "./materials/specularMaterial.js";
export {MetallicMaterial} from "./materials/metallicMaterial.js";
export {EmphasisMaterial} from "./materials/EmphasisMaterial.js";
export {EdgeMaterial} from "./materials/EdgeMaterial.js";
export {OutlineMaterial} from "./materials/OutlineMaterial.js";
export {Texture} from "./materials/texture.js";
export {Fresnel} from "./materials/fresnel.js";
export {Viewport} from "./viewport/Viewport.js";
export {Camera} from "./camera/Camera.js";
export {Frustum} from "./camera/Frustum.js";
export {Ortho} from "./camera/Ortho.js";
export {Perspective} from "./camera/Perspective.js";
export {CustomProjection} from "./camera/CustomProjection.js"
export {Scene} from "./scene/scene.js";


