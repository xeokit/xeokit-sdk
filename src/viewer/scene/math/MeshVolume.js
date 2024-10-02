import {math} from "./math.js";
import {isTriangleMeshSolid} from "./isTriangleMeshSolid.js";

const v1 = math.vec3();
const v2 = math.vec3();
const v3 = math.vec3();

/**
 * Calculates the volume of triangle meshes.
 */
export class MeshVolume {
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
        this.primitive = null;
    }

    setPrimitive(primitive) {
        this.primitive = primitive;
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
     * Gets the volume of the mesh.
     *
     * The mesh must be a closed solid.
     *
     * @returns {number} The volume of the mesh, or -1 if the mesh is not solid, in which case volume cannot be determined.
     */
    get volume() {

        const vertices = this.vertices;
        const indices = this.indices;

        if (this.primitive !== "solid" && this.primitive !== "surface" && this.primitive !== "triangles") {
            return -1;
        }

        if (this.primitive !== "solid" && !isTriangleMeshSolid(indices, vertices)) {
            return -1;
        }

        let volume = 0;

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

            math.cross3Vec3(v1, v2, v1);

            volume += math.dotVec3(v1, v3);
        }

        return volume / 6;
    }
}

/**
 * Singleton instance of {@link MeshVolume}.
 * @type {MeshVolume}
 */
export const meshVolume = new MeshVolume();
