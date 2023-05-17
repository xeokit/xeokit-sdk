import { math } from "../../viewer/scene/math/math.js";

export default class Tile {
  /**
   * @constructor
   *
   * @param { TSL.Tileset } tileset
   * @param { TSL.TileData } tileData
   * @param { TSL.Tile } [parent=null]
   * @returns { TSL.Tile }
   */
  constructor(tileset, tileData, parent = null) {
    this.tileset = tileset;

    this.computeViewDistance =
      tileset.plugin.cfg.computeViewDistance;

    this.computePriority =
      tileset.plugin.cfg.computePriority;

    this.distanceFactorToFreeData =
      tileset.plugin.cfg.distanceFactorToFreeData;

    this.src = tileData.content.uri;

    const path = new URL(this.src).pathname;
    this.name = `${tileset.name}_${path.substring(path.lastIndexOf("/") + 1)}`;

    this.parent = parent;

    this.refine = tileData.refine;

    this.data = null;

    this.fetching = null;

    this.depth = parent ? parent.depth + 1 : 1;

    this.model = null;

    this.loadProcess = null;

    this.loading = false;

    this.currentDistanceFromCamera = null;

    this._visible = !parent; // root is visible

    this.priority = 1;

    const [x, y, z, a, b, c, d, e, f, g, h, i] = tileData.boundingVolume.box;

    this.center = Object.freeze([x, y, z]);

    const halfXVector = [a, b, c];
    const halfYVector = [d, e, f];
    const halfZVector = [g, h, i];

    this.volume =
      math.lenVec3(halfXVector) *
      2 *
      math.lenVec3(halfYVector) *
      2 *
      math.lenVec3(halfZVector) *
      2;

    this.children = tileData.children?.map(
      child => new Tile(tileset, child, this)
    ) ?? [];

    tileset.tiles.add(this);
  }

  get visible() {
    return this._visible;
  }

  set visible(value) {
    if (this._visible === value) return;

    this._visible = value;

    if (value) {
      this.tileset.visibleTiles.add(this);
    } else {
      this.tileset.visibleTiles.delete(this);
    }
  }

  get loaded() {
    return Boolean(this.model);
  }

  get viewDistance() {
    return this.computeViewDistance(this);
  }

  get isWithinCameraVisibleRange() {
    return this.currentDistanceFromCamera <= this.viewDistance;
  }

  updateVisibility(cameraEye) {
    this.currentDistanceFromCamera = math.distVec3(this.center, cameraEye);

    const isNotRoot = !!this.parent;
    if (isNotRoot) {
      this.visible = this.isWithinCameraVisibleRange;

      if (
        this.currentDistanceFromCamera >
        this.viewDistance * this.distanceFactorToFreeData
      ) {
        this.data = null;
      }
    }

    if (this.visible) {
      this.children.forEach(tile => tile.updateVisibility(cameraEye));
    }

    this.priority = this.computePriority(this);
  }

  fetchData() {
    if (this.data) return this.data;

    if (!this.fetching) {
      this.fetching = new Promise((resolve, reject) => {
        fetch(this.src).then(response => {
          if (response.ok) {
            response.arrayBuffer().then(arrayBuffer => {
              this.data = arrayBuffer;
              this.fetching = null;
              resolve(this.data);
            });
          } else {
            reject(response);
          }
        });
      });
    }

    return this.fetching;
  }

  async load() {
    if (this.loading) {
      return this.loadProcess;
    }
    if (this.loaded) {
      return this.model;
    }

    this.loading = true;

    if (!this.data) {
      try {
        await this.fetchData();
      } catch (err) {
        console.warn(
          `[Xeokit - TilesetLoaderPlugin] Impossible to fetch data of tile "${this.name}".`,
          err
        );

        this.loading = false;
        return null;
      }
    }

    // visible may have been set to false while fetching data.
    if (!this.visible) {
      this.loading = false;
      return null;
    }

    try {
      const loadingPromise = new Promise(res => {
        const model = this.tileset.plugin.loader.load({
          id: this.name,
          xkt: this.data,
          // To silent xeokit error
          metaModelData: {
            metaObjects: [
              {
                id: "metaModelRoot",
              },
            ],
          },
          saoEnabled: false,
        });

        model.once("loaded", () => {
          this.loading = false;

          this.loadProcess = null;

          this.model = model;

          if (this.tileset.destroyed || !this.visible) {
            this.unload();
            res(null);
          } else {
            this.tileset.loadedTiles.add(this);
            res(model);
          }
        });

        model.once("destroyed", () => {
          this.loading = false;

          this.loadProcess = null;

          res(null);
        });
      });

      this.loadProcess = loadingPromise;

      return this.loadProcess;
    } catch (err) {
      console.warn(
        `[Xeokit - TilesetLoaderPlugin] Impossible to load tile "${this.name}".`,
        err
      );

      return null;
    }
  }

  unload() {
    if (this.model) {
      this.model.destroy();
      this.model = null;
    }

    this.tileset.loadedTiles.delete(this);

    this.children.forEach(tile => {
      if (tile.loaded) {
        tile.unload();
      }
    });
  }
}
