/**
 * @author https://github.com/tmarti, with support from https://tribia.com/
 * @license MIT
 **/

const MAX_RE_BUCKET_FAN_OUT = 8;

let bucketsForIndices = null;

function compareBuckets(a, b) {
    const aa = a * 3;
    const bb = b * 3;
    let aa1, aa2, aa3, bb1, bb2, bb3;
    const minBucketA = Math.min(
        aa1 = bucketsForIndices[aa],
        aa2 = bucketsForIndices[aa + 1],
        aa3 = bucketsForIndices[aa + 2]
    );
    const minBucketB = Math.min(
        bb1 = bucketsForIndices[bb],
        bb2 = bucketsForIndices[bb + 1],
        bb3 = bucketsForIndices[bb + 2]
    );
    if (minBucketA !== minBucketB) {
        return minBucketA - minBucketB;
    }
    const maxBucketA = Math.max(aa1, aa2, aa3);
    const maxBucketB = Math.max(bb1, bb2, bb3,);
    if (maxBucketA !== maxBucketB) {
        return maxBucketA - maxBucketB;
    }
    return 0;
}

function preSortIndices(indices, bitsPerBucket) {
    const seq = new Int32Array(indices.length / 3);
    for (let i = 0, len = seq.length; i < len; i++) {
        seq[i] = i;
    }
    bucketsForIndices = new Int32Array(indices.length);
    for (let i = 0, len = indices.length; i < len; i++) {
        bucketsForIndices[i] = indices[i] >> bitsPerBucket;
    }
    seq.sort(compareBuckets);
    const sortedIndices = new Int32Array(indices.length);
    for (let i = 0, len = seq.length; i < len; i++) {
        sortedIndices[i * 3 + 0] = indices[seq[i] * 3 + 0];
        sortedIndices[i * 3 + 1] = indices[seq[i] * 3 + 1];
        sortedIndices[i * 3 + 2] = indices[seq[i] * 3 + 2];
    }
    return sortedIndices;
}

let compareEdgeIndices = null;

function compareIndices(a, b) {
    let retVal = compareEdgeIndices[a * 2] - compareEdgeIndices[b * 2];
    if (retVal !== 0) {
        return retVal;
    }
    return compareEdgeIndices[a * 2 + 1] - compareEdgeIndices[b * 2 + 1];
}

function preSortEdgeIndices(edgeIndices) {
    if ((edgeIndices || []).length === 0) {
        return [];
    }
    let seq = new Int32Array(edgeIndices.length / 2);
    for (let i = 0, len = seq.length; i < len; i++) {
        seq[i] = i;
    }
    for (let i = 0, j = 0, len = edgeIndices.length; i < len; i += 2) {
        if (edgeIndices[i] > edgeIndices[i + 1]) {
            let tmp = edgeIndices[i];
            edgeIndices[i] = edgeIndices[i + 1];
            edgeIndices[i + 1] = tmp;
        }
    }
    compareEdgeIndices = new Int32Array(edgeIndices);
    seq.sort(compareIndices);
    const sortedEdgeIndices = new Int32Array(edgeIndices.length);
    for (let i = 0, len = seq.length; i < len; i++) {
        sortedEdgeIndices[i * 2 + 0] = edgeIndices[seq[i] * 2 + 0];
        sortedEdgeIndices[i * 2 + 1] = edgeIndices[seq[i] * 2 + 1];
    }
    return sortedEdgeIndices;
}

/**
 * @param {{positionsCompressed: number[], indices: number[], edgeIndices: number[]}} mesh 
 * @param {number} bitsPerBucket 
 * @param {boolean} checkResult 
 * 
 * @returns {{positionsCompressed: number[], indices: number[], edgeIndices: number[]}[]}
 */
