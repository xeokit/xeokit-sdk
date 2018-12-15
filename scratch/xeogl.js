/**
 The xeokit namespace.

 @class xeokit
 @main xeokit
 @static
 @author xeolabs / http://xeolabs.com/
 */

import {core} from "../src/scene/core.js";
import {tasks} from "../src/scene/tasks.js";
import {utils as util} from "../src/scene/utils.js";
import {loop} from "../src/scene/loop.js";

// Low-level WebGL components

import {ArrayBuf} from "../src/scene/webgl/ArrayBuf.js";
import {Attribute} from "../src/scene/webgl/Attribute.js";
import {Program} from "../src/scene/webgl/Program.js";
import {RenderBuffer} from "./webgl/Renderbuffer.js";
import {Sampler} from "../src/scene/webgl/Sampler.js";
import {Texture2D} from "../src/scene/webgl/Texture2d.js";
import {webglEnums} from "../src/scene/webgl/webglEnums.js";
import {RenderState} from "../src/scene/webgl/RenderState.js";
import {FrameContext} from "../src/scene/webgl/FrameContext.js";

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

export {WEBGL_INFO} from "../src/scene/webglInfo.js";
export {stats}  from "../src/scene/stats.js";
export {math} from "../src/scene/math/math.js";

export const scenes = core.scenes;
export const getDefaultScene = core.getDefaultScene;
export const setDefaultScene = core.setDefaultScene;
export const scheduleTask = tasks.scheduleTask;
export const clear = core.clear;
export const _isString = util.isString; // Deprecated
export const _apply = util.apply; // Deprecated
export const _isNumeric = util.isNumeric; // Deprecated

// Utilities

import {Map} from "../src/scene/utils/Map.js";

export const utils = {
    Map: Map,
    isString: util.isString,
    apply: util.apply, // Backward compat
    isNumeric: util.isNumeric
};

// Component classes

export {Component} from "../src/scene/Component.js";
export {CameraFlightAnimation} from '../src/scene/animation/CameraFlightAnimation.js';
export {Canvas} from "../src/scene/canvas/Canvas.js";
export {Spinner} from "../src/scene/canvas/Spinner.js";
export {Clip} from "./clipping/clip.js";
export {CameraControl} from "./controls/cameraControl.js";
export {Geometry} from "../src/scene/geometry/Geometry.js";
export {BoxGeometry} from "../src/scene/geometry/BoxGeometry.js";
export {TorusGeometry} from "./geometry/torusGeometry.js";
export {SphereGeometry} from "./geometry/sphereGeometry.js";
export {OBBGeometry} from "./geometry/obbGeometry.js";
export {AABBGeometry}  from "../src/scene/geometry/AABBGeometry.js";
export {CylinderGeometry} from "./geometry/cylinderGeometry.js";
export {PlaneGeometry} from "./geometry/planeGeometry.js";
export {Input} from "../src/scene/input/Input.js";
export {AmbientLight} from "./lighting/ambientLight.js";
export {DirLight} from "../src/scene/lighting/DirLight.js";
export {PointLight} from "./lighting/pointLight.js";
export {SpotLight} from "./lighting/spotLight.js";
export {CubeTexture} from "./lighting/cubeTexture.js";
export {LightMap} from "./lighting/lightMap.js";
export {ReflectionMap} from "./lighting/reflectionMap.js";
export {Shadow} from "./lighting/shadow.js";
export {Model} from "./models/model.js";
export {Group} from "../src/scene/objects/Group.js";
export {Mesh} from "../src/scene/mesh/Mesh.js";
export {xeokitObject as Object} from "../src/scene/objects/Object.js";
export {Material} from "../src/scene/materials/Material.js";
export {PhongMaterial} from "../src/scene/materials/PhongMaterial.js";
export {LambertMaterial} from "./materials/lambertMaterial.js";
export {SpecularMaterial} from "./materials/specularMaterial.js";
export {MetallicMaterial} from "./materials/metallicMaterial.js";
export {EmphasisMaterial} from "../src/scene/materials/EmphasisMaterial.js";
export {EdgeMaterial} from "../src/scene/materials/EdgeMaterial.js";
export {OutlineMaterial} from "../src/scene/materials/OutlineMaterial.js";
export {Texture} from "./materials/texture.js";
export {Fresnel} from "./materials/fresnel.js";
export {Viewport} from "../src/scene/viewport/Viewport.js";
export {Camera} from "../src/scene/camera/Camera.js";
export {Frustum} from "../src/scene/camera/Frustum.js";
export {Ortho} from "../src/scene/camera/Ortho.js";
export {Perspective} from "../src/scene/camera/Perspective.js";
export {CustomProjection} from "../src/scene/camera/CustomProjection.js"
export {Scene} from "./scene/scene.js";


