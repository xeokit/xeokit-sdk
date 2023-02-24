import { Geometry } from "../Geometry";

export declare type buildBoxLinesGeometryConfiguration = {
  /* Optional ID for the {@link Geometry}, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /* 3D point indicating the center position. */
  center?: number[];
  /* Half-size on the X-axis. */
  xSize?: number;
  /* Half-size on the Y-axis. */
  ySize?: number;
  /* Half-size on the Z-axis.*/
  zSize?: number;
};

/**
 * @desc Creates a box-shaped lines {@link Geometry}.
 *
 * @param {buildBoxLinesGeometryConfiguration} [cfg] Configs
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
export function buildBoxLinesGeometry(cfg: buildBoxLinesGeometryConfiguration): Geometry;