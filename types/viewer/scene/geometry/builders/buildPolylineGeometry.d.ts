import { Geometry } from "../Geometry";

export declare type buildPolylineGeometryConfiguration = {
    /* Optional ID for the {@link Geometry}, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
    id?: string;
    /* 3D points indicating vertices position. */
    points?: number[];
};

export declare type buildPolylineGeometryFromCurveConfiguration = {
    /* Optional ID for the {@link Geometry}, unique among all components in the parent {@link Scene}, generated automatically when omitted. */
    id?: string;
    /* Curve for which polyline will be created. */
    curve?: Object;
    /* The number of divisions. */
    divisions?: number;
};

/**
 * @desc Creates a 3D polyline {@link Geometry}.
 *
 * @param {buildPolylineGeometryConfiguration} [cfg] Configs
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
export function buildPolylineGeometry(cfg: buildPolylineGeometryConfiguration): Geometry;

/**
 * @desc Creates a 3D polyline from curve {@link Geometry}.
 *
 * @param {buildPolylineGeometryFromCurveConfiguration} [cfg] Configs
 * @returns {Object} Configuration for a {@link Geometry} subtype.
 */
export function buildPolylineGeometryFromCurve(cfg: buildPolylineGeometryFromCurveConfiguration): Geometry;