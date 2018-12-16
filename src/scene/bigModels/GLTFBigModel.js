import {BigModel} from "./BigModel.js";
import {utils} from "../utils.js";
import {core} from "../core.js";
import {math} from "./../math/math.js";

/**
 * @private
 */
class GLTFBigModel extends BigModel {

    init(cfg) {
        var self = this;
        super.init(cfg);
        this._options = {};
        this.loaded = cfg.loaded;
        var spinner = this.scene.canvas.spinner;
        if (cfg.gltf) {
            spinner.processes++;
            var options = utils.apply(this._options, {
                basePath: cfg.basePath || ""
            });
            parseGLTF(cfg.gltf, null, options, this,
                function () {
                    spinner.processes--;
                    core.scheduleTask(function () {
                        self.loaded = true;
                        self.fire("loaded", true, true);
                    });
                },
                function (msg) {
                    spinner.processes--;
                    self.error(msg);
                    /**
                     Fired whenever this BigGLTFModel fails to load the glTF file
                     specified by {@link BigGLTFModel/src}.
                     @event error
                     @param msg {String} Description of the error
                     */
                    self.fire("error", msg);
                });
        } else if (cfg.src) {
            if (!utils.isString(cfg.src)) {
                this.error("Value for 'src' should be a string");
                return;
            }
            this._src = cfg.src;
            spinner.processes++;
            loadGLTF(this, this._src, this._options,
                function () {
                    spinner.processes--;
                    core.scheduleTask(function () {
                        self.loaded = true;
                        self.fire("loaded", true, true);
                    });
                },
                function (msg) {
                    spinner.processes--;
                    self.error(msg);
                    self.fire("error", msg);
                });
        } else {
            this.error("Config missing: gltf or src");
            return;
        }
    }

    /**
     Path to the glTF file from which this BigGLTFModel was loaded.

     @property src
     @type String
     @final
     */
    get src() {
        return this._src;
    }
}

const INSTANCE_THRESHOLD = 1;

var loadGLTF = (function () {

    return function (model, src, options, ok, error) {
        utils.loadJSON(src, function (json) { // OK
                options.basePath = getBasePath(src);
                parseGLTF(json, src, options, model, ok, error);
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

    return function (json, src, options, model, ok) {

        var ctx = {
            src: src,
            loadBuffer: options.loadBuffer,
            basePath: options.basePath,
            json: json,
            scene: model.scene,
            model: model,
            numObjects: 0
        };

        model.scene.loading++; // Disables (re)compilation

        loadBuffers(ctx, function () {
            loadBufferViews(ctx);
            freeBuffers(ctx); // Don't need buffers once we've created views of them
            loadMaterials(ctx);
            loadDefaultScene(ctx);
            model.scene.loading--; // Re-enables (re)compilation
            model.finalize();
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
                    ctx.model.error(msg);
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
        }
        else {
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
        var nodeInfo;
        for (var i = 0, len = nodes.length; i < len; i++) {
            nodeInfo = json.nodes[nodes[i]];
            if (!nodeInfo) {
                error(ctx, "Node not found: " + i);
                continue;
            }
            countMeshUsage(ctx, i, nodeInfo);
        }
        for (var i = 0, len = nodes.length; i < len; i++) {
            nodeInfo = json.nodes[nodes[i]];
            if (nodeInfo) {
                loadNode(ctx, i, nodeInfo, null, null);
            }
        }
    }

    function countMeshUsage(ctx, nodeIdx, nodeInfo) {
        var json = ctx.json;
        var mesh = nodeInfo.mesh;
        if (mesh !== undefined) {
            var meshInfo = json.meshes[nodeInfo.mesh];
            if (meshInfo) {
                meshInfo.instances = meshInfo.instances ? meshInfo.instances + 1 : 1;
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
                countMeshUsage(ctx, nodeIdx, childNodeInfo);
            }
        }
    }

    function loadNode(ctx, nodeIdx, nodeInfo, matrix, parent, parentCfg) {

        parent = parent || ctx.model;

        var createObject;

        if (ctx.handleNode) {
            var actions = {};
            if (!ctx.handleNode(nodeInfo, actions)) {
                return;
            }
            if (actions.createObject) {
                createObject = actions.createObject;
            }
        }

        var json = ctx.json;
        var model = ctx.model;
        var localMatrix;

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
                matrix = math.mulMat4(matrix, localMatrix, math.mat4());
            } else {
                matrix = localMatrix;
            }
        }

        if (nodeInfo.rotation) {
            localMatrix = math.quaternionToMat4(nodeInfo.rotation);
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix, math.mat4());
            } else {
                matrix = localMatrix;
            }
        }

        if (nodeInfo.scale) {
            localMatrix = math.scalingMat4v(nodeInfo.scale);
            if (matrix) {
                matrix = math.mulMat4(matrix, localMatrix, math.mat4());
            } else {
                matrix = localMatrix;
            }
        }

        ctx.numObjects++;

        if (nodeInfo.mesh !== undefined) {

            var meshInfo = json.meshes[nodeInfo.mesh];

            if (meshInfo) {

                const numPrimitives = meshInfo.primitives.length;

                if (numPrimitives > 0) {

                    var meshIds = [];

                    for (var i = 0; i < numPrimitives; i++) {
                        const meshCfg = {
                            id: model.id + "." + ctx.numObjects, // TODO: object ID
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

                        if (meshInfo.instances > INSTANCE_THRESHOLD) {

                            //------------------------------------------------------------------
                            // Instancing
                            //------------------------------------------------------------------

                            const geometryId = model.id + "." + nodeInfo.mesh;

                            if (!meshInfo.geometryId) {
                                meshInfo.geometryId = geometryId;
                                var geometryCfg = {
                                    id: geometryId
                                };
                                loadPrimitiveGeometry(ctx, meshInfo, i, geometryCfg);
                                model.createGeometry(geometryCfg);
                            }

                            meshCfg.geometryId = geometryId;

                            const mesh = model.createMesh(meshCfg);
                            meshIds.push(mesh.id);

                        } else {

                            //------------------------------------------------------------------
                            // Batching
                            //------------------------------------------------------------------

                            loadPrimitiveGeometry(ctx, meshInfo, i, meshCfg);

                            const mesh = model.createMesh(meshCfg);
                            meshIds.push(mesh.id);
                        }
                    }

                    model.createObject({
                        meshIds: meshIds
                    });

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
        }
        var normalsIndex = attributes.NORMAL;
        if (normalsIndex !== null && normalsIndex !== undefined) {
            const accessorInfo = ctx.json.accessors[normalsIndex];
            geometryCfg.normals = loadAccessorTypedArray(ctx, accessorInfo);
        }
        if (geometryCfg.indices) {
            geometryCfg.edgeIndices = math.buildEdgeIndices(geometryCfg.positions, geometryCfg.indices, null, 10, false);
        }
    }

    function loadAccessorTypedArray(ctx, accessorInfo) {
        var bufferViewInfo = ctx.json.bufferViews[accessorInfo.bufferView];
        var itemSize = WEBGL_TYPE_SIZES[accessorInfo.type];
        var TypedArray = WEBGL_COMPONENT_TYPES[accessorInfo.componentType];
        var elementBytes = TypedArray.BYTES_PER_ELEMENT; // For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.
        var itemBytes = elementBytes * itemSize;
        if (accessorInfo.byteStride && accessorInfo.byteStride !== itemBytes) { // The buffer is not interleaved if the stride is the item size in bytes.
            console.error("interleaved buffer!"); // TODO
        } else {
            return new TypedArray(bufferViewInfo._buffer, accessorInfo.byteOffset || 0, accessorInfo.count * itemSize);
        }
    }

    function error(ctx, msg) {
        ctx.model.error(msg);
    }
})();

export {GLTFBigModel}