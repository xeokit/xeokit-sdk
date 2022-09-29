import Tile from "./Tile.js";

import { eachLimit, makeQueue } from "./utils.js";

export default class Tileset {
  /**
   * @param { TSL.TilesetLoaderPlugin } tilesetPlugin 
   * @param { TSL.TilesetData } tilesetData 
   * @returns { TSL.Tileset }
   */
  constructor(tilesetPlugin, tilesetData) {
    this.plugin = tilesetPlugin;

    this.tiles = new Set();
    this.visibleTiles = new Set();
    this.loadedTiles = new Set();

    this.queue = null;

    this.renderNeeded = true;

    this.destroyed = false;

    this._viewDistance = tilesetPlugin.cfg.viewDistance;

    this.root = new Tile(this, tilesetData.root);
    this.root.load().then(model => tilesetPlugin.viewer.cameraFlight.flyTo(model));
  }

  get viewDistance() {
    return this._viewDistance;
  }

  set viewDistance(value) {
    this._viewDistance = value;

    this.updateVisibility();
  }

  updateVisibility() {
    const [x, y, z] = this.plugin.viewer.camera.eye;

    this.tiles.forEach(tile => {
      if (tile !== this.root) {
        tile.visible = false;
      }
    });

    // camera is Y-UP
    const zToY = [x, z, -y];
    this.root.updateVisibility(zToY);
    this.renderNeeded = true;
  }

  render() {
    if (!this.renderNeeded) return;

    if (this.queue) {
      this.queue.cancel();
    }

    this.loadedTiles.forEach(loadedTile => {
      if (!loadedTile.visible) {
        loadedTile.unload();
      }
    });

    const sortedVisibleTiles = Array.from(this.visibleTiles)
      .filter(tile => !tile.loaded)
      .sort((a, b) => a.priority - b.priority);

    eachLimit(sortedVisibleTiles, 40, t => t.fetchData());

    this.queue = makeQueue(sortedVisibleTiles);

    this.queue.run(tile => tile.load());

    this.renderNeeded = false;
  }

  destroy() {
    if (this.queue) {
      this.queue.cancel();
    }

    this.loadedTiles.forEach(tile => tile.unload());

    this.destroyed = true;
  }
}
