/**
 * Runnable self-check for the gaussian-splat math path (no GL):
 * parseSplat -> reorder -> computeCovariance3D -> packSplats -> sortSplatsByDepth.
 *
 *   node src/viewer/scene/model/splats/splats.selftest.mjs
 *
 * @private
 */
import assert from "node:assert/strict";
import {parseSplat, SPLAT_RECORD_BYTES} from "./parseSplat.js";
import {computeCovariance3D} from "./computeCovariance3D.js";
import {packSplats, SPLAT_FLOATS_PER_ITEM} from "./packSplats.js";
import {sortSplatsByDepth} from "./sortSplats.js";

// --- build a synthetic 2-splat .splat buffer ---
// Splat A: pos(0,0,-10) scale(1,1,1) rgba(255,0,0,255) identity-rot
// Splat B: pos(0,0, -5) scale(2,3,4) rgba(0,255,0,128) identity-rot
const buf = new ArrayBuffer(2 * SPLAT_RECORD_BYTES);
const dv = new DataView(buf);
const u8 = new Uint8Array(buf);
function writeSplat(i, pos, scale, rgba) {
    const b = i * SPLAT_RECORD_BYTES;
    dv.setFloat32(b, pos[0], true); dv.setFloat32(b + 4, pos[1], true); dv.setFloat32(b + 8, pos[2], true);
    dv.setFloat32(b + 12, scale[0], true); dv.setFloat32(b + 16, scale[1], true); dv.setFloat32(b + 20, scale[2], true);
    u8[b + 24] = rgba[0]; u8[b + 25] = rgba[1]; u8[b + 26] = rgba[2]; u8[b + 27] = rgba[3];
    // rot bytes (file order w,x,y,z): 255,128,128,128 -> (0.992,0,0,0) -> normalises to identity
    u8[b + 28] = 255; u8[b + 29] = 128; u8[b + 30] = 128; u8[b + 31] = 128;
}
writeSplat(0, [0, 0, -10], [1, 1, 1], [255, 0, 0, 255]);
writeSplat(1, [0, 0, -5], [2, 3, 4], [0, 255, 0, 128]);

// --- parse ---
const {count, positions, scales, colors, rotations} = parseSplat(buf);
assert.equal(count, 2, "count");
assert.deepEqual([...positions], [0, 0, -10, 0, 0, -5], "positions");
assert.deepEqual([...scales], [1, 1, 1, 2, 3, 4], "scales");
assert.deepEqual([...colors], [255, 0, 0, 255, 0, 255, 0, 128], "colors");
// file order (w,x,y,z): w decodes to (255-128)/128, xyz to 0
assert.ok(Math.abs(rotations[0] - 127 / 128) < 1e-6 && rotations[1] === 0, "rotation decode");

// --- reorder (w,x,y,z) -> (x,y,z,w), like the loader ---
const rotXYZW = new Float32Array(rotations.length);
for (let i = 0; i < rotations.length; i += 4) {
    rotXYZW[i] = rotations[i + 1]; rotXYZW[i + 1] = rotations[i + 2];
    rotXYZW[i + 2] = rotations[i + 3]; rotXYZW[i + 3] = rotations[i];
}

// --- covariance: identity rot => diag(scale^2) ---
function close(a, b, eps = 1e-4) { return Math.abs(a - b) < eps; }
const covA = computeCovariance3D([1, 1, 1], [rotXYZW[0], rotXYZW[1], rotXYZW[2], rotXYZW[3]]);
assert.ok([1, 0, 0, 1, 0, 1].every((v, k) => close(covA[k], v)), `covA ${covA}`);
const covB = computeCovariance3D([2, 3, 4], [rotXYZW[4], rotXYZW[5], rotXYZW[6], rotXYZW[7]]);
assert.ok([4, 0, 0, 9, 0, 16].every((v, k) => close(covB[k], v)), `covB ${covB}`);

// --- pack: 16 floats/splat, texel layout ---
const packed = packSplats({positions, scales, colors, rotations: rotXYZW});
assert.equal(packed.length, count * SPLAT_FLOATS_PER_ITEM, "packed length");
// Splat A texel0 = centre + opacity
assert.ok(close(packed[0], 0) && close(packed[1], 0) && close(packed[2], -10) && close(packed[3], 1), "A texel0");
// Splat A texel1 = colour rgb (0..1) + meshPickId
assert.ok(close(packed[4], 1) && close(packed[5], 0) && close(packed[6], 0) && close(packed[7], 0), "A texel1");
// Splat A covariance rows
assert.ok(close(packed[8], 1) && close(packed[9], 0) && close(packed[10], 0), "A cov row a");
assert.ok(close(packed[12], 1) && close(packed[13], 0) && close(packed[14], 1), "A cov row b");
// Splat B opacity 128/255, colour green
assert.ok(close(packed[16 + 3], 128 / 255) && close(packed[16 + 5], 1), "B opacity/green");

// --- sort: back-to-front (farthest first) under an identity view ---
const centres = new Float32Array(count * 3);
const indices = new Uint32Array(count);
for (let i = 0; i < count; i++) {
    centres[i * 3] = packed[i * 16]; centres[i * 3 + 1] = packed[i * 16 + 1]; centres[i * 3 + 2] = packed[i * 16 + 2];
    indices[i] = i;
}
const view = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); // identity
const sorted = sortSplatsByDepth(centres, indices, view);
// A (z=-10, farther) must be drawn before B (z=-5, nearer)
assert.deepEqual([...sorted], [0, 1], `sorted ${sorted}`);

console.log("splats.selftest: OK");
