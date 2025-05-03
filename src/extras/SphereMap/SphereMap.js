import {
    buildSphereGeometry,
    ClampToEdgeWrapping,
    LinearEncoding,
    Mesh,
    PhongMaterial,
    ReadableGeometry,
    Texture
} from "../../viewer/index.js";

/**
 * 
 * @param {*} scene 
 * @param {*} cfg Config
 * @param {Texture} [cfg.texture] Texture to be used on the material for cubemap
 * @param {String} [cfg.textureSrc] Source of the texture to be used on the material for cubemap
 * @param {Number} [cfg.size] Size of the cubemap
 * @returns {Mesh}
 */

export function createSphereMap(scene, cfg = {}) {
    if(!cfg.texture && !cfg.textureSrc)
        throw new Error("Creating sphere map requires texture or textureSrc");

    const sphereMapGeometry = new ReadableGeometry(scene, buildSphereGeometry({
        center: [0, 0, 0],
        radius: 1,
        heightSegments: 60,
        widthSegments: 60
    }));

    const sphereMapTexture = cfg.texture ? cfg.texture : new Texture(scene, {
        src: cfg.textureSrc,
        flipY: true,
        wrapS: ClampToEdgeWrapping,
        wrapT: ClampToEdgeWrapping,
        encoding: cfg.encoding || LinearEncoding
    });

    const sphereMapMaterial = new PhongMaterial(scene, {
        ambient: [0, 0, 0],
        diffuse: [0, 0, 0],
        specular: [0, 0, 0],
        emissive: [1, 1, 1],
        emissiveMap: sphereMapTexture,
        backfaces: true
    });

    const size = cfg.size ? cfg.size : 2000;

    return new Mesh(scene, {
        geometry: sphereMapGeometry,
        background: true,
        scale: [size, size, size],
        rotation: [0, 0, 180],
        material: sphereMapMaterial,
        visible: true,
        pickable: false,
        clippable: false,
        collidable: false
    })

}