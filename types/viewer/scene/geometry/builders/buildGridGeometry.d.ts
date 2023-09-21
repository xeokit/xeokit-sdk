import { Geometry } from "../Geometry";

export declare type buildGridGeometryConfiguration = {
  /* Optional ID for the {@link Geometry}, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /* Dimension on the X and Z-axis. */
  size?: number;
  /* Number of divisions on X and Z axis.. */
  divisions?: number;
};

/**
 * @desc Creates a grid-shaped {@link Geometry}.
 *
 * @param {buildGridGeometryConfiguration} [cfg] Configs
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
export function buildGridGeometry(cfg: buildGridGeometryConfiguration): Geometry;