/**
 * Uses edge adjacency counts to identify if the given triangle mesh can be rendered with backface culling enabled.
 *
 * If all edges are connected to exactly two triangles, then the mesh will likely be a closed solid, and we can safely
 * render it with backface culling enabled.
 *
 * Otherwise, the mesh is a surface, and we must render it with backface culling disabled.
 *
 * @private
 */
const isTriangleMeshSolid = (indices, positions) => {

    const vertexIndexMapping = [];
    let edges = [];

    function compareIndexPositions(a, b) {
        let posA, posB;

        for (let i = 0; i < 3; i++) {
            posA = positions [a * 3 + i];
            posB = positions [b * 3 + i];

            if (posA !== posB) {
                return posB - posA;
            }
        }

        return 0;
    };

    // Group together indices corresponding to same position coordinates
    let newIndices = indices.slice().sort(compareIndexPositions);

    // Calculate the mapping:
    // - from original index in indices array
    // - to indices-for-unique-positions
    let uniqueVertexIndex = null;

    for (let i = 0, len = newIndices.length; i < len; i++) {
        if (i === 0 || 0 !== compareIndexPositions(
            newIndices[i],
            newIndices[i - 1],
        )) {
            // different position
            uniqueVertexIndex = newIndices [i];
        }

        vertexIndexMapping [
            newIndices[i]
            ] = uniqueVertexIndex;
    }

    // Generate the list of edges
    for (let i = 0, len = indices.length; i < len; i += 3) {

        const a = vertexIndexMapping[indices[i]];
        const b = vertexIndexMapping[indices[i + 1]];
        const c = vertexIndexMapping[indices[i + 2]];

        let a2 = a;
        let b2 = b;
        let c2 = c;

        if (a > b && a > c) {
            if (b > c) {
                a2 = a;
                b2 = b;
                c2 = c;
            } else {
                a2 = a;
                b2 = c;
                c2 = b;
            }
        } else if (b > a && b > c) {
            if (a > c) {
                a2 = b;
                b2 = a;
                c2 = c;
            } else {
                a2 = b;
                b2 = c;
                c2 = a;
            }
        } else if (c > a && c > b) {
            if (a > b) {
                a2 = c;
                b2 = a;
                c2 = b;
            } else {
                a2 = c;
                b2 = b;
                c2 = a;
            }
        }

        edges[i + 0] = [
            a2, b2
        ];
        edges[i + 1] = [
            b2, c2
        ];

        if (a2 > c2) {
            const temp = c2;
            c2 = a2;
            a2 = temp;
        }

        edges[i + 2] = [
            c2, a2
        ];
    }

    // Group semantically equivalent edgdes together
    function compareEdges(e1, e2) {
        let a, b;

        for (let i = 0; i < 2; i++) {
            a = e1[i];
            b = e2[i];

            if (b !== a) {
                return b - a;
            }
        }

        return 0;
    }

    edges = edges.slice(0, indices.length);

    edges.sort(compareEdges);

    // Make sure each edge is used exactly twice
    let sameEdgeCount = 0;

    for (let i = 0; i < edges.length; i++) {
        if (i === 0 || 0 !== compareEdges(
            edges[i], edges[i - 1]
        )) {
            // different edge
            if (0 !== i && sameEdgeCount !== 2) {
                return false;
            }

            sameEdgeCount = 1;
        } else {
            // same edge
            sameEdgeCount++;
        }
    }

    if (edges.length > 0 && sameEdgeCount !== 2) {
        return false;
    }

    // Each edge is used exactly twice, this is a
    // watertight surface and hence a solid geometry.
    return true;
};

export {isTriangleMeshSolid};