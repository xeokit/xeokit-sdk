declare const math: {
  /**
   * The number of radiians in a degree (0.0174532925).
   */
  DEGTORAD: 0.017453292;

  /**
   * The number of degrees in a radian.
   */
  RADTODEG: 57.295779513;

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

  /**
   * Gets the diagonal size of an AABB3 given as minima and maxima.
   */
  getAABB3Diag: (aabb: number[]) => number;

  /**
   * Normalizes a three-element vector
   */
   normalizeVec3: (v: number[], dest?: any) => number[];

   /**
     * Multiplies each element of a three-element vector by a scalar.
     */
   mulVec3Scalar: (v: number[], scalar: number, dest?: number[]) => number[];
};

export {math};
