declare const math: {
    unglobalizeObjectId(modelId: string, globalId: string): string;
    globalizeObjectId(modelId: string, objectId: string): string;

    /**
     * Returns a new, uninitialized two-element vector.
     * @returns {Number[]}
     */
    vec2: (values?: number[]) => number[];

    /**
     * Returns a new, uninitialized three-element vector.
     * @returns {Number[]}
     */
    vec3: (values?: number[]) => number[];

    /**
     * Returns a new, uninitialized four-element vector.
     * @returns {Number[]}
     */
    vec4: (values?: number[]) => number[];

    /**
     * Gets the center of a 2D AABB.
     * @returns {Number[]}
     */
    getAABB2Center(aabb: number[], dest?: (values?: number[]) => number[]): number[];

    /**
     * Gets the center of an AABB.
     * @returns {Number[]}
     */
    getAABB3Center(aabb: number[], dest?: (values?: number[]) => number[]): number[];
};

export {math};
