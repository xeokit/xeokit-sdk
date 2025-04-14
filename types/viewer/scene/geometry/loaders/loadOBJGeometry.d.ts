import {Scene} from '../../scene/Scene';

export declare type LoadObjGeometryConfiguration = {
    /** Path to OBJ file. */
    src?: string;
}

export declare type ObjGeometryData = {
    src?: string;
    primitive: string;
    positions: number[];
    normals: number[] | null;
    autoNormals: number[] | null;
    uv: number[];
    indices: number[]
}

export function loadOBJGeometry(scene: Scene, cfg?: LoadObjGeometryConfiguration) : Promise<ObjGeometryData>;