export * from "./CityJSONLoaderPlugin";
export * from "./FastNavPlugin";
export * from "./GLTFLoaderPlugin";
export * from "./LASLoaderPlugin";
export * from "./NavCubePlugin";
export * from "./OBJLoaderPlugin";
export * from "./StoreyViewsPlugin";
export * from "./TreeViewPlugin";
export * from "./XKTLoaderPlugin";
export * from "./WebIFCLoaderPlugin";

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
