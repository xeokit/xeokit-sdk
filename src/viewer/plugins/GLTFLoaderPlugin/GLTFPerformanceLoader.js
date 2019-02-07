import {math} from "../../../scene/math/math.js";
import {utils} from "../../../scene/utils.js";
import {core} from "../../../scene/core.js";
import {buildEdgeIndices} from '../../../scene/math/buildEdgeIndices.js';

/**
 * @private
 */
class GLTFPerformanceLoader {

    constructor(cfg) { // TODO: Loading options fallbacks on loader, eg. handleGLTFNode etc
        cfg = cfg || {};
    }

    load(plugin, detailModel, src, options, ok, error) {
        options = options || {};
        var spinner = detailModel.scene.canvas.spinner;
        spinner.processes++;
        loadGLTF(plugin, detailModel, src, options, function () {
                spinner.processes--;
                core.scheduleTask(function () {
                    detailModel.fire("loaded", true, true);
                });
                if (ok) {
                    ok();
                }
            },
            function (msg) {
                spinner.processes--;
                plugin.error(msg);
                if (error) {
                    error(msg);
                }
                detailModel.fire("error", msg);
            });
    }

    parse(plugin, detailModel, gltf, options, ok, error) {
        options = options || {};
        var spinner = detailModel.scene.canvas.spinner;
        spinner.processes++;
        parseGLTF(plugin, gltf, "", options, detailModel, function () {
                spinner.processes--;
                detailModel.fire("loaded", true, true);
                if (ok) {
                    ok();
                }
            },
            function (msg) {
                spinner.processes--;
                detailModel.error(msg);
                detailModel.fire("error", msg);
                if (error) {
                    error(msg);
                }
            });
    }
}

const INSTANCE_THRESHOLD = 1;

var loadGLTF = (function () {

    return function (plugin, detailModel, src, options, ok, error) {
        utils.loadJSON(src, function (json) { // OK
                options.basePath = getBasePath(src);
                parseGLTF(json, src, options, plugin, detailModel, ok, error);
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

    return function (json, src, options, plugin, detailModel, ok) {

        var ctx = {
            src: src,
            loadBuffer: options.loadBuffer,
            basePath: options.basePath,
            handleGLTFNode: options.handleGLTFNode,
            json: json,
            scene: detailModel.scene,
            plugin: plugin,
            detailModel: detailModel,
            numObjects: 0
        };

        detailModel.scene.loading++; // Disables (re)compilation

        loadBuffers(ctx, function () {
            loadBufferViews(ctx);
            freeBuffers(ctx); // Don't need buffers once we've created views of them
            loadMaterials(ctx);
            loadDefaultScene(ctx);
            detailModel.scene.loading--; // Re-enables (re)compilation
            detailModel.finalize();
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
                    if (request.readyState === 4) {
                        if (request.status === 200) {
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

    function freeBuffers(ctx) {
        var buffers = ctx.json.buffers;
        if (buffers) {
            for (var i = 0, len = buffers.length; i < len; i++) {
                buffers[i]._buffer = null;
            }
        }
    }

    function loadMaterials(ctx) {
        var materialsInfo = ctx.json.materials;
        if (materialsInfo) {
            var materialInfo;
            var material;
            for (var i = 0, len = materialsInfo.length; i < len; i++) {
                materialInfo = materialsInfo[i];
                material = loadMaterialColorize(ctx, materialInfo);
                materialInfo._rgbaColor = material;
            }
        }
    }

    function loadMaterialColorize(ctx, materialInfo) { // Substitute RGBA for material, to use fast flat shading instead
        var json = ctx.json;
        var colorize = new Float32Array([1, 1, 1, 1]);
        var extensions = materialInfo.extensions;
        if (extensions) {
            var specularPBR = extensions["KHR_materials_pbrSpecularGlossiness"];
            if (specularPBR) {
                var diffuseFactor = specularPBR.diffuseFactor;
                if (diffuseFactor !== null && diffuseFactor !== undefined) {
                    colorize.set(diffuseFactor);
                }
            }
            var common = extensions["KHR_materials_common"];
            if (common) {
                var technique = common.technique;
                var values = common.values || {};
                var blinn = technique === "BLINN";
                var phong = technique === "PHONG";
                var lambert = technique === "LAMBERT";
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
        var metallicPBR = materialInfo.pbrMetallicRoughness;
        if (metallicPBR) {
            var baseColorFactor = metallicPBR.baseColorFactor;
            if (baseColorFactor) {
                colorize.set(baseColorFactor);
            }
        }
        return colorize;
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
        var glTFNode;
        for (var i = 0, len = nodes.length; i < len; i++) {
            glTFNode = json.nodes[nodes[i]];
            if (!glTFNode) {
                error(ctx, "Node not found: " + i);
                continue;
            }
            countMeshUsage(ctx, i, glTFNode);
        }
        for (var i = 0, len = nodes.length; i < len; i++) {
            glTFNode = json.nodes[nodes[i]];
            if (glTFNode) {
                loadNode(ctx, i, glTFNode, null, null);
            }
        }
    }

    function countMeshUsage(ctx, nodeIdx, glTFNode) {
        var json = ctx.json;
        var mesh = glTFNode.mesh;
        if (mesh !== undefined) {
            var meshInfo = json.meshes[glTFNode.mesh];
            if (meshInfo) {
                meshInfo.instances = meshInfo.instances ? meshInfo.instances + 1 : 1;
            }
        }
        if (glTFNode.children) {
            var children = glTFNode.children;
            var childNodeInfo;
            var childNodeIdx;
            for (var i = 0, len = children.length; i < len; i++) {
                childNodeIdx = children[i];
                childNodeInfo = json.nodes[childNodeIdx];
                if (!childNodeInfo) {
                    error(ctx, "Node not found: " + i);
                    continue;
                }
                countMeshUsage(ctx, nodeIdx, childNodeInfo);
            }
        }
    }

    function loadNode(ctx, nodeIdx, glTFNode, matrix, parent, parentCfg) {

        parent = parent || ctx.detailModel;
        var createEntity;

        if (ctx.handleGLTFNode) {
            var actions = {};
            if (!ctx.handleGLTFNode(ctx.detailModel.id, glTFNode, actions)) {
                return;
            }
            if (actions.createEntity) {
                createEntity = actions.createEntity;
            }
        }

        var json = ctx.json;
        var detailModel = ctx.detailModel;
        var localMatrix;

        if (glTFNode.matrix) {
            localMatrix = glTFNode.matrix;
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix, math.mat4());
            } else {
                matrix = localMatrix;
            }
        }

        if (glTFNode.translation) {
            localMatrix = math.translationMat4v(glTFNode.translation);
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix, math.mat4());
            } else {
                matrix = localMatrix;
            }
        }

        if (glTFNode.rotation) {
            localMatrix = math.quaternionToMat4(glTFNode.rotation);
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix, math.mat4());
            } else {
                matrix = localMatrix;
            }
        }

        if (glTFNode.scale) {
            localMatrix = math.scalingMat4v(glTFNode.scale);
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix, math.mat4());
            } else {
                matrix = localMatrix;
            }
        }

        if (glTFNode.mesh !== undefined) {

            var meshInfo = json.meshes[glTFNode.mesh];

            if (meshInfo) {

                const numPrimitives = meshInfo.primitives.length;

                if (numPrimitives > 0) {

                    var meshIds = [];

                    for (var i = 0; i < numPrimitives; i++) {
                        const meshCfg = {
                            id: detailModel.id + "." + ctx.numObjects++,
                            matrix: matrix
                        };
                        var primitiveInfo = meshInfo.primitives[i];

                        var materialIndex = primitiveInfo.material;
                        var materialInfo;
                        if (materialIndex !== null && materialIndex !== undefined) {
                            materialInfo = json.materials[materialIndex];
                        }
                        if (materialInfo) {
                            meshCfg.color = materialInfo._rgbaColor;
                            meshCfg.opacity = materialInfo._rgbaColor[3];

                        } else {
                            meshCfg.color = new Float32Array([1.0, 1.0, 1.0]);
                            meshCfg.opacity = 1.0;
                        }

                        if (createEntity) {
                            if (createEntity.colorize) {
                                meshCfg.color = createEntity.colorize;
                            }
                            if (createEntity.opacity !== undefined && createEntity.opacity !== null) {
                                meshCfg.opacity = createEntity.opacity;
                            }
                        }

                        if (meshInfo.instances > INSTANCE_THRESHOLD) {

                            //------------------------------------------------------------------
                            // Instancing
                            //------------------------------------------------------------------

                            const geometryId = detailModel.id + "." + glTFNode.mesh;

                            if (!meshInfo.geometryId) {
                                meshInfo.geometryId = geometryId;
                                var geometryCfg = {
                                    id: geometryId
                                };
                                loadPrimitiveGeometry(ctx, meshInfo, i, geometryCfg);
                                detailModel.createGeometry(geometryCfg);
                            }

                            meshCfg.geometryId = geometryId;

                            const mesh = detailModel.createMesh(meshCfg);
                            meshIds.push(meshCfg.id);

                        } else {

                            //------------------------------------------------------------------
                            // Batching
                            //------------------------------------------------------------------

                            loadPrimitiveGeometry(ctx, meshInfo, i, meshCfg);

                            const mesh = detailModel.createMesh(meshCfg);
                            meshIds.push(meshCfg.id);
                        }
                    }

                    if (createEntity) {
                        detailModel.createEntity(utils.apply(createEntity, {
                            meshIds: meshIds
                        }));
                    } else {
                        // PerformanceModel.createEntity({
                        //     meshIds: meshIds
                        // });
                    }
                }
            }
        }

        if (glTFNode.children) {
            var children = glTFNode.children;
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

    function loadPrimitiveGeometry(ctx, meshInfo, primitiveIdx, geometryCfg) {
        var primitivesInfo = meshInfo.primitives;
        if (!primitivesInfo) {
            return;
        }
        var primitiveInfo = primitivesInfo[primitiveIdx];
        if (!primitiveInfo) {
            return;
        }
        var attributes = primitiveInfo.attributes;
        if (!attributes) {
            return;
        }
        geometryCfg.primitive = "triangles";
        var indicesIndex = primitiveInfo.indices;
        if (indicesIndex !== null && indicesIndex !== undefined) {
            const accessorInfo = ctx.json.accessors[indicesIndex];
            geometryCfg.indices = loadAccessorTypedArray(ctx, accessorInfo);
        }
        var positionsIndex = attributes.POSITION;
        if (positionsIndex !== null && positionsIndex !== undefined) {
            const accessorInfo = ctx.json.accessors[positionsIndex];
            geometryCfg.positions = loadAccessorTypedArray(ctx, accessorInfo);
          //  scalePositionsArray(geometryCfg.positions);
        }
        var normalsIndex = attributes.NORMAL;
        if (normalsIndex !== null && normalsIndex !== undefined) {
            const accessorInfo = ctx.json.accessors[normalsIndex];
            geometryCfg.normals = loadAccessorTypedArray(ctx, accessorInfo);
        }
        if (geometryCfg.indices) {
            geometryCfg.edgeIndices = buildEdgeIndices(geometryCfg.positions, geometryCfg.indices, null, 10); // Save PerformanceModel from building edges
        }
    }

    function loadAccessorTypedArray(ctx, accessorInfo) {
        var bufferViewInfo = ctx.json.bufferViews[accessorInfo.bufferView];
        var itemSize = WEBGL_TYPE_SIZES[accessorInfo.type];
        var TypedArray = WEBGL_COMPONENT_TYPES[accessorInfo.componentType];
        var elementBytes = TypedArray.BYTES_PER_ELEMENT; // For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.
        var itemBytes = elementBytes * itemSize;
        if (accessorInfo.byteStride && accessorInfo.byteStride !== itemBytes) { // The buffer is not interleaved if the stride is the item size in bytes.
            error("interleaved buffer!"); // TODO
        } else {
            return new TypedArray(bufferViewInfo._buffer, accessorInfo.byteOffset || 0, accessorInfo.count * itemSize);
        }
    }

    function scalePositionsArray(positions) {
        for (var i =0, len = positions.length; i < len; i+=3) {
            positions[i+0] *= 1000;
            positions[i+1] *= 1000;
            positions[i+2] *= 1000;
        }

    }

    function error(ctx, msg) {
        ctx.plugin.error(msg);
    }
})();

export {GLTFPerformanceLoader}