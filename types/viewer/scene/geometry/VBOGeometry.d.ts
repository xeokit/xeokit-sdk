import { Component } from "../Component";
import { Geometry } from "./Geometry";

export declare type VBOGeometryConfiguration = {
  /** Optional ID, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
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
  /** When a {@link Mesh} renders this Geometry as wireframe, this indicates the threshold angle (in degrees) between the face normals of adjacent triangles below which the edge is discarded.*/
  edgeThreshold?: number;
};

/**
 * @desc A {@link Geometry} that keeps its geometry data solely in GPU memory, without retaining it in browser memory.
 *
 * VBOGeometry uses less memory than {@link ReadableGeometry}, which keeps its geometry data in both browser and GPU memory.
 */
export declare class VBOGeometry extends Geometry {
  /**
   * @constructor
   * @param {Component} owner Owner component. When destroyed, the owner will destroy this component as well.
   * @param {VBOGeometryConfiguration} cfg Configs
   */
  constructor(owner: Component, cfg?: VBOGeometryConfiguration);

  /**
   * Gets the primitive type.
   */
  get primitive(): "points" | "lines"| "line-loop"| "line-strip"| "triangles"| "triangle-strip" | "triangle-fan";

  /**
   * Gets the local-space axis-aligned 3D boundary (AABB).
   *
   * The AABB is represented by a six-element Float64Array containing the min/max extents of the axis-aligned volume, ie. ````[xmin, ymin,zmin,xmax,ymax, zmax]````.
   */
  get aabb(): Number[];

  /**
   * Gets the local-space oriented 3D boundary (OBB).
   *
   * The OBB is represented by a 32-element Float64Array containing the eight vertices of the box, where each vertex is a homogeneous coordinate having [x,y,z,w] elements.
   */
  get obb(): Number[];

  /**
   * Approximate number of triangles in this VBOGeometry.
   *
   * Will be zero if {@link VBOGeometry#primitive} is not 'triangles', 'triangle-strip' or 'triangle-fan'.
   */
  get numTriangles(): Number;

  destroy(): void;
}