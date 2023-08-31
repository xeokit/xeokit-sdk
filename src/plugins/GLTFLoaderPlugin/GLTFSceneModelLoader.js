import {math} from "../../viewer/scene/math/math.js";
import {utils} from "../../viewer/scene/utils.js";
import {core} from "../../viewer/scene/core.js";
import {sRGBEncoding} from "../../viewer/scene/constants/constants.js";
import {worldToRTCPositions} from "../../viewer/scene/math/rtcCoords.js";
import {parse} from '@loaders.gl/core';
import {GLTFLoader} from '@loaders.gl/gltf/dist/esm/gltf-loader.js';
import {
    ClampToEdgeWrapping,
    LinearFilter,
    LinearMipMapLinearFilter,
    LinearMipMapNearestFilter,
    MirroredRepeatWrapping,
    NearestFilter,
    NearestMipMapLinearFilter,
    NearestMipMapNearestFilter,
    RepeatWrapping
} from "../../viewer/scene/constants/constants.js";

/**
 * @private
 */
class GLTFSceneModelLoader {

    constructor(cfg) {
        cfg = cfg || {};
    }

    load(plugin, src, metaModelJSON, options, sceneModel, ok, error) {
        options = options || {};
        loadGLTF(plugin, src, metaModelJSON, options, sceneModel, function () {
                core.scheduleTask(function () {
                    sceneModel.scene.fire("modelLoaded", sceneModel.id); // FIXME: Assumes listeners know order of these two events
                    sceneModel.fire("loaded", true, false);
                });
                if (ok) {
                    ok();
                }
            },
            function (msg) {
                plugin.error(msg);
                if (error) {
                    error(msg);
                }
                sceneModel.fire("error", msg);
            });
    }

    parse(plugin, gltf, metaModelJSON, options, sceneModel, ok, error) {
        options = options || {};
        parseGLTF(plugin, "", gltf, metaModelJSON, options, sceneModel, function () {
                sceneModel.scene.fire("modelLoaded", sceneModel.id); // FIXME: Assumes listeners know order of these two events
                sceneModel.fire("loaded", true, false);
                if (ok) {
                    ok();
                }
            },
            function (msg) {
                sceneModel.error(msg);
                sceneModel.fire("error", msg);
                if (error) {
                    error(msg);
                }
            });
    }
}

function getMetaModelCorrections(metaModelJSON) {
    const eachRootStats = {};
    const eachChildRoot = {};
    const metaObjects = metaModelJSON.metaObjects || [];
    const metaObjectsMap = {};
    for (let i = 0, len = metaObjects.length; i < len; i++) {
        const metaObject = metaObjects[i];
        metaObjectsMap[metaObject.id] = metaObject;
    }
    for (let i = 0, len = metaObjects.length; i < len; i++) {
        const metaObject = metaObjects[i];
        if (metaObject.parent !== undefined && metaObject.parent !== null) {
            const metaObjectParent = metaObjectsMap[metaObject.parent];
            if (metaObject.type === metaObjectParent.type) {
                let rootMetaObject = metaObjectParent;
                while (rootMetaObject.parent && metaObjectsMap[rootMetaObject.parent].type === rootMetaObject.type) {
                    rootMetaObject = metaObjectsMap[rootMetaObject.parent];
                }
                const rootStats = eachRootStats[rootMetaObject.id] || (eachRootStats[rootMetaObject.id] = {
                    numChildren: 0,
                    countChildren: 0
                });
                rootStats.numChildren++;
                eachChildRoot[metaObject.id] = rootMetaObject;
            } else {

            }
        }
    }
    return {
        metaObjectsMap,
        eachRootStats,
        eachChildRoot
    };
}

function loadGLTF(plugin, src, metaModelJSON, options, sceneModel, ok, error) {
    const spinner = plugin.viewer.scene.canvas.spinner;
    spinner.processes++;
    const isGLB = (src.split('.').pop() === "glb");
    if (isGLB) {
        plugin.dataSource.getGLB(src, (arrayBuffer) => { // OK
                options.basePath = getBasePath(src);
                parseGLTF(plugin, src, arrayBuffer, metaModelJSON, options, sceneModel, ok, error);
                spinner.processes--;
            },
            (err) => {
                spinner.processes--;
                error(err);
            });
    } else {
        plugin.dataSource.getGLTF(src, (gltf) => { // OK
                options.basePath = getBasePath(src);
                parseGLTF(plugin, src, gltf, metaModelJSON, options, sceneModel, ok, error);
                spinner.processes--;
            },
            (err) => {
                spinner.processes--;
                error(err);
            });
    }
}

function getBasePath(src) {
    const i = src.lastIndexOf("/");
    return (i !== 0) ? src.substring(0, i + 1) : "";
}

function parseGLTF(plugin, src, gltf, metaModelJSON, options, sceneModel, ok) {
    const spinner = plugin.viewer.scene.canvas.spinner;
    spinner.processes++;
    parse(gltf, GLTFLoader, {
        baseUri: options.basePath
    }).then((gltfData) => {
        const ctx = {
            src: src,
            metaModelCorrections: metaModelJSON ? getMetaModelCorrections(metaModelJSON) : null,
            loadBuffer: options.loadBuffer,
            basePath: options.basePath,
            handlenode: options.handlenode,
            gltfData: gltfData,
            scene: sceneModel.scene,
            plugin: plugin,
            sceneModel: sceneModel,
            //geometryCreated: {},
            numObjects: 0,
            nodes: [],
            nextId: 0,
            log: (msg) => {
                plugin.log(msg);
            }
        };
        loadTextures(ctx);
        loadMaterials(ctx);
        loadDefaultScene(ctx);
        sceneModel.finalize();
        spinner.processes--;
        ok();
    });
}

function loadTextures(ctx) {
    const gltfData = ctx.gltfData;
    const textures = gltfData.textures;
    if (textures) {
        for (let i = 0, len = textures.length; i < len; i++) {
            loadTexture(ctx, textures[i]);
        }
    }
}

function loadTexture(ctx, texture) {
    if (!texture.source || !texture.source.image) {
        return;
    }
    const textureId = `texture-${ctx.nextId++}`;

    let minFilter = NearestMipMapLinearFilter;
    switch (texture.sampler.minFilter) {
        case 9728:
            minFilter = NearestFilter;
            break;
        case 9729:
            minFilter = LinearFilter;
            break;
        case 9984:
            minFilter = NearestMipMapNearestFilter;
            break;
        case 9985:
            minFilter = LinearMipMapNearestFilter;
            break;
        case 9986:
            minFilter = NearestMipMapLinearFilter;
            break;
        case 9987:
            minFilter = LinearMipMapLinearFilter;
            break;
    }

    let magFilter = LinearFilter;
    switch (texture.sampler.magFilter) {
        case 9728:
            magFilter = NearestFilter;
            break;
        case 9729:
            magFilter = LinearFilter;
            break;
    }

    let wrapS = RepeatWrapping;
    switch (texture.sampler.wrapS) {
        case 33071:
            wrapS = ClampToEdgeWrapping;
            break;
        case 33648:
            wrapS = MirroredRepeatWrapping;
            break;
        case 10497:
            wrapS = RepeatWrapping;
            break;
    }

    let wrapT = RepeatWrapping;
    switch (texture.sampler.wrapT) {
        case 33071:
            wrapT = ClampToEdgeWrapping;
            break;
        case 33648:
            wrapT = MirroredRepeatWrapping;
            break;
        case 10497:
            wrapT = RepeatWrapping;
            break;
    }

    let wrapR = RepeatWrapping;
    switch (texture.sampler.wrapR) {
        case 33071:
            wrapR = ClampToEdgeWrapping;
            break;
        case 33648:
            wrapR = MirroredRepeatWrapping;
            break;
        case 10497:
            wrapR = RepeatWrapping;
            break;
    }
    ctx.sceneModel.createTexture({
        id: textureId,
        image: texture.source.image,
        flipY: !!texture.flipY,
        minFilter,
        magFilter,
        wrapS,
        wrapT,
        wrapR,
        encoding: sRGBEncoding
    });
    texture._textureId = textureId;
}

function loadMaterials(ctx) {
    const gltfData = ctx.gltfData;
    const materials = gltfData.materials;
    if (materials) {
        for (let i = 0, len = materials.length; i < len; i++) {
            const material = materials[i];
            material._textureSetId = loadTextureSet(ctx, material);
            material._attributes = loadMaterialAttributes(ctx, material);
        }
    }
}

function loadTextureSet(ctx, material) {
    const textureSetCfg = {};
    if (material.normalTexture) {
        textureSetCfg.normalTextureId = material.normalTexture.texture._textureId;
    }
    if (material.occlusionTexture) {
        textureSetCfg.occlusionTextureId = material.occlusionTexture.texture._textureId;
    }
    if (material.emissiveTexture) {
        textureSetCfg.emissiveTextureId = material.emissiveTexture.texture._textureId;
    }
    // const alphaMode = material.alphaMode;
    // switch (alphaMode) {
    //     case "NORMAL_OPAQUE":
    //         materialCfg.alphaMode = "opaque";
    //         break;
    //     case "MASK":
    //         materialCfg.alphaMode = "mask";
    //         break;
    //     case "BLEND":
    //         materialCfg.alphaMode = "blend";
    //         break;
    //     default:
    // }
    // const alphaCutoff = material.alphaCutoff;
    // if (alphaCutoff !== undefined) {
    //     materialCfg.alphaCutoff = alphaCutoff;
    // }
    const metallicPBR = material.pbrMetallicRoughness;
    if (material.pbrMetallicRoughness) {
        const pbrMetallicRoughness = material.pbrMetallicRoughness;
        const baseColorTexture = pbrMetallicRoughness.baseColorTexture || pbrMetallicRoughness.colorTexture;
        if (baseColorTexture) {
            if (baseColorTexture.texture) {
                textureSetCfg.colorTextureId = baseColorTexture.texture._textureId;
            } else {
                textureSetCfg.colorTextureId = ctx.gltfData.textures[baseColorTexture.index]._textureId;
            }
        }
        if (metallicPBR.metallicRoughnessTexture) {
            textureSetCfg.metallicRoughnessTextureId = metallicPBR.metallicRoughnessTexture.texture._textureId;
        }
    }
    const extensions = material.extensions;
    if (extensions) {
        const specularPBR = extensions["KHR_materials_pbrSpecularGlossiness"];
        if (specularPBR) {
            const specularTexture = specularPBR.specularTexture;
            if (specularTexture !== null && specularTexture !== undefined) {
                //  textureSetCfg.colorTextureId = ctx.gltfData.textures[specularColorTexture.index]._textureId;
            }
            const specularColorTexture = specularPBR.specularColorTexture;
            if (specularColorTexture !== null && specularColorTexture !== undefined) {
                textureSetCfg.colorTextureId = ctx.gltfData.textures[specularColorTexture.index]._textureId;
            }
        }
    }
    if (textureSetCfg.normalTextureId !== undefined ||
        textureSetCfg.occlusionTextureId !== undefined ||
        textureSetCfg.emissiveTextureId !== undefined ||
        textureSetCfg.colorTextureId !== undefined ||
        textureSetCfg.metallicRoughnessTextureId !== undefined) {
        textureSetCfg.id = `textureSet-${ctx.nextId++};`
        ctx.sceneModel.createTextureSet(textureSetCfg);
        return textureSetCfg.id;
    }
    return null;
}

function loadMaterialAttributes(ctx, material) { // Substitute RGBA for material, to use fast flat shading instead
    const extensions = material.extensions;
    const materialAttributes = {
        color: new Float32Array([1, 1, 1, 1]),
        opacity: 1,
        metallic: 0,
        roughness: 1
    };
    if (extensions) {
        const specularPBR = extensions["KHR_materials_pbrSpecularGlossiness"];
        if (specularPBR) {
            const diffuseFactor = specularPBR.diffuseFactor;
            if (diffuseFactor !== null && diffuseFactor !== undefined) {
                materialAttributes.color.set(diffuseFactor);
            }
        }
        const common = extensions["KHR_materials_common"];
        if (common) {
            const technique = common.technique;
            const values = common.values || {};
            const blinn = technique === "BLINN";
            const phong = technique === "PHONG";
            const lambert = technique === "LAMBERT";
            const diffuse = values.diffuse;
            if (diffuse && (blinn || phong || lambert)) {
                if (!utils.isString(diffuse)) {
                    materialAttributes.color.set(diffuse);
                }
            }
            const transparency = values.transparency;
            if (transparency !== null && transparency !== undefined) {
                materialAttributes.opacity = transparency;
            }
            const transparent = values.transparent;
            if (transparent !== null && transparent !== undefined) {
                materialAttributes.opacity = transparent;
            }
        }
    }
    const metallicPBR = material.pbrMetallicRoughness;
    if (metallicPBR) {
        const baseColorFactor = metallicPBR.baseColorFactor;
        if (baseColorFactor) {
            materialAttributes.color[0] = baseColorFactor[0];
            materialAttributes.color[1] = baseColorFactor[1];
            materialAttributes.color[2] = baseColorFactor[2];
            materialAttributes.opacity = baseColorFactor[3];
        }
        const metallicFactor = metallicPBR.metallicFactor;
        if (metallicFactor !== null && metallicFactor !== undefined) {
            materialAttributes.metallic = metallicFactor;
        }
        const roughnessFactor = metallicPBR.roughnessFactor;
        if (roughnessFactor !== null && roughnessFactor !== undefined) {
            materialAttributes.roughness = roughnessFactor;
        }
    }
    return materialAttributes;
}

function loadDefaultScene(ctx) {
    const gltfData = ctx.gltfData;
    const scene = gltfData.scene || gltfData.scenes[0];
    if (!scene) {
        error(ctx, "glTF has no default scene");
        return;
    }
    loadScene(ctx, scene);
}

function loadScene(ctx, scene) {
    const nodes = scene.nodes;
    if (!nodes) {
        return;
    }
    for (let i = 0, len = nodes.length; i < len; i++) {
        const node = nodes[i];
        countMeshUsage(ctx, node);
    }
    for (let i = 0, len = nodes.length; i < len; i++) {
        const node = nodes[i];
        loadNode(ctx, node, 0, null);
    }
}

function countMeshUsage(ctx, node) {
    const mesh = node.mesh;
    if (mesh) {
        mesh.instances = mesh.instances ? mesh.instances + 1 : 1;
    }
    if (node.children) {
        const children = node.children;
        for (let i = 0, len = children.length; i < len; i++) {
            const childNode = children[i];
            if (!childNode) {
                error(ctx, "Node not found: " + i);
                continue;
            }
            countMeshUsage(ctx, childNode);
        }
    }
}

const deferredMeshIds = [];

function loadNode(ctx, node, depth, matrix) {
    const gltfData = ctx.gltfData;
    let localMatrix;
    if (node.matrix) {
        localMatrix = node.matrix;
        if (matrix) {
            matrix = math.mulMat4(matrix, localMatrix, math.mat4());
        } else {
            matrix = localMatrix;
        }
    }
    if (node.translation) {
        localMatrix = math.translationMat4v(node.translation);
        if (matrix) {
            matrix = math.mulMat4(matrix, localMatrix, math.mat4());
        } else {
            matrix = localMatrix;
        }
    }
    if (node.rotation) {
        localMatrix = math.quaternionToMat4(node.rotation);
        if (matrix) {
            matrix = math.mulMat4(matrix, localMatrix, math.mat4());
        } else {
            matrix = localMatrix;
        }
    }
    if (node.scale) {
        localMatrix = math.scalingMat4v(node.scale);
        if (matrix) {
            matrix = math.mulMat4(matrix, localMatrix, math.mat4());
        } else {
            matrix = localMatrix;
        }
    }

    const sceneModel = ctx.sceneModel;
    if (node.mesh) {
        const mesh = node.mesh;
        let createEntity;
        if (ctx.handlenode) {
            const actions = {};
            if (!ctx.handlenode(ctx.sceneModel.id, node, actions)) {
                return;
            }
            if (actions.createEntity) {
                createEntity = actions.createEntity;
            }
        }
        const worldMatrix = matrix ? matrix.slice() : math.identityMat4();
        const numPrimitives = mesh.primitives.length;

        if (numPrimitives > 0) {

            for (let i = 0; i < numPrimitives; i++) {

                const primitive = mesh.primitives[i];
                if (primitive.mode < 4) {
                    continue;
                }

                const meshCfg = {
                    id: sceneModel.id + "." + ctx.numObjects++
                };

                switch (primitive.mode) {
                    case 0: // POINTS
                        meshCfg.primitive = "points";
                        break;
                    case 1: // LINES
                        meshCfg.primitive = "lines";
                        break;
                    case 2: // LINE_LOOP
                        meshCfg.primitive = "lines";
                        break;
                    case 3: // LINE_STRIP
                        meshCfg.primitive = "lines";
                        break;
                    case 4: // TRIANGLES
                        meshCfg.primitive = "triangles";
                        break;
                    case 5: // TRIANGLE_STRIP
                        meshCfg.primitive = "triangles";
                        break;
                    case 6: // TRIANGLE_FAN
                        meshCfg.primitive = "triangles";
                        break;
                    default:
                        meshCfg.primitive = "triangles";
                }

                const POSITION = primitive.attributes.POSITION;
                if (!POSITION) {
                    continue;
                }
                meshCfg.localPositions = POSITION.value;
                meshCfg.positions = new Float64Array(meshCfg.localPositions.length);

                if (primitive.attributes.NORMAL) {
                    meshCfg.normals = primitive.attributes.NORMAL.value;
                }

                if (primitive.attributes.TEXCOORD_0) {
                    meshCfg.uv = primitive.attributes.TEXCOORD_0.value;
                }

                if (primitive.indices) {
                    meshCfg.indices = primitive.indices.value;
                }

                math.transformPositions3(worldMatrix, meshCfg.localPositions, meshCfg.positions);
                const origin = math.vec3();
                const rtcNeeded = worldToRTCPositions(meshCfg.positions, meshCfg.positions, origin); // Small cellsize guarantees better accuracy
                if (rtcNeeded) {
                    meshCfg.origin = origin;
                }

                const material = primitive.material;
                if (material) {
                    meshCfg.textureSetId = material._textureSetId;
                    meshCfg.color = material._attributes.color;
                    meshCfg.opacity = material._attributes.opacity;
                    meshCfg.metallic = material._attributes.metallic;
                    meshCfg.roughness = material._attributes.roughness;
                } else {
                    meshCfg.color = new Float32Array([1.0, 1.0, 1.0]);
                    meshCfg.opacity = 1.0;
                }
                // if (createEntity) {
                //     if (createEntity.colorize) {
                //         meshCfg.color = createEntity.colorize;
                //     }
                //     if (createEntity.opacity !== undefined && createEntity.opacity !== null) {
                //         meshCfg.opacity = createEntity.opacity;
                //     }
                // }

                sceneModel.createMesh(meshCfg);
                deferredMeshIds.push(meshCfg.id);
            }
            // if (createEntity) {
            //     sceneModel.createEntity(utils.apply(createEntity, {
            //         meshIds: deferredMeshIds,
            //         isObject: true
            //     }));
            // } else {
            //     sceneModel.createEntity({
            //         meshIds: deferredMeshIds,
            //         isObject: true
            //     });
            // }
        }
    }

    if (node.children) {
        const children = node.children;
        for (let i = 0, len = children.length; i < len; i++) {
            const childNode = children[i];
            loadNode(ctx, childNode, depth + 1, matrix);
        }
    }

    // Post-order visit scene node

    const nodeName = node.name;
    if (((nodeName !== undefined && nodeName !== null) || depth === 0) && deferredMeshIds.length > 0) {
        if (nodeName === undefined || nodeName === null) {
            ctx.log(`Warning: 'name' properties not found on glTF scene nodes - will randomly-generate object IDs in XKT`);
        }
        let entityId = nodeName; // Fall back on generated ID when `name` not found on glTF scene node(s)
        // if (!!entityId && sceneModel.entities[entityId]) {
        //     ctx.log(`Warning: Two or more glTF nodes found with same 'name' attribute: '${nodeName} - will randomly-generating an object ID in XKT`);
        // }
        // while (!entityId || sceneModel.entities[entityId]) {
        //     entityId = "entity-" + ctx.nextId++;
        // }
        if (ctx.metaModelCorrections) {
            // Merging meshes into XKTObjects that map to metaobjects
            const rootMetaObject = ctx.metaModelCorrections.eachChildRoot[entityId];
            if (rootMetaObject) {
                const rootMetaObjectStats = ctx.metaModelCorrections.eachRootStats[rootMetaObject.id];
                rootMetaObjectStats.countChildren++;
                if (rootMetaObjectStats.countChildren >= rootMetaObjectStats.numChildren) {
                    sceneModel.createEntity({
                        id: rootMetaObject.id,
                        meshIds: deferredMeshIds
                    });
                    deferredMeshIds.length = 0;
                }
            } else {
                const metaObject = ctx.metaModelCorrections.metaObjectsMap[entityId];
                if (metaObject) {
                    sceneModel.createEntity({
                        id: entityId,
                        meshIds: deferredMeshIds
                    });
                    deferredMeshIds.length = 0;
                }
            }
        } else {
            // Create an XKTObject from the meshes at each named glTF node, don't care about metaobjects
            sceneModel.createEntity({
                id: entityId,
                meshIds: deferredMeshIds
            });
            deferredMeshIds.length = 0;
        }
    }
}

function error(ctx, msg) {
    ctx.plugin.error(msg);
}

export {GLTFSceneModelLoader};
