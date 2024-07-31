import { Plugin, SceneModel, Viewer, Mesh, SectionPlane } from "../../viewer";

type Vec3 = [number, number, number];
type Vec4 = [number, number, number, number];

type RotTransMat = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
]


export declare type SectionCapsPluginConfiguration = {

};

export declare class SectionCapsPlugin extends Plugin {
    constructor(viewer: Viewer, cfg: SectionCapsPluginConfiguration);

    setupSectionPlanes(): void;

    _sectionPlaneCreated(sectionPlane: SectionPlane): void;

    onSectionPlaneDestroyed(sectionPlane: SectionPlane): void;

    onSectionPlanePosUpdated(): void;

    onSectionPlaneDirUpdated(): void;

    addHatches(sceneModel: SceneModel[], plane: SectionPlane[]): void;

    deletePreviousModels(): void;

    convertWebglGeometriesToCsgGeometries(sceneModels: SceneModel[]): void;

    getVerticesAndIndices(sceneModel: SceneModel): {
        vertices: {
            [key: string]: number[]
        },
        indices: {
            [key: string]: number[]
        }
    };

    createCSGGeometries(vertices: number[], indices: [number]): { [key: string]: { polygons: any[] } };

    createCSGPlane(sectionPlanes: SectionPlane): { polygons: any[] };

    getCapGeometries(csgGeometries: any, csgPlane: any): { polygons: any[] };

    addIntersectedGeometries(csgGeometries: { [key: string]: { polygons: any[] } }): void;

    createGeometry(vertices: number[], indices: number[]): { polygons: any[] };

    getObjectNormal(vertices: number[], indices: number[]): Vec3;

    getVertex(positionArray: number[], index: number): Vec3;

    computeQuaternionFromVectors(v1: Vec3, v2: Vec3): Vec4;

    getTransformationMatrix(position: Vec3, rotation: Vec3 | Vec4, _isQuat = false): RotTransMat;

    transformVertices(vertices: number[], transformationMatrix: RotTransMat): number[];

    multiplyMatrixAndPoint(matrix: RotTransMat, point: Vec3): Vec4;

    csgToWebGLGeometry(csgGeometry: { polygons: any[] }): {
        vertices: {
            [key: string]: number[]
        },
        indices: {
            [key: string]: number[]
        }
    };

    addGeometryToScene(vertices: number[], indices: number[], id: string): Mesh | undefined;

    destroy(): void;
}