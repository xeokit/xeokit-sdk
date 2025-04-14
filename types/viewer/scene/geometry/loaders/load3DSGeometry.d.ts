import {Scene} from '../../scene/Scene';

export declare type load3DSGeometryConfiguration = {
    /** Path to 3DS file. */
    src?: string;
}

export declare type Geometry3DSData = {
    src?: string;
    primitive: string;
    positions: number[];
    normals: number[] | null;
    uv: number[];
    indices: number[];
}

export function load3DSGeometry(scene: Scene, cfg?: load3DSGeometryConfiguration) : Promise<Geometry3DSData>;