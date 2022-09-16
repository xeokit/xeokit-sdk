import { Geometry } from "../Geometry";

export declare type buildSphereGeometryConfiguration = {
  /* Optional ID for the {@link Geometry}, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /* 3D point indicating the center position. */
  center?: number[]; 
  /* Radius. */
  radius?: number;
  /* Number of latitudinal bands. */
  heightSegments?: number;
  /* Number of longitudinal bands. */
  widthSegments?: number;
};

/**
 * @desc Creates a sphere-shaped {@link Geometry}.
 *
 * @param {buildSphereGeometryConfiguration} [cfg] Configs
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
export function buildSphereGeometry(cfg: buildSphereGeometryConfiguration): Geometry;