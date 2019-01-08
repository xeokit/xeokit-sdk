import {utils} from '../../utils.js';
import {K3D} from '../../libs/k3d.js';

/**
 * @desc Loads {@link Geometry} from OBJ.
 *
 * ## Usage
 *
 * In the example below we'll create a {@link Mesh} with {@link MetallicMaterial} and {@link ReadableGeometry} loaded from OBJ.
 * 
 * [[Run this example](/examples/#geometry_loaders_OBJ)]
 *
 * ````javascript
 * import {Viewer} from "../src/viewer/Viewer.js";
 * import {Mesh} from "../src/scene/mesh/Mesh.js";
 * import {loadOBJGeometry} from "../src/scene/geometry/loaders/loadOBJGeometry.js";
 * import {ReadableGeometry} from "../src/scene/geometry/ReadableGeometry.js";
 * import {MetallicMaterial} from "../src/scene/materials/MetallicMaterial.js";
 * import {Texture} from "../src/scene/materials/Texture.js";
 * 
 * const myViewer = new Viewer({
 *      canvasId: "myCanvas"
 * });
 *
 * myViewer.scene.camera.eye = [0.57, 1.37, 1.14];
 * myViewer.scene.camera.look = [0.04, 0.58, 0.00];
 * myViewer.scene.camera.up = [-0.22, 0.84, -0.48];
 *
 * loadOBJGeometry(ReadableGeometry, myViewer.scene, {
 *
 *      src: "models/obj/fireHydrant/FireHydrantMesh.obj",
 *      compressGeometry: false
 *
 *  }).then(function (geometry) {
 *
 *      // Success
 *
 *      new Mesh(myViewer.scene, {
 *
 *          geometry: geometry,
 *
 *          material: new MetallicMaterial(myViewer.scene, {
 *
 *              baseColor: [1, 1, 1],
 *              metallic: 1.0,
 *              roughness: 1.0,
 * 
 *              baseColorMap: new Texture(myViewer.scene, {
 *                  src: "models/obj/fireHydrant/fire_hydrant_Base_Color.png",
 *                  encoding: "sRGB"
 *              }),
 *              normalMap: new Texture(myViewer.scene, {
 *                  src: "models/obj/fireHydrant/fire_hydrant_Normal_OpenGL.png"
 *              }),
 *              roughnessMap: new Texture(myViewer.scene, {
 *                  src: "models/obj/fireHydrant/fire_hydrant_Roughness.png"
 *              }),
 *              metallicMap: new Texture(myViewer.scene, {
 *                  src: "models/obj/fireHydrant/fire_hydrant_Metallic.png"
 *              }),
 *              occlusionMap: new Texture(myViewer.scene, {
 *                  src: "models/obj/fireHydrant/fire_hydrant_Mixed_AO.png"
 *              }),
 * 
 *              specularF0: 0.7
 *          })
 *      });
 *  }, function () {
 *      // Error
 *  });
 * ````
 *
 * @function loadOBJGeometry
 * @param {Geometry} geometryClass {@link Geometry} subtype to instantiate.
 * @param {Component} owner Owner {@link Component}. When destroyed, the owner will destroy the {@link Geometry} as well.
 * @param {*} [cfg] Configs, also passed into {@link Geometry} subtype constructor.
 * @param {String} [cfg.id] Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted.
 * @param {String} [cfg.src]  Path to OBJ file.
 * @returns {Geometry} The {@link Geometry} subtype indicated by geometryClass.
 */
function loadOBJGeometry(geometryClass, owner, cfg = {}) {

    return new Promise(function (resolve, reject) {

        if (!cfg.src) {
            console.error("loadOBJGeometry: Parameter expected: src");
            reject();
        }

        var spinner = owner.scene.canvas.spinner;
        spinner.processes++;

        utils.loadArraybuffer(cfg.src, function (data) {

                if (!data.byteLength) {
                    console.error("loadOBJGeometry: no data loaded");
                    spinner.processes--;
                    reject();
                }

                var m = K3D.parse.fromOBJ(data);	// done !

                // unwrap simply duplicates some values, so they can be indexed with indices [0,1,2,3 ... ]
                // In some rendering engines, you can have only one index value for vertices, UVs, normals ...,
                // so "unwrapping" is a simple solution.

                var positions = K3D.edit.unwrap(m.i_verts, m.c_verts, 3);
                var normals = K3D.edit.unwrap(m.i_norms, m.c_norms, 3);
                var uv = K3D.edit.unwrap(m.i_uvt, m.c_uvt, 2);
                var indices = new Int32Array(m.i_verts.length);

                for (var i = 0; i < m.i_verts.length; i++) {
                    indices[i] = i;
                }

                spinner.processes--;

                resolve(new geometryClass(owner, utils.apply(cfg, {
                    primitive: "triangles",
                    positions: positions,
                    normals: normals.length > 0 ? normals : null,
                    autoNormals: normals.length === 0,
                    uv: uv,
                    indices: indices
                })));
            },

            function (msg) {
                console.error("loadOBJGeometry: " + msg);
                spinner.processes--;
                reject();
            });
    });
}

export {loadOBJGeometry};
