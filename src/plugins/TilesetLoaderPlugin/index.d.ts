declare namespace TSL {
  interface TilesetLoaderPlugin {
    cfg: {
      computeViewDistance: (tile: Tile) => number;
      computePriority: (tile: Tile) => number;
      distanceFactorToFreeData: number;
      viewDistance: number;
    };
    tilesets: Set<Tileset>;
    loader: XKTLoaderPlugin;
    load(tilesetData: TilesetData): Tileset;
    updateTilesetsVisibility(): void;
    renderTilesets(): void;
    destroy(): void;
  }

  interface TilesetData {
    root: TileData;
  }

  interface Tileset {
    plugin: TilesetLoaderPlugin;
    tiles: Set<Tile>;
    visibleTiles: Set<Tile>;
    loadedTiles: Set<Tile>;
    queue: Queue;
    renderNeeded: boolean;
    viewDistance: number;
    root: Tile;
    updateVisibility(): void;
    render(): void;
    destroy(): void;
  }

  interface TileData {
    geometricError: number;
    content: { uri: string };
    boundingVolume: { box: OrientedBoundingBox };
    children: TileData[];
    refine: refineOption;
  }

  interface Tile {
    tileset: Tileset;
    computeViewDistance: (tile: Tile) => number;
    computePriority: (tile: Tile) => number;
    distanceFactorToFreeData: number;
    src: string;
    name: string;
    parent: Tile;
    refine: refineOption;
    data: Object;
    fetching: boolean;
    depth: number;
    model: Object;
    loadProcess: Promise<any>;
    loading: boolean;
    currentDistanceFromCamera: number;
    priority: number;
    center: Point;
    volume: number;
    children: Tile[];
    visible: boolean;
    readonly loaded: boolean;
    readonly viewDistance: number;
    readonly isWithinCameraVisibleRange: boolean;
    updateVisibility(cameraEye: [number, number, number]);
    fetchData(): Promise<Object>;
    load(): Promise<Object>;
    unload(): void;
  }

  interface Point {
    x: number;
    y: number;
    z: number;
  }

  enum refineOption {
    ADD = "ADD",
    REPLACE = "REPLACE",
  }

  interface Queue {
    cancel(): void;
    run(callback: Function): void;
  }

  type OrientedBoundingBox = [
    // center
    number,
    number,
    number,
    // transformation matrix 3
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];
}
