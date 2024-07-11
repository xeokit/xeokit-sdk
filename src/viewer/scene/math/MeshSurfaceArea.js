import {math} from "./math.js";

const v1 = math.vec3();
const v2 = math.vec3();
const v3 = math.vec3();
const v4 = math.vec3();
const v5 = math.vec3();
const v6 = math.vec3();

/**
 * Calculates the surface area of triangle meshes.
 */
export class MeshSurfaceArea {
    constructor() {
        this.vertices = [];
        this.indices = [];
        this.reset();
    }

    /**
     * Resets, ready to add vertices and indices for a new mesh.
     */
    reset() {
        this.lenVertices = 0;
        this.lenIndices = 0;
    }

    /**
     * Adds a vertex.
     * @param vertex
     */
    addVertex(vertex) {
        this.vertices[this.lenVertices++] = vertex[0];
        this.vertices[this.lenVertices++] = vertex[1];
        this.vertices[this.lenVertices++] = vertex[2];
    }

    /**
     * Adds an index.
     * @param index
     */
    addIndex(index) {
        this.indices[this.lenIndices++] = index;
    }

    /**
     * Gets the surface area of the mesh.
     *
     * @returns {number}
     */
    get surfaceArea() {

        const vertices = this.vertices;
        const indices = this.indices;

        let surfaceArea = 0;

        for (let i = 0; i < this.lenIndices; i += 3) {

            const index1 = indices[i] * 3;
            const index2 = indices[i + 1] * 3;
            const index3 = indices[i + 2] * 3;

            v1[0] = vertices[index1];
            v1[1] = vertices[index1 + 1];
            v1[2] = vertices[index1 + 2];

            v2[0] = vertices[index2];
            v2[1] = vertices[index2 + 1];
            v2[2] = vertices[index2 + 2];

            v3[0] = vertices[index3];
            v3[1] = vertices[index3 + 1];
            v3[2] = vertices[index3 + 2];

            math.subVec3(v1, v2, v4);
            math.subVec3(v3, v2, v5);

            surfaceArea += math.lenVec3(math.cross3Vec3(v4, v5, v6)) * 0.5;
        }

        return surfaceArea;
    }
}

/**
 * Singleton instance of {@link MeshSurfaceArea}.
 * @type {MeshSurfaceArea}
 */
export const meshSurfaceArea = new MeshSurfaceArea();
