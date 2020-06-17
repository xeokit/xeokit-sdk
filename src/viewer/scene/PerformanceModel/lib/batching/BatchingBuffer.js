import {WEBGL_INFO} from "../../../webglInfo.js";

const bigIndicesSupported = WEBGL_INFO.SUPPORTED_EXTENSIONS["OES_element_index_uint"];
const MAX_VERTS = bigIndicesSupported ? 5000000 : 65530;
const MAX_INDICES = MAX_VERTS * 3; // Rough rule-of-thumb

/**
 * @private
 */
class BatchingBuffer {
    constructor() {
        this.maxVerts = MAX_VERTS;
        this.maxIndices = MAX_INDICES;
        this.positions = [];
        this.colors = [];
        this.normals = [];
        this.pickColors = [];
        this.flags = [];
        this.flags2 = [];
        this.offsets = [];
        this.indices = [];
        this.edgeIndices = [];
    }
}

export {BatchingBuffer};