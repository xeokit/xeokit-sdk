/**
 * @author https://github.com/tmarti, with support from https://tribia.com/
 * @license MIT
 *
 * This file takes a geometry given by { positionsCompressed, indices }, and returns
 * equivalent { positionsCompressed, indices } arrays but which only contain unique
 * positionsCompressed.
 *
 * The time is O(N logN) with the number of positionsCompressed due to a pre-sorting
 * step, but is much more GC-friendly and actually faster than the classic O(N)
 * approach based in keeping a hash-based LUT to identify unique positionsCompressed.
 */
let comparePositions = null;

function compareVertex(a, b) {
    let res;
    for (let i = 0; i < 3; i++) {
        if (0 !== (res = comparePositions[a * 3 + i] - comparePositions[b * 3 + i])) {
            return res;
        }
    }
    return 0;
}

let seqInit = null;

function setMaxNumberOfPositions(maxPositions) {
    if (seqInit !== null && seqInit.length >= maxPositions) {
        return;
    }
    seqInit = new Uint32Array(maxPositions);
    for (let i = 0; i < maxPositions; i++) {
        seqInit[i] = i;
    }
}

/**
 * This function obtains unique positionsCompressed in the provided object
 * .positionsCompressed array and calculates an index mapping, which is then
 * applied to the provided object .indices and .edgeindices.
 *
 * The input object items are not modified, and instead new set
 * of positionsCompressed, indices and edgeIndices with the applied optimization
 * are returned.
 *
 * The algorithm, instead of being based in a hash-like LUT for
 * identifying unique positionsCompressed, is based in pre-sorting the input
 * positionsCompressed...
 *
 * (it's possible to define a _"consistent ordering"_ for the positionsCompressed
 *  as positionsCompressed are quantized and thus not suffer from float number
 *  comparison artifacts)
 *
 * ... so same positionsCompressed are adjacent in the sorted array, and then
 * it's easy to scan linearly the sorted array. During the linear run,
 * we will know that we found a different position because the comparison
 * function will return != 0 between current and previous element.
 *
 * During this linear traversal of the array, a `unique counter` is used
 * in order to calculate the mapping between original indices and unique
 * indices.
 *
 * @param {{positionsCompressed: number[],indices: number[], edgeIndices: number[]}} mesh The input mesh to process, with `positionsCompressed`, `indices` and `edgeIndices` keys.
 *
 * @returns {[Uint16Array, Uint32Array, Uint32Array]} An array with 3 elements: 0 => the uniquified positionsCompressed; 1 and 2 => the remapped edges and edgeIndices arrays
 */
export function uniquifyPositions(mesh) {
    const _positions = mesh.positionsCompressed;
    const _indices = mesh.indices;
    const _edgeIndices = mesh.edgeIndices;

    setMaxNumberOfPositions(_positions.length / 3);

    const seq = seqInit.slice(0, _positions.length / 3);
    const remappings = seqInit.slice(0, _positions.length / 3);

    comparePositions = _positions;

    seq.sort(compareVertex);

    let uniqueIdx = 0

    remappings[seq[0]] = 0;

    for (let i = 1, len = seq.length; i < len; i++) {
        if (0 !== compareVertex(seq[i], seq[i - 1])) {
            uniqueIdx++;
        }
        remappings[seq[i]] = uniqueIdx;
    }

    const numUniquePositions = uniqueIdx + 1;
    const newPositions = new Uint16Array(numUniquePositions * 3);

    uniqueIdx = 0

    newPositions [uniqueIdx * 3 + 0] = _positions [seq[0] * 3 + 0];
    newPositions [uniqueIdx * 3 + 1] = _positions [seq[0] * 3 + 1];
    newPositions [uniqueIdx * 3 + 2] = _positions [seq[0] * 3 + 2];

    for (let i = 1, len = seq.length; i < len; i++) {
        if (0 !== compareVertex(seq[i], seq[i - 1])) {
            uniqueIdx++;
            newPositions [uniqueIdx * 3 + 0] = _positions [seq[i] * 3 + 0];
            newPositions [uniqueIdx * 3 + 1] = _positions [seq[i] * 3 + 1];
            newPositions [uniqueIdx * 3 + 2] = _positions [seq[i] * 3 + 2];
        }
        remappings[seq[i]] = uniqueIdx;
    }

    comparePositions = null;

    const newIndices = new Uint32Array(_indices.length);

    for (let i = 0, len = _indices.length; i < len; i++) {
        newIndices[i] = remappings [_indices[i]];
    }

    const newEdgeIndices = new Uint32Array(_edgeIndices.length);

    for (let i = 0, len = _edgeIndices.length; i < len; i++) {
        newEdgeIndices[i] = remappings [_edgeIndices[i]];
    }

    return [newPositions, newIndices, newEdgeIndices];
}