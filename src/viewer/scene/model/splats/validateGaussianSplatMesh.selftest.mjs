import assert from "node:assert/strict";
import {validateGaussianSplatMesh} from "./validateGaussianSplatMesh.js";

const valid = {
    primitive: "gaussian-splats",
    positions: new Float32Array([0, 0, 0, 1, 2, 3]),
    scales: new Float32Array([1, 1, 1, 2, 2, 2]),
    rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
    colors: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128])
};

assert.deepEqual(validateGaussianSplatMesh(valid), {count: 2, error: null});
assert.match(validateGaussianSplatMesh({...valid, positions: []}).error, /three values/);
assert.match(validateGaussianSplatMesh({...valid, scales: [1, 1, 1]}).error, /scales/);
assert.match(validateGaussianSplatMesh({...valid, rotations: [0, 0, 0, 1]}).error, /rotations/);
assert.match(validateGaussianSplatMesh({...valid, colors: [255, 255, 255, 255]}).error, /colors/);
assert.match(validateGaussianSplatMesh({...valid, indices: []}).error, /indices/);
assert.match(validateGaussianSplatMesh({...valid, geometryId: "shared"}).error, /geometryId/);

console.log("validateGaussianSplatMesh.selftest: OK");
