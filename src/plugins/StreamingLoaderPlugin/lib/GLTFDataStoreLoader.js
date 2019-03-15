import {math} from "../../../viewer/scene/math/math.js";
import {utils} from "../../../viewer/scene/utils.js";
import {buildEdgeIndices} from '../../../viewer/scene/math/buildEdgeIndices.js';

const tempAABB1 = math.AABB3();
const tempAABB2 = math.AABB3();

/**
 * @private
 */
class GLTFDataStoreLoader {

    constructor(cfg) { // TODO: Loading options fallbacks on loader, eg. handleGLTFNode etc
        cfg = cfg || {};
    }

    load(plugin, scene, src, options, ok, error) {
        options = options || {};
        var spinner = scene.canvas.spinner;
        spinner.processes++;
        loadGLTF(plugin, scene, src, options, function (manifest) {
                spinner.processes--;
                if (ok) {
                    ok(manifest);
                }
            },
            function (msg) {
                spinner.processes--;
                plugin.error(msg);
                if (error) {
                    error(msg);
                }
            });
    }

    parse(plugin, scene, gltf, options) {
        return parseGLTF(plugin, scene, gltf, options);
    }
}

var loadGLTF = (function () {

    return function (plugin, scene, src, options, ok, error) {
        utils.loadJSON(src, function (json) { // OK
                options.basePath = getBasePath(src);
                var manifest = parseGLTF(plugin, scene, json, options);
                ok(manifest);
            },
            error);
    };

    function getBasePath(src) {
        var i = src.lastIndexOf("/");
        return (i !== 0) ? src.substring(0, i + 1) : "";
    }
})();

var parseGLTF = (function () {

    return function (plugin, scene, json, options, ok) {

        var t0 = performance.now();

        var ctx = {
            handleGLTFNode: options.handleGLTFNode,
            json: json,
            scene: scene,
            plugin: plugin,
            numObjects: 0,
            dataStore: {
                geometries: {},
                meshes: {}
            },
            manifest: {
                entities: []
            }
        };

        loadBuffers(ctx, function () {
            loadBufferViews(ctx);
            freeBuffers(ctx); // Don't need buffers once we've created views of them
            loadMaterials(ctx);
            loadDefaultScene(ctx);
            ok();
        });

        var t1 = performance.now();
        console.log("parseGLTF() took " + (t1 - t0) + " milliseconds.");

        return ctx.manifest;
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

    function loadBufferViews(ctx) {
        var bufferViewsInfo = ctx.json.bufferViews;
        if (bufferViewsInfo) {
            for (var i = 0, len = bufferViewsInfo.length; i < len; i++) {
                loadBufferView(ctx, bufferViewsInfo[i]);
            }
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

        var createEntity;

        if (ctx.handleGLTFNode) {
            var actions = {};
            if (!ctx.handleGLTFNode("foo", glTFNode, actions)) {
                return;
            }
            if (actions.createEntity) {
                createEntity = actions.createEntity;
            }
        }

        var json = ctx.json;
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

            const meshInfo = json.meshes[glTFNode.mesh];

            if (meshInfo) {

                const numPrimitives = meshInfo.primitives.length;

                if (numPrimitives > 0) {

                    const meshes = [];

                    math.collapseAABB3(tempAABB1);

                    for (var i = 0; i < numPrimitives; i++) {

                        const geometryId = glTFNode.mesh + "." + i;

                        const manifestMesh = {
                            geometryId: geometryId
                        };

                        const dataStoreGeometry = {
                            geometryId: geometryId
                        };

                        const dataStoreMesh = {
                            geometryId: geometryId
                        };

                        const primitiveInfo = meshInfo.primitives[i];

                        const materialIndex = primitiveInfo.material;
                        var materialInfo;
                        if (materialIndex !== null && materialIndex !== undefined) {
                            materialInfo = json.materials[materialIndex];
                        }
                        if (materialInfo) {
                            dataStoreMesh.color = materialInfo._rgbaColor;
                            dataStoreMesh.opacity = materialInfo._rgbaColor[3];

                        } else {
                            dataStoreMesh.color = new Float32Array([1.0, 1.0, 1.0]);
                            dataStoreMesh.opacity = 1.0;
                        }

                        if (createEntity) {
                            if (dataStoreMesh.colorize) {
                                dataStoreMesh.color = createEntity.colorize;
                            }
                            if (dataStoreMesh.opacity !== undefined && createEntity.opacity !== null) {
                                dataStoreMesh.opacity = createEntity.opacity;
                            }
                        }

                        if (meshInfo.instances > INSTANCE_THRESHOLD) {

                            //------------------------------------------------------------------
                            // Instancing
                            //------------------------------------------------------------------

                            dataStoreGeometry.reused = true;

                            if (!primitiveInfo.geometryId) { // Ensures we only load each primitive mesh once

                                primitiveInfo.geometryId = geometryId;

                                loadPrimitiveGeometry(ctx, primitiveInfo, dataStoreGeometry);
                            }

                            minMaxToWorldAABB(dataStoreGeometry.min, dataStoreGeometry.max, matrix, tempAABB2);
                            manifestMesh.aabb = [tempAABB2[0], tempAABB2[1], tempAABB2[2], tempAABB2[3], tempAABB2[4], tempAABB2[5]];
                            math.expandAABB3(tempAABB1, tempAABB2);

                            manifestMesh.geometryId = geometryId;

                            //    performanceModel.createMesh(meshCfg);
                            //  meshIds.push(meshCfg.id);

                        } else {

                            //------------------------------------------------------------------
                            // Batching
                            //------------------------------------------------------------------

                            dataStoreGeometry.reused = false;

                            loadPrimitiveGeometry(ctx, primitiveInfo, dataStoreGeometry);

                            // TODO

                            // Transform and quantize the mesh geometry
                            // Serve quantized geometry to client
                            // Dont serve a matrix to the client
                            // Serve single batching qauzntize matrix to client

                            minMaxToWorldAABB(dataStoreMesh.min, dataStoreMesh.max, matrix, tempAABB2);

                            math.expandAABB3(tempAABB1, tempAABB2);

                            // performanceModel.createMesh(meshCfg);
                            // meshIds.push(meshCfg.id);
                        }

                        meshes.push(manifestMesh);
                    }

                    if (createEntity) {
                        const manifestEntity = {
                            id: "foo",
                            aabb: [tempAABB1[0], tempAABB1[1], tempAABB1[2], tempAABB1[3], tempAABB1[4], tempAABB1[5]],
                            meshIds: meshIds
                        };
                        ctx.manifest.entities.push(manifestEntity);
                    } else {
                        // performanceModel.createEntity({
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

    function loadPrimitiveGeometry(ctx, primitiveInfo, geometryCfg) {
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
            geometryCfg.min = accessorInfo.min;
            geometryCfg.max = accessorInfo.max;
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

    function error(ctx, msg) {
        ctx.plugin.error(msg);
    }
})();

export {GLTFDataStoreLoader}