function rebucketPositions(mesh, bitsPerBucket, checkResult = false) {
    const positionsCompressed = (mesh.positionsCompressed || []);
    const indices = preSortIndices(mesh.indices || [], bitsPerBucket);
    const edgeIndices = preSortEdgeIndices(mesh.edgeIndices || []);

    function edgeSearch(el0, el1) { // Code adapted from https://stackoverflow.com/questions/22697936/binary-search-in-javascript
        if (el0 > el1) {
            let tmp = el0;
            el0 = el1;
            el1 = tmp;
        }

        function compare_fn(a, b) {
            if (a !== el0) {
                return el0 - a;
            }
            if (b !== el1) {
                return el1 - b;
            }
            return 0;
        }

        let m = 0;
        let n = (edgeIndices.length >> 1) - 1;
        while (m <= n) {
            const k = (n + m) >> 1;
            const cmp = compare_fn(edgeIndices[k * 2], edgeIndices[k * 2 + 1]);
            if (cmp > 0) {
                m = k + 1;
            } else if (cmp < 0) {
                n = k - 1;
            } else {
                return k;
            }
        }
        return -m - 1;
    }

    const alreadyOutputEdgeIndices = new Int32Array(edgeIndices.length / 2);
    alreadyOutputEdgeIndices.fill(0);

    const numPositions = positionsCompressed.length / 3;

    if (numPositions > ((1 << bitsPerBucket) * MAX_RE_BUCKET_FAN_OUT)) {
        return [mesh];
    }

    const bucketIndicesRemap = new Int32Array(numPositions);
    bucketIndicesRemap.fill(-1);

    const buckets = [];

    function addEmptyBucket() {
        bucketIndicesRemap.fill(-1);

        const newBucket = {
            positionsCompressed: [],
            indices: [],
            edgeIndices: [],
            maxNumPositions: (1 << bitsPerBucket) - bitsPerBucket,
            numPositions: 0,
            bucketNumber: buckets.length,
        };

        buckets.push(newBucket);

        return newBucket;
    }

    let currentBucket = addEmptyBucket();

    // let currentBucket = 0;

    let retVal = 0;

    for (let i = 0, len = indices.length; i < len; i += 3) {
        let additonalPositionsInBucket = 0;

        const ii0 = indices[i];
        const ii1 = indices[i + 1];
        const ii2 = indices[i + 2];

        if (bucketIndicesRemap[ii0] === -1) {
            additonalPositionsInBucket++;
        }

        if (bucketIndicesRemap[ii1] === -1) {
            additonalPositionsInBucket++;
        }

        if (bucketIndicesRemap[ii2] === -1) {
            additonalPositionsInBucket++;
        }

        if ((additonalPositionsInBucket + currentBucket.numPositions) > currentBucket.maxNumPositions) {
            currentBucket = addEmptyBucket();
        }

        if (currentBucket.bucketNumber > MAX_RE_BUCKET_FAN_OUT) {
            return [mesh];
        }

        if (bucketIndicesRemap[ii0] === -1) {
            bucketIndicesRemap[ii0] = currentBucket.numPositions++;
            currentBucket.positionsCompressed.push(positionsCompressed[ii0 * 3]);
            currentBucket.positionsCompressed.push(positionsCompressed[ii0 * 3 + 1]);
            currentBucket.positionsCompressed.push(positionsCompressed[ii0 * 3 + 2]);
        }

        if (bucketIndicesRemap[ii1] === -1) {
            bucketIndicesRemap[ii1] = currentBucket.numPositions++;
            currentBucket.positionsCompressed.push(positionsCompressed[ii1 * 3]);
            currentBucket.positionsCompressed.push(positionsCompressed[ii1 * 3 + 1]);
            currentBucket.positionsCompressed.push(positionsCompressed[ii1 * 3 + 2]);
        }

        if (bucketIndicesRemap[ii2] === -1) {
            bucketIndicesRemap[ii2] = currentBucket.numPositions++;
            currentBucket.positionsCompressed.push(positionsCompressed[ii2 * 3]);
            currentBucket.positionsCompressed.push(positionsCompressed[ii2 * 3 + 1]);
            currentBucket.positionsCompressed.push(positionsCompressed[ii2 * 3 + 2]);
        }

        currentBucket.indices.push(bucketIndicesRemap[ii0]);
        currentBucket.indices.push(bucketIndicesRemap[ii1]);
        currentBucket.indices.push(bucketIndicesRemap[ii2]);

        // Check possible edge1
        let edgeIndex;

        if ((edgeIndex = edgeSearch(ii0, ii1)) >= 0) {
            if (alreadyOutputEdgeIndices[edgeIndex] === 0) {
                alreadyOutputEdgeIndices[edgeIndex] = 1;

                currentBucket.edgeIndices.push(bucketIndicesRemap[edgeIndices[edgeIndex * 2]]);
                currentBucket.edgeIndices.push(bucketIndicesRemap[edgeIndices[edgeIndex * 2 + 1]]);
            }
        }

        if ((edgeIndex = edgeSearch(ii0, ii2)) >= 0) {
            if (alreadyOutputEdgeIndices[edgeIndex] === 0) {
                alreadyOutputEdgeIndices[edgeIndex] = 1;

                currentBucket.edgeIndices.push(bucketIndicesRemap[edgeIndices[edgeIndex * 2]]);
                currentBucket.edgeIndices.push(bucketIndicesRemap[edgeIndices[edgeIndex * 2 + 1]]);
            }
        }

        if ((edgeIndex = edgeSearch(ii1, ii2)) >= 0) {
            if (alreadyOutputEdgeIndices[edgeIndex] === 0) {
                alreadyOutputEdgeIndices[edgeIndex] = 1;

                currentBucket.edgeIndices.push(bucketIndicesRemap[edgeIndices[edgeIndex * 2]]);
                currentBucket.edgeIndices.push(bucketIndicesRemap[edgeIndices[edgeIndex * 2 + 1]]);
            }
        }
    }

    const prevBytesPerIndex = bitsPerBucket / 8 * 2;
    const newBytesPerIndex = bitsPerBucket / 8;

    const originalSize = positionsCompressed.length * 2 + (indices.length + edgeIndices.length) * prevBytesPerIndex;

    let newSize = 0;
    let newPositions = -positionsCompressed.length / 3;

    buckets.forEach(bucket => {
        newSize += bucket.positionsCompressed.length * 2 + (bucket.indices.length + bucket.edgeIndices.length) * newBytesPerIndex;
        newPositions += bucket.positionsCompressed.length / 3;
    });
    if (newSize > originalSize) {
        return [mesh];
    }
    if (checkResult) {
        doCheckResult(buckets, mesh);
    }
    return buckets;
}

function unbucket(buckets) {
    const positionsCompressed = [];
    const indices = [];
    const edgeIndices = [];
    let positionsBase = 0;
    buckets.forEach(bucket => {
        bucket.positionsCompressed.forEach(coord => {
            positionsCompressed.push(coord);
        });
        bucket.indices.forEach(index => {
            indices.push(index + positionsBase);
        });
        bucket.edgeIndices.forEach(edgeIndex => {
            edgeIndices.push(edgeIndex + positionsBase);
        });
        positionsBase += positionsCompressed.length / 3;
    });
    return {positionsCompressed, indices, edgeIndices};
}

function doCheckResult(buckets, mesh) {
    const meshDict = {};
    const edgesDict = {};

    let edgeIndicesCount = 0;

    buckets.forEach(bucket => {
        const indices = bucket.indices;
        const edgeIndices = bucket.edgeIndices;
        const positionsCompressed = bucket.positionsCompressed;

        for (let i = 0, len = indices.length; i < len; i += 3) {
            const key = positionsCompressed[indices[i] * 3] + "_" + positionsCompressed[indices[i] * 3 + 1] + "_" + positionsCompressed[indices[i] * 3 + 2] + "/" +
                positionsCompressed[indices[i + 1] * 3] + "_" + positionsCompressed[indices[i + 1] * 3 + 1] + "_" + positionsCompressed[indices[i + 1] * 3 + 2] + "/" +
                positionsCompressed[indices[i + 2] * 3] + "_" + positionsCompressed[indices[i + 2] * 3 + 1] + "_" + positionsCompressed[indices[i + 2] * 3 + 2];
            meshDict[key] = true;
        }

        edgeIndicesCount += bucket.edgeIndices.length / 2;

        for (let i = 0, len = edgeIndices.length; i < len; i += 2) {
            const key = positionsCompressed[edgeIndices[i] * 3] + "_" + positionsCompressed[edgeIndices[i] * 3 + 1] + "_" + positionsCompressed[edgeIndices[i] * 3 + 2] + "/" +
                positionsCompressed[edgeIndices[i + 1] * 3] + "_" + positionsCompressed[edgeIndices[i + 1] * 3 + 1] + "_" + positionsCompressed[edgeIndices[i + 1] * 3 + 2] + "/";
            edgesDict[key] = true;
        }
    });

    {
        const indices = mesh.indices;
        const edgeIndices = mesh.edgeIndices;
        const positionsCompressed = mesh.positionsCompressed;

        for (let i = 0, len = indices.length; i < len; i += 3) {
            const key = positionsCompressed[indices[i] * 3] + "_" + positionsCompressed[indices[i] * 3 + 1] + "_" + positionsCompressed[indices[i] * 3 + 2] + "/" +
                positionsCompressed[indices[i + 1] * 3] + "_" + positionsCompressed[indices[i + 1] * 3 + 1] + "_" + positionsCompressed[indices[i + 1] * 3 + 2] + "/" +
                positionsCompressed[indices[i + 2] * 3] + "_" + positionsCompressed[indices[i + 2] * 3 + 1] + "_" + positionsCompressed[indices[i + 2] * 3 + 2];

            if (!(key in meshDict)) {
                console.log("Not found " + key);
                throw "Ohhhh!";
            }
        }

        //  for (var i = 0, len = edgeIndices.length; i < len; i+=2)
        //  {
        //      var key = positionsCompressed[edgeIndices[i]*3] + "_" + positionsCompressed[edgeIndices[i]*3+1] + "_" + positionsCompressed[edgeIndices[i]*3+2] + "/" +
        //                positionsCompressed[edgeIndices[i+1]*3] + "_" + positionsCompressed[edgeIndices[i+1]*3+1] + "_" + positionsCompressed[edgeIndices[i+1]*3+2] + "/";

        //      if (!(key in edgesDict)) {
        //          var key2 = edgeIndices[i] + "_" + edgeIndices[i+1];

        //          console.log ("   - Not found " + key);
        //          console.log ("   - Not found " + key2);
        //         //  throw "Ohhhh2!";
        //      }
        //  }
    }
}

export {rebucketPositions}