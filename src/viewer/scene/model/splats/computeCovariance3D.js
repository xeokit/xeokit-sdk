/**
 * Computes the 3D covariance of a gaussian splat from its per-axis scale and
 * rotation quaternion, returning the 6 unique values of the symmetric 3x3
 * matrix (`[oxx, oxy, oxz, oyy, oyz, ozz]`) ready to upload to the GPU.
 *
 * Sigma = M^T * M with M = diag(scale) * R, where R is the rotation matrix of
 * the (normalised) quaternion. This composition was validated in the v3 spike
 * against a reference `.splat` scene - using R*S / M*M^T instead builds the
 * transpose, which mis-orients every splat into "fur".
 *
 * Ported ~verbatim from xeokit-sdk-v3 (TS types stripped).
 *
 * @param {ArrayLike<number>} scale - Per-axis std-devs `[sx, sy, sz]` (linear).
 * @param {ArrayLike<number>} quat  - Rotation quaternion in `[x, y, z, w]` order.
 * @returns {number[]} `[oxx, oxy, oxz, oyy, oyz, ozz]`
 * @private
 */
export function computeCovariance3D(scale, quat) {
    const n = Math.hypot(quat[0], quat[1], quat[2], quat[3]) || 1;
    const x = quat[0] / n, y = quat[1] / n, z = quat[2] / n, w = quat[3] / n;

    // Rotation matrix R (row-major), matching the validated spike convention.
    const R = [
        1 - 2 * (y * y + z * z), 2 * (x * y + z * w),     2 * (x * z - y * w),
        2 * (x * y - z * w),     1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
        2 * (x * z + y * w),     2 * (y * z - x * w),     1 - 2 * (x * x + y * y),
    ];
    const sx = scale[0], sy = scale[1], sz = scale[2];

    // M = diag(scale) * R  (scale applied per row).
    const M = [
        sx * R[0], sx * R[1], sx * R[2],
        sy * R[3], sy * R[4], sy * R[5],
        sz * R[6], sz * R[7], sz * R[8],
    ];

    // Sigma = M^T * M (column dot-products of M).
    const sxx = M[0] * M[0] + M[3] * M[3] + M[6] * M[6];
    const sxy = M[0] * M[1] + M[3] * M[4] + M[6] * M[7];
    const sxz = M[0] * M[2] + M[3] * M[5] + M[6] * M[8];
    const syy = M[1] * M[1] + M[4] * M[4] + M[7] * M[7];
    const syz = M[1] * M[2] + M[4] * M[5] + M[7] * M[8];
    const szz = M[2] * M[2] + M[5] * M[5] + M[8] * M[8];
    return [sxx, sxy, sxz, syy, syz, szz];
}
