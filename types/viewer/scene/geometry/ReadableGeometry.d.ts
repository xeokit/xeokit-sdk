import {Geometry} from "./Geometry";
import {Component} from "../Component";

export declare type ReadableGeometryConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, */
  id?: string;
  /** Optional map of user-defined metadata to attach to this Geometry. */
  meta?: {[key: string]: any};
  /** The primitive type. */
  primitive?: "points" | "lines"| "line-loop"| "line-strip"| "triangles"| "triangle-strip" | "triangle-fan";
  /** Positions array. */
  positions?: number[];
  /** Vertex normal vectors array. */
  normals?: number[];
  /** UVs array. */
  uv?: number[];
  /** Vertex colors. */
  colors?: number[];
  /** Indices array. */
  indices?: number[];
  /** Set true to automatically generate normal vectors from the positions and indices, if those are supplied.*/
  autoVertexNormals?: boolean;
  /** Stores positions, colors, normals and UVs in compressGeometry and oct-encoded formats for reduced memory footprint and GPU bus usage.*/
  compressGeometry?: boolean;
  /** When a {@link Mesh} renders this Geometry as wireframe, this indicates the threshold angle (in degrees) between the face normals of adjacent triangles below which the edge is discarded.*/
  edgeThreshold?: number;
};

/**
 * A {@link Geometry} that keeps its geometry data in both browser and GPU memory.
 *
 * ReadableGeometry uses more memory than {@link VBOGeometry}, which only stores its geometry data in GPU memory.
 */
export declare class ReadableGeometry extends Geometry {
  /**
   * constructor
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
   * @param {ReadableGeometryConfiguration} cfg Configs
   */
  constructor(owner: Component, cfg?: ReadableGeometryConfiguration);

  /**
   * Gets the Geometry"s primitive type.
   */
  get primitive(): "points" | "lines"| "line-loop"| "line-strip"| "triangles"| "triangle-strip" | "triangle-fan";

  /**
   * Indicates if this Geometry is quantized.
   */
  get compressGeometry(): boolean;

  /**
   * The Geometry's vertex positions.
   */
  get positions(): number[];
  set positions(arg: number[]);

  /**
   * The Geometry's vertex normals.
   */
  get normals(): number[];
  set normals(arg: number[]);

  /**
   The Geometry's UV coordinates.
   */
  get uv(): number[];
  set uv(arg: number[]);

  /**
   * The Geometry's vertex colors.
   */
  get colors(): number[];
  set colors(arg: number[]);

  /**
   * The Geometry's indices.
   */
  get indices(): Uint16Array | Uint32Array;

  /**
   * Local-space axis-aligned 3D boundary (AABB) of this geometry.
   */
  get aabb(): number[];

  /**
   * Local-space oriented 3D boundary (OBB) of this geometry.
   */
  get obb(): number[];

  /**
   * Returns the surface area of this Mesh.
   * @returns {number}
   */
  get surfaceArea(): number;

  /**
   * Returns the centroid of this Mesh.
   * @returns {number}
   */
  get centroid(): number;

  /**
   * Approximate number of triangles in this ReadableGeometry.
   */
  get numTriangles(): number;

  destroy(): void;
}
