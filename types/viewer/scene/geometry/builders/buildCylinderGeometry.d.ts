import { Geometry } from "../Geometry";

export declare type buildCylinderGeometryConfiguration = {
  /* Optional ID for the {@link Geometry}, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /* 3D point indicating the center position. */
  center?: number[];
  /* Radius of top. */
  radiusTop?: number;
  /*  Radius of bottom. */
  radiusBottom?: number;
  /* Height. */
  height?: number;
  /* Number of horizontal segments. */
  radialSegments?: number;
  /* Number of vertical segments. */
  heightSegments?: number;
  /* Whether or not the cylinder has solid caps on the ends. */
  openEnded?: boolean;
};

/**
 * @desc Creates a cylinder-shaped {@link Geometry}.
 *
 * @param {buildCylinderGeometryConfiguration} [cfg] Configs
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
export function buildCylinderGeometry(cfg: buildCylinderGeometryConfiguration): Geometry;