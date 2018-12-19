import {Mesh} from "./../../../scene/mesh/Mesh.js";
import {Geometry} from "./../../../scene/geometry/Geometry.js";
import {PhongMaterial} from "./../../../scene/materials/PhongMaterial.js";
import {MetallicMaterial} from "./../../../scene/materials/MetallicMaterial.js";
import {SpecularMaterial} from "./../../../scene/materials/SpecularMaterial.js";
import {LambertMaterial} from "./../../../scene/materials/LambertMaterial.js";
import {Texture} from "./../../../scene/materials/Texture.js";
import {Group} from "./../../../scene/objects/Group.js";
import {math} from "./../../../scene/math/math.js";
import {utils} from "./../../../scene/utils.js";
import {core} from "./../../../scene/core.js";

/**
 * @private
 */
class GLTFLoader {

    constructor (cfg) { // TODO: Loading options fallbacks on loader, eg. handleNode etc
        cfg = cfg || {};
        this._handleNode = cfg.handleNode;
    }

    load(plugin, groupModel, src, options, ok, error) {
        options = options || {};
        var spinner = groupModel.scene.canvas.spinner;
        spinner.processes++;
        loadGLTF(plugin, groupModel, src, options, function () {
                spinner.processes--;
                core.scheduleTask(function () {
                    groupModel.fire("loaded", true, true);
                });
                if (ok) {
                    ok();
                }
            },
            function (msg) {
                spinner.processes--;
                groupModel.error(msg);
                if (error) {
                    error(msg);
                }
                groupModel.fire("error", msg);
            });
    }

    parse(plugin, groupModel, gltf, options, ok, error) {
        options = options || {};
        var spinner = groupModel.scene.canvas.spinner;
        spinner.processes++;
        parseGLTF(plugin, gltf, "", options, groupModel, function () {
                spinner.processes--;
                groupModel.fire("loaded", true, true);
                if (ok) {
                    ok();
                }
            },
            function (msg) {
                spinner.processes--;
                groupModel.error(msg);
                groupModel.fire("error", msg);
                if (error) {
                    error(msg);
                }
            });
    }
}


var loadGLTF = (function () {
    return function (plugin, groupModel, src, options, ok, error) {
        utils.loadJSON(src, function (json) { // OK
                options.basePath = getBasePath(src);
                parseGLTF(json, src, options, plugin, groupModel, ok, error);
            },
            error);
    };
    function getBasePath(src) {
        var i = src.lastIndexOf("/");
        return (i !== 0) ? src.substring(0, i + 1) : "";
    }
})();

