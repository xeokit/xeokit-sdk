import { Geometry } from "../Geometry";

export declare type buildPlaneGeometryConfiguration = {
  /* Optional ID for the {@link Geometry}, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /* Dimension on the X-axis. */
  xSize?: number;
  /* Dimension on the Z-axis. */
  zSize?: number;
  /* Number of segments on the X-axis. */
  xSegments?: number;
  /* Number of segments on the Z-axis. */
  zSegments?: number;
};

/**
 * @desc Creates a plane-shaped {@link Geometry}.
 *
 * @param {buildPlaneGeometryConfiguration} [cfg] Configs
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
export function buildPlaneGeometry(cfg: buildPlaneGeometryConfiguration): Geometry;