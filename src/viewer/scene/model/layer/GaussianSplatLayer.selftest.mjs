import assert from "node:assert/strict";
import {ENTITY_FLAGS} from "../ENTITY_FLAGS.js";
import {GaussianSplatLayer} from "./GaussianSplatLayer.js";

const model = {
    numPortions: 0,
    numVisibleLayerPortions: 0,
    numCulledLayerPortions: 0,
    numPickableLayerPortions: 0,
    numClippableLayerPortions: 0,
    numXRayedLayerPortions: 0,
    numHighlightedLayerPortions: 0,
    numSelectedLayerPortions: 0,
    numTransparentLayerPortions: 0
};
const mesh = {aabb: null};
const layer = new GaussianSplatLayer(model, [0, 0, 0]);

assert.equal(layer.createPortion(mesh, {
    positions: new Float32Array([0, 1, 2, 3, 4, 5]),
    scales: new Float32Array([1, 1, 1, 2, 2, 2]),
    rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
    colors: new Float32Array([1, 0, 0, 1, 0, 1, 0, 0.5])
}), 0);
assert.equal(model.numPortions, 1);
assert.deepEqual([...mesh.aabb], [0, 1, 2, 3, 4, 5]);
assert.equal(layer.canCreatePortion(), false);

layer.initFlags(0, ENTITY_FLAGS.VISIBLE | ENTITY_FLAGS.PICKABLE);
assert.equal(model.numVisibleLayerPortions, 1);
assert.equal(model.numPickableLayerPortions, 1);
assert.equal(model.numTransparentLayerPortions, 1);

layer.setCulled(0, ENTITY_FLAGS.VISIBLE | ENTITY_FLAGS.PICKABLE | ENTITY_FLAGS.CULLED);
assert.equal(model.numCulledLayerPortions, 1);
layer.setVisible(0, ENTITY_FLAGS.PICKABLE | ENTITY_FLAGS.CULLED);
assert.equal(model.numVisibleLayerPortions, 0);

layer.setMatrix(0, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 20, 30, 1]));
layer.setOffset(0, [1, 2, 3]);
assert.deepEqual([...layer._getModelMatrix()].slice(12, 15), [11, 22, 33]);

assert.throws(() => layer.createPortion(mesh, {}), /exactly one/);
console.log("GaussianSplatLayer.selftest: OK");
