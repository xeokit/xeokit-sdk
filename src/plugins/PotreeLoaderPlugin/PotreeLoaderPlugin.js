const BigInt = window.BigInt;

const iota = n => {
    const ret = [ ];
    for (let i = 0; i < n; ++i)
        ret.push(i);
    return ret;
};

import { Component } from "../../viewer/scene/Component.js";
import { createProgramVariablesState } from "../../viewer/scene/webgl/WebGLRenderer.js";
import { math } from "../../viewer/scene/math/math.js";
import { Plugin } from "../../viewer/Plugin.js";
import { RenderFlags } from "../../viewer/scene/webgl/RenderFlags.js";

const tmpMat4 = math.mat4();

const pointBudget = 2_000_000;

const makeFrustumAABBIntersectionTest = (function() {
    const tempVec4 = math.vec4();
    return function(PVMat) {
        const m = PVMat;

        const tempPlanes = iota(6).map(() => math.vec4());
        for (let i = 0; i < 3; ++i) {
            tempPlanes[i * 2 + 0][0] = m[ 3] + m[i];
            tempPlanes[i * 2 + 0][1] = m[ 7] + m[i + 4];
            tempPlanes[i * 2 + 0][2] = m[11] + m[i + 8];
            tempPlanes[i * 2 + 0][3] = m[15] + m[i + 12];

            tempPlanes[i * 2 + 1][0] = m[ 3] - m[i];
            tempPlanes[i * 2 + 1][1] = m[ 7] - m[i + 4];
            tempPlanes[i * 2 + 1][2] = m[11] - m[i + 8];
            tempPlanes[i * 2 + 1][3] = m[15] - m[i + 12];
        }

        tempPlanes.forEach(p => math.divVec4Scalar(p, math.lenVec3(p), p));

        return aabb => tempPlanes.every(p => {
            tempVec4[0] = aabb[(p[0] >= 0) ? 3 : 0];
            tempVec4[1] = aabb[(p[1] >= 0) ? 4 : 1];
            tempVec4[2] = aabb[(p[2] >= 0) ? 5 : 2];
            tempVec4[3] = 1;
            return math.dotVec4(p, tempVec4) >= 0;
        });
    };
})();

import { BrotliDecode } from "./brotli/decode.js";

const decodeMorton16Axis = (function() {
    const dealign24b = mortoncode => {
        // see https://stackoverflow.com/questions/45694690/how-i-can-remove-all-odds-bits-in-c

        // input alignment of desired bits
        // ..a..b..c..d..e..f..g..h..i..j..k..l..m..n..o..p
        let x = mortoncode;

        //  ..a..b..c..d..e..f..g..h..i..j..k..l..m..n..o..p    ..a..b..c..d..e..f..g..h..i..j..k..l..m..n..o..p
        //  ..a.....c.....e.....g.....i.....k.....m.....o...    .....b.....d.....f.....h.....j.....l.....n.....p
        //  ....a.....c.....e.....g.....i.....k.....m.....o.    .....b.....d.....f.....h.....j.....l.....n.....p
        x = ((x & 0b001000001000001000001000) >>  2) | ((x & 0b000001000001000001000001) >> 0);
        //  ....ab....cd....ef....gh....ij....kl....mn....op    ....ab....cd....ef....gh....ij....kl....mn....op
        //  ....ab..........ef..........ij..........mn......    ..........cd..........gh..........kl..........op
        //  ........ab..........ef..........ij..........mn..    ..........cd..........gh..........kl..........op
        x = ((x & 0b000011000000000011000000) >>  4) | ((x & 0b000000000011000000000011) >> 0);
        //  ........abcd........efgh........ijkl........mnop    ........abcd........efgh........ijkl........mnop
        //  ........abcd....................ijkl............    ....................efgh....................mnop
        //  ................abcd....................ijkl....    ....................efgh....................mnop
        x = ((x & 0b000000001111000000000000) >>  8) | ((x & 0b000000000000000000001111) >> 0);
        //  ................abcdefgh................ijklmnop    ................abcdefgh................ijklmnop
        //  ................abcdefgh........................    ........................................ijklmnop
        //  ................................abcdefgh........    ........................................ijklmnop
        x = ((x & 0b000000000000000000000000) >> 16) | ((x & 0b000000000000000011111111) >> 0);

        // sucessfully realigned!
        //................................abcdefghijklmnop

        return x;
    };
    return (mcLower, mcUpper, axisIndex) => dealign24b((mcLower & 0x00FFFFFF) >>> axisIndex) | (dealign24b(((mcLower >>> 24) | (mcUpper << 8)) >>> axisIndex) << 8);
})();

