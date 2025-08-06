import {
    buildSphereGeometry,
    Mesh,
    PhongMaterial,
    ReadableGeometry
} from "../../viewer/index.js";

/**
 *
 * @param {*} scene
 * @param {Texture} [texture] Texture to be used on the material for SphereMap
 * @returns {Mesh}
 */

export function createSphereMapMesh(scene, texture) {
    const sphereMapGeometry = new ReadableGeometry(scene, buildSphereGeometry({
        center: [0, 0, 0],
        radius: 1,
        heightSegments: 60,
        widthSegments: 60
    }));

    const sphereMapMaterial = new PhongMaterial(scene, {
        ambient: [0, 0, 0],
        diffuse: [0, 0, 0],
        specular: [0, 0, 0],
        emissive: [1, 1, 1],
        emissiveMap: texture,
        backfaces: true
    });

    return new Mesh(scene, {
        geometry: sphereMapGeometry,
        background: true,
        rotation: [0, 0, 180],
        material: sphereMapMaterial,
        visible: true,
        pickable: false,
        clippable: false,
        collidable: false
    });
}
