import {math} from "../../viewer/scene/math/math.js";
import {utils} from "../../viewer/scene/utils.js";
import {core} from "../../viewer/scene/core.js";
import {buildEdgeIndices} from '../../viewer/scene/math/buildEdgeIndices.js';

/**
 * @private
 */
class GLTFPerformanceLoader {

    constructor(cfg) { // TODO: Loading options fallbacks on loader, eg. handleGLTFNode etc
        cfg = cfg || {};
    }

    load(plugin, performanceModel, src, options, ok, error) {
        options = options || {};
        loadGLTF(plugin, performanceModel, src, options, function () {
                core.scheduleTask(function () {
                    performanceModel.scene.fire("modelLoaded", performanceModel.id); // FIXME: Assumes listeners know order of these two events
                    performanceModel.fire("loaded", true, false);
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
                performanceModel.fire("error", msg);
            });
    }

    parse(plugin, performanceModel, gltf, options, ok, error) {
        options = options || {};
        parseGLTF(plugin, gltf, "", options, performanceModel, function () {
                performanceModel.scene.fire("modelLoaded", performanceModel.id); // FIXME: Assumes listeners know order of these two events
                performanceModel.fire("loaded", true, false);
                if (ok) {
                    ok();
                }
            },
            function (msg) {
                performanceModel.error(msg);
                performanceModel.fire("error", msg);
                if (error) {
                    error(msg);
                }
            });
    }
}

const INSTANCE_THRESHOLD = 1;

const loadGLTF = (function () {

    return function (plugin, performanceModel, src, options, ok, error) {
        const spinner = plugin.viewer.scene.canvas.spinner;
        spinner.processes++;
        plugin.dataSource.getGLTF(src, function (json) { // OK
                spinner.processes--;
                parseGLTF(plugin, json, src, options, performanceModel, ok, error);
            },
            error);
    };

    function getBasePath(src) {
        const i = src.lastIndexOf("/");
        return (i !== 0) ? src.substring(0, i + 1) : "";
    }
})();

const parseGLTF = (function () {

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

    return function (plugin, json, src, options, performanceModel, ok) {
        const ctx = {
            src: src,
            loadBuffer: options.loadBuffer,
            handleGLTFNode: options.handleGLTFNode,
            json: json,
            scene: performanceModel.scene,
            plugin: plugin,
            performanceModel: performanceModel,
            geometryCreated: {},
            numObjects: 0,
            nodes: []
        };
        const spinner = plugin.viewer.scene.canvas.spinner;
        spinner.processes++;
        loadBuffers(ctx, function () {
            loadBufferViews(ctx);
            freeBuffers(ctx); // Don't need buffers once we've created views of them
            loadMaterials(ctx);
            spinner.processes--;
            loadDefaultScene(ctx);
            performanceModel.finalize();
            ok();
        });
    };

    function loadBuffers(ctx, ok) {
        const buffers = ctx.json.buffers;
        if (buffers) {
            let numToLoad = buffers.length;
            for (let i = 0, len = buffers.length; i < len; i++) {
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
        const uri = bufferInfo.uri;
        if (uri) {
            ctx.plugin.dataSource.getArrayBuffer(ctx.src, uri, function (data) {
                    bufferInfo._buffer = data;
                    ok();
                },
                err);
        } else {
            err('gltf/handleBuffer missing uri in ' + JSON.stringify(bufferInfo));
        }
    }

    function loadBufferViews(ctx) {
        const bufferViewsInfo = ctx.json.bufferViews;
        if (bufferViewsInfo) {
            for (let i = 0, len = bufferViewsInfo.length; i < len; i++) {
                loadBufferView(ctx, bufferViewsInfo[i]);
            }
        }
    }

    function loadBufferView(ctx, bufferViewInfo) {
        const buffer = ctx.json.buffers[bufferViewInfo.buffer];
        bufferViewInfo._typedArray = null;
        const byteLength = bufferViewInfo.byteLength || 0;
        const byteOffset = bufferViewInfo.byteOffset || 0;
        bufferViewInfo._buffer = buffer._buffer.slice(byteOffset, byteOffset + byteLength);
    }

    function freeBuffers(ctx) {
        const buffers = ctx.json.buffers;
        if (buffers) {
            for (let i = 0, len = buffers.length; i < len; i++) {
                buffers[i]._buffer = null;
            }
        }
    }

    function loadMaterials(ctx) {
        const materialsInfo = ctx.json.materials;
        if (materialsInfo) {
            for (let i = 0, len = materialsInfo.length; i < len; i++) {
                const materialInfo = materialsInfo[i];
                const material = loadMaterialColorize(ctx, materialInfo);
                materialInfo._rgbaColor = material;
            }
        }
    }

    function loadMaterialColorize(ctx, materialInfo) { // Substitute RGBA for material, to use fast flat shading instead
        const colorize = new Float32Array([1, 1, 1, 1]);
        const extensions = materialInfo.extensions;
        if (extensions) {
            const specularPBR = extensions["KHR_materials_pbrSpecularGlossiness"];
            if (specularPBR) {
                const diffuseFactor = specularPBR.diffuseFactor;
                if (diffuseFactor !== null && diffuseFactor !== undefined) {
                    colorize.set(diffuseFactor);
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
                        colorize.set(diffuse);
                    }
                }
                const transparency = values.transparency;
                if (transparency !== null && transparency !== undefined) {
                    colorize[3] = transparency;
                }
                const transparent = values.transparent;
                if (transparent !== null && transparent !== undefined) {
                    colorize[3] = transparent;
                }
            }
        }
        const metallicPBR = materialInfo.pbrMetallicRoughness;
        if (metallicPBR) {
            const baseColorFactor = metallicPBR.baseColorFactor;
            if (baseColorFactor) {
                colorize.set(baseColorFactor);
            }
        }
        return colorize;
    }

    function loadDefaultScene(ctx) {
        const json = ctx.json;
        const scene = json.scene || 0;
        const defaultSceneInfo = json.scenes[scene];
        if (!defaultSceneInfo) {
            error(ctx, "glTF has no default scene");
            return;
        }
        preprocessScene(ctx, defaultSceneInfo);
        loadScene(ctx, defaultSceneInfo);
    }

    function preprocessScene(ctx, sceneInfo) {
        const nodes = sceneInfo.nodes;
        if (!nodes) {
            return;
        }
        const json = ctx.json;
        for (let i = 0, len = nodes.length; i < len; i++) {
            const glTFNode = json.nodes[nodes[i]];
            if (!glTFNode) {
                error(ctx, "Node not found: " + i);
                continue;
            }
            countMeshUsage(ctx, i, glTFNode);
        }
    }

    function loadScene(ctx, sceneInfo) {
        const nodes = sceneInfo.nodes;
        if (!nodes) {
            return;
        }
        const json = ctx.json;
        for (let i = 0, len = nodes.length; i < len; i++) {
            const glTFNode = json.nodes[nodes[i]];
            if (!glTFNode) {
                error(ctx, "Node not found: " + i);
                continue;
            }
            countMeshUsage(ctx, glTFNode);
        }
        ctx.plugin.viewer.scene.canvas.spinner.processes++;
        for (let i = 0, len = nodes.length; i < len; i++) {
            const glTFNode = json.nodes[nodes[i]];
            loadNode(ctx, glTFNode, null);
        }
        ctx.plugin.viewer.scene.canvas.spinner.processes--;
    }

    function countMeshUsage(ctx, glTFNode) {
        const json = ctx.json;
        const mesh = glTFNode.mesh;
        if (mesh !== undefined) {
            const meshInfo = json.meshes[glTFNode.mesh];
            if (meshInfo) {
                meshInfo.instances = meshInfo.instances ? meshInfo.instances + 1 : 1;
            }
        }
        if (glTFNode.children) {
            const children = glTFNode.children;
            for (let i = 0, len = children.length; i < len; i++) {
                const childNodeIdx = children[i];
                const childNodeInfo = json.nodes[childNodeIdx];
                if (!childNodeInfo) {
                    error(ctx, "Node not found: " + i);
                    continue;
                }
                countMeshUsage(ctx, childNodeInfo);
            }
        }
    }

    function loadNode(ctx, glTFNode, matrix) {

        const json = ctx.json;
        let localMatrix;

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

                let createEntity;

                if (ctx.handleGLTFNode) {
                    const actions = {};
                    if (!ctx.handleGLTFNode(ctx.performanceModel.id, glTFNode, actions)) {
                        return;
                    }
                    if (actions.createEntity) {
                        createEntity = actions.createEntity;
                    }
                }

                const performanceModel = ctx.performanceModel;
                const worldMatrix = matrix ? matrix.slice() : math.identityMat4();
                const numPrimitives = meshInfo.primitives.length;

                if (numPrimitives > 0) {

                    const meshIds = [];

                    for (let i = 0; i < numPrimitives; i++) {
                        const meshCfg = {
                            id: performanceModel.id + "." + ctx.numObjects++,
                            matrix: worldMatrix
                        };
                        const primitiveInfo = meshInfo.primitives[i];

                        const materialIndex = primitiveInfo.material;
                        let materialInfo;
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

                            // Instancing

                            const geometryId = performanceModel.id + "." + glTFNode.mesh + "." + i;
                            if (!ctx.geometryCreated[geometryId]) {
                                const geometryCfg = {
                                    id: geometryId
                                };
                                loadPrimitiveGeometry(ctx, primitiveInfo, geometryCfg);
                                performanceModel.createGeometry(geometryCfg);
                                ctx.geometryCreated[geometryId] = true;
                            }

                            meshCfg.geometryId = geometryId;

                            performanceModel.createMesh(meshCfg);
                            meshIds.push(meshCfg.id);

                        } else {

                            // Batching

                            loadPrimitiveGeometry(ctx, primitiveInfo, meshCfg);

                            performanceModel.createMesh(meshCfg);
                            meshIds.push(meshCfg.id);
                        }
                    }

                    if (createEntity) {
                        performanceModel.createEntity(utils.apply(createEntity, {
                            meshIds: meshIds
                        }));
                    } else {
                        performanceModel.createEntity({
                            meshIds: meshIds
                        });
                    }
                }
            }
        }

        if (glTFNode.children) {
            const children = glTFNode.children;
            for (let i = 0, len = children.length; i < len; i++) {
                const childNodeIdx = children[i];
                const childNodeInfo = json.nodes[childNodeIdx];
                if (!childNodeInfo) {
                    error(ctx, "Node not found: " + i);
                    continue;
                }
                loadNode(ctx, childNodeInfo, matrix);
            }
        }
    }

    function loadPrimitiveGeometry(ctx, primitiveInfo, geometryCfg) {
        const attributes = primitiveInfo.attributes;
        if (!attributes) {
            return;
        }
        geometryCfg.primitive = "triangles";
        const indicesIndex = primitiveInfo.indices;
        if (indicesIndex !== null && indicesIndex !== undefined) {
            const accessorInfo = ctx.json.accessors[indicesIndex];
            geometryCfg.indices = loadAccessorTypedArray(ctx, accessorInfo);
        }
        const positionsIndex = attributes.POSITION;
        if (positionsIndex !== null && positionsIndex !== undefined) {
            const accessorInfo = ctx.json.accessors[positionsIndex];
            geometryCfg.positions = loadAccessorTypedArray(ctx, accessorInfo);
            //  scalePositionsArray(geometryCfg.positions);
        }
        const normalsIndex = attributes.NORMAL;
        if (normalsIndex !== null && normalsIndex !== undefined) {
            const accessorInfo = ctx.json.accessors[normalsIndex];
            geometryCfg.normals = loadAccessorTypedArray(ctx, accessorInfo);
        }
        if (geometryCfg.indices) {
            geometryCfg.edgeIndices = buildEdgeIndices(geometryCfg.positions, geometryCfg.indices, null, 10); // Save PerformanceModel from building edges
        }
    }

    function loadAccessorTypedArray(ctx, accessorInfo) {
        const bufferViewInfo = ctx.json.bufferViews[accessorInfo.bufferView];
        const itemSize = WEBGL_TYPE_SIZES[accessorInfo.type];
        const TypedArray = WEBGL_COMPONENT_TYPES[accessorInfo.componentType];
        const elementBytes = TypedArray.BYTES_PER_ELEMENT; // For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.
        const itemBytes = elementBytes * itemSize;
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

export {GLTFPerformanceLoader}
