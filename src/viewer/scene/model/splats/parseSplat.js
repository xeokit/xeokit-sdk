/**
 * Parser for the compact `.splat` 3D-Gaussian-Splatting format
 * (the antimatter15/splat layout). The file is headerless: a flat array
 * of fixed-size 32-byte records, so `count = byteLength / 32`.
 *
 * Per-splat record (little-endian):
 *   - bytes  0..11  position   : 3 x float32
 *   - bytes 12..23  scale      : 3 x float32   (per-axis gaussian std-dev)
 *   - bytes 24..27  colour     : 4 x uint8     (RGBA, baked - no SH)
 *   - bytes 28..31  rotation   : 4 x uint8     (quaternion, decoded (b-128)/128)
 *
 * Baked-RGB profile only (no spherical harmonics).
 *
 * Ported ~verbatim from xeokit-sdk-v3 (TS types stripped).
 * @private
 */

/** The bytes-per-splat of the `.splat` format. */
export const SPLAT_RECORD_BYTES = 32;

/**
 * Parses a `.splat` buffer into typed attribute arrays.
 *
 * Rotations are returned in the file's native order (w, x, y, z); callers that
 * feed {@link computeCovariance3D} must reorder to (x, y, z, w) first.
 *
 * @param {ArrayBuffer|Uint8Array} data - The raw `.splat` file bytes.
 * @returns {{count:number, positions:Float32Array, scales:Float32Array, colors:Uint8Array, rotations:Float32Array}}
 * @throws if the buffer length is not a whole number of 32-byte records.
 * @private
 */
export function parseSplat(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.byteLength % SPLAT_RECORD_BYTES !== 0) {
        throw new Error(`[parseSplat] buffer length ${bytes.byteLength} is not a multiple of ${SPLAT_RECORD_BYTES}`);
    }
    const count = bytes.byteLength / SPLAT_RECORD_BYTES;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count * 3);
    const colors = new Uint8Array(count * 4);
    const rotations = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
        const base = i * SPLAT_RECORD_BYTES;
        positions[i * 3]     = view.getFloat32(base,      true);
        positions[i * 3 + 1] = view.getFloat32(base + 4,  true);
        positions[i * 3 + 2] = view.getFloat32(base + 8,  true);
        scales[i * 3]        = view.getFloat32(base + 12, true);
        scales[i * 3 + 1]    = view.getFloat32(base + 16, true);
        scales[i * 3 + 2]    = view.getFloat32(base + 20, true);
        colors[i * 4]        = bytes[base + 24];
        colors[i * 4 + 1]    = bytes[base + 25];
        colors[i * 4 + 2]    = bytes[base + 26];
        colors[i * 4 + 3]    = bytes[base + 27];
        // Quaternion bytes decode as (b - 128) / 128; left un-normalised here
        // (computeCovariance3D normalises before building the covariance).
        rotations[i * 4]     = (bytes[base + 28] - 128) / 128;
        rotations[i * 4 + 1] = (bytes[base + 29] - 128) / 128;
        rotations[i * 4 + 2] = (bytes[base + 30] - 128) / 128;
        rotations[i * 4 + 3] = (bytes[base + 31] - 128) / 128;
    }

    return {count, positions, scales, colors, rotations};
}
