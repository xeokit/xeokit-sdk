import { Geometry } from "../Geometry";

export declare type buildLineGeometryConfiguration = {
    /* Optional ID for the {@link Geometry}, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
    id?: string;
    /* 3D start point (x0, y0, z0). */
    startPoint?: number[];
    /* 3D end point (x1, y1, z1). */
    endPoint?: number[];
    /* Lengths of segments that describe a pattern. */
    pattern?: number[];
    /* If true: it will try to make sure the line doesn't end up with a gap, as it will extend the last segment. */
    extendToEnd?: boolean;
};

/**
 * @desc Creates a 3D line {@link Geometry}.
 *
 * @param {buildLineGeometryConfiguration} [cfg] Configs
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
export function buildLineGeometry(cfg: buildLineGeometryConfiguration): Geometry;