var parseGLTF = (function () {

    const WEBGL_COMPONENT_TYPES = {
        5120: Int8Array,
        5121: Uint8Array,
        5122: Int16Array,
        5123: Uint16Array,
        5125: Uint32Array,
        5126: Float32Array
    };

    const WEBGL_TYPE_SIZES = {
        'SCALAR': 1,
        'VEC2': 2,
        'VEC3': 3,
        'VEC4': 4,
        'MAT2': 4,
        'MAT3': 9,
        'MAT4': 16
    };

    return function (json, src, options, plugin, groupModel, ok) {
        groupModel.clear();
        var ctx = {
            src: src,
            loadBuffer: options.loadBuffer,
            basePath: options.basePath,
            handleNode: options.handleNode,
            ignoreMaterials: !!options.ignoreMaterials,
            combineGeometry: options.combineGeometry,
            quantizeGeometry: options.quantizeGeometry,
            edgeThreshold: options.edgeThreshold,
            lambertMaterials: !!options.lambertMaterials,
            json: json,
            scene: groupModel.scene,
            plugin: plugin,
            groupModel: groupModel,
            modelProps: {
                visible: groupModel.visible,
                culled: groupModel.culled,
                ghosted: groupModel.ghosted,
                highlighted: groupModel.highlighted,
                selected: groupModel.selected,
                outlined: groupModel.outlined,
                clippable: groupModel.clippable,
                pickable: groupModel.pickable,
                collidable: groupModel.collidable,
                castShadow: groupModel.castShadow,
                receiveShadow: groupModel.receiveShadow,
                colorize: groupModel.colorize,
                opacity: groupModel.opacity,
                edges: groupModel.edges
            },
            numObjects: 0
        };

        groupModel.scene.loading++; // Disables (re)compilation

        loadBuffers(ctx, function () {

            loadBufferViews(ctx);
            loadAccessors(ctx);
            if (!ctx.lambertMaterials) {
                loadTextures(ctx);
            }
            if (!ctx.ignoreMaterials) {
                loadMaterials(ctx);
            }
            loadMeshes(ctx);
            loadDefaultScene(ctx);

            groupModel.scene.loading--; // Re-enables (re)compilation

            ok();
        });
    };

    function loadBuffers(ctx, ok) {
        var buffers = ctx.json.buffers;
        if (buffers) {
            var numToLoad = buffers.length;
            for (var i = 0, len = buffers.length; i < len; i++) {
                loadBuffer(ctx, buffers[i], function () {
                    if (--numToLoad === 0) {
                        ok();
                    }
                }, function (msg) {
                    ctx.plugin.error(msg);
                    if (--numToLoad === 0) {
                        ok();
                    }
                });
            }
        } else {
            ok();
        }
    }

    function loadBuffer(ctx, bufferInfo, ok, err) {
        var uri = bufferInfo.uri;
        if (uri) {
            loadArrayBuffer(ctx, uri, function (data) {
                    bufferInfo._buffer = data;
                    ok();
                },
                err);
        } else {
            err('gltf/handleBuffer missing uri in ' + JSON.stringify(bufferInfo));
        }
    }

    function loadArrayBuffer(ctx, url, ok, err) {

        // Check for data: URI

        var dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;
        var dataUriRegexResult = url.match(dataUriRegex);

        if (dataUriRegexResult) { // Safari can't handle data URIs through XMLHttpRequest

            var mimeType = dataUriRegexResult[1];
            var isBase64 = !!dataUriRegexResult[2];
            var data = dataUriRegexResult[3];

            data = window.decodeURIComponent(data);

            if (isBase64) {
                data = window.atob(data);
            }

            try {
                var buffer = new ArrayBuffer(data.length);
                var view = new Uint8Array(buffer);
                for (var i = 0; i < data.length; i++) {
                    view[i] = data.charCodeAt(i);
                }
                window.setTimeout(function () {
                    ok(buffer);
                }, 0);
            } catch (error) {
                window.setTimeout(function () {
                    err(error);
                }, 0);
            }
        } else {

            if (ctx.loadBuffer) {
                ctx.loadBuffer(url, ok, err);

            } else {

                var request = new XMLHttpRequest();
                request.open('GET', ctx.basePath + url, true);
                request.responseType = 'arraybuffer';
                request.onreadystatechange = function () {
                    if (request.readyState == 4) {
                        if (request.status == "200") {
                            ok(request.response);
                        } else {
                            err('loadArrayBuffer error : ' + request.response);
                        }
                    }
                };
                request.send(null);
            }
        }
    }

    function loadBufferViews(ctx) {
        var bufferViewsInfo = ctx.json.bufferViews;
        if (bufferViewsInfo) {
            for (var i = 0, len = bufferViewsInfo.length; i < len; i++) {
                loadBufferView(ctx, bufferViewsInfo[i]);
            }
        }
    }

    function loadBufferView(ctx, bufferViewInfo) {

        var buffer = ctx.json.buffers[bufferViewInfo.buffer];

        bufferViewInfo._typedArray = null;

        var byteLength = bufferViewInfo.byteLength || 0;
        var byteOffset = bufferViewInfo.byteOffset || 0;

        bufferViewInfo._buffer = buffer._buffer.slice(byteOffset, byteOffset + byteLength);
    }

    function loadAccessors(ctx) {
        var accessorsInfo = ctx.json.accessors;
        if (accessorsInfo) {
            for (var i = 0, len = accessorsInfo.length; i < len; i++) {
                loadAccessor(ctx, accessorsInfo[i]);
            }
        }
    }

    function loadAccessor(ctx, accessorInfo) {
        var bufferViewInfo = ctx.json.bufferViews[accessorInfo.bufferView];
        var itemSize = WEBGL_TYPE_SIZES[accessorInfo.type];
        var TypedArray = WEBGL_COMPONENT_TYPES[accessorInfo.componentType];

        // For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.
        var elementBytes = TypedArray.BYTES_PER_ELEMENT;
        var itemBytes = elementBytes * itemSize;

        // The buffer is not interleaved if the stride is the item size in bytes.
        if (accessorInfo.byteStride && accessorInfo.byteStride !== itemBytes) {

            //TODO

//                alert("interleaved buffer!");

        } else {
            accessorInfo._typedArray = new TypedArray(bufferViewInfo._buffer, accessorInfo.byteOffset || 0, accessorInfo.count * itemSize);
            accessorInfo._itemSize = itemSize;
        }
    }


    function loadTextures(ctx) {
        var texturesInfo = ctx.json.textures;
        if (texturesInfo) {
            for (var i = 0, len = texturesInfo.length; i < len; i++) {
                loadTexture(ctx, texturesInfo[i]);
            }
        }
    }

    function loadTexture(ctx, textureInfo) {
        textureInfo._texture = new Texture(ctx.groupModel, {
            src: ctx.json.images[textureInfo.source].uri ? ctx.basePath + ctx.json.images[textureInfo.source].uri : undefined,
            flipY: !!textureInfo.flipY,
            encoding: "sRGB"
        });
    }

    function loadMaterials(ctx) {
        var materialsInfo = ctx.json.materials;
        if (materialsInfo) {
            var materialInfo;
            var material;
            for (var i = 0, len = materialsInfo.length; i < len; i++) {
                materialInfo = materialsInfo[i];
                if (ctx.lambertMaterials) {
                    // Substitute RGBA for material, to use fast flat shading instead
                    material = loadMaterialColorize(ctx, materialInfo);
                } else {
                    material = loadMaterial(ctx, materialInfo);
                }
                materialInfo._material = material;
            }
        }
    }

    function loadMaterial(ctx, materialInfo) {

        var json = ctx.json;
        var cfg = {};
        var textureInfo;

        // Common attributes

        var normalTexture = materialInfo.normalTexture;
        if (normalTexture) {
            textureInfo = json.textures[normalTexture.index];
            if (textureInfo) {
                cfg.normalMap = textureInfo._texture;
                //cfg.normalMap.encoding = "linear";
            }
        }

        var occlusionTexture = materialInfo.occlusionTexture;
        if (occlusionTexture) {
            textureInfo = json.textures[occlusionTexture.index];
            if (textureInfo) {
                cfg.occlusionMap = textureInfo._texture;
            }
        }

        var emissiveTexture = materialInfo.emissiveTexture;
        if (emissiveTexture) {
            textureInfo = json.textures[emissiveTexture.index];
            if (textureInfo) {
                cfg.emissiveMap = textureInfo._texture;
                //cfg.emissiveMap.encoding = "sRGB";
            }
        }

        var emissiveFactor = materialInfo.emissiveFactor;
        if (emissiveFactor) {
            cfg.emissive = emissiveFactor;
        }

        cfg.backfaces = !!materialInfo.doubleSided;

        var alphaMode = materialInfo.alphaMode;
        switch (alphaMode) {
            case "OPAQUE":
                cfg.alphaMode = "opaque";
                break;
            case "MASK":
                cfg.alphaMode = "mask";
                break;
            case "BLEND":
                cfg.alphaMode = "blend";
                break;
            default:
        }

        var alphaCutoff = materialInfo.alphaCutoff;
        if (alphaCutoff !== undefined) {
            cfg.alphaCutoff = alphaCutoff;
        }

        var extensions = materialInfo.extensions;
        if (extensions) {

            // Specular PBR material

            var specularPBR = extensions["KHR_materials_pbrSpecularGlossiness"];
            if (specularPBR) {

                var diffuseFactor = specularPBR.diffuseFactor;
                if (diffuseFactor !== null && diffuseFactor !== undefined) {
                    cfg.diffuse = diffuseFactor.slice(0, 3);
                    cfg.alpha = diffuseFactor[3];
                }

                var diffuseTexture = specularPBR.diffuseTexture;
                if (diffuseTexture) {
                    textureInfo = json.textures[diffuseTexture.index];
                    if (textureInfo) {
                        cfg.diffuseMap = textureInfo._texture;
                        //cfg.diffuseMap.encoding = "sRGB";
                    }
                }

                var specularFactor = specularPBR.specularFactor;
                if (specularFactor !== null && specularFactor !== undefined) {
                    cfg.specular = specularFactor.slice(0, 3);
                }

                var glossinessFactor = specularPBR.glossinessFactor;
                if (glossinessFactor !== null && glossinessFactor !== undefined) {
                    cfg.glossiness = glossinessFactor;
                }

                var specularGlossinessTexture = specularPBR.specularGlossinessTexture;
                if (specularGlossinessTexture) {
                    textureInfo = json.textures[specularGlossinessTexture.index];
                    if (textureInfo) {
                        cfg.specularGlossinessMap = textureInfo._texture;
                        //cfg.specularGlossinessMap.encoding = "linear";
                    }
                }

                return new SpecularMaterial(ctx.groupModel, cfg);
            }

            // Common Phong, Blinn, Lambert or Constant materials

            var common = extensions["KHR_materials_common"];
            if (common) {

                var technique = common.technique;
                var values = common.values || {};

                var blinn = technique === "BLINN";
                var phong = technique === "PHONG";
                var lambert = technique === "LAMBERT";
                var constant = technique === "CONSTANT";

                var shininess = values.shininess;
                if ((blinn || phong) && shininess !== null && shininess !== undefined) {
                    cfg.shininess = shininess;
                } else {
                    cfg.shininess = 0;
                }
                var texture;
                var diffuse = values.diffuse;
                if (diffuse && (blinn || phong || lambert)) {
                    if (utils.isString(diffuse)) {
                        texture = ctx.textures[diffuse];
                        if (texture) {
                            cfg.diffuseMap = texture;
                            //  cfg.diffuseMap.encoding = "sRGB";
                        }
                    } else {
                        cfg.diffuse = diffuse.slice(0, 3);
                    }
                } else {
                    cfg.diffuse = [0, 0, 0];
                }

                var specular = values.specular;
                if (specular && (blinn || phong)) {
                    if (utils.isString(specular)) {
                        texture = ctx.textures[specular];
                        if (texture) {
                            cfg.specularMap = texture;
                        }
                    } else {
                        cfg.specular = specular.slice(0, 3);
                    }
                } else {
                    cfg.specular = [0, 0, 0];
                }

                var emission = values.emission;
                if (emission) {
                    if (utils.isString(emission)) {
                        texture = ctx.textures[emission];
                        if (texture) {
                            cfg.emissiveMap = texture;
                        }
                    } else {
                        cfg.emissive = emission.slice(0, 3);
                    }
                } else {
                    cfg.emissive = [0, 0, 0];
                }

                var transparency = values.transparency;
                if (transparency !== null && transparency !== undefined) {
                    cfg.alpha = transparency;
                } else {
                    cfg.alpha = 1.0;
                }

                var transparent = values.transparent;
                if (transparent !== null && transparent !== undefined) {
                    //cfg.transparent = transparent;
                } else {
                    //cfg.transparent = 1.0;
                }

                return new PhongMaterial(ctx.scene, cfg);
            }
        }

        // Metallic PBR naterial

        var metallicPBR = materialInfo.pbrMetallicRoughness;
        if (metallicPBR) {

            var baseColorFactor = metallicPBR.baseColorFactor;
            if (baseColorFactor) {
                cfg.baseColor = baseColorFactor.slice(0, 3);
                cfg.alpha = baseColorFactor[3];
            }

            var baseColorTexture = metallicPBR.baseColorTexture;
            if (baseColorTexture) {
                textureInfo = json.textures[baseColorTexture.index];
                if (textureInfo) {
                    cfg.baseColorMap = textureInfo._texture;
                    //cfg.baseColorMap.encoding = "sRGB";
                }
            }

            var metallicFactor = metallicPBR.metallicFactor;
            if (metallicFactor !== null && metallicFactor !== undefined) {
                cfg.metallic = metallicFactor;
            }

            var roughnessFactor = metallicPBR.roughnessFactor;
            if (roughnessFactor !== null && roughnessFactor !== undefined) {
                cfg.roughness = roughnessFactor;
            }

            var metallicRoughnessTexture = metallicPBR.metallicRoughnessTexture;
            if (metallicRoughnessTexture) {
                textureInfo = json.textures[metallicRoughnessTexture.index];
                if (textureInfo) {
                    cfg.metallicRoughnessMap = textureInfo._texture;
                    // cfg.metallicRoughnessMap.encoding = "linear";
                }
            }

            return new MetallicMaterial(ctx.scene, cfg);
        }

        // Default material

        return new PhongMaterial(ctx.scene, cfg);
    }

    // Extract diffuse/baseColor and alpha into RGBA Mesh 'colorize' property
    function loadMaterialColorize(ctx, materialInfo) {

        var json = ctx.json;
        var colorize = new Float32Array([1, 1, 1, 1]);

        var extensions = materialInfo.extensions;
        if (extensions) {

            // Specular PBR material

            var specularPBR = extensions["KHR_materials_pbrSpecularGlossiness"];
            if (specularPBR) {
                var diffuseFactor = specularPBR.diffuseFactor;
                if (diffuseFactor !== null && diffuseFactor !== undefined) {
                    colorize.set(diffuseFactor);
                }
            }

            // Common Phong, Blinn, Lambert or Constant materials

            var common = extensions["KHR_materials_common"];
            if (common) {

                var technique = common.technique;
                var values = common.values || {};

                var blinn = technique === "BLINN";
                var phong = technique === "PHONG";
                var lambert = technique === "LAMBERT";
                var constant = technique === "CONSTANT";

                var diffuse = values.diffuse;
                if (diffuse && (blinn || phong || lambert)) {
                    if (!utils.isString(diffuse)) {
                        colorize.set(diffuse);
                    }
                }

                var transparency = values.transparency;
                if (transparency !== null && transparency !== undefined) {
                    colorize[3] = transparency;
                }

                var transparent = values.transparent;
                if (transparent !== null && transparent !== undefined) {
                    colorize[3] = transparent;
                }
            }
        }

        // Metallic PBR naterial

        var metallicPBR = materialInfo.pbrMetallicRoughness;
        if (metallicPBR) {
            var baseColorFactor = metallicPBR.baseColorFactor;
            if (baseColorFactor) {
                colorize.set(baseColorFactor);
            }
        }

        return colorize;
    }

    function loadMeshes(ctx) {
        var meshes = ctx.json.meshes;
        if (meshes) {
            for (var i = 0, len = meshes.length; i < len; i++) {
                loadMesh(ctx, meshes[i]);
            }
        }
    }

    function loadMesh(ctx, meshInfo) {
        var json = ctx.json;
        var mesh = [];
        var primitivesInfo = meshInfo.primitives;
        var materialIndex;
        var materialInfo;
        var accessorInfo;
        var attributes;

        if (primitivesInfo) {

            var primitiveInfo;
            var indicesIndex;
            var positionsIndex;
            var normalsIndex;
            var uv0Index;
            var geometryCfg;
            var meshCfg;
            var geometry;

            for (var i = 0, len = primitivesInfo.length; i < len; i++) {

                geometryCfg = {
                    primitive: "triangles",
                    combined: ctx.combineGeometry,
                    quantized: ctx.quantizeGeometry,
                    edgeThreshold: ctx.edgeThreshold
                };

                primitiveInfo = primitivesInfo[i];
                indicesIndex = primitiveInfo.indices;

                if (indicesIndex !== null && indicesIndex !== undefined) {
                    accessorInfo = json.accessors[indicesIndex];
                    geometryCfg.indices = accessorInfo._typedArray;
                }

                attributes = primitiveInfo.attributes;
                if (!attributes) {
                    continue;
                }

                positionsIndex = attributes.POSITION;

                if (positionsIndex !== null && positionsIndex !== undefined) {
                    accessorInfo = json.accessors[positionsIndex];
                    geometryCfg.positions = accessorInfo._typedArray;
                }

                normalsIndex = attributes.NORMAL;

                if (normalsIndex !== null && normalsIndex !== undefined) {
                    accessorInfo = json.accessors[normalsIndex];
                    geometryCfg.normals = accessorInfo._typedArray;
                }

                uv0Index = attributes.TEXCOORD_0;

                if (uv0Index !== null && uv0Index !== undefined) {
                    accessorInfo = json.accessors[uv0Index];
                    geometryCfg.uv = accessorInfo._typedArray;
                }

                meshCfg = {};

                geometry = new Geometry(ctx.groupModel, geometryCfg);

                meshCfg.geometry = geometry;

                materialIndex = primitiveInfo.material;
                if (materialIndex !== null && materialIndex !== undefined) {
                    materialInfo = json.materials[materialIndex];
                    if (materialInfo) {
                        meshCfg.material = materialInfo._material;
                    }
                }

                mesh.push(meshCfg);
            }
        }
        meshInfo._mesh = mesh;
    }

    function loadDefaultScene(ctx) {
        var json = ctx.json;
        var scene = json.scene || 0;
        var defaultSceneInfo = json.scenes[scene];
        if (!defaultSceneInfo) {
            error(ctx, "glTF has no default scene");
            return;
        }
        loadScene(ctx, defaultSceneInfo);
    }

    function loadScene(ctx, sceneInfo) {
        var nodes = sceneInfo.nodes;
        if (!nodes) {
            return;
        }
        var json = ctx.json;
        var nodeInfo;
        for (var i = 0, len = nodes.length; i < len; i++) {
            nodeInfo = json.nodes[nodes[i]];
            if (!nodeInfo) {
                error(ctx, "Node not found: " + i);
                continue;
            }
            loadNode(ctx, i, nodeInfo, null, null);
        }
    }

    function loadNode(ctx, nodeIdx, nodeInfo, matrix, parent, parentCfg) {

        parent = parent || ctx.groupModel;
        var createObject;

        if (ctx.handleNode) {
            var actions = {};
            if (!ctx.handleNode(ctx.groupModel.id, nodeInfo, actions)) {
                return;
            }
            if (actions.createObject) {
                createObject = actions.createObject;
            }
            // if (actions.createMesh) {
            //     createMesh = actions.createMesh;
            // }
        }

        var json = ctx.json;
        var groupModel = ctx.groupModel;
        var localMatrix;
        var hasChildNodes = nodeInfo.children && nodeInfo.children.length > 0;
        var childGroup;

        if (nodeInfo.matrix) {
            localMatrix = nodeInfo.matrix;
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix, math.mat4());
            } else {
                matrix = localMatrix;
            }
        }

        if (nodeInfo.translation) {
            localMatrix = math.translationMat4v(nodeInfo.translation);
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix, localMatrix);
            } else {
                matrix = localMatrix;
            }
        }

        if (nodeInfo.rotation) {
            localMatrix = math.quaternionToMat4(nodeInfo.rotation);
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix, localMatrix);
            } else {
                matrix = localMatrix;
            }
        }

        if (nodeInfo.scale) {
            localMatrix = math.scalingMat4v(nodeInfo.scale);
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix, localMatrix);
            } else {
                matrix = localMatrix;
            }
        }

        ctx.numObjects++;

        if (nodeInfo.mesh !== undefined) {

            var meshInfo = json.meshes[nodeInfo.mesh];

            if (meshInfo) {

                var meshesInfo = meshInfo._mesh;
                var meshesInfoMesh;
                var mesh;
                var numMeshes = meshesInfo.length;

                if (!createObject && numMeshes > 0 && !hasChildNodes) {

                    // Case 1: Not creating object, node has meshes, node has no child nodes

                    for (var i = 0, len = numMeshes; i < len; i++) {
                        meshesInfoMesh = meshesInfo[i];
                        var meshCfg = {
                            geometry: meshesInfoMesh.geometry,
                            matrix: matrix
                        };
                        utils.apply(ctx.modelProps, meshCfg);
                        if (ctx.lambertMaterials) {
                            if (!groupModel.material) {
                                groupModel.material = new LambertMaterial(ctx.scene, {
                                    backfaces: true
                                });
                            }
                            meshCfg.material = groupModel.material;
                            meshCfg.colorize = meshesInfoMesh.material;
                            meshCfg.opacity = meshesInfoMesh.material[3];
                        } else {
                            meshCfg.material = meshesInfoMesh.material;
                        }
                        mesh = new Mesh(groupModel, meshCfg);
                        parent.addChild(mesh, false); // Don't automatically inherit properties
                    }
                    return;
                }

                if (createObject && numMeshes === 1 && !hasChildNodes) {

                    // Case 2: Creating object, node has one mesh, node has no child nodes

                    meshesInfoMesh = meshesInfo[0];
                    var meshCfg = {
                        geometry: meshesInfoMesh.geometry,
                        matrix: matrix
                    };
                    utils.apply(ctx.modelProps, meshCfg);
                    if (ctx.lambertMaterials) {
                        if (!groupModel.material) {
                            groupModel.material = new LambertMaterial(ctx.scene, {
                                backfaces: true
                            });
                        }
                        meshCfg.material = groupModel.material;
                        meshCfg.colorize = meshesInfoMesh.material; // [R,G,B,A]
                        meshCfg.opacity = meshesInfoMesh.material[3];
                    } else {
                        meshCfg.material = meshesInfoMesh.material;
                    }
                    utils.apply(createObject, meshCfg);
                    mesh = new Mesh(groupModel, meshCfg);
                    parent.addChild(mesh, false); // Don't automatically inherit properties
                    return;
                }

                if (createObject && numMeshes > 0 && !hasChildNodes) {

                    // Case 3: Creating object, node has meshes, node has no child nodes

                    var groupCfg = {
                        matrix: matrix
                    };
                    utils.apply(ctx.modelProps, groupCfg);
                    utils.apply(createObject, groupCfg);
                    var childGroup = new Group(groupModel, groupCfg);
                    parent.addChild(childGroup, false);
                    for (var i = 0, len = numMeshes; i < len; i++) {
                        meshesInfoMesh = meshesInfo[i];
                        var meshCfg = {
                            geometry: meshesInfoMesh.geometry
                        };
                        utils.apply(ctx.modelProps, meshCfg);
                        if (ctx.lambertMaterials) {
                            if (!groupModel.material) {
                                groupModel.material = new LambertMaterial(ctx.scene, {
                                    backfaces: true
                                });
                            }
                            meshCfg.material = groupModel.material;
                            meshCfg.colorize = meshesInfoMesh.material;
                            meshCfg.opacity = meshesInfoMesh.material[3];
                        } else {
                            meshCfg.material = meshesInfoMesh.material;
                        }
                        utils.apply(createObject, meshCfg);
                        meshCfg.id = createObject.id + "." + i;
                        meshCfg.entityType = null;
                        mesh = new Mesh(groupModel, meshCfg);
                        childGroup.addChild(mesh, false);
                    }
                    return;
                }

                if (!createObject && numMeshes > 0 && hasChildNodes) {

                    // Case 4: Not creating object, node has meshes, node has child nodes

                    var groupCfg = {
                        matrix: matrix
                    };
                    utils.apply(ctx.modelProps, groupCfg);
                    var childGroup = new Group(groupModel, groupCfg);
                    parent.addChild(childGroup, false);
                    for (var i = 0, len = numMeshes; i < len; i++) {
                        meshesInfoMesh = meshesInfo[i];
                        var meshCfg = {
                            geometry: meshesInfoMesh.geometry
                        };
                        utils.apply(groupCfg, meshCfg);
                        meshCfg.entityType = null;
                        meshCfg.matrix = null; // Group has matrix
                        if (ctx.lambertMaterials) {
                            if (!groupModel.material) {
                                groupModel.material = new LambertMaterial(ctx.scene, {
                                    backfaces: true
                                });
                            }
                            meshCfg.material = groupModel.material;
                            meshCfg.colorize = meshesInfoMesh.material;
                            meshCfg.opacity = meshesInfoMesh.material[3];
                        } else {
                            meshCfg.material = meshesInfoMesh.material;
                        }
                        mesh = new Mesh(groupModel, meshCfg);
                        childGroup.addChild(mesh, false);
                    }
                    matrix = null;
                    parent = childGroup;
                    parentCfg = groupCfg;
                }

                if (createObject && numMeshes === 0 && hasChildNodes) {

                    // Case 5: Creating explicit object, node has meshes OR node has child nodes

                    var groupCfg = {
                        matrix: matrix
                    };
                    utils.apply(ctx.modelProps, groupCfg);
                    utils.apply(createObject, groupCfg);
                    createObject.matrix = matrix;
                    var childGroup = new Group(groupModel, groupCfg);
                    parent.addChild(childGroup, false); // Don't automatically inherit properties
                    matrix = null;
                    parent = childGroup;
                    parentCfg = groupCfg;
                }

                if (createObject && numMeshes > 0 || hasChildNodes) {

                    // Case 6: Creating explicit object, node has meshes OR node has child nodes

                    var groupCfg = {
                        matrix: matrix
                    };
                    utils.apply(ctx.modelProps, groupCfg);
                    if (createObject) {
                        utils.apply(createObject, groupCfg);
                    }
                    var childGroup = new Group(groupModel, groupCfg);
                    parent.addChild(childGroup, false); // Don't automatically inherit properties
                    for (var i = 0, len = numMeshes; i < len; i++) {
                        meshesInfoMesh = meshesInfo[i];
                        var meshCfg = {
                            geometry: meshesInfoMesh.geometry
                        };
                        utils.apply(ctx.modelProps, meshCfg);
                        if (ctx.lambertMaterials) {
                            if (!groupModel.material) {
                                groupModel.material = new LambertMaterial(ctx.scene, {
                                    backfaces: true
                                });
                            }
                            meshCfg.material = groupModel.material;
                            meshCfg.colorize = meshesInfoMesh.material; // [R,G,B,A]
                            meshCfg.opacity = meshesInfoMesh.material[3];
                        } else {
                            meshCfg.material = meshesInfoMesh.material;
                        }
                        if (createObject) {
                            utils.apply(createObject, meshCfg);
                            meshCfg.id = createObject.id + "." + i;
                        }
                        meshCfg.entityType = null;
                        mesh = new Mesh(groupModel, meshCfg);
                        childGroup.addChild(mesh, false); // Don't automatically inherit properties
                    }
                    matrix = null;
                    parent = childGroup;
                    parentCfg = groupCfg;
                }
            }
        }

        if (nodeInfo.children) {
            var children = nodeInfo.children;
            var childNodeInfo;
            var childNodeIdx;
            for (var i = 0, len = children.length; i < len; i++) {
                childNodeIdx = children[i];
                childNodeInfo = json.nodes[childNodeIdx];
                if (!childNodeInfo) {
                    error(ctx, "Node not found: " + i);
                    continue;
                }
                loadNode(ctx, nodeIdx, childNodeInfo, matrix, parent, parentCfg);
            }
        }
    }

    function error(ctx, msg) {
        ctx.plugin.error(msg);
    }
})();

export {GLTFLoader}