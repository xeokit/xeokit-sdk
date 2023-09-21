import { Geometry } from "../Geometry";

export declare type buildTorusGeometryConfiguration = {
  /* Optional ID for the {@link Geometry}, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /* 3D point indicating the center position. */
  center?: number[]; 
  /* The overall radius. */
  radius?: number;
  /* The tube radius. */
  tube?: number;
  /* The number of radial segments. */
  radialSegments?: number;
  /* The number of tubular segments. */
  tubeSegments?: number;
  /* The length of the arc in radians, where Math.PI*2 is a closed torus. */
  arc?: number;
};

/**
 * @desc Creates a torus-shaped {@link Geometry}.
 *
 * @param {buildTorusGeometryConfiguration} [cfg] Configs
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
export function buildTorusGeometry(cfg: buildTorusGeometryConfiguration): Geometry;