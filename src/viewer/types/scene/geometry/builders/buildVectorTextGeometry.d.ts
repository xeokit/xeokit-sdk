import { Geometry } from "../Geometry";

export declare type buildVectorTextGeometryConfiguration = {
  /* Optional ID for the {@link Geometry}, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
  id?: string;
  /* 3D point indicating the center position. */
  center?: number[];
  /* 3D point indicating the top left corner. */
  origin?: number[];
  /* Size of each character. */
  size?: number;
  /* The text. */
  text?: string;
};

/**
 * @desc Creates wireframe vector text {@link Geometry}.
 *
 * @param {buildVectorTextGeometryConfiguration} [cfg] Configs
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
export function buildVectorTextGeometry(cfg: buildVectorTextGeometryConfiguration): Geometry;