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
  getAABB2Center(
    aabb: number[],
    dest?: (values?: number[]) => number[]
  ): number[];

  /**
   * Gets the center of an AABB.
   * @returns {Number[]}
   */
  getAABB3Center(
    aabb: number[],
    dest?: (values?: number[]) => number[]
  ): number[];

  /**
   * Gets the diagonal size of an AABB3 given as minima and maxima.
   */
  getAABB3Diag: (aabb: number[]) => number;

  /**
   * Normalizes a three-element vector
   */
  normalizeVec3: (v: number[], dest?: any) => number[];

  /**
   * Returns a 4x4 identity matrix.
   * @returns {Number[]}
   */
  identityMat4: (mat?: number[]) => number[];

  /**
   * Multiplies each element of a three-element vector by a scalar.
   */
  mulVec3Scalar: (
    v: number[],
    scalar: number,
    dest?: number[]
  ) => number[];

  /**
   * Multiplies the two given 4x4 matrix by each other.
   * @method mulMat4
   * @static
   */
  mulMat4: (a: number[], b: number[], dest: number[]) => number[];

  /**
   * Subtracts one three-element vector from another.
   * @method subVec3
   * @static
   * @param {Array(Number)} u First vector
   * @param {Array(Number)} v Vector to subtract
   * @param  {Array(Number)} [dest] Destination vector
   * @return {Array(Number)} dest if specified, u otherwise
   */
  subVec3: (u: number[], v: number[], dest: number[]) => number[];

  /**
   * Returns the length of a three-element vector.
   * @method lenVec3
   * @static
   * @param {Array(Number)} v The vector
   * @return The length
   */
  lenVec3: (v: number[]) => number;

  /**
   * Returns the length of a three-element vector.
   * @method lenVec3
   * @static
   * @param {Array(Number)} v The vector
   * @return The length
   */

  transformMatrix: (args: {
    matrix: number[];
    rotation: number[];
    translation: number[];
    scale: number[];
  }) => number[];
};

export {math};
