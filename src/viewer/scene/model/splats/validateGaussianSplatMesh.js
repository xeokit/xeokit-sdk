const INCOMPATIBLE_PARAMS = [
    "geometryId",
    "positionsCompressed",
    "positionsDecodeMatrix",
    "positionsDecodeBoundary",
    "indices",
    "edgeIndices",
    "normals",
    "normalsCompressed",
    "uv",
    "uvCompressed",
    "uvDecodeMatrix",
    "textureSetId",
    "buckets"
];

/**
 * Validates the direct attribute arrays for a Gaussian-splat SceneModel mesh.
 *
 * @param {*} cfg SceneModel#createMesh configuration.
 * @returns {{count: number, error: string|null}}
 * @private
 */
export function validateGaussianSplatMesh(cfg) {
    for (let i = 0, len = INCOMPATIBLE_PARAMS.length; i < len; i++) {
        const name = INCOMPATIBLE_PARAMS[i];
        if (cfg[name] !== undefined && cfg[name] !== null) {
            return {count: 0, error: `Param not supported for 'gaussian-splats': '${name}'`};
        }
    }

    if (!cfg.positions || typeof cfg.positions.length !== "number") {
        return {count: 0, error: "Param expected for 'gaussian-splats': 'positions'"};
    }
    if (cfg.positions.length === 0 || (cfg.positions.length % 3) !== 0) {
        return {count: 0, error: "'gaussian-splats' positions must contain three values per splat"};
    }

    const count = cfg.positions.length / 3;
    if (!cfg.scales || cfg.scales.length !== count * 3) {
        return {count: 0, error: "'gaussian-splats' scales must contain three values per splat"};
    }
    if (!cfg.rotations || cfg.rotations.length !== count * 4) {
        return {count: 0, error: "'gaussian-splats' rotations must contain one XYZW quaternion per splat"};
    }
    if (cfg.colors && cfg.colors.length !== count * 4) {
        return {count: 0, error: "'gaussian-splats' colors must contain four RGBA values per splat"};
    }

    return {count, error: null};
}
