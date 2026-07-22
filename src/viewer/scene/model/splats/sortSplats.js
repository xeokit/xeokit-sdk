/**
 * Back-to-front depth sort of splats, for correct premultiplied "over" blending.
 *
 * Counting sort over 16-bit camera-space-depth buckets. Returns the splat
 * texture item-indices ordered far->near (camera-space z ascending - most
 * negative, i.e. farthest, first).
 *
 * Self-contained (no module-scope refs) so it can later be shipped verbatim into
 * a sort web worker. Ported verbatim from xeokit-sdk-v3 (TS types stripped).
 *
 * @param {Float32Array} positions   compact splat centres - xyz x count (compact order)
 * @param {Uint32Array}  itemIndices texture item-index for each compact splat (length = count)
 * @param {ArrayLike<number>} view   column-major view matrix (row 2 -> camera-space z)
 * @returns {Uint32Array} sorted texture item-indices (length = count), far->near
 * @private
 */
export function sortSplatsByDepth(positions, itemIndices, view) {
    const count = itemIndices.length;
    const sorted = new Uint32Array(count);
    if (count === 0) {
        return sorted;
    }
    const depth = new Float32Array(count);
    let dmin = Infinity;
    let dmax = -Infinity;
    for (let i = 0; i < count; i++) {
        const o = i * 3;
        const dz = view[2] * positions[o] + view[6] * positions[o + 1] + view[10] * positions[o + 2] + view[14];
        depth[i] = dz;
        if (dz < dmin) dmin = dz;
        if (dz > dmax) dmax = dz;
    }
    const counts = new Uint32Array(65536);
    const keys = new Uint16Array(count);
    const scale = 65535 / ((dmax - dmin) || 1);
    for (let i = 0; i < count; i++) {
        const k = ((depth[i] - dmin) * scale) | 0;
        keys[i] = k;
        counts[k]++;
    }
    for (let i = 1; i < 65536; i++) {
        counts[i] += counts[i - 1];
    }
    // Ascending key = most-negative-z (farthest) first = back-to-front.
    for (let i = 0; i < count; i++) {
        sorted[--counts[keys[i]]] = itemIndices[i];
    }
    return sorted;
}
