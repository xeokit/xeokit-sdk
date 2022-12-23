export * from "./localization/LocaleService";
export * from "./scene";
export * from "./Plugin";
export * from "./Viewer";
export * from "./Configs";
export * from "./metadata";

export declare type ModelStats = {
    sourceFormat: string;
    schemaVersion: string;
    title: string;
    author: string;
    created: string;
    numMetaObjects: number;
    numPropertySets: number;
    numObjects: number;
    numGeometries: number;
    numTriangles: number;
    numVertices: number;
};