const createMaterial = (scene, compileColorExpression) => {
    const gl = scene.canvas.gl;
    const programsBySectionPlanesStateHash = { };
    return {
        bindSetupReturnAttributes: (frameCtx, potree2World, potree2WorldWoOffset, rtcOrigin) => {
            const sectionPlanesStateHash = scene._sectionPlanesState.getHash();
            if (! programsBySectionPlanesStateHash[sectionPlanesStateHash]) {
                const programVariablesState = createProgramVariablesState();
                const programVariables = programVariablesState.programVariables;

                const createAttribute = programVariables.createAttribute;
                const attributes = {
                    position: createAttribute("ivec3", "position"),
                    rgb:      createAttribute("vec3", "rgb")
                };

                const projMatrix = programVariables.createUniform("mat4", "projMatrix");
                const PVMMatrix  = programVariables.createUniform("mat4", "PVMMatrix");
                const nodeMatrix = programVariables.createUniform("mat4", "nodeMatrix");

                // const clippable       = programVariables.createUniform("bool",  "clippable");

                const pointSize = programVariables.createUniform("float", "pointSize");

                const clipPos = "clipPos";
                const worldPositionAttribute = "worldPositionAttribute";

                const [ program, errors ] = programVariablesState.buildProgram(
                    gl,
                    "PotreeProgram",
                    {
                        appendFragmentOutputs:          (src, getGammaOutputExpression) => src.push(`${programVariables.createOutput("vec4", "outColor")} = vec4(${(getGammaOutputExpression || (v => v))(programVariables.createVarying("vec3", "vColor", () => compileColorExpression(attributes)))}, 1.0);`),
                        clippableTest:                  () => "true",//clippable,
                        clipPos:                        clipPos,
                        discardPoints:                  true, // to recreate ```vec2 cxy = 2.0 * gl_PointCoord - 1.0; if (dot(cxy, cxy) > 1.0) { discard; }
                        getGammaFactor:                 scene.gammaOutput && (() => scene.gammaFactor),
                        getLogDepth:                    scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
                        getPointSize:                   () => `clamp(${pointSize} / gl_Position.w, 1.0, 6.0)`, // pointsMaterial.{min,max}PerspectivePointSize
                        getVertexData:                  () => [ `vec4 ${clipPos} = ${PVMMatrix} * vec4(${attributes.position}, 1.0);` ],
                        projMatrix:                     projMatrix,
                        sectionPlanesState:             scene._sectionPlanesState,
                        testPerspectiveForGl_FragDepth: true,
                        // usePickClipPos:                 programSetup.isPick,
                        worldPositionAttribute:         { toString: () => `(${nodeMatrix} * vec4(${attributes.position}, 1.0))` }
                    });

                programsBySectionPlanesStateHash[sectionPlanesStateHash] = {
                    bindSetupReturnAttributes: (frameCtx, potree2World, potree2WorldWoOffset, rtcOrigin) => {
                        program.bind();
                        const projMat = frameCtx.viewParams.projMatrix;
                        projMatrix.setInputValue && projMatrix.setInputValue(projMat);
                        PVMMatrix.setInputValue(math.mulMat4(math.mulMat4(projMat, frameCtx.viewParams.viewMatrix, tmpMat4), potree2World, tmpMat4));
                        nodeMatrix.setInputValue && nodeMatrix.setInputValue(potree2WorldWoOffset);
                        // clippable.setInputValue(mesh.clippable);
                        pointSize.setInputValue(2 * frameCtx.nearPlaneHeight);

                        program.inputSetters.setUniforms(
                            frameCtx,
                            {
                                mesh: {
                                    origin:      rtcOrigin,
                                    renderFlags: { sectionPlanesActivePerLayer: scene._sectionPlanesState.sectionPlanes.map(sectionPlane => sectionPlane.active) }
                                }
                            });

                        return attributes;
                    }
                };
            }

            return programsBySectionPlanesStateHash[sectionPlanesStateHash].bindSetupReturnAttributes(frameCtx, potree2World, potree2WorldWoOffset, rtcOrigin);
        }
    };
};

const v2dirSymbol = Symbol('v2dirSymbol');

class PotreeLoaderPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     */
    constructor(viewer, cfg = {}) {
        super("PotreeLoaderPlugin", viewer, cfg);

        const scene = viewer.scene;
        const camera = viewer.camera;

        this._rgbMaterial = createMaterial(scene, attributes => attributes.rgb);

        this._rootNodes = [ ];

        const lru = (function() { // A doubly-linked-list of the least recently used elements
            let first = { next: null }; // the least recently used item
            let last  = { prev: null }; // the most recently used item
            first.next = last;
            last.prev = first;
            const items = new Map(); // a list of all items in the lru list
            let loadedNumPoints = 0;

            return {
                touch: (node) => {
                    const item = items.get(node);
                    if (item) {
                        if (item.next !== last) {
                            item.prev.next = item.next;
                            item.next.prev = item.prev;

                            item.prev = last.prev;
                            item.next = last;
                            last.prev.next = item;
                            last.prev = item;
                        }
                    } else {
                        loadedNumPoints += node.numPoints;
                        const item = { node: node, prev: null, next: null };
                        items.set(node, item);

                        item.prev = last.prev;
                        item.next = last;
                        last.prev.next = item;
                        last.prev = item;
                    }
                },

                freeMemory: () => {
                    while (loadedNumPoints > pointBudget * 2) {
                        (function removeItemWithDescendants(item) {
                            item.prev.next = item.next;
                            item.next.prev = item.prev;

                            const node = item.node;
                            node.dispose();
                            items.delete(node);
                            loadedNumPoints -= node.numPoints;
                            node.children && node.children.forEach(child => { const childItem = items.get(child); childItem && removeItemWithDescendants(childItem); });
                        })(first.next);
                    }
                }
            };
        })();

        let potreePrioritiesDirty = true;
        const setPotreePrioritiesDirty = () => { potreePrioritiesDirty = true; scene.glRedraw(); };
        camera.on("projMatrix", setPotreePrioritiesDirty);
        camera.on("viewMatrix", setPotreePrioritiesDirty);
        scene.canvas.on("boundary", () => setPotreePrioritiesDirty);
        this._setPotreePrioritiesDirty = setPotreePrioritiesDirty;

        this.ensureVisiblesUpdated = () => {
            if (potreePrioritiesDirty) {
                potreePrioritiesDirty = false;

                priorityQueue.clear();
                this._rootNodes.forEach(rootNode => priorityQueue.push(0, rootNode));

                let pointBudgetLeft = pointBudget;
                let pointNodesRenderedCnt = 0;

                const cameraSeesAABB = makeFrustumAABBIntersectionTest(math.mulMat4(camera.projMatrix, camera.viewMatrix, tmpMat4));
                while (! priorityQueue.isEmpty()) {
                    const node = priorityQueue.pop();

                    const numPoints = node.numPoints;
                    if (numPoints === 0) {
                        node.getDrawable();
                    } else if ((numPoints <= pointBudgetLeft) && cameraSeesAABB(node.boundingBox)) {
                        pointBudgetLeft -= numPoints;
                        lru.touch(node);
                        if ((node.visible = node.getDrawable())) {
                            ++pointNodesRenderedCnt;

                            node.children && node.children.forEach(child => {
                                const addToQueue = priority => priorityQueue.push(priority, child);
                                const bSphere = child.boundingSphere;
                                if (camera.projection === "ortho") {
                                    // TODO: check size for ortho
                                    addToQueue(1 / bSphere.radius);
                                } else {
                                    const ratio = bSphere.radius / math.distVec3(camera.eye, bSphere.center);
                                    const screenPixelRadius = ratio * 0.5 * scene.canvas.canvas.clientHeight / Math.tan(camera.project.fov * Math.PI / 360);
                                    if (screenPixelRadius >= 30) {
                                        addToQueue((ratio <= 1) ? (1 / screenPixelRadius) : 0);
                                    }
                                }
                            });
                        }
                    }
                }

                lru.freeMemory();
            }
        };

        const priorityQueue = (function() {
            const content = [ ];
            return {
                clear: () => content.length = 0,

                isEmpty: () => content.length === 0,

                push: function(priority, data) {
                    const element = { priority: priority, data: data };
                    // Add the new element to the end of the array.
                    content.push(element);
                    // Allow it to bubble up.
                    // When at 0, an element can not go up any further.
                    let n = content.length - 1;
                    while (n > 0) {
                        // Compute the parent element's index, and fetch it.
                        const parentN = Math.floor((n + 1) / 2) - 1;
                        const parent = content[parentN];
                        // If the parent has a lesser score, things are in order and we are done.
                        if (priority >= parent.priority)
                            break;

                        // Otherwise, swap the parent with the current element and continue.
                        content[parentN] = element;
                        content[n] = parent;
                        n = parentN;
                    }
                },

                pop: function() {
                    // Store the first element so we can return it later.
                    const result = content[0];
                    // Get the element at the end of the array.
                    const end = content.pop();
                    const endPrio = end.priority;
                    // If there are any elements left, put the end element at the start, and let it sink down.
                    if (content.length > 0) {
                        content[0] = end;
                        let n = 0;
                        // Look up the target element and its score.
                        const length = content.length;

                        while (true) {
                            // Compute the indices of the child elements.
                            const child2N = (n + 1) * 2, child1N = child2N - 1;
                            // This is used to store the new position of the element,
                            // if any.
                            let swap = null;
                            let currentMin = endPrio;
                            // If the first child exists (is inside the array) and the score is less than our element's, we need to swap.
                            if (child1N < length) {
                                const c1Prio = content[child1N].priority;
                                if (c1Prio < endPrio) {
                                    swap = child1N;
                                    currentMin = c1Prio;
                                }
                            }
                            // Do the same checks for the other child.
                            if ((child2N < length) && (content[child2N].priority < currentMin))
                                swap = child2N;

                            // No need to swap further, we are done.
                            if (swap === null) break;

                            // Otherwise, swap and continue.
                            content[n] = content[swap];
                            content[swap] = end;
                            n = swap;
                        }
                    }
                    return result.data;
                }
            };
        })();

    }

    static V2Dir = class {
        constructor(v2dir) {
            this[v2dirSymbol] = v2dir;
        }
    }

    load(src) {
        const v2dir = src[v2dirSymbol];
        const plugin = this;
        const gl = plugin.viewer.scene.canvas.gl;

        class PotreeModel extends Component {
            get isDrawable() { return true; }
            constructor() {
                super(plugin.viewer.scene);
                this.renderFlags = new RenderFlags();
                this.rebuildRenderFlags = () => { };
            }
        }

        const potreeModel = new PotreeModel();

        const srcGet = (filename, isJson, range, cb) => {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (((xhr.status >= 200) && (xhr.status < 300)) || (xhr.status === 304)) {
                        cb(xhr.response);
                    } else {
                        console.error("Request failed:", xhr.readyState, xhr.status, xhr.response);
                    }
                }
            };
            xhr.open("GET", `${v2dir}/${filename}`, true);
            xhr.responseType = isJson ? "json" : "arraybuffer";
            range && xhr.setRequestHeader("Range", `bytes=${range[0]}-${range[0] + range[1] - BigInt(1)}`);
            xhr.send(null);
            return () => { xhr.onreadystatechange = null; xhr.abort(); };
        };

        srcGet("metadata.json", true, null, metadata => {
            const callWithChunk = (1
                                   ? (start, size, cb) => srcGet("hierarchy.bin", false, [ start, size ], buffer => cb(new DataView(buffer)))
                                   : (function() {
                                       let buffer = null;
                                       const onLoads = [ ];
                                       let onLoad = (start, size, cb) => onLoads.push(() => onLoad(start, size, cb));
                                       srcGet("hierarchy.bin", false, null, b => {
                                           buffer = b;
                                           onLoad = (start, size, cb) => cb(new DataView(buffer, Number(start), Number(size)));
                                           onLoads.forEach(l => l());
                                       });
                                       return (start, size, cb) => onLoad(start, size, cb);
                                   })());

            let availableLoadSlots = 4;

            const attributesLayout = (function() {
                return {
                    decodeDrawCall: (numPoints, buffer) => {
                        try {
                            const isBrotli = metadata.encoding === "BROTLI";
                            let srcBuffer = isBrotli ? BrotliDecode(new Int8Array(buffer)).buffer : buffer;
                            let view = new DataView(srcBuffer);

                            const attributeBuffers = { };
                            let attributeOffset = 0;
                            const bytesPerPoint = metadata.attributes.reduce((acc, a) => acc + a.size, 0);

                            metadata.attributes.forEach(attribute => {
                                const name = attribute.name;
                                const numElements = attribute.numElements;

                                const [ constructor, getter, glType ] = ({
                                    "double": [ Float64Array, o => view.getFloat64(o, true), gl.FLOAT ], // TODO: double should be handled differently, as Float64Array cannot be used for real attribute values
                                    "int8":   [ Int8Array,    o => view.getInt8   (o, true), gl.BYTE ],
                                    "uint8":  [ Uint8Array,   o => view.getUint8  (o, true), gl.UNSIGNED_BYTE ],
                                    "int16":  [ Int16Array,   o => view.getInt16  (o, true), gl.SHORT ],
                                    "uint16": [ Uint16Array,  o => view.getUint16 (o, true), gl.UNSIGNED_SHORT ],
                                    "int32":  [ Int32Array,   o => view.getInt32  (o, true), gl.INT ]
                                }[attribute.type]);

                                const data = new constructor(numPoints * numElements);
                                const point = new constructor(numElements);

                                const [ size, setData ] = ((isBrotli && (name === "position"))
                                                           ? [
                                                               16,
                                                               (src) => {
                                                                   const mc_0 = view.getUint32(src +  0, true);
                                                                   const mc_1 = view.getUint32(src +  4, true);
                                                                   const mc_2 = view.getUint32(src +  8, true);
                                                                   const mc_3 = view.getUint32(src + 12, true);
                                                                   for (let i = 0; i < numElements; ++i)
                                                                       point[i] = (decodeMorton16Axis(mc_0, mc_1, i) << 16) | decodeMorton16Axis(mc_2, mc_3, i);
                                                               }
                                                           ]
                                                           : ((isBrotli && (name === "rgb"))
                                                              ? [
                                                                  8,
                                                                  (src) => {
                                                                      const mc_0 = view.getUint32(src +  0, true);
                                                                      const mc_1 = view.getUint32(src +  4, true);
                                                                      for (let i = 0; i < numElements; ++i)
                                                                          point[i] = decodeMorton16Axis(mc_0, mc_1, i);
                                                                  }
                                                              ]
                                                              : [
                                                                  attribute.size,
                                                                  (src) => {
                                                                      for (let i = 0; i < numElements; ++i)
                                                                          point[i] = getter(src + i * attribute.elementSize);
                                                                  }
                                                              ]));

                                for (let j = 0; j < numPoints; j++) {
                                    setData(isBrotli ? (attributeOffset * numPoints + j * size) : (attributeOffset + j * bytesPerPoint));
                                    data.set(point, j * numElements);
                                }

                                attributeOffset += size;

                                const buffer = gl.createBuffer();
                                const target = gl.ARRAY_BUFFER;
                                const bindBuffer = () => gl.bindBuffer(target, buffer);
                                bindBuffer();
                                gl.bufferData(target, data, gl.STATIC_DRAW);
                                attributeBuffers[name] = {
                                    bindAtLocation: location => {
                                        bindBuffer();
                                        if (name === "rgb") {
                                            gl.vertexAttribPointer(location, numElements, glType, true, 0, 0);
                                        } else {
                                            gl.vertexAttribIPointer(location, numElements, glType, 0, 0);
                                        }
                                    },
                                    dispose: () => gl.deleteBuffer(buffer)
                                };
                            });

                            view = null;
                            buffer = null;
                            return {
                                drawCall: attributes => {
                                    for (let name in attributes) {
                                        const setter = attributes[name].setInputValue;
                                        if (setter) {
                                            setter(attributeBuffers[name]);
                                        }
                                    }
                                    gl.drawArrays(gl.POINTS, 0, numPoints);
                                },
                                dispose: () => Object.values(attributeBuffers).forEach(a => a.dispose())
                            };
                        } catch(e) {
                            console.error(e);
                            return { drawCall: () => { }, dispose: () => { } };
                        }
                    }
                };
            })();

            const rootNode = (function makePotreeNode(name, potreeBB) {
                // Rotate BB from Z-up to Y-up
                const boundingBox = math.AABB3([
                    potreeBB.min[0],
                    potreeBB.min[2],
                    -potreeBB.max[1],
                    potreeBB.max[0],
                    potreeBB.max[2],
                    -potreeBB.min[1]
                ]);

                const potreeNode = {
                    boundingBox:    boundingBox,
                    boundingSphere: { center: math.getAABB3Center(boundingBox), radius: math.getAABB3Diag(boundingBox) / 2 },
                    potreeBB:       potreeBB,
                    name:           name,
                    numPoints:      0,
                    setChunkRange:  (start, size) => {
                        potreeNode.getDrawable = () => {
                            if (availableLoadSlots > 0) {
                                potreeNode.getDrawable = () => false;
                                --availableLoadSlots;
                                callWithChunk(start, size, view => {
                                    ++availableLoadSlots;
                                    const bytesPerNode = 22;
                                    const numNodes = view.byteLength / bytesPerNode;
                                    const nodes = new Array(numNodes);
                                    nodes[0] = potreeNode;
                                    let nodePos = 1;

                                    for (let i = 0; i < numNodes; ++i) {
                                        const nodeOffset = i * bytesPerNode;
                                        const type       = view.getUint8(nodeOffset + 0);
                                        const childMask  = view.getUint8(nodeOffset + 1);
                                        const numPoints  = view.getUint32(nodeOffset + 2, true);
                                        const byteOffset = view.getBigInt64(nodeOffset + 6, true);
                                        const byteSize   = view.getBigInt64(nodeOffset + 14, true);

                                        const node = nodes[i];

                                        if (type === 2) {
                                            node.setChunkRange(byteOffset, byteSize);
                                        } else {
                                            // workaround for issue #1125
                                            // some inner nodes erroneously report >0 points even though have 0 points
                                            // however, they still report a byteSize of 0, so based on that we now set node.numPoints to 0
                                            if (byteSize === BigInt(0)) {
                                                node.getDrawable = () => false;
                                            } else {
                                                node.numPoints = numPoints;
                                                (function setupLoadable() {
                                                    node.dispose = () => { };
                                                    node.getDrawable = () => {
                                                        const cancel = srcGet("octree.bin", false, [ byteOffset, byteSize ], buffer => {
                                                            const drawCall = attributesLayout.decodeDrawCall(numPoints, buffer);
                                                            node.dispose = () => {
                                                                drawCall.dispose();
                                                                setupLoadable();
                                                            };
                                                            node.getDrawable = () => drawCall.drawCall;

                                                            plugin._setPotreePrioritiesDirty();
                                                        });
                                                        node.dispose = () => { cancel(); setupLoadable(); };
                                                        node.getDrawable = () => false;
                                                        return false;
                                                    };
                                                })();
                                            }

                                            if (node === potreeNode) {
                                                node.getDrawable();
                                            }
                                            const bb = node.potreeBB;
                                            const halfSize = math.mulVec3Scalar(math.subVec3(bb.max, bb.min, math.vec3()), .5, math.vec3());
                                            for (let childIndex = 0; childIndex < 8; childIndex++){
                                                if (childMask & (1 << childIndex)) {
                                                    const childBB = { min: [ ...bb.min ], max: [ ...bb.max ] };
                                                    if (childIndex & 0b0100) {
                                                        childBB.min[0] += halfSize[0];
                                                    } else {
                                                        childBB.max[0] -= halfSize[0];
                                                    }
                                                    if (childIndex & 0b0010) {
                                                        childBB.min[1] += halfSize[1];
                                                    } else {
                                                        childBB.max[1] -= halfSize[1];
                                                    }
                                                    if (childIndex & 0b0001) {
                                                        childBB.min[2] += halfSize[2];
                                                    } else {
                                                        childBB.max[2] -= halfSize[2];
                                                    }

                                                    const child = makePotreeNode(`${node.name}${childIndex}`, childBB);
                                                    (node.children ||= [ ]).push(child);
                                                    nodes[nodePos] = child;
                                                    nodePos++;
                                                }
                                            }
                                        }
                                    }
                                    view = null;
                                    nodes.length = 0;
                                });
                            }
                            return false;
                        };
                    }
                };
                return potreeNode;
            })("r", metadata.boundingBox);
            rootNode.setChunkRange(BigInt(0), BigInt(metadata.hierarchy.firstChunkSize));
            plugin._rootNodes.push(rootNode);

            potreeModel.renderFlags.colorOpaque = true;
            const rtcOrigin = [ metadata.offset[0], metadata.offset[2], -metadata.offset[1] ];
            const potree2WorldWoOffset = math.mulMat4(
                math.rotationMat4v(-Math.PI/2, [ 1, 0, 0 ], math.identityMat4()),
                math.scalingMat4v(metadata.scale, math.identityMat4(math.mat4())),
                math.mat4());
            const potree2World = math.mulMat4(
                math.translationMat4v(rtcOrigin, math.identityMat4()),
                potree2WorldWoOffset,
                math.mat4());

            potreeModel.drawColorOpaque = frameCtx => {
                plugin.ensureVisiblesUpdated();

                const attributes = plugin._rgbMaterial.bindSetupReturnAttributes(frameCtx, potree2World, potree2WorldWoOffset, rtcOrigin);
                (function drawVisible(node) {
                    const drawCall = node.visible && node.getDrawable();
                    if (drawCall) {
                        drawCall(attributes);
                        node.children && node.children.forEach(drawVisible);
                    }
                })(rootNode);
            };

            potreeModel.aabb = rootNode.boundingBox;
            potreeModel.fire("loaded");
        });

        return potreeModel;
    }
}

export { PotreeLoaderPlugin };